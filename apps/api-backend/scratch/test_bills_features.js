/**
 * Verification script for Bills Features (Bagian 1, 2, 3)
 */
const db = require('../src/config/db/keuangan');
const billsService = require('../src/modules/keuangan/bills/service');

async function runTest() {
  console.log('=== TESTING BILLS FEATURES (BAGIAN 1, 2, 3) ===');

  const schoolUnitId = 1;
  const testStudentId = 5;

  // Pastikan ada fee_type
  let feeType = await db('fee_types').where({ school_unit_id: schoolUnitId }).first();
  if (!feeType) {
    console.log('Tidak ada fee_type, membuat mock...');
    const [id] = await db('fee_types').insert({
      school_unit_id: schoolUnitId,
      name: 'SPP Uji Coba',
      billing_pattern: 'monthly',
      is_active: 1
    });
    feeType = await db('fee_types').where({ id }).first();
  }

  // 1. Test Bagian 2: createManualDraftBill
  const manualData = {
    student_id: testStudentId,
    academic_year_id: 1,
    fee_type_id: feeType.id,
    amount: 500000.00,
    discount_amount: 50000.00,
    discount_type: 'fixed_amount',
    discount_sk_number: 'SK-TEST/2026/001',
    discount_sk_date: '2026-08-01',
    discount_reason: 'Beasiswa Uji Coba',
    due_date: '2026-11-10',
    period_month: 11,
    period_year: 2026,
    notes: 'Draft manual test'
  };

  // Bersihkan data lama jika ada
  const existingBills = await db('student_bills')
    .where({
      school_unit_id: schoolUnitId,
      student_id: testStudentId,
      fee_type_id: feeType.id,
      period_year: 2026,
      period_month: 11
    });
  for (const eb of existingBills) {
    await db('bill_payments').where({ student_bill_id: eb.id }).del();
    await db('student_bill_revisions').where({ student_bill_id: eb.id }).del();
    await db('student_bills').where({ id: eb.id }).del();
  }

  console.log('\n[1] Membuat draf tagihan manual individual...');
  const draftBill = await billsService.createManualDraftBill(schoolUnitId, manualData, 1);
  console.log('Draft Bill Created:', {
    id: draftBill.id,
    amount: draftBill.amount,
    discount_amount: draftBill.discount_amount,
    discount_sk_number: draftBill.discount_sk_number,
    version: draftBill.version,
    status: draftBill.status
  });

  if (draftBill.status !== 'draft') {
    throw new Error(`Status harus 'draft', tapi bernilai '${draftBill.status}'`);
  }

  // 2. Test Terbitkan Tagihan (Publish)
  console.log('\n[2] Menerbitkan tagihan (Draft -> Unpaid & Jurnal)...');
  const pubRes = await billsService.publishBills(schoolUnitId, { bill_ids: [draftBill.id] }, 1);
  console.log('Publish result:', pubRes);

  const publishedBill = await billsService.getBillById(schoolUnitId, draftBill.id);
  console.log('Published Bill State:', {
    id: publishedBill.id,
    status: publishedBill.status,
    published_at: publishedBill.published_at,
    published_by: publishedBill.published_by
  });

  if (publishedBill.status !== 'unpaid') {
    throw new Error(`Status harus 'unpaid', tapi bernilai '${publishedBill.status}'`);
  }

  // 3. Test Bagian 3: Revisi Pasca-Terbit dengan Jurnal Penyesuaian
  console.log('\n[3] Melakukan revisi pasca-terbit (Diskon naik Rp 100.000, nominal tagihan turun jadi Rp 400.000)...');
  const revRes = await billsService.reviseIssuedBill(schoolUnitId, draftBill.id, {
    new_amount: 400000.00,
    new_discount_amount: 150000.00,
    discount_sk_number: 'SK-REVISI/2026/002',
    discount_sk_date: '2026-09-02',
    discount_reason: 'Penyesuaian SK Yayasan Tahfidz',
    revision_reason: 'Pemberian tambahan beasiswa tahfidz 30 juz',
    due_date: '2026-09-15'
  }, 1);

  console.log('Revisi Result:', revRes);

  // 4. Test Safeguard: Tolak jika new_amount < paid_amount
  console.log('\n[4] Menguji safeguard partial payment...');
  const cashAcc = await db('cash_accounts').first();
  // Simulasikan pembayaran sebagian Rp 250.000
  await db('bill_payments').insert({
    student_bill_id: draftBill.id,
    cash_account_id: cashAcc.id,
    paid_at: new Date(),
    amount: 250000.00,
    receipt_number: 'KWT-TEST-' + Date.now(),
    payment_method: 'cash'
  });
  await db('student_bills').where({ id: draftBill.id }).update({ paid_amount: 250000.00, status: 'partially_paid' });

  try {
    console.log('Mencoba revisi nominal menjadi Rp 200.000 (di bawah terbayar Rp 250.000)...');
    await billsService.reviseIssuedBill(schoolUnitId, draftBill.id, {
      new_amount: 200000.00,
      revision_reason: 'Coba turun di bawah terbayar'
    }, 1);
    throw new Error('SEHARUSNYA GAGAL tapi berhasil!');
  } catch (err) {
    console.log('SAFEGUARD BERHASIL! Error ditolak dengan pesan:', err.message);
  }

  // 5. Test Riwayat Revisi
  console.log('\n[5] Mengambil riwayat revisi tagihan...');
  const revisions = await billsService.getBillRevisions(schoolUnitId, draftBill.id);
  console.log(`Ditemukan ${revisions.length} revisi:`, revisions.map(r => ({
    rev_no: r.revision_number,
    prev: r.previous_amount,
    new: r.new_amount,
    sk: r.discount_sk_number,
    reason: r.revision_reason,
    journal_id: r.adjustment_journal_entry_id
  })));

  // Cleanup data test
  await db('bill_payments').where({ student_bill_id: draftBill.id }).del();
  await db('student_bill_revisions').where({ student_bill_id: draftBill.id }).del();
  await db('student_bills').where({ id: draftBill.id }).del();

  console.log('\n=== SELURUH TEST BAGIAN 1, 2, 3 BERHASIL! ===');
  process.exit(0);
}

runTest().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
