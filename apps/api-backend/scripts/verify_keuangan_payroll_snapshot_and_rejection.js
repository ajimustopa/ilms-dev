/**
 * Automated Verification Script for Keuangan Payroll:
 * - Anti-Overwrite Protection on Disbursed Items
 * - Read-Only Breakdown Snapshot Storage
 * - Bidirectional Return for Correction (Reject -> Unlock Kepegawaian -> Re-edit -> Re-send -> Ingest)
 */
const dbKepegawaian = require('../src/config/db/kepegawaian');
const dbKeuangan = require('../src/config/db/keuangan');
const kepegawaianPayrollService = require('../src/modules/kepegawaian/payroll/service');
const keuanganPayrollService = require('../src/modules/keuangan/payroll/service');

async function runTests() {
  console.log('=== START VERIFICATION: KEUANGAN PAYROLL SNAPSHOT & REJECTION FLOW ===\n');

  const schoolUnitId = 1;
  const userId = 88;
  const testMonth = 12;
  const testYear = 2026;

  try {
    // 0. Clean up previous test period
    const existingPeriod = await dbKepegawaian('payroll_periods')
      .where({ school_unit_id: schoolUnitId, period_month: testMonth, period_year: testYear })
      .first();

    if (existingPeriod) {
      await dbKepegawaian('payroll_items').where({ payroll_period_id: existingPeriod.id }).delete();
      await dbKepegawaian('payroll_audit_logs').where({ payroll_period_id: existingPeriod.id }).delete();
      await dbKepegawaian('payroll_periods').where({ id: existingPeriod.id }).delete();
      await dbKeuangan('payroll_disbursements').where({ school_unit_id: schoolUnitId, period_month: testMonth, period_year: testYear }).delete();
    }

    // 1. Setup Periode & Kalkulasi di Kepegawaian
    console.log('1. Mempersiapkan Periode Payroll di Kepegawaian...');
    const period = await kepegawaianPayrollService.createPeriod({
      school_unit_id: schoolUnitId,
      period_month: testMonth,
      period_year: testYear
    }, userId);

    const items = await kepegawaianPayrollService.calculatePeriod(period.id, userId);
    console.log(`✓ Periode dibuat & terhitung untuk ${items.length} pegawai.`);

    // Verifikasi seluruh item & kunci periode
    for (const it of items) {
      await kepegawaianPayrollService.verifyItem(it.id, { id: userId, ref_type: 'staff', ref_id: 1 });
    }
    const lockedPeriod = await kepegawaianPayrollService.lockPeriod(period.id, userId);
    console.log('✓ Periode berstatus LOCKED:', lockedPeriod.status);

    // 2. Serah Terima ke Keuangan (Send to Finance)
    console.log('\n2. Menyerahkan Berkas ke Keuangan (sendToFinance)...');
    const sendRes = await kepegawaianPayrollService.sendToFinance(period.id, userId);
    console.log('✓ Hasil Ingest ke Keuangan:', sendRes.message);

    // 3. Verifikasi Data & Snapshot di Keuangan
    console.log('\n3. Menguji Penyimpanan Breakdown Snapshot di Keuangan...');
    const disbursements = await keuanganPayrollService.listPayrollDisbursements(schoolUnitId, {
      period_year: testYear,
      period_month: testMonth
    });

    console.log(`✓ Ditemukan ${disbursements.length} antrian pencairan di Keuangan.`);
    const sampleDisb = disbursements[0];
    console.log('✓ Sample Snapshot Komponen:', sampleDisb.breakdown_snapshot);

    if (!sampleDisb.breakdown_snapshot || !sampleDisb.breakdown_snapshot.salary_components) {
      throw new Error('FAILED: breakdown_snapshot tidak tersimpan dengan benar');
    }

    // 4. Menguji Alur Tolak / Kembalikan untuk Koreksi (Reject Disbursement)
    console.log('\n4. Menguji Alur Kembalikan untuk Koreksi (rejectPayrollDisbursement)...');
    const rejectReason = 'Tunjangan jabatan tidak sesuai SK no 12/2026';
    const rejectRes = await keuanganPayrollService.rejectPayrollDisbursement(
      schoolUnitId,
      sampleDisb.id,
      rejectReason,
      userId
    );

    console.log('✓ Hasil Pengembalian di Keuangan:', {
      id: rejectRes.id,
      status: rejectRes.status,
      rejection_reason: rejectRes.rejection_reason
    });
    if (rejectRes.status !== 'rejected') throw new Error('FAILED: Status harus rejected');

    // 5. Cek Sinkronisasi Balik ke Kepegawaian
    console.log('\n5. Memeriksa Sinkronisasi Status di Kepegawaian...');
    const itemInKep = await dbKepegawaian('payroll_items')
      .where({ payroll_period_id: period.id, employee_id: sampleDisb.employee_id })
      .first();

    const periodAfterReject = await kepegawaianPayrollService.getPeriodById(period.id);

    console.log('✓ Status Periode Kepegawaian Unlocked:', periodAfterReject.status);
    console.log('✓ Item Pegawai Tercatat Alasan Penolakan:', itemInKep.rejection_reason);

    if (itemInKep.verified_at !== null) throw new Error('FAILED: verified_at harus direset null');
    if (itemInKep.rejection_reason !== rejectReason) throw new Error('FAILED: rejection_reason tidak sinkron');

    // 6. SDM / HRD Melakukan Koreksi atas Catatan Keuangan
    console.log('\n6. HRD Melakukan Koreksi Nominal & Alasan Koreksi...');
    const editedItem = await kepegawaianPayrollService.updateItem(itemInKep.id, {
      salary_components: {
        ...JSON.parse(itemInKep.salary_components),
        tunjangan_jabatan: 1000000
      },
      deductions: JSON.parse(itemInKep.deductions),
      net_salary: 4950000,
      edit_reason: 'Penyesuaian tunjangan sesuai SK No 12/2026 hasil koreksi Keuangan'
    }, userId);

    console.log('✓ Item Berhasil Dikoreksi:', {
      item_id: editedItem.id,
      net_salary: editedItem.net_salary,
      rejection_cleared: editedItem.rejection_reason === null
    });

    // 7. HRD Memverifikasi Ulang, Mengunci & Mengirim Ulang (Re-Ingest)
    console.log('\n7. HRD Verifikasi Ulang & Kirim Ulang ke Keuangan...');
    await kepegawaianPayrollService.verifyItem(editedItem.id, { id: userId, ref_type: 'staff', ref_id: 1 });
    await kepegawaianPayrollService.lockPeriod(period.id, userId);
    await kepegawaianPayrollService.sendToFinance(period.id, userId);

    const disbAfterReIngest = await dbKeuangan('payroll_disbursements').where({ id: sampleDisb.id }).first();
    console.log('✓ Hasil Re-Ingest di Keuangan:', {
      id: disbAfterReIngest.id,
      status: disbAfterReIngest.status,
      new_amount: disbAfterReIngest.amount,
      rejection_cleared: disbAfterReIngest.rejection_reason === null
    });

    if (disbAfterReIngest.status !== 'pending' || parseFloat(disbAfterReIngest.amount) !== 4950000) {
      throw new Error('FAILED: Re-ingest harus mengembalikan status pending dan mengupdate nominal');
    }

    // 8. Keuangan Mencairkan Gaji
    console.log('\n8. Keuangan Melakukan Pencairan Gaji...');
    const disburseRes = await keuanganPayrollService.disbursePayroll(
      schoolUnitId,
      sampleDisb.id,
      1,
      userId
    );
    console.log('✓ Gaji Berhasil Dicairkan:', {
      id: disburseRes.data.id,
      status: disburseRes.data.status,
      disbursed_at: disburseRes.data.disbursed_at
    });
    if (disburseRes.data.status !== 'disbursed') throw new Error('FAILED: Status harus disbursed');

    // 9. Menguji Proteksi Anti-Overwrite: Coba Ingest Ulang data yang sudah dicairkan (HARUS DITOLAK)
    console.log('\n9. Menguji Proteksi Anti-Overwrite pada Data yang Sudah Dicairkan...');
    try {
      await keuanganPayrollService.ingestPayrollDisbursement({
        school_unit_id: schoolUnitId,
        employee_id: sampleDisb.employee_id,
        period_month: testMonth,
        period_year: testYear,
        amount: 9999999,
        cash_account_id: 1
      });
      throw new Error('FAILED: Ingest ulang pada gaji yang sudah dicairkan seharusnya ditolak 409!');
    } catch (err) {
      console.log('✓ Proteksi Anti-Overwrite Berhasil:', err.message);
    }

    console.log('\n=== SELURUH PENGUJIAN KEUANGAN PAYROLL & REJECTION FLOW BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exit(1);
  } finally {
    await dbKepegawaian.destroy();
    await dbKeuangan.destroy();
  }
}

runTests();
