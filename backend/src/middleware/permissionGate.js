const { effective, superAdmin } = require('../services/permissions');
// Each route family is mapped to an explicit section and action. Specific
// workflow routes override the HTTP method where an action is not CRUD.
function permissionFor(resource, method, path) {
  let section = ({ dashboard:'dashboard', repairs:'repairs', 'warranty-claims':'warrantyClaims', items:'items', stocks:'stocks', 'stock-movements':'stockMovements', 'stock-requests':'purchaseRequests', 'purchase-orders':'purchaseOrders', quotations:'quotations', sales:'sales', 'supplier-returns':'supplierReturns', reports:'reports', suppliers:'suppliers', technicians:'technicians', branches:'branches', users:'users', 'company-settings':'companySettings' })[resource];
  if (!section) return null;
  let action = method === 'GET' || method === 'HEAD' ? 'view' : method === 'POST' ? 'create' : method === 'PUT' || method === 'PATCH' ? 'edit' : method === 'DELETE' ? 'delete' : null;
  if (resource === 'repairs' && /^\/history\/?$/.test(path) && (method === 'GET' || method === 'HEAD')) section = 'repairHistory';
  if (resource === 'reports') {
    if (/^\/stock-adjustment/.test(path)) section = 'stockAdjustmentsReport';
    else if (/^\/supplier-purchase/.test(path)) section = 'supplierPurchases';
    else if (/^\/stock-valuation/.test(path)) section = 'stockValuation';
    else section = 'profitReport';
  }
  if (resource === 'sales' && (/^\/return-items\/?$/.test(path) || /^\/returns\/?$/.test(path) || /^\/[^/]+\/returns\/?$/.test(path))) section = 'salesReturns';
  if (resource === 'stocks' && /\/adjustments\/?$/.test(path) && method === 'POST') action = 'edit';
  if (resource === 'quotations' && /\/approve\/?$/.test(path) && method === 'POST') return ['quotations.edit','purchaseOrders.create'];
  if (resource === 'supplier-returns' && /^\/order\//.test(path)) action = 'create';
  if (resource === 'warranty-claims' && /\/repair\/?$/.test(path) && method === 'POST') return ['warrantyClaims.edit','repairs.create'];
  if (resource === 'stock-requests' && path === '/purchase-list' && method === 'POST') action = 'create';
  if (!action) return ['__deny__'];
  return [`${section}.${action}`];
}
function gate(resource) { return async (req, res, next) => { try {
  if (superAdmin(req.user)) { req.permissionsChecked = true; return next(); }
  const required = permissionFor(resource, req.method, req.path), permissions = await effective(req.user);
  req.effectivePermissions = permissions;
  if (!required || required.every(p => permissions.includes(p))) { req.permissionsChecked = true; return next(); }
  return res.status(403).json({ success: false, message: 'You do not have permission for this action.' });
} catch (error) { next(error); } }; }
module.exports = { gate, permissionFor };
