/**
 * Migration: enhance_other_incomes_and_seed_income_rules
 * Modul Keuangan:
 * 1. Menambahkan kolom receipt_number, payer_name, source_category, fund_balance_id,
 *    transaction_mapping_id, debit_account_id, credit_account_id, override_reason pada tabel other_incomes.
 * 2. Memastikan COA pendapatan grup 6/4 (BOS, Subsidi Yayasan, Donasi, Unit Usaha, Sewa, Jasa Giro, Lain-lain) lengkap.
 * 3. Mengisi Master Data Aturan Transaksi (Kas Masuk Penerimaan Lain) pada transaction_account_mappings.
 */

exports.up = async function(knex) {
  // 1. ALTER TABLE other_incomes
  const hasTable = await knex.schema.hasTable('other_incomes');
  if (hasTable) {
    const hasReceiptNumber = await knex.schema.hasColumn('other_incomes', 'receipt_number');
    if (!hasReceiptNumber) {
      await knex.schema.alterTable('other_incomes', function(table) {
        table.string('receipt_number', 60).nullable().after('id').index();
        table.string('payer_name', 255).nullable().after('cash_account_id');
        table.string('source_category', 50).nullable().defaultTo('other').after('payer_name').index();
        table.bigInteger('fund_balance_id').unsigned().nullable().after('source_category').index();
        table.bigInteger('transaction_mapping_id').unsigned().nullable().after('fund_balance_id').index();
        table.bigInteger('debit_account_id').unsigned().nullable().after('transaction_mapping_id').index();
        table.bigInteger('credit_account_id').unsigned().nullable().after('debit_account_id').index();
        table.string('override_reason', 255).nullable().after('notes');
      });
    }
  }

  // 2. SEED COA PENDAPATAN JIKA BELUM LENGKAP
  const coaDefinitions = [
    { code: '60800', name: 'Pendapatan Lain-lain', group: 'pendapatan' },
    { code: '611', name: 'Pendapatan BOS', group: 'pendapatan' },
    { code: '619', name: 'Pendapatan Subsidi Yayasan', group: 'pendapatan' },
    { code: '60802', name: 'Pendapatan Donasi', group: 'pendapatan' },
    { code: '615', name: 'Pendapatan Sewa Fasilitas (Sport Center)', group: 'pendapatan' },
    { code: '616', name: 'Pendapatan Sewa Kantin', group: 'pendapatan' },
    { code: '620', name: 'Pendapatan Jasa Giro & Bunga Bank', group: 'pendapatan' }
  ];

  for (const item of coaDefinitions) {
    const exists = await knex('chart_of_accounts').where('account_code', item.code).first();
    if (!exists) {
      await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: item.code,
        account_name: item.name,
        account_group: item.group,
        normal_balance: 'credit',
        level: 1,
        is_active: 1
      });
    }
  }

  // 3. SEED ATURAN TRANSAKSI PENERIMAAN LAIN-LAIN (Kas Masuk)
  const defaultCashCoa = await knex('chart_of_accounts').where('account_code', '10201').first()
    || await knex('chart_of_accounts').where('account_group', 'harta').first();
  const defaultDebitId = defaultCashCoa ? defaultCashCoa.id : null;

  const defaultCashAcc = await knex('cash_accounts').where('is_active', 1).first();
  const defaultCashAccId = defaultCashAcc ? defaultCashAcc.id : null;

  const ruleDefinitions = [
    {
      code: 'other_income_general',
      label: 'Kas Masuk - Penerimaan Kas Lain-lain',
      coa_code: '60800',
      note: 'Penerimaan umum non-tagihan siswa'
    },
    {
      code: 'other_income_bos',
      label: 'Kas Masuk - Penerimaan Bantuan Operasional Sekolah (BOS)',
      coa_code: '611',
      note: 'Penerimaan dana BOS dari pemerintah'
    },
    {
      code: 'other_income_subsidi_yayasan',
      label: 'Kas Masuk - Penerimaan Subsidi / Hibah Yayasan',
      coa_code: '619',
      note: 'Penerimaan dana bantuan / hibah / talangan dari Yayasan'
    },
    {
      code: 'other_income_donasi_wakaf',
      label: 'Kas Masuk - Penerimaan Donasi, Infaq & Wakaf',
      coa_code: '60802',
      note: 'Penerimaan sumbangan sukarela, infaq, shodaqoh, dan wakaf'
    },
    {
      code: 'other_income_sewa_kantin',
      label: 'Kas Masuk - Penerimaan Sewa Kantin & Unit Usaha',
      coa_code: '616',
      note: 'Penerimaan retribusi sewa kantin dan hasil usaha sekolah'
    },
    {
      code: 'other_income_sewa_fasilitas',
      label: 'Kas Masuk - Penerimaan Sewa Fasilitas & Gedung',
      coa_code: '615',
      note: 'Penerimaan sewa lapangan sport center, gedung, dan sarana sekolah'
    },
    {
      code: 'other_income_jasa_giro',
      label: 'Kas Masuk - Penerimaan Jasa Giro & Bagi Hasil Bank',
      coa_code: '620',
      note: 'Penerimaan pendapatan bunga / bagi hasil rekening kas bank'
    }
  ];

  // Untuk setiap satuan pendidikan (1, 2) dan 0 (global)
  const unitIds = [0, 1, 2];
  for (const uId of unitIds) {
    for (const rule of ruleDefinitions) {
      const coaCredit = await knex('chart_of_accounts').where('account_code', rule.coa_code).first();
      const creditId = coaCredit ? coaCredit.id : null;

      const existingRule = await knex('transaction_account_mappings')
        .where({
          school_unit_id: uId,
          transaction_code: rule.code
        })
        .first();

      if (!existingRule) {
        await knex('transaction_account_mappings').insert({
          school_unit_id: uId,
          transaction_code: rule.code,
          transaction_label: rule.label,
          transaction_type: 'penambahan_kas',
          debit_account_id: defaultDebitId,
          credit_account_id: creditId,
          default_cash_account_id: defaultCashAccId,
          is_system: 1,
          is_dynamic_account: 0,
          is_active: 1,
          linked_feature_note: rule.note
        });
      } else {
        await knex('transaction_account_mappings')
          .where({ id: existingRule.id })
          .update({
            transaction_label: rule.label,
            transaction_type: 'penambahan_kas',
            credit_account_id: creditId || existingRule.credit_account_id,
            debit_account_id: defaultDebitId || existingRule.debit_account_id,
            default_cash_account_id: defaultCashAccId || existingRule.default_cash_account_id,
            linked_feature_note: rule.note
          });
      }
    }
  }

  // Update receipt numbers for existing other_incomes if null
  const existingIncomes = await knex('other_incomes').whereNull('receipt_number');
  for (const inc of existingIncomes) {
    const d = new Date(inc.received_at || inc.created_at || Date.now());
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const seq = String(inc.id).padStart(4, '0');
    const rNo = `BKM/${yr}/${mo}/${seq}`;
    await knex('other_incomes').where({ id: inc.id }).update({ receipt_number: rNo });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('other_incomes');
  if (hasTable) {
    const hasReceiptNumber = await knex.schema.hasColumn('other_incomes', 'receipt_number');
    if (hasReceiptNumber) {
      await knex.schema.alterTable('other_incomes', function(table) {
        table.dropColumn('override_reason');
        table.dropColumn('credit_account_id');
        table.dropColumn('debit_account_id');
        table.dropColumn('transaction_mapping_id');
        table.dropColumn('fund_balance_id');
        table.dropColumn('source_category');
        table.dropColumn('payer_name');
        table.dropColumn('receipt_number');
      });
    }
  }
};
