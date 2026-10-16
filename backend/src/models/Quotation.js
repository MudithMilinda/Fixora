const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Quotation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  supplierId: { type: DataTypes.UUID, allowNull: false },
  supplierName: { type: DataTypes.STRING(160), allowNull: false },
  quotationNumber: { type: DataTypes.STRING(100), allowNull: false },
  quotationDate: { type: DataTypes.DATEONLY, allowNull: false },
  validUntil: { type: DataTypes.DATEONLY, allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'LKR' },
  // Preserve the quoted items even if the original request or supplier changes.
  items: {
    type: DataTypes.JSON, allowNull: false,
    get() {
      const value = this.getDataValue('items');
      // Some MySQL-compatible servers return JSON columns as text.
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
  },
  totalCents: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  attachmentName: { type: DataTypes.STRING(180), allowNull: true },
  attachmentType: { type: DataTypes.STRING(40), allowNull: true },
  attachmentData: { type: DataTypes.TEXT('medium'), allowNull: true },
  status: { type: DataTypes.ENUM('Pending', 'Approved'), allowNull: false, defaultValue: 'Pending' },
  approvedBy: { type: DataTypes.UUID, allowNull: true },
  approvedAt: { type: DataTypes.DATE, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'quotations', underscored: true,
  indexes: [{ unique: true, fields: ['company_id', 'branch_id', 'supplier_id', 'quotation_number'], name: 'quotation_supplier_reference' }],
});
