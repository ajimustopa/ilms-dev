/**
 * Migration 80: Create bank_statement_references table for multi-allocation / partial reconciliation
 * Module: Keuangan - Rekening Koran Multi-Reference Tracking
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('bank_statement_references');
  if (!hasTable) {
    await knex.schema.createTable('bank_statement_references', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('bank_statement_id').unsigned().notNullable()
        .references('id').inTable('bank_statements').onDelete('CASCADE');
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.enu('reference_type', [
        'student_bill_payment',
        'other_income',
        'expense',
        'payroll',
        'cash_transfer',
        'other'
      ]).notNullable();
      table.bigInteger('reference_id').unsigned().notNullable();
      table.decimal('amount', 15, 2).notNullable().defaultTo(0.00);
      table.string('notes', 255).nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      // Indexes
      table.index(['bank_statement_id'], 'idx_bs_ref_stmt_id');
      table.index(['reference_type', 'reference_id'], 'idx_bs_ref_type_id');
    });

    // Populate existing reconciled references from bank_statements
    const existingReconciled = await knex('bank_statements')
      .whereNotNull('reconciled_reference_id')
      .select('id', 'school_unit_id', 'reconciled_reference_type', 'reconciled_reference_id', 'amount', 'reconciliation_notes', 'reconciled_by', 'reconciled_at');

    for (const stmt of existingReconciled) {
      await knex('bank_statement_references').insert({
        bank_statement_id: stmt.id,
        school_unit_id: stmt.school_unit_id || null,
        reference_type: stmt.reconciled_reference_type || 'other',
        reference_id: stmt.reconciled_reference_id,
        amount: stmt.amount || 0.00,
        notes: stmt.reconciliation_notes || 'Rekonsiliasi awal',
        created_by: stmt.reconciled_by || null,
        created_at: stmt.reconciled_at || knex.fn.now(),
        updated_at: stmt.reconciled_at || knex.fn.now()
      });
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('bank_statement_references');
  if (hasTable) {
    await knex.schema.dropTable('bank_statement_references');
  }
};
