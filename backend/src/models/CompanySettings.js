const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('CompanySettings', {
  companyId: { type: DataTypes.UUID, primaryKey: true, field: 'company_id' },
  website: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
  email: { type: DataTypes.STRING(254), allowNull: false, defaultValue: '' },
  phone: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
  address: { type: DataTypes.STRING(1000), allowNull: false, defaultValue: '' },
  logo: { type: DataTypes.TEXT('medium'), allowNull: true },
  reportBranding: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'report_branding' },
}, { tableName: 'company_settings', underscored: true });
