const express = require("express");
const { Op } = require("sequelize");
const { RepairJob, REPAIR_STATUSES, ASSET_TYPES } = require("../models/RepairJob");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

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
    createdAt: job.createdAt,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const activeStatuses = REPAIR_STATUSES.filter((item) => !["Delivered", "Closed", "Cancelled"].includes(item));
    const where = { status: status && activeStatuses.includes(status) ? status : { [Op.in]: activeStatuses } };
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

    if (!customerName || !assetName || !issue || customerName.length > 120 || assetName.length > 160 || issue.length > 5000) {
      return res.status(400).json({ success: false, message: "Customer, asset, and repair issue are required." });
    }
    if (promisedDate && Number.isNaN(promisedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Enter a valid promised date." });
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
    const where = { status: status && historyStatuses.includes(status) ? status : { [Op.in]: historyStatuses } };
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

router.patch("/:id", async (req, res, next) => {
  try {
    const job = await RepairJob.findByPk(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Repair job not found." });

    const customerName = typeof req.body.customerName === "string" ? req.body.customerName.trim() : job.customerName;
    const assetName = typeof req.body.assetName === "string" ? req.body.assetName.trim() : job.assetName;
    const issue = typeof req.body.issue === "string" ? req.body.issue.trim() : job.issue;
    const assetType = ASSET_TYPES.includes(req.body.assetType) ? req.body.assetType : job.assetType;
    const priority = ["Normal", "High", "Urgent"].includes(req.body.priority) ? req.body.priority : job.priority;
    const status = REPAIR_STATUSES.includes(req.body.status) ? req.body.status : job.status;
    const promisedDate = req.body.promisedDate ? new Date(req.body.promisedDate) : null;
    if (!customerName || !assetName || !issue || customerName.length > 120 || assetName.length > 160 || issue.length > 5000) {
      return res.status(400).json({ success: false, message: "Customer, asset, and repair issue are required." });
    }
    if (promisedDate && Number.isNaN(promisedDate.getTime())) return res.status(400).json({ success: false, message: "Enter a valid promised date." });

    await job.update({ customerName, assetName, issue, assetType, priority, status, promisedDate, customerPhone: typeof req.body.customerPhone === "string" ? req.body.customerPhone.trim() || null : job.customerPhone, assetIdentifier: typeof req.body.assetIdentifier === "string" ? req.body.assetIdentifier.trim() || null : job.assetIdentifier, technician: typeof req.body.technician === "string" ? req.body.technician.trim() || null : job.technician });
    return res.status(200).json({ success: true, message: "Repair job updated.", job: serialize(job) });
  } catch (error) { return next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const job = await RepairJob.findByPk(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Repair job not found." });
    await job.destroy();
    return res.status(204).end();
  } catch (error) { return next(error); }
});

module.exports = router;
