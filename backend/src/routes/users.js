const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/requireAuth');
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const UserBranch = require('../models/UserBranch');
const { effective, superAdmin, parse, subset } = require('../services/permissions');
const router = express.Router();
router.use(requireAuth, (req, res, next) => {
  if (!req.user.companyId || req.user.customRoleId || !['admin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Administrator access required.' });
  next();
});
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const [users, roles, branches] = await Promise.all([
      User.findAll({ where: { companyId }, attributes: ['id', 'fullName', 'email', 'role', 'customRoleId', 'isActive'], order: [['fullName', 'ASC']] }),
      Role.findAll({ where: { companyId }, order: [['name', 'ASC']] }),
      Branch.findAll({ where: { companyId, isActive: true }, attributes: ['id', 'name', 'code'], order: [['name', 'ASC']] }),
    ]);
    const visibleUsers = req.user.role === 'super_admin' && !req.user.customRoleId ? users : users.filter(u => u.role !== 'super_admin' || u.customRoleId);
    const assignments = await UserBranch.findAll({ where: { userId: visibleUsers.map(u => u.id) } });
    res.json({ success: true, users: visibleUsers.map(u => ({ ...u.toJSON(), branchIds: assignments.filter(a => a.userId === u.id).map(a => a.branchId) })), roles, branches });
  } catch (error) { next(error); }
});
router.post('/roles', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 120) return res.status(400).json({ success: false, message: 'Enter a role name between 2 and 120 characters.' });
    const role = await Role.create({ companyId: req.user.companyId, name, permissions: [], ownerAdminId: superAdmin(req.user) ? null : req.user.id });
    res.status(201).json({ success: true, role });
  } catch (error) { if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'This role already exists.' }); next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim().replace(/\s+/g, ' ') : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const roleId = typeof req.body.roleId === 'string' ? req.body.roleId : '';
    const branchIds = Array.isArray(req.body.branchIds) ? [...new Set(req.body.branchIds)] : [];
    if (fullName.length < 2 || fullName.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 1024 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !branchIds.length || branchIds.some(id => typeof id !== 'string')) return res.status(400).json({ success: false, message: 'Enter valid user details, a strong password and at least one branch.' });
    const [role, branches] = await Promise.all([Role.findOne({ where: { id: roleId, companyId: req.user.companyId } }), Branch.findAll({ where: { id: branchIds, companyId: req.user.companyId, isActive: true } })]);
    if (!role || branches.length !== branchIds.length) return res.status(400).json({ success: false, message: 'Select a valid role and active branches in your company.' });
    const allowed = await effective(req.user);
    if (!superAdmin(req.user) && (!subset(role.permissions == null ? [] : parse(role.permissions), allowed) || role.ownerAdminId !== req.user.id)) return res.status(403).json({ message: 'You cannot assign a role with permissions outside your access.' });
    if (!superAdmin(req.user)) { const assigned = await UserBranch.findAll({ where: { userId: req.user.id, branchId: branchIds } }); if (assigned.length !== branchIds.length) return res.status(403).json({ message: 'Select only branches you can access.' }); }
    const passwordHash = await bcrypt.hash(password, 12);
    await User.sequelize.transaction(async transaction => {
      const user = await User.create({ fullName, email, passwordHash, role: 'admin', customRoleId: role.id, companyId: req.user.companyId, activeBranchId: branchIds[0] }, { transaction });
      await UserBranch.bulkCreate(branchIds.map(branchId => ({ userId: user.id, branchId })), { transaction });
    });
    res.status(201).json({ success: true });
  } catch (error) { if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A user with this email already exists.' }); next(error); }
});
module.exports = router;
