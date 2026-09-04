/**
 * Migration: seed_specific_fee_rules_and_accounts
 * Modul Keuangan - Mengisi COA piutang & pendapatan spesifik, aturan transaksi penerbitan (non-kas) & pembayaran (penambahan kas BSI 10201), serta menghubungkannya ke fee_types
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Pastikan Kas Account BSI 5114411440 tersedia
  let bsiCash = await knex('cash_accounts').where('bank_account_number', '5114411440').first();
  if (!bsiCash) {
    const [cashId] = await knex('cash_accounts').insert({
      school_unit_id: 1,
      name: 'Kas Bank Penerimaan (BSI 5114411440)',
      account_kind: 'bank',
      bank_account_number: '5114411440',
      bank_name: 'Bank Syariah Indonesia (BSI)',
      is_active: 1
    });
    bsiCash = await knex('cash_accounts').where({ id: cashId }).first();
  }

  // Akun 10201 COA
  const bsiCoa = await knex('chart_of_accounts').where('account_code', '10201').first();
  const bsiCoaId = bsiCoa ? bsiCoa.id : null;

  const feeConfigs = [
    {
      name: 'SPP',
      piutang: { code: '201', name: 'Piutang SPP' },
      pendapatan: { code: '601', name: 'Pendapatan SPP' },
      bill_code: 'bill_issued_spp',
      bill_label: 'Penerbitan Tagihan SPP',
      pay_code: 'bill_payment_spp',
      pay_label: 'Pembayaran Tagihan SPP'
    },
    {
      name: 'Pendaftaran',
      piutang: { code: '208', name: 'Piutang Pendaftaran' },
      pendapatan: { code: '613', name: 'Pendapatan Pendaftaran (PPDB)' },
      bill_code: 'bill_issued_pendaftaran',
      bill_label: 'Penerbitan Tagihan Pendaftaran',
      pay_code: 'bill_payment_pendaftaran',
      pay_label: 'Pembayaran Tagihan Pendaftaran'
    },
    {
      name: 'Penunjang Pembelajaran',
      piutang: { code: '209', name: 'Piutang Penunjang Pembelajaran' },
      pendapatan: { code: '60900', name: 'Pendapatan Penunjang Pembelajaran' },
      bill_code: 'bill_issued_penunjang_pembelajaran',
      bill_label: 'Penerbitan Tagihan Penunjang Pembelajaran',
      pay_code: 'bill_payment_penunjang_pembelajaran',
      pay_label: 'Pembayaran Tagihan Penunjang Pembelajaran'
    },
    {
      name: 'Kegiatan',
      piutang: { code: '202', name: 'Piutang Kegiatan' },
      pendapatan: { code: '602', name: 'Pendapatan Kegiatan' },
      bill_code: 'bill_issued_kegiatan',
      bill_label: 'Penerbitan Tagihan Kegiatan',
      pay_code: 'bill_payment_kegiatan',
      pay_label: 'Pembayaran Tagihan Kegiatan'
    },
    {
      name: 'Sarpras',
      piutang: { code: '205', name: 'Piutang Sarpras' },
      pendapatan: { code: '605', name: 'Pendapatan Sarpras' },
      bill_code: 'bill_issued_sarpras',
      bill_label: 'Penerbitan Tagihan Sarpras',
      pay_code: 'bill_payment_sarpras',
      pay_label: 'Pembayaran Tagihan Sarpras'
    },
    {
      name: 'Seragam',
      piutang: { code: '204', name: 'Piutang Seragam' },
      pendapatan: { code: '604', name: 'Pendapatan Seragam' },
      bill_code: 'bill_issued_seragam',
      bill_label: 'Penerbitan Tagihan Seragam',
      pay_code: 'bill_payment_seragam',
      pay_label: 'Pembayaran Tagihan Seragam'
    },
    {
      name: 'Pemeliharaan Sarpras',
      piutang: { code: '2051', name: 'Piutang Pemeliharaan Sarpras' },
      pendapatan: { code: '6051', name: 'Pendapatan Pemeliharaan Sarpras' },
      bill_code: 'bill_issued_pemeliharaan_sarpras',
      bill_label: 'Penerbitan Tagihan Pemeliharaan Sarpras',
      pay_code: 'bill_payment_pemeliharaan_sarpras',
      pay_label: 'Pembayaran Tagihan Pemeliharaan Sarpras'
    },
    {
      name: 'Bangunan',
      piutang: { code: '206', name: 'Piutang Bangunan' },
      pendapatan: { code: '606', name: 'Pendapatan Bangunan' },
      bill_code: 'bill_issued_bangunan',
      bill_label: 'Penerbitan Tagihan Bangunan',
      pay_code: 'bill_payment_bangunan',
      pay_label: 'Pembayaran Tagihan Bangunan'
    },
    {
      name: 'Kegiatan Akhir Jenjang',
      piutang: { code: '207', name: 'Piutang Kegiatan Akhir Jenjang' },
      pendapatan: { code: '607', name: 'Pendapatan Kegiatan Akhir Tahun' },
      bill_code: 'bill_issued_kegiatan_akhir_jenjang',
      bill_label: 'Penerbitan Tagihan Kegiatan Akhir Jenjang',
      pay_code: 'bill_payment_kegiatan_akhir_jenjang',
      pay_label: 'Pembayaran Tagihan Kegiatan Akhir Jenjang'
    },
    {
      name: 'Kelebihan Laundry',
      piutang: { code: '2099', name: 'Piutang Kelebihan Laundry' },
      pendapatan: { code: '6099', name: 'Pendapatan Kelebihan Laundry' },
      bill_code: 'bill_issued_kelebihan_laundry',
      bill_label: 'Penerbitan Tagihan Kelebihan Laundry',
      pay_code: 'bill_payment_kelebihan_laundry',
      pay_label: 'Pembayaran Tagihan Kelebihan Laundry'
    }
  ];

  for (const cfg of feeConfigs) {
    let piutangAcc = await knex('chart_of_accounts').where('account_code', cfg.piutang.code).first();
    if (!piutangAcc) {
      const [pId] = await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: cfg.piutang.code,
        account_name: cfg.piutang.name,
        account_group: 'piutang',
        normal_balance: 'debit',
        level: 1,
        is_active: 1
      });
      piutangAcc = await knex('chart_of_accounts').where({ id: pId }).first();
    }

    let pendapatanAcc = await knex('chart_of_accounts').where('account_code', cfg.pendapatan.code).first();
    if (!pendapatanAcc) {
      const [rId] = await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: cfg.pendapatan.code,
        account_name: cfg.pendapatan.name,
        account_group: 'pendapatan',
        normal_balance: 'credit',
        level: 1,
        is_active: 1
      });
      pendapatanAcc = await knex('chart_of_accounts').where({ id: rId }).first();
    }

    const feeType = await knex('fee_types').where('name', cfg.name).first();
    if (!feeType) continue;

    // Billing Rule (Non-Kas)
    let billRule = await knex('transaction_account_mappings').where({ transaction_code: cfg.bill_code }).first();
    if (!billRule) {
      const [bId] = await knex('transaction_account_mappings').insert({
        school_unit_id: feeType.school_unit_id || 1,
        transaction_code: cfg.bill_code,
        transaction_label: cfg.bill_label,
        transaction_type: 'non_kas',
        debit_account_id: piutangAcc.id,
        credit_account_id: pendapatanAcc.id,
        default_cash_account_id: null,
        related_fee_type_id: feeType.id,
        is_system: 0,
        is_active: 1,
        linked_feature_note: `Penagihan > Penerbitan Tagihan ${feeType.name}`
      });
      billRule = await knex('transaction_account_mappings').where({ id: bId }).first();
    } else {
      await knex('transaction_account_mappings').where({ id: billRule.id }).update({
        transaction_label: cfg.bill_label,
        transaction_type: 'non_kas',
        debit_account_id: piutangAcc.id,
        credit_account_id: pendapatanAcc.id,
        related_fee_type_id: feeType.id,
        is_active: 1
      });
    }

    // Payment Rule (Penambahan Kas)
    let payRule = await knex('transaction_account_mappings').where({ transaction_code: cfg.pay_code }).first();
    if (!payRule) {
      const [pId] = await knex('transaction_account_mappings').insert({
        school_unit_id: feeType.school_unit_id || 1,
        transaction_code: cfg.pay_code,
        transaction_label: cfg.pay_label,
        transaction_type: 'penambahan_kas',
        debit_account_id: bsiCoaId,
        credit_account_id: piutangAcc.id,
        default_cash_account_id: bsiCash ? bsiCash.id : null,
        related_fee_type_id: feeType.id,
        is_system: 0,
        is_active: 1,
        linked_feature_note: `Pembayaran > Pelunasan Tagihan ${feeType.name}`
      });
      payRule = await knex('transaction_account_mappings').where({ id: pId }).first();
    } else {
      await knex('transaction_account_mappings').where({ id: payRule.id }).update({
        transaction_label: cfg.pay_label,
        transaction_type: 'penambahan_kas',
        debit_account_id: bsiCoaId,
        credit_account_id: piutangAcc.id,
        default_cash_account_id: bsiCash ? bsiCash.id : null,
        related_fee_type_id: feeType.id,
        is_active: 1
      });
    }

    // Update fee_type
    await knex('fee_types').where({ id: feeType.id }).update({
      related_revenue_account_id: pendapatanAcc.id,
      billing_account_mapping_id: billRule.id,
      payment_account_mapping_id: payRule.id
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
