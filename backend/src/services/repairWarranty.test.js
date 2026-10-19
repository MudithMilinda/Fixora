const test = require('node:test');
const assert = require('node:assert/strict');
const { localDay, warrantyDates, warrantyStatus } = require('./repairWarranty');
test('warranty starts on completion in Sri Lanka and is inclusive of its final day', () => {
  const start = new Date('2026-01-01T20:00:00.000Z');
  assert.equal(localDay(start), '2026-01-02');
  const warranty = warrantyDates(30, start);
  assert.deepEqual(warranty, { warrantyDays: 30, warrantyStart: '2026-01-02', warrantyEnd: '2026-01-31' });
  assert.equal(warrantyStatus(warranty, new Date('2026-01-31T17:00:00.000Z')), 'active');
  assert.equal(warrantyStatus(warranty, new Date('2026-01-31T19:00:00.000Z')), 'expired');
});
test('old repairs and repairs with no warranty stay distinguishable', () => {
  assert.equal(warrantyStatus({ warrantyDays: null }), 'not_recorded');
  assert.deepEqual(warrantyDates(0), { warrantyDays: 0, warrantyStart: null, warrantyEnd: null });
  assert.equal(warrantyStatus(warrantyDates(0)), 'none');
  for (const days of [-1, 3651, 0.5, '30']) assert.throws(() => warrantyDates(days), /warranty period/);
});
test('follow-up creation links only to a completed repair in the current branch allows edited details and derives coverage on the server', async t => {
  const { RepairJob } = require('../models/RepairJob'); const router = require('../routes/repairs');
  const handler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;
  const tx = { LOCK: { UPDATE: 'UPDATE' } }; let saved;
  t.mock.method(RepairJob.sequelize, 'transaction', async fn => fn(tx));
  t.mock.method(RepairJob, 'findOne', async ({ where, lock }) => { assert.deepEqual(where, { id: 'parent', branchId: 'branch' }); assert.equal(lock, 'UPDATE'); return { id: 'parent', jobNumber: 'REP-1', status: 'Delivered', customerName: 'Actual customer', assetName: 'Device', assetType: 'Other asset', warrantyDays: 30, warrantyStart: '2000-01-01', warrantyEnd: '2000-01-30' }; });
  t.mock.method(RepairJob, 'create', async (values, { transaction }) => { assert.equal(transaction, tx); saved = values; return { ...values, id: 'new', createdAt: new Date() }; });
  const res = { status(code) { this.code = code; return this }, json(value) { this.body = value; return this } };
  await handler({ user: { id: 'user' }, branchId: 'branch', body: { parentRepairId: 'parent', customerName: 'Untrusted name', assetName: 'Untrusted asset', issue: 'New issue', warrantyClaim: true } }, res, e => { throw e });
  assert.equal(res.code, 201); assert.equal(saved.customerName, 'Untrusted name'); assert.equal(saved.assetName, 'Untrusted asset'); assert.equal(saved.parentJobNumber, 'REP-1'); assert.equal(saved.warrantyClaim, false);
});
test('completing a repair records warranty once and preserves its promised date', async t => {
  const { RepairJob } = require('../models/RepairJob'), router = require('../routes/repairs');
  const handler = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.patch).route.stack[0].handle;
  const tx = { LOCK: { UPDATE: 'UPDATE' } }; let saved;
  const job = { id: 'job', branchId: 'branch', status: 'Received', customerName: 'Customer', assetName: 'Device', assetType: 'Other asset', issue: 'Broken', priority: 'Normal', parts: [], promisedDate: new Date('2026-01-10T00:00:00Z'), warrantyDays: null, update: async values => { saved = values; Object.assign(job, values) } };
  t.mock.method(RepairJob.sequelize, 'transaction', async fn => fn(tx));
  t.mock.method(RepairJob, 'findOne', async ({ where }) => { assert.equal(where.branchId, 'branch'); return job; });
  const response = () => ({ status(code) { this.code = code; return this }, json(value) { this.body = value; return this } });
  let res = response(); await handler({ user: { id: 'user' }, branchId: 'branch', params: { id: 'job' }, body: { status: 'Delivered', warrantyDays: 30 } }, res, e => { throw e });
  assert.equal(res.code, 200); assert.equal(saved.warrantyDays, 30); assert.equal(saved.promisedDate.toISOString(), '2026-01-10T00:00:00.000Z'); assert.equal(res.body.job.warrantyStatus, 'active');
  res = response(); await handler({ user: { id: 'user' }, branchId: 'branch', params: { id: 'job' }, body: { status: 'Closed', warrantyDays: 365 } }, res, e => { throw e });
  assert.equal(saved.warrantyDays, undefined); assert.equal(job.warrantyDays, 30);
});
test('month and year warranty periods use calendar dates, including leap years and month ends', () => {
  const { warrantyPeriodDates } = require('./repairWarranty');
  assert.deepEqual(warrantyPeriodDates(1, 'months', new Date('2024-01-31T06:00:00Z')), { warrantyDays: 29, warrantyStart: '2024-01-31', warrantyEnd: '2024-02-28' });
  assert.deepEqual(warrantyPeriodDates(1, 'years', new Date('2024-02-29T06:00:00Z')), { warrantyDays: 365, warrantyStart: '2024-02-29', warrantyEnd: '2025-02-27' });
  assert.deepEqual(warrantyPeriodDates(0, 'years'), { warrantyDays: 0, warrantyStart: null, warrantyEnd: null });
  assert.throws(() => warrantyPeriodDates(11, 'years'), /valid warranty/);
  assert.throws(() => warrantyPeriodDates(1, 'weeks'), /valid warranty/);
});
test('customer suggestions stay within the branch and distinguish records with no phone', async t => {
  const { RepairJob } = require('../models/RepairJob'), { Op } = require('sequelize');
  const handler = require('../routes/repairs').stack.find(layer => layer.route?.path === '/customer-suggestions').route.stack[0].handle;
  t.mock.method(RepairJob, 'findAll', async options => { assert.equal(options.where.branchId, 'branch'); assert.equal(options.where.customerName[Op.like], '%Nim%'); assert.equal(options.limit, 100); return [
    { id: '1', jobNumber: 'R1', assetName: 'Phone', customerName: 'Nimal', customerPhone: '077' },
    { id: '2', jobNumber: 'R2', assetName: 'Laptop', customerName: 'Nimal', customerPhone: '077' },
    { id: '3', jobNumber: 'R3', assetName: 'Phone', customerName: 'Nimal', customerPhone: null },
    { id: '4', jobNumber: 'R4', assetName: 'Tablet', customerName: 'Nimal', customerPhone: null },
  ]; });
  const res = { json(body) { this.body = body; return this } };
  await handler({ branchId: 'branch', query: { search: 'Nim' } }, res, e => { throw e });
  assert.deepEqual(res.body.customers.map(item => item.id), ['1', '3', '4']);
});
test('customer history scopes matching records to the active branch and never guesses a missing phone', async t => {
  const { RepairJob } = require('../models/RepairJob');
  const handler = require('../routes/repairs').stack.find(layer => layer.route?.path === '/customer-history/:id').route.stack[0].handle;
  t.mock.method(RepairJob, 'findOne', async ({ where }) => { assert.deepEqual(where, { id: 'source', branchId: 'branch' }); return { id: 'source', customerName: 'Nimal', customerPhone: null }; });
  t.mock.method(RepairJob, 'findAll', async ({ where }) => { assert.deepEqual(where, { id: 'source', branchId: 'branch' }); return []; });
  const res = { json(body) { this.body = body; return this } };
  await handler({ branchId: 'branch', params: { id: 'source' } }, res, e => { throw e }); assert.deepEqual(res.body.jobs, []);
});
