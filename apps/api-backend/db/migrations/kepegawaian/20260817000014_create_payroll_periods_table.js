/**
 * Migration: create_payroll_periods_table
 * Modul Kepegawaian - Fitur: Periode Penggajian (Payroll)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('payroll_periods', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.specificType('period_month', 'tinyint unsigned').notNullable();
    table.specificType('period_year', 'smallint unsigned').notNullable();
    table.enum('status', ['draft', 'calculated', 'verified', 'sent_to_finance']).notNullable().defaultTo('draft');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'period_month', 'period_year'], 'uq_payroll_period');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payroll_periods');
};
