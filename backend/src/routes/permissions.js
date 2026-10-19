const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const User = require('../models/User');
const Role = require('../models/Role');
const { sections, effective, parse, subset, superAdmin } = require('../services/permissions');
const router = express.Router();
router.use(requireAuth, async (req, res, next) => { try {
  if (!req.user.companyId || req.user.customRoleId || !['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ message: 'Administrator access required.' });
  req.allowedPermissions = await effective(req.user); if (!superAdmin(req.user) && !req.allowedPermissions.includes('users.view')) return res.status(403).json({ message: 'You do not have permission to manage users.' }); next();
} catch (e) { next(e); } });
router.get('/', async (req, res, next) => { try {
  const isSuper = superAdmin(req.user);
  const roles = await Role.findAll({ where: { companyId: req.user.companyId }, order: [['name','ASC']] });
  const admins = isSuper ? await User.findAll({ where: { companyId: req.user.companyId, role: 'admin', customRoleId: null }, attributes: ['id','fullName','email','permissions'], order: [['fullName','ASC']] }) : [];
  res.json({ sections, allowedPermissions: req.allowedPermissions, admins: admins.map(user => ({ id:user.id, name:user.fullName, email:user.email, permissions:parse(user.permissions) })), roles: roles.filter(role => isSuper || role.ownerAdminId === req.user.id).map(role => ({ id:role.id, name:role.name, permissions:(role.permissions == null ? [] : parse(role.permissions)).filter(p => req.allowedPermissions.includes(p)), editable: isSuper || role.ownerAdminId === req.user.id })) });
} catch (e) { next(e); } });
router.put('/admins/:id', async (req, res, next) => { try {
  if (!superAdmin(req.user)) return res.status(403).json({ message:'Only a super admin can change administrator permissions.' });
  if (!subset(req.body.permissions, req.allowedPermissions)) return res.status(400).json({ message:'Select valid permissions.' });
  const user = await User.findOne({ where: { id:req.params.id, companyId:req.user.companyId, role:'admin', customRoleId:null } });
  if (!user) return res.status(404).json({ message:'Administrator not found.' });
  await user.update({ permissions:req.body.permissions }); res.json({ success:true });
} catch (e) { next(e); } });
router.put('/roles/:id', async (req, res, next) => { try {
  if (!superAdmin(req.user) && !req.allowedPermissions.includes('users.edit')) return res.status(403).json({ message:'You cannot edit role permissions.' });
  if (!subset(req.body.permissions, req.allowedPermissions)) return res.status(403).json({ message:'You cannot assign permissions you do not have.' });
  const role = await Role.findOne({ where: { id:req.params.id, companyId:req.user.companyId } });
  if (!role || (!superAdmin(req.user) && role.ownerAdminId !== req.user.id)) return res.status(404).json({ message:'Role not found.' });
  await role.update({ permissions:req.body.permissions }); res.json({ success:true });
} catch (e) { next(e); } });
module.exports = router;
