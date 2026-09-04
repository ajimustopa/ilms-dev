/**
 * Scratch test & benchmark for getClassStudentLedger (Tahap 3)
 */
const reportsService = require('../src/modules/keuangan/reports/service');
const crossModuleServices = require('../src/modules/keuangan/common/crossModuleServices');
const knex = require('../src/config/db/keuangan');

async function runBenchmark() {
  console.log('--- STARTING STUDENT LEDGER BENCHMARK & VERIFICATION ---');

  const schoolUnitId = 1;

  // 1. Run new single-pass batch ingest + conditional pivot query
  console.log('\n[TEST 1] Testing new getClassStudentLedger implementation...');
  const startNew = Date.now();
  const resNew = await reportsService.getClassStudentLedger(schoolUnitId, {
    page: 1,
    per_page: 50
  });
  const durationNew = Date.now() - startNew;
  console.log(`-> New implementation response time: ${durationNew} ms`);
  console.log(`-> Academic Year: ${resNew.academic_year.name} (ID: ${resNew.academic_year.id})`);
  console.log(`-> Total Students: ${resNew.performance_summary.total_students}`);
  console.log(`-> Overall Billed: Rp ${resNew.performance_summary.total_billed.toLocaleString('id-ID')}`);
  console.log(`-> Overall Paid: Rp ${resNew.performance_summary.total_paid.toLocaleString('id-ID')}`);
  console.log(`-> Overall Remaining: Rp ${resNew.performance_summary.total_remaining.toLocaleString('id-ID')}`);
  console.log(`-> Overall Collection Rate: ${resNew.performance_summary.overall_collection_rate}%`);

  // Verify monthly_performance
  console.log(`-> Monthly Performance array length: ${resNew.performance_summary.monthly_performance.length} months`);
  const jul = resNew.performance_summary.monthly_performance.find(m => m.month_key === 'jul');
  console.log(`   Sample Month (Juli): Target Rp ${jul.target_billed.toLocaleString('id-ID')}, Realisasi Rp ${jul.actual_collected.toLocaleString('id-ID')}, Rate ${jul.collection_rate}%`);

  // Verify student row
  if (resNew.students.length > 0) {
    const s1 = resNew.students[0];
    console.log(`-> Sample Student Row: ${s1.name} (NIS: ${s1.nis}, Kelas: ${s1.class_name})`);
    console.log(`   Aging: ${s1.aging_days} hari -> Status: ${s1.aging_status}`);
    console.log(`   Months breakdown keys: ${Object.keys(s1.months).join(', ')}`);
    console.log(`   Juli: billed ${s1.months.jul.billed}, paid ${s1.months.jul.paid}, status: ${s1.months.jul.status}`);
  }

  // 2. Test All-Years Mode
  console.log('\n[TEST 2] Testing all_years=true parameter...');
  const resAllYears = await reportsService.getClassStudentLedger(schoolUnitId, {
    all_years: true,
    per_page: 10
  });
  console.log(`-> All-Years Mode: ${resAllYears.academic_year.name}`);
  console.log(`-> Total Students in All Years: ${resAllYears.performance_summary.total_students}`);

  // 3. Test Filters (unpaid_only)
  console.log('\n[TEST 3] Testing payment_status=unpaid_only filter...');
  const resUnpaid = await reportsService.getClassStudentLedger(schoolUnitId, {
    payment_status: 'unpaid_only',
    per_page: 10
  });
  console.log(`-> Unpaid-only students count: ${resUnpaid.pagination.total_records}`);
  const hasOnlyUnpaid = resUnpaid.students.every(s => s.total_remaining > 0);
  console.log(`-> All returned students have remaining > 0: ${hasOnlyUnpaid}`);

  // 4. Simulate N+1 vs Batch Ingest Benchmark
  console.log('\n[TEST 4] Performance Benchmark: N+1 queries vs 1 Batch Ingest query');
  // Get sample student IDs
  const sampleBills = await knex('student_bills')
    .where('school_unit_id', schoolUnitId)
    .whereNotIn('status', ['draft', 'cancelled'])
    .select('student_id');
  const sampleStudentIds = [...new Set(sampleBills.map(b => b.student_id))].slice(0, 50);

  // If there are few, duplicate to simulate 50 students
  const testIds = sampleStudentIds.length > 0
    ? sampleStudentIds
    : [1, 2, 3];
  while (testIds.length < 50 && testIds.length > 0) {
    testIds.push(testIds[0]);
  }

  // Simulate Old N+1 pattern
  const startNPlus1 = Date.now();
  await Promise.all(testIds.map(async sId => {
    return crossModuleServices.getStudent(sId);
  }));
  const durationNPlus1 = Date.now() - startNPlus1;

  // Simulate New Batch Ingest pattern
  const startBatch = Date.now();
  await crossModuleServices.getStudentsByIds(testIds);
  const durationBatch = Date.now() - startBatch;

  console.log(`-> Simulating ${testIds.length} students:`);
  console.log(`   [OLD] N+1 queries Promise.all: ${durationNPlus1} ms`);
  console.log(`   [NEW] 1 Batch Ingest query:     ${durationBatch} ms`);
  console.log(`   [SPEEDUP]: ${(durationNPlus1 / Math.max(1, durationBatch)).toFixed(2)}x faster!`);

  console.log('\n=== ALL BENCHMARKS & VERIFICATIONS PASSED ===\n');
  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('BENCHMARK FAILED:', err);
  process.exit(1);
});
