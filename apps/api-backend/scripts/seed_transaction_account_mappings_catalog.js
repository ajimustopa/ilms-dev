/**
 * Script: seed_transaction_account_mappings_catalog.js
 * 
 * Melakukan seed:
 * 1. COA pendukung sistem (Piutang Siswa, Diskon, Write-off, Utang Tabungan/Refund, Ikhtisar L/R, Pendapatan per fee_type).
 * 2. Katalog 16 Aturan Transaksi bawaan sistem (is_system=true, is_dynamic_account, linked_feature_note).
 * 3. Idempotent: aman dijalankan berulang kali tanpa membuat duplikasi data.
 */
const db = require('../src/config/db/keuangan');

async function seedTransactionRulesCatalog() {
  console.log('=== MEMULAI SEEDING KATALOG ATURAN TRANSAKSI (TRANSACTION RULES) ===\n');

  try {
    // 1. Ambil seluruh Satuan Pendidikan yang terdaftar di database (default: unit 1 jika belum ada tabel school_units)
    let activeUnitIds = [1];
    try {
      const coreDb = require('../src/config/db/core');
      const units = await coreDb('school_units').where({ is_active: 1 }).select('id');
      if (units.length > 0) {
        activeUnitIds = units.map(u => u.id);
      }
    } catch (e) {
      console.log('Menggunakan default school_unit_id: [1]');
    }

    console.log(`Menjalankan seeder untuk satuan pendidikan: [${activeUnitIds.join(', ')}]`);

    // 2. Seed / Pastikan COA Pendukung Ada (Idempotent Helper)
    async function ensureCoa(unitId, { code, name, group, normal, level = 1, parentCode = null }) {
      // Cek apakah akun dengan kode tsb sudah ada di unit tsb atau global (unit 0)
      let account = await db('chart_of_accounts')
        .where({ account_code: code })
        .whereIn('school_unit_id', [0, unitId])
        .first();

      if (!account) {
        let parentId = null;
        if (parentCode) {
          const pAcc = await db('chart_of_accounts')
            .where({ account_code: parentCode })
            .first();
          if (pAcc) parentId = pAcc.id;
        }

        const [newId] = await db('chart_of_accounts').insert({
          school_unit_id: 0, // Global yayasan COA
          account_code: code,
          account_name: name,
          account_group: group,
          normal_balance: normal,
          parent_account_id: parentId,
          level,
          is_active: 1
        });
        account = await db('chart_of_accounts').where({ id: newId }).first();
        console.log(`  + Dibuat COA baru: [${code}] ${name} (${group.toUpperCase()})`);
      }
      return account;
    }

    // A. Akun-akun standar wajib
    const piutangSiswa = await ensureCoa(1, { code: '20000', name: 'Piutang Usaha - Siswa', group: 'piutang', normal: 'debit', level: 1 });
    const bebanWriteOff = await ensureCoa(1, { code: '79000', name: 'Beban Piutang Tak Tertagih', group: 'biaya', normal: 'debit', level: 1 });
    const diskonPendapatan = await ensureCoa(1, { code: '79200', name: 'Potongan/Diskon Pendapatan Siswa', group: 'biaya', normal: 'debit', level: 1 });
    const bebanLain = await ensureCoa(1, { code: '79100', name: 'Beban Operasional Lain-lain', group: 'biaya', normal: 'debit', level: 1 });
    const bebanGaji = await ensureCoa(1, { code: '73000', name: 'Beban Gaji Pegawai', group: 'biaya', normal: 'debit', level: 1 });
    const utangTabungan = await ensureCoa(1, { code: '40900', name: 'Utang Tabungan Siswa', group: 'utang', normal: 'credit', level: 1 });
    const utangRefund = await ensureCoa(1, { code: '41000', name: 'Utang Kelebihan Bayar Siswa', group: 'utang', normal: 'credit', level: 1 });
    const modalAwal = await ensureCoa(1, { code: '50100', name: 'Modal Awal', group: 'modal', normal: 'credit', level: 1 });
    const ikhtisarLR = await ensureCoa(1, { code: '50400', name: 'Ikhtisar Laba/Rugi Tahun Berjalan', group: 'modal', normal: 'credit', level: 1 });
    const shuDitahan = await ensureCoa(1, { code: '50500', name: 'SHU/Surplus Tahun Berjalan Belum Dibagikan', group: 'modal', normal: 'credit', level: 1 });
    const pendapatanLain = await ensureCoa(1, { code: '60800', name: 'Pendapatan Lain-lain', group: 'pendapatan', normal: 'credit', level: 1 });

    // B. Sinkronkan revenue account per fee_types
    const feeTypes = await db('fee_types').select('*');
    for (const ft of feeTypes) {
      if (!ft.related_revenue_account_id) {
        const revAccCode = `601${String(ft.id).padStart(2, '0')}`;
        const revAccName = `Pendapatan - ${ft.name}`;
        const revAcc = await ensureCoa(ft.school_unit_id, {
          code: revAccCode,
          name: revAccName,
          group: 'pendapatan',
          normal: 'credit',
          level: 2,
          parentCode: '601'
        });
        await db('fee_types').where({ id: ft.id }).update({ related_revenue_account_id: revAcc.id });
        console.log(`  ✓ Fee Type '${ft.name}' dihubungkan ke COA Pendapatan [${revAcc.account_code}] ${revAcc.account_name}`);
      }
    }

    // 3. Seed 16 Aturan Transaksi Sistem per Satuan Pendidikan
    const ruleDefinitions = [
      {
        code: 'opening_balance_entry',
        label: 'Saldo Awal Kas',
        debitAccountId: null, // Dinamis / Kas Default
        creditAccountId: modalAwal?.id || null,
        isDynamic: false,
        note: 'Master Data > Saldo Awal Kas'
      },
      {
        code: 'student_bill_issued',
        label: 'Penerbitan Tagihan Siswa',
        debitAccountId: piutangSiswa?.id || null,
        creditAccountId: null, // Dinamis: fee_types.related_revenue_account_id
        isDynamic: true,
        note: 'Penagihan > Terbitkan Tagihan'
      },
      {
        code: 'student_bill_payment',
        label: 'Pembayaran Tagihan Siswa',
        debitAccountId: null, // Dinamis: cash_account_id dipilih user saat transaksi
        creditAccountId: piutangSiswa?.id || null,
        isDynamic: true,
        note: 'Pembayaran > Verifikasi Bukti Transfer'
      },
      {
        code: 'student_bill_discount',
        label: 'Diskon/Potongan Tagihan Siswa',
        debitAccountId: diskonPendapatan?.id || null,
        creditAccountId: piutangSiswa?.id || null,
        isDynamic: false,
        note: 'Penagihan > Skema Diskon (Tahap 5)'
      },
      {
        code: 'student_bill_write_off',
        label: 'Penghapusan Piutang Macet',
        debitAccountId: bebanWriteOff?.id || null,
        creditAccountId: piutangSiswa?.id || null,
        isDynamic: false,
        note: 'Penagihan > Hapus Buku Piutang'
      },
      {
        code: 'student_bill_refund',
        label: 'Pengembalian Kelebihan Bayar',
        debitAccountId: utangRefund?.id || null,
        creditAccountId: null, // Dinamis: cash_account_id dipilih user
        isDynamic: true,
        note: 'Pembayaran > Refund'
      },
      {
        code: 'other_income_default',
        label: 'Penerimaan Lain-lain',
        debitAccountId: null, // Dinamis: kas dipilih user
        creditAccountId: pendapatanLain?.id || null, // Dinamis: transaction_categories.related_account_id
        isDynamic: true,
        note: 'Penerimaan Lain'
      },
      {
        code: 'expense_default',
        label: 'Pengeluaran Operasional',
        debitAccountId: bebanLain?.id || null, // Dinamis: transaction_categories.related_account_id
        creditAccountId: null, // Dinamis: kas dipilih user
        isDynamic: true,
        note: 'Pengeluaran (RAPBS)'
      },
      {
        code: 'payroll_disbursement',
        label: 'Pencairan Gaji Pegawai',
        debitAccountId: bebanGaji?.id || null,
        creditAccountId: null, // Dinamis: kas dipilih user
        isDynamic: true,
        note: 'Payroll (Tahap 11-12)'
      },
      {
        code: 'savings_deposit',
        label: 'Setor Tabungan Siswa',
        debitAccountId: null, // Dinamis: kas dipilih user
        creditAccountId: utangTabungan?.id || null,
        isDynamic: true,
        note: 'Tabungan > Setor'
      },
      {
        code: 'savings_withdrawal',
        label: 'Tarik Tabungan Siswa',
        debitAccountId: utangTabungan?.id || null,
        creditAccountId: null, // Dinamis: kas dipilih user
        isDynamic: true,
        note: 'Tabungan > Tarik'
      },
      {
        code: 'internal_cash_transfer',
        label: 'Transfer Antar Jenis Kas',
        debitAccountId: null, // Dinamis: kas tujuan
        creditAccountId: null, // Dinamis: kas asal
        isDynamic: true,
        note: 'Master Data > Jenis Kas > Transfer'
      },
      {
        code: 'fiscal_year_closing_revenue',
        label: 'Tutup Buku - Nihilkan Pendapatan',
        debitAccountId: null, // Seluruh akun pendapatan
        creditAccountId: ikhtisarLR?.id || null,
        isDynamic: true,
        note: 'Tutup Buku Tahunan'
      },
      {
        code: 'fiscal_year_closing_expense',
        label: 'Tutup Buku - Nihilkan Biaya',
        debitAccountId: ikhtisarLR?.id || null,
        creditAccountId: null, // Seluruh akun biaya
        isDynamic: true,
        note: 'Tutup Buku Tahunan'
      },
      {
        code: 'fiscal_year_closing_net',
        label: 'Tutup Buku - Pemindahan Surplus/Defisit',
        debitAccountId: ikhtisarLR?.id || null,
        creditAccountId: shuDitahan?.id || null,
        isDynamic: true,
        note: 'Tutup Buku Tahunan'
      },
      {
        code: 'manual_journal_entry',
        label: 'Jurnal Manual',
        debitAccountId: null,
        creditAccountId: null,
        isDynamic: true,
        note: 'Jurnal Umum > Entri Manual'
      }
    ];

    console.log('\n--- Seeding 16 Aturan Transaksi Bawaan Sistem ---');

    for (const unitId of activeUnitIds) {
      console.log(`\nSatuan Pendidikan Unit ID: ${unitId}`);
      for (const rule of ruleDefinitions) {
        const existing = await db('transaction_account_mappings')
          .where({
            school_unit_id: unitId,
            transaction_code: rule.code
          })
          .first();

        if (existing) {
          // Update metadata & dynamic configuration tanpa merusak setting user
          await db('transaction_account_mappings')
            .where({ id: existing.id })
            .update({
              transaction_label: rule.label,
              is_system: true,
              is_dynamic_account: rule.isDynamic,
              linked_feature_note: rule.note,
              debit_account_id: rule.debitAccountId || existing.debit_account_id || null,
              credit_account_id: rule.creditAccountId || existing.credit_account_id || null,
              is_active: 1
            });
          console.log(`  [UPDATE] (${rule.code}) ${rule.label}`);
        } else {
          await db('transaction_account_mappings').insert({
            school_unit_id: unitId,
            transaction_code: rule.code,
            transaction_label: rule.label,
            debit_account_id: rule.debitAccountId,
            credit_account_id: rule.creditAccountId,
            is_system: true,
            is_dynamic_account: rule.isDynamic,
            linked_feature_note: rule.note,
            is_active: 1
          });
          console.log(`  [INSERT] (${rule.code}) ${rule.label}`);
        }
      }
    }

    const totalRules = await db('transaction_account_mappings').count('id as cnt').first();
    console.log(`\n=== SELESAI: Total ${totalRules.cnt} Aturan Transaksi berhasil dikonfigurasi secara Idempotent ===`);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat seed aturan transaksi:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedTransactionRulesCatalog();
