const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  quotationId: { type: DataTypes.UUID, allowNull: false, unique: true },
  orderNumber: { type: DataTypes.STRING(100), allowNull: false },
  supplierId: { type: DataTypes.UUID, allowNull: false },
  supplierName: { type: DataTypes.STRING(160), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false },
  items: { type: DataTypes.JSON, allowNull: false, get() { const value = this.getDataValue('items'); return typeof value === 'string' ? JSON.parse(value) : value; } },
  totalCents: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  receivedAt: { type: DataTypes.DATE, allowNull: true, field: 'received_at' },
  status: { type: DataTypes.ENUM('Ordered', 'Received', 'Cancelled'), allowNull: false, defaultValue: 'Ordered' },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'purchase_orders', underscored: true, indexes: [{ unique: true, fields: ['company_id', 'branch_id', 'order_number'], name: 'purchase_order_reference' }] });
