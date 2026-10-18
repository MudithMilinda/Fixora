const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Stock', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  itemId: { type: DataTypes.UUID, allowNull: true, field: 'item_id' },
  branchId: { type: DataTypes.UUID, allowNull: true, field: 'branch_id' },
  name: { type: DataTypes.STRING(160), allowNull: false },
  sku: { type: DataTypes.STRING(64), allowNull: true },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_archived' },
  costCurrency: { type: DataTypes.STRING(3), allowNull: true, field: 'cost_currency' },
  costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'cost_price' },
  sellingPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'selling_price' },
}, { tableName: 'stocks', underscored: true });
