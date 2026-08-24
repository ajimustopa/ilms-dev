/**
 * Initial Database Seed for Keuangan Module
 * 
 * Data Dummy berdasarkan erd-keuangan.md Bagian 3.2:
 * - 2 Rekening Kas / Bank (Kas Tunai, Bank BCA)
 * - 6 Akun Chart of Accounts (Aset, Kas & Bank, Pendapatan, Pendapatan SPP, Beban, Beban Operasional)
 * - 2 Kelompok Biaya (Biaya Rutin Bulanan, Biaya Awal Tahun)
 * - 2 Jenis Biaya (SPP - bulanan, Uang Gedung / DSP - tahunan)
 * - 1 Nominal Biaya Acuan (SPP Grade Level 1 Rp 350.000)
 * - 1 Tagihan Siswa Dummy (SPP Agustus 2026 Rp 350.000 - unpaid)
 * 
 * Catatan:
 * - academic_year_id, student_id, grade_level_id, employee_id memakai ID dummy (1)
 *   sesuai catatan di ERD untuk keperluan uji struktur modul Keuangan mandiri.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Nonaktifkan pemeriksaan foreign key untuk pembersihan data (idempotent seed)
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  // Bersihkan seluruh 28 tabel modul keuangan
  await knex('finance_audit_logs').truncate();
  await knex('fiscal_year_closings').truncate();
  await knex('savings_transactions').truncate();
  await knex('savings_accounts').truncate();
  await knex('journal_entry_lines').truncate();
  await knex('journal_entries').truncate();
  await knex('payroll_disbursements').truncate();
  await knex('expenses').truncate();
  await knex('other_incomes').truncate();
  await knex('payment_reconciliations').truncate();
  await knex('payment_gateway_transactions').truncate();
  await knex('bill_payments').truncate();
  await knex('bill_reminder_logs').truncate();
  await knex('student_bills').truncate();
  await knex('budget_plan_expense_items').truncate();
  await knex('budget_plan_income_items').truncate();
  await knex('budget_plans').truncate();
  await knex('student_fee_adjustments').truncate();
  await knex('catalog_items').truncate();
  await knex('budget_programs').truncate();
  await knex('transaction_categories').truncate();
  await knex('fee_reference_amounts').truncate();
  await knex('fee_types').truncate();
  await knex('fee_groups').truncate();
  await knex('transaction_account_mappings').truncate();
  await knex('cash_account_opening_balances').truncate();
  await knex('chart_of_accounts').truncate();
  await knex('cash_accounts').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Seed cash_accounts
  await knex('cash_accounts').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Kas Tunai SD Contoh 1',
      account_kind: 'cash',
      bank_account_number: null,
      bank_name: null,
      is_active: true
    },
    {
      id: 2,
      school_unit_id: 1,
      name: 'Bank BCA SD Contoh 1',
      account_kind: 'bank',
      bank_account_number: null,
      bank_name: null,
      is_active: true
    }
  ]);

  // 2. Seed chart_of_accounts
  await knex('chart_of_accounts').insert([
    {
      id: 1,
      school_unit_id: 1,
      account_code: '1-000',
      account_name: 'Aset',
      account_group: 'asset',
      parent_account_id: null,
      level: 1,
      is_active: true
    },
    {
      id: 2,
      school_unit_id: 1,
      account_code: '1-100',
      account_name: 'Kas & Bank',
      account_group: 'asset',
      parent_account_id: 1,
      level: 2,
      is_active: true
    },
    {
      id: 3,
      school_unit_id: 1,
      account_code: '4-000',
      account_name: 'Pendapatan',
      account_group: 'revenue',
      parent_account_id: null,
      level: 1,
      is_active: true
    },
    {
      id: 4,
      school_unit_id: 1,
      account_code: '4-100',
      account_name: 'Pendapatan SPP',
      account_group: 'revenue',
      parent_account_id: 3,
      level: 2,
      is_active: true
    },
    {
      id: 5,
      school_unit_id: 1,
      account_code: '6-000',
      account_name: 'Beban',
      account_group: 'expense',
      parent_account_id: null,
      level: 1,
      is_active: true
    },
    {
      id: 6,
      school_unit_id: 1,
      account_code: '6-100',
      account_name: 'Beban Operasional',
      account_group: 'expense',
      parent_account_id: 5,
      level: 2,
      is_active: true
    }
  ]);

  // 3. Seed fee_groups
  await knex('fee_groups').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Biaya Rutin Bulanan'
    },
    {
      id: 2,
      school_unit_id: 1,
      name: 'Biaya Awal Tahun'
    }
  ]);

  // 4. Seed fee_types
  await knex('fee_types').insert([
    {
      id: 1,
      school_unit_id: 1,
      fee_group_id: 1,
      name: 'SPP',
      billing_pattern: 'monthly',
      is_active: true
    },
    {
      id: 2,
      school_unit_id: 1,
      fee_group_id: 2,
      name: 'Uang Gedung / DSP',
      billing_pattern: 'yearly',
      is_active: true
    }
  ]);

  // 5. Seed fee_reference_amounts
  await knex('fee_reference_amounts').insert([
    {
      id: 1,
      fee_type_id: 1,
      school_unit_id: 1,
      grade_level_id: 1,
      reference_amount: 350000.00
    }
  ]);

  // 6. Seed student_bills
  await knex('student_bills').insert([
    {
      id: 1,
      school_unit_id: 1,
      student_id: 1,
      fee_type_id: 1,
      period_month: 8,
      period_year: 2026,
      amount: 350000.00,
      due_date: '2026-08-10',
      status: 'unpaid'
    }
  ]);
};
