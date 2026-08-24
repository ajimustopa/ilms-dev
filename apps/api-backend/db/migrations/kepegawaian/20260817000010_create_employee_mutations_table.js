/**
 * Migration: create_employee_mutations_table
 * Modul Kepegawaian - Fitur: Riwayat Mutasi/Promosi Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_mutations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.enum('mutation_type', ['promotion', 'transfer', 'demotion']).notNullable();
    table.bigInteger('old_position_id').unsigned().nullable()
      .references('id').inTable('job_positions');
    table.bigInteger('new_position_id').unsigned().nullable()
      .references('id').inTable('job_positions');
    table.date('mutation_date').notNullable();
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
  return knex.schema.dropTableIfExists('employee_mutations');
};
