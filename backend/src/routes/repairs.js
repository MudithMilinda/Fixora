const express = require("express");
const { Op } = require("sequelize");
const { RepairJob, REPAIR_STATUSES, ASSET_TYPES } = require("../models/RepairJob");
const Stock = require("../models/Stock");
const Branch = require("../models/Branch");
const UserBranch = require("../models/UserBranch");
const { recordMovement } = require("../services/stockMovement");
const { requireAuth } = require("../middleware/requireAuth");
const { warrantyDates, warrantyPeriodDates, warrantyStatus, completedStatuses } = require('../services/repairWarranty');
const { pagination } = require('../services/pagination');

const router = express.Router();
router.use(requireAuth, async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
async function assignParts(req, job, requestedParts, transaction) {
  if (requestedParts.some(part => !part || typeof part.stockId !== 'string' || !Number.isSafeInteger(Number(part.quantity)) || Number(part.quantity) < 1)) throw Object.assign(new Error('A selected part is invalid.'), { status: 400 });
  const ids = [...new Set(requestedParts.map(part => part.stockId))].sort();
  const rows = ids.length ? await Stock.findAll({ where: { id: ids, branchId: req.branchId, isArchived: false }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE }) : [];
  const stocks = new Map(rows.map(row => [row.id, row]));
  const parts = [];
  for (const part of requestedParts) {
    const stock = stocks.get(part.stockId), quantity = Number(part.quantity);
    if (!stock || stock.quantity < quantity) throw Object.assign(new Error('A selected part is unavailable or has insufficient stock.'), { status: 400 });
    const balanceAfter = Number(stock.quantity) - quantity;
    await stock.update({ quantity: balanceAfter }, { transaction });
    await recordMovement({ stock, req, kind: 'repair', change: -quantity, balanceAfter, referenceId: job.id, referenceLabel: job.jobNumber, transaction });
    parts.push({ stockId: stock.id, name: stock.name, sku: stock.sku, quantity, unitPrice: Number(stock.sellingPrice), unitCostCents: stock.costCurrency === 'LKR' ? Math.round(Number(stock.costPrice) * 100) : null, total: Number(stock.sellingPrice) * quantity });
  }
  return parts;
}

function readParts(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serialize(job) {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    assetName: job.assetName,
    assetType: job.assetType,
    assetIdentifier: job.assetIdentifier,
    issue: job.issue,
    status: job.status,
    technician: job.technician || "Unassigned",
    promisedDate: job.promisedDate,
    priority: job.priority,
    parts: readParts(job.parts),
    warrantyDays: job.warrantyDays ?? null, warrantyStart: job.warrantyStart || null, warrantyEnd: job.warrantyEnd || null, warrantyStatus: warrantyStatus(job),
    parentRepairId: job.parentRepairId || null, parentJobNumber: job.parentJobNumber || null, warrantyClaim: !!job.warrantyClaim,
    createdAt: job.createdAt,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const activeStatuses = REPAIR_STATUSES.filter((item) => !["Delivered", "Closed", "Cancelled"].includes(item));
    const where = { branchId: req.branchId, status: status && activeStatuses.includes(status) ? status : { [Op.in]: activeStatuses } };
    if (search) {
      where[Op.or] = [
        { jobNumber: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { assetName: { [Op.like]: `%${search}%` } },
        { issue: { [Op.like]: `%${search}%` } },
      ];
    }

    const jobs = await RepairJob.findAll({ where, order: [["createdAt", "DESC"]] });
    return res.status(200).json({ success: true, jobs: jobs.map(serialize) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const customerName = typeof req.body.customerName === "string" ? req.body.customerName.trim() : "";
    const customerPhone = typeof req.body.customerPhone === "string" ? req.body.customerPhone.trim() : "";
    const assetName = typeof req.body.assetName === "string" ? req.body.assetName.trim() : "";
    const assetType = ASSET_TYPES.includes(req.body.assetType) ? req.body.assetType : "Other asset";
    const assetIdentifier = typeof req.body.assetIdentifier === "string" ? req.body.assetIdentifier.trim() : "";
    const issue = typeof req.body.issue === "string" ? req.body.issue.trim() : "";
    const technician = typeof req.body.technician === "string" ? req.body.technician.trim() : "";
    const priority = ["Normal", "High", "Urgent"].includes(req.body.priority) ? req.body.priority : "Normal";
    const promisedDate = req.body.promisedDate ? new Date(req.body.promisedDate) : null;
    const requestedParts = Array.isArray(req.body.parts) ? req.body.parts : [];
    const parentRepairId = req.body.parentRepairId;
    if (parentRepairId !== undefined && (typeof parentRepairId !== 'string' || !parentRepairId)) return res.status(400).json({ message: 'Select a valid original repair.' });

    if (!customerName || !assetName || !issue || customerName.length > 120 || customerPhone.length > 32 || assetName.length > 160 || assetIdentifier.length > 160 || issue.length > 5000) {
      return res.status(400).json({ success: false, message: "Customer, asset, and repair issue are required." });
    }
    if (promisedDate && Number.isNaN(promisedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Enter a valid promised date." });
    }

    const jobNumber = `REP-${Date.now().toString().slice(-8)}`;
    const job = await RepairJob.sequelize.transaction(async transaction => {
      let parent = null;
      if (parentRepairId) {
        parent = await RepairJob.findOne({ where: { id: parentRepairId, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!parent || !completedStatuses.includes(parent.status)) throw Object.assign(new Error('The original completed repair was not found in this branch.'), { status: 400 });
      }
      const created = await RepairJob.create({ jobNumber, customerName, customerPhone: customerPhone || null, assetName, assetType, assetIdentifier: assetIdentifier || null, issue, technician: technician || null, promisedDate, priority, branchId: req.branchId, parts: [], createdBy: req.user.id, parentRepairId: parent?.id || null, parentJobNumber: parent?.jobNumber || null, warrantyClaim: parent ? warrantyStatus(parent) === 'active' : false }, { transaction });
      const parts = await assignParts(req, created, requestedParts, transaction);
      if (parts.length) await created.update({ parts }, { transaction });
      return created;
    });
    return res.status(201).json({ success: true, message: "Repair job created.", job: serialize(job) });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
    return next(error);
  }
});

router.get('/customer-suggestions', async (req, res, next) => {
  try {
    const query = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : '';
    if (query.length < 2) return res.json({ customers: [] });
    const jobs = await RepairJob.findAll({ where: { branchId: req.branchId, customerName: { [Op.like]: `%${query}%` } }, attributes: ['id', 'jobNumber', 'assetName', 'customerName', 'customerPhone'], order: [['updatedAt', 'DESC'], ['id', 'DESC']], limit: 100, raw: true });
    const customers = new Map();
    for (const job of jobs) {
      // Without a phone number there is no reliable way to join two people with the same name.
      const key = job.customerPhone ? JSON.stringify([job.customerName, job.customerPhone]) : job.id;
      if (!customers.has(key)) customers.set(key, { id: job.id, name: job.customerName, phone: job.customerPhone || null, jobNumber: job.jobNumber, assetName: job.assetName });
    }
    res.json({ customers: [...customers.values()].slice(0, 20) });
  } catch (error) { next(error); }
});
router.get('/customer-history/:id', async (req, res, next) => {
  try {
    const source = await RepairJob.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    if (!source) return res.status(404).json({ message: 'Customer history not found in this branch.' });
    const where = source.customerPhone ? { branchId: req.branchId, customerName: source.customerName, customerPhone: source.customerPhone } : { branchId: req.branchId, id: source.id };
    const jobs = await RepairJob.findAll({ where, order: [['updatedAt', 'DESC'], ['id', 'DESC']], limit: 100 });
    res.json({ jobs: jobs.map(serialize) });
  } catch (error) { next(error); }
});
router.get("/history", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const historyStatuses = ["Delivered", "Closed"];
    const where = { branchId: req.branchId, status: status && historyStatuses.includes(status) ? status : { [Op.in]: historyStatuses } };
    if (search) {
      where[Op.or] = [
        { jobNumber: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { assetName: { [Op.like]: `%${search}%` } },
      ];
    }
    const paging = pagination(req.query);
    if (paging) {
      const { from, to } = req.query;
      if ((from && (typeof from !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !Number.isFinite(Date.parse(`${from}T00:00:00Z`)))) || (to && (typeof to !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(to) || !Number.isFinite(Date.parse(`${to}T00:00:00Z`))))) return res.status(400).json({ message: 'Enter valid dates.' });
      if (from || to) { where.promisedDate = {}; if (from) where.promisedDate[Op.gte] = new Date(`${from}T00:00:00Z`); if (to) { const end = new Date(`${to}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1); where.promisedDate[Op.lt] = end; } }
      const result = await RepairJob.findAndCountAll({ where, order: [['updatedAt', 'DESC'], ['id', 'DESC']], limit: paging.limit, offset: paging.offset });
      return res.json({ success:true, jobs:result.rows.map(serialize), total:result.count, page:paging.page, pageSize:paging.pageSize });
    }
    const jobs = await RepairJob.findAll({ where, order: [["updatedAt", "DESC"]] });
    return res.status(200).json({ success: true, jobs: jobs.map(serialize) });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const job = await RepairJob.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    if (!job) return res.status(404).json({ success: false, message: "Repair job not found." });
    return res.status(200).json({ success: true, job: serialize(job) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const job = await RepairJob.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    if (!job) return res.status(404).json({ success: false, message: "Repair job not found." });

    const customerName = typeof req.body.customerName === "string" ? req.body.customerName.trim() : job.customerName;
    const assetName = typeof req.body.assetName === "string" ? req.body.assetName.trim() : job.assetName;
    const issue = typeof req.body.issue === "string" ? req.body.issue.trim() : job.issue;
    const assetType = ASSET_TYPES.includes(req.body.assetType) ? req.body.assetType : job.assetType;
    const priority = ["Normal", "High", "Urgent"].includes(req.body.priority) ? req.body.priority : job.priority;
    const status = REPAIR_STATUSES.includes(req.body.status) ? req.body.status : job.status;
    const promisedDate = req.body.promisedDate ? new Date(req.body.promisedDate) : null;
    const requestedParts = Array.isArray(req.body.parts) ? req.body.parts : [];
    if (!customerName || !assetName || !issue || customerName.length > 120 || assetName.length > 160 || issue.length > 5000) {
      return res.status(400).json({ success: false, message: "Customer, asset, and repair issue are required." });
    }
    if (promisedDate && Number.isNaN(promisedDate.getTime())) return res.status(400).json({ success: false, message: "Enter a valid promised date." });

    const updated = await RepairJob.sequelize.transaction(async transaction => {
      const locked = await RepairJob.findOne({ where: { id: req.params.id, branchId: req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) throw Object.assign(new Error('Repair job not found.'), { status: 404 });
      const parts = [...readParts(locked.parts), ...await assignParts(req, locked, requestedParts, transaction)];
      let warranty = {};
      if (completedStatuses.includes(status) && !completedStatuses.includes(locked.status) && locked.warrantyDays == null) {
        const days = req.body.warrantyDays === undefined ? 0 : req.body.warrantyDays;
        warranty = req.body.warrantyPeriod === undefined ? warrantyDates(days) : warrantyPeriodDates(req.body.warrantyPeriod?.count, req.body.warrantyPeriod?.unit);
      }
      await locked.update({ customerName, assetName, issue, assetType, priority, status, promisedDate: req.body.promisedDate === undefined ? locked.promisedDate : promisedDate, parts, ...warranty, customerPhone: typeof req.body.customerPhone === 'string' ? req.body.customerPhone.trim() || null : locked.customerPhone, assetIdentifier: typeof req.body.assetIdentifier === 'string' ? req.body.assetIdentifier.trim() || null : locked.assetIdentifier, technician: typeof req.body.technician === 'string' ? req.body.technician.trim() || null : locked.technician }, { transaction });
      return locked;
    });
    return res.status(200).json({ success: true, message: "Repair job updated.", job: serialize(updated) });
  } catch (error) { if (error.status === 400 || error.status === 404) return res.status(error.status).json({ success: false, message: error.message }); return next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const job = await RepairJob.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    if (!job) return res.status(404).json({ success: false, message: "Repair job not found." });
    if (await RepairJob.findOne({ where: { parentRepairId: job.id, branchId: req.branchId } })) return res.status(409).json({ success: false, message: 'This repair has linked follow-up jobs and cannot be deleted.' });
    await job.destroy();
    return res.status(204).end();
  } catch (error) { return next(error); }
});

module.exports = router;
