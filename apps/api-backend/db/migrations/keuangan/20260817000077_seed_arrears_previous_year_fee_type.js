/**
 * Migration: seed_arrears_previous_year_fee_type
 * Modul Keuangan - Menambahkan Jenis Biaya Terkunci 'Tunggakan Tahun Ajaran Sebelumnya' (arrears_previous_year),
 * COA Piutang & Pendapatan terkait, serta Aturan Transaksi Penerbitan & Pembayaran.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Pastikan Kas Account BSI (10201) tersedia
  const bsiCoa = await knex('chart_of_accounts').where('account_code', '10201').first();
  const bsiCoaId = bsiCoa ? bsiCoa.id : null;

  // 2. Buat atau cari COA Piutang Tunggakan TP Sebelumnya (210)
  let piutangCoa = await knex('chart_of_accounts')
    .where('account_code', '210')
    .orWhere('account_name', 'Piutang Tunggakan TP Sebelumnya')
    .first();

  if (!piutangCoa) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '210',
      account_name: 'Piutang Tunggakan TP Sebelumnya',
      account_group: 'piutang',
      normal_balance: 'debit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
    piutangCoa = await knex('chart_of_accounts').where({ id }).first();
  }

  // 3. Buat atau cari COA Pendapatan Tunggakan TP Sebelumnya (618)
  let pendapatanCoa = await knex('chart_of_accounts')
    .where('account_code', '618')
    .orWhere('account_name', 'Pendapatan Tunggakan TP Sebelumnya')
    .first();

  if (!pendapatanCoa) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '618',
      account_name: 'Pendapatan Tunggakan TP Sebelumnya',
      account_group: 'pendapatan',
      normal_balance: 'kredit',
      parent_account_id: null,
      level: 1,
      is_active: 1
    });
    pendapatanCoa = await knex('chart_of_accounts').where({ id }).first();
  }

  // 4. Buat Aturan Transaksi Penerbitan Tagihan (Non-Kas)
  let billRule = await knex('transaction_account_mappings')
    .where('transaction_code', 'bill_issued_tunggakan_tp_lalu')
    .first();

  if (!billRule) {
    const [id] = await knex('transaction_account_mappings').insert({
      school_unit_id: 0,
      transaction_code: 'bill_issued_tunggakan_tp_lalu',
      transaction_label: 'Penerbitan Tagihan Tunggakan TP Sebelumnya',
      transaction_type: 'bill_issuance',
      debit_account_id: piutangCoa ? piutangCoa.id : null,
      credit_account_id: pendapatanCoa ? pendapatanCoa.id : null,
      is_system: 1,
      is_active: 1
    });
    billRule = await knex('transaction_account_mappings').where({ id }).first();
  }

  // 5. Buat Aturan Transaksi Pembayaran Tagihan
  let payRule = await knex('transaction_account_mappings')
    .where('transaction_code', 'bill_payment_tunggakan_tp_lalu')
    .first();

  if (!payRule) {
    const [id] = await knex('transaction_account_mappings').insert({
      school_unit_id: 0,
      transaction_code: 'bill_payment_tunggakan_tp_lalu',
      transaction_label: 'Pembayaran Tagihan Tunggakan TP Sebelumnya',
      transaction_type: 'bill_payment',
      debit_account_id: bsiCoaId,
      credit_account_id: piutangCoa ? piutangCoa.id : null,
      is_system: 1,
      is_active: 1
    });
    payRule = await knex('transaction_account_mappings').where({ id }).first();
  }

  // 6. Buat / Update Jenis Biaya 'Tunggakan Tahun Ajaran Sebelumnya' (Locked System Fee Type)
  const existingFeeType = await knex('fee_types')
    .where('code', 'arrears_previous_year')
    .orWhere('name', 'Tunggakan Tahun Ajaran Sebelumnya')
    .first();

  if (!existingFeeType) {
    await knex('fee_types').insert({
      school_unit_id: 0,
      fee_group_id: null,
      code: 'arrears_previous_year',
      name: 'Tunggakan Tahun Ajaran Sebelumnya',
      billing_pattern: 'incidental',
      description: 'Jenis biaya sistem terkunci untuk mengakomodir saldo piutang dan tagihan tunggakan tahun ajaran sebelumnya secara manual maupun akumulatif.',
      related_revenue_account_id: pendapatanCoa ? pendapatanCoa.id : null,
      billing_account_mapping_id: billRule ? billRule.id : null,
      payment_account_mapping_id: payRule ? payRule.id : null,
      is_active: true,
      is_system: true
    });
  } else {
    await knex('fee_types')
      .where({ id: existingFeeType.id })
      .update({
        code: 'arrears_previous_year',
        name: 'Tunggakan Tahun Ajaran Sebelumnya',
        billing_pattern: 'incidental',
        description: 'Jenis biaya sistem terkunci untuk mengakomodir saldo piutang dan tagihan tunggakan tahun ajaran sebelumnya secara manual maupun akumulatif.',
        related_revenue_account_id: existingFeeType.related_revenue_account_id || (pendapatanCoa ? pendapatanCoa.id : null),
        billing_account_mapping_id: existingFeeType.billing_account_mapping_id || (billRule ? billRule.id : null),
        payment_account_mapping_id: existingFeeType.payment_account_mapping_id || (payRule ? payRule.id : null),
        is_active: true,
        is_system: true
      });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex('fee_types').where({ code: 'arrears_previous_year' }).delete();
  await knex('transaction_account_mappings').whereIn('transaction_code', [
    'bill_issued_tunggakan_tp_lalu',
    'bill_payment_tunggakan_tp_lalu'
  ]).delete();
  await knex('chart_of_accounts').whereIn('account_code', ['210', '618']).delete();
};
