/**
 * Migration: create_student_attitude_scores_table
 * Modul Akademik - Fitur: Penilaian Sikap / Karakter (Student Attitude Scores)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_attitude_scores', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('semester_id').unsigned().notNullable()
      .references('id').inTable('semesters');
    table.string('aspect', 100).notNullable();
    table.string('predicate', 20).nullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_attitude_scores_student');
    table.index(['semester_id'], 'idx_attitude_scores_semester');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_attitude_scores');
};
