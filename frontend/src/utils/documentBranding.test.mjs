import test from 'node:test';
import assert from 'node:assert/strict';
import { companyDocumentHeader } from './documentBranding.ts';

const company = {
  name: 'Example Company', address: '12 Main Road\nColombo', phone: '+94 11 123 4567',
  logo: 'data:image/png;base64,iVBORw0KGgo=', reportBranding: true,
};

test('enabled branding includes all four company fields', () => {
  const html = companyDocumentHeader(company);
  for (const value of [company.name, company.address, company.phone, company.logo]) assert.ok(html.includes(value));
});

test('disabled branding produces no company header or contact information', () => {
  assert.equal(companyDocumentHeader({ ...company, reportBranding: false }), '');
});

test('missing optional fields do not produce broken images or empty phone labels', () => {
  const html = companyDocumentHeader({ ...company, logo: null, address: '', phone: '' });
  assert.ok(html.includes(company.name));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('Telephone:'));
});

test('company text is escaped for printable HTML', () => {
  const html = companyDocumentHeader({ ...company, name: '<script>alert(1)</script>', address: 'A & B', phone: '"><img onerror="alert(1)">' });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img onerror='));
  assert.ok(html.includes('A &amp; B'));
});

test('rejects non-raster or injected image sources', () => {
  for (const logo of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AA==" onerror="alert(1)']) {
    assert.ok(!companyDocumentHeader({ ...company, logo }).includes('<img'));
  }
});
