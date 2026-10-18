const test = require('node:test');
const assert = require('node:assert/strict');
const Stock = require('../models/Stock');
const { receiveStock } = require('./receiveStock');

test('matching item, prices and currency increase the existing batch', async t => {
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const stock = { id: 'batch', quantity: 4, update: async (values, options) => { assert.equal(options.transaction, tx); stock.quantity = values.quantity; assert.equal(values.isArchived, false); } };
  t.mock.method(Stock, 'findOne', async options => { assert.deepEqual(options.where, { branchId: 'branch', itemId: 'item', costPrice: 100, sellingPrice: 150, costCurrency: 'LKR' }); assert.equal(options.lock, 'UPDATE'); return stock; });
  t.mock.method(Stock, 'create', async () => { throw new Error('should reuse stock'); });
  t.mock.method(Stock, 'update', async (values, options) => { assert.equal(values.isArchived, true); assert.equal(options.where.quantity, 0); assert.equal(options.where.branchId, 'branch'); assert.equal(options.where.itemId, 'item'); assert.equal(options.transaction, tx); });
  const result = await receiveStock({ branchId: 'branch', itemId: 'item', quantity: 3, costPrice: 100, sellingPrice: 150, costCurrency: 'LKR' }, tx);
  assert.equal(result, stock); assert.equal(result.quantity, 7);
});

test('different prices or currencies create a separate batch', async t => {
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const values = { id: 'new', branchId: 'branch', itemId: 'item', quantity: 2, costPrice: 110, sellingPrice: 150, costCurrency: 'USD' };
  t.mock.method(Stock, 'findOne', async options => { assert.equal(options.where.costPrice, 110); assert.equal(options.where.costCurrency, 'USD'); return null; });
  t.mock.method(Stock, 'create', async (data, options) => { assert.equal(data, values); assert.equal(options.transaction, tx); return data; });
  t.mock.method(Stock, 'update', async (data, options) => { assert.equal(data.isArchived, true); assert.equal(options.where.quantity, 0); assert.equal(options.transaction, tx); });
  assert.equal(await receiveStock(values, tx), values);
});

test('unidentified stock is never merged based on name alone', async t => {
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const values = { branchId: 'branch', itemId: null, sku: null, name: 'Display', quantity: 1 };
  t.mock.method(Stock, 'findOne', async () => { throw new Error('ambiguous identity'); });
  t.mock.method(Stock, 'create', async () => values);
  assert.equal(await receiveStock(values, tx), values);
});
