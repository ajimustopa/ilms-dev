const dbManajemen = require('../src/config/db/manajemen');
const dbKeuangan = require('../src/config/db/keuangan');

async function checkCols() {
  const targetCols = await dbManajemen('annual_program_targets').columnInfo();
  console.log('annual_program_targets columns:', Object.keys(targetCols));

  const ripsCols = await dbManajemen('rips_programs').columnInfo();
  console.log('rips_programs columns:', Object.keys(ripsCols));

  const budgetProgs = await dbKeuangan('budget_programs').select('*');
  console.log('Keuangan budget_programs:', budgetProgs);

  await dbManajemen.destroy();
  await dbKeuangan.destroy();
}

checkCols();
