/**
 * Migration: create_payroll_disbursements_table
 * Modul Keuangan - Fitur #25: Penggajian Pegawai / Disbursement
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('payroll_disbursements', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.integer('period_month').unsigned().notNullable();
    table.integer('period_year').unsigned().notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.bigInteger('cash_account_id').unsigned().notNullable()
      .references('id').inTable('cash_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('disbursed_at').nullable();
    table.enum('status', ['pending', 'disbursed', 'failed']).notNullable().defaultTo('pending');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'period_year', 'period_month'], 'uq_payroll');
    table.index(['school_unit_id'], 'idx_payroll_disbursements_school_unit');
    table.index(['cash_account_id'], 'idx_payroll_disbursements_cash_account');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payroll_disbursements');
};
