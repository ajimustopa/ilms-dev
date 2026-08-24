/**
 * Migration: add_file_urls_to_student_documents_and_recaps
 * Menambahkan dukungan unggah file scan berkas pendaftaran, scan ijazah sekolah saat ini,
 * serta scan rapor DIK dan DIN per semester.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah kolom file URL & ijazah pada student_document_checklists
  await knex.schema.alterTable('student_document_checklists', (table) => {
    table.string('form_file_url', 255).nullable().after('form_verified');
    table.string('birth_cert_file_url', 255).nullable().after('birth_cert_verified');
    table.string('family_card_file_url', 255).nullable().after('family_card_verified');
    table.string('father_ktp_file_url', 255).nullable().after('father_ktp_verified');
    table.string('mother_ktp_file_url', 255).nullable().after('mother_ktp_verified');
    table.string('other_docs_file_url', 255).nullable().after('other_docs_verified');
    table.string('photo_2x3_file_url', 255).nullable().after('photo_2x3_verified');
    table.string('photo_3x4_file_url', 255).nullable().after('photo_3x4_verified');
    table.boolean('ijazah_submitted').notNullable().defaultTo(false).after('photo_3x4_file_url');
    table.boolean('ijazah_verified').notNullable().defaultTo(false).after('ijazah_submitted');
    table.string('ijazah_file_url', 255).nullable().after('ijazah_verified');
  });

  // 2. Tambah kolom file URL scan rapor pada student_report_card_recap_checklists
  await knex.schema.alterTable('student_report_card_recap_checklists', (table) => {
    table.string('file_url_dik', 255).nullable().after('dik_status');
    table.string('file_url_din', 255).nullable().after('din_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('student_report_card_recap_checklists', (table) => {
    table.dropColumn('file_url_din');
    table.dropColumn('file_url_dik');
  });

  await knex.schema.alterTable('student_document_checklists', (table) => {
    table.dropColumn('ijazah_file_url');
    table.dropColumn('ijazah_verified');
    table.dropColumn('ijazah_submitted');
    table.dropColumn('photo_3x4_file_url');
    table.dropColumn('photo_2x3_file_url');
    table.dropColumn('other_docs_file_url');
    table.dropColumn('mother_ktp_file_url');
    table.dropColumn('father_ktp_file_url');
    table.dropColumn('family_card_file_url');
    table.dropColumn('birth_cert_file_url');
    table.dropColumn('form_file_url');
  });
};
