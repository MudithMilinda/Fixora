function calculateLowStock(stocks, items, jobs) {
  const catalog = new Map(items.map(item => [item.id, item]));
  const groups = new Map();
  const stockItems = new Map();
  for (const stock of stocks) {
    const item = catalog.get(stock.itemId);
    if (!item) continue;
    stockItems.set(stock.id, item.id);
    if (!groups.has(item.id)) groups.set(item.id, { id: stock.id, itemId: item.id, name: item.name, sku: item.sku, minimumStock: Number(item.minimumStock), currentStock: 0, monthlyUsage: 0 });
    groups.get(item.id).currentStock += Number(stock.quantity);
  }
  for (const job of jobs) for (const part of Array.isArray(job.parts) ? job.parts : []) {
    const itemId = stockItems.get(part?.stockId);
    if (itemId) groups.get(itemId).monthlyUsage += Number(part.quantity) || 0;
  }
  return [...groups.values()].filter(item => item.currentStock <= item.minimumStock).map(item => ({ ...item, suggestedOrderQty: Math.max(1, item.monthlyUsage, item.minimumStock - item.currentStock + 1) })).sort((a, b) => a.currentStock - b.currentStock || a.name.localeCompare(b.name));
}
module.exports = { calculateLowStock };
