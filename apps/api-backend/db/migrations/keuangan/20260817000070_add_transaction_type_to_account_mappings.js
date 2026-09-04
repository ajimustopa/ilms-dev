/**
 * Migration: add_transaction_type_to_account_mappings
 * Modul Keuangan - Menambahkan kolom transaction_type pada transaction_account_mappings
 * dan menstandarisasi seluruh aturan transaksi default dan kustom.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('transaction_account_mappings', 'transaction_type');
  if (!hasCol) {
    await knex.schema.alterTable('transaction_account_mappings', (table) => {
      table.enum('transaction_type', ['penambahan_kas', 'pengurangan_kas', 'non_kas', 'pemindahan_kas'])
        .notNullable()
        .defaultTo('non_kas')
        .after('transaction_label');
    });
  }

  // Backfill kategori transaksi berdasarkan kode transaksi
  // 1. Penambahan Kas (Cash In)
  await knex('transaction_account_mappings')
    .whereIn('transaction_code', [
      'student_bill_payment',
      'other_income_default',
      'savings_deposit',
      'ppdb_registration_income'
    ])
    .update({ transaction_type: 'penambahan_kas' });

  // 2. Pengurangan Kas (Cash Out)
  await knex('transaction_account_mappings')
    .whereIn('transaction_code', [
      'expense_default',
      'payroll_disbursement',
      'savings_withdrawal',
      'student_bill_refund',
      'ppdb_refund_issued'
    ])
    .update({ transaction_type: 'pengurangan_kas' });

  // 3. Pemindahan Kas (Cash Transfer)
  await knex('transaction_account_mappings')
    .whereIn('transaction_code', [
      'internal_cash_transfer',
      'opening_balance_entry'
    ])
    .update({ transaction_type: 'pemindahan_kas' });

  // 4. Non-Kas (Accrual / Piutang / Penyesuaian / Tutup Buku)
  await knex('transaction_account_mappings')
    .whereIn('transaction_code', [
      'student_bill_issued',
      'student_bill_discount',
      'student_bill_write_off',
      'fiscal_year_closing_revenue',
      'fiscal_year_closing_expense',
      'fiscal_year_closing_net',
      'manual_journal_entry',
      'ppdb_bill_issued'
    ])
    .update({ transaction_type: 'non_kas' });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('transaction_account_mappings', 'transaction_type');
  if (hasCol) {
    await knex.schema.alterTable('transaction_account_mappings', (table) => {
      table.dropColumn('transaction_type');
    });
  }
};
