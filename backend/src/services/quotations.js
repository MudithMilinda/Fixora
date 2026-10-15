const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'];
const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function text(value, max, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail('Enter valid quotation details.');
  return value.trim() || null;
}

function date(value, optional = false) {
  if (!value && optional) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Enter a valid date.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() < 1000 || parsed.toISOString().slice(0, 10) !== value) fail('Enter a valid date.');
  return value;
}

function priceCents(value) {
  if (!['string', 'number'].includes(typeof value) || !/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) fail('Unit prices must be non-negative amounts with up to 2 decimal places.');
  const [whole, fraction = ''] = String(value).split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function validateAttachment(value) {
  if (value === undefined) return {};
  if (value === null) return { attachmentName: null, attachmentType: null, attachmentData: null };
  const name = text(value.name, 180, true)?.replace(/[\r\n/\\\x00-\x1f]/g, '_');
  const match = typeof value.data === 'string' && value.data.match(/^data:(application\/pdf|image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > 2800000) fail('Attach a PDF, PNG, JPG or WEBP file up to 2 MB.');
  const bytes = Buffer.from(match[2], 'base64');
  const type = match[1];
  const valid = type === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : type === 'image/png' ? bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
    : type === 'image/jpeg' ? bytes.subarray(0, 3).toString('hex') === 'ffd8ff'
    : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid || bytes.length > 2 * 1024 * 1024) fail('Invalid or oversized quotation attachment.');
  return { attachmentName: name, attachmentType: type, attachmentData: bytes.toString('base64') };
}

function validateQuotation(body) {
  if (!body || !uuid(body.supplierId)) fail('Select a supplier.');
  if (!CURRENCIES.includes(body.currency)) fail('Select a supported currency.');
  const quotationDate = date(body.quotationDate);
  const validUntil = date(body.validUntil, true);
  if (validUntil && validUntil < quotationDate) fail('Valid until cannot be before the quotation date.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) fail('Select between 1 and 100 purchase request items.');
  const ids = new Set();
  const items = body.items.map((item) => {
    if (!item || !uuid(item.requestId) || ids.has(item.requestId)) fail('Select each purchase request only once.');
    ids.add(item.requestId);
    return { requestId: item.requestId, unitPriceCents: priceCents(item.unitPrice) };
  });
  return {
    supplierId: body.supplierId,
    // New quotations receive their number on the server. A legacy number is
    // accepted only so existing records can still be read during upgrades.
    quotationNumber: body.quotationNumber === undefined ? null : text(body.quotationNumber, 100, true),
    quotationDate, validUntil, currency: body.currency, notes: text(body.notes, 2000),
    items, ...validateAttachment(body.attachment),
  };
}

function quotationNumberPrefix(quotationDate) {
  return `QT-${quotationDate.replaceAll('-', '')}-`;
}

function nextQuotationNumber(quotationDate, quotationNumbers) {
  const prefix = quotationNumberPrefix(quotationDate);
  const next = quotationNumbers.reduce((highest, value) => {
    const match = typeof value === 'string' && value.match(new RegExp(`^${prefix}(\\d{3,})$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  if (next > 999999) fail('Too many quotations were created for this date.');
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function buildQuotationItems(entries, requests, previousItems = []) {
  const current = new Map(requests.map((request) => [request.id, request]));
  const previous = new Map(previousItems.map((item) => [item.requestId, item]));
  let totalCents = 0;
  const items = entries.map((entry) => {
    // Editing keeps the quantities originally quoted, not later request edits.
    const request = previous.get(entry.requestId) || current.get(entry.requestId);
    if (!request) fail('A selected purchase request is no longer available in this branch. Reload and try again.');
    const quantity = Number(request.quantity);
    const lineTotalCents = quantity * entry.unitPriceCents;
    totalCents += lineTotalCents;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(totalCents) || totalCents > 99999999999999) fail('The quotation total or quantity is too large.');
    return { requestId: entry.requestId, itemId: request.itemId, itemName: request.itemName, sku: request.sku, quantity, unitPriceCents: entry.unitPriceCents, lineTotalCents };
  });
  return { items, totalCents };
}

function serializeQuotation(quote) {
  return {
    id: quote.id, supplierId: quote.supplierId, supplierName: quote.supplierName,
    quotationNumber: quote.quotationNumber, quotationDate: quote.quotationDate,
    validUntil: quote.validUntil, currency: quote.currency, items: quote.items,
    totalCents: Number(quote.totalCents), notes: quote.notes,
    attachmentName: quote.attachmentName, createdAt: quote.createdAt,
  };
}

module.exports = { validateQuotation, buildQuotationItems, serializeQuotation, nextQuotationNumber };
