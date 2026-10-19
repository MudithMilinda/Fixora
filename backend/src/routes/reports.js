const express = require('express');
const { Op, literal, fn, col, where: sqlWhere } = require('sequelize');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const Sale = require('../models/Sale');
const PurchaseOrder = require('../models/PurchaseOrder');
const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const { calculateReport } = require('../services/profitReport');
const { pagination } = require('../services/pagination');
const router = express.Router();
router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    const { companyId, id: userId } = req.user;
    if (!companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
const adminOnly = (req, res, next) => req.user.customRoleId || !['admin', 'super_admin'].includes(req.user.role) ? res.status(403).json({ message: 'Administrator access required.' }) : next();
router.get('/stock-adjustments', async (req, res, next) => {
  try {
    const paging = pagination({ page: req.query.page ?? '1' });
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0,160) : '';
    const reason = req.query.reason || 'all';
    if (!['all', 'damaged', 'lost', 'count_correction', 'other'].includes(reason)) return res.status(400).json({ message: 'Enter a valid reason.' });
    const parseDate = value => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 });
      const date = new Date(value); if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 }); return date;
    };
    const start = req.query.start === undefined ? null : parseDate(req.query.start), end = req.query.end === undefined ? null : parseDate(req.query.end);
    if (start && end && start >= end) return res.status(400).json({ message: 'Enter a valid date range.' });
    const where = { companyId: req.user.companyId, branchId: req.branchId, kind:'adjustment', ...(reason !== 'all' ? { adjustmentReason:reason } : {}), ...(search ? { [Op.or]: [{ itemName: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }] } : {}), ...(start || end ? { createdAt: { ...(start ? { [Op.gte]:start } : {}), ...(end ? { [Op.lt]:end } : {}) } } : {}) };
    const [result, summary] = await Promise.all([
      StockMovement.findAndCountAll({ where, order:[['createdAt','DESC'], ['id','DESC']], limit:paging.limit, offset:paging.offset }),
      StockMovement.findOne({ where, raw:true, attributes:[
        [literal("COALESCE(SUM(CASE WHEN quantity_change < 0 AND adjustment_reason = 'damaged' THEN -quantity_change ELSE 0 END),0)"),'damagedUnits'],
        [literal("COALESCE(SUM(CASE WHEN quantity_change < 0 AND adjustment_reason = 'lost' THEN -quantity_change ELSE 0 END),0)"),'lostUnits'],
        [literal("COALESCE(SUM(CASE WHEN quantity_change < 0 AND adjustment_reason IN ('damaged','lost') AND cost_currency = 'LKR' THEN -quantity_change * unit_cost * 100 ELSE 0 END),0)"),'lossCostCents'],
        [literal("COALESCE(SUM(CASE WHEN quantity_change < 0 AND adjustment_reason IN ('damaged','lost') AND (cost_currency IS NULL OR cost_currency <> 'LKR') THEN 1 ELSE 0 END),0)"),'excludedLosses'],
      ] }),
    ]);
    res.json({ success:true, rows:result.rows, total:result.count, page:paging.page, pageSize:paging.pageSize, summary:{ damagedUnits:Number(summary.damagedUnits), lostUnits:Number(summary.lostUnits), lossCostCents:Number(summary.lossCostCents), excludedLosses:Number(summary.excludedLosses) } });
  } catch (error) { if (error.status === 400) return res.status(400).json({ message:error.message }); next(error); }
});
router.get('/supplier-purchase-suppliers', async (req, res, next) => {
  try {
    const orders = await PurchaseOrder.findAll({ where: { companyId: req.user.companyId, branchId: req.branchId, status: 'Received' }, attributes: ['supplierId', 'supplierName'], group: ['supplierId', 'supplierName'], order: [['supplierName', 'ASC']], raw: true });
    const suppliers = [...new Map(orders.map(order => [order.supplierId, { id: order.supplierId, name: order.supplierName }])).values()];
    res.json({ success: true, suppliers });
  } catch (error) { next(error); }
});
router.get('/supplier-purchases', async (req, res, next) => {
  try {
    const paging = pagination({ page: req.query.page ?? '1' });
    const item = typeof req.query.item === 'string' ? req.query.item.trim().slice(0,160) : '';
    const supplier = typeof req.query.supplier === 'string' ? req.query.supplier.trim().slice(0,160) : '';
    const supplierId = typeof req.query.supplierId === 'string' ? req.query.supplierId.trim() : '';
    const where = { companyId: req.user.companyId, branchId: req.branchId, status: 'Received' };
    if (supplierId) where.supplierId = supplierId;
    else if (supplier) where.supplierName = { [Op.like]: `%${supplier}%` };
    if (item) where[Op.or] = [sqlWhere(fn('JSON_SEARCH', col('items'), 'one', `%${item}%`, null, '$[*].itemName'), { [Op.ne]: null }), sqlWhere(fn('JSON_SEARCH', col('items'), 'one', `%${item}%`, null, '$[*].sku'), { [Op.ne]: null })];
    const parseDate = value => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 });
      const date = new Date(value); if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 }); return date;
    };
    const start = req.query.start === undefined ? null : parseDate(req.query.start), end = req.query.end === undefined ? null : parseDate(req.query.end);
    if (start && end && start >= end) return res.status(400).json({ message: 'Enter a valid date range.' });
    if (start || end) where.receivedAt = { ...(start ? { [Op.gte]: start } : {}), ...(end ? { [Op.lt]: end } : {}) };
    const result = await PurchaseOrder.findAndCountAll({ where, order: [['receivedAt','DESC'], ['id','DESC']], limit: paging.limit, offset: paging.offset, attributes: ['id','orderNumber','supplierName','currency','items','receivedAt'] });
    const orders = result.rows.map(order => ({ id:order.id, orderNumber:order.orderNumber, supplierName:order.supplierName, currency:order.currency, receivedAt:order.receivedAt, items: item ? order.items.filter(line => `${line.itemName || ''} ${line.sku || ''}`.toLowerCase().includes(item.toLowerCase())) : order.items }));
    res.json({ success:true, orders, total:result.count, page:paging.page, pageSize:paging.pageSize });
  } catch (error) { if (error.status === 400) return res.status(400).json({ message: error.message }); next(error); }
});
router.get('/stock-valuation', async (req, res, next) => {
  try {
    const page = Number(req.query?.page ?? 1), pageSize = 10;
    const search = typeof req.query?.search === 'string' ? req.query.search.trim().slice(0, 160) : '';
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return res.status(400).json({ message: 'Enter a valid page.' });
    const scope = { branchId: req.branchId, isArchived: false, quantity: { [Op.gt]: 0 } };
    const where = { ...scope, ...(search ? { [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }] } : {}) };
    const [result, totals] = await Promise.all([
      Stock.findAndCountAll({ where, attributes: ['id', 'name', 'sku', 'quantity', 'costPrice', 'costCurrency', 'sellingPrice'], order: [['name', 'ASC'], ['id', 'ASC']], limit: pageSize, offset: (page - 1) * pageSize }),
      Stock.findOne({ where: scope, raw: true, attributes: [
        [literal("COALESCE(SUM(CASE WHEN cost_currency = 'LKR' THEN cost_price * quantity * 100 ELSE 0 END), 0)"), 'totalCostCents'],
        [literal('COALESCE(SUM(selling_price * quantity * 100), 0)'), 'sellingValueCents'],
        [literal("COALESCE(SUM(CASE WHEN cost_currency IS NULL OR cost_currency <> 'LKR' THEN 1 ELSE 0 END), 0)"), 'excludedBatches'],
        [literal('COALESCE(SUM(quantity), 0)'), 'totalUnits'],
        [literal('COUNT(*)'), 'totalBatches'],
      ] }),
    ]);
    const rows = result.rows.map(stock => ({ id: stock.id, name: stock.name, sku: stock.sku, quantity: Number(stock.quantity), costPrice: Number(stock.costPrice), costCurrency: stock.costCurrency, sellingPrice: Number(stock.sellingPrice), costValueCents: stock.costCurrency === 'LKR' ? Math.round(Number(stock.costPrice) * 100) * Number(stock.quantity) : null }));
    res.json({ success: true, rows, page, pageSize, total: result.count, totalCostCents: Number(totals.totalCostCents), sellingValueCents: Number(totals.sellingValueCents), excludedBatches: Number(totals.excludedBatches), totalUnits: Number(totals.totalUnits), totalBatches: Number(totals.totalBatches) });
  } catch (error) { next(error); }
});
router.get('/profit', async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const start = new Date(req.query.start), end = new Date(req.query.end);
    if (typeof req.query.start !== 'string' || typeof req.query.end !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(req.query.start) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(req.query.end) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) return res.status(400).json({ message: 'Enter a valid date range.' });
    const scope = { companyId, branchId: req.branchId };
    const [sales, orders, stocks, undatedOrders] = await Promise.all([
      Sale.findAll({ where: { ...scope, createdAt: { [Op.gte]: start, [Op.lt]: end } }, attributes: ['id', 'createdAt', 'customerName', 'subtotalCents', 'discountCents', 'totalCents', 'lines'] }),
      PurchaseOrder.findAll({ where: { ...scope, status: 'Received', receivedAt: { [Op.gte]: start, [Op.lt]: end } }, attributes: ['id', 'orderNumber', 'supplierName', 'receivedAt', 'items', 'totalCents', 'currency'] }),
      Stock.findAll({ where: { branchId: req.branchId, isArchived: false }, attributes: ['id', 'name', 'sku', 'quantity', 'costPrice', 'costCurrency'] }),
      PurchaseOrder.findAll({ where: { ...scope, status: 'Received', receivedAt: null }, attributes: ['id', 'orderNumber', 'supplierName', 'currency', 'totalCents', 'createdAt'] }),
    ]);
    const canResolve = !req.user.customRoleId && ['admin', 'super_admin'].includes(req.user.role);
    const missingSales = canResolve ? sales.flatMap(sale => {
      const lines = typeof sale.lines === 'string' ? JSON.parse(sale.lines) : sale.lines;
      return lines.flatMap((line, index) => Number.isSafeInteger(line.unitCostCents) && line.unitCostCents >= 0 ? [] : [{ saleId: sale.id, lineIndex: index, name: line.name, quantity: line.quantity, customerName: sale.customerName, completedAt: sale.createdAt }]);
    }) : [];
    const missingStocks = canResolve ? stocks.filter(stock => stock.costCurrency == null && stock.quantity > 0).map(stock => ({ id: stock.id, name: stock.name, sku: stock.sku, quantity: stock.quantity, costPrice: Number(stock.costPrice) })) : [];
    const details = {
      sales: sales.map(sale => {
        const lines = typeof sale.lines === 'string' ? JSON.parse(sale.lines) : sale.lines;
        const hasMissingCost = lines.some(line => !Number.isSafeInteger(line.unitCostCents) || line.unitCostCents < 0 || !Number.isSafeInteger(line.quantity) || line.quantity < 1);
        const costCents = lines.reduce((sum, line) => sum + (Number.isSafeInteger(line.unitCostCents) && line.unitCostCents >= 0 && Number.isSafeInteger(line.quantity) && line.quantity > 0 ? line.unitCostCents * line.quantity : 0), 0);
        return { id: sale.id, completedAt: sale.createdAt, customerName: sale.customerName, subtotalCents: Number(sale.subtotalCents), discountCents: Number(sale.discountCents), totalCents: Number(sale.totalCents), knownCostCents: costCents, grossProfitCents: hasMissingCost ? null : Number(sale.totalCents) - costCents, lines };
      }),
      orders: orders.map(order => ({ id: order.id, orderNumber: order.orderNumber, supplierName: order.supplierName, receivedAt: order.receivedAt, currency: order.currency, totalCents: Number(order.totalCents), items: order.items })),
      stocks: stocks.map(stock => ({ id: stock.id, name: stock.name, sku: stock.sku, quantity: Number(stock.quantity), costPrice: Number(stock.costPrice), costCurrency: stock.costCurrency })),
    };
    res.json({ success: true, report: { ...calculateReport(sales, orders, stocks), undatedOrders: undatedOrders.length }, details, canResolve, missingSales, missingStocks, missingOrders: canResolve ? undatedOrders : [] });
  } catch (error) { next(error); }
});

