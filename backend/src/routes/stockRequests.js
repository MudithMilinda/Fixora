const express = require('express');
const { Op } = require('sequelize');
const { requireAuth } = require('../middleware/requireAuth');
const StockRequest = require('../models/StockRequest');
const Item = require('../models/Item');
const Stock = require('../models/Stock');
const { RepairJob } = require('../models/RepairJob');
const { calculateLowStock } = require('../services/lowStock');

const router = express.Router();
router.use(requireAuth);

const serialize = (request) => ({ id: request.id, itemId: request.itemId, itemName: request.itemName, sku: request.sku, quantity: request.quantity, note: request.note, status: request.status, createdAt: request.createdAt });

router.get('/', async (req, res, next) => {
  try {
    const requests = await StockRequest.findAll({ where: { branchId: req.branchId }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, requests: requests.map(serialize) });
  } catch (error) { next(error); }
});

router.get('/low-stock', async (req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [stocks, repairJobs] = await Promise.all([
      Stock.findAll({ where: { branchId: req.branchId, isArchived: false, itemId: { [Op.ne]: null } }, order: [['quantity', 'ASC'], ['name', 'ASC']] }),
      RepairJob.findAll({ where: { branchId: req.branchId, createdAt: { [Op.gte]: since } }, attributes: ['parts'] }),
    ]);
    const items = await Item.findAll({ where: { id: [...new Set(stocks.map(stock => stock.itemId))] }, attributes: ['id', 'name', 'sku', 'minimumStock'] });
    res.json({ success: true, items: calculateLowStock(stocks, items, repairJobs) });
  } catch (error) { next(error); }
});

router.post('/purchase-list', async (req, res, next) => {
  const transaction = await StockRequest.sequelize.transaction();
  try {
    const entries = Array.isArray(req.body.items) ? req.body.items : [];
    if (!req.branchId || !entries.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Select at least one low-stock item.' });
    }
    const ids = [...new Set(entries.map((entry) => entry.stockId).filter((id) => typeof id === 'string'))];
    const stocks = await Stock.findAll({ where: { id: ids, branchId: req.branchId, isArchived: false }, transaction });
    if (stocks.length !== ids.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'One or more selected stock items are unavailable in this branch.' });
    }
    const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
    const requests = [];
    for (const entry of entries) {
      const quantity = Number(entry.quantity);
      const stock = stockById.get(entry.stockId);
      if (!stock || !stock.itemId || !Number.isInteger(quantity) || quantity < 1) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Each selected item needs a valid order quantity.' });
      }
      requests.push(await StockRequest.create({ itemId: stock.itemId, branchId: req.branchId, itemName: stock.name, sku: stock.sku, quantity, note: 'Created from low-stock purchase list', requestedBy: req.user.id }, { transaction }));
    }
    await transaction.commit();
    return res.status(201).json({ success: true, requests: requests.map(serialize) });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    const item = await Item.findByPk(req.body.itemId);
    if (!req.branchId || !item || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: 'Select an item and valid quantity.' });
    const request = await StockRequest.create({ itemId: item.id, branchId: req.branchId, itemName: item.name, sku: item.sku, quantity, note: typeof req.body.note === 'string' ? req.body.note.trim() || null : null, requestedBy: req.user.id });
    res.status(201).json({ success: true, request: serialize(request) });
  } catch (error) { next(error); }
});

router.post('/bulk', async (req, res, next) => {
  const transaction = await StockRequest.sequelize.transaction();
  try {
    const entries = Array.isArray(req.body.items) ? req.body.items : [];
    if (!req.branchId || !entries.length || entries.length > 100) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Add between 1 and 100 purchase request items.' });
    }
    const itemIds = entries.map((entry) => entry?.itemId);
    if (itemIds.some((itemId) => typeof itemId !== 'string') || new Set(itemIds).size !== itemIds.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Each purchase item must be selected once.' });
    }
    const items = await Item.findAll({ where: { id: itemIds }, transaction });
    if (items.length !== itemIds.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'One or more selected items are unavailable.' });
    }
    const itemById = new Map(items.map((item) => [item.id, item]));
    const requests = [];
    for (const entry of entries) {
      const quantity = Number(entry.quantity);
      const item = itemById.get(entry.itemId);
      if (!item || !Number.isInteger(quantity) || quantity < 1) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Each item needs a valid quantity.' });
      }
      requests.push(await StockRequest.create({
        itemId: item.id,
        branchId: req.branchId,
        itemName: item.name,
        sku: item.sku,
        quantity,
        note: 'Manually created purchase request',
        requestedBy: req.user.id,
      }, { transaction }));
    }
    await transaction.commit();
    return res.status(201).json({ success: true, requests: requests.map(serialize) });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const request = await StockRequest.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    const statuses = ['Pending', 'Approved', 'Ordered', 'Received', 'Rejected'];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    const updates = {};
    if (typeof req.body.status !== 'undefined') {
      if (!statuses.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
      updates.status = req.body.status;
    }
    if (typeof req.body.quantity !== 'undefined') {
      const quantity = Number(req.body.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: 'Enter a valid quantity.' });
      updates.quantity = quantity;
    }
    if (typeof req.body.note !== 'undefined') {
      if (typeof req.body.note !== 'string') return res.status(400).json({ success: false, message: 'Enter a valid note.' });
      updates.note = req.body.note.trim() || null;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No changes supplied.' });
    await request.update(updates);
    res.json({ success: true, request: serialize(request) });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const request = await StockRequest.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    await request.destroy();
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
