const express = require('express');
const { Op, QueryTypes } = require('sequelize');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const StockMovement = require('../models/StockMovement');
const { pagination } = require('../services/pagination');
const router = express.Router();
router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
function dateRange(query = {}) {
  const bounds = {};
  for (const [field, op] of [['start', Op.gte], ['end', Op.lt]]) {
    if (query[field] === undefined) continue;
    if (typeof query[field] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(query[field])) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 });
    const date = new Date(query[field]);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== query[field]) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 });
    bounds[op] = date;
  }
  if (bounds[Op.gte] && bounds[Op.lt] && bounds[Op.gte] >= bounds[Op.lt]) throw Object.assign(new Error('Enter a valid date range.'), { status: 400 });
  return Object.getOwnPropertySymbols(bounds).length ? { createdAt: bounds } : {};
}
router.get('/', async (req, res, next) => {
  try {
    const paging = pagination(req.query);
    if (paging) {
      const bounds = dateRange(req.query).createdAt || {};
      const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0,160) : '';
      const kind = req.query.kind || 'all';
      if (!['all','manual_add','purchase','sale','repair','delete','adjustment','sale_return'].includes(kind)) return res.status(400).json({ message: 'Invalid movement type.' });
      const conditions = ['company_id = :company', 'branch_id = :branch'];
      const replacements = { company: req.user.companyId, branch: req.branchId, limit: paging.limit, offset: paging.offset };
      if (bounds[Op.gte]) { conditions.push('created_at >= :start'); replacements.start = bounds[Op.gte]; }
      if (bounds[Op.lt]) { conditions.push('created_at < :end'); replacements.end = bounds[Op.lt]; }
      if (kind !== 'all') { conditions.push('kind = :kind'); replacements.kind = kind; }
      if (search) { conditions.push('(item_name LIKE :search OR sku LIKE :search OR reference_label LIKE :search OR stock_id LIKE :search)'); replacements.search = `%${search}%`; }
      const key = "CASE WHEN sku IS NOT NULL AND sku <> '' THEN CONCAT('sku:', LOWER(sku)) ELSE CONCAT('batch:', stock_id) END";
      const filtered = conditions.join(' AND ');
      const [groups, counts] = await Promise.all([
        StockMovement.sequelize.query(`SELECT id, movement_count FROM (SELECT id, created_at, COUNT(*) OVER (PARTITION BY ${key}) AS movement_count, ROW_NUMBER() OVER (PARTITION BY ${key} ORDER BY created_at DESC, id DESC) AS row_num FROM stock_movements WHERE ${filtered}) ranked WHERE row_num = 1 ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT }),
        StockMovement.sequelize.query(`SELECT COUNT(*) AS total FROM (SELECT ${key} AS group_key FROM stock_movements WHERE ${filtered} GROUP BY group_key) grouped`, { replacements, type: QueryTypes.SELECT }),
      ]);
      const records = groups.length ? await StockMovement.findAll({ where: { companyId: req.user.companyId, branchId: req.branchId, id: groups.map(group => group.id) } }) : [];
      const byId = new Map(records.map(record => [record.id, record]));
      return res.json({ success:true, groups:groups.filter(group => byId.has(group.id)).map(group => ({ latest:byId.get(group.id), count:Number(group.movement_count) })), total:Number(counts[0].total), page:paging.page, pageSize:paging.pageSize });
    }
    const movements = await StockMovement.findAll({ where: { companyId: req.user.companyId, branchId: req.branchId, ...dateRange(req.query) }, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 500 });
    res.json({ success: true, movements });
  } catch (error) { if (error.status === 400) return res.status(400).json({ message: error.message }); next(error); }
});
router.get('/:id/history', async (req, res, next) => {
  try {
    const scope = { companyId: req.user.companyId, branchId: req.branchId };
    const selected = await StockMovement.findOne({ where: { ...scope, id: req.params.id } });
    if (!selected) return res.status(404).json({ message: 'Stock movement not found.' });
    // SKUs are optional and are not unique in the catalog. The UI describes
    // this as a same-SKU history so unrelated batches are not implied identical.
    const filter = selected.sku ? { sku: selected.sku } : { stockId: selected.stockId };
    const movements = await StockMovement.findAll({ where: { ...scope, ...filter, ...dateRange(req.query) }, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 500 });
    res.json({ success: true, movements, match: selected.sku ? 'sku' : 'batch' });
  } catch (error) { if (error.status === 400) return res.status(400).json({ message: error.message }); next(error); }
});
module.exports = router;
