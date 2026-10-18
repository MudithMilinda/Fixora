const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const { pagination } = require('./pagination');
const reply = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } });
test('pagination is optional and rejects invalid page values', () => {
  assert.equal(pagination({}), null); assert.deepEqual(pagination({ page: '2' }), { page: 2, pageSize: 10, limit: 10, offset: 10 });
  assert.throws(() => pagination({ page: '0' }), /valid page/);
});
test('catalog search and pagination apply before results are returned', async t => {
  const Item = require('../models/Item');
  const handler = require('../routes/items').stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
  t.mock.method(Item, 'findAndCountAll', async options => { assert.equal(options.offset, 10); assert.equal(options.limit, 10); assert.equal(options.where[Op.or][0].name[Op.like], '%screen%'); return { count: 12, rows: [] }; });
  const res = reply(); await handler({ query: { page: '2', search: 'screen' } }, res, e => { throw e }); assert.equal(res.body.total, 12); assert.equal(res.body.page, 2);
});
test('purchase order pagination keeps branch scope and searches before paging', async t => {
  const PurchaseOrder = require('../models/PurchaseOrder');
  const handler = require('../routes/purchaseOrders').router.stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
  t.mock.method(PurchaseOrder, 'findAndCountAll', async options => { assert.equal(options.where.companyId, 'company'); assert.equal(options.where.branchId, 'branch'); assert.equal(options.where[Op.or][0].orderNumber[Op.like], '%PO%'); assert.equal(options.offset, 10); return { count: 11, rows: [] }; });
  const res = reply(); await handler({ user: { companyId: 'company' }, branchId: 'branch', query: { page: '2', search: 'PO' } }, res, e => { throw e }); assert.equal(res.body.total, 11);
});
test('repair history applies promised-date filters to the branch query', async t => {
  const { RepairJob } = require('../models/RepairJob');
  const handler = require('../routes/repairs').stack.find(l => l.route?.path === '/history').route.stack[0].handle;
  t.mock.method(RepairJob, 'findAndCountAll', async options => { assert.equal(options.where.branchId, 'branch'); assert.equal(options.where.promisedDate[Op.gte].toISOString(), '2026-01-01T00:00:00.000Z'); assert.equal(options.where.promisedDate[Op.lt].toISOString(), '2026-02-01T00:00:00.000Z'); return { count: 0, rows: [] }; });
  const res = reply(); await handler({ branchId: 'branch', query: { page: '1', from: '2026-01-01', to: '2026-01-31' } }, res, e => { throw e }); assert.equal(res.body.total, 0);
});
test('stock list paginates within the branch with stock status filter', async t => {
  const Stock = require('../models/Stock');
  const handler = require('../routes/stocks').stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
  t.mock.method(Stock, 'findAndCountAll', async options => { assert.equal(options.where.branchId, 'branch'); assert.equal(options.where.isArchived, false); assert.equal(options.offset, 10); assert.ok(options.where[Op.and]); return { count: 12, rows: [] }; });
  const res = reply(); await handler({ branchId:'branch', query:{ page:'2', search:'screen', status:'low-stock' } }, res, e => { throw e }); assert.equal(res.body.total, 12);
});
test('movement pagination applies scope and filters before grouping items', async t => {
  const StockMovement = require('../models/StockMovement');
  const handler = require('../routes/stockMovements').stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
  t.mock.method(StockMovement.sequelize, 'query', async (sql, { replacements }) => { assert.equal(replacements.company, 'company'); assert.equal(replacements.branch, 'branch'); assert.equal(replacements.kind, 'sale'); assert.equal(replacements.offset, 10); return sql.includes('ROW_NUMBER') ? [{ id:'movement', movement_count:3 }] : [{ total:11 }]; });
  t.mock.method(StockMovement, 'findAll', async ({ where }) => { assert.equal(where.branchId, 'branch'); assert.deepEqual(where.id, ['movement']); return [{ id:'movement' }]; });
  const res=reply(); await handler({ user:{companyId:'company'}, branchId:'branch', query:{page:'2',kind:'sale'} },res,e=>{throw e}); assert.equal(res.body.total,11); assert.equal(res.body.groups[0].count,3);
});
for (const [routeName, modelName, responseKey] of [['suppliers', 'Supplier', 'suppliers'], ['technicians', 'Technician', 'technicians']]) {
  test(`${routeName} list searches and paginates within the company`, async t => {
    const Model = require(`../models/${modelName}`);
    const handler = require(`../routes/${routeName}`).stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
    t.mock.method(Model, 'findAndCountAll', async options => { assert.equal(options.where.companyId, 'company'); assert.equal(options.where[Op.or][0].name[Op.like], '%test%'); assert.equal(options.limit, 10); assert.equal(options.offset, 10); return { count: 12, rows: [] }; });
    const res = reply(); await handler({ user: { companyId: 'company' }, query: { page: '2', search: 'test' } }, res, e => { throw e });
    assert.deepEqual(res.body[responseKey], []); assert.equal(res.body.total, 12);
  });
  test(`${routeName} remains available without pagination for selection forms`, async t => {
    const Model = require(`../models/${modelName}`);
    const handler = require(`../routes/${routeName}`).stack.find(l => l.route?.path === '/' && l.route.methods.get).route.stack[0].handle;
    t.mock.method(Model, 'findAll', async options => { assert.equal(options.where.companyId, 'company'); assert.equal(options.limit, undefined); return []; });
    const res = reply(); await handler({ user: { companyId: 'company' }, query: {} }, res, e => { throw e }); assert.deepEqual(res.body[responseKey], []);
  });
}
