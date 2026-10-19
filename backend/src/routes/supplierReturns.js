const express = require('express');
const { Op } = require('sequelize');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const PurchaseOrder = require('../models/PurchaseOrder');
const Stock = require('../models/Stock');
const Movement = require('../models/StockMovement');
const SupplierReturn = require('../models/SupplierReturn');
const { lockStockBranch } = require('../services/receiveStock');
const { recordMovement } = require('../services/stockMovement');
const { pagination } = require('../services/pagination');
const router = express.Router();
const error = (message, status = 400) => Object.assign(new Error(message), { status });
const scope = req => ({ companyId: req.user.companyId, branchId: req.branchId });
const handle = (err, res, next) => err.status ? res.status(err.status).json({ message: err.message }) : next(err);
router.use(requireAuth, async (req, res, next) => { try {
  if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' }); next();
} catch (err) { next(err); } });
router.get('/', async (req, res, next) => { try {
  const paging = pagination({ page: req.query.page || '1' }), search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 160) : '', status = typeof req.query.status === 'string' ? req.query.status : '';
  if (status && !['Pending', 'Refunded', 'Replaced'].includes(status)) throw error('Select a valid status.');
  const { supplierId, itemField, itemValue } = req.query;
  if (supplierId !== undefined && (typeof supplierId !== 'string' || supplierId.length > 100)) throw error('Select a valid supplier.');
  if ((itemField !== undefined || itemValue !== undefined) && (!['itemId', 'sku', 'itemName'].includes(itemField) || typeof itemValue !== 'string' || !itemValue || itemValue.length > 160)) throw error('Select a valid item.');
  const itemFilter = itemField === 'itemId' ? { itemId: itemValue } : itemField === 'sku' ? { itemId: null, sku: itemValue } : itemField === 'itemName' ? { itemId: null, sku: null, itemName: itemValue } : {};
  const where = { ...scope(req), ...(status && { status }), ...(supplierId && { supplierId }), ...itemFilter, ...(search && { [Op.or]: ['supplierName', 'orderNumber', 'itemName', 'sku'].map(field => ({ [field]: { [Op.like]: `%${search}%` } })) }) };
  const result = await SupplierReturn.findAndCountAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: paging.limit, offset: paging.offset });
  res.json({ returns: result.rows, total: result.count, pageSize: paging.pageSize });
} catch (err) { handle(err, res, next); } });
router.get('/filter-options', async (req, res, next) => { try {
  const records = await SupplierReturn.findAll({ where: scope(req), attributes: ['itemId', 'itemName', 'sku', 'supplierId', 'supplierName'], group: ['itemId', 'itemName', 'sku', 'supplierId', 'supplierName'], order: [['itemName', 'ASC'], ['supplierName', 'ASC']], raw: true });
  const items = new Map(), suppliers = new Map();
  for (const row of records) {
    const field = row.itemId ? 'itemId' : row.sku ? 'sku' : 'itemName', value = row.itemId || row.sku || row.itemName;
    if (value && !items.has(JSON.stringify([field, value]))) items.set(JSON.stringify([field, value]), { field, value, name: row.itemName, sku: row.sku });
    if (row.supplierId && !suppliers.has(row.supplierId)) suppliers.set(row.supplierId, { id: row.supplierId, name: row.supplierName });
  }
  res.json({ items: [...items.values()], suppliers: [...suppliers.values()].sort((a, b) => a.name.localeCompare(b.name)) });
} catch (err) { handle(err, res, next); } });
router.get('/order/:id', async (req, res, next) => { try {
  const order = await PurchaseOrder.findOne({ where: { id: req.params.id, ...scope(req) } });
  if (!order || order.status !== 'Received') throw error('Received order not found.', 404);
  const returns = await SupplierReturn.findAll({ where: { ...scope(req), orderId: order.id }, attributes: ['itemRequestId', 'quantity'] });
  res.json({ items: order.items.map(item => ({ ...item, returned: returns.filter(r => r.itemRequestId === item.requestId).reduce((sum, r) => sum + Number(r.quantity), 0) })) });
} catch (err) { handle(err, res, next); } });
router.post('/', async (req, res, next) => { try {
  const { requestId, orderId, itemRequestId } = req.body, quantity = Number(req.body.quantity), reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) || typeof orderId !== 'string' || typeof itemRequestId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1 || !reason || reason.length > 500) throw error('Enter a valid item, quantity and reason.');
  const result = await SupplierReturn.sequelize.transaction(async transaction => {
    const order = await PurchaseOrder.findOne({ where: { id: orderId, ...scope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!order || order.status !== 'Received') throw error('Received order not found.', 404);
    const prior = await SupplierReturn.findOne({ where: { requestId }, transaction });
    if (prior) { if (prior.companyId !== req.user.companyId || prior.branchId !== req.branchId || prior.orderId !== orderId || prior.createdBy !== req.user.id) throw error('Request already used.'); return prior; }
    const items = order.items.filter(item => item.requestId === itemRequestId);
    if (items.length !== 1) throw error('This order item cannot be identified safely.');
    const item = items[0];
    const previous = await SupplierReturn.sum('quantity', { where: { ...scope(req), orderId, itemRequestId }, transaction }) || 0;
    if (quantity > Number(item.quantity) - Number(previous)) throw error('Quantity exceeds the amount received and not already returned.');
    await lockStockBranch(req, transaction);
    const receipts = await Movement.findAll({ where: { ...scope(req), referenceId: order.id, kind: 'purchase', sku: item.sku || null, unitCost: item.unitPriceCents / 100, costCurrency: order.currency }, transaction });
    const stockIds = [...new Set(receipts.map(m => m.stockId))];
    const stocks = stockIds.length ? await Stock.findAll({ where: { id: stockIds, branchId: req.branchId, ...(item.itemId ? { itemId: item.itemId } : { itemId: null, sku: item.sku || null }) }, transaction, lock: transaction.LOCK.UPDATE }) : [];
    if (stocks.length !== 1) throw error('The received stock batch cannot be identified safely.');
    const stock = stocks[0];
    if (Number(stock.quantity) < quantity) throw error('Not enough stock remains in the received batch to return this quantity.');
    const returned = await SupplierReturn.create({ requestId, ...scope(req), orderId, orderNumber: order.orderNumber, supplierId: order.supplierId, supplierName: order.supplierName, itemRequestId, itemId: item.itemId || null, itemName: item.itemName, sku: item.sku || null, stockId: stock.id, quantity, unitPriceCents: item.unitPriceCents, currency: order.currency, reason, createdBy: req.user.id }, { transaction });
    await stock.update({ quantity: Number(stock.quantity) - quantity }, { transaction });
    await recordMovement({ stock, req, kind: 'supplier_return', change: -quantity, balanceAfter: Number(stock.quantity), referenceId: returned.id, referenceLabel: order.orderNumber, adjustmentNote: reason, transaction });
    return returned;
  }); res.status(201).json({ return: result });
} catch (err) { handle(err, res, next); } });
router.patch('/:id/resolve', async (req, res, next) => { try {
  const status = req.body.status; if (!['Refunded', 'Replaced'].includes(status)) throw error('Select refund or replacement.');
  const result = await SupplierReturn.sequelize.transaction(async transaction => {
    const returned = await SupplierReturn.findOne({ where: { id: req.params.id, ...scope(req) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!returned) throw error('Supplier return not found.', 404);
    if (returned.status !== 'Pending') throw error('This return is already resolved.');
    if (status === 'Replaced') {
      await lockStockBranch(req, transaction);
      const stock = await Stock.findOne({ where: { id: returned.stockId, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) throw error('The original stock batch is no longer available.');
      const quantity = Number(stock.quantity) + Number(returned.quantity);
      if (quantity > 4294967295) throw error('Stock quantity is too large.');
      await stock.update({ quantity, isArchived: false }, { transaction });
      await recordMovement({ stock, req, kind: 'supplier_replacement', change: Number(returned.quantity), balanceAfter: quantity, referenceId: returned.id, referenceLabel: returned.orderNumber, transaction });
    }
    await returned.update({ status, resolvedAt: new Date() }, { transaction }); return returned;
  }); res.json({ return: result });
} catch (err) { handle(err, res, next); } });
module.exports = router;
