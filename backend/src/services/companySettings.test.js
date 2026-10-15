const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCompanySettings, serializeCompanySettings } = require('./companySettings');

const valid = { name: ' Fixora ', website: 'https://example.com', email: 'info@example.com', phone: '+94 123456789', address: 'Main street', logo: null, reportBranding: true };

test('validates and trims editable fields without accepting company identity or privileges', () => {
  const result = validateCompanySettings({ ...valid, companyId: 'another-company', code: 'NEW', isActive: false });
  assert.equal(result.name, 'Fixora');
  assert.equal(result.logo, null);
  assert.equal('companyId' in result, false);
  assert.equal('code' in result, false);
  assert.equal('isActive' in result, false);
});

test('rejects invalid names, contact fields, URLs and branding settings', () => {
  for (const change of [{ name: ' ' }, { name: 'a'.repeat(161) }, { email: 'bad' }, { website: 'javascript:alert(1)' }, { website: 'https://name:password@example.com' }, { reportBranding: 'true' }, { address: 'a'.repeat(1001) }]) {
    assert.throws(() => validateCompanySettings({ ...valid, ...change }));
  }
});

test('allows a raster logo and rejects SVG, spoofed and oversized uploads', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=';
  assert.equal(validateCompanySettings({ ...valid, logo: png }).logo, png);
  for (const logo of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/png;base64,aGVsbG8=', 'data:image/png;base64,' + 'A'.repeat(1400000)]) {
    assert.throws(() => validateCompanySettings({ ...valid, logo }));
  }
});

test('companies with no saved settings receive editable defaults', () => {
  const result = serializeCompanySettings({ id: 'company-a', code: 'A', name: 'Company A' }, null);
  assert.equal(result.name, 'Company A');
  assert.equal(result.logo, null);
  assert.equal(result.reportBranding, true);
  assert.equal(result.email, '');
  assert.equal(serializeCompanySettings({ id: 'a' }, { reportBranding: false }).reportBranding, false);
});

test('save uses the authenticated company and writes both records in one transaction', async (t) => {
  const Company = require('../models/Company');
  const CompanySettings = require('../models/CompanySettings');
  const router = require('../routes/companySettings');
  const handler = router.stack.find((entry) => entry.route?.methods.put).route.stack[0].handle;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const company = { id: 'company-a', name: 'Old name', code: 'A', isActive: true, async update(values, options) { assert.equal(options.transaction, transaction); Object.assign(this, values); } };
  t.mock.method(Company.sequelize, 'transaction', async (callback) => callback(transaction));
  t.mock.method(Company, 'findByPk', async (id, options) => { assert.equal(id, 'company-a'); assert.equal(options.transaction, transaction); return company; });
  const upsert = t.mock.method(CompanySettings, 'upsert', async (values, options) => { assert.equal(values.companyId, 'company-a'); assert.equal(options.transaction, transaction); assert.equal(values.email, valid.email); });
  let response;
  const res = { json(value) { response = value; return this; }, status(code) { this.statusCode = code; return this; } };
  await handler({ user: { companyId: 'company-a', role: 'admin' }, body: { ...valid, id: 'company-b', companyId: 'company-b' } }, res, (error) => { throw error; });
  assert.equal(upsert.mock.callCount(), 1);
  assert.equal(response.company.id, 'company-a');
  assert.equal(response.company.name, 'Fixora');

  await handler({ user: { companyId: 'company-a', role: 'technician' }, body: valid }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 403);
  assert.equal(upsert.mock.callCount(), 1);
});
