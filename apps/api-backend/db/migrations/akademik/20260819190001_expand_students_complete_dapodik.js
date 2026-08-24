/**
 * Migration: expand_students_complete_dapodik
 * Modul Akademik - Melengkapi seluruh field data induk peserta didik standar Dapodik
 * (Data Fisik Lengkap, Riwayat Fisik Periodik, Rekap Rapor DIK/DIN, Status Validasi Ortu/Wali, Status Dapodik)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah status dapodik pada tabel students
  await knex.schema.alterTable('students', (table) => {
    table.enum('dapodik_status', ['belum_masuk_dapodik', 'kendala', 'sudah_masuk_dapodik'])
      .notNullable()
      .defaultTo('belum_masuk_dapodik')
      .after('status');
    table.text('dapodik_notes').nullable().after('dapodik_status');
  });

  // 2. Perluas tabel student_physical_data
  await knex.schema.alterTable('student_physical_data', (table) => {
    table.text('severe_disease').nullable().after('medical_history'); // Penyakit berat yang pernah diderita
    table.text('dietary_restrictions').nullable().after('severe_disease'); // Pantangan makanan
    table.text('health_notes').nullable().after('dietary_restrictions'); // Catatan khusus kesehatan
    table.decimal('head_circumference_cm', 5, 2).nullable().after('weight_kg'); // Lingkar kepala
  });

  // 3. Perluas tabel guardians untuk validasi & kontak lengkap
  await knex.schema.alterTable('guardians', (table) => {
    table.enum('validation_status', ['unverified', 'verified'])
      .notNullable()
      .defaultTo('unverified')
      .after('full_name');
  });

  // 4. Buat tabel 1:N student_periodic_physical_records (Data Fisik Periodik)
  await knex.schema.createTable('student_periodic_physical_records', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students').onDelete('CASCADE');
    table.date('record_date').notNullable();
    table.string('period_label', 50).nullable(); // mis. "Semester Ganjil 2026/2027"
    table.decimal('height_cm', 5, 2).notNullable();
    table.decimal('weight_kg', 5, 2).notNullable();
    table.decimal('head_circumference_cm', 5, 2).nullable();
    table.text('notes').nullable();
    table.string('recorded_by', 100).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_periodic_phys_student_id');
  });

  // 5. Buat tabel 1:N student_report_card_recap_checklists (Kelengkapan Rekap Rapor DIK/DIN)
  await knex.schema.createTable('student_report_card_recap_checklists', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students').onDelete('CASCADE');
    table.string('grade_name', 50).notNullable(); // "Kelas 7", "Kelas 8", "Kelas 9"
    table.string('semester', 50).notNullable(); // "Semester 1", "Semester 2"
    table.boolean('dik_status').notNullable().defaultTo(false); // Nilai DIK (Pesantren/Yayasan)
    table.boolean('din_status').notNullable().defaultTo(false); // Nilai DIN (Dinas Pendidikan)
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['student_id', 'grade_name', 'semester'], 'uq_student_report_card_recap');
    table.index(['student_id'], 'idx_report_recap_student_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_report_card_recap_checklists');
  await knex.schema.dropTableIfExists('student_periodic_physical_records');

  await knex.schema.alterTable('guardians', (table) => {
    table.dropColumn('validation_status');
  });

  await knex.schema.alterTable('student_physical_data', (table) => {
    table.dropColumn('head_circumference_cm');
    table.dropColumn('health_notes');
    table.dropColumn('dietary_restrictions');
    table.dropColumn('severe_disease');
  });

  await knex.schema.alterTable('students', (table) => {
    table.dropColumn('dapodik_notes');
    table.dropColumn('dapodik_status');
  });
};
