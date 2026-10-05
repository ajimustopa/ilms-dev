/**
 * Migration: add_canteen_wallet_source_type_and_coa
 * Modul Keuangan - Menambahkan source_type dompet kantin ke journal_entries dan memastikan COA / Pos Dana Dompet Santri
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambahkan source_type 'canteen_wallet_topup' dan 'canteen_wallet_withdrawal' ke tabel journal_entries
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

  // 2. Pastikan akun COA 404 (Dana Titipan Dompet Santri) ada dan aktif
  const existingCoa = await knex('chart_of_accounts')
    .where({ account_code: '404' })
    .first();

  if (!existingCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '404',
      account_name: 'Dana Titipan Dompet Santri',
      account_group: 'utang',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
  } else {
    await knex('chart_of_accounts')
      .where({ id: existingCoa.id })
      .update({
        account_name: 'Dana Titipan Dompet Santri',
        is_active: 1
      });
  }

  // 3. Pastikan Pos Sumber Dana (fund_balances) untuk dompet kantin diinisialisasi
  const schoolUnits = [0, 1, 2];
  for (const unitId of schoolUnits) {
    const existingFund = await knex('fund_balances')
      .where({
        school_unit_id: unitId,
        fund_type: 'canteen_wallet',
        fund_ref_id: 0
      })
      .first();

    if (!existingFund) {
      await knex('fund_balances').insert({
        school_unit_id: unitId,
        fund_type: 'canteen_wallet',
        fund_ref_id: 0,
        budget_plan_income_item_id: null,
        academic_year_id: 3, // TA aktif default
        balance: 0,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
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
      'manual'
    ) NOT NULL
  `);
};
