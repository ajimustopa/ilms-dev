/**
 * Migration: create_attitude_dimensions_and_scout_scores_tables
 * Modul Akademik - Dimensi Sikap per Tahun Ajaran, Nilai Sikap Deskripsi,
 * Nilai Ekstrakurikuler Wajib Pramuka, dan Catatan Wali Kelas
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel Dimensi Sikap per Tahun Ajaran
  const hasAttitudeDimensions = await knex.schema.hasTable('attitude_dimensions');
  if (!hasAttitudeDimensions) {
    await knex.schema.createTable('attitude_dimensions', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().defaultTo(1);
      table.bigInteger('academic_year_id').unsigned().nullable();
      table.string('code', 50).nullable();
      table.string('name', 200).notNullable();
      table.text('description').nullable();
      table.integer('order_index').notNullable().defaultTo(1);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(['satuan_pendidikan_id', 'academic_year_id'], 'idx_att_dim_unit_ay');
    });
  }

  // 2. Tabel Nilai Ekstrakurikuler Wajib Pramuka
  const hasScoutScores = await knex.schema.hasTable('student_scout_scores');
  if (!hasScoutScores) {
    await knex.schema.createTable('student_scout_scores', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().defaultTo(1);
      table.bigInteger('student_id').unsigned().notNullable();
      table.bigInteger('class_group_id').unsigned().notNullable();
      table.bigInteger('semester_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().nullable();
      table.string('predicate', 30).notNullable().defaultTo('Baik'); // Cukup, Baik, Amat Baik
      table.text('description').nullable();
      table.timestamps(true, true);

      table.unique(['student_id', 'semester_id'], 'uq_scout_scores_student_sem');
      table.index(['class_group_id', 'semester_id'], 'idx_scout_scores_class_sem');
    });
  }

  // 3. Tambah kolom dimension_id ke student_attitude_scores jika belum ada
  const hasAttitudeScores = await knex.schema.hasTable('student_attitude_scores');
  if (hasAttitudeScores) {
    const hasDimensionCol = await knex.schema.hasColumn('student_attitude_scores', 'dimension_id');
    if (!hasDimensionCol) {
      await knex.schema.alterTable('student_attitude_scores', (table) => {
        table.bigInteger('dimension_id').unsigned().nullable().after('semester_id');
        table.bigInteger('class_group_id').unsigned().nullable().after('dimension_id');
        table.bigInteger('academic_year_id').unsigned().nullable().after('class_group_id');
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_scout_scores');
  await knex.schema.dropTableIfExists('attitude_dimensions');
};
