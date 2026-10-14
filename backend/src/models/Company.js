const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Company',{id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},name:{type:DataTypes.STRING(160),allowNull:false},code:{type:DataTypes.STRING(32),allowNull:false,unique:true},isActive:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:true,field:'is_active'}},{tableName:'companies',underscored:true});
