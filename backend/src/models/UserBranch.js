const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('UserBranch',{id:{type:DataTypes.UUID,defaultValue:DataTypes.UUIDV4,primaryKey:true},userId:{type:DataTypes.UUID,allowNull:false,field:'user_id'},branchId:{type:DataTypes.UUID,allowNull:false,field:'branch_id'}},{tableName:'user_branches',underscored:true,indexes:[{unique:true,fields:['user_id','branch_id']}]});
