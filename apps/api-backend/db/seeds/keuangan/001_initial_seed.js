/**
 * Initial Database Seed for Keuangan Module
 * 
 * Data Dummy awal disesuaikan 100% dengan skema fisik migrasi Knex (db/migrations/keuangan/):
 * - 2 Rekening Kas / Bank (Kas Tunai, Bank BSI Operasional)
 * - 8 Akun Chart of Accounts (Aset, Kas & Bank, Pendapatan, Pendapatan SPP, Pendapatan Lain, Beban, Beban Operasional, Beban Gaji)
 * - 4 Mapping Akun Transaksi Wajib (student_bill_payment, other_income, expense, payroll_disbursement)
 * - 2 Kelompok Biaya (Biaya Rutin Bulanan, Biaya Awal Tahun)
 * - 2 Jenis Biaya (SPP - monthly, Uang Gedung / DSP - yearly)
 * - 1 Nominal Biaya Acuan (SPP Grade Level 1 Rp 350.000)
 * - 2 Kategori Transaksi Khusus (ATK & Operasional Kantor, Donasi & Infaq)
 * - 1 Program Kegiatan Anggaran
 * - 1 Standar Biaya / Katalog Item
 * - 1 Tagihan Siswa Dummy (SPP Agustus 2026 Rp 350.000 - unpaid)
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

  // 1. Seed cash_accounts (Kolom: id, school_unit_id, name, account_kind, bank_account_number, bank_name, is_active)
  await knex('cash_accounts').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Kas Utama Tunai',
      account_kind: 'cash',
      bank_account_number: null,
      bank_name: null,
      is_active: true
    },
    {
      id: 2,
      school_unit_id: 1,
      name: 'Bank BSI Operasional',
      account_kind: 'bank',
      bank_account_number: '7123456789',
      bank_name: 'Bank Syariah Indonesia',
      is_active: true
    }
  ]);

  // 2. Seed chart_of_accounts (Kolom: id, school_unit_id, account_code, account_name, account_group, parent_account_id, level, is_active)
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
      account_code: '4-200',
      account_name: 'Pendapatan Lain / Non-SPP',
      account_group: 'revenue',
      parent_account_id: 3,
      level: 2,
      is_active: true
    },
    {
      id: 6,
      school_unit_id: 1,
      account_code: '6-000',
      account_name: 'Beban',
      account_group: 'expense',
      parent_account_id: null,
      level: 1,
      is_active: true
    },
    {
      id: 7,
      school_unit_id: 1,
      account_code: '6-100',
      account_name: 'Beban Operasional',
      account_group: 'expense',
      parent_account_id: 6,
      level: 2,
      is_active: true
    },
    {
      id: 8,
      school_unit_id: 1,
      account_code: '6-200',
      account_name: 'Beban Gaji & Honor Pegawai',
      account_group: 'expense',
      parent_account_id: 6,
      level: 2,
      is_active: true
    }
  ]);

  // 3. Seed transaction_account_mappings untuk 4 Transaksi Wajib
  // (Kolom: id, school_unit_id, transaction_code, transaction_label, debit_account_id, credit_account_id)
  await knex('transaction_account_mappings').insert([
    {
      id: 1,
      school_unit_id: 1,
      transaction_code: 'student_bill_payment',
      transaction_label: 'Penerimaan Pembayaran SPP / Tagihan Siswa',
      debit_account_id: 2, // Kas & Bank
      credit_account_id: 4 // Pendapatan SPP
    },
    {
      id: 2,
      school_unit_id: 1,
      transaction_code: 'other_income',
      transaction_label: 'Penerimaan Pendapatan Lain / Non-SPP',
      debit_account_id: 2, // Kas & Bank
      credit_account_id: 5 // Pendapatan Lain / Non-SPP
    },
    {
      id: 3,
      school_unit_id: 1,
      transaction_code: 'expense',
      transaction_label: 'Pengeluaran Operasional / Non-Gaji',
      debit_account_id: 7, // Beban Operasional
      credit_account_id: 2 // Kas & Bank
    },
    {
      id: 4,
      school_unit_id: 1,
      transaction_code: 'payroll_disbursement',
      transaction_label: 'Pencairan Gaji & Honor Pegawai',
      debit_account_id: 8, // Beban Gaji & Honor Pegawai
      credit_account_id: 2 // Kas & Bank
    }
  ]);

  // 4. Seed fee_groups (Kolom: id, school_unit_id, name)
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

  // 5. Seed fee_types (Kolom: id, school_unit_id, fee_group_id, name, billing_pattern, is_active)
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

  // 6. Seed fee_reference_amounts (Kolom: id, fee_type_id, school_unit_id, grade_level_id, reference_amount)
  await knex('fee_reference_amounts').insert([
    {
      id: 1,
      fee_type_id: 1,
      school_unit_id: 1,
      grade_level_id: 1,
      reference_amount: 350000.00
    }
  ]);

  // 7. Seed transaction_categories (Kolom: id, school_unit_id, category_kind, name, related_account_id)
  await knex('transaction_categories').insert([
    {
      id: 1,
      school_unit_id: 1,
      category_kind: 'expense',
      name: 'ATK & Operasional Kantor',
      related_account_id: 7
    },
    {
      id: 2,
      school_unit_id: 1,
      category_kind: 'special_income',
      name: 'Donasi & Infaq Sekolah',
      related_account_id: 5
    }
  ]);

  // 8. Seed budget_programs (Kolom: id, school_unit_id, academic_year_id, name, rks_reference_id)
  await knex('budget_programs').insert([
    {
      id: 1,
      school_unit_id: 1,
      academic_year_id: 1,
      name: 'Pengembangan Sarana Pembelajaran',
      rks_reference_id: null
    }
  ]);

  // 9. Seed catalog_items (Kolom: id, school_unit_id, name, unit, reference_price)
  await knex('catalog_items').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Kertas HVS A4 80gr',
      unit: 'Rim',
      reference_price: 55000.00
    }
  ]);

  // 10. Seed student_bills (Kolom: id, school_unit_id, student_id, fee_type_id, period_month, period_year, amount, due_date, status)
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
