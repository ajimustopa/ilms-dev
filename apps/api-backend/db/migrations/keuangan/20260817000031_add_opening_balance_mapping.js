/**
 * Migration: add_opening_balance_mapping
 * Modul Keuangan - Menambahkan Akun Modal Awal & Mapping Jurnal Saldo Awal
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Cek atau buat akun Modal Awal untuk school_unit_id = 1 (dan unit lain jika ada)
  const existingModalHeader = await knex('chart_of_accounts')
    .where({ school_unit_id: 1, account_code: '3-000' })
    .first();

  let modalHeaderId = existingModalHeader?.id;
  if (!modalHeaderId) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 1,
      account_code: '3-000',
      account_name: 'Modal & Ekuitas',
      account_group: 'modal',
      normal_balance: 'credit',
      parent_account_id: null,
      level: 1,
      is_active: true
    });
    modalHeaderId = id;
  }

  const existingModalDetail = await knex('chart_of_accounts')
    .where({ school_unit_id: 1, account_code: '3-100' })
    .first();

  let modalDetailId = existingModalDetail?.id;
  if (!modalDetailId) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 1,
      account_code: '3-100',
      account_name: 'Modal Awal / Saldo Awal Kas',
      account_group: 'modal',
      normal_balance: 'credit',
      parent_account_id: modalHeaderId,
      level: 2,
      is_active: true
    });
    modalDetailId = id;
  }

  // 2. Ambil akun Kas & Bank (1-100 atau id=2 atau fallback akun harta pertama)
  const kasAccount = await knex('chart_of_accounts')
    .where({ school_unit_id: 1, account_code: '1-100' })
    .first();
  const kasAccountId = kasAccount ? kasAccount.id : 2;

  // 3. Tambahkan mapping 'opening_balance_entry' jika belum ada
  const existingMapping = await knex('transaction_account_mappings')
    .where({ school_unit_id: 1, transaction_code: 'opening_balance_entry' })
    .first();

  if (!existingMapping) {
    await knex('transaction_account_mappings').insert({
      school_unit_id: 1,
      transaction_code: 'opening_balance_entry',
      transaction_label: 'Pencatatan Saldo Awal Kas & Bank',
      debit_account_id: kasAccountId,
      credit_account_id: modalDetailId
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex('transaction_account_mappings')
    .where({ transaction_code: 'opening_balance_entry' })
    .delete();
};
