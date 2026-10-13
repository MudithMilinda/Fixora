const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const REPAIR_STATUSES = [
  "Received",
  "Diagnosis",
  "Awaiting approval",
  "In progress",
  "Waiting for parts",
  "Quality check",
  "Ready for collection",
  "Delivered",
  "Closed",
  "Cancelled",
];
const ASSET_TYPES = ["Mobile & tablet", "Laptop & computer", "Vehicle", "Appliance & electronics", "Machinery", "Other asset"];

const RepairJob = sequelize.define(
  "RepairJob",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    jobNumber: { type: DataTypes.STRING(32), allowNull: false, unique: true, field: "job_number" },
    customerName: { type: DataTypes.STRING(120), allowNull: false, field: "customer_name" },
    customerPhone: { type: DataTypes.STRING(32), allowNull: true, field: "customer_phone" },
    assetName: { type: DataTypes.STRING(160), allowNull: false, field: "asset_name" },
    assetType: { type: DataTypes.ENUM(...ASSET_TYPES), allowNull: false, defaultValue: "Other asset", field: "asset_type" },
    assetIdentifier: { type: DataTypes.STRING(160), allowNull: true, field: "asset_identifier" },
    issue: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM(...REPAIR_STATUSES), allowNull: false, defaultValue: "Received" },
    technician: { type: DataTypes.STRING(120), allowNull: true },
    promisedDate: { type: DataTypes.DATE, allowNull: true, field: "promised_date" },
    priority: { type: DataTypes.ENUM("Normal", "High", "Urgent"), allowNull: false, defaultValue: "Normal" },
    parts: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
  },
  { tableName: "repair_jobs", underscored: true },
);

module.exports = { RepairJob, REPAIR_STATUSES, ASSET_TYPES };
