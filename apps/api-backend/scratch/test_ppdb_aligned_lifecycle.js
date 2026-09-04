/**
 * Scratch Test: PPDB Billing Full Aligned Lifecycle (Tahap 2)
 */
const knex = require('../src/config/db/keuangan');
const ppdbService = require('../src/modules/keuangan/ppdb-billing/service');
const reportsService = require('../src/modules/keuangan/reports/service');
const crossModuleServices = require('../src/modules/keuangan/common/crossModuleServices');

async function runTests() {
  console.log('--- STARTING PPDB ALIGNED LIFECYCLE TESTS ---');
  const schoolUnitId = 1;
  const userId = 1;

  // Cleanup test data
  await knex('ppdb_registration_payments')
    .whereIn('ppdb_registration_bill_id', function() {
      this.select('id').from('ppdb_registration_bills').where('registrant_name_snapshot', 'like', 'TEST_%');
    }).del();

  await knex('ppdb_bill_revisions')
    .whereIn('ppdb_registration_bill_id', function() {
      this.select('id').from('ppdb_registration_bills').where('registrant_name_snapshot', 'like', 'TEST_%');
    }).del();

  await knex('ppdb_registration_bills').where('registrant_name_snapshot', 'like', 'TEST_%').del();

  // TEST 1: Create Draft Bill (Registration Fee, Tier 1 discount)
  console.log('\n[TEST 1] Create Draft Bill (Tier 1 Discount)');
  const bill1 = await ppdbService.createRegistrationBill(schoolUnitId, {
    psb_registrant_ref_id: 9901,
    academic_year_id: 1,
    target_academic_year_id: 2,
    registrant_name_snapshot: 'TEST_Santri_1',
    registration_number_snapshot: 'REG-TEST-001',
    billing_phase: 'registration_fee',
    amount: 350000,
    discount_amount: 50000, // < 15% & < 200k -> Tier 1
    discount_reason: 'Keringanan formulir awal'
  }, userId);
  console.log(`-> Bill 1 created: ID #${bill1.id}, Status: ${bill1.status} (Expected: draft), Net Amount: ${bill1.amount}`);
  if (bill1.status !== 'draft') throw new Error(`Expected draft, got ${bill1.status}`);

  // TEST 2: Create Draft Bill (Tier 2 Discount: > 15% / > 200k)
  console.log('\n[TEST 2] Create Draft Bill (Tier 2 Discount)');
  const bill2 = await ppdbService.createRegistrationBill(schoolUnitId, {
    psb_registrant_ref_id: 9902,
    academic_year_id: 1,
    target_academic_year_id: 2,
    registrant_name_snapshot: 'TEST_Santri_2',
    registration_number_snapshot: 'REG-TEST-002',
    billing_phase: 'registration_fee',
    amount: 1000000,
    discount_amount: 300000, // 30% -> Tier 2
    discount_reason: 'Diskon prestasi akademik'
  }, userId);
  console.log(`-> Bill 2 created: ID #${bill2.id}, Status: ${bill2.status} (Expected: pending_approval), Tier: ${bill2.approval_tier}`);
  if (bill2.status !== 'pending_approval' || bill2.approval_tier !== 'unit') {
    throw new Error(`Expected pending_approval / unit, got ${bill2.status} / ${bill2.approval_tier}`);
  }

  // TEST 3: Approve Tier 2 Discount
  console.log('\n[TEST 3] Approve Tier 2 Discount (Role admin_satuan_pendidikan)');
  const approveRes = await ppdbService.approveRegistrationBillDiscount(schoolUnitId, bill2.id, userId, ['admin_satuan_pendidikan']);
  const bill2Approved = await knex('ppdb_registration_bills').where({ id: bill2.id }).first();
  console.log(`-> Bill 2 after approval: Status: ${bill2Approved.status} (Expected: draft)`);
  if (bill2Approved.status !== 'draft') throw new Error(`Expected draft, got ${bill2Approved.status}`);

  // TEST 4: Publish Bills (Draft -> Unpaid + Jurnal Piutang ppdb_bill_issued)
  console.log('\n[TEST 4] Publish Bills & Accrual Journal');
  const pubRes = await ppdbService.publishRegistrationBills(schoolUnitId, [bill1.id, bill2.id], userId);
  console.log(`-> Published count: ${pubRes.published_count}`);
  const bill1Pub = await knex('ppdb_registration_bills').where({ id: bill1.id }).first();
  if (bill1Pub.status !== 'unpaid') throw new Error(`Expected unpaid, got ${bill1Pub.status}`);

  // Check Jurnal Piutang
  const jrn = await knex('journal_entries')
    .where({ source_type: 'ppdb_registration_bill', source_id: bill1.id })
    .first();
  console.log(`-> Piutang Journal created: JRN #${jrn ? jrn.journal_number : 'NONE'}`);
  if (!jrn) throw new Error('Expected accrual journal ppdb_bill_issued');

  // TEST 5: Record Payment
  console.log('\n[TEST 5] Record Payment');
  const payRes = await ppdbService.recordRegistrationPayment(schoolUnitId, bill1.id, {
    cash_account_id: 3,
    amount_paid: 300000,
    payment_method: 'cash'
  }, userId);
  console.log(`-> Payment recorded: KWT #${payRes.receipt_number}, Bill Status: ${payRes.bill.status}`);
  if (payRes.bill.status !== 'paid') throw new Error(`Expected paid, got ${payRes.bill.status}`);

  // TEST 6: Revision with Safeguard Lock
  console.log('\n[TEST 6] Revision Safeguard Lock (new_amount < paid_amount)');
  try {
    await ppdbService.reviseRegistrationBill(schoolUnitId, bill1.id, {
      new_amount: 200000, // < 300000 paid
      revision_reason: 'Mencoba menurunkan nominal di bawah nominal terbayar'
    }, userId);
    throw new Error('Safeguard FAILED: Did not block lower amount!');
  } catch (err) {
    if (err.code === 'REVISION_BELOW_PAID_AMOUNT') {
      console.log('-> PASS: Safeguard successfully blocked revision below paid_amount with 422');
    } else {
      throw err;
    }
  }

  // TEST 7: Valid Revision with Adjustment Journal
  console.log('\n[TEST 7] Valid Revision (v1 -> v2)');
  const revRes = await ppdbService.reviseRegistrationBill(schoolUnitId, bill1.id, {
    new_amount: 350000,
    revision_reason: 'Koreksi penyesuaian biaya tambahan sarana santri baru'
  }, userId);
  console.log(`-> Revision result: ${revRes.message}, New Version: v${revRes.version}, Status: ${revRes.status}`);
  const revisions = await ppdbService.getRegistrationBillRevisions(bill1.id);
  console.log(`-> Revision history count: ${revisions.length}, Reason: ${revisions[0].revision_reason}`);
  if (revisions.length === 0) throw new Error('Expected revision history record');

  // TEST 8: Installment Plan Generation (Paket Cicilan Uang Pangkal)
  console.log('\n[TEST 8] Installment Plan Generation (Uang Pangkal)');
  // Create master enrollment bill
  const masterBill = await knex('ppdb_registration_bills').insert({
    school_unit_id: schoolUnitId,
    academic_year_id: 1,
    target_academic_year_id: 2,
    psb_registrant_ref_id: 9903,
    registrant_name_snapshot: 'TEST_Santri_3',
    registration_number_snapshot: 'REG-TEST-003',
    fee_type_id: 3,
    amount: 15000000,
    billing_phase: 'enrollment_fee',
    status: 'draft'
  });
  const [masterId] = masterBill;
  const actualMasterId = masterId || (await knex('ppdb_registration_bills').where('registrant_name_snapshot', 'TEST_Santri_3').first()).id;

  const installmentPlanRes = await ppdbService.createInstallmentPlan(schoolUnitId, actualMasterId, [
    { amount: 5000000, due_date: '2026-03-10' },
    { amount: 5000000, due_date: '2026-04-10' },
    { amount: 5000000, due_date: '2026-05-10' }
  ], userId);
  console.log(`-> Installment plan created: ${installmentPlanRes.installment_count} termin, Child IDs: ${installmentPlanRes.child_bill_ids}`);
  if (installmentPlanRes.installment_count !== 3) throw new Error('Expected 3 installments');

  // TEST 9: Refund Workflow
  console.log('\n[TEST 9] Refund Workflow (Request -> Approve -> Process)');
  // Request
  const reqRefund = await ppdbService.requestRefund(schoolUnitId, bill1.id, {
    refund_bank_account_number: '1234567890',
    refund_bank_account_holder: 'Wali Santri 1',
    refund_reason: 'Santri diterima di sekolah lain'
  }, userId);
  console.log(`-> Request refund: ${reqRefund.message}`);

  // Approve
  const appRefund = await ppdbService.approveRefund(schoolUnitId, bill1.id, userId, ['admin_yayasan']);
  console.log(`-> Approve refund: ${appRefund.message}`);

  // Process
  const procRefund = await ppdbService.processRefund(schoolUnitId, bill1.id, {
    cash_account_id: 3
  }, userId, ['admin_yayasan']);

  console.log(`-> Process refund: ${procRefund.message}, Net Refund: Rp ${procRefund.net_refund_amount.toLocaleString('id-ID')}`);

  const refundedBill = await knex('ppdb_registration_bills').where({ id: bill1.id }).first();
  if (refundedBill.status !== 'refunded') throw new Error(`Expected refunded, got ${refundedBill.status}`);

  // TEST 10: Placement Hook & Student Payment Card Continuity
  console.log('\n[TEST 10] Placement Hook & Student Payment Card Continuity');
  const targetStudentId = 1; // Existing student in core/akademik
  const placementRes = await crossModuleServices.onStudentPlaced(9902, targetStudentId);
  console.log(`-> Placement hook linked ${placementRes.linked_bills_count} bills to Student #${targetStudentId}`);

  const paymentCard = await reportsService.getStudentPaymentCard(schoolUnitId, targetStudentId);
  console.log(`-> Student Payment Card unified bills: ${paymentCard.items.length}, Summary Total Billed: ${paymentCard.summary.total_billed}`);
  const hasPpdbInCard = paymentCard.items.some(it => it.is_ppdb);
  console.log(`-> PPDB items seamlessly in payment card: ${hasPpdbInCard}`);
  if (!hasPpdbInCard) throw new Error('Expected PPDB items inside student payment card');

  console.log('\n=== ALL 10 TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
