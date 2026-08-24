/**
 * Migration: create_extracurricular_members_table
 * Modul Akademik - Fitur: Anggota Ekstrakurikuler (Extracurricular Members)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('extracurricular_members', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('extracurricular_id').unsigned().notNullable()
      .references('id').inTable('extracurriculars');
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('academic_year_id').unsigned().notNullable()
      .references('id').inTable('academic_years');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['extracurricular_id', 'student_id', 'academic_year_id'], 'uq_extra_members_extra_student_year');
    table.index(['extracurricular_id'], 'idx_extra_members_extra');
    table.index(['student_id'], 'idx_extra_members_student');
    table.index(['academic_year_id'], 'idx_extra_members_academic_year');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('extracurricular_members');
};
