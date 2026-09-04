const db = require('../src/config/db/keuangan');
const dbManajemen = require('../src/config/db/manajemen');
const dbAkademik = require('../src/config/db/akademik');

async function testListBudgetPrograms() {
  console.log('Testing listBudgetPrograms with academic_year_id = 2 (2026/2027)...');
  
  const targetUnit = 1;
  const academicYearId = 2;

  let academicYearName = null;
  if (academicYearId) {
    const ay = await dbAkademik('academic_years').where({ id: academicYearId }).first();
    if (ay) academicYearName = ay.name;
  }
  console.log('Academic Year Name:', academicYearName);

  let rktQuery = dbManajemen('annual_program_targets')
    .join('rips_programs', 'annual_program_targets.rips_program_id', 'rips_programs.id')
    .leftJoin('rips_program_categories as pc', 'rips_programs.category_id', 'pc.id');

  if (academicYearName) {
    rktQuery = rktQuery.where('annual_program_targets.academic_year', academicYearName);
  }

  const rawTargets = await rktQuery.select(
    'annual_program_targets.id as target_id',
    'annual_program_targets.academic_year',
    'annual_program_targets.school_unit_id',
    'rips_programs.id as rips_program_id',
    'rips_programs.code as program_code',
    'rips_programs.name as program_name',
    'rips_programs.description as program_description',
    'rips_programs.is_flagship',
    'pc.name as category_name'
  );

  console.log('Fetched target programs:', rawTargets.length);
  console.log('First 3 targets:', rawTargets.slice(0, 3));

  await db.destroy();
  await dbManajemen.destroy();
  await dbAkademik.destroy();
}

testListBudgetPrograms();
