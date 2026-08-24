/**
 * Migration: create_employee_position_history_table
 * Modul Kepegawaian - Fitur: Riwayat Jabatan & Golongan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_position_history', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.bigInteger('position_id').unsigned().nullable()
      .references('id').inTable('job_positions');
    table.string('rank', 100).nullable();
    table.date('effective_date').notNullable();
    table.date('end_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id', 'effective_date'], 'idx_eph_employee_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_position_history');
};
