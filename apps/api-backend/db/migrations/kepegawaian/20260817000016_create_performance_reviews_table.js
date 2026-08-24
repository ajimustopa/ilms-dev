/**
 * Migration: create_performance_reviews_table
 * Modul Kepegawaian - Fitur: Penilaian Kinerja Dasar (Harian/Bulanan)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('performance_reviews', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('reviewer_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.string('period', 20).notNullable();
    table.decimal('score', 5, 2).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('performance_reviews');
};
