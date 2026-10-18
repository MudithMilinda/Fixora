const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const Technician = require('../models/Technician');
const { Op } = require('sequelize');
const { pagination } = require('../services/pagination');

const router = express.Router();
router.use(requireAuth);

const clean = (value) => typeof value === 'string' ? value.trim() || null : null;
const serialize = (technician) => ({ id: technician.id, name: technician.name, phone: technician.phone, specialization: technician.specialization, address: technician.address, isActive: technician.isActive, createdAt: technician.createdAt });

router.get('/', async (req, res, next) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'Your user is not assigned to a company.' });
    const paging = pagination(req.query);
    const search = typeof req.query?.search === 'string' ? req.query.search.trim().slice(0, 160) : '';
    const where = { companyId: req.user.companyId, ...(search ? { [Op.or]: ['name', 'phone', 'specialization', 'address'].map(field => ({ [field]: { [Op.like]: `%${search}%` } })) } : {}) };
    const order = [['name', 'ASC'], ['id', 'ASC']];
    if (paging) { const result = await Technician.findAndCountAll({ where, order, limit: paging.limit, offset: paging.offset }); return res.json({ success: true, technicians: result.rows.map(serialize), total: result.count, page: paging.page, pageSize: paging.pageSize }); }
    const technicians = await Technician.findAll({ where, order });
    return res.json({ success: true, technicians: technicians.map(serialize) });
  } catch (error) { if (error.status === 400) return res.status(400).json({ message: error.message }); return next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    if (!req.user.companyId || !name) return res.status(400).json({ success: false, message: 'Technician name is required.' });
    const technician = await Technician.create({ companyId: req.user.companyId, name, phone: clean(req.body.phone), specialization: clean(req.body.specialization), address: clean(req.body.address), isActive: req.body.isActive !== false });
    return res.status(201).json({ success: true, technician: serialize(technician) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A technician with this name already exists.' });
    return next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const technician = await Technician.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found.' });
    const name = typeof req.body.name === 'undefined' ? technician.name : clean(req.body.name);
    if (!name) return res.status(400).json({ success: false, message: 'Technician name is required.' });
    await technician.update({ name, phone: typeof req.body.phone === 'undefined' ? technician.phone : clean(req.body.phone), specialization: typeof req.body.specialization === 'undefined' ? technician.specialization : clean(req.body.specialization), address: typeof req.body.address === 'undefined' ? technician.address : clean(req.body.address), isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : technician.isActive });
    return res.json({ success: true, technician: serialize(technician) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A technician with this name already exists.' });
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const technician = await Technician.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found.' });
    await technician.destroy();
    return res.status(204).end();
  } catch (error) { return next(error); }
});

module.exports = router;
