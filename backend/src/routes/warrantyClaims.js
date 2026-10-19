const express = require('express');
const { Op } = require('sequelize');
const { randomUUID } = require('crypto');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const Sale = require('../models/Sale');
const Claim = require('../models/WarrantyClaim');
const { RepairJob } = require('../models/RepairJob');
const { localDay } = require('../services/repairWarranty');
const { pagination } = require('../services/pagination');
const router = express.Router();
const fail = message => Object.assign(new Error(message), { status: 400 });
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
router.use(requireAuth, async (req, res, next) => { try { if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' }); next(); } catch (e) { next(e); } });
router.get('/', async (req, res, next) => { try {
  const paging = pagination({ page: req.query.page || '1' });
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  if (status && !['Received', 'In progress', 'Resolved'].includes(status)) throw fail('Select a valid status.');
  const where = { companyId: req.user.companyId, branchId: req.branchId, ...(status ? { status } : {}), ...(search ? { [Op.or]: ['customerName', 'customerPhone', 'itemName', 'sku', 'number', 'repairJobNumber'].map(field => ({ [field]: { [Op.like]: `%${search}%` } })) } : {}) };
  const result = await Claim.findAndCountAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: paging.limit, offset: paging.offset });
  res.json({ claims: result.rows, total: result.count, pageSize: paging.pageSize });
} catch (e) { if (e.status) return res.status(e.status).json({ message: e.message }); next(e); } });
router.post('/', async (req, res, next) => { try {
  const { saleId, lineIndex } = req.body;
  const issue = typeof req.body.issue === 'string' ? req.body.issue.trim() : '';
  const number = typeof req.body.number === 'string' ? req.body.number.trim() : '';
  if (typeof saleId !== 'string' || !Number.isSafeInteger(lineIndex) || lineIndex < 0 || !issue || issue.length > 5000 || number.length > 120) throw fail('Select an item and enter the reported issue.');
  const sale = await Sale.findOne({ where: { id: saleId, companyId: req.user.companyId, branchId: req.branchId } });
  if (!sale) return res.status(404).json({ message: 'Sale not found in this branch.' });
  const line = parse(sale.lines)?.[lineIndex], w = line?.warranty, today = localDay();
  if (!w?.count || !w.start || !w.end || today < w.start || today > w.end) throw fail('This item does not have an active recorded warranty.');
  if (w.numbers?.length && !w.numbers.includes(number)) throw fail('Select a number recorded for this item.');
  if (!w.numbers?.length && number) throw fail('No serial or warranty number was recorded for this item.');
  const claim = await Claim.create({ companyId: req.user.companyId, branchId: req.branchId, saleId, lineIndex, customerName: sale.customerName || 'Walk-in customer', customerPhone: sale.customerPhone || '', itemName: line.name, sku: line.sku || null, number: number || null, issue, warrantyEnd: w.end, createdBy: req.user.id });
  res.status(201).json({ claim });
} catch (e) { if (e.status) return res.status(e.status).json({ message: e.message }); next(e); } });
router.patch('/:id', async (req, res, next) => { try {
  const status = req.body.status, outcome = req.body.outcome || null, note = typeof req.body.resolutionNote === 'string' ? req.body.resolutionNote.trim() : '';
  if (!['Received', 'In progress', 'Resolved'].includes(status) || (status === 'Resolved' && !['Repaired', 'Replaced', 'Rejected'].includes(outcome)) || (status !== 'Resolved' && outcome) || note.length > 5000) throw fail('Select a valid status and resolution.');
  const claim = await Claim.findOne({ where: { id: req.params.id, companyId: req.user.companyId, branchId: req.branchId } });
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  await claim.update({ status, outcome, resolutionNote: note || null }); res.json({ claim });
} catch (e) { if (e.status) return res.status(e.status).json({ message: e.message }); next(e); } });
router.post('/:id/repair', async (req, res, next) => { try {
  const result = await Claim.sequelize.transaction(async transaction => {
    const claim = await Claim.findOne({ where: { id: req.params.id, companyId: req.user.companyId, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!claim) throw Object.assign(new Error('Claim not found.'), { status: 404 });
    if (claim.repairId) throw fail('This claim already has a repair job.');
    if (claim.status === 'Resolved') throw fail('A resolved claim cannot start a repair.');
    const jobNumber = `REP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const job = await RepairJob.create({ jobNumber, customerName: claim.customerName, customerPhone: claim.customerPhone || null, assetName: claim.itemName, assetType: 'Other asset', assetIdentifier: claim.number || null, issue: claim.issue, priority: 'Normal', branchId: req.branchId, parts: [], createdBy: req.user.id, warrantyClaim: true }, { transaction });
    await claim.update({ repairId: job.id, repairJobNumber: job.jobNumber, status: 'In progress' }, { transaction }); return claim;
  }); res.status(201).json({ claim: result });
} catch (e) { if (e.status) return res.status(e.status).json({ message: e.message }); next(e); } });
module.exports = router;
