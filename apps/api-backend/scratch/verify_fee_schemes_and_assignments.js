/**
 * Automated Verification Script: Fee Schemes & Student Fee Assignments
 */
const db = require('../src/config/db/keuangan');
const feeSchemesService = require('../src/modules/keuangan/schemes/service');
const billsService = require('../src/modules/keuangan/bills/service');

async function testFeeSchemesAndAssignments() {
  console.log('=== 1. Test CRUD Fee Schemes & Items ===');
  const unitId = 1;
  const yearId = 1;

  // Clean up any test schemes first
  await db('fee_schemes').where({ school_unit_id: unitId, code: 'TEST_REGULER' }).delete();
  await db('fee_schemes').where({ school_unit_id: unitId, code: 'TEST_BEASISWA_50' }).delete();

  // Find fee types
  const feeTypes = await db('fee_types').where({ school_unit_id: unitId });
  const sppFeeType = feeTypes.find(f => f.billing_pattern === 'monthly') || feeTypes[0];

  console.log(`Using Fee Type ID: ${sppFeeType.id} (${sppFeeType.name})`);

  // Create Standard Scheme: TEST_REGULER (Fixed Rp 350.000)
  const schemeReguler = await feeSchemesService.createFeeScheme(unitId, {
    academic_year_id: yearId,
    code: 'TEST_REGULER',
    name: 'Skema Reguler Test',
    description: 'Tarif reguler siswa umum',
    items: [
      {
        fee_type_id: sppFeeType.id,
        value_type: 'fixed_amount',
        value: 350000
      }
    ]
  }, 1);
  console.log('PASS: Created Scheme Reguler:', schemeReguler.id, schemeReguler.code, schemeReguler.name);

  // Create Scholarship Scheme: TEST_BEASISWA_50 (50% Discount)
  const schemeBeasiswa50 = await feeSchemesService.createFeeScheme(unitId, {
    academic_year_id: yearId,
    code: 'TEST_BEASISWA_50',
    name: 'Skema Beasiswa 50% Test',
    description: 'Potongan beasiswa prestasi daerah',
    items: [
      {
        fee_type_id: sppFeeType.id,
        value_type: 'percentage_of_reference',
        value: 50
      }
    ]
  }, 1);
  console.log('PASS: Created Scheme Beasiswa 50%:', schemeBeasiswa50.id, schemeBeasiswa50.code, schemeBeasiswa50.name);

  // List schemes
  const allSchemes = await feeSchemesService.listFeeSchemes(unitId, { academic_year_id: yearId });
  console.log(`PASS: listFeeSchemes returned ${allSchemes.length} schemes`);

  console.log('\n=== 2. Test Student Fee Assignments (Single & Bulk) ===');
  const student1Id = 1;
  const student2Id = 2;

  // Clean up existing assignments
  await db('student_fee_scheme_assignments').whereIn('student_id', [student1Id, student2Id]).delete();

  // Single assign to Student 1: Reguler
  const assign1 = await feeSchemesService.assignSchemeToStudent(unitId, {
    student_id: student1Id,
    academic_year_id: yearId,
    fee_scheme_id: schemeReguler.id,
    reason: 'Penetapan awal skema reguler'
  }, 1);
  console.log('PASS: Single assigned student 1 to reguler:', assign1.id, assign1.fee_scheme_id);

  // Update assignment of Student 1 to Beasiswa 50% with reason
  const assign1Updated = await feeSchemesService.assignSchemeToStudent(unitId, {
    student_id: student1Id,
    academic_year_id: yearId,
    fee_scheme_id: schemeBeasiswa50.id,
    reason: 'Pemberian beasiswa prestasi semester 1'
  }, 1);
  console.log('PASS: Updated student 1 to Beasiswa 50% with audit snapshot');

  // Verify failure when reason is empty on update
  try {
    await feeSchemesService.assignSchemeToStudent(unitId, {
      student_id: student1Id,
      academic_year_id: yearId,
      fee_scheme_id: schemeReguler.id,
      reason: '' // Missing reason
    }, 1);
    console.error('FAIL: Missing reason was not rejected');
  } catch (err) {
    console.log('PASS: Correctly rejected assignment update without reason:', err.message);
  }

  // Bulk assign to Student 1 & 2
  const bulkResult = await feeSchemesService.bulkAssignScheme(unitId, {
    student_ids: [student1Id, student2Id],
    academic_year_id: yearId,
    fee_scheme_id: schemeReguler.id,
    reason: 'Penetapan massal tahun ajaran baru'
  }, 1);
  console.log('PASS: Bulk assigned to students:', bulkResult.total_assigned);

  console.log('\n=== 3. Test Custom Fee Assignment ===');
  const customAssign = await feeSchemesService.assignCustomStudentFee(unitId, {
    student_id: student2Id,
    academic_year_id: yearId,
    reason: 'Dispensasi khusus anak yatim / dhuafa',
    custom_items: [
      {
        fee_type_id: sppFeeType.id,
        adjustment_kind: 'override_amount',
        override_amount: 100000,
        reason: 'Tarif khusus Rp 100.000/bulan'
      }
    ]
  }, 1);
  console.log('PASS: Custom assigned student 2:', customAssign.id, customAssign.is_custom);

  console.log('\n=== 4. Test Student Bills Generation Calculation ===');
  // Student 1 has scheme TEST_REGULER (350.000)
  // Student 2 has custom override (100.000)
  const calculatedBills = await billsService.calculateBillsForStudents(unitId, {
    fee_type_id: sppFeeType.id,
    period_month: 8,
    period_year: yearId,
    target: 'individual',
    student_ids: [student1Id, student2Id]
  });

  console.log('Calculated Bills Result:');
  calculatedBills.forEach(b => {
    console.log(` - Student ID: ${b.student_id} (${b.student_name}) | Final Amount: Rp ${b.final_amount.toLocaleString('id-ID')} | Note: ${b.adjustment_applied}`);
  });

  const bill1 = calculatedBills.find(b => b.student_id === student1Id);
  const bill2 = calculatedBills.find(b => b.student_id === student2Id);

  if (bill1 && bill1.final_amount === 350000) {
    console.log('PASS: Student 1 billed according to standard scheme (Rp 350.000)');
  } else {
    console.error('FAIL: Student 1 bill mismatch:', bill1);
  }

  if (bill2 && bill2.final_amount === 100000) {
    console.log('PASS: Student 2 billed according to custom override (Rp 100.000)');
  } else {
    console.error('FAIL: Student 2 bill mismatch:', bill2);
  }

  console.log('\n=== 5. Verify Audit Trail Logs ===');
  const auditLogs = await db('finance_audit_logs')
    .where({ school_unit_id: unitId })
    .whereIn('entity_type', ['fee_scheme', 'student_fee_scheme_assignment'])
    .orderBy('id', 'desc')
    .limit(5);

  console.log(`PASS: Found ${auditLogs.length} audit trail logs:`);
  auditLogs.forEach(l => {
    console.log(` - [${l.action}] Entity: ${l.entity_type} #${l.entity_id || '-'}`);
  });

  // Clean up test data
  console.log('\nCleaning up test records...');
  await db('student_fee_adjustments').whereIn('student_id', [student1Id, student2Id]).delete();
  await db('student_fee_scheme_assignments').whereIn('student_id', [student1Id, student2Id]).delete();
  await db('fee_scheme_items').whereIn('fee_scheme_id', [schemeReguler.id, schemeBeasiswa50.id]).delete();
  await db('fee_schemes').whereIn('id', [schemeReguler.id, schemeBeasiswa50.id]).delete();

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

testFeeSchemesAndAssignments().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
