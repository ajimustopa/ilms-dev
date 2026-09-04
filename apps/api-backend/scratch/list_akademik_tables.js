const dbAkademik = require('../src/config/db/akademik');

async function listAllTables() {
  const tables = await dbAkademik.raw('SHOW TABLES');
  console.log('Tables in akademik_local:');
  console.log(tables[0].map(r => Object.values(r)[0]));
  await dbAkademik.destroy();
}

listAllTables();
