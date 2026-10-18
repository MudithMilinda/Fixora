const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateReport } = require('./profitReport');

test('calculates profit from net revenue and recorded costs, and stock from LKR batches', () => {
  const result = calculateReport([{ totalCents: 2700, lines: [{ quantity: 2, unitCostCents: 800 }] }], [{ currency: 'LKR', totalCents: 5000 }, { currency: 'USD', totalCents: 1000 }], [{ costCurrency: 'LKR', costPrice: '8.00', quantity: 3 }, { costCurrency: null, costPrice: '2.00', quantity: 1 }]);
  assert.equal(result.revenueCents, 2700); assert.equal(result.knownCostCents, 1600); assert.equal(result.grossProfitCents, 1100); assert.equal(result.stockValueCents, 2400); assert.equal(result.purchaseCents, 5000); assert.equal(result.excludedCurrencyOrders, 1); assert.equal(result.unknownStockBatches, 1);
});
test('does not present profit as complete when a cost is missing', () => {
  const result = calculateReport([{ totalCents: 1000, lines: '[{"quantity":1,"unitCostCents":null}]' }], [], []);
  assert.equal(result.grossProfitCents, null); assert.equal(result.unknownCostLines, 1);
});
test('report queries sales, receipts and inventory within active branch', async t => {
  const router = require('../routes/reports');
  const handler = router.stack.find(layer => layer.route?.path === '/profit').route.stack[0].handle;
  const Branch = require('../models/Branch'); const UserBranch = require('../models/UserBranch'); const Sale = require('../models/Sale'); const PurchaseOrder = require('../models/PurchaseOrder'); const Stock = require('../models/Stock');
  t.mock.method(Branch, 'findOne', async ({ where }) => { assert.equal(where.companyId, 'c'); return {}; });
  t.mock.method(UserBranch, 'findOne', async () => ({}));
  t.mock.method(Sale, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'b'); assert.equal(where.companyId, 'c'); return []; });
  t.mock.method(PurchaseOrder, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'b'); assert.equal(where.status, 'Received'); return []; });
  t.mock.method(PurchaseOrder, 'count', async ({ where }) => { assert.equal(where.branchId, 'b'); return 0; });
  t.mock.method(Stock, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'b'); return []; });
  const res = { json(value) { this.body = value; return this }, status(code) { this.code = code; return this } };
  await handler({ user: { id: 'u', companyId: 'c' }, branchId: 'b', query: { start: '2026-01-01T00:00:00.000Z', end: '2026-02-01T00:00:00.000Z' } }, res, e => { throw e });
  assert.equal(res.body.report.grossProfitCents, 0);
});
function route(path) { return require('../routes/reports').stack.find(layer => layer.route?.path === path).route.stack; }
const reply = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this } });
test('stock valuation scopes active stock to branch and excludes unknown currencies from LKR total', async t => {
  const Stock = require('../models/Stock');
  const { Op } = require('sequelize');
  t.mock.method(Stock, 'findAndCountAll', async ({ where, limit, offset }) => {
    assert.equal(where.branchId, 'branch'); assert.equal(where.isArchived, false); assert.equal(where.quantity[Op.gt], 0);
    assert.equal(limit, 10); assert.equal(offset, 10); assert.ok(where[Op.or]);
    return { count: 12, rows: [{ id: 'a', name: 'Part', sku: 'A', quantity: 3, costPrice: '12.50', costCurrency: 'LKR', sellingPrice: '20.00' }, { id: 'b', name: 'Other', sku: null, quantity: 2, costPrice: '5.00', costCurrency: null, sellingPrice: '10.00' }] };
  });
  t.mock.method(Stock, 'findOne', async ({ where }) => { assert.equal(where.branchId, 'branch'); assert.equal(where[Op.or], undefined); return { totalCostCents: '3750', sellingValueCents: '8000', excludedBatches: '1', totalUnits: '5', totalBatches: '2' }; });
  const res = reply(); await route('/stock-valuation')[0].handle({ branchId: 'branch', query: { page: '2', search: 'Part' } }, res, e => { throw e });
  assert.equal(res.body.totalCostCents, 3750); assert.equal(res.body.sellingValueCents, 8000); assert.equal(res.body.excludedBatches, 1); assert.equal(res.body.total, 12); assert.equal(res.body.rows[1].costValueCents, null);
});
test('supplier purchase history scopes received orders, dates and item search before paging', async t => {
  const Order = require('../models/PurchaseOrder'); const { Op } = require('sequelize');
  t.mock.method(Order, 'findAndCountAll', async options => {
    assert.equal(options.where.companyId, 'company'); assert.equal(options.where.branchId, 'branch'); assert.equal(options.where.status, 'Received');
    assert.equal(options.where.supplierName[Op.like], '%Vendor%'); assert.equal(options.where[Op.or].length, 2); assert.equal(options.offset, 10); assert.equal(options.limit, 10);
    assert.equal(options.where.receivedAt[Op.gte].toISOString(), '2026-01-01T00:00:00.000Z');
    return { count: 11, rows: [{ id: 'o', orderNumber: 'PO-1', supplierName: 'Vendor', currency: 'LKR', receivedAt: new Date('2026-01-02T00:00:00Z'), items: [{ itemName: 'Screen', sku: 'S', unitPriceCents: 1000 }, { itemName: 'Cable', sku: 'C', unitPriceCents: 200 }] }] };
  });
  const res = reply(); await route('/supplier-purchases')[0].handle({ user: { companyId: 'company' }, branchId: 'branch', query: { page: '2', item: 'screen', supplier: 'Vendor', start: '2026-01-01T00:00:00.000Z', end: '2026-02-01T00:00:00.000Z' } }, res, e => { throw e });
  assert.equal(res.body.total, 11); assert.equal(res.body.orders[0].items.length, 1); assert.equal(res.body.orders[0].items[0].unitPriceCents, 1000);
});
test('supplier purchase history rejects reversed dates', async () => {
  const res = reply(); await route('/supplier-purchases')[0].handle({ user: { companyId: 'company' }, branchId: 'branch', query: { start: '2026-02-01T00:00:00.000Z', end: '2026-01-01T00:00:00.000Z' } }, res, e => { throw e }); assert.equal(res.statusCode, 400);
});
test('supplier purchase filter uses the selected supplier identity', async t => {
  const Order = require('../models/PurchaseOrder');
  t.mock.method(Order, 'findAndCountAll', async options => { assert.equal(options.where.supplierId, 'supplier-id'); assert.equal(options.where.companyId, 'company'); assert.equal(options.where.branchId, 'branch'); return { count: 0, rows: [] }; });
  const res = reply(); await route('/supplier-purchases')[0].handle({ user: { companyId: 'company' }, branchId: 'branch', query: { supplierId: 'supplier-id' } }, res, e => { throw e }); assert.equal(res.body.total, 0);
});
test('purchase supplier dropdown uses only received orders in the current branch', async t => {
  const Order = require('../models/PurchaseOrder');
  t.mock.method(Order, 'findAll', async ({ where }) => { assert.deepEqual(where, { companyId: 'company', branchId: 'branch', status: 'Received' }); return [{ supplierId: 's', supplierName: 'Supplier' }, { supplierId: 's', supplierName: 'Supplier' }]; });
  const res = reply(); await route('/supplier-purchase-suppliers')[0].handle({ user: { companyId: 'company' }, branchId: 'branch' }, res, e => { throw e }); assert.deepEqual(res.body.suppliers, [{ id: 's', name: 'Supplier' }]);
});
test('only administrators can correct financial records', () => {
  const guard = route('/missing-sale-cost')[0].handle;
  const res = reply(); guard({ user: { role: 'admin', customRoleId: 'role' } }, res, () => assert.fail('custom role must be rejected'));
  assert.equal(res.statusCode, 403);
});
test('missing sale cost is saved per unit under a locked, branch-scoped sale', async t => {
  const Sale = require('../models/Sale'); const transaction = { LOCK: { UPDATE: 'UPDATE' } }; let saved;
  t.mock.method(Sale.sequelize, 'transaction', async fn => fn(transaction));
  t.mock.method(Sale, 'findOne', async ({ where, lock }) => { assert.deepEqual(where, { id: 'sale-a', companyId: 'company-a', branchId: 'branch-a' }); assert.equal(lock, 'UPDATE'); return { lines: JSON.stringify([{ name: 'Part', quantity: 2 }, { name: 'Already known', unitCostCents: 99 }]), update: async (value, options) => { assert.equal(options.transaction, transaction); saved = value.lines; } }; });
  const res = reply(); await route('/missing-sale-cost')[1].handle({ user: { companyId: 'company-a' }, branchId: 'branch-a', body: { saleId: 'sale-a', lineIndex: 0, unitCost: '123.45' } }, res, e => { throw e });
  assert.equal(saved[0].unitCostCents, 12345); assert.equal(saved[1].unitCostCents, 99); assert.equal(res.body.success, true);
});
test('cannot overwrite an existing sale cost or silently guess currency', async t => {
  const Sale = require('../models/Sale'); const Stock = require('../models/Stock');
  t.mock.method(Sale.sequelize, 'transaction', async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(Sale, 'findOne', async () => ({ lines: [{ unitCostCents: 500 }], update: async () => assert.fail('must not overwrite') }));
  let res = reply(); await route('/missing-sale-cost')[1].handle({ user: { companyId: 'c' }, branchId: 'b', body: { saleId: 's', lineIndex: 0, unitCost: '0' } }, res, e => { throw e }); assert.equal(res.statusCode, 409);
  t.mock.method(Stock, 'update', async (values, options) => { assert.deepEqual(values, { costCurrency: 'LKR' }); assert.deepEqual(options.where, { id: 'stock', branchId: 'b', costCurrency: null }); return [1]; });
  res = reply(); await route('/missing-stock-currency')[1].handle({ branchId: 'b', body: { stockId: 'stock', currency: 'LKR' } }, res, e => { throw e }); assert.equal(res.body.success, true);
});
test('receipt date update only fills received, undated orders within the branch', async t => {
  const Order = require('../models/PurchaseOrder');
  t.mock.method(Order, 'update', async (values, options) => { assert.equal(values.receivedAt.toISOString(), '2024-01-02T00:00:00.000Z'); assert.deepEqual(options.where, { id: 'o', companyId: 'c', branchId: 'b', status: 'Received', receivedAt: null }); return [1]; });
  const res = reply(); await route('/missing-receipt-date')[1].handle({ user: { companyId: 'c' }, branchId: 'b', body: { orderId: 'o', receivedAt: '2024-01-02T00:00:00.000Z' } }, res, e => { throw e }); assert.equal(res.body.success, true);
});
test('report details match summary totals, discounts, missing costs and current branch', async t => {
  const router = require('../routes/reports'); const handler = router.stack.find(layer => layer.route?.path === '/profit').route.stack[0].handle;
  const Sale = require('../models/Sale'); const Order = require('../models/PurchaseOrder'); const Stock = require('../models/Stock');
  t.mock.method(Sale, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'branch-a'); return [{ id: 'sale', createdAt: new Date(), customerName: 'Customer', subtotalCents: 3000, discountCents: 500, totalCents: 2500, lines: JSON.stringify([{ name: 'Part', quantity: 2, unitPrice: 15, unitCostCents: 700 }]) }, { id: 'sale-unknown', totalCents: 1000, subtotalCents: 1000, discountCents: 0, lines: [{ name: 'Service', quantity: 1 }] }]; });
  t.mock.method(Order, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'branch-a'); return where.receivedAt === null ? [] : [{ id: 'order', orderNumber: 'PO-1', currency: 'LKR', totalCents: 2000, items: [{ itemName: 'Part', quantity: 2, unitPriceCents: 1000 }] }]; });
  t.mock.method(Stock, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'branch-a'); return [{ id: 'stock', name: 'Part', quantity: 2, costPrice: '7.00', costCurrency: 'LKR' }]; });
  const res = reply(); await handler({ user: { id: 'u', companyId: 'company-a', role: 'admin' }, branchId: 'branch-a', query: { start: '2026-01-01T00:00:00.000Z', end: '2026-02-01T00:00:00.000Z' } }, res, e => { throw e });
  assert.equal(res.body.report.revenueCents, 3500); assert.equal(res.body.report.knownCostCents, 1400); assert.equal(res.body.details.sales[0].grossProfitCents, 1100); assert.equal(res.body.details.sales[1].grossProfitCents, null); assert.equal(res.body.details.orders[0].items[0].quantity, 2); assert.equal(res.body.details.stocks[0].costPrice, 7);
});
