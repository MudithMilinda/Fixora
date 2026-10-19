const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('WarrantyClaim', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false }, branchId: { type: DataTypes.UUID, allowNull: false },
  saleId: { type: DataTypes.UUID, allowNull: false }, lineIndex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  customerName: { type: DataTypes.STRING(120), allowNull: false }, customerPhone: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '' },
  itemName: { type: DataTypes.STRING(160), allowNull: false }, sku: { type: DataTypes.STRING(64), allowNull: true },
  number: { type: DataTypes.STRING(120), allowNull: true }, issue: { type: DataTypes.TEXT, allowNull: false },
  warrantyEnd: { type: DataTypes.DATEONLY, allowNull: false }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Received' },
  outcome: { type: DataTypes.STRING(20), allowNull: true }, resolutionNote: { type: DataTypes.TEXT, allowNull: true },
  repairId: { type: DataTypes.UUID, allowNull: true }, repairJobNumber: { type: DataTypes.STRING(32), allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'warranty_claims', underscored: true, indexes: [{ fields: ['company_id', 'branch_id', 'created_at'] }, { fields: ['sale_id'] }] });
