/**
 * Migration: alter_cash_account_opening_balances_add_opening_date
 * Modul Keuangan - Menambahkan kolom opening_date pada cash_account_opening_balances
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('cash_account_opening_balances', (table) => {
    table.date('opening_date').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.alterTable('cash_account_opening_balances', (table) => {
      table.dropColumn('opening_date');
    });
  } catch (e) {}
};
