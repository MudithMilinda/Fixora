const test = require('node:test');
const assert = require('node:assert/strict');
const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const { RepairJob } = require('../models/RepairJob');
const router = require('../routes/sales');
const handler = router.stack.find(l => l.route?.path === '/' && l.route.methods.post).route.stack[0].handle;
const req = { user: { id: 'user-a', companyId: 'company-a' }, branchId: 'branch-a', body: { requestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', customerName: '', customerPhone: '', discount: 0, lines: [{ type: 'stock', stockId: 'stock-a', quantity: 2 }], payments: [{ method: 'Cash', amount: 25 }] } };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } });
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
function setup(t) { t.mock.method(Sale.sequelize, 'transaction', async fn => fn(transaction)); t.mock.method(Sale, 'findOne', async () => null); }
test('sale locks branch stock, uses server prices and saves in the same transaction', async t => {
  setup(t); let updated;
  t.mock.method(Stock, 'findAll', async options => { assert.equal(options.where.branchId, 'branch-a'); assert.equal(options.transaction, transaction); return [{ id: 'stock-a', name: 'Part', sku: null, quantity: 3, sellingPrice: '12.50', costPrice: '8.00', costCurrency: 'LKR', update: async (values, options) => { assert.equal(options.transaction, transaction); updated = values.quantity; } }]; });
  t.mock.method(Sale, 'create', async (values, options) => { assert.equal(options.transaction, transaction); assert.equal(values.totalCents, 2500); assert.equal(values.branchId, 'branch-a'); assert.equal(values.lines[0].unitPrice, 12.5); assert.equal(values.lines[0].unitCostCents, 800); return { ...values, id: 'sale-a', createdAt: new Date() }; });
  const res = response(); await handler(req, res, e => { throw e }); assert.equal(res.statusCode, 201); assert.equal(updated, 1);
});
test('rejects insufficient or foreign-branch stock', async t => {
  setup(t); t.mock.method(Stock, 'findAll', async () => []); t.mock.method(Sale, 'create', async () => assert.fail('must not save'));
  const res = response(); await handler(req, res, e => { throw e }); assert.equal(res.statusCode, 400);
});
test('repair parts use saved repair prices and do not deduct stock again', async t => {
  setup(t); t.mock.method(RepairJob, 'findOne', async () => ({ id: 'repair-a', status: 'Delivered', parts: [{ name: 'Part', quantity: 1, unitPrice: 10 }], jobNumber: 'R1', assetName: 'Phone' }));
  t.mock.method(Stock, 'findAll', async () => assert.fail('repair parts must not touch stock'));
  t.mock.method(Sale, 'create', async values => ({ ...values, id: 'sale-a', createdAt: new Date() }));
  const res = response(); await handler({ ...req, body: { ...req.body, repairId: 'repair-a', lines: [{ type: 'repair', partIndex: 0, quantity: 1 }], payments: [{ method: 'Cash', amount: 10 }] } }, res, e => { throw e }); assert.equal(res.statusCode, 201); assert.equal(res.body.sale.total, 10);
});
test('retry returns the saved sale without deducting stock again', async t => {
  t.mock.method(Sale.sequelize, 'transaction', async fn => fn(transaction));
  t.mock.method(Sale, 'findOne', async ({ where }) => { assert.equal(where.createdBy, 'user-a'); return { id: 'saved', customerName: '', customerPhone: '', subtotalCents: 2500, discountCents: 0, totalCents: 2500, lines: [], payments: [], createdAt: new Date() }; });
  t.mock.method(Stock, 'findAll', async () => assert.fail('retry must not deduct stock'));
  const res = response(); await handler(req, res, e => { throw e }); assert.equal(res.body.sale.id, 'saved');
});
test('payment history is scoped to the active company and branch', async t => {
  const get = router.stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
  t.mock.method(Sale, 'findAll', async ({ where }) => { assert.deepEqual(where, { companyId: 'company-a', branchId: 'branch-a' }); return []; });
  const res = response(); await get(req, res, e => { throw e }); assert.deepEqual(res.body.sales, []);
});
