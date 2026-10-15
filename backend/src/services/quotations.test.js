const test = require('node:test');
const assert = require('node:assert/strict');
const { validateQuotation, buildQuotationItems, serializeQuotation, nextQuotationNumber } = require('./quotations');

const requestId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const supplierId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const body = { supplierId, quotationNumber: ' QT-1 ', quotationDate: '2026-10-15', validUntil: '2026-10-30', currency: 'LKR', items: [{ requestId, unitPrice: '12.35' }] };
const request = { id: requestId, itemId: 'item-id', itemName: 'Display', sku: 'DP-1', quantity: 3 };

test('quotation model reads both native JSON arrays and database JSON text', () => {
  const Quotation = require('../models/Quotation');
  const items = buildQuotationItems(validateQuotation(body).items, [request]).items;
  const quote = Quotation.build({ items });
  assert.deepEqual(quote.items, items);
  quote.setDataValue('items', JSON.stringify(items));
  assert.deepEqual(quote.items, items);
  assert.deepEqual(serializeQuotation(quote).items, items);
});

test('validates supplier quotes and calculates exact totals from server quantities', () => {
  const result = validateQuotation({ ...body, companyId: 'forged', totalCents: 1, items: [{ ...body.items[0], quantity: 999, itemName: 'forged' }] });
  assert.equal(result.quotationNumber, 'QT-1');
  assert.equal(result.companyId, undefined);
  assert.equal(result.totalCents, undefined);
  const built = buildQuotationItems(result.items, [request]);
  assert.equal(built.totalCents, 3705);
  assert.equal(built.items[0].quantity, 3);
  assert.equal(built.items[0].itemName, 'Display');
});

test('generates date-scoped sequential quotation numbers', () => {
  assert.equal(nextQuotationNumber('2026-10-15', []), 'QT-20261015-001');
  assert.equal(nextQuotationNumber('2026-10-15', ['QT-20261015-001', 'QT-20261015-009', 'QT-20261014-999', 'legacy-number']), 'QT-20261015-010');
  assert.throws(() => nextQuotationNumber('2026-10-15', ['QT-20261015-999999']), { status: 400 });
});

test('rejects invalid prices, duplicate requests, invalid dates and currency', () => {
  for (const price of ['', -1, 'NaN', Infinity, true, null, '1.234', '1e5', '100000000']) {
    assert.throws(() => validateQuotation({ ...body, items: [{ requestId, unitPrice: price }] }), { status: 400 });
  }
  for (const change of [{ supplierId: null }, { items: [] }, { items: [null] }, { items: [body.items[0], body.items[0]] }, { quotationDate: '2026-02-30' }, { quotationDate: '0001-01-01' }, { validUntil: '2026-10-01' }, { currency: 'XXX' }, { notes: 'a'.repeat(2001) }]) {
    assert.throws(() => validateQuotation({ ...body, ...change }), { status: 400 });
  }
});

test('keeps original request snapshots on edit, rejects unknown requests and unsafe totals', () => {
  const values = validateQuotation(body);
  const previous = buildQuotationItems(values.items, [request]);
  const edited = buildQuotationItems(values.items, [{ ...request, quantity: 99 }], previous.items);
  assert.equal(edited.items[0].quantity, 3);
  assert.deepEqual(buildQuotationItems(values.items, [], previous.items), edited);
  assert.throws(() => buildQuotationItems(values.items, []), { status: 400 });
  assert.throws(() => buildQuotationItems([{ requestId, unitPriceCents: 9999999999 }], [{ ...request, quantity: 10000000 }]), { status: 400 });
});

