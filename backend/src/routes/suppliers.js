const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Supplier = require('../models/Supplier');
const { Op, where: sqlWhere, cast, col } = require('sequelize');
const { pagination } = require('../services/pagination');

const router = express.Router();
router.use(requireAuth);

const clean = (value) => typeof value === 'string' ? value.trim() || null : null;
const cleanPhones = (value) => Array.isArray(value) ? [...new Set(value.map(clean).filter(Boolean))].slice(0, 10) : [];
const serialize = (supplier) => ({ id: supplier.id, name: supplier.name, phones: Array.isArray(supplier.phones) ? supplier.phones : supplier.phone ? [supplier.phone] : [], email: supplier.email, address: supplier.address, isActive: supplier.isActive, createdAt: supplier.createdAt });

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'Your user is not assigned to a company.' });
    const paging = pagination(req.query);
    const search = typeof req.query?.search === 'string' ? req.query.search.trim().slice(0, 160) : '';
    const where = { companyId: req.user.companyId, ...(search ? { [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }, sqlWhere(cast(col('phones'), 'CHAR'), { [Op.like]: `%${search}%` })] } : {}) };
    const order = [['name', 'ASC'], ['id', 'ASC']];
    if (paging) { const result = await Supplier.findAndCountAll({ where, order, limit: paging.limit, offset: paging.offset }); return res.json({ success: true, suppliers: result.rows.map(serialize), total: result.count, page: paging.page, pageSize: paging.pageSize }); }
    const suppliers = await Supplier.findAll({ where, order });
    res.json({ success: true, suppliers: suppliers.map(serialize) });
  } catch (error) { if (error.status === 400) return res.status(400).json({ message: error.message }); next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    if (!req.user.companyId || !name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    const supplier = await Supplier.create({ companyId: req.user.companyId, name, phones: cleanPhones(req.body.phones), email: clean(req.body.email), address: clean(req.body.address) });
    res.status(201).json({ success: true, supplier: serialize(supplier) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A supplier with this name already exists.' });
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    const name = typeof req.body.name === 'undefined' ? supplier.name : clean(req.body.name);
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    await supplier.update({ name, phones: typeof req.body.phones === 'undefined' ? supplier.phones : cleanPhones(req.body.phones), email: typeof req.body.email === 'undefined' ? supplier.email : clean(req.body.email), address: typeof req.body.address === 'undefined' ? supplier.address : clean(req.body.address) });
    res.json({ success: true, supplier: serialize(supplier) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A supplier with this name already exists.' });
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    await supplier.destroy();
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
