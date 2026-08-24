/**
 * Migration: add_file_url_to_document_checklists
 * Modul Kepegawaian - Menambahkan file_url dan catatan verifikasi berkas
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('employee_document_checklists', (table) => {
    table.string('file_url', 255).nullable().after('status');
    table.text('notes').nullable().after('file_url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('employee_document_checklists', (table) => {
    table.dropColumn('notes');
    table.dropColumn('file_url');
  });
};
