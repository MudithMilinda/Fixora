const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const Stock = require('../models/Stock');
const { recordMovement } = require('../services/stockMovement');
const { lockStockBranch, receiveStock } = require('../services/receiveStock');
const { pagination } = require('../services/pagination');
const { Op, literal, where: sqlWhere } = require('sequelize');
const router = express.Router();
router.use(requireAuth, async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
const serialize = stock => ({ id: stock.id, itemId: stock.itemId, name: stock.name, sku: stock.sku, quantity: stock.quantity, costPrice: Number(stock.costPrice), sellingPrice: Number(stock.sellingPrice) });
router.get('/', async (req,res,next) => { try {
  const paging = pagination(req.query), base = { branchId: req.branchId, isArchived: false };
  if (!paging) { const stocks = await Stock.findAll({ where: base, order: [['name','ASC']] }); return res.json({success:true,items:stocks.map(serialize)}); }
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0,160) : '';
  const status = req.query.status || 'all';
  if (!['all','in-stock','low-stock','out-of-stock'].includes(status)) return res.status(400).json({message:'Invalid stock status.'});
  const statusSql = "CASE WHEN `Stock`.`quantity` = 0 THEN 'out-of-stock' WHEN (CASE WHEN `Stock`.`item_id` IS NULL THEN `Stock`.`quantity` ELSE (SELECT COALESCE(SUM(s.quantity),0) FROM stocks s WHERE s.branch_id = `Stock`.`branch_id` AND s.item_id = `Stock`.`item_id` AND s.is_archived = 0) END) <= COALESCE((SELECT i.minimum_stock FROM items i WHERE i.id = `Stock`.`item_id`),4) THEN 'low-stock' ELSE 'in-stock' END";
  const where = { ...base, ...(search ? { [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }] } : {}), ...(status !== 'all' ? { [Op.and]: [sqlWhere(literal(statusSql), status)] } : {}) };
  const result = await Stock.findAndCountAll({ where, attributes: { include: [[literal(statusSql), 'stockStatus']] }, order: [['name','ASC'], ['id','ASC']], limit:paging.limit, offset:paging.offset });
  res.json({success:true,items:result.rows.map(stock => ({...serialize(stock), stockStatus:stock.get('stockStatus')})),total:result.count,page:paging.page,pageSize:paging.pageSize});
} catch(error) { if(error.status===400)return res.status(400).json({message:error.message}); next(error); } });
router.post('/', async (req,res,next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const quantity = Number(req.body.quantity), costPrice = Number(req.body.costPrice), sellingPrice = Number(req.body.sellingPrice);
    if (!name || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647 || !Number.isFinite(costPrice) || !Number.isFinite(sellingPrice) || costPrice < 0 || sellingPrice < 0) return res.status(400).json({success:false,message:'Enter valid stock details.'});
    const stock = await Stock.sequelize.transaction(async transaction => {
      await lockStockBranch(req, transaction);
      const created = await receiveStock({ itemId:req.body.itemId||null,branchId:req.branchId,name,sku:typeof req.body.sku==='string'?req.body.sku.trim()||null:null,quantity,costPrice,costCurrency:'LKR',sellingPrice }, transaction);
      await recordMovement({ stock: created, req, kind: 'manual_add', change: quantity, balanceAfter: Number(created.quantity), transaction });
      return created;
    });
    res.status(201).json({success:true,item:serialize(stock)});
  } catch(error) { if (error.status === 400) return res.status(400).json({success:false,message:error.message}); next(error); }
});
router.patch('/:id',async(req,res,next)=>{try{const stock=await Stock.findOne({where:{id:req.params.id,branchId:req.branchId,isArchived:false}});if(!stock)return res.status(404).json({success:false,message:'Stock item not found.'});await stock.update({name:typeof req.body.name==='string'?req.body.name.trim()||stock.name:stock.name,sku:typeof req.body.sku==='string'?req.body.sku.trim()||null:stock.sku});res.json({success:true,item:serialize(stock)});}catch(error){next(error)}});
router.post('/:id/adjustments', async (req, res, next) => {
  const { change, reason, note } = req.body || {};
  if (!Number.isSafeInteger(change) || change === 0 || Math.abs(change) > 2147483647 || !['damaged', 'lost', 'count_correction', 'other'].includes(reason) || (note != null && (typeof note !== 'string' || note.trim().length > 500)) || (reason === 'other' && !note?.trim())) return res.status(400).json({ message: 'Enter a valid quantity and reason. Add a note for Other.' });
  try {
    const result = await Stock.sequelize.transaction(async transaction => {
      const stock = await Stock.findOne({ where: { id: req.params.id, branchId: req.branchId, isArchived: false }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) return { status: 404, message: 'Stock item not found.' };
      const balanceAfter = Number(stock.quantity) + change;
      if (balanceAfter < 0 || balanceAfter > 4294967295) return { status: 400, message: 'Adjustment would result in an invalid stock balance.' };
      await stock.update({ quantity: balanceAfter }, { transaction });
      await recordMovement({ stock, req, kind: 'adjustment', change, balanceAfter, adjustmentReason: reason, adjustmentNote: note?.trim() || null, transaction });
      return { stock };
    });
    if (result.status) return res.status(result.status).json({ message: result.message });
    res.json({ success: true, item: serialize(result.stock) });
  } catch (error) { next(error); }
});
router.delete('/:id', async (req,res,next) => {
  try {
    const found = await Stock.sequelize.transaction(async transaction => {
      const stock = await Stock.findOne({ where: { id:req.params.id,branchId:req.branchId,isArchived:false }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) return false;
      await recordMovement({ stock, req, kind: 'delete', change: -Number(stock.quantity), balanceAfter: 0, transaction });
      await stock.destroy({ transaction });
      return true;
    });
    if (!found) return res.status(404).json({success:false,message:'Stock item not found.'});
    res.status(204).end();
  } catch(error) { next(error); }
});
module.exports=router;
