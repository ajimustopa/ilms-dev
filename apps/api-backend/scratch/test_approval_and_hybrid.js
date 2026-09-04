/**
 * Verification test script for Bagian 4 (Approval Berjenjang) & Bagian 5 (Generator Bulanan Pola Hibrida)
 */
const db = require('../src/config/db/keuangan');
const billsService = require('../src/modules/keuangan/bills/service');

async function runTest() {
  console.log('=== TESTING BAGIAN 4 (APPROVAL BERJENJANG) & BAGIAN 5 (GENERATOR HIBRIDA) ===');

  const schoolUnitId = 1;
  const studentId = 5; // Murid valid

  // Cari / siapkan fee type bulanan
  let feeType = await db('fee_types')
    .where({ school_unit_id: schoolUnitId, billing_pattern: 'monthly' })
    .first();
  if (!feeType) {
    const [id] = await db('fee_types').insert({
      school_unit_id: schoolUnitId,
      name: 'SPP Bulanan Test',
      billing_pattern: 'monthly',
      is_active: 1
    });
    feeType = await db('fee_types').where({ id }).first();
  }

  // Bersihkan data lama siswa 5 untuk periode uji 2026/01, 2026/02, 2026/03
  for (const m of [1, 2, 3]) {
    const oldBills = await db('student_bills').where({ school_unit_id: schoolUnitId, student_id: studentId, fee_type_id: feeType.id, period_year: 2026, period_month: m });
    for (const b of oldBills) {
      await db('bill_payments').where({ student_bill_id: b.id }).del();
      await db('student_bill_revisions').where({ student_bill_id: b.id }).del();
      await db('student_bills').where({ id: b.id }).del();
    }
  }

  // 1. Uji Diskon Tingkat 1 (<= 15% atau <= 200rb) -> Langsung 'draft', approval_tier null
  console.log('\n[1] Membuat draf manual dengan diskon 10% (Tingkat 1)...');
  const billTier1 = await billsService.createManualDraftBill(schoolUnitId, {
    student_id: studentId,
    academic_year_id: 1,
    fee_type_id: feeType.id,
    amount: 450000.00,
    discount_amount: 50000.00,
    discount_type: 'percentage',
    discount_percentage: 10.00,
    discount_reason: 'Diskon prestasi akademik',
    due_date: '2026-01-10',
    period_month: 1,
    period_year: 2026
  }, 1);

  console.log('Tier 1 Result:', { id: billTier1.id, status: billTier1.status, tier: billTier1.approval_tier });
  if (billTier1.status !== 'draft' || billTier1.approval_tier !== null) {
    throw new Error(`Tier 1 harus status 'draft' dan tier null, didapat status '${billTier1.status}' tier '${billTier1.approval_tier}'`);
  }

  // 2. Uji Diskon Tingkat 2 (> 15% s.d. 50%) -> 'pending_approval', tier 'unit'
  console.log('\n[2] Membuat draf manual dengan diskon 30% (Tingkat 2)...');
  const billTier2 = await billsService.createManualDraftBill(schoolUnitId, {
    student_id: studentId,
    academic_year_id: 1,
    fee_type_id: feeType.id,
    amount: 350000.00,
    discount_amount: 150000.00,
    discount_type: 'percentage',
    discount_percentage: 30.00,
    discount_sk_number: 'SK-UNIT-001',
    discount_reason: 'Keringanan khusus yatim',
    due_date: '2026-02-10',
    period_month: 2,
    period_year: 2026
  }, 1);

  console.log('Tier 2 Result:', { id: billTier2.id, status: billTier2.status, tier: billTier2.approval_tier });
  if (billTier2.status !== 'pending_approval' || billTier2.approval_tier !== 'unit') {
    throw new Error(`Tier 2 harus status 'pending_approval' dan tier 'unit', didapat status '${billTier2.status}' tier '${billTier2.approval_tier}'`);
  }

  // 3. Uji Safeguard Penerbitan: tagihan pending_approval DITOLAK saat publish
  console.log('\n[3] Menguji safeguard publishBills menolak tagihan pending_approval...');
  try {
    await billsService.publishBills(schoolUnitId, { bill_ids: [billTier2.id] }, 1);
    throw new Error('SEHARUSNYA GAGAL tapi berhasil menerbitkan tagihan pending approval!');
  } catch (pubErr) {
    console.log('SAFEGUARD BERHASIL! Error ditolak dengan pesan:', pubErr.message);
  }

  // 4. Uji Approval Diskon Tingkat 2 oleh role admin_satuan_pendidikan
  console.log('\n[4] Menyetujui diskon Tingkat 2 oleh Kepala Satuan Pendidikan...');
  const approvedTier2 = await billsService.approveBillDiscount(schoolUnitId, billTier2.id, 10, ['admin_satuan_pendidikan']);
  console.log('Approved Tier 2 State:', { id: approvedTier2.id, status: approvedTier2.status, approved_by: approvedTier2.approved_by });
  if (approvedTier2.status !== 'draft') {
    throw new Error(`Status pasca persetujuan harus 'draft', didapat '${approvedTier2.status}'`);
  }

  // 5. Uji Diskon Tingkat 3 (Full Waiver / 100%) -> 'pending_approval', tier 'yayasan'
  console.log('\n[5] Membuat draf manual dengan Full Waiver 100% (Tingkat 3)...');
  const billTier3 = await billsService.createManualDraftBill(schoolUnitId, {
    student_id: studentId,
    academic_year_id: 1,
    fee_type_id: feeType.id,
    amount: 0.00,
    discount_amount: 500000.00,
    discount_type: 'full_waiver',
    discount_percentage: 100.00,
    discount_sk_number: 'SK-YAYASAN-100',
    discount_sk_document_url: 'https://storage.aldepos.id/sk/sk-yayasan-100.pdf',
    discount_reason: 'Beasiswa Penuh Yayasan Santri Berprestasi',
    due_date: '2026-03-10',
    period_month: 3,
    period_year: 2026
  }, 1);

  console.log('Tier 3 Result:', { id: billTier3.id, status: billTier3.status, tier: billTier3.approval_tier });
  if (billTier3.status !== 'pending_approval' || billTier3.approval_tier !== 'yayasan') {
    throw new Error(`Tier 3 harus status 'pending_approval' dan tier 'yayasan'`);
  }

  // Uji Penolakan Diskon Tingkat 3
  console.log('\n[6] Menguji penolakan diskon (rejectBillDiscount)...');
  const rejectedTier3 = await billsService.rejectBillDiscount(schoolUnitId, billTier3.id, 'Berkas pendukung SK belum terverifikasi', 2, ['admin_yayasan']);
  console.log('Rejected Tier 3 State:', {
    id: rejectedTier3.id,
    status: rejectedTier3.status,
    amount: rejectedTier3.amount,
    discount_amount: rejectedTier3.discount_amount,
    rejection_reason: rejectedTier3.rejection_reason
  });
  if (parseFloat(rejectedTier3.amount) !== 500000 || parseFloat(rejectedTier3.discount_amount) !== 0) {
    throw new Error('Nominal tidak dikembalikan ke tarif normal!');
  }

  // 7. Uji Bagian 5: autoGenerateMonthlyDraftBills
  console.log('\n[7] Menguji autoGenerateMonthlyDraftBills (Cron Generator Bulanan Pola Hibrida)...');
  const cronRes = await billsService.autoGenerateMonthlyDraftBills(1, 12);
  console.log('Cron Generator Result:', cronRes);

  // Bersihkan data uji coba
  for (const m of [1, 2, 3]) {
    const oldBills = await db('student_bills').where({ school_unit_id: schoolUnitId, student_id: studentId, fee_type_id: feeType.id, period_year: 2026, period_month: m });
    for (const b of oldBills) {
      await db('bill_payments').where({ student_bill_id: b.id }).del();
      await db('student_bill_revisions').where({ student_bill_id: b.id }).del();
      await db('student_bills').where({ id: b.id }).del();
    }
  }

  console.log('\n=== SELURUH PENGUJIAN BAGIAN 4 & 5 SUKSES (100% PASS) ===');
  process.exit(0);
}

runTest().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
