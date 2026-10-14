const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Supplier', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  name: { type: DataTypes.STRING(160), allowNull: false },
  phones: { type: DataTypes.JSON, allowNull: true },
  email: { type: DataTypes.STRING(254), allowNull: true, validate: { isEmail: true } },
  address: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
}, { tableName: 'suppliers', underscored: true, indexes: [{ unique: true, fields: ['company_id', 'name'] }] });
