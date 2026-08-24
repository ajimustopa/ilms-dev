/**
 * Migration: allow_multiple_bank_accounts
 * Modul Kepegawaian - Memungkinkan satu pegawai memiliki lebih dari satu rekening bank
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Drop unique constraint on employee_id in employee_bank_accounts to allow 1:N
  await knex.schema.alterTable('employee_bank_accounts', (table) => {
    table.dropUnique(['employee_id']);
    table.string('bank_id', 50).nullable().after('employee_id'); // ID / Kode Bank
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('employee_bank_accounts', (table) => {
    table.dropColumn('bank_id');
    table.unique(['employee_id']);
  });
};
