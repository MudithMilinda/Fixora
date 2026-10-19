function calculateReport(sales, orders, stocks, returns = []) {
  let revenueCents = 0, knownCostCents = 0, unknownCostLines = 0;
  for (const sale of sales) {
    revenueCents += Number(sale.totalCents);
    const lines = typeof sale.lines === 'string' ? JSON.parse(sale.lines) : sale.lines;
    for (const line of lines) {
      if (!Number.isSafeInteger(line.unitCostCents) || line.unitCostCents < 0 || !Number.isSafeInteger(line.quantity) || line.quantity < 1) unknownCostLines++;
      else knownCostCents += line.unitCostCents * line.quantity;
    }
  }
  let refundCents = 0, returnCostCents = 0;
  for (const record of returns) {
    refundCents += Number(record.refundCents);
    const lines = typeof record.lines === 'string' ? JSON.parse(record.lines) : record.lines;
    for (const line of lines) if (line.restock) {
      if (!Number.isSafeInteger(line.unitCostCents) || line.unitCostCents < 0) unknownCostLines++;
      else returnCostCents += line.unitCostCents * line.quantity;
    }
  }
  revenueCents -= refundCents;
  knownCostCents -= returnCostCents;
  const stockValueCents = stocks.filter(stock => stock.costCurrency === 'LKR').reduce((sum, stock) => sum + Math.round(Number(stock.costPrice) * 100) * Number(stock.quantity), 0);
  const unknownStockBatches = stocks.filter(stock => stock.costCurrency !== 'LKR' && Number(stock.quantity) > 0).length;
  const purchaseCents = orders.filter(order => order.currency === 'LKR').reduce((sum, order) => sum + Number(order.totalCents), 0);
  return { refundCents, returnCostCents, returnCount: returns.length, revenueCents, knownCostCents, grossProfitCents: unknownCostLines ? null : revenueCents - knownCostCents, unknownCostLines, saleCount: sales.length, purchaseCents, purchaseCount: orders.filter(order => order.currency === 'LKR').length, excludedCurrencyOrders: orders.filter(order => order.currency !== 'LKR').length, stockValueCents, unknownStockBatches };
}
module.exports = { calculateReport };
