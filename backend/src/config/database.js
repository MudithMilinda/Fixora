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
}

module.exports = { sequelize, initializeDatabase };
