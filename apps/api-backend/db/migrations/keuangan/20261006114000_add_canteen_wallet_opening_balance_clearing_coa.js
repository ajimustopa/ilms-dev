/**
 * Migration: add_canteen_wallet_opening_balance_clearing_coa
 * Modul Keuangan - Menambahkan COA Akun Kliring / Penyeimbang Saldo Awal Dompet Santri (50199)
 * untuk pencatatan cutover saldo awal dompet siswa tanpa menduplikasi saldo kas aktif.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Akun Kliring / Penyeimbang Saldo Awal Dompet Santri (50199)
  const existingClearingCoa = await knex('chart_of_accounts')
    .where({ account_code: '50199' })
    .first();

  if (!existingClearingCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '50199',
      account_name: 'Penyeimbang Saldo Awal Dompet Santri',
      account_group: 'modal',
      normal_balance: 'debit',
      parent_account_id: null,
      level: 1,
      is_active: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  } else {
    await knex('chart_of_accounts')
      .where({ id: existingClearingCoa.id })
      .update({
        account_name: 'Penyeimbang Saldo Awal Dompet Santri',
        account_group: 'modal',
        normal_balance: 'debit',
        is_active: 1,
        updated_at: knex.fn.now()
      });
  }

  // 2. Pastikan akun Kewajiban Titipan Dompet Santri (404) juga aktif
  const existingWalletCoa = await knex('chart_of_accounts')
    .where({ account_code: '404' })
    .first();

  if (!existingWalletCoa) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '404',
      account_name: 'Dana Titipan Dompet Santri',
      account_group: 'utang',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Safe rollback
};
