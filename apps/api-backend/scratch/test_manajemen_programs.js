const dbManajemen = require('../src/config/db/manajemen');
const dbKeuangan = require('../src/config/db/keuangan');

async function testManajemenPrograms() {
  console.log('=== TEST MANAJEMEN RKT PROGRAMS ===\n');

  try {
    // 1. Check annual_work_plans
    const awps = await dbManajemen('annual_work_plans').select('*');
    console.log('Annual Work Plans in Manajemen DB:', awps);

    // 2. Check annual_program_targets
    const targets = await dbManajemen('annual_program_targets')
      .join('rips_programs', 'annual_program_targets.program_id', 'rips_programs.id')
      .select('annual_program_targets.*', 'rips_programs.code', 'rips_programs.name');
    console.log('\nAnnual Program Targets:', targets.slice(0, 10));

    // 3. Check rips_programs
    const progs = await dbManajemen('rips_programs').select('id', 'code', 'name', 'category_id', 'is_flagship');
    console.log('\nRIPS Programs count:', progs.length);
    console.log(progs.slice(0, 10));

    // 4. Check budget_programs in Keuangan
    const bp = await dbKeuangan('budget_programs').select('*');
    console.log('\nBudget Programs in Keuangan DB:', bp);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dbManajemen.destroy();
    await dbKeuangan.destroy();
  }
}

testManajemenPrograms();
