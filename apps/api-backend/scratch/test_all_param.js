const dbAkademik = require('../src/config/db/akademik');

async function testAllParam() {
  console.log('Testing WHERE satuan_pendidikan_id = "all" in MySQL:');
  const resAll = await dbAkademik('students').where('satuan_pendidikan_id', 'all');
  console.log('Results with "all":', resAll.length);

  const res1 = await dbAkademik('students').where('satuan_pendidikan_id', 1);
  console.log('Results with 1:', res1.length);

  await dbAkademik.destroy();
}

testAllParam();
