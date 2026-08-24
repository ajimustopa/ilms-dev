/**
 * Migration: create_student_achievements_table
 * Modul Akademik - Fitur: Pencatatan Prestasi Siswa (Student Achievements)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_achievements', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.string('achievement_type', 150).notNullable();
    table.enum('level', ['sekolah', 'kecamatan', 'kabupaten_kota', 'provinsi', 'nasional', 'internasional']).nullable();
    table.date('achieved_at').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_achievements_student');
    table.index(['level'], 'idx_achievements_level');
    table.index(['achieved_at'], 'idx_achievements_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_achievements');
};
