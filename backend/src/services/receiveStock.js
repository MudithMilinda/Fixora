const Branch = require('../models/Branch');
const Stock = require('../models/Stock');
const { Op } = require('sequelize');

// Serialize receipts within a branch so two simultaneous deliveries cannot
// create duplicate rows when no matching row exists yet.
async function lockStockBranch(req, transaction) {
  await Branch.findOne({ where: { id: req.branchId, companyId: req.user.companyId }, transaction, lock: transaction.LOCK.UPDATE });
}

async function receiveStock(values, transaction) {
  const identity = values.itemId ? { itemId: values.itemId } : values.sku ? { itemId: null, sku: values.sku } : null;
  const stock = identity && await Stock.findOne({
    where: { branchId: values.branchId, ...identity, costPrice: values.costPrice, costCurrency: values.costCurrency, sellingPrice: values.sellingPrice },
    order: [['createdAt', 'ASC'], ['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE,
  });
  let received = stock;
  if (!received) received = await Stock.create(values, { transaction });
  else {
    const quantity = Number(received.quantity) + Number(values.quantity);
    if (quantity > 4294967295) { const error = new Error('Stock quantity is too large.'); error.status = 400; throw error; }
    await received.update({ quantity, ...(quantity > 0 ? { isArchived: false } : {}) }, { transaction });
  }
  if (identity && Number(values.quantity) > 0) {
    await Stock.update({ isArchived: true }, { where: { branchId: values.branchId, ...identity, id: { [Op.ne]: received.id }, quantity: 0, isArchived: false }, transaction });
  }
  return received;
}
module.exports = { lockStockBranch, receiveStock };
