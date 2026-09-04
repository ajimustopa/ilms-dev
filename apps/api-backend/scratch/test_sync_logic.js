const dbManajemen = require('../src/config/db/manajemen');
const dbKeuangan = require('../src/config/db/keuangan');
const dbAkademik = require('../src/config/db/akademik');

async function testSyncLogic() {
  console.log('=== TEST SYNC LOGIC RKT PROGRAMS TO KEUANGAN ===\n');

  // Academic Year 2026/2027
  const ay = await dbAkademik('academic_years').where({ id: 2 }).first();
  console.log('Academic Year from Akademik:', ay);

  // Get RKT programs from Manajemen for 2026/2027
  let rktQuery = dbManajemen('annual_program_targets')
    .join('rips_programs', 'annual_program_targets.rips_program_id', 'rips_programs.id')
    .leftJoin('rips_program_categories as pc', 'rips_programs.category_id', 'pc.id')
    .where('annual_program_targets.academic_year', ay.name);
  
  const rktProgs = await rktQuery.select(
    'annual_program_targets.id as target_id',
    'rips_programs.id as rips_program_id',
    'rips_programs.code as program_code',
    'rips_programs.name as program_name',
    'pc.name as category_name'
  );

  console.log('Found RKT programs in Manajemen for', ay.name, ':', rktProgs.length);
  console.log('Sample RKT programs:', rktProgs.slice(0, 3));

  await dbManajemen.destroy();
  await dbKeuangan.destroy();
  await dbAkademik.destroy();
}

testSyncLogic();
