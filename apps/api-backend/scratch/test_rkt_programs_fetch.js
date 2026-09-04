const dbManajemen = require('../src/config/db/manajemen');

async function testFetchRktPrograms() {
  console.log('--- Fetching RKT Programs for 2026/2027 ---');
  
  // 1. By academic_year in annual_program_targets
  const targets = await dbManajemen('annual_program_targets')
    .join('rips_programs', 'annual_program_targets.rips_program_id', 'rips_programs.id')
    .leftJoin('rips_program_categories as pc', 'rips_programs.category_id', 'pc.id')
    .where('annual_program_targets.academic_year', '2026/2027')
    .select(
      'annual_program_targets.id as target_id',
      'annual_program_targets.academic_year',
      'annual_program_targets.school_unit_id',
      'rips_programs.id as rips_program_id',
      'rips_programs.code as program_code',
      'rips_programs.name as program_name',
      'pc.name as category_name'
    );
  console.log('Targets in 2026/2027:', targets);

  // 2. All active RIPS programs
  const allProgs = await dbManajemen('rips_programs')
    .leftJoin('rips_program_categories as pc', 'rips_programs.category_id', 'pc.id')
    .select('rips_programs.id', 'rips_programs.code', 'rips_programs.name', 'pc.name as category_name');
  console.log('\nAll RIPS programs count:', allProgs.length);
  console.log('All RIPS programs sample:', allProgs.slice(0, 5));

  await dbManajemen.destroy();
}

testFetchRktPrograms();
