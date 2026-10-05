/**
 * Migration: add_canteen_capital_and_pos_share_coa
 * Modul Keuangan - Menambahkan COA Modal Unit Usaha Kantin, Pendapatan Bagi Hasil POS, Beban Operasional, dan Utang Vendor Kantin
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Akun Modal Unit Usaha Mandiri Kantin (30105 / 31105)
  const existingCapitalCoa = await knex('chart_of_accounts')
    .where({ account_code: '30105' })
    .first();

  if (!existingCapitalCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '30105',
      account_name: 'Modal Unit Usaha Mandiri Kantin',
      account_group: 'modal',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  }

  // 2. Akun Pendapatan Bagi Hasil Penjualan POS Kantin (61800)
  const existingPosRevCoa = await knex('chart_of_accounts')
    .where({ account_code: '61800' })
    .first();

  if (!existingPosRevCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '61800',
      account_name: 'Pendapatan Bagi Hasil Penjualan POS Kantin',
      account_group: 'pendapatan',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  }

  // 3. Akun Beban Operasional Kantin (79201)
  const existingExpenseCoa = await knex('chart_of_accounts')
    .where({ account_code: '79201' })
    .first();

  if (!existingExpenseCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '79201',
      account_name: 'Beban Operasional Kantin',
      account_group: 'biaya',
      normal_balance: 'debit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  }

  // 4. Akun Utang Bagi Hasil Mitra/Vendor Kantin (40501)
  const existingVendorDebtCoa = await knex('chart_of_accounts')
    .where({ account_code: '40501' })
    .first();

  if (!existingVendorDebtCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '40501',
      account_name: 'Utang Bagi Hasil Mitra/Vendor Kantin',
      account_group: 'utang',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  }

  // 5. Update ENUM source_type di journal_entries
  try {
    await knex.raw(`
      ALTER TABLE \`journal_entries\` 
      MODIFY COLUMN \`source_type\` ENUM(
        'student_bill_payment', 
        'student_bill_issued', 
        'other_income', 
        'expense', 
        'payroll_disbursement', 
        'opening_balance', 
        'cash_transfer',
        'canteen_wallet_topup',
        'canteen_wallet_withdrawal',
        'canteen_operational_expense',
        'canteen_operational_income',
        'canteen_capital_injection',
        'manual'
      ) NOT NULL
    `);
  } catch (_) {}
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Safe rollback
};
