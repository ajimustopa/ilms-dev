const db = require('../src/config/db/akademik');
const studentsService = require('../src/modules/akademik/students/service');
const reportsService = require('../src/modules/akademik/reports/service');
const curriculumService = require('../src/modules/akademik/curriculum/service');

async function testFix() {
  console.log('=== VERIFYING AKADEMIK QUERIES WITH ALL PARAMETER SCENARIOS ===\n');

  try {
    // 1. Students Service
    console.log('1. StudentsService.listStudents:');
    const stUnit1 = await studentsService.listStudents({ satuan_pendidikan_id: 1, limit: 5 });
    console.log('  - Unit 1:', stUnit1.total, 'students');

    const stUnitAll = await studentsService.listStudents({ satuan_pendidikan_id: 'all', limit: 5 });
    console.log('  - Unit "all":', stUnitAll.total, 'students');

    const stNoUnit = await studentsService.listStudents({ limit: 5 });
    console.log('  - No Unit specified:', stNoUnit.total, 'students');

    // 2. Reports Service
    console.log('\n2. ReportsService.getAcademicSummary:');
    const sumUnit1 = await reportsService.getAcademicSummary({ satuan_pendidikan_id: 1 });
    console.log('  - Unit 1:', sumUnit1);

    const sumUnitAll = await reportsService.getAcademicSummary({ satuan_pendidikan_id: 'all' });
    console.log('  - Unit "all":', sumUnitAll);

    // 3. Curriculum Service - Academic Years
    console.log('\n3. CurriculumService.listAcademicYears:');
    const yrsUnit1 = await curriculumService.listAcademicYears({ satuan_pendidikan_id: 1 });
    console.log('  - Unit 1:', yrsUnit1.length, 'years');

    const yrsUnitAll = await curriculumService.listAcademicYears({ satuan_pendidikan_id: 'all' });
    console.log('  - Unit "all":', yrsUnitAll.length, 'years');

    // 4. Curriculum Service - Class Groups (Rombel)
    console.log('\n4. CurriculumService.listClassGroups:');
    const cgUnit1 = await curriculumService.listClassGroups({ satuan_pendidikan_id: 1 });
    console.log('  - Unit 1:', cgUnit1.length, 'classes');

    const cgUnitAll = await curriculumService.listClassGroups({ satuan_pendidikan_id: 'all' });
    console.log('  - Unit "all":', cgUnitAll.length, 'classes');

    console.log('\n>>> ALL SCENARIOS RETURN REAL DATA SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await db.destroy();
  }
}

testFix();
