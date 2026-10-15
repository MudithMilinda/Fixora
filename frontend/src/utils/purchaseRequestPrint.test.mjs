import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseRequestPrintHtml } from './purchaseRequestPrint.ts';

const company = { name: 'Sample Company', address: '12 Main Road\nColombo', phone: '+94 11 1234567', logo: 'data:image/png;base64,iVBORw0KGgo=', reportBranding: true };
const requests = [
  { itemName: 'Display', sku: 'DP-01', quantity: 12, note: 'Replacement parts', createdAt: '2026-10-14T08:00:00Z' },
  { itemName: 'Battery', sku: null, quantity: 8, note: null, createdAt: '2026-10-14T08:00:00Z' },
];
const render = (overrides = {}) => purchaseRequestPrintHtml({ company, requests, preparedBy: 'Administrator', date: new Date(2026, 9, 14, 12), ...overrides });

test('prints A4 with company details, real quantities and reference-style totals', () => {
  const html = render();
  for (const text of ['A4 portrait', 'REQUEST FOR QUOTATION', company.logo, company.name, company.address, company.phone, 'PR-20261014', '14/10/2026', '<td>2</td>', '<td>20</td>']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('TOTAL DUE'));
  assert.ok(!html.includes('<th>Status</th>'));
});

test('groups logo beside company details and places quotation title immediately above its note', () => {
  const html = render();
  const header = html.match(/<header class="company-header">[\s\S]*?<\/header>/)[0];
  assert.match(header, /class="company-logo"[\s\S]*class="company-contact"[\s\S]*class="company-name"[\s\S]*class="company-address"[\s\S]*class="company-phone"/);
  assert.match(html, /<h1>REQUEST FOR QUOTATION<\/h1>\s*<p class="quotation-note">Please provide your quotation/);
  assert.ok(html.indexOf(header) < html.indexOf('<h1>'));
  assert.equal((header.match(/Sample Company<\/div>/g) || []).length, 1);
});

test('company details remain visible without a logo', () => {
  const html = render({ company: { ...company, logo: null } });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes(`<div class="company-name">${company.name}</div>`));
  assert.ok(html.includes(company.address));
  assert.ok(html.includes(company.phone));
});

test('supplier item table contains only row number, item name and quantity', () => {
  const html = render();
  const table = html.match(/<table class="items"[\s\S]*?<\/table>/)[0];
  assert.equal((table.match(/<th scope="col"/g) || []).length, 3);
  assert.ok(table.includes('>No.</th>'));
  assert.ok(table.includes('>Item name</th>'));
  assert.ok(table.includes('>Quantity</th>'));
  assert.ok(table.includes('<td class="row-number">1</td>'));
  assert.ok(table.includes('<td class="row-number">2</td>'));
  assert.ok(!table.includes('DP-01'));
  assert.ok(!table.includes('Replacement parts'));
  assert.ok(!table.includes('14/10/2026'));
});

test('disabled branding omits all company fields', () => {
  const html = render({ company: { ...company, reportBranding: false } });
  for (const value of [company.name, company.logo, company.phone, company.address]) assert.ok(!html.includes(value));
});

test('escapes company, user and request values', () => {
  const html = render({ preparedBy: '<script>alert(1)</script>', company: { ...company, name: 'A & B', logo: 'javascript:alert(1)' }, requests: [{ ...requests[0], itemName: '<img onerror="alert(1)">', note: 'A & B' }] });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('<img onerror='));
  assert.ok(html.includes('A &amp; B'));
});

test('long request lists retain every line and repeat table headings when printed', () => {
  const html = render({ requests: Array.from({ length: 100 }, (_, index) => ({ ...requests[0], itemName: `Part ${index}` })) });
  assert.equal((html.match(/class="item-name"/g) || []).length, 100);
  assert.ok(html.includes('table-header-group'));
  assert.ok(html.includes('<td>1200</td>'));
});
