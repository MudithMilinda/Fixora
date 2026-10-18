const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const Stock = require('../models/Stock');
const Sale = require('../models/Sale');
const { RepairJob } = require('../models/RepairJob');
const router = express.Router();
const methods = ['Cash', 'Credit card', 'Debit card', 'Bank transfer'];
const bad = message => Object.assign(new Error(message), { status: 400 });
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
const cents = value => {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) throw bad('Enter a valid amount.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 99999999.99 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw bad('Enter valid amounts with at most two decimal places.');
  return Math.round(n * 100);
};
const serialize = s => ({ id: s.id, completedAt: s.createdAt, customerName: s.customerName, customerPhone: s.customerPhone, subtotal: Number(s.subtotalCents) / 100, discount: Number(s.discountCents) / 100, total: Number(s.totalCents) / 100, lines: parse(s.lines), payments: parse(s.payments), repair: s.repair ? parse(s.repair) : undefined });
router.use(requireAuth, async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ success: false, message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try { const sales = await Sale.findAll({ where: { companyId: req.user.companyId, branchId: req.branchId }, order: [['createdAt', 'DESC']] }); res.json({ success: true, sales: sales.map(serialize) }); } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const { requestId, repairId, lines: inputLines, payments: inputPayments } = req.body;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) || !Array.isArray(inputLines) || !inputLines.length || inputLines.length > 100 || !Array.isArray(inputPayments) || inputPayments.length > 100) throw bad('Invalid sale details.');
    const customerName = typeof req.body.customerName === 'string' ? req.body.customerName.trim() : '';
    const customerPhone = typeof req.body.customerPhone === 'string' ? req.body.customerPhone.trim() : '';
    if (customerName.length > 120 || customerPhone.length > 32) throw bad('Customer details are too long.');
    const sale = await Sale.sequelize.transaction(async transaction => {
      const existing = await Sale.findOne({ where: { requestId, companyId: req.user.companyId, branchId: req.branchId, createdBy: req.user.id }, transaction });
      if (existing) return existing;
      let repair = null, repairParts = [];
      if (repairId) {
        const job = await RepairJob.findOne({ where: { id: repairId, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!job || job.status !== 'Delivered') throw bad('The delivered repair is unavailable in this branch.');
        if (await Sale.findOne({ where: { repairId: job.id }, transaction })) throw bad('This repair has already been paid.');
        repairParts = job.parts ? parse(job.parts) : [];
        repair = { jobNumber: job.jobNumber, assetName: job.assetName, assetIdentifier: job.assetIdentifier, issue: job.issue };
      }
      if (inputLines.some(line => !line || typeof line !== 'object') || inputPayments.some(payment => !payment || typeof payment !== 'object')) throw bad('Invalid sale details.');
      const stockIds = [...new Set(inputLines.filter(l => l.type === 'stock').map(l => l.stockId))].sort();
      const stocks = stockIds.length ? await Stock.findAll({ where: { id: stockIds, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE, order: [['id', 'ASC']] }) : [];
      const stockMap = new Map(stocks.map(stock => [stock.id, stock]));
      const usedStocks = new Set(), usedParts = new Set();
      const lines = [];
      for (const line of inputLines) {
        const quantity = Number(line.quantity);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw bad('Enter a valid item quantity.');
        let name, sku, unitPrice, unitCostCents = null;
        if (line.type === 'stock') {
          const stock = stockMap.get(line.stockId);
          if (!stock || usedStocks.has(stock.id) || stock.quantity < quantity) throw bad('A stock item is unavailable or has insufficient quantity. Reload and try again.');
          usedStocks.add(stock.id); name = stock.name; sku = stock.sku; unitPrice = cents(stock.sellingPrice); unitCostCents = stock.costCurrency === 'LKR' ? cents(stock.costPrice) : null;
          await stock.update({ quantity: stock.quantity - quantity }, { transaction });
        } else if (line.type === 'repair') {
          const part = Number.isInteger(line.partIndex) && repairParts[line.partIndex];
          if (!repair || !part || usedParts.has(line.partIndex) || quantity > part.quantity) throw bad('A repair part is invalid.');
          usedParts.add(line.partIndex); name = part.name; sku = part.sku || null; unitPrice = cents(part.unitPrice ?? Number(part.total) / Number(part.quantity)); unitCostCents = part.unitCostCents == null ? null : cents(Number(part.unitCostCents) / 100);
        } else if (line.type === 'custom') {
          name = typeof line.name === 'string' ? line.name.trim() : ''; sku = null; unitPrice = cents(line.unitPrice);
          if (!name || name.length > 160) throw bad('Enter a valid custom item name.');
        } else throw bad('Invalid sale item.');
        lines.push({ name, sku, quantity, unitPrice: unitPrice / 100, unitCostCents, type: line.type });
      }
      const subtotal = lines.reduce((sum, line) => sum + cents(line.unitPrice) * line.quantity, 0);
      if (!Number.isSafeInteger(subtotal) || subtotal > 999999999999) throw bad('Sale total is too large.');
      const discount = cents(req.body.discount);
      if (discount > subtotal) throw bad('Discount exceeds the subtotal.');
      const payments = inputPayments.map(payment => { if (!methods.includes(payment.method)) throw bad('Invalid payment method.'); const amount = cents(payment.amount); if (amount <= 0) throw bad('Enter a valid payment amount.'); return { method: payment.method, amount: amount / 100 }; });
      const total = subtotal - discount;
      if (payments.reduce((sum, payment) => sum + cents(payment.amount), 0) !== total) throw bad('Payment amounts must equal the sale total. Check prices and try again.');
      return Sale.create({ requestId, companyId: req.user.companyId, branchId: req.branchId, createdBy: req.user.id, repairId: repairId || null, customerName, customerPhone, subtotalCents: subtotal, discountCents: discount, totalCents: total, lines, payments, repair }, { transaction });
    });
    res.status(201).json({ success: true, sale: serialize(sale) });
  } catch (error) { if (error.status === 400) return res.status(400).json({ success: false, message: error.message }); if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'This sale or repair has already been recorded. Refresh payment history.' }); next(error); }
});
module.exports = router;
