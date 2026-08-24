/**
 * Migration: create_learning_objectives_and_tp_scores
 * Modul Akademik:
 * 1. Tujuan Pembelajaran (learning_objectives) per Mapel, Tingkat Kelas, & Tahun Ajaran / Semester
 * 2. Penilaian per Tujuan Pembelajaran (student_tp_scores)
 * 3. Kolom capaian_kompetensi / description di student_scores & report_cards
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Tabel Tujuan Pembelajaran (TP)
  const hasLearningObjectives = await knex.schema.hasTable('learning_objectives');
  if (!hasLearningObjectives) {
    await knex.schema.createTable('learning_objectives', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable()
        .references('id').inTable('academic_years').onDelete('CASCADE');
      table.bigInteger('grade_level_id').unsigned().notNullable()
        .references('id').inTable('grade_levels').onDelete('CASCADE');
      table.bigInteger('subject_id').unsigned().notNullable()
        .references('id').inTable('subjects').onDelete('CASCADE');
      table.bigInteger('semester_id').unsigned().nullable()
        .references('id').inTable('semesters').onDelete('SET NULL');
      table.string('code', 50).notNullable(); // e.g. "TP 1", "TP 2"
      table.text('description').notNullable(); // e.g. "Memahami konsep bilangan bulat dan operasi hitung"
      table.tinyint('order_index').notNullable().defaultTo(1);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['satuan_pendidikan_id'], 'idx_lo_satuan');
      table.index(['academic_year_id'], 'idx_lo_ay');
      table.index(['grade_level_id'], 'idx_lo_grade');
      table.index(['subject_id'], 'idx_lo_subject');
      table.index(['semester_id'], 'idx_lo_semester');
    });
  }

  // 2. Tabel Nilai Siswa per Tujuan Pembelajaran
  const hasTpScores = await knex.schema.hasTable('student_tp_scores');
  if (!hasTpScores) {
    await knex.schema.createTable('student_tp_scores', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('student_id').unsigned().notNullable()
        .references('id').inTable('students').onDelete('CASCADE');
      table.bigInteger('learning_objective_id').unsigned().notNullable()
        .references('id').inTable('learning_objectives').onDelete('CASCADE');
      table.bigInteger('subject_id').unsigned().notNullable()
        .references('id').inTable('subjects').onDelete('CASCADE');
      table.bigInteger('semester_id').unsigned().notNullable()
        .references('id').inTable('semesters').onDelete('CASCADE');
      table.decimal('score', 5, 2).nullable(); // Nilai angka 0 - 100
      table.enum('mastery_status', ['tercapai_optimal', 'tercapai', 'cukup', 'perlu_bimbingan']).nullable().defaultTo('tercapai');
      table.text('notes').nullable();
      table.bigInteger('recorded_by_employee_id').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['student_id'], 'idx_stps_student');
      table.index(['learning_objective_id'], 'idx_stps_tp');
      table.index(['subject_id'], 'idx_stps_subject');
      table.index(['semester_id'], 'idx_stps_semester');
    });
  }

  // 3. Tambah kolom deskripsi / capaian kompetensi pada student_scores jika belum ada
  const hasCompetencyDesc = await knex.schema.hasColumn('student_scores', 'competency_description');
  if (!hasCompetencyDesc) {
    await knex.schema.alterTable('student_scores', (table) => {
      table.text('competency_description').nullable(); // Deskripsi capaian yang digenerate otomatis
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasCompetencyDesc = await knex.schema.hasColumn('student_scores', 'competency_description');
  if (hasCompetencyDesc) {
    await knex.schema.alterTable('student_scores', (table) => {
      table.dropColumn('competency_description');
    });
  }

  await knex.schema.dropTableIfExists('student_tp_scores');
  await knex.schema.dropTableIfExists('learning_objectives');
};
