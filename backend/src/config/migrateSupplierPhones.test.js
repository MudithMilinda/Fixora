const test = require('node:test');
const assert = require('node:assert/strict');
const { DataTypes } = require('sequelize');
const { migrateSupplierPhones } = require('./migrateSupplierPhones');

function fixture(columns, addError) {
  const calls = [];
  const queryInterface = {
    async describeTable(table) { assert.equal(table, 'suppliers'); return columns; },
    async addColumn(...args) { calls.push(['add', ...args]); if (addError) throw addError; },
  };
  return {
    calls,
    sequelize: {
      getQueryInterface() { return queryInterface; },
      async query(sql) { calls.push(['query', sql]); },
    },
  };
}

test('adds the JSON field before copying legacy phone numbers without dropping data', async () => {
  const { sequelize, calls } = fixture({ phone: {} });
  await migrateSupplierPhones(sequelize);
  assert.deepEqual(calls[0], ['add', 'suppliers', 'phones', { type: DataTypes.JSON, allowNull: true }]);
  assert.match(calls[1][1], /JSON_ARRAY\(TRIM\(phone\)\)/);
  assert.match(calls[1][1], /phone IS NULL OR TRIM\(phone\) = '' THEN JSON_ARRAY\(\)/);
  assert.doesNotMatch(calls[1][1], /DROP|DELETE/i);
});

test('reruns backfill only for NULL lists, preserving existing and deliberately cleared lists', async () => {
  const { sequelize, calls } = fixture({ phone: {}, phones: {} });
  await migrateSupplierPhones(sequelize);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'query');
  assert.match(calls[0][1], /WHERE phones IS NULL\s*$/);
});

test('new databases with phones and no legacy phone need no changes', async () => {
  const { sequelize, calls } = fixture({ phones: {} });
  await migrateSupplierPhones(sequelize);
  assert.deepEqual(calls, []);
});

test('adds phones even when no legacy phone column exists', async () => {
  const { sequelize, calls } = fixture({});
  await migrateSupplierPhones(sequelize);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'add');
});

test('handles another startup adding the column, then completes backfill', async () => {
  const { sequelize, calls } = fixture({ phone: {} }, { original: { code: 'ER_DUP_FIELDNAME' } });
  await migrateSupplierPhones(sequelize);
  assert.equal(calls[1][0], 'query');
});

test('does not swallow database errors or continue to backfill after failure', async () => {
  const error = new Error('Access denied');
  const { sequelize, calls } = fixture({ phone: {} }, error);
  await assert.rejects(migrateSupplierPhones(sequelize), error);
  assert.equal(calls.length, 1);
});
