const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareReturn } = require('./saleReturns');
const { calculateReport } = require('./profitReport');
const sale = { subtotalCents: 300, totalCents: 200, lines: [{ type: 'stock', name: 'Part', sku: 'P', unitPrice: 1, unitCostCents: 30, quantity: 3 }] };
const request = quantity => [{ lineIndex: 0, quantity, reason: 'Changed mind', restock: true }];
test('partial returns allocate the sale discount exactly across repeated returns', () => {
  const first = prepareReturn(sale, [], request(1));
  const second = prepareReturn(sale, [{ lines: first }], request(1));
  const third = prepareReturn(sale, [{ lines: first }, { lines: second }], request(1));
  assert.deepEqual([first[0].refundCents, second[0].refundCents, third[0].refundCents], [66, 67, 67]);
  assert.throws(() => prepareReturn(sale, [{ lines: first }, { lines: second }, { lines: third }], request(1)), /quantities/);
});
test('rejects invalid lines, missing reasons, duplicate lines and restocking non-stock services', () => {
  assert.throws(() => prepareReturn(sale, [], [{ ...request(1)[0], reason: ' ' }]), /reason/);
  assert.throws(() => prepareReturn(sale, [], [...request(1), ...request(1)]), /details|quantities/);
  assert.throws(() => prepareReturn({ ...sale, lines: [{ ...sale.lines[0], type: 'custom' }] }, [], request(1)), /stock sale items/);
});
test('returns reduce revenue and only restocked items reverse cost', () => {
  const report = calculateReport([{ totalCents: 200, lines: sale.lines }], [], [], [{ refundCents: 100, lines: [{ quantity: 1, unitCostCents: 30, restock: true }, { quantity: 1, unitCostCents: 30, restock: false }] }]);
  assert.equal(report.revenueCents, 100); assert.equal(report.knownCostCents, 60); assert.equal(report.grossProfitCents, 40);
  const unknown = calculateReport([], [], [], [{ refundCents: 100, lines: [{ quantity: 1, unitCostCents: null, restock: true }] }]);
  assert.equal(unknown.grossProfitCents, null);
});
test('return route saves a restocked item and movement in the sale transaction', async t => {
  const Sale = require('../models/Sale'), SaleReturn = require('../models/SaleReturn'), Stock = require('../models/Stock'), Movement = require('../models/StockMovement'), Branch = require('../models/Branch');
  const route = require('../routes/sales').stack.find(layer => layer.route?.path === '/:id/returns' && layer.route.methods.post).route.stack[0].handle;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } }; let recorded;
  t.mock.method(Sale.sequelize, 'transaction', async fn => fn(transaction));
  t.mock.method(Branch, 'findOne', async ({ where }) => { assert.equal(where.id, 'branch'); return {}; });
  t.mock.method(Sale, 'findOne', async ({ where, lock }) => { assert.equal(where.companyId, 'company'); assert.equal(where.branchId, 'branch'); assert.equal(lock, 'UPDATE'); return { ...sale, id: 'sale', customerName: 'A' }; });
  t.mock.method(SaleReturn, 'findOne', async () => null);
  t.mock.method(SaleReturn, 'findAll', async () => []);
  t.mock.method(Movement, 'findAll', async () => [{ stockId: 'stock', unitCost: '0.30', costCurrency: 'LKR', unitSellingPrice: '1.00' }]);
  let calls = 0;
  t.mock.method(Stock, 'findOne', async ({ where }) => { calls++; if (calls === 1) { assert.equal(where.id, 'stock'); return { id: 'stock', itemId: 'item' }; } return { id: 'stock', quantity: 0, costPrice: '0.30', costCurrency: 'LKR', sellingPrice: '1.00', name: 'Part', sku: 'P', update: async function (values) { Object.assign(this, values); } }; });
  t.mock.method(Stock, 'update', async () => [0]);
  t.mock.method(SaleReturn, 'create', async (values, options) => { assert.equal(options.transaction, transaction); recorded = values; return { ...values, id: 'return' }; });
  t.mock.method(Movement, 'create', async (values, options) => { assert.equal(options.transaction, transaction); assert.equal(values.kind, 'sale_return'); assert.equal(values.quantityChange, 1); assert.equal(values.referenceId, 'return'); assert.equal(values.balanceAfter, 1); });
  const res = { status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } };
  await route({ params: { id: 'sale' }, user: { id: 'user', companyId: 'company' }, branchId: 'branch', body: { requestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', lines: request(1) } }, res, e => { throw e });
  assert.equal(res.statusCode, 201); assert.equal(recorded.refundCents, 66); assert.equal(recorded.saleId, 'sale');
});
test('return history applies reason and date filters before pagination within the branch', async t => {
  const Return = require('../models/SaleReturn'), { Op } = require('sequelize');
  const route = require('../routes/sales').stack.find(layer => layer.route?.path === '/returns' && layer.route.methods.get).route.stack[0].handle;
  t.mock.method(Return, 'findAndCountAll', async options => {
    assert.equal(options.where.companyId, 'company'); assert.equal(options.where.branchId, 'branch');
    assert.equal(options.where.createdAt[Op.gte].toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(options.where.createdAt[Op.lt].toISOString(), '2026-02-01T00:00:00.000Z');
    assert.equal(options.where[Op.and].length, 1); assert.equal(options.limit, 10); assert.equal(options.offset, 10);
    return { count: 0, rows: [] };
  });
  const res = { status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } };
  await route({ user: { companyId: 'company' }, branchId: 'branch', query: { page: '2', reason: 'damaged', start: '2026-01-01T00:00:00.000Z', end: '2026-02-01T00:00:00.000Z' } }, res, e => { throw e });
  assert.equal(res.body.total, 0);
  const bad = { status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } };
  await route({ user: { companyId: 'company' }, branchId: 'branch', query: { start: '2026-02-01T00:00:00.000Z', end: '2026-01-01T00:00:00.000Z' } }, bad, e => { throw e });
  assert.equal(bad.statusCode, 400);
});
test('returned item options include all distinct items from the current branch', async t => {
  const Return = require('../models/SaleReturn');
  const route = require('../routes/sales').stack.find(layer => layer.route?.path === '/return-items').route.stack[0].handle;
  t.mock.method(Return, 'findAll', async ({ where }) => { assert.deepEqual(where, { companyId: 'company', branchId: 'branch' }); return [{ lines: [{ name: 'Screen', sku: 'S' }, { name: 'Cable', sku: null }] }, { lines: JSON.stringify([{ name: 'Screen', sku: 'S' }]) }]; });
  const res = { json(value) { this.body = value; return this } };
  await route({ user: { companyId: 'company' }, branchId: 'branch' }, res, e => { throw e });
  assert.deepEqual(res.body.items, [{ name: 'Cable', sku: null }, { name: 'Screen', sku: 'S' }]);
});
test('selected returned item is applied before pagination with dates and branch scope', async t => {
  const Return = require('../models/SaleReturn'), { Op } = require('sequelize');
  const route = require('../routes/sales').stack.find(layer => layer.route?.path === '/returns' && layer.route.methods.get).route.stack[0].handle;
  t.mock.method(Return, 'findAndCountAll', async ({ where, limit, offset }) => { assert.equal(where.companyId, 'company'); assert.equal(where.branchId, 'branch'); assert.equal(where[Op.and].length, 1); assert.equal(where.createdAt[Op.gte].toISOString(), '2026-01-01T00:00:00.000Z'); assert.equal(limit, 10); assert.equal(offset, 10); return { rows: [], count: 0 }; });
  const res = { status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } };
  await route({ user: { companyId: 'company' }, branchId: 'branch', query: { page: '2', itemName: 'Screen', itemSku: 'S', start: '2026-01-01T00:00:00.000Z' } }, res, e => { throw e });
  assert.equal(res.body.total, 0);
});
