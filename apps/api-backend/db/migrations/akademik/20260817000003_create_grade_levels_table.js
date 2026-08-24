/**
 * Migration: create_grade_levels_table
 * Modul Akademik - Fitur: Tingkat / Jenjang Kelas (Grade Levels)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('grade_levels', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 50).notNullable();
    table.smallint('order').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['order'], 'idx_grade_levels_order');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('grade_levels');
};
