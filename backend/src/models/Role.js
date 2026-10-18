const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Role', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
  name: { type: DataTypes.STRING(120), allowNull: false },
}, { tableName: 'roles', underscored: true, indexes: [{ unique: true, fields: ['company_id', 'name'] }] });