test('allows PDF attachments, handles keep/remove and rejects unsafe formats and spoofed data', () => {
  const data = `data:application/pdf;base64,${Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}`;
  const quote = validateQuotation({ ...body, attachment: { name: 'quote.pdf', data } });
  assert.equal(quote.attachmentName, 'quote.pdf');
  assert.equal(quote.attachmentType, 'application/pdf');
  assert.equal(validateQuotation(body).attachmentData, undefined);
  assert.equal(validateQuotation({ ...body, attachment: null }).attachmentData, null);
  for (const value of ['data:text/html;base64,PGgxPjwvaDE+', 'data:image/png;base64,aGVsbG8=', `data:application/pdf;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`]) {
    assert.throws(() => validateQuotation({ ...body, attachment: { name: 'quote.pdf', data: value } }), { status: 400 });
  }
  assert.equal(serializeQuotation({ ...quote, totalCents: '1235', attachmentData: 'secret' }).attachmentData, undefined);
});

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}
function handler(method, path) {
  const router = require('../routes/quotations');
  return router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
}
const auth = { user: { id: 'user-a', companyId: 'company-a' }, branchId: 'branch-a', params: {}, body };

test('create scopes supplier and requests, persists atomically, ignores forged tenant and totals', async (t) => {
  const Quotation = require('../models/Quotation');
  const Supplier = require('../models/Supplier');
  const StockRequest = require('../models/StockRequest');
  const Branch = require('../models/Branch');
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(Quotation.sequelize, 'transaction', async (callback) => callback(transaction));
  t.mock.method(Supplier, 'findOne', async ({ where }) => { assert.equal(where.companyId, 'company-a'); return { id: supplierId, name: 'Supplier A' }; });
  t.mock.method(StockRequest, 'findAll', async ({ where, transaction: tx }) => { assert.equal(where.branchId, 'branch-a'); assert.equal(tx, transaction); return [request]; });
  t.mock.method(Branch, 'findOne', async ({ where, transaction: tx, lock }) => { assert.deepEqual(where, { id: 'branch-a', companyId: 'company-a' }); assert.equal(tx, transaction); assert.equal(lock, 'UPDATE'); return { id: 'branch-a' }; });
  t.mock.method(Quotation, 'findAll', async ({ where, attributes, transaction: tx, lock }) => { assert.deepEqual(where, { companyId: 'company-a', branchId: 'branch-a', quotationDate: '2026-10-15' }); assert.deepEqual(attributes, ['quotationNumber']); assert.equal(tx, transaction); assert.equal(lock, 'UPDATE'); return [{ quotationNumber: 'QT-20261015-002' }]; });
  t.mock.method(Quotation, 'create', async (values, { transaction: tx }) => { assert.equal(tx, transaction); assert.equal(values.companyId, 'company-a'); assert.equal(values.branchId, 'branch-a'); assert.equal(values.quotationNumber, 'QT-20261015-003'); assert.equal(values.totalCents, 3705); return { id: 'quote-a', ...values }; });
  const res = response();
  await handler('post', '/')({ ...auth, body: { ...body, quotationNumber: undefined, companyId: 'company-b', branchId: 'branch-b', totalCents: 1 } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.quotation.supplierName, 'Supplier A');
});

test('rejects suppliers and requests outside the active company and branch', async (t) => {
  const Quotation = require('../models/Quotation');
  const Supplier = require('../models/Supplier');
  const StockRequest = require('../models/StockRequest');
  const Branch = require('../models/Branch');
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(Quotation.sequelize, 'transaction', async (callback) => callback(transaction));
  const supplier = t.mock.method(Supplier, 'findOne', async () => null);
  t.mock.method(StockRequest, 'findAll', async () => []);
  t.mock.method(Branch, 'findOne', async () => ({ id: 'branch-a' }));
  t.mock.method(Quotation, 'findAll', async () => []);
  const create = t.mock.method(Quotation, 'create', async () => assert.fail('Must not write'));
  const save = handler('post', '/');
  const res = response();
  await save(auth, res, (error) => { throw error; });
  assert.equal(res.statusCode, 400);
  supplier.mock.mockImplementation(async () => ({ name: 'Supplier A' }));
  await save(auth, res, (error) => { throw error; });
  assert.equal(res.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test('list, edit and attachment lookup are scoped to company and branch', async (t) => {
  const Quotation = require('../models/Quotation');
  t.mock.method(Quotation, 'findAll', async ({ where, attributes }) => { assert.deepEqual(where, { companyId: 'company-a', branchId: 'branch-a' }); assert.ok(attributes.exclude.includes('attachmentData')); return []; });
  t.mock.method(Quotation, 'findOne', async ({ where }) => { assert.deepEqual(where, { id: 'foreign-quote', companyId: 'company-a', branchId: 'branch-a' }); return null; });
  t.mock.method(Quotation.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  const res = response();
  const next = (error) => { throw error; };
  await handler('get', '/')(auth, res, next);
  assert.deepEqual(res.body.quotations, []);
  const req = { ...auth, params: { id: 'foreign-quote' } };
  await handler('put', '/:id')(req, res, next);
  assert.equal(res.statusCode, 404);
  await handler('get', '/:id/attachment')(req, res, next);
  assert.equal(res.statusCode, 404);
});

test('deleting a quotation is scoped to the active company and branch', async (t) => {
  const Quotation = require('../models/Quotation');
  const quote = { destroy: t.mock.fn(async () => {}) };
  t.mock.method(Quotation, 'findOne', async ({ where }) => {
    assert.deepEqual(where, { id: 'quote-a', companyId: 'company-a', branchId: 'branch-a' });
    return quote;
  });
  const res = response();
  await handler('delete', '/:id')({ ...auth, params: { id: 'quote-a' } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(quote.destroy.mock.callCount(), 1);
});

test('middleware rejects absent or cross-company active branches', async (t) => {
  const Branch = require('../models/Branch');
  const router = require('../routes/quotations');
  const guard = router.stack[1].handle;
  t.mock.method(Branch, 'findOne', async ({ where }) => { assert.equal(where.companyId, 'company-a'); return null; });
  const res = response();
  await guard(auth, res, () => assert.fail('Must not proceed'));
  assert.equal(res.statusCode, 403);
  await guard({ ...auth, branchId: null }, res, () => assert.fail('Must not proceed'));
  assert.equal(res.statusCode, 403);
});

test('editing saves revised prices but retains original quantities and attachment when omitted', async (t) => {
  const Quotation = require('../models/Quotation');
  const Supplier = require('../models/Supplier');
  const StockRequest = require('../models/StockRequest');
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const existing = {
    id: 'quote-a', supplierId, supplierName: 'Supplier A', quotationNumber: 'QT-20261015-001', attachmentName: 'original.pdf',
    ...buildQuotationItems(validateQuotation(body).items, [request]),
    async update(values, options) {
      assert.equal(options.transaction, transaction);
      assert.equal(values.attachmentData, undefined);
      Object.assign(this, values);
      return this;
    },
  };
  t.mock.method(Quotation.sequelize, 'transaction', async (callback) => callback(transaction));
  t.mock.method(Quotation, 'findOne', async ({ lock }) => { assert.equal(lock, 'UPDATE'); return existing; });
  t.mock.method(Supplier, 'findOne', async () => null);
  t.mock.method(StockRequest, 'findAll', async () => []);
  const res = response();
  await handler('put', '/:id')({ ...auth, params: { id: 'quote-a' }, body: { ...body, items: [{ requestId, unitPrice: '15.50' }] } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.quotation.totalCents, 4650);
  assert.equal(res.body.quotation.attachmentName, 'original.pdf');
  assert.equal(res.body.quotation.items[0].quantity, 3);
  assert.equal(res.body.quotation.quotationNumber, 'QT-20261015-001');
});

test('attachment download is forced as binary with no-store', async (t) => {
  const Quotation = require('../models/Quotation');
  const bytes = Buffer.from('%PDF-1.4\n%%EOF');
  t.mock.method(Quotation, 'findOne', async () => ({ attachmentData: bytes.toString('base64'), attachmentName: 'supplier.pdf' }));
  const res = { headers: {}, set(key, value) { this.headers[key] = value; }, attachment(name) { this.filename = name; }, send(value) { this.bytes = value; } };
  await handler('get', '/:id/attachment')({ ...auth, params: { id: 'quote-a' } }, res, (error) => { throw error; });
  assert.deepEqual(res.bytes, bytes);
  assert.equal(res.filename, 'supplier.pdf');
  assert.equal(res.headers['Content-Type'], 'application/octet-stream');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});
