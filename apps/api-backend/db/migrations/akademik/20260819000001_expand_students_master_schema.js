/**
 * Migration: expand_students_master_schema
 * Modul Akademik - Redesain & Perluasan Skema Data Induk Siswa (Standar Dapodik)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Perluas tabel students
  await knex.schema.alterTable('students', (table) => {
    table.string('nipd', 30).nullable().after('nisn');
    table.string('family_card_number', 20).nullable().after('nipd');
    table.string('nik', 20).nullable().after('family_card_number');
    table.string('nickname', 50).nullable().after('full_name');
    table.string('birth_certificate_reg_no', 50).nullable().after('birth_date');
    table.smallint('order_in_family').unsigned().nullable().after('birth_certificate_reg_no');
    table.smallint('number_of_siblings').unsigned().nullable().after('order_in_family');
    table.smallint('number_of_step_siblings').unsigned().nullable().after('number_of_siblings');
    table.smallint('number_of_adoptive_siblings').unsigned().nullable().after('number_of_step_siblings');
    table.enum('religion', ['islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu', 'lainnya']).nullable().after('number_of_adoptive_siblings');
    table.string('citizenship', 50).nullable().defaultTo('WNI').after('religion');
    table.string('special_needs', 100).nullable().after('citizenship');
    table.string('primary_language', 50).nullable().after('special_needs');
    table.string('hobby', 100).nullable().after('primary_language');
    table.string('ambition', 100).nullable().after('hobby');

    table.index(['nik'], 'idx_students_nik');
    table.index(['nipd'], 'idx_students_nipd');
  });

  // 2. Buat tabel 1:1 student_addresses
  await knex.schema.createTable('student_addresses', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable().unique()
      .references('id').inTable('students').onDelete('CASCADE');
    table.text('street_address').nullable();
    table.string('rt', 5).nullable();
    table.string('rw', 5).nullable();
    table.string('hamlet', 100).nullable();
    table.string('village', 100).nullable();
    table.string('district', 100).nullable();
    table.string('postal_code', 10).nullable();
    table.text('full_address').nullable();
    table.string('email', 150).nullable();
    table.string('gmaps_url', 255).nullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.string('residence_type', 50).nullable();
    table.string('transportation_mode', 50).nullable();
    table.decimal('travel_distance_km', 5, 2).nullable();
    table.integer('travel_time_minutes').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_student_addresses_student_id');
  });

  // 3. Buat tabel 1:1 student_physical_data
  await knex.schema.createTable('student_physical_data', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable().unique()
      .references('id').inTable('students').onDelete('CASCADE');
    table.decimal('height_cm', 5, 2).nullable();
    table.decimal('weight_kg', 5, 2).nullable();
    table.enum('blood_type', ['A', 'B', 'AB', 'O', 'tidak_tahu']).nullable();
    table.text('medical_history').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_student_physical_data_student_id');
  });

  // 4. Perluas tabel guardians
  await knex.schema.alterTable('guardians', (table) => {
    table.string('nik', 20).nullable().after('id');
    table.string('birth_place', 100).nullable().after('full_name');
    table.date('birth_date').nullable().after('birth_place');
    table.string('education_level', 50).nullable().after('birth_date');
    table.string('income_range', 50).nullable().after('occupation');
    table.string('special_needs', 100).nullable().after('income_range');

    table.index(['nik'], 'idx_guardians_nik');
  });

  // 5. Perluas tabel pivot student_guardians
  await knex.schema.alterTable('student_guardians', (table) => {
    table.string('expense_bearer', 50).nullable().after('relationship');
  });

  // 6. Buat tabel 1:1 student_admissions
  await knex.schema.createTable('student_admissions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable().unique()
      .references('id').inTable('students').onDelete('CASCADE');
    table.bigInteger('initial_grade_level_id').unsigned().nullable()
      .references('id').inTable('grade_levels').onDelete('SET NULL');
    table.bigInteger('initial_class_group_id').unsigned().nullable()
      .references('id').inTable('class_groups').onDelete('SET NULL');
    table.enum('registration_type', ['siswa_baru', 'pindahan']).notNullable().defaultTo('siswa_baru');
    table.date('admission_date').notNullable();
    table.string('previous_school_name', 150).nullable();
    table.text('previous_school_address').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_student_admissions_student_id');
  });

  // 7. Buat tabel 1:1 student_document_checklists
  await knex.schema.createTable('student_document_checklists', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable().unique()
      .references('id').inTable('students').onDelete('CASCADE');
    table.boolean('form_submitted').notNullable().defaultTo(false);
    table.boolean('form_verified').notNullable().defaultTo(false);
    table.boolean('birth_cert_submitted').notNullable().defaultTo(false);
    table.boolean('birth_cert_verified').notNullable().defaultTo(false);
    table.boolean('family_card_submitted').notNullable().defaultTo(false);
    table.boolean('family_card_verified').notNullable().defaultTo(false);
    table.boolean('father_ktp_submitted').notNullable().defaultTo(false);
    table.boolean('father_ktp_verified').notNullable().defaultTo(false);
    table.boolean('mother_ktp_submitted').notNullable().defaultTo(false);
    table.boolean('mother_ktp_verified').notNullable().defaultTo(false);
    table.boolean('other_docs_submitted').notNullable().defaultTo(false);
    table.boolean('other_docs_verified').notNullable().defaultTo(false);
    table.boolean('photo_2x3_submitted').notNullable().defaultTo(false);
    table.boolean('photo_2x3_verified').notNullable().defaultTo(false);
    table.boolean('photo_3x4_submitted').notNullable().defaultTo(false);
    table.boolean('photo_3x4_verified').notNullable().defaultTo(false);
    table.boolean('class_group_joined').notNullable().defaultTo(false);
    table.boolean('class_group_joined_verified').notNullable().defaultTo(false);
    table.boolean('teacher_socialized').notNullable().defaultTo(false);
    table.boolean('teacher_socialized_verified').notNullable().defaultTo(false);
    table.boolean('learning_started').notNullable().defaultTo(false);
    table.boolean('learning_started_verified').notNullable().defaultTo(false);
    table.boolean('data_completed').notNullable().defaultTo(false);
    table.boolean('data_verified').notNullable().defaultTo(false);
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_student_doc_checklists_student_id');
  });

  // 8. Perluas tabel student_mutations
  await knex.schema.alterTable('student_mutations', (table) => {
    table.string('exam_participant_number', 50).nullable().after('notes');
    table.string('diploma_certificate_number', 50).nullable().after('exam_participant_number');
    table.string('skhun_number', 50).nullable().after('diploma_certificate_number');
    table.string('next_school_name', 150).nullable().after('skhun_number');
    table.text('transfer_reason').nullable().after('next_school_name');
    table.string('exit_letter_number', 50).nullable().after('transfer_reason');
    table.string('acceptance_letter_status', 100).nullable().after('exit_letter_number');
    table.enum('dapodik_mutation_letter_status', ['belum_diproses', 'dalam_proses', 'sudah_terbit', 'selesai']).nullable().after('acceptance_letter_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // 1. Rollback student_mutations
  await knex.schema.alterTable('student_mutations', (table) => {
    table.dropColumn('dapodik_mutation_letter_status');
    table.dropColumn('acceptance_letter_status');
    table.dropColumn('exit_letter_number');
    table.dropColumn('transfer_reason');
    table.dropColumn('next_school_name');
    table.dropColumn('skhun_number');
    table.dropColumn('diploma_certificate_number');
    table.dropColumn('exam_participant_number');
  });

  // 2. Drop tabel-tabel baru
  await knex.schema.dropTableIfExists('student_document_checklists');
  await knex.schema.dropTableIfExists('student_admissions');

  // 3. Rollback student_guardians
  await knex.schema.alterTable('student_guardians', (table) => {
    table.dropColumn('expense_bearer');
  });

  // 4. Rollback guardians
  await knex.schema.alterTable('guardians', (table) => {
    table.dropIndex(['nik'], 'idx_guardians_nik');
    table.dropColumn('special_needs');
    table.dropColumn('income_range');
    table.dropColumn('education_level');
    table.dropColumn('birth_date');
    table.dropColumn('birth_place');
    table.dropColumn('nik');
  });

  // 5. Drop child tables physical & addresses
  await knex.schema.dropTableIfExists('student_physical_data');
  await knex.schema.dropTableIfExists('student_addresses');

  // 6. Rollback students
  await knex.schema.alterTable('students', (table) => {
    table.dropIndex(['nipd'], 'idx_students_nipd');
    table.dropIndex(['nik'], 'idx_students_nik');
    table.dropColumn('ambition');
    table.dropColumn('hobby');
    table.dropColumn('primary_language');
    table.dropColumn('special_needs');
    table.dropColumn('citizenship');
    table.dropColumn('religion');
    table.dropColumn('number_of_adoptive_siblings');
    table.dropColumn('number_of_step_siblings');
    table.dropColumn('number_of_siblings');
    table.dropColumn('order_in_family');
    table.dropColumn('birth_certificate_reg_no');
    table.dropColumn('nickname');
    table.dropColumn('nik');
    table.dropColumn('family_card_number');
    table.dropColumn('nipd');
  });
};