router.patch('/missing-sale-cost', adminOnly, async (req, res, next) => {
  try {
    const { saleId, lineIndex, unitCost } = req.body;
    if (typeof saleId !== 'string' || !Number.isInteger(lineIndex) || lineIndex < 0 || typeof unitCost !== 'string' || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(unitCost)) return res.status(400).json({ message: 'Enter a valid cost per unit (up to two decimal places).' });
    const unitCostCents = Math.round(Number(unitCost) * 100);
    const outcome = await Sale.sequelize.transaction(async transaction => {
      const sale = await Sale.findOne({ where: { id: saleId, companyId: req.user.companyId, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) return 'missing';
      const lines = typeof sale.lines === 'string' ? JSON.parse(sale.lines) : sale.lines;
      const line = lines[lineIndex];
      if (!line) return 'missing';
      if (line.unitCostCents != null) return 'resolved';
      const updated = lines.map((item, i) => i === lineIndex ? { ...item, unitCostCents } : item);
      await sale.update({ lines: updated }, { transaction });
      return 'saved';
    });
    if (outcome === 'missing') return res.status(404).json({ message: 'Sale item not found in this branch.' });
    if (outcome === 'resolved') return res.status(409).json({ message: 'This cost has already been recorded. Refresh the report.' });
    res.json({ success: true });
  } catch (error) { next(error); }
});
router.patch('/missing-stock-currency', adminOnly, async (req, res, next) => {
  try {
    const { stockId, currency } = req.body;
    if (typeof stockId !== 'string' || currency !== 'LKR') return res.status(400).json({ message: 'Confirm the cost currency is LKR.' });
    const [updated] = await Stock.update({ costCurrency: 'LKR' }, { where: { id: stockId, branchId: req.branchId, costCurrency: null } });
    if (!updated) return res.status(409).json({ message: 'Stock is unavailable or its currency has already been recorded.' });
    res.json({ success: true });
  } catch (error) { next(error); }
});
router.patch('/missing-receipt-date', adminOnly, async (req, res, next) => {
  try {
    const { orderId, receivedAt } = req.body;
    if (typeof orderId !== 'string' || typeof receivedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(receivedAt) || !Number.isFinite(new Date(receivedAt).getTime()) || new Date(receivedAt).getTime() > Date.now()) return res.status(400).json({ message: 'Enter a valid receipt date that is not in the future.' });
    const [updated] = await PurchaseOrder.update({ receivedAt: new Date(receivedAt) }, { where: { id: orderId, companyId: req.user.companyId, branchId: req.branchId, status: 'Received', receivedAt: null }, silent: true });
    if (!updated) return res.status(409).json({ message: 'Order is unavailable or its receipt date has already been recorded.' });
    res.json({ success: true });
  } catch (error) { next(error); }
});
module.exports = router;
