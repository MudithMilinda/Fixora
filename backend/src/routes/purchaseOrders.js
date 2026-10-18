const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const PurchaseOrder = require('../models/PurchaseOrder');
const Stock = require('../models/Stock');
const { recordMovement } = require('../services/stockMovement');

const router = express.Router();
router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId } })) return res.status(403).json({ success: false, message: 'Select a branch belonging to your company.' });
    next();
  } catch (error) { next(error); }
});
const scope = (req) => ({ companyId: req.user.companyId, branchId: req.branchId });
const serialize = (order) => ({ id: order.id, quotationId: order.quotationId, orderNumber: order.orderNumber, supplierId: order.supplierId, supplierName: order.supplierName, currency: order.currency, items: order.items, totalCents: Number(order.totalCents), status: order.status, createdAt: order.createdAt });

router.get('/', async (req, res, next) => {
  try {
    const orders = await PurchaseOrder.findAll({ where: scope(req), order: [['createdAt', 'DESC']] });
    res.json({ success: true, orders: orders.map(serialize) });
  } catch (error) { next(error); }
});

router.patch('/:id/receive', async (req, res, next) => {
  try {
    const order = await PurchaseOrder.sequelize.transaction(async (transaction) => {
      const record = await PurchaseOrder.findOne({ where: { id: req.params.id, ...scope(req) }, transaction, lock: transaction.LOCK.UPDATE });
      if (!record) { const error = new Error('Purchase order not found.'); error.status = 404; throw error; }
      if (record.status !== 'Ordered') { const error = new Error('Only ordered purchase orders can be marked as received.'); error.status = 400; throw error; }
      const prices = new Map((Array.isArray(req.body.items) ? req.body.items : []).map((item) => [item?.requestId, item?.sellingPrice]));
      if (prices.size !== record.items.length) { const error = new Error('Enter a selling price for every received item.'); error.status = 400; throw error; }
      for (const item of record.items) {
        const sellingPrice = Number(prices.get(item.requestId));
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0 || sellingPrice > 99999999.99) { const error = new Error('Enter valid selling prices.'); error.status = 400; throw error; }
        // Each delivery is a distinct stock batch. Do not combine it with an
        // existing item: that would overwrite the previous batch's cost and
        // selling price and make the stock store pricing inaccurate.
        const stock = await Stock.create({
          itemId: item.itemId,
          branchId: req.branchId,
          name: item.itemName,
          sku: item.sku,
          quantity: Number(item.quantity),
          costPrice: item.unitPriceCents / 100,
          costCurrency: record.currency,
          sellingPrice,
        }, { transaction });
        await recordMovement({ stock, req, kind: 'purchase', change: Number(stock.quantity), balanceAfter: Number(stock.quantity), referenceId: record.id, referenceLabel: record.orderNumber, transaction });
      }
      await record.update({ status: 'Received', receivedAt: new Date() }, { transaction });
      return record;
    });
    res.json({ success: true, order: serialize(order) });
  } catch (error) {
    if (error.status === 400 || error.status === 404) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
});

module.exports = { router, serialize };
