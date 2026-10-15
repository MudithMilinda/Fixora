const { DataTypes } = require('sequelize');

// sequelize.sync() creates new tables but does not add fields to existing ones.
// Keep the legacy phone column intact and only backfill uninitialized lists.
async function migrateSupplierPhones(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('suppliers');
  if (!columns.phones) {
    try {
      await queryInterface.addColumn('suppliers', 'phones', {
        type: DataTypes.JSON,
        allowNull: true,
      });
    } catch (error) {
      // Another server instance may have added the same column during startup.
      if (error.original?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  if (columns.phone) {
    await sequelize.query(`
      UPDATE suppliers
      SET phones = CASE
        WHEN phone IS NULL OR TRIM(phone) = '' THEN JSON_ARRAY()
        ELSE JSON_ARRAY(TRIM(phone))
      END
      WHERE phones IS NULL
    `);
  }
}

module.exports = { migrateSupplierPhones };
