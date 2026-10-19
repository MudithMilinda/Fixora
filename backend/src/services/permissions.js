const User = require('../models/User');
const Role = require('../models/Role');
const sections = {
  dashboard: ['view'], repairs: ['view','create','edit','delete'], repairHistory: ['view'], warrantyClaims: ['view','create','edit'], items: ['view','create','edit','delete'], stocks: ['view','create','edit','delete'], stockMovements: ['view'], purchaseRequests: ['view','create','edit','delete'], purchaseOrders: ['view','create','edit'], quotations: ['view','create','edit','delete'], sales: ['view','create'], salesReturns: ['view','create'], supplierReturns: ['view','create','edit'], profitReport: ['view','edit'], stockValuation: ['view'], supplierPurchases: ['view'], stockAdjustmentsReport: ['view'], suppliers: ['view','create','edit','delete'], technicians: ['view','create','edit','delete'], branches: ['view','create'], users: ['view','create','edit'], companySettings: ['view','edit']
};
const allPermissions = Object.entries(sections).flatMap(([section, actions]) => actions.map(action => `${section}.${action}`));
const valid = value => Array.isArray(value) && value.every(p => typeof p === 'string' && allPermissions.includes(p)) && new Set(value).size === value.length;
function parse(value) { if (value == null) return [...allPermissions]; if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return []; } } return valid(value) ? value : []; }
function superAdmin(user) { return user.role === 'super_admin' && !user.customRoleId; }
async function effective(user) {
  if (superAdmin(user)) return [...allPermissions];
  if (!user.companyId) return [];
  if (!user.customRoleId) return parse(user.permissions);
  const role = await Role.findOne({ where: { id: user.customRoleId, companyId: user.companyId } });
  if (!role) return [];
  const permissions = role.permissions == null ? [] : parse(role.permissions);
  if (!role.ownerAdminId) return permissions;
  const owner = await User.findOne({ where: { id: role.ownerAdminId, companyId: user.companyId, isActive: true, customRoleId: null } });
  if (!owner) return [];
  const allowed = new Set(superAdmin(owner) ? allPermissions : parse(owner.permissions));
  return permissions.filter(p => allowed.has(p));
}
const subset = (requested, allowed) => valid(requested) && requested.every(permission => allowed.includes(permission));
module.exports = { sections, allPermissions, valid, parse, superAdmin, effective, subset };
