const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLowStock } = require('./lowStock');

test('low stock uses the branch total across price batches and each item minimum', () => {
  const items = [{ id: 'a', name: 'Screen', sku: 'A', minimumStock: 5 }, { id: 'b', name: 'Cable', sku: 'B', minimumStock: 2 }];
  const stocks = [{ id: 'a1', itemId: 'a', quantity: 2 }, { id: 'a2', itemId: 'a', quantity: 4 }, { id: 'b1', itemId: 'b', quantity: 2 }];
  const alerts = calculateLowStock(stocks, items, []);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].itemId, 'b'); assert.equal(alerts[0].currentStock, 2); assert.equal(alerts[0].suggestedOrderQty, 1);
});

test('out-of-stock items and repair usage are included in the suggested order', () => {
  const alerts = calculateLowStock([{ id: 's', itemId: 'a', quantity: 0 }], [{ id: 'a', name: 'Part', sku: null, minimumStock: 4 }], [{ parts: [{ stockId: 's', quantity: 7 }] }]);
  assert.equal(alerts[0].currentStock, 0); assert.equal(alerts[0].monthlyUsage, 7); assert.equal(alerts[0].suggestedOrderQty, 7);
});
