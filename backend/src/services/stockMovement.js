const StockMovement = require('../models/StockMovement');
async function recordMovement({ stock, req, kind, change, balanceAfter, referenceId = null, referenceLabel = null, adjustmentReason = null, adjustmentNote = null, transaction }) {
  return StockMovement.create({ companyId: req.user.companyId, branchId: req.branchId, stockId: stock.id, itemName: stock.name, sku: stock.sku, kind, quantityChange: change, balanceAfter, unitCost: stock.costPrice, costCurrency: stock.costCurrency, unitSellingPrice: stock.sellingPrice, referenceId, referenceLabel, adjustmentReason, adjustmentNote, createdBy: req.user.id, createdByName: req.user.fullName || null }, { transaction });
}
module.exports = { recordMovement };
