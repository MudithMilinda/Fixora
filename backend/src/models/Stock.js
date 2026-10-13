const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Stock', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  itemId: { type: DataTypes.UUID, allowNull: true, field: 'item_id' },
  name: { type: DataTypes.STRING(160), allowNull: false },
  sku: { type: DataTypes.STRING(64), allowNull: true },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'cost_price' },
  sellingPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'selling_price' },
}, { tableName: 'stocks', underscored: true });
