/**
 * Migration: add_attachment_and_leave_types_to_employee_leave_requests
 * Modul Kepegawaian - Menambahkan kolom lampiran berkas/surat dokter & alasan penolakan pada permohonan izin/cuti
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('employee_leave_requests', (table) => {
    table.string('attachment_url', 255).nullable().after('reason');
    table.string('attachment_name', 255).nullable().after('attachment_url');
    table.string('attachment_mime_type', 100).nullable().after('attachment_name');
    table.bigInteger('attachment_size_bytes').unsigned().nullable().after('attachment_mime_type');
    table.text('rejection_reason').nullable().after('approved_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('employee_leave_requests', (table) => {
    table.dropColumn('attachment_url');
    table.dropColumn('attachment_name');
    table.dropColumn('attachment_mime_type');
    table.dropColumn('attachment_size_bytes');
    table.dropColumn('rejection_reason');
  });
};
