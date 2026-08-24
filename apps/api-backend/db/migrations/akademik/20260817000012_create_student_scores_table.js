/**
 * Migration: create_student_scores_table
 * Modul Akademik - Fitur: Penilaian Nilai Siswa (Student Scores)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_scores', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('subject_id').unsigned().notNullable()
      .references('id').inTable('subjects');
    table.bigInteger('semester_id').unsigned().notNullable()
      .references('id').inTable('semesters');
    table.enum('score_type', ['harian', 'tugas', 'uts', 'uas', 'nilai_akhir']).notNullable();
    table.decimal('score', 5, 2).nullable();
    table.text('description').nullable();
    table.bigInteger('recorded_by_employee_id').unsigned().notNullable();
    table.date('recorded_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_student_scores_student');
    table.index(['subject_id'], 'idx_student_scores_subject');
    table.index(['semester_id'], 'idx_student_scores_semester');
    table.index(['score_type'], 'idx_student_scores_type');
    table.index(['recorded_by_employee_id'], 'idx_student_scores_recorded_by');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_scores');
};
