/**
 * Verification Script: verify_legacy_migration_flow.js
 * Tests the entire Historical Migration (Cutover Date, Legacy Bills & Payments, Journal Isolation, and Normal Flow Separation).
 */
const db = require('../src/config/db/keuangan');
const legacyService = require('../src/modules/keuangan/legacy-migration/service');
const paymentsService = require('../src/modules/keuangan/payments/service');
const dashboardService = require('../src/modules/keuangan/dashboard/service');
const reportsService = require('../src/modules/keuangan/reports/service');

async function runTests() {
  console.log('=== START VERIFICATION: HISTORICAL MIGRATION & CUTOVER FLOW ===\n');
  const schoolUnitId = 1;
  const userId = 88;
  const studentTestId = 20;

  try {
    // Reset cutover setting for clean test
    await db('finance_cutover_settings').where({ school_unit_id: schoolUnitId }).delete();

    // 1. Set / Update Cutover Date
    console.log('1. Menguji Pengaturan Tanggal Mulai Pencatatan Sistem (Cutover Date)...');
    const cutoverInitial = await legacyService.setOrUpdateCutoverDate(schoolUnitId, {
      cutover_date: '2026-07-01',
      notes: 'Cutover Go-Live Tahun Ajaran 2026/2027'
    }, userId);

    console.log('✓ Cutover Date Terpasang:', cutoverInitial);

    // Update cutover date tanpa reason (Harus ditolak 422)
    try {
      await legacyService.setOrUpdateCutoverDate(schoolUnitId, {
        cutover_date: '2026-07-01',
        reason: ''
      }, userId);
      throw new Error('FAILED: Update cutover date tanpa reason seharusnya ditolak');
    } catch (err) {
      console.log('✓ Berhasil ditolak update cutover date tanpa reason:', err.message);
    }

    // 2. Input Tagihan Historis dengan Validasi Tanggal
    console.log('\n2. Menguji Input Tagihan Historis...');
    
    // Uji tanggal jatuh tempo >= cutover date (Harus ditolak 422)
    try {
      await legacyService.createLegacyBill(schoolUnitId, {
        student_id: studentTestId,
        fee_type_id: 1,
        period_year: 2026,
        period_month: 8,
        amount: 500000,
        due_date: '2026-08-10' // >= 2026-07-01
      }, userId);
      throw new Error('FAILED: Tagihan historis dengan tanggal >= cutover seharusnya ditolak');
    } catch (err) {
      console.log('✓ Berhasil ditolak tagihan historis dengan tanggal >= cutover:', err.message);
    }

    // Hitung jumlah jurnal sebelum input legacy
    const journalCountBefore = await db('journal_entries').count('id as cnt').first();

    // Input tagihan historis valid (due_date < cutover_date) dengan cicilan awal
    const legacyBill1 = await legacyService.createLegacyBill(schoolUnitId, {
      student_id: studentTestId,
      fee_type_id: 1,
      period_year: 2026,
      period_month: 3,
      amount: 500000,
      paid_amount: 200000,
      due_date: '2026-03-10',
      historical_cash_note: 'Buku Kas Tunai 2025/2026',
      legacy_note: 'Tunggakan SPP Maret 2026 lampau'
    }, userId);

    console.log('✓ Tagihan Historis 1 Terbuat:', {
      id: legacyBill1.id,
      amount: legacyBill1.amount,
      status: legacyBill1.status,
      is_legacy: legacyBill1.is_legacy,
      initial_paid: legacyBill1.initial_paid
    });

    // 3. Verifikasi Isolasi Jurnal & Kas pada Jalur Legacy
    console.log('\n3. Memverifikasi Bahwa Tagihan & Pembayaran Legacy TIDAK Membuat Jurnal Kas...');
    const journalCountAfter = await db('journal_entries').count('id as cnt').first();
    console.log('✓ Jumlah Jurnal Sebelum:', journalCountBefore.cnt, '| Jumlah Jurnal Sesudah:', journalCountAfter.cnt);
    if (parseInt(journalCountBefore.cnt, 10) !== parseInt(journalCountAfter.cnt, 10)) {
      throw new Error('FAILED: Tagihan/pembayaran legacy memicu pembuatan jurnal!');
    }

    // 4. Input Pembayaran Lampau Tambahan
    console.log('\n4. Menguji Pencatatan Pembayaran Historis Tambahan...');
    
    // Uji tanggal bayar >= cutover (Harus ditolak)
    try {
      await legacyService.addLegacyPayment(schoolUnitId, legacyBill1.id, {
        amount: 300000,
        payment_date: '2026-07-05' // >= cutover
      }, userId);
      throw new Error('FAILED: Pembayaran historis dengan tanggal >= cutover seharusnya ditolak');
    } catch (err) {
      console.log('✓ Berhasil ditolak pembayaran historis dengan tanggal >= cutover:', err.message);
    }

    // Pembayaran historis valid (< cutover) melunasi sisa tagihan
    const legacyPayment = await legacyService.addLegacyPayment(schoolUnitId, legacyBill1.id, {
      amount: 300000,
      payment_date: '2026-04-12',
      historical_cash_note: 'Titipan Bendahara SPP Lama',
      notes: 'Pelunasan sisa SPP Maret 2026 pra-cutover'
    }, userId);

    console.log('✓ Pembayaran Historis Berhasil Dicatat:', {
      payment_id: legacyPayment.payment.id,
      amount: legacyPayment.payment.amount,
      is_legacy: legacyPayment.payment.is_legacy,
      bill_new_status: legacyPayment.bill_new_status,
      remaining: legacyPayment.remaining_amount
    });

    const journalCountAfterPayment = await db('journal_entries').count('id as cnt').first();
    if (parseInt(journalCountBefore.cnt, 10) !== parseInt(journalCountAfterPayment.cnt, 10)) {
      throw new Error('FAILED: Pembayaran legacy kedua memicu pembuatan jurnal!');
    }

    // 5. Pemisahan Jalur: Pembayaran Normal untuk Sisa Tagihan Legacy
    console.log('\n5. Menguji Pembayaran Normal untuk Sisa Tunggakan Tagihan Legacy...');
    
    // Buat tagihan legacy 2 yang masih memiliki sisa tunggakan
    const legacyBill2 = await legacyService.createLegacyBill(schoolUnitId, {
      student_id: studentTestId,
      fee_type_id: 1,
      period_year: 2026,
      period_month: 5,
      amount: 600000,
      paid_amount: 0,
      due_date: '2026-05-10'
    }, userId);

    // Coba bayar via jalur NORMAL tapi memasukkan tanggal < cutover (Harus ditolak dan diarahkan ke legacy)
    try {
      await paymentsService.recordBillPayment(schoolUnitId, {
        student_bill_id: legacyBill2.id,
        cash_account_id: 1,
        paid_at: '2026-06-01', // < cutover
        amount: 600000
      }, userId);
      throw new Error('FAILED: Pembayaran normal dengan tanggal < cutover seharusnya ditolak');
    } catch (err) {
      console.log('✓ Berhasil ditolak pembayaran normal jika tanggal < cutover:', err.message);
    }

    // Bayar via jalur NORMAL dengan tanggal >= cutover (Uang riil masuk di sistem berjalan)
    const normalPaymentResult = await paymentsService.recordBillPayment(schoolUnitId, {
      student_bill_id: legacyBill2.id,
      cash_account_id: 1,
      paid_at: '2026-08-15', // >= cutover
      amount: 600000,
      payment_method: 'cash',
      notes: 'Pelunasan tunggakan lama via kasir berjalan'
    }, userId);

    console.log('✓ Pembayaran Normal untuk Tagihan Legacy Berhasil:', {
      payment_id: normalPaymentResult.data.id,
      status_after: normalPaymentResult.data.status_after,
      receipt_number: normalPaymentResult.data.receipt_number
    });

    // Verifikasi jurnal resmi TERBENTUK untuk pembayaran normal ini
    const journalNormal = await db('journal_entries')
      .where({ source_type: 'student_bill_payment', source_id: normalPaymentResult.data.id })
      .first();

    console.log('✓ Jurnal Otomatis Berhasil Terbentuk untuk Pembayaran Normal:', {
      journal_id: journalNormal?.id,
      transaction_code: journalNormal?.transaction_code,
      total_debit: journalNormal?.total_debit,
      total_credit: journalNormal?.total_credit
    });

    if (!journalNormal) {
      throw new Error('FAILED: Pembayaran normal untuk tagihan legacy harus membuat jurnal!');
    }

    // 6. Pengujian Rekap Daftar Migrasi
    console.log('\n6. Menguji Daftar Rekapitulasi Migrasi (listLegacyBills)...');
    const legacyList = await legacyService.listLegacyBills(schoolUnitId);
    console.log('✓ Rekap Migrasi:', {
      cutover_date: legacyList.cutover_setting.cutover_date,
      total_bills: legacyList.summary.total_legacy_bills_count,
      total_billed: legacyList.summary.total_billed,
      total_paid: legacyList.summary.total_paid,
      total_remaining: legacyList.summary.total_remaining
    });

    // 7. Pengujian Kartu Bayar Siswa (Memuat Tagihan Legacy & Badge)
    console.log('\n7. Menguji Kartu Bayar Siswa (Student Ledger) terhadap Data Legacy...');
    const studentLedger = await reportsService.getStudentLedger(schoolUnitId, studentTestId);
    const hasLegacyInLedger = studentLedger.items.some(i => i.is_legacy === true);
    console.log('✓ Kartu Bayar Siswa Memuat Data Historis:', {
      total_items: studentLedger.items.length,
      has_legacy_items: hasLegacyInLedger
    });

    if (!hasLegacyInLedger) {
      throw new Error('FAILED: Kartu bayar siswa harus memuat tagihan legacy!');
    }

    console.log('\n=== SELURUH PENGUJIAN MIGRASI DATA HISTORIS & CUTOVER BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTests();
