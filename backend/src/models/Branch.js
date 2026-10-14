const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Branch',{id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},companyId:{type:DataTypes.UUID,allowNull:false,field:'company_id'},name:{type:DataTypes.STRING(160),allowNull:false},code:{type:DataTypes.STRING(32),allowNull:false},isActive:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:true,field:'is_active'}},{tableName:'branches',underscored:true,indexes:[{unique:true,fields:['company_id','code']}]});
