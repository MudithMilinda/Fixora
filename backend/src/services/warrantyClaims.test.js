const test = require('node:test');
const assert = require('node:assert/strict');
const Sale = require('../models/Sale');
const Claim = require('../models/WarrantyClaim');
const { RepairJob } = require('../models/RepairJob');
const router = require('../routes/warrantyClaims');
const route = (path, method) => router.stack.find(l => l.route?.path === path && l.route.methods[method]).route.stack[0].handle;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } });
const req = { user: { id: 'user', companyId: 'company' }, branchId: 'branch', body: { saleId: 'sale', lineIndex: 0, number: 'SERIAL', issue: 'Faulty' }, params: { id: 'claim' } };
const invoke = (handler, request, res) => handler(request, res, error => { throw error });
test('active claim uses the sale and number from the current branch', async t => {
  t.mock.method(Sale, 'findOne', async ({ where }) => { assert.deepEqual(where, { id: 'sale', companyId: 'company', branchId: 'branch' }); return { customerName: 'Customer', customerPhone: '', lines: [{ name: 'Part', sku: 'SKU', warranty: { count: 1, start: '2000-01-01', end: '2099-01-01', numbers: ['SERIAL'] } }] } });
  t.mock.method(Claim, 'create', async values => { assert.equal(values.itemName, 'Part'); assert.equal(values.number, 'SERIAL'); assert.equal(values.createdBy, 'user'); return values; });
  const res = response(); await invoke(route('/', 'post'), req, res); assert.equal(res.statusCode, 201);
});
test('expired warranties and unrelated serial numbers are rejected', async t => {
  let warranty = { count: 1, start: '2000-01-01', end: '2000-01-02', numbers: ['SERIAL'] };
  t.mock.method(Sale, 'findOne', async () => ({ lines: [{ name: 'Part', warranty }] }));
  t.mock.method(Claim, 'create', async () => assert.fail('must not create claim'));
  let res = response(); await invoke(route('/', 'post'), req, res); assert.equal(res.statusCode, 400);
  warranty = { count: 1, start: '2000-01-01', end: '2099-01-01', numbers: ['OTHER'] }; res = response(); await invoke(route('/', 'post'), req, res); assert.equal(res.statusCode, 400);
});
test('repair creation locks the branch claim and links a new job', async t => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } }; let changes;
  t.mock.method(Claim.sequelize, 'transaction', async fn => fn(transaction));
  t.mock.method(Claim, 'findOne', async options => { assert.equal(options.where.branchId, 'branch'); assert.equal(options.lock, 'UPDATE'); return { customerName: 'Customer', customerPhone: '', itemName: 'Part', number: 'SERIAL', issue: 'Faulty', status: 'Received', update: async values => { changes = values } } });
  t.mock.method(RepairJob, 'create', async values => { assert.equal(values.warrantyClaim, true); assert.equal(values.assetIdentifier, 'SERIAL'); return { id: 'repair', jobNumber: values.jobNumber } });
  const res = response(); await invoke(route('/:id/repair', 'post'), req, res); assert.equal(res.statusCode, 201); assert.equal(changes.repairId, 'repair'); assert.equal(changes.status, 'In progress');
});
