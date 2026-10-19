const bad = message => Object.assign(new Error(message), { status: 400 });
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
// Allocate the discounted total across individual units deterministically. This
// guarantees partial refunds add up to exactly the original paid amount.
function prepareReturn(sale, previousReturns, requested) {
  const lines = parse(sale.lines), subtotal = Number(sale.subtotalCents), total = Number(sale.totalCents);
  if (!Array.isArray(lines) || !Array.isArray(requested) || !requested.length || requested.length > lines.length || !Number.isSafeInteger(subtotal) || subtotal < 0 || !Number.isSafeInteger(total) || total < 0 || total > subtotal) throw bad('Invalid return details.');
  const already = new Map();
  for (const record of previousReturns) for (const line of parse(record.lines)) already.set(line.lineIndex, (already.get(line.lineIndex) || 0) + line.quantity);
  const offsets = []; let offset = 0;
  for (const line of lines) {
    const price = Math.round(Number(line.unitPrice) * 100), quantity = Number(line.quantity);
    if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(quantity) || quantity < 1) throw bad('The sale has invalid item details.');
    offsets.push(offset); offset += price * quantity;
  }
  if (offset !== subtotal) throw bad('The sale totals do not match its items.');
  const seen = new Set();
  const result = requested.map(entry => {
    const index = entry?.lineIndex, quantity = entry?.quantity, reason = typeof entry?.reason === 'string' ? entry.reason.trim() : '';
    if (!Number.isInteger(index) || index < 0 || index >= lines.length || seen.has(index) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > lines[index].quantity - (already.get(index) || 0) || !reason || reason.length > 500 || typeof entry.restock !== 'boolean') throw bad('Check the return quantities and reason.');
    seen.add(index);
    const line = lines[index], unit = Math.round(Number(line.unitPrice) * 100), start = offsets[index] + unit * (already.get(index) || 0), end = start + unit * quantity;
    const allocated = position => subtotal ? Number(BigInt(position) * BigInt(total) / BigInt(subtotal)) : 0;
    if (entry.restock && line.type !== 'stock') throw bad('Only stock sale items can be returned to stock.');
    return { lineIndex: index, name: line.name, sku: line.sku || null, quantity, reason, restock: entry.restock, refundCents: allocated(end) - allocated(start), unitCostCents: Number.isSafeInteger(line.unitCostCents) && line.unitCostCents >= 0 ? line.unitCostCents : null };
  });
  return result;
}
module.exports = { prepareReturn };
