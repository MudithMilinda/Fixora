const express = require("express");
const { Op } = require("sequelize");
const { RepairJob, REPAIR_STATUSES, ASSET_TYPES } = require("../models/RepairJob");
const Stock = require("../models/Stock");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

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

    if (!customerName || !assetName || !issue || customerName.length > 120 || assetName.length > 160 || issue.length > 5000) {
      return res.status(400).json({ success: false, message: "Customer, asset, and repair issue are required." });
    }
    if (promisedDate && Number.isNaN(promisedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Enter a valid promised date." });
    }

    const parts = [];
    for (const requestedPart of requestedParts) {
      const quantity = Number(requestedPart.quantity);
      const stock = await Stock.findOne({ where: { id: requestedPart.stockId, branchId: req.branchId } });
      if (!stock || !Number.isInteger(quantity) || quantity < 1 || stock.quantity < quantity) return res.status(400).json({ success: false, message: "A selected part is unavailable or has insufficient stock." });
      await stock.update({ quantity: stock.quantity - quantity });
      parts.push({ stockId: stock.id, name: stock.name, sku: stock.sku, quantity, unitPrice: Number(stock.sellingPrice), unitCostCents: stock.costCurrency === 'LKR' ? Math.round(Number(stock.costPrice) * 100) : null, total: Number(stock.sellingPrice) * quantity });
    }
    const jobNumber = `REP-${Date.now().toString().slice(-8)}`;
    const job = await RepairJob.create({
      jobNumber,
      customerName,
      customerPhone: customerPhone || null,
      assetName,
      assetType,
      assetIdentifier: assetIdentifier || null,
      issue,
      technician: technician || null,
      promisedDate,
      priority,
      branchId: req.branchId,
      parts,
      createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, message: "Repair job created.", job: serialize(job) });
  } catch (error) {
    return next(error);
  }
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
    const jobs = await RepairJob.findAll({ where, order: [["updatedAt", "DESC"]] });
    return res.status(200).json({ success: true, jobs: jobs.map(serialize) });
  } catch (error) {
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

    // Some MySQL/MariaDB drivers return JSON columns as a string. Parse it
    // before appending so editing a repair never hides or overwrites saved parts.
    const parts = [...readParts(job.parts)];
    for (const requestedPart of requestedParts) { const quantity = Number(requestedPart.quantity); const stock = await Stock.findOne({ where: { id: requestedPart.stockId, branchId: req.branchId } }); if (!stock || !Number.isInteger(quantity) || quantity < 1 || stock.quantity < quantity) return res.status(400).json({ success: false, message: "A selected part is unavailable or has insufficient stock." }); await stock.update({ quantity: stock.quantity - quantity }); parts.push({ stockId: stock.id, name: stock.name, sku: stock.sku, quantity, unitPrice: Number(stock.sellingPrice), unitCostCents: stock.costCurrency === 'LKR' ? Math.round(Number(stock.costPrice) * 100) : null, total: Number(stock.sellingPrice) * quantity }); }
    await job.update({ customerName, assetName, issue, assetType, priority, status, promisedDate, parts, customerPhone: typeof req.body.customerPhone === "string" ? req.body.customerPhone.trim() || null : job.customerPhone, assetIdentifier: typeof req.body.assetIdentifier === "string" ? req.body.assetIdentifier.trim() || null : job.assetIdentifier, technician: typeof req.body.technician === "string" ? req.body.technician.trim() || null : job.technician });
    return res.status(200).json({ success: true, message: "Repair job updated.", job: serialize(job) });
  } catch (error) { return next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const job = await RepairJob.findOne({ where: { id: req.params.id, branchId: req.branchId } });
    if (!job) return res.status(404).json({ success: false, message: "Repair job not found." });
    await job.destroy();
    return res.status(204).end();
  } catch (error) { return next(error); }
});

module.exports = router;
