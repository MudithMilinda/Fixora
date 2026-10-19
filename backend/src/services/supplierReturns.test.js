const test = require('node:test');
const assert = require('node:assert/strict');
const PurchaseOrder = require('../models/PurchaseOrder');
const SupplierReturn = require('../models/SupplierReturn');
const Stock = require('../models/Stock');
const StockMovement = require('../models/StockMovement');
const Branch = require('../models/Branch');
const router = require('../routes/supplierReturns');
const route = (path, method) => router.stack.find(l => l.route?.path === path && l.route.methods[method]).route.stack[0].handle;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } });
const invoke = (handler, request, res) => handler(request, res, error => { throw error });
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
const req = { user: { id: 'user', companyId: 'company' }, branchId: 'branch', body: { requestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', orderId: 'order', itemRequestId: 'item', quantity: 2, reason: 'Damaged' }, params: { id: 'return' } };
const order = { id: 'order', status: 'Received', orderNumber: 'PO-1', supplierId: 'supplier', supplierName: 'Supplier', currency: 'LKR', items: [{ requestId: 'item', itemId: 'product', itemName: 'Display', sku: 'SKU', quantity: 5, unitPriceCents: 10000 }] };
function setup(t, quantity = 4) {
  t.mock.method(SupplierReturn.sequelize, 'transaction', async fn => fn(transaction));
  t.mock.method(PurchaseOrder, 'findOne', async options => { assert.equal(options.where.branchId, 'branch'); return order });
  t.mock.method(SupplierReturn, 'findOne', async () => null);
  t.mock.method(SupplierReturn, 'sum', async () => 1);
  t.mock.method(Branch, 'findOne', async () => ({}));
  t.mock.method(StockMovement, 'findAll', async options => { assert.equal(options.where.referenceId, 'order'); return [{ stockId: 'stock' }] });
  const stock = { id: 'stock', quantity, name: 'Display', sku: 'SKU', costPrice: '100.00', costCurrency: 'LKR', sellingPrice: '200.00', update: async function (values) { Object.assign(this, values) } };
  t.mock.method(Stock, 'findAll', async options => { assert.equal(options.where.itemId, 'product'); assert.equal(options.lock, 'UPDATE'); return [stock] });
  return stock;
}
test('returns received items transactionally and records stock movement', async t => {
  const stock = setup(t);
  t.mock.method(SupplierReturn, 'create', async values => { assert.equal(values.reason, 'Damaged'); assert.equal(values.stockId, 'stock'); assert.equal(values.unitPriceCents, 10000); return { ...values, id: 'return' } });
  t.mock.method(StockMovement, 'create', async values => { assert.equal(values.kind, 'supplier_return'); assert.equal(values.quantityChange, -2); assert.equal(values.balanceAfter, 2) });
  const res = response(); await invoke(route('/', 'post'), req, res); assert.equal(res.statusCode, 201); assert.equal(stock.quantity, 2);
});
test('rejects unavailable stock before creating a return', async t => {
  setup(t, 1); t.mock.method(SupplierReturn, 'create', async () => assert.fail('must not create return'));
  const res = response(); await invoke(route('/', 'post'), req, res); assert.equal(res.statusCode, 400);
});
test('rejects returning more than the order quantity left', async t => {
  setup(t); t.mock.method(SupplierReturn, 'create', async () => assert.fail('must not create return'));
  const res = response(); await invoke(route('/', 'post'), { ...req, body: { ...req.body, quantity: 5 } }, res); assert.equal(res.statusCode, 400);
});
test('replacement adds units once and records a movement', async t => {
  t.mock.method(SupplierReturn.sequelize, 'transaction', async fn => fn(transaction));
  const returned = { status: 'Pending', stockId: 'stock', quantity: 2, id: 'return', orderNumber: 'PO-1', update: async function (values) { Object.assign(this, values) } };
  t.mock.method(SupplierReturn, 'findOne', async options => { assert.equal(options.where.branchId, 'branch'); return returned });
  t.mock.method(Branch, 'findOne', async () => ({}));
  const stock = { id: 'stock', quantity: 1, update: async function (values) { Object.assign(this, values) } };
  t.mock.method(Stock, 'findOne', async () => stock);
  t.mock.method(StockMovement, 'create', async values => { assert.equal(values.kind, 'supplier_replacement'); assert.equal(values.balanceAfter, 3) });
  const res = response(); await invoke(route('/:id/resolve', 'patch'), { ...req, body: { status: 'Replaced' } }, res); assert.equal(res.statusCode, 200); assert.equal(stock.quantity, 3);
  const repeat = response(); await invoke(route('/:id/resolve', 'patch'), { ...req, body: { status: 'Replaced' } }, repeat); assert.equal(repeat.statusCode, 400);
});
test('filter options use all returned items and suppliers in the active branch', async t => {
  t.mock.method(SupplierReturn, 'findAll', async options => {
    assert.deepEqual(options.where, { companyId: 'company', branchId: 'branch' });
    assert.equal(options.limit, undefined);
    return [{ itemId: 'product', itemName: 'Display', sku: 'SKU', supplierId: 'supplier', supplierName: 'Supplier' }, { itemId: 'product', itemName: 'Display', sku: 'SKU', supplierId: 'supplier', supplierName: 'Supplier' }, { itemId: null, itemName: 'Cable', sku: 'CABLE', supplierId: 'other', supplierName: 'Other' }];
  });
  const res = response(); await invoke(route('/filter-options', 'get'), req, res);
  assert.equal(res.body.items.length, 2); assert.equal(res.body.suppliers.length, 2);
  assert.deepEqual(res.body.items[0], { field: 'itemId', value: 'product', name: 'Display', sku: 'SKU' });
});
test('item and supplier filters apply within the branch before pagination', async t => {
  t.mock.method(SupplierReturn, 'findAndCountAll', async options => {
    assert.deepEqual(options.where, { companyId: 'company', branchId: 'branch', status: 'Pending', supplierId: 'supplier', itemId: 'product' });
    assert.equal(options.limit, 10); assert.equal(options.offset, 10);
    return { rows: [], count: 0 };
  });
  const res = response(); await invoke(route('/', 'get'), { ...req, query: { page: '2', status: 'Pending', supplierId: 'supplier', itemField: 'itemId', itemValue: 'product' } }, res);
  assert.equal(res.statusCode, 200);
});
