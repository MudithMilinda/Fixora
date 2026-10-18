const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Sale', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'request_id' },
  companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  branchId: { type: DataTypes.UUID, allowNull: false, field: 'branch_id' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  repairId: { type: DataTypes.UUID, allowNull: true, unique: true, field: 'repair_id' },
  customerName: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '', field: 'customer_name' },
  customerPhone: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '', field: 'customer_phone' },
  subtotalCents: { type: DataTypes.BIGINT, allowNull: false, field: 'subtotal_cents' },
  discountCents: { type: DataTypes.BIGINT, allowNull: false, field: 'discount_cents' },
  totalCents: { type: DataTypes.BIGINT, allowNull: false, field: 'total_cents' },
  lines: { type: DataTypes.JSON, allowNull: false },
  payments: { type: DataTypes.JSON, allowNull: false },
  repair: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'sales', underscored: true });
