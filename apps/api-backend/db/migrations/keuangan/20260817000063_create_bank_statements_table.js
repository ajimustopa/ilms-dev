/**
 * Migration 63: Create bank_statements table
 * Module: Keuangan - Rekening Koran & Rekonsiliasi Bank
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('bank_statements');
  if (!hasTable) {
    await knex.schema.createTable('bank_statements', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().nullable();
      table.bigInteger('cash_account_id').unsigned().notNullable()
        .references('id').inTable('cash_accounts').onDelete('RESTRICT');
      
      table.timestamp('transaction_date').notNullable();
      table.string('journal_number', 100).nullable();
      table.text('description').notNullable();
      table.decimal('amount', 15, 2).notNullable().defaultTo(0.00);
      table.enu('dc_type', ['debit', 'credit']).notNullable();
      table.decimal('running_balance', 15, 2).nullable();
      
      table.boolean('is_reconciled').notNullable().defaultTo(false);
      table.enu('reconciled_reference_type', [
        'student_bill_payment',
        'other_income',
        'expense',
        'payroll',
        'cash_transfer',
        'other'
      ]).nullable();
      table.bigInteger('reconciled_reference_id').unsigned().nullable();
      table.timestamp('reconciled_at').nullable();
      table.bigInteger('reconciled_by').unsigned().nullable();
      table.string('reconciliation_notes', 255).nullable();
      
      table.string('import_batch_id', 100).nullable();
      table.timestamps(true, true);

      // Indexes
      table.index(['school_unit_id', 'cash_account_id'], 'idx_bank_stmt_unit_acc');
      table.index(['transaction_date'], 'idx_bank_stmt_tx_date');
      table.index(['is_reconciled'], 'idx_bank_stmt_reconciled');
      table.index(['reconciled_reference_type', 'reconciled_reference_id'], 'idx_bank_stmt_ref');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('bank_statements');
  if (hasTable) {
    await knex.schema.dropTable('bank_statements');
  }
};
