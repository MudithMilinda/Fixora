const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Role = require('../models/Role');
const { effective, subset, allPermissions } = require('./permissions');
const { permissionFor, gate } = require('../middleware/permissionGate');
const reply = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } });
test('super admin is unrestricted and legacy admins retain existing access', async () => {
  assert.deepEqual(await effective({ role: 'super_admin' }), allPermissions);
  assert.deepEqual(await effective({ role: 'admin', companyId: 'company', permissions: null }), allPermissions);
  assert.deepEqual(await effective({ role: 'admin', companyId: 'company', permissions: [] }), []);
});
test('a role is capped by the current permissions of its owning administrator', async t => {
  t.mock.method(Role, 'findOne', async ({ where }) => { assert.equal(where.companyId, 'company'); return { ownerAdminId: 'admin', permissions: ['stocks.view','stocks.delete'] } });
  t.mock.method(User, 'findOne', async ({ where }) => { assert.equal(where.companyId, 'company'); return { role:'admin', permissions:['stocks.view'], companyId:'company' } });
  assert.deepEqual(await effective({ role:'admin', customRoleId:'role', companyId:'company' }), ['stocks.view']);
});
test('unknown and extra permissions cannot be delegated', () => {
  assert.equal(subset(['stocks.view'], ['stocks.view','stocks.edit']), true);
  assert.equal(subset(['stocks.delete'], ['stocks.view']), false);
  assert.equal(subset(['unknown.view'], allPermissions), false);
  assert.equal(subset(['stocks.view','stocks.view'], allPermissions), false);
});
test('workflow routes require the correct action', () => {
  assert.deepEqual(permissionFor('sales', 'POST', '/sale/returns'), ['salesReturns.create']);
  assert.deepEqual(permissionFor('stocks', 'POST', '/stock/adjustments'), ['stocks.edit']);
  assert.deepEqual(permissionFor('quotations', 'POST', '/id/approve'), ['quotations.edit','purchaseOrders.create']);
  assert.deepEqual(permissionFor('warranty-claims', 'POST', '/id/repair'), ['warrantyClaims.edit','repairs.create']);
});
test('gate rejects API actions not explicitly granted', async () => {
  let passed = false; const res = reply();
  await gate('stocks')({ user: { role:'admin', companyId:'company', permissions:['stocks.view'] }, method:'DELETE', path:'/stock' }, res, () => { passed = true });
  assert.equal(passed, false); assert.equal(res.statusCode, 403);
});
const permissionsRouter = require('../routes/permissions');
const handler = (path, method) => permissionsRouter.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
const request = { user: { id:'admin', role:'admin', companyId:'company' }, allowedPermissions: ['users.view','users.edit','stocks.view'], params: { id:'role' }, body: { permissions:['stocks.view'] } };
test('admin cannot grant a permission they do not have', async () => {
  const res = reply(); await handler('/roles/:id', 'put')({ ...request, body: { permissions:['stocks.delete'] } }, res, error => { throw error }); assert.equal(res.statusCode,403);
});
test('admin cannot modify another administrator or super admin role', async t => {
  t.mock.method(Role, 'findOne', async () => ({ ownerAdminId: 'other', update: async () => assert.fail('must not update') }));
  let res = reply(); await handler('/roles/:id', 'put')(request, res, error => { throw error }); assert.equal(res.statusCode,404);
  res = reply(); await handler('/admins/:id', 'put')(request, res, error => { throw error }); assert.equal(res.statusCode,403);
});
test('owned role permission changes are limited to admin grants', async t => {
  let saved; t.mock.method(Role, 'findOne', async ({where}) => { assert.equal(where.companyId,'company'); return { ownerAdminId:'admin', update: async values => { saved=values.permissions } } });
  const res = reply(); await handler('/roles/:id', 'put')(request, res, error => { throw error }); assert.equal(res.statusCode,200); assert.deepEqual(saved,['stocks.view']);
});
test('existing roles without configured permissions fail closed', async t => {
  t.mock.method(Role, 'findOne', async () => ({ permissions:null, ownerAdminId:null }));
  assert.deepEqual(await effective({ role:'admin', customRoleId:'role', companyId:'company' }), []);
});

test('dashboard and repair history are independently available permissions', () => {
  const { allPermissions } = require('./permissions');
  const { permissionFor } = require('../middleware/permissionGate');
  assert.ok(allPermissions.includes('dashboard.view'));
  assert.ok(allPermissions.includes('repairHistory.view'));
  assert.deepEqual(permissionFor('repairs', 'GET', '/history'), ['repairHistory.view']);
  assert.deepEqual(permissionFor('repairs', 'GET', '/'), ['repairs.view']);
});
