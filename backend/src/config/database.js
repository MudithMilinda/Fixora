const { Sequelize } = require("sequelize");
const mysql = require("mysql2/promise");
const { escapeId } = require("mysql2");
const { migrateSupplierPhones } = require("./migrateSupplierPhones");

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
  await migrateSupplierPhones(sequelize);

  // Existing installations need the quotation approval fields as well.
  const quotationColumns = await sequelize.getQueryInterface().describeTable('quotations');
  const addQuotationColumn = async (name, definition) => {
    if (!quotationColumns[name]) await sequelize.getQueryInterface().addColumn('quotations', name, definition);
  };
  await addQuotationColumn('status', { type: Sequelize.ENUM('Pending', 'Approved'), allowNull: false, defaultValue: 'Pending' });
  await addQuotationColumn('approved_by', { type: Sequelize.UUID, allowNull: true });
  await addQuotationColumn('approved_at', { type: Sequelize.DATE, allowNull: true });

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
  if (!userColumns.custom_role_id) await queryInterface.addColumn('users', 'custom_role_id', { type: Sequelize.UUID, allowNull: true });
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
  await addRepairColumn("parts", { type: Sequelize.JSON, allowNull: true });

  await addRepairColumn('warranty_days', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
  await addRepairColumn('warranty_start', { type: Sequelize.DATEONLY, allowNull: true });
  await addRepairColumn('warranty_end', { type: Sequelize.DATEONLY, allowNull: true });
  await addRepairColumn('parent_repair_id', { type: Sequelize.UUID, allowNull: true });
  await addRepairColumn('parent_job_number', { type: Sequelize.STRING(32), allowNull: true });
  await addRepairColumn('warranty_claim', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });

  const stockColumns = await queryInterface.describeTable('stocks');
  if (!stockColumns.cost_currency) await queryInterface.addColumn('stocks', 'cost_currency', { type: Sequelize.STRING(3), allowNull: true });
  if (!stockColumns.is_archived) {
    await queryInterface.addColumn('stocks', 'is_archived', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await sequelize.query(`UPDATE stocks old_stock JOIN stocks active_stock ON old_stock.branch_id = active_stock.branch_id AND ((old_stock.item_id IS NOT NULL AND old_stock.item_id = active_stock.item_id) OR (old_stock.item_id IS NULL AND active_stock.item_id IS NULL AND old_stock.sku IS NOT NULL AND old_stock.sku <> '' AND old_stock.sku = active_stock.sku)) SET old_stock.is_archived = 1 WHERE old_stock.quantity = 0 AND active_stock.quantity > 0`);
  }
  const movementColumns = await queryInterface.describeTable('stock_movements');
  if (!movementColumns.kind.type.toLowerCase().includes("'sale_return'")) await queryInterface.changeColumn('stock_movements', 'kind', { type: Sequelize.ENUM('manual_add', 'purchase', 'sale', 'repair', 'delete', 'adjustment', 'sale_return'), allowNull: false });
  for (const [name, length] of [['created_by_name', 120], ['adjustment_reason', 40], ['adjustment_note', 500]]) {
    if (!movementColumns[name]) await queryInterface.addColumn('stock_movements', name, { type: Sequelize.STRING(length), allowNull: true });
  }

  const purchaseOrderColumns = await queryInterface.describeTable('purchase_orders');
  if (!purchaseOrderColumns.received_at) await queryInterface.addColumn('purchase_orders', 'received_at', { type: Sequelize.DATE, allowNull: true });

  const technicianColumns = await queryInterface.describeTable("technicians");
  if (!technicianColumns.address) await queryInterface.addColumn("technicians", "address", { type: Sequelize.TEXT, allowNull: true });

  // Earlier builds could persist an empty string in the JSON parts column.
  // MySQL evaluates that invalid JSON when another field on the same row is
  // updated (for example the new branch_id), so normalize it first.
  await sequelize.query(
    "UPDATE repair_jobs SET parts = JSON_ARRAY() WHERE parts IS NULL OR JSON_VALID(parts) = 0",
  );

  const tables = await queryInterface.showAllTables();
  if (tables.map((table) => String(table).toLowerCase()).includes("repair_parts")) {
    await queryInterface.dropTable("repair_parts");
  }

  const itemColumns = await queryInterface.describeTable("items");
  if (!itemColumns.minimum_stock) await queryInterface.addColumn('items', 'minimum_stock', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 4 });
  const itemIndexes = await queryInterface.showIndex("items");
  const skuIndex = itemIndexes.find(
    (index) =>
      index.unique && index.fields.some((field) => field.attribute === "sku"),
  );
  if (skuIndex) await queryInterface.removeIndex("items", skuIndex.name);
  if (!itemColumns.source) {
    await queryInterface.addColumn("items", "source", {
      type: Sequelize.ENUM("catalog", "stock"),
      allowNull: false,
      defaultValue: "catalog",
    });
  }
  // Move records created by the former mixed items/stock design to the
  // dedicated stocks table, then leave items as the catalog only.
  if (itemColumns.source) {
    await sequelize.query(`INSERT INTO stocks (id, item_id, name, sku, quantity, cost_price, selling_price, created_at, updated_at) SELECT UUID(), id, name, sku, quantity, cost_price, selling_price, NOW(), NOW() FROM items WHERE source = 'stock'`);
    await sequelize.query("DELETE FROM items WHERE source = 'stock'");
  }

  const Company = require('../models/Company');
  const Branch = require('../models/Branch');
  const User = require('../models/User');
  const UserBranch = require('../models/UserBranch');
  const [company] = await Company.findOrCreate({ where: { code: 'DEFAULT' }, defaults: { name: process.env.DEFAULT_COMPANY_NAME || 'Fixora', code: 'DEFAULT' } });
  const [branch] = await Branch.findOrCreate({ where: { companyId: company.id, code: 'MAIN' }, defaults: { companyId: company.id, name: process.env.DEFAULT_BRANCH_NAME || 'Main branch', code: 'MAIN' } });
  const addColumn = async (table, columns, name, definition) => { if (!columns[name]) await queryInterface.addColumn(table, name, definition); };
  const currentUserColumns = await queryInterface.describeTable('users');
  await addColumn('users', currentUserColumns, 'company_id', { type: Sequelize.UUID, allowNull: true });
  await addColumn('users', currentUserColumns, 'active_branch_id', { type: Sequelize.UUID, allowNull: true });
  for (const table of ['stocks', 'stock_requests', 'repair_jobs']) { const columns = await queryInterface.describeTable(table); await addColumn(table, columns, 'branch_id', { type: Sequelize.UUID, allowNull: true }); }
  const legacyUsers = await User.findAll({ where: { companyId: null }, attributes: ['id'] });
  await User.update({ companyId: company.id, activeBranchId: branch.id }, { where: { companyId: null } });
  await sequelize.query('UPDATE stocks SET branch_id = ? WHERE branch_id IS NULL', { replacements: [branch.id] });
  await sequelize.query('UPDATE stock_requests SET branch_id = ? WHERE branch_id IS NULL', { replacements: [branch.id] });
  await sequelize.query('UPDATE repair_jobs SET branch_id = ? WHERE branch_id IS NULL', { replacements: [branch.id] });
  await Promise.all(legacyUsers.map((user) => UserBranch.findOrCreate({ where: { userId: user.id, branchId: branch.id } })));
}

module.exports = { sequelize, initializeDatabase };
