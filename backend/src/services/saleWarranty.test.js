const test = require('node:test');
const assert = require('node:assert/strict');
const { saleWarranty } = require('./saleWarranty');

test('sale warranties preserve period, Colombo dates and unit numbers', () => {
  const result = saleWarranty({ count: 1, unit: 'months', numbers: [' A-123 ', 'B-456'] }, 2, new Date('2026-01-30T20:00:00Z'));
  assert.deepEqual(result, { count: 1, unit: 'months', start: '2026-01-31', end: '2026-02-27', numbers: ['A-123', 'B-456'] });
});

test('no warranty and legacy sales are distinct', () => {
  assert.equal(saleWarranty(undefined, 1), undefined);
  assert.deepEqual(saleWarranty({ count: 0, unit: 'days', numbers: [] }, 1), { count: 0, unit: 'days', start: null, end: null, numbers: [] });
});

test('invalid periods and excess or invalid numbers are rejected', () => {
  for (const input of [
    { count: -1, unit: 'days', numbers: [] },
    { count: 1, unit: 'weeks', numbers: [] },
    { count: 1, unit: 'days', numbers: ['a', 'b'] },
    { count: 1, unit: 'days', numbers: [' '.repeat(3)] },
    { count: 1, unit: 'days', numbers: ['a'.repeat(121)] },
  ]) assert.throws(() => saleWarranty(input, 1), error => error.status === 400);
});
