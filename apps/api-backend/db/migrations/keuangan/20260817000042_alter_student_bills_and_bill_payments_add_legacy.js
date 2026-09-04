/**
 * Migration: alter_student_bills_and_bill_payments_add_legacy
 * Modul Keuangan - Penanda data historis (is_legacy & historical_cash_note) untuk migrasi data lama
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Alter student_bills
  await knex.schema.table('student_bills', (table) => {
    table.boolean('is_legacy').notNullable().defaultTo(false);
    table.text('legacy_note').nullable();
  });

  // 2. Alter bill_payments
  await knex.schema.table('bill_payments', (table) => {
    table.boolean('is_legacy').notNullable().defaultTo(false);
    table.string('historical_cash_note', 150).nullable();
  });

  // 3. Make cash_account_id nullable in bill_payments for legacy records
  try {
    await knex.raw(`
      ALTER TABLE \`bill_payments\` 
      MODIFY COLUMN \`cash_account_id\` BIGINT UNSIGNED NULL
    `);
  } catch (err) {
    console.warn('Modify cash_account_id to nullable warning:', err.message);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.table('student_bills', (table) => {
      table.dropColumn('legacy_note');
      table.dropColumn('is_legacy');
    });
  } catch (e) {}

  try {
    await knex.schema.table('bill_payments', (table) => {
      table.dropColumn('historical_cash_note');
      table.dropColumn('is_legacy');
    });
  } catch (e) {}
};
