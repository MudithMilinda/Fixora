const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const StockMovement = require('../models/StockMovement');
const router = express.Router();
router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try {
    const movements = await StockMovement.findAll({ where: { companyId: req.user.companyId, branchId: req.branchId }, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 500 });
    res.json({ success: true, movements });
  } catch (error) { next(error); }
});
router.get('/:id/history', async (req, res, next) => {
  try {
    const scope = { companyId: req.user.companyId, branchId: req.branchId };
    const selected = await StockMovement.findOne({ where: { ...scope, id: req.params.id } });
    if (!selected) return res.status(404).json({ message: 'Stock movement not found.' });
    // SKUs are optional and are not unique in the catalog. The UI describes
    // this as a same-SKU history so unrelated batches are not implied identical.
    const filter = selected.sku ? { sku: selected.sku } : { stockId: selected.stockId };
    const movements = await StockMovement.findAll({ where: { ...scope, ...filter }, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 500 });
    res.json({ success: true, movements, match: selected.sku ? 'sku' : 'batch' });
  } catch (error) { next(error); }
});
module.exports = router;
