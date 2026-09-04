/**
 * Migration: alter_payroll_items_add_rejection_reason
 * Modul Kepegawaian - Menambahkan rejection_reason dan rejected_at pada payroll_items saat dikembalikan oleh Keuangan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('payroll_items', (table) => {
    table.text('rejection_reason').nullable();
    table.timestamp('rejected_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.alterTable('payroll_items', (table) => {
      table.dropColumn('rejected_at');
      table.dropColumn('rejection_reason');
    });
  } catch (e) {}
};
