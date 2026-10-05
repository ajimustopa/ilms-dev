/**
 * Migration: add vendor_fee_payment_id to sales_transaction_items and enhance vendor_fee_payments
 * Sesuai kebutuhan penyerahan hak bagi hasil vendor & rekonsiliasi pengeluaran kas
 */
exports.up = function(knex) {
  return knex.schema
    .table('sales_transaction_items', function(table) {
      table.bigInteger('vendor_fee_payment_id').unsigned().nullable()
        .references('id').inTable('vendor_fee_payments').onDelete('SET NULL');
      table.index('vendor_fee_payment_id', 'idx_sti_vendor_fee_payment');
    })
    .table('vendor_fee_payments', function(table) {
      table.string('receipt_number', 50).nullable();
      table.bigInteger('finance_expense_id').unsigned().nullable();
      table.string('finance_receipt_number', 50).nullable();
      table.bigInteger('cash_account_id').unsigned().nullable();
      table.bigInteger('coa_account_id').unsigned().nullable();
      table.bigInteger('bank_statement_id').unsigned().nullable();
      table.text('notes').nullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('sales_transaction_items', function(table) {
      table.dropForeign(['vendor_fee_payment_id']);
      table.dropIndex('vendor_fee_payment_id', 'idx_sti_vendor_fee_payment');
      table.dropColumn('vendor_fee_payment_id');
    })
    .table('vendor_fee_payments', function(table) {
      table.dropColumn([
        'receipt_number',
        'finance_expense_id',
        'finance_receipt_number',
        'cash_account_id',
        'coa_account_id',
        'bank_statement_id',
        'notes'
      ]);
    });
};
