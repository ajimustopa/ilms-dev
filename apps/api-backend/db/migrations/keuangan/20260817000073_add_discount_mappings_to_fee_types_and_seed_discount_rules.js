/**
 * Migration: add_discount_mappings_to_fee_types_and_seed_discount_rules
 * Modul Keuangan - Menambahkan kolom aturan diskon penagihan dan pembayaran pada fee_types serta seeding akun COA diskon dan aturan transaksi diskon spesifik
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah kolom pada fee_types jika belum ada
  const hasBillingDiscountCol = await knex.schema.hasColumn('fee_types', 'billing_discount_account_mapping_id');
  const hasPaymentDiscountCol = await knex.schema.hasColumn('fee_types', 'payment_discount_account_mapping_id');

  await knex.schema.alterTable('fee_types', (table) => {
    if (!hasBillingDiscountCol) {
      table.bigInteger('billing_discount_account_mapping_id').unsigned().nullable().after('billing_account_mapping_id')
        .references('id').inTable('transaction_account_mappings')
        .onDelete('SET NULL').onUpdate('CASCADE');
    }
    if (!hasPaymentDiscountCol) {
      table.bigInteger('payment_discount_account_mapping_id').unsigned().nullable().after('payment_account_mapping_id')
        .references('id').inTable('transaction_account_mappings')
        .onDelete('SET NULL').onUpdate('CASCADE');
    }
  });

  // 2. Daftar konfigurasi diskon per jenis biaya
  const discountConfigs = [
    {
      name: 'SPP',
      piutang_code: '201',
      diskon: { code: '69001', name: 'Diskon SPP' },
      bill_discount_code: 'bill_discount_spp',
      bill_discount_label: 'Diskon Penagihan SPP',
      pay_discount_code: 'pay_discount_spp',
      pay_discount_label: 'Diskon Pembayaran SPP'
    },
    {
      name: 'Pendaftaran',
      piutang_code: '208',
      diskon: { code: '69009', name: 'Diskon Pendaftaran (PPDB)' },
      bill_discount_code: 'bill_discount_pendaftaran',
      bill_discount_label: 'Diskon Penagihan Pendaftaran',
      pay_discount_code: 'pay_discount_pendaftaran',
      pay_discount_label: 'Diskon Pembayaran Pendaftaran'
    },
    {
      name: 'Penunjang Pembelajaran',
      piutang_code: '209',
      diskon: { code: '69003', name: 'Diskon Penunjang Pembelajaran' },
      bill_discount_code: 'bill_discount_penunjang_pembelajaran',
      bill_discount_label: 'Diskon Penagihan Penunjang Pembelajaran',
      pay_discount_code: 'pay_discount_penunjang_pembelajaran',
      pay_discount_label: 'Diskon Pembayaran Penunjang Pembelajaran'
    },
    {
      name: 'Kegiatan',
      piutang_code: '202',
      diskon: { code: '69002', name: 'Diskon Kegiatan' },
      bill_discount_code: 'bill_discount_kegiatan',
      bill_discount_label: 'Diskon Penagihan Kegiatan',
      pay_discount_code: 'pay_discount_kegiatan',
      pay_discount_label: 'Diskon Pembayaran Kegiatan'
    },
    {
      name: 'Sarpras',
      piutang_code: '205',
      diskon: { code: '69005', name: 'Diskon Sarpras' },
      bill_discount_code: 'bill_discount_sarpras',
      bill_discount_label: 'Diskon Penagihan Sarpras',
      pay_discount_code: 'pay_discount_sarpras',
      pay_discount_label: 'Diskon Pembayaran Sarpras'
    },
    {
      name: 'Seragam',
      piutang_code: '204',
      diskon: { code: '69004', name: 'Diskon Seragam' },
      bill_discount_code: 'bill_discount_seragam',
      bill_discount_label: 'Diskon Penagihan Seragam',
      pay_discount_code: 'pay_discount_seragam',
      pay_discount_label: 'Diskon Pembayaran Seragam'
    },
    {
      name: 'Pemeliharaan Sarpras',
      piutang_code: '2051',
      diskon: { code: '69008', name: 'Diskon Pemeliharaan Sarpras' },
      bill_discount_code: 'bill_discount_pemeliharaan_sarpras',
      bill_discount_label: 'Diskon Penagihan Pemeliharaan Sarpras',
      pay_discount_code: 'pay_discount_pemeliharaan_sarpras',
      pay_discount_label: 'Diskon Pembayaran Pemeliharaan Sarpras'
    },
    {
      name: 'Bangunan',
      piutang_code: '206',
      diskon: { code: '69006', name: 'Diskon Bangunan' },
      bill_discount_code: 'bill_discount_bangunan',
      bill_discount_label: 'Diskon Penagihan Bangunan',
      pay_discount_code: 'pay_discount_bangunan',
      pay_discount_label: 'Diskon Pembayaran Bangunan'
    },
    {
      name: 'Kegiatan Akhir Jenjang',
      piutang_code: '207',
      diskon: { code: '69007', name: 'Diskon Kegiatan Akhir Jenjang' },
      bill_discount_code: 'bill_discount_kegiatan_akhir_jenjang',
      bill_discount_label: 'Diskon Penagihan Kegiatan Akhir Jenjang',
      pay_discount_code: 'pay_discount_kegiatan_akhir_jenjang',
      pay_discount_label: 'Diskon Pembayaran Kegiatan Akhir Jenjang'
    },
    {
      name: 'Kelebihan Laundry',
      piutang_code: '2099',
      diskon: { code: '69099', name: 'Diskon Kelebihan Laundry' },
      bill_discount_code: 'bill_discount_kelebihan_laundry',
      bill_discount_label: 'Diskon Penagihan Kelebihan Laundry',
      pay_discount_code: 'pay_discount_kelebihan_laundry',
      pay_discount_label: 'Diskon Pembayaran Kelebihan Laundry'
    }
  ];

  for (const cfg of discountConfigs) {
    // A. Pastikan Akun COA Diskon tersedia
    let diskonAcc = await knex('chart_of_accounts').where('account_code', cfg.diskon.code).first();
    if (!diskonAcc) {
      const [dId] = await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: cfg.diskon.code,
        account_name: cfg.diskon.name,
        account_group: 'pendapatan',
        normal_balance: 'debit',
        level: 2,
        is_active: 1
      });
      diskonAcc = await knex('chart_of_accounts').where({ id: dId }).first();
    } else {
      if (diskonAcc.account_name !== cfg.diskon.name) {
        await knex('chart_of_accounts').where({ id: diskonAcc.id }).update({ account_name: cfg.diskon.name });
      }
    }

    // B. Cari Akun Piutang terkait
    let piutangAcc = await knex('chart_of_accounts').where('account_code', cfg.piutang_code).first();
    if (!piutangAcc) {
      piutangAcc = await knex('chart_of_accounts').where('account_code', '20000').first();
    }
    const piutangId = piutangAcc ? piutangAcc.id : null;

    // C. Cari Fee Type
    const feeType = await knex('fee_types').where('name', cfg.name).first();
    if (!feeType) continue;

    // D. Aturan Diskon Penagihan (Non-Kas)
    let billDiscountRule = await knex('transaction_account_mappings').where({ transaction_code: cfg.bill_discount_code }).first();
    if (!billDiscountRule) {
      const [bId] = await knex('transaction_account_mappings').insert({
        school_unit_id: feeType.school_unit_id || 1,
        transaction_code: cfg.bill_discount_code,
        transaction_label: cfg.bill_discount_label,
        transaction_type: 'non_kas',
        debit_account_id: diskonAcc.id,
        credit_account_id: piutangId,
        default_cash_account_id: null,
        related_fee_type_id: feeType.id,
        is_system: 0,
        is_active: 1,
        linked_feature_note: `Penagihan > Diskon/Potongan ${feeType.name}`
      });
      billDiscountRule = await knex('transaction_account_mappings').where({ id: bId }).first();
    } else {
      await knex('transaction_account_mappings').where({ id: billDiscountRule.id }).update({
        transaction_label: cfg.bill_discount_label,
        transaction_type: 'non_kas',
        debit_account_id: diskonAcc.id,
        credit_account_id: piutangId,
        related_fee_type_id: feeType.id,
        is_active: 1
      });
    }

    // E. Aturan Diskon Pembayaran (Non-Kas)
    let payDiscountRule = await knex('transaction_account_mappings').where({ transaction_code: cfg.pay_discount_code }).first();
    if (!payDiscountRule) {
      const [pId] = await knex('transaction_account_mappings').insert({
        school_unit_id: feeType.school_unit_id || 1,
        transaction_code: cfg.pay_discount_code,
        transaction_label: cfg.pay_discount_label,
        transaction_type: 'non_kas',
        debit_account_id: diskonAcc.id,
        credit_account_id: piutangId,
        default_cash_account_id: null,
        related_fee_type_id: feeType.id,
        is_system: 0,
        is_active: 1,
        linked_feature_note: `Pembayaran > Diskon Pelunasan ${feeType.name}`
      });
      payDiscountRule = await knex('transaction_account_mappings').where({ id: pId }).first();
    } else {
      await knex('transaction_account_mappings').where({ id: payDiscountRule.id }).update({
        transaction_label: cfg.pay_discount_label,
        transaction_type: 'non_kas',
        debit_account_id: diskonAcc.id,
        credit_account_id: piutangId,
        related_fee_type_id: feeType.id,
        is_active: 1
      });
    }

    // F. Hubungkan ke fee_types
    await knex('fee_types').where({ id: feeType.id }).update({
      billing_discount_account_mapping_id: billDiscountRule.id,
      payment_discount_account_mapping_id: payDiscountRule.id
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasBillingDiscountCol = await knex.schema.hasColumn('fee_types', 'billing_discount_account_mapping_id');
  const hasPaymentDiscountCol = await knex.schema.hasColumn('fee_types', 'payment_discount_account_mapping_id');

  await knex.schema.alterTable('fee_types', (table) => {
    if (hasBillingDiscountCol) {
      table.dropForeign(['billing_discount_account_mapping_id']);
      table.dropColumn('billing_discount_account_mapping_id');
    }
    if (hasPaymentDiscountCol) {
      table.dropForeign(['payment_discount_account_mapping_id']);
      table.dropColumn('payment_discount_account_mapping_id');
    }
  });
};
