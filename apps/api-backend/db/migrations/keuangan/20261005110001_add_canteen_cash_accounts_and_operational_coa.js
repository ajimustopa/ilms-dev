/**
 * Migration: add_canteen_cash_accounts_and_operational_coa
 * Modul Keuangan - Menambahkan akun Kas Tunai Kantin, COA Operasional Kantin, dan enum journal_entries
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Update ENUM source_type di journal_entries
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
      'manual'
    ) NOT NULL
  `);

  // 2. Tambah COA Kas Tunai Kantin (10103) jika belum ada
  let cashTunaiCoa = await knex('chart_of_accounts')
    .where({ account_code: '10103' })
    .first();

  if (!cashTunaiCoa) {
    const [insertedId] = await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '10103',
      account_name: 'Kas Tunai Kantin',
      account_group: 'harta',
      normal_balance: 'debit',
      parent_account_id: 1,
      level: 2,
      is_active: 1
    });
    cashTunaiCoa = { id: insertedId };
  }

  // 3. Tambah COA Pendapatan Operasional Unit Usaha Kantin (617)
  const existingIncomeCoa = await knex('chart_of_accounts')
    .where({ account_code: '617' })
    .first();

  if (!existingIncomeCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '617',
      account_name: 'Pendapatan Operasional Unit Usaha Kantin',
      account_group: 'pendapatan',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  }

  // 4. Tambah COA Beban Operasional Kantin (79200)
  const existingExpenseCoa = await knex('chart_of_accounts')
    .where({ account_code: '79200' })
    .first();

  if (!existingExpenseCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '79200',
      account_name: 'Beban Operasional Kantin',
      account_group: 'biaya',
      normal_balance: 'debit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  }

  // 5. Tambah akun kas "Kas Tunai Kantin" ke cash_accounts
  const existingCashAccount = await knex('cash_accounts')
    .where({ name: 'Kas Tunai Kantin' })
    .first();

  if (!existingCashAccount) {
    await knex('cash_accounts').insert({
      school_unit_id: 1,
      name: 'Kas Tunai Kantin',
      account_kind: 'cash',
      bank_name: null,
      bank_account_number: null,
      account_id: cashTunaiCoa ? cashTunaiCoa.id : null,
      is_active: 1
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
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
      'manual'
    ) NOT NULL
  `);
};
