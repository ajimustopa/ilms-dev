/**
 * Migration: create_semesters_table
 * Modul Akademik - Fitur: Semester
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('semesters', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('academic_year_id').unsigned().notNullable()
      .references('id').inTable('academic_years');
    table.enum('name', ['ganjil', 'genap']).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.boolean('is_active').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['academic_year_id'], 'idx_semesters_academic_year');
    table.index(['is_active'], 'idx_semesters_is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('semesters');
};
