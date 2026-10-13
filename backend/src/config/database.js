const { Sequelize } = require("sequelize");
const mysql = require("mysql2/promise");
const { escapeId } = require("mysql2");

const databaseName = process.env.DB_NAME || "fixora";
const host = process.env.DB_HOST || "127.0.0.1";
const port = Number(process.env.DB_PORT) || 3306;
const username = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";

const sequelize = new Sequelize(databaseName, username, password, {
  host,
  port,
  dialect: "mysql",
  logging: false,
});

async function initializeDatabase() {
  if (process.env.NODE_ENV !== "production") {
    const adminConnection = await mysql.createConnection({
      host,
      port,
      user: username,
      password,
      database: "mysql",
    });

    try {
      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS ${escapeId(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await adminConnection.end();
    }
  }

  await sequelize.authenticate();
  await sequelize.sync();

  // Keep the authentication session version available for databases created
  // before this field was introduced, without using destructive schema sync.
  const queryInterface = sequelize.getQueryInterface();
  const userColumns = await queryInterface.describeTable("users");
  if (!userColumns.session_version) {
    await queryInterface.addColumn("users", "session_version", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!userColumns.role) {
    try {
      await queryInterface.addColumn("users", "role", {
        type: Sequelize.ENUM("admin", "super_admin"),
        allowNull: false,
        defaultValue: "admin",
      });
    } catch (error) {
      // sequelize.sync can create this new model field before the explicit
      // compatibility migration runs. A duplicate then means it is ready.
      if (error.original?.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }

  const repairColumns = await queryInterface.describeTable("repair_jobs");
  const addRepairColumn = async (name, definition) => {
    if (repairColumns[name]) return;
    try {
      await queryInterface.addColumn("repair_jobs", name, definition);
    } catch (error) {
      if (error.original?.code !== "ER_DUP_FIELDNAME") throw error;
    }
  };
  await addRepairColumn("asset_type", {
    type: Sequelize.ENUM("Mobile & tablet", "Laptop & computer", "Vehicle", "Appliance & electronics", "Machinery", "Other asset"),
    allowNull: false,
    defaultValue: "Other asset",
  });
  await addRepairColumn("asset_identifier", { type: Sequelize.STRING(160), allowNull: true });
}

module.exports = { sequelize, initializeDatabase };
