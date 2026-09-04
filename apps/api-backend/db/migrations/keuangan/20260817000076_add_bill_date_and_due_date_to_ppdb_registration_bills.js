/**
 * Migration 76: add_bill_date_and_due_date_to_ppdb_registration_bills
 * Menambahkan kolom bill_date dan due_date pada tabel ppdb_registration_bills
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (hasTable) {
    const hasDueDate = await knex.schema.hasColumn('ppdb_registration_bills', 'due_date');
    const hasBillDate = await knex.schema.hasColumn('ppdb_registration_bills', 'bill_date');

    await knex.schema.alterTable('ppdb_registration_bills', (table) => {
      if (!hasDueDate) {
        table.date('due_date').nullable().after('amount');
      }
      if (!hasBillDate) {
        table.date('bill_date').nullable().after('due_date');
      }
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (hasTable) {
    const hasDueDate = await knex.schema.hasColumn('ppdb_registration_bills', 'due_date');
    const hasBillDate = await knex.schema.hasColumn('ppdb_registration_bills', 'bill_date');

    await knex.schema.alterTable('ppdb_registration_bills', (table) => {
      if (hasBillDate) {
        table.dropColumn('bill_date');
      }
      if (hasDueDate) {
        table.dropColumn('due_date');
      }
    });
  }
};
