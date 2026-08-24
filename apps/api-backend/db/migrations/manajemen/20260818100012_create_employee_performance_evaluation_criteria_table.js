/**
 * Migration: create_employee_performance_evaluation_criteria_table
 * Modul Manajemen - Fitur #194: Kriteria Penilaian Kinerja Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_performance_evaluation_criteria', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_performance_evaluation_id').unsigned().notNullable();
    table.string('criteria_name', 150).notNullable();
    table.decimal('weight', 5, 2).nullable();
    table.decimal('score', 5, 2).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('employee_performance_evaluation_id', 'fk_epec_eval')
      .references('id')
      .inTable('employee_performance_evaluations')
      .onDelete('CASCADE');

    table.index(['employee_performance_evaluation_id'], 'idx_epec_eval');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_performance_evaluation_criteria');
};
