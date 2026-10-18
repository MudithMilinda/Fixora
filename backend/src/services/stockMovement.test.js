const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const StockMovement = require('../models/StockMovement');
const Stock = require('../models/Stock');
const { RepairJob } = require('../models/RepairJob');
const router = require('../routes/repairs');
const postRepair = router.stack.find(l => l.route?.path === '/' && l.route.methods.post).route.stack[0].handle;
const reply = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } });
test('repair part deduction and movement capture the same locked batch and transaction', async t => {
  const tx = { LOCK: { UPDATE: 'UPDATE' } }; const req = { user: { id: 'user', companyId: 'company' }, branchId: 'branch', body: { customerName: 'Customer', assetName: 'Phone', issue: 'Repair', parts: [{ stockId: 'stock', quantity: 2 }] } };
  t.mock.method(RepairJob.sequelize, 'transaction', async fn => fn(tx));
  const job = { id: 'job', jobNumber: 'REP-1', update: async (values, options) => { assert.equal(options.transaction, tx); job.parts = values.parts; } };
  t.mock.method(RepairJob, 'create', async (values, options) => { assert.equal(options.transaction, tx); assert.equal(values.branchId, 'branch'); return job; });
  const stock = { id:'stock',name:'Part',sku:'P',quantity:5,costPrice:'100.00',costCurrency:'LKR',sellingPrice:'150.00', update: async (values, options) => { assert.equal(options.transaction, tx); stock.quantity = values.quantity; } };
  t.mock.method(Stock, 'findAll', async ({ where, lock, transaction }) => { assert.equal(where.branchId, 'branch'); assert.equal(lock, 'UPDATE'); assert.equal(transaction, tx); return [stock]; });
  t.mock.method(StockMovement, 'create', async (values, options) => { assert.equal(options.transaction, tx); assert.equal(values.kind, 'repair'); assert.equal(values.quantityChange, -2); assert.equal(values.balanceAfter, 3); assert.equal(values.unitCost, '100.00'); assert.equal(values.unitSellingPrice, '150.00'); assert.equal(values.referenceId, 'job'); });
  const res = reply(); await postRepair(req, res, error => { throw error; }); assert.equal(res.statusCode, 201); assert.equal(job.parts[0].unitCostCents, 10000);
});
test('movement history query is restricted to active company and branch', async t => {
  const router = require('../routes/stockMovements'); const handler = router.stack.find(l => l.route?.path === '/').route.stack[0].handle;
  t.mock.method(require('../models/Branch'), 'findOne', async () => ({}));
  t.mock.method(require('../models/UserBranch'), 'findOne', async () => ({}));
  t.mock.method(StockMovement, 'findAll', async ({ where }) => { assert.deepEqual(where, { companyId: 'company', branchId: 'branch' }); return []; });
  const res = reply(); await handler({ user: { id: 'user', companyId: 'company' }, branchId: 'branch' }, res, e => { throw e }); assert.deepEqual(res.body.movements, []);
});
test('price history scopes same-SKU movements to company and branch', async t => {
  const router = require('../routes/stockMovements'); const handler = router.stack.find(l => l.route?.path === '/:id/history').route.stack[0].handle;
  t.mock.method(StockMovement, 'findOne', async ({ where }) => { assert.deepEqual(where, { companyId: 'company', branchId: 'branch', id: 'movement' }); return { sku: 'SKU-1', stockId: 'batch' }; });
  t.mock.method(StockMovement, 'findAll', async ({ where, limit }) => { assert.deepEqual(where, { companyId: 'company', branchId: 'branch', sku: 'SKU-1' }); assert.equal(limit, 500); return []; });
  const res = reply(); await handler({ user: { companyId: 'company' }, branchId: 'branch', params: { id: 'movement' } }, res, e => { throw e }); assert.equal(res.body.match, 'sku');
});
test('price history falls back to batch when the SKU is missing', async t => {
  const router = require('../routes/stockMovements'); const handler = router.stack.find(l => l.route?.path === '/:id/history').route.stack[0].handle;
  t.mock.method(StockMovement, 'findOne', async () => ({ sku: null, stockId: 'batch' }));
  t.mock.method(StockMovement, 'findAll', async ({ where }) => { assert.deepEqual(where, { companyId: 'company', branchId: 'branch', stockId: 'batch' }); return []; });
  const res = reply(); await handler({ user: { companyId: 'company' }, branchId: 'branch', params: { id: 'movement' } }, res, e => { throw e }); assert.equal(res.body.match, 'batch');
});
test('date range applies to both movement list and item history', async t => {
  const router = require('../routes/stockMovements');
  const list = router.stack.find(l => l.route?.path === '/').route.stack[0].handle;
  const history = router.stack.find(l => l.route?.path === '/:id/history').route.stack[0].handle;
  const query = { start: '2026-01-24T18:30:00.000Z', end: '2026-01-26T18:30:00.000Z' };
  const req = { user: { companyId: 'company' }, branchId: 'branch', params: { id: 'movement' }, query };
  t.mock.method(StockMovement, 'findOne', async () => ({ sku: 'SKU-1', stockId: 'batch' }));
  t.mock.method(StockMovement, 'findAll', async ({ where }) => {
    assert.equal(where.companyId, 'company'); assert.equal(where.branchId, 'branch');
    assert.equal(where.createdAt[Op.gte].toISOString(), query.start);
    assert.equal(where.createdAt[Op.lt].toISOString(), query.end);
    return [];
  });
  for (const handler of [list, history]) {
    const res = reply(); await handler(req, res, e => { throw e }); assert.equal(res.statusCode, 200);
  }
  assert.equal(StockMovement.findAll.mock.callCount(), 2);
});
test('invalid date ranges are rejected', async t => {
  const router = require('../routes/stockMovements');
  const list = router.stack.find(l => l.route?.path === '/').route.stack[0].handle;
  t.mock.method(StockMovement, 'findAll', async () => { throw new Error('unexpected query'); });
  const res = reply();
  await list({ user: { companyId: 'company' }, branchId: 'branch', query: { start: '2026-02-01T00:00:00.000Z', end: '2026-01-01T00:00:00.000Z' } }, res, e => { throw e });
  assert.equal(res.statusCode, 400);
});
test('stock adjustment locks the branch batch and records reason and user in the same transaction', async t => {
  const router = require('../routes/stocks');
  const handler = router.stack.find(l => l.route?.path === '/:id/adjustments').route.stack[0].handle;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const stock = { id: 'batch', name: 'Part', sku: 'P', quantity: 5, costPrice: '100', costCurrency: 'LKR', sellingPrice: '150', update: async (values, options) => { assert.equal(options.transaction, transaction); stock.quantity = values.quantity; } };
  t.mock.method(Stock.sequelize, 'transaction', async fn => fn(transaction));
  t.mock.method(Stock, 'findOne', async options => { assert.deepEqual(options.where, { id: 'batch', branchId: 'branch', isArchived: false }); assert.equal(options.lock, 'UPDATE'); return stock; });
  t.mock.method(StockMovement, 'create', async (values, options) => { assert.equal(options.transaction, transaction); assert.equal(values.kind, 'adjustment'); assert.equal(values.quantityChange, -2); assert.equal(values.balanceAfter, 3); assert.equal(values.adjustmentReason, 'damaged'); assert.equal(values.adjustmentNote, 'Broken'); assert.equal(values.createdByName, 'Admin'); });
  const res = reply(); await handler({ user: { id: 'user', companyId: 'company', fullName: 'Admin' }, branchId: 'branch', params: { id: 'batch' }, body: { change: -2, reason: 'damaged', note: ' Broken ' } }, res, e => { throw e });
  assert.equal(res.statusCode, 200); assert.equal(res.body.item.quantity, 3);
});
test('adjustment rejects invalid inputs and insufficient stock', async t => {
  const handler = require('../routes/stocks').stack.find(l => l.route?.path === '/:id/adjustments').route.stack[0].handle;
  const req = { user: { id: 'user', companyId: 'company' }, branchId: 'branch', params: { id: 'batch' }, body: { change: -2, reason: 'other', note: '' } };
  let res = reply(); await handler(req, res, e => { throw e }); assert.equal(res.statusCode, 400);
  t.mock.method(Stock.sequelize, 'transaction', async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(Stock, 'findOne', async () => ({ quantity: 1 }));
  t.mock.method(StockMovement, 'create', async () => { throw new Error('unexpected movement'); });
  req.body = { change: -2, reason: 'lost' }; res = reply(); await handler(req, res, e => { throw e }); assert.equal(res.statusCode, 400);
});
