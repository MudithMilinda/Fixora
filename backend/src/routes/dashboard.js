const express = require('express');
const { Op } = require('sequelize');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const { RepairJob } = require('../models/RepairJob');
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Item = require('../models/Item');
const PurchaseOrder = require('../models/PurchaseOrder');
const router = express.Router();

function startOfDay() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
router.use(async (req, res, next) => { try {
  if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
  next();
} catch (error) { next(error); } });
router.get('/', async (req, res, next) => { try {
  const branchId = req.branchId, today = startOfDay();
  const activeStatuses = ['Received', 'Diagnosis', 'Awaiting approval', 'In progress', 'Waiting for parts', 'Quality check', 'Ready for collection'];
  const [openRepairs, readyToCollect, overdueRepairs, todaySales, salesToday, stockRows, recentRepairs, pendingOrders] = await Promise.all([
    RepairJob.count({ where: { branchId, status: { [Op.in]: activeStatuses } } }),
    RepairJob.count({ where: { branchId, status: 'Ready for collection' } }),
    RepairJob.count({ where: { branchId, status: { [Op.in]: activeStatuses }, promisedDate: { [Op.lt]: today } } }),
    Sale.count({ where: { companyId: req.user.companyId, branchId, createdAt: { [Op.gte]: today } } }),
    Sale.sum('totalCents', { where: { companyId: req.user.companyId, branchId, createdAt: { [Op.gte]: today } } }),
    Stock.findAll({ where: { branchId, isArchived: false }, order: [['name', 'ASC']] }),
    RepairJob.findAll({ where: { branchId, status: { [Op.in]: activeStatuses } }, order: [['createdAt', 'DESC']], limit: 6, attributes: ['id','jobNumber','customerName','assetName','status','priority','promisedDate'] }),
    PurchaseOrder.count({ where: { companyId: req.user.companyId, branchId, status: 'Ordered' } }),
  ]);
  const itemIds = [...new Set(stockRows.map(stock => stock.itemId).filter(Boolean))];
  const items = itemIds.length ? await Item.findAll({ where: { id: itemIds }, attributes: ['id', 'minimumStock'] }) : [];
  const minimumByItem = new Map(items.map(item => [item.id, Number(item.minimumStock)]));
  const grouped = new Map();
  for (const stock of stockRows) { const key = stock.itemId || stock.id; const row = grouped.get(key) || { name: stock.name, sku: stock.sku, quantity: 0, minimum: minimumByItem.get(stock.itemId) ?? 4 }; row.quantity += Number(stock.quantity); grouped.set(key, row); }
  const lowStock = [...grouped.values()].filter(item => item.quantity <= item.minimum).sort((a,b) => a.quantity - b.quantity || a.name.localeCompare(b.name)).slice(0, 6);
  res.json({ openRepairs, readyToCollect, overdueRepairs, todaySales, salesToday: Number(salesToday || 0) / 100, lowStock, recentRepairs, pendingOrders });
} catch (error) { next(error); } });
module.exports = router;
