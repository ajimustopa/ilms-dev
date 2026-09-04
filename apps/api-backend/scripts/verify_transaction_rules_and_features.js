/**
 * Verification Script: verify_transaction_rules_and_features.js
 */
const db = require('../src/config/db/keuangan');
const masterDataService = require('../src/modules/keuangan/master-data/service');
const billsService = require('../src/modules/keuangan/bills/service');
const paymentsService = require('../src/modules/keuangan/payments/service');
const cashTransfersService = require('../src/modules/keuangan/cash-transfers/service');

async function runVerification() {
  console.log('=== MEMULAI INTEGRATION TEST ATURAN TRANSAKSI & FITUR TERKAIT ===\n');

  try {
    const schoolUnitId = 1;
    const adminUserId = 1;

    // 1. Verifikasi Daftar Aturan Transaksi
    console.log('1. Menguji listAccountMappings...');
    const rules = await masterDataService.listAccountMappings(schoolUnitId);
    console.log(`✓ Ditemukan ${rules.length} aturan transaksi di Satuan Pendidikan ID ${schoolUnitId}`);
    if (rules.length < 16) {
      throw new Error(`Jumlah aturan transaksi kurang dari 16 (ditemukan: ${rules.length})`);
    }

    // 2. Menguji Penguncian Anti-Hapus & Update Biasa pada Aturan Sistem
    console.log('\n2. Menguji Penguncian Aturan Sistem & Kebijakan Non-Delete...');
    const systemRule = rules.find(r => r.transaction_code === 'student_bill_issued');
    if (!systemRule) throw new Error('Aturan student_bill_issued tidak ditemukan');

    // A. Coba ubah akun debit pada aturan sistem lewat endpoint update biasa -> Wajib Ditolak
    let blocked = false;
    try {
      await masterDataService.updateAccountMapping(schoolUnitId, systemRule.id, {
        debit_account_id: 9999
      }, adminUserId);
    } catch (err) {
      blocked = true;
      console.log(`✓ Update struktural biasa pada aturan sistem berhasil ditolak: "${err.message}"`);
    }
    if (!blocked) throw new Error('Gagal memblokir perubahan struktural pada aturan sistem');

    // B. Coba delete -> Wajib soft-toggle is_active = false, BUKAN hapus baris
    await masterDataService.deleteAccountMapping(schoolUnitId, systemRule.id, adminUserId);
    const checkedRule = await masterDataService.getAccountMappingById(schoolUnitId, systemRule.id);
    if (!checkedRule || checkedRule.is_active !== 0) {
      throw new Error('Penghapusan gagal diubah menjadi soft-toggle is_active=false');
    }
    console.log('✓ Penghapusan aturan transaksi berhasil dikonversi menjadi soft-toggle is_active=false (Non-Delete Policy).');

    // Aktifkan kembali
    await masterDataService.updateAccountMappingStatus(schoolUnitId, systemRule.id, true, adminUserId);

    // 3. Menguji Endpoint System Override (Super Admin)
    console.log('\n3. Menguji PATCH /system-override...');
    const overrideResult = await masterDataService.overrideSystemTransactionRule(schoolUnitId, systemRule.id, {
      transaction_label: 'Penerbitan Tagihan Siswa (Updated)',
      reason: 'Penyesuaian nama label aturan oleh yayasan'
    }, adminUserId);
    console.log(`✓ Override struktural berhasil diterapkan: ${overrideResult.transaction_label}`);

    // 4. Menguji Fitur Baru: Transfer Kas Internal (POST & GET /cash-transfers)
    console.log('\n4. Menguji Transfer Kas Internal (cash-transfers)...');
    const cashAccounts = await db('cash_accounts').where({ school_unit_id: schoolUnitId });
    if (cashAccounts.length >= 2) {
      const fromAcc = cashAccounts[0];
      const toAcc = cashAccounts[1];

      const transferRes = await cashTransfersService.createTransfer(schoolUnitId, {
        from_cash_account_id: fromAcc.id,
        to_cash_account_id: toAcc.id,
        amount: 250000,
        reason: 'Pengisian Kas Operasional Tunai dari Bank Collection'
      }, adminUserId);
      console.log(`✓ ${transferRes.message}`);

      const transferList = await cashTransfersService.listTransfers(schoolUnitId);
      console.log(`✓ Riwayat transfer kas internal: ${transferList.data.length} transaksi tercatat`);
    } else {
      console.log('⚠️ Akun kas kurang dari 2, pengujian transfer diskip');
    }

    // 5. Menguji Fitur Baru: Write-off Tagihan Siswa
    console.log('\n5. Menguji Penghapusan Piutang Macet (Write-Off)...');
    // Buat dummy fee_type dan student_bill untuk test
    let testFee = await db('fee_types').where({ school_unit_id: schoolUnitId }).first();
    if (!testFee) {
      const [fId] = await db('fee_types').insert({
        school_unit_id: schoolUnitId,
        name: 'SPP Uji Coba',
        billing_pattern: 'monthly',
        is_active: 1
      });
      testFee = await db('fee_types').where({ id: fId }).first();
    }

    const [testBillId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: 1,
      fee_type_id: testFee.id,
      period_month: 8,
      period_year: 2026,
      amount: 450000,
      due_date: '2026-08-10',
      status: 'unpaid'
    });

    const writeOffRes = await billsService.writeOffBill(schoolUnitId, testBillId, 'Siswa pindah luar negeri dengan tunggakan tak tertagih', adminUserId);
    console.log(`✓ ${writeOffRes.message} (Status: ${writeOffRes.bill.status})`);

    // 6. Menguji Fitur Baru: Refund Pembayaran Tagihan
    console.log('\n6. Menguji Pengembalian Kelebihan Bayar (Refund)...');
    const [testPaidBillId] = await db('student_bills').insert({
      school_unit_id: schoolUnitId,
      student_id: 1,
      fee_type_id: testFee.id,
      period_month: 9,
      period_year: 2026,
      amount: 500000,
      due_date: '2026-09-10',
      status: 'paid'
    });

    const [testPaymentId] = await db('bill_payments').insert({
      student_bill_id: testPaidBillId,
      cash_account_id: cashAccounts[0]?.id || 1,
      payment_method: 'transfer_manual',
      amount: 500000,
      paid_at: '2026-08-25',
      receipt_number: `KWT-TEST-${Date.now()}`
    });

    const refundRes = await paymentsService.refundBillPayment(
      schoolUnitId,
      testPaymentId,
      cashAccounts[0]?.id || null,
      'Wali santri tidak sengaja transfer ganda 2x',
      adminUserId
    );
    console.log(`✓ ${refundRes.message}`);

    console.log('\n============================================================');
    console.log('🎉 SELURUH INTEGRATION TEST ATURAN TRANSAKSI & FITUR BARU BERHASIL 100%');
    console.log('============================================================');
  } catch (error) {
    console.error('❌ Terjadi kesalahan pengujian:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runVerification();
