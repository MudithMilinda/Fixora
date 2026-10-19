const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('SupplierReturn', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false, unique: true },
  companyId: { type: DataTypes.UUID, allowNull: false }, branchId: { type: DataTypes.UUID, allowNull: false },
  orderId: { type: DataTypes.UUID, allowNull: false }, orderNumber: { type: DataTypes.STRING(100), allowNull: false },
  supplierId: { type: DataTypes.UUID, allowNull: false }, supplierName: { type: DataTypes.STRING(160), allowNull: false },
  itemRequestId: { type: DataTypes.STRING(100), allowNull: false }, itemId: { type: DataTypes.UUID, allowNull: true },
  itemName: { type: DataTypes.STRING(160), allowNull: false }, sku: { type: DataTypes.STRING(64), allowNull: true }, stockId: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, unitPriceCents: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, currency: { type: DataTypes.STRING(3), allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: false }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Pending' },
  resolvedAt: { type: DataTypes.DATE, allowNull: true }, createdBy: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'supplier_returns', underscored: true, indexes: [{ fields: ['company_id', 'branch_id', 'created_at'] }, { fields: ['order_id', 'item_request_id'] }] });
