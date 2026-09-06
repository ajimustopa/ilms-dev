/**
 * Migration: seed_general_payment_transaction_rules_and_sanitize_coa
 * Modul Keuangan - Mengisi aturan transaksi pembayaran berbagai pos tagihan (Kas Bank Penerimaan vs Piutang)
 * dan menonaktifkan akun COA legacy berlabel SMP / SMA agar pengelolaan bersifat umum.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Dapatkan Kas Bank Penerimaan BSI (Akun 10201 COA & Cash Account)
  let bsiCoa = await knex('chart_of_accounts').where('account_code', '10201').first();
  if (!bsiCoa) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '10201',
      account_name: 'Kas Bank - Kas Penerimaan (BSI 5114411440)',
      account_group: 'harta',
      normal_balance: 'debit',
      level: 1,
      is_active: 1
    });
    bsiCoa = await knex('chart_of_accounts').where({ id }).first();
  }

  let bsiCash = await knex('cash_accounts').where('bank_account_number', '5114411440').first();
  if (!bsiCash) {
    const [cId] = await knex('cash_accounts').insert({
      school_unit_id: 1,
      name: 'Kas Bank Penerimaan (BSI 5114411440)',
      account_kind: 'bank',
      bank_account_number: '5114411440',
      bank_name: 'Bank Syariah Indonesia (BSI)',
      account_id: bsiCoa.id,
      is_active: 1
    });
    bsiCash = await knex('cash_accounts').where({ id: cId }).first();
  } else if (!bsiCash.account_id) {
    await knex('cash_accounts').where({ id: bsiCash.id }).update({ account_id: bsiCoa.id });
  }

  // 2. Daftar Pos Tagihan Umum
  const feeConfigs = [
    {
      name: 'SPP',
      code: 'SPP',
      piutang: { code: '201', name: 'Piutang SPP' },
      pendapatan: { code: '601', name: 'Pendapatan SPP' },
      bill_code: 'bill_issued_spp',
      bill_label: 'Penerbitan Tagihan SPP',
      pay_code: 'bill_payment_spp',
      pay_label: 'Pembayaran Tagihan SPP'
    },
    {
      name: 'Pendaftaran',
      code: 'REG',
      piutang: { code: '208', name: 'Piutang Pendaftaran' },
      pendapatan: { code: '613', name: 'Pendapatan Pendaftaran (PPDB)' },
      bill_code: 'bill_issued_pendaftaran',
      bill_label: 'Penerbitan Tagihan Pendaftaran',
      pay_code: 'bill_payment_pendaftaran',
      pay_label: 'Pembayaran Tagihan Pendaftaran'
    },
    {
      name: 'Penunjang Pembelajaran',
      code: 'PENUNJANG',
      piutang: { code: '209', name: 'Piutang Penunjang Pembelajaran' },
      pendapatan: { code: '60900', name: 'Pendapatan Penunjang Pembelajaran' },
      bill_code: 'bill_issued_penunjang_pembelajaran',
      bill_label: 'Penerbitan Tagihan Penunjang Pembelajaran',
      pay_code: 'bill_payment_penunjang_pembelajaran',
      pay_label: 'Pembayaran Tagihan Penunjang Pembelajaran'
    },
    {
      name: 'Kegiatan',
      code: 'KEGIATAN',
      piutang: { code: '202', name: 'Piutang Kegiatan' },
      pendapatan: { code: '602', name: 'Pendapatan Kegiatan' },
      bill_code: 'bill_issued_kegiatan',
      bill_label: 'Penerbitan Tagihan Kegiatan',
      pay_code: 'bill_payment_kegiatan',
      pay_label: 'Pembayaran Tagihan Kegiatan'
    },
    {
      name: 'Sarpras',
      code: 'SARPRAS',
      piutang: { code: '205', name: 'Piutang Sarpras' },
      pendapatan: { code: '605', name: 'Pendapatan Sarpras' },
      bill_code: 'bill_issued_sarpras',
      bill_label: 'Penerbitan Tagihan Sarpras',
      pay_code: 'bill_payment_sarpras',
      pay_label: 'Pembayaran Tagihan Sarpras'
    },
    {
      name: 'Seragam',
      code: 'SERAGAM',
      piutang: { code: '204', name: 'Piutang Seragam' },
      pendapatan: { code: '604', name: 'Pendapatan Seragam' },
      bill_code: 'bill_issued_seragam',
      bill_label: 'Penerbitan Tagihan Seragam',
      pay_code: 'bill_payment_seragam',
      pay_label: 'Pembayaran Tagihan Seragam'
    },
    {
      name: 'Pemeliharaan Sarpras',
      code: 'PEMEL_SARPRAS',
      piutang: { code: '2051', name: 'Piutang Pemeliharaan Sarpras' },
      pendapatan: { code: '6051', name: 'Pendapatan Pemeliharaan Sarpras' },
      bill_code: 'bill_issued_pemeliharaan_sarpras',
      bill_label: 'Penerbitan Tagihan Pemeliharaan Sarpras',
      pay_code: 'bill_payment_pemeliharaan_sarpras',
      pay_label: 'Pembayaran Tagihan Pemeliharaan Sarpras'
    },
    {
      name: 'Bangunan',
      code: 'BANGUNAN',
      piutang: { code: '206', name: 'Piutang Bangunan' },
      pendapatan: { code: '606', name: 'Pendapatan Bangunan' },
      bill_code: 'bill_issued_bangunan',
      bill_label: 'Penerbitan Tagihan Bangunan',
      pay_code: 'bill_payment_bangunan',
      pay_label: 'Pembayaran Tagihan Bangunan'
    },
    {
      name: 'Kegiatan Akhir Jenjang',
      code: 'AKHIR_JENJANG',
      piutang: { code: '207', name: 'Piutang Kegiatan Akhir Jenjang' },
      pendapatan: { code: '607', name: 'Pendapatan Kegiatan Akhir Tahun' },
      bill_code: 'bill_issued_kegiatan_akhir_jenjang',
      bill_label: 'Penerbitan Tagihan Kegiatan Akhir Jenjang',
      pay_code: 'bill_payment_kegiatan_akhir_jenjang',
      pay_label: 'Pembayaran Tagihan Kegiatan Akhir Jenjang'
    },
    {
      name: 'Kelebihan Laundry',
      code: 'LAUNDRY',
      piutang: { code: '2099', name: 'Piutang Kelebihan Laundry' },
      pendapatan: { code: '6099', name: 'Pendapatan Kelebihan Laundry' },
      bill_code: 'bill_issued_kelebihan_laundry',
      bill_label: 'Penerbitan Tagihan Kelebihan Laundry',
      pay_code: 'bill_payment_kelebihan_laundry',
      pay_label: 'Pembayaran Tagihan Kelebihan Laundry'
    },
    {
      name: 'Buku & Modul Pembelajaran',
      code: 'BUKU',
      piutang: { code: '203', name: 'Piutang Buku' },
      pendapatan: { code: '603', name: 'Pendapatan Buku' },
      bill_code: 'bill_issued_buku',
      bill_label: 'Penerbitan Tagihan Buku',
      pay_code: 'bill_payment_buku',
      pay_label: 'Pembayaran Tagihan Buku'
    },
    {
      name: 'Tunggakan TP Sebelumnya',
      code: 'TUNGGAKAN_TP_LALU',
      piutang: { code: '210', name: 'Piutang Tunggakan TP Sebelumnya' },
      pendapatan: { code: '618', name: 'Pendapatan Tunggakan TP Sebelumnya' },
      bill_code: 'bill_issued_tunggakan_tp_lalu',
      bill_label: 'Penerbitan Tagihan Tunggakan TP Sebelumnya',
      pay_code: 'bill_payment_tunggakan_tp_lalu',
      pay_label: 'Pembayaran Tagihan Tunggakan TP Sebelumnya'
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

    let feeType = await knex('fee_types').where('name', cfg.name).first();
    if (!feeType && cfg.code) {
      feeType = await knex('fee_types').where('code', cfg.code).first();
    }

    // Billing Rule (Non-Kas)
    let billRule = await knex('transaction_account_mappings').where({ transaction_code: cfg.bill_code }).first();
    if (!billRule) {
      const [bId] = await knex('transaction_account_mappings').insert({
        school_unit_id: 1,
        transaction_code: cfg.bill_code,
        transaction_label: cfg.bill_label,
        transaction_type: 'non_kas',
        debit_account_id: piutangAcc.id,
        credit_account_id: pendapatanAcc.id,
        default_cash_account_id: null,
        related_fee_type_id: feeType ? feeType.id : null,
        is_system: 0,
        is_active: 1,
        linked_feature_note: `Penagihan > Penerbitan Tagihan ${cfg.name}`
      });
      billRule = await knex('transaction_account_mappings').where({ id: bId }).first();
    } else {
      await knex('transaction_account_mappings').where({ id: billRule.id }).update({
        transaction_label: cfg.bill_label,
        transaction_type: 'non_kas',
        debit_account_id: piutangAcc.id,
        credit_account_id: pendapatanAcc.id,
        related_fee_type_id: feeType ? feeType.id : null,
        is_active: 1
      });
    }

    // Payment Rule (Penambahan Kas)
    let payRule = await knex('transaction_account_mappings').where({ transaction_code: cfg.pay_code }).first();
    if (!payRule) {
      const [pId] = await knex('transaction_account_mappings').insert({
        school_unit_id: 1,
        transaction_code: cfg.pay_code,
        transaction_label: cfg.pay_label,
        transaction_type: 'penambahan_kas',
        debit_account_id: bsiCoa.id,
        credit_account_id: piutangAcc.id,
        default_cash_account_id: bsiCash ? bsiCash.id : null,
        related_fee_type_id: feeType ? feeType.id : null,
        is_system: 0,
        is_active: 1,
        linked_feature_note: `Pembayaran > Pelunasan Tagihan ${cfg.name}`
      });
      payRule = await knex('transaction_account_mappings').where({ id: pId }).first();
    } else {
      await knex('transaction_account_mappings').where({ id: payRule.id }).update({
        transaction_label: cfg.pay_label,
        transaction_type: 'penambahan_kas',
        debit_account_id: bsiCoa.id,
        credit_account_id: piutangAcc.id,
        default_cash_account_id: bsiCash ? bsiCash.id : null,
        related_fee_type_id: feeType ? feeType.id : null,
        is_active: 1
      });
    }

    if (feeType) {
      await knex('fee_types').where({ id: feeType.id }).update({
        related_revenue_account_id: pendapatanAcc.id,
        billing_account_mapping_id: billRule.id,
        payment_account_mapping_id: payRule.id
      });
    }
  }

  // Deactivate legacy SMP/SMA specific COA accounts
  await knex('chart_of_accounts')
    .where(function() {
      this.where('account_name', 'like', '%SMP%').orWhere('account_name', 'like', '%SMA%');
    })
    .update({ is_active: 0 });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Safe rollback
};
