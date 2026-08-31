/**
 * Migration: create_psb_tables
 * Modul Akademik - Fitur PSB (Penerimaan Murid Baru)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. psb_processes (Proses PSB)
  await knex.schema.createTable('psb_processes', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.string('target_academic_year', 20).notNullable(); // e.g. "2026/2027"
    table.enu('context_type', ['satuan', 'yayasan']).notNullable().defaultTo('satuan');
    table.enu('status', ['draft', 'open', 'closed']).notNullable().defaultTo('draft');
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['target_academic_year', 'status'], 'idx_psb_proc_acad_year');
  });

  // 2. psb_process_units (Pivot Proses ke Satuan Pendidikan)
  await knex.schema.createTable('psb_process_units', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_process_id').unsigned().notNullable()
      .references('id').inTable('psb_processes').onDelete('CASCADE');
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.string('code_prefix', 20).notNullable().defaultTo('PSB');
    table.integer('target_registrants').unsigned().nullable().defaultTo(0);
    table.smallint('quota_male').unsigned().nullable().defaultTo(0);
    table.smallint('quota_female').unsigned().nullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['psb_process_id', 'satuan_pendidikan_id'], 'uq_psb_proc_unit');
    table.index(['satuan_pendidikan_id'], 'idx_psb_unit_satuan');
  });

  // 3. psb_groups (Master Kelompok / Gelombang Calon Murid)
  await knex.schema.createTable('psb_groups', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_process_id').unsigned().notNullable()
      .references('id').inTable('psb_processes').onDelete('CASCADE');
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.smallint('quota').unsigned().nullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['psb_process_id', 'satuan_pendidikan_id'], 'idx_psb_grp_proc');
  });

  // 4. psb_registrants (Pendataan Calon Murid)
  await knex.schema.createTable('psb_registrants', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_process_id').unsigned().notNullable()
      .references('id').inTable('psb_processes').onDelete('RESTRICT');
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('psb_group_id').unsigned().nullable()
      .references('id').inTable('psb_groups').onDelete('SET NULL');
    table.string('registration_number', 50).notNullable().unique();
    table.string('nisn', 20).nullable();
    table.string('full_name', 150).notNullable();
    table.text('address').nullable();
    table.string('previous_school_name', 150).nullable();
    table.string('father_name', 150).nullable();
    table.string('mother_name', 150).nullable();
    table.string('parent_contact', 50).nullable();
    table.enu('entry_type', ['reguler', 'pindahan']).notNullable().defaultTo('reguler');
    table.bigInteger('requested_grade_level_id').unsigned().nullable()
      .references('id').inTable('grade_levels').onDelete('SET NULL');
    table.bigInteger('fee_group_id').unsigned().nullable(); // referensi lepas ke keuangan.fee_groups.id
    table.string('fee_group_name_snapshot', 100).nullable();
    table.bigInteger('user_account_id').unsigned().nullable(); // referensi lepas ke core.users.id
    table.enu('status', [
      'registered',
      'testing',
      'test_passed',
      'test_failed',
      'placed',
      'rejected',
      'withdrawn'
    ]).notNullable().defaultTo('registered');
    table.enu('source', ['public_website', 'admin_input']).notNullable().defaultTo('admin_input');
    table.bigInteger('website_registrant_ref_id').unsigned().nullable(); // referensi lepas ke website-utama.ppdb_registrants.id
    table.bigInteger('placed_class_group_id').unsigned().nullable()
      .references('id').inTable('class_groups').onDelete('SET NULL');
    table.bigInteger('placed_student_id').unsigned().nullable()
      .references('id').inTable('students').onDelete('SET NULL');
    table.string('placed_nipd', 30).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['psb_process_id', 'satuan_pendidikan_id', 'status'], 'idx_psb_reg_proc_satuan');
    table.index(['registration_number'], 'idx_psb_reg_number');
    table.index(['nisn'], 'idx_psb_reg_nisn');
  });

  // 5. psb_registrant_documents (Dokumen Lampiran Calon Murid)
  await knex.schema.createTable('psb_registrant_documents', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_registrant_id').unsigned().notNullable()
      .references('id').inTable('psb_registrants').onDelete('CASCADE');
    table.string('document_type', 50).notNullable();
    table.string('document_name', 150).notNullable();
    table.string('file_url', 255).notNullable();
    table.boolean('is_submitted').notNullable().defaultTo(false);
    table.bigInteger('verified_by').unsigned().nullable();
    table.timestamp('verified_at').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['psb_registrant_id', 'document_type'], 'idx_psb_doc_reg');
  });

  // 6. psb_tests (Master Formulir Test)
  await knex.schema.createTable('psb_tests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_process_id').unsigned().notNullable()
      .references('id').inTable('psb_processes').onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.integer('duration_minutes').unsigned().nullable();
    table.decimal('passing_score', 5, 2).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['psb_process_id', 'is_active'], 'idx_psb_test_proc');
  });

  // 7. psb_test_questions (Bank Soal Tes PSB)
  await knex.schema.createTable('psb_test_questions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_test_id').unsigned().notNullable()
      .references('id').inTable('psb_tests').onDelete('CASCADE');
    table.enu('question_type', ['multiple_choice', 'fill_in_blank', 'essay']).notNullable();
    table.text('question_text').notNullable();
    table.json('options').nullable();
    table.text('correct_answer').nullable();
    table.decimal('score_weight', 5, 2).notNullable().defaultTo(1.00);
    table.integer('order_number').notNullable().defaultTo(1);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['psb_test_id', 'order_number'], 'idx_psb_q_test');
  });

  // 8. psb_test_sessions (Penugasan Tes ke Calon Murid)
  await knex.schema.createTable('psb_test_sessions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_test_id').unsigned().notNullable()
      .references('id').inTable('psb_tests').onDelete('CASCADE');
    table.bigInteger('psb_registrant_id').unsigned().notNullable()
      .references('id').inTable('psb_registrants').onDelete('CASCADE');
    table.datetime('scheduled_at').nullable();
    table.enu('status', ['scheduled', 'in_progress', 'submitted', 'graded']).notNullable().defaultTo('scheduled');
    table.datetime('started_at').nullable();
    table.datetime('submitted_at').nullable();
    table.decimal('total_score', 6, 2).nullable();
    table.boolean('is_passed').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['psb_test_id', 'psb_registrant_id'], 'uq_psb_sess_test_reg');
    table.index(['psb_registrant_id', 'status'], 'idx_psb_sess_reg');
  });

  // 9. psb_test_answers (Jawaban Tes Calon Murid)
  await knex.schema.createTable('psb_test_answers', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_test_session_id').unsigned().notNullable()
      .references('id').inTable('psb_test_sessions').onDelete('CASCADE');
    table.bigInteger('psb_test_question_id').unsigned().notNullable()
      .references('id').inTable('psb_test_questions').onDelete('CASCADE');
    table.text('answer_text').nullable();
    table.boolean('is_correct').nullable();
    table.decimal('score_awarded', 5, 2).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['psb_test_session_id', 'psb_test_question_id'], 'idx_psb_ans_sess_q');
  });

  // 10. psb_placement_logs (Riwayat Penempatan Kelas, Append-Only)
  await knex.schema.createTable('psb_placement_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('psb_registrant_id').unsigned().notNullable()
      .references('id').inTable('psb_registrants').onDelete('CASCADE');
    table.bigInteger('academic_year_id').unsigned().nullable()
      .references('id').inTable('academic_years').onDelete('SET NULL');
    table.bigInteger('class_group_id').unsigned().nullable()
      .references('id').inTable('class_groups').onDelete('SET NULL');
    table.string('nipd', 30).nullable();
    table.string('placed_by', 100).nullable();
    table.timestamp('placed_at').notNullable().defaultTo(knex.fn.now());
    table.text('notes').nullable();

    table.index(['psb_registrant_id'], 'idx_psb_place_reg');
    table.index(['class_group_id'], 'idx_psb_place_class');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('psb_placement_logs');
  await knex.schema.dropTableIfExists('psb_test_answers');
  await knex.schema.dropTableIfExists('psb_test_sessions');
  await knex.schema.dropTableIfExists('psb_test_questions');
  await knex.schema.dropTableIfExists('psb_tests');
  await knex.schema.dropTableIfExists('psb_registrant_documents');
  await knex.schema.dropTableIfExists('psb_registrants');
  await knex.schema.dropTableIfExists('psb_groups');
  await knex.schema.dropTableIfExists('psb_process_units');
  await knex.schema.dropTableIfExists('psb_processes');
};
