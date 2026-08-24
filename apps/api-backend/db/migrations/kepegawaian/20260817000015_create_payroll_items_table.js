/**
 * Migration: create_payroll_items_table
 * Modul Kepegawaian - Fitur: Rincian Penggajian per Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('payroll_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('payroll_period_id').unsigned().notNullable()
      .references('id').inTable('payroll_periods');
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.json('salary_components').notNullable();
    table.json('deductions').nullable();
    table.decimal('net_salary', 14, 2).notNullable();
    table.bigInteger('verified_by').unsigned().nullable()
      .references('id').inTable('employees');
    table.timestamp('verified_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['payroll_period_id', 'employee_id'], 'uq_payroll_item');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payroll_items');
};
