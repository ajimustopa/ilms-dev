/**
 * Migration 54: Create Inter-Year Fund Loans and Repayments Tables
 * Modul: Keuangan (fund-balances layer)
 */
exports.up = async function(knex) {
  const hasLoansTable = await knex.schema.hasTable('inter_year_fund_loans');
  if (!hasLoansTable) {
    await knex.schema.createTable('inter_year_fund_loans', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('from_academic_year_id').unsigned().notNullable();
      table.bigInteger('to_academic_year_id').unsigned().notNullable();
      table.string('fund_type', 50).notNullable().defaultTo('fee_type');
      table.bigInteger('fund_ref_id').unsigned().notNullable().defaultTo(0);
      table.string('to_fund_type', 50).notNullable().defaultTo('fee_type');
      table.bigInteger('to_fund_ref_id').unsigned().notNullable().defaultTo(0);
      table.decimal('amount', 18, 2).notNullable();
      table.text('purpose').notNullable();
      table.enum('status', ['outstanding', 'partially_repaid', 'repaid']).notNullable().defaultTo('outstanding');
      table.decimal('outstanding_amount', 18, 2).notNullable();
      table.bigInteger('borrowed_by').unsigned().nullable();
      table.date('borrowed_at').notNullable();
      table.string('expected_repayment_note', 255).nullable();
      table.timestamps(true, true);

      // Indexes
      table.index(['school_unit_id'], 'idx_iyfl_unit');
      table.index(['status'], 'idx_iyfl_status');
      table.index(['from_academic_year_id'], 'idx_iyfl_from_ay');
      table.index(['to_academic_year_id'], 'idx_iyfl_to_ay');
    });
  }

  const hasRepaymentsTable = await knex.schema.hasTable('inter_year_fund_loan_repayments');
  if (!hasRepaymentsTable) {
    await knex.schema.createTable('inter_year_fund_loan_repayments', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('inter_year_fund_loan_id').unsigned().notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.date('repaid_at').notNullable();
      table.bigInteger('repaid_by').unsigned().nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('inter_year_fund_loan_id')
        .references('id')
        .inTable('inter_year_fund_loans')
        .onDelete('CASCADE');

      table.index(['inter_year_fund_loan_id'], 'idx_iyflr_loan');
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('inter_year_fund_loan_repayments');
  await knex.schema.dropTableIfExists('inter_year_fund_loans');
};
