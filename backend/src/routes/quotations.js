const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Quotation = require('../models/Quotation');
const Supplier = require('../models/Supplier');
const StockRequest = require('../models/StockRequest');
const Branch = require('../models/Branch');
const { validateQuotation, buildQuotationItems, serializeQuotation } = require('../services/quotations');

const router = express.Router();
router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId } })) {
      return res.status(403).json({ success: false, message: 'Select a branch belonging to your company.' });
    }
    next();
  } catch (error) { next(error); }
});
const scope = (req) => ({ companyId: req.user.companyId, branchId: req.branchId });
const attributes = { exclude: ['attachmentData'] };
const handleError = (error, res, next) => {
  if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
  if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'This supplier quotation number already exists in this branch.' });
  return next(error);
};

router.get('/', async (req, res, next) => {
  try {
    const quotes = await Quotation.findAll({ where: scope(req), attributes, order: [['createdAt', 'DESC']] });
    res.json({ success: true, quotations: quotes.map(serializeQuotation) });
  } catch (error) { next(error); }
});

router.get('/:id/attachment', async (req, res, next) => {
  try {
    const quote = await Quotation.findOne({ where: { id: req.params.id, ...scope(req) } });
    if (!quote?.attachmentData) return res.status(404).json({ success: false, message: 'Attachment not found.' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
    res.attachment(quote.attachmentName);
    res.set('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(quote.attachmentData, 'base64'));
  } catch (error) { next(error); }
});

async function save(req, res, next) {
  try {
    const values = validateQuotation(req.body);
    const quote = await Quotation.sequelize.transaction(async (transaction) => {
      const existing = req.params.id ? await Quotation.findOne({ where: { id: req.params.id, ...scope(req) }, attributes, transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (req.params.id && !existing) { const error = new Error('Quotation not found.'); error.status = 404; throw error; }
      const supplier = await Supplier.findOne({ where: { id: values.supplierId, companyId: req.user.companyId, isActive: true }, transaction });
      if (!supplier && existing?.supplierId !== values.supplierId) { const error = new Error('Select an active supplier from your company.'); error.status = 400; throw error; }
      const requests = await StockRequest.findAll({ where: { id: values.items.map((item) => item.requestId), branchId: req.branchId }, transaction });
      const payload = { ...values, ...buildQuotationItems(values.items, requests, existing?.items || []), ...scope(req), supplierName: supplier?.name || existing.supplierName };
      if (existing) return existing.update(payload, { transaction });
      return Quotation.create({ ...payload, createdBy: req.user.id }, { transaction });
    });
    res.status(req.params.id ? 200 : 201).json({ success: true, quotation: serializeQuotation(quote) });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
    handleError(error, res, next);
  }
}
router.post('/', save);
router.put('/:id', save);

module.exports = router;
