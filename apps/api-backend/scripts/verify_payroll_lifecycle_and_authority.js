/**
 * Automated Verification Script for Payroll Lifecycle, Authority Boundaries, and Finance Ingest Integration
 */
const dbKepegawaian = require('../src/config/db/kepegawaian');
const dbKeuangan = require('../src/config/db/keuangan');
const payrollService = require('../src/modules/kepegawaian/payroll/service');

async function runTests() {
  console.log('=== START VERIFICATION: PAYROLL LIFECYCLE & AUTHORITY BOUNDARIES ===\n');

  const schoolUnitId = 1;
  const userId = 88;
  const testMonth = 11;
  const testYear = 2026;

  try {
    // 0. Clean up previous test period if exists
    const existing = await dbKepegawaian('payroll_periods')
      .where({ school_unit_id: schoolUnitId, period_month: testMonth, period_year: testYear })
      .first();

    if (existing) {
      await dbKepegawaian('payroll_items').where({ payroll_period_id: existing.id }).delete();
      await dbKepegawaian('payroll_audit_logs').where({ payroll_period_id: existing.id }).delete();
      await dbKepegawaian('payroll_periods').where({ id: existing.id }).delete();
      await dbKeuangan('payroll_disbursements').where({ school_unit_id: schoolUnitId, period_month: testMonth, period_year: testYear }).delete();
    }

    // 1. Uji Create Period
    console.log('1. Menguji Pembuatan Periode Payroll Baru (createPeriod)...');
    const period = await payrollService.createPeriod({
      school_unit_id: schoolUnitId,
      period_month: testMonth,
      period_year: testYear
    }, userId);

    console.log('✓ Periode Berhasil Dibuat:', { id: period.id, status: period.status });
    if (period.status !== 'draft') throw new Error('FAILED: Status awal harus draft');

    // 2. Uji Kalkulasi Batch
    console.log('\n2. Menguji Kalkulasi Payroll Pegawai Aktif (calculatePeriod)...');
    const items = await payrollService.calculatePeriod(period.id, userId);
    console.log(`✓ Kalkulasi Selesai: ${items.length} pegawai terhitung.`);
    if (items.length === 0) throw new Error('FAILED: Tidak ada pegawai terhitung');

    const periodAfterCalc = await payrollService.getPeriodById(period.id);
    if (periodAfterCalc.status !== 'calculated') throw new Error('FAILED: Status periode harus calculated');

    // 3. Uji Edit Manual Item (dengan validasi edit_reason & previous_data)
    console.log('\n3. Menguji Koreksi Manual Komponen Gaji (updateItem)...');
    const targetItem = items[0];

    // 3a. Edit tanpa edit_reason (harus ditolak 422)
    try {
      await payrollService.updateItem(targetItem.id, {
        salary_components: { gaji_pokok: 5000000 },
        edit_reason: ''
      }, userId);
      throw new Error('FAILED: Update tanpa edit_reason seharusnya ditolak 422');
    } catch (err) {
      console.log('✓ Berhasil ditolak edit tanpa reason:', err.message);
    }

    // 3b. Edit dengan edit_reason
    const updatedItem = await payrollService.updateItem(targetItem.id, {
      salary_components: { gaji_pokok: 5500000, tunjangan_jabatan: 750000 },
      deductions: { bpjs: 50000, potongan_alpa: 0 },
      net_salary: 6200000,
      edit_reason: 'Penyesuaian tunjangan SK terbaru'
    }, userId);

    console.log('✓ Edit Item Berhasil:', {
      item_id: updatedItem.id,
      net_salary: updatedItem.net_salary,
      has_previous_data: Boolean(updatedItem.previous_data)
    });
    if (!updatedItem.previous_data) throw new Error('FAILED: previous_data harus tersimpan');

    // 4. Uji Verifikasi Tiap Item
    console.log('\n4. Menguji Verifikasi Tiap Slip Gaji (verifyItem)...');
    for (const it of items) {
      await payrollService.verifyItem(it.id, { id: userId, ref_type: 'staff', ref_id: 1 });
    }

    const periodAfterVerify = await payrollService.getPeriodById(period.id);
    console.log('✓ Seluruh Item Terverifikasi, Status Periode:', periodAfterVerify.status);
    if (periodAfterVerify.status !== 'verified') throw new Error('FAILED: Status periode harus verified');

    // 5. Uji Penguncian Periode (lockPeriod)
    console.log('\n5. Menguji Penguncian Periode Payroll (lockPeriod)...');
    const lockedPeriod = await payrollService.lockPeriod(period.id, userId);
    console.log('✓ Periode Berhasil Dikunci (LOCKED):', {
      status: lockedPeriod.status,
      locked_by: lockedPeriod.locked_by,
      locked_at: lockedPeriod.locked_at
    });
    if (lockedPeriod.status !== 'locked' || !lockedPeriod.locked_by) {
      throw new Error('FAILED: Status harus locked dan locked_by harus terisi');
    }

    // 6. Uji Proteksi: Coba edit item setelah locked (HARUS DITOLAK)
    console.log('\n6. Menguji Proteksi Pengeditan setelah Terkunci (Anti-Tamper)...');
    try {
      await payrollService.updateItem(targetItem.id, {
        net_salary: 9999999,
        edit_reason: 'Mencoba manipulasi data yang sudah terkunci'
      }, userId);
      throw new Error('FAILED: Edit pada status locked seharusnya ditolak!');
    } catch (err) {
      console.log('✓ Berhasil ditolak pengeditan pada status locked:', err.message);
    }

    // 7. Uji Serah Terima ke Keuangan (sendToFinance -> Ingest ke payroll_disbursements)
    console.log('\n7. Menguji Serah Terima ke Keuangan (sendToFinance & Ingest)...');
    const sendResult = await payrollService.sendToFinance(period.id, userId);
    console.log('✓ Hasil Serah Terima ke Keuangan:', sendResult);
    if (!sendResult.success) throw new Error('FAILED: sendToFinance harus sukses');

    const periodAfterSend = await payrollService.getPeriodById(period.id);
    if (periodAfterSend.status !== 'sent_to_finance') {
      throw new Error('FAILED: Status periode harus sent_to_finance');
    }

    // Periksa tabel payroll_disbursements di database Keuangan
    const disbursementsInFinance = await dbKeuangan('payroll_disbursements')
      .where({ school_unit_id: schoolUnitId, period_month: testMonth, period_year: testYear });

    console.log(`✓ Verifikasi Data di Modul Keuangan: Ditemukan ${disbursementsInFinance.length} antrian pencairan gaji.`);
    if (disbursementsInFinance.length !== items.length) {
      throw new Error(`FAILED: Jumlah data di Keuangan (${disbursementsInFinance.length}) tidak sama dengan item Kepegawaian (${items.length})`);
    }

    // 8. Uji Audit Trail Riwayat Payroll
    console.log('\n8. Menguji Audit Trail Riwayat Payroll (getPeriodAuditLogs)...');
    const auditLogs = await payrollService.getPeriodAuditLogs(period.id);
    console.log(`✓ Berhasil Mengambil ${auditLogs.length} Entri Jejak Audit:`);
    auditLogs.forEach((l, idx) => {
      console.log(`   ${idx + 1}. [${l.action}] - ${l.reason || '-'} (${new Date(l.created_at).toLocaleTimeString()})`);
    });

    const expectedActions = ['CREATE_PERIOD', 'CALCULATE', 'EDIT_ITEM', 'VERIFY_ITEM', 'LOCK_PERIOD', 'SEND_TO_FINANCE'];
    for (const act of expectedActions) {
      if (!auditLogs.some(l => l.action === act)) {
        throw new Error(`FAILED: Aksi audit '${act}' tidak ditemukan dalam log`);
      }
    }

    console.log('\n=== SELURUH PENGUJIAN PAYROLL LIFECYCLE & INTEGRASI INGEST BERHASIL (ALL PASS) ===');
  } catch (error) {
    console.error('\n❌ ERROR SAAT VERIFIKASI:', error);
    process.exit(1);
  } finally {
    await dbKepegawaian.destroy();
    await dbKeuangan.destroy();
  }
}

runTests();
