function calculateReport(sales, orders, stocks) {
  let revenueCents = 0, knownCostCents = 0, unknownCostLines = 0;
  for (const sale of sales) {
    revenueCents += Number(sale.totalCents);
    const lines = typeof sale.lines === 'string' ? JSON.parse(sale.lines) : sale.lines;
    for (const line of lines) {
      if (!Number.isSafeInteger(line.unitCostCents) || line.unitCostCents < 0 || !Number.isSafeInteger(line.quantity) || line.quantity < 1) unknownCostLines++;
      else knownCostCents += line.unitCostCents * line.quantity;
    }
  }
  const stockValueCents = stocks.filter(stock => stock.costCurrency === 'LKR').reduce((sum, stock) => sum + Math.round(Number(stock.costPrice) * 100) * Number(stock.quantity), 0);
  const unknownStockBatches = stocks.filter(stock => stock.costCurrency !== 'LKR' && Number(stock.quantity) > 0).length;
  const purchaseCents = orders.filter(order => order.currency === 'LKR').reduce((sum, order) => sum + Number(order.totalCents), 0);
  return { revenueCents, knownCostCents, grossProfitCents: unknownCostLines ? null : revenueCents - knownCostCents, unknownCostLines, saleCount: sales.length, purchaseCents, purchaseCount: orders.filter(order => order.currency === 'LKR').length, excludedCurrencyOrders: orders.filter(order => order.currency !== 'LKR').length, stockValueCents, unknownStockBatches };
}
module.exports = { calculateReport };
