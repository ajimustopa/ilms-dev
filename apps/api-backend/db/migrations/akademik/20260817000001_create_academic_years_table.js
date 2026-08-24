/**
 * Migration: create_academic_years_table
 * Modul Akademik - Fitur: Tahun Ajaran (Academic Years)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('academic_years', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.boolean('is_active').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['is_active'], 'idx_academic_years_is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('academic_years');
};
