const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "full_name",
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },
    role: {
      type: DataTypes.ENUM("admin", "super_admin"),
      allowNull: false,
      defaultValue: "admin",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    sessionVersion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "session_version",
    },
  },
  {
    tableName: "users",
    underscored: true,
  },
);

module.exports = User;
