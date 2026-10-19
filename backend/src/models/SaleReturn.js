const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('SaleReturn', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'request_id' },
  companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  branchId: { type: DataTypes.UUID, allowNull: false, field: 'branch_id' },
  saleId: { type: DataTypes.UUID, allowNull: false, field: 'sale_id' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  customerName: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '', field: 'customer_name' },
  refundCents: { type: DataTypes.BIGINT, allowNull: false, field: 'refund_cents' },
  lines: { type: DataTypes.JSON, allowNull: false },
}, { tableName: 'sale_returns', underscored: true, indexes: [{ fields: ['company_id', 'branch_id', 'created_at'] }, { fields: ['sale_id'] }] });
