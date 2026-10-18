const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const Stock = require('../models/Stock');
const { recordMovement } = require('../services/stockMovement');
const router = express.Router();
router.use(requireAuth, async (req, res, next) => {
  try {
    if (!req.user.companyId || !req.branchId || !await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId, isActive: true } }) || !await UserBranch.findOne({ where: { userId: req.user.id, branchId: req.branchId } })) return res.status(403).json({ message: 'Select an accessible branch.' });
    next();
  } catch (error) { next(error); }
});
const serialize = stock => ({ id: stock.id, itemId: stock.itemId, name: stock.name, sku: stock.sku, quantity: stock.quantity, costPrice: Number(stock.costPrice), sellingPrice: Number(stock.sellingPrice) });
router.get('/', async (req,res,next) => { try { const stocks = await Stock.findAll({ where: { branchId: req.branchId }, order: [['name','ASC']] }); res.json({success:true,items:stocks.map(serialize)}); } catch(error) { next(error); } });
router.post('/', async (req,res,next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const quantity = Number(req.body.quantity), costPrice = Number(req.body.costPrice), sellingPrice = Number(req.body.sellingPrice);
    if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(costPrice) || !Number.isFinite(sellingPrice) || costPrice < 0 || sellingPrice < 0) return res.status(400).json({success:false,message:'Enter valid stock details.'});
    const stock = await Stock.sequelize.transaction(async transaction => {
      const created = await Stock.create({ itemId:req.body.itemId||null,branchId:req.branchId,name,sku:typeof req.body.sku==='string'?req.body.sku.trim()||null:null,quantity,costPrice,costCurrency:'LKR',sellingPrice }, {transaction});
      await recordMovement({ stock: created, req, kind: 'manual_add', change: quantity, balanceAfter: quantity, transaction });
      return created;
    });
    res.status(201).json({success:true,item:serialize(stock)});
  } catch(error) { next(error); }
});
router.patch('/:id',async(req,res,next)=>{try{const stock=await Stock.findOne({where:{id:req.params.id,branchId:req.branchId}});if(!stock)return res.status(404).json({success:false,message:'Stock item not found.'});await stock.update({name:typeof req.body.name==='string'?req.body.name.trim()||stock.name:stock.name,sku:typeof req.body.sku==='string'?req.body.sku.trim()||null:stock.sku});res.json({success:true,item:serialize(stock)});}catch(error){next(error)}});
router.delete('/:id', async (req,res,next) => {
  try {
    const found = await Stock.sequelize.transaction(async transaction => {
      const stock = await Stock.findOne({ where: { id:req.params.id,branchId:req.branchId }, transaction, lock: transaction.LOCK.UPDATE });
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
