const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('StockMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  branchId: { type: DataTypes.UUID, allowNull: false, field: 'branch_id' },
  stockId: { type: DataTypes.UUID, allowNull: false, field: 'stock_id' },
  itemName: { type: DataTypes.STRING(160), allowNull: false, field: 'item_name' },
  sku: { type: DataTypes.STRING(64), allowNull: true },
  kind: { type: DataTypes.ENUM('manual_add', 'purchase', 'sale', 'repair', 'delete'), allowNull: false },
  quantityChange: { type: DataTypes.INTEGER, allowNull: false, field: 'quantity_change' },
  balanceAfter: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'balance_after' },
  unitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'unit_cost' },
  costCurrency: { type: DataTypes.STRING(3), allowNull: true, field: 'cost_currency' },
  unitSellingPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'unit_selling_price' },
  referenceId: { type: DataTypes.UUID, allowNull: true, field: 'reference_id' },
  referenceLabel: { type: DataTypes.STRING(100), allowNull: true, field: 'reference_label' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
}, { tableName: 'stock_movements', underscored: true, updatedAt: false, indexes: [{ fields: ['company_id', 'branch_id', 'created_at'] }, { fields: ['branch_id', 'stock_id'] }] });
