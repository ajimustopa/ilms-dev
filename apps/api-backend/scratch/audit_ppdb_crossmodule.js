const knexCore = require('../src/config/db/core');
const knexAkademik = require('../src/config/db/akademik');
const knexKeuangan = require('../src/config/db/keuangan');
const knexWebsite = require('../src/config/db/website-utama');

async function auditInvestigation() {
  try {
    console.log('=== 1. ACADEMIC YEARS TABLES ACROSS DATABASES ===');
    
    // Core
    try {
      const coreAY = await knexCore.raw('DESCRIBE academic_years');
      console.log('academic_years in CORE:', (coreAY[0] || coreAY).map(c => ({ field: c.Field, type: c.Type, null: c.Null, default: c.Default })));
      const coreData = await knexCore('academic_years').select('*');
      console.log('Core AY data:', coreData);
    } catch (e) {
      console.log('No academic_years in CORE:', e.message);
    }

    // Akademik
    try {
      const akadAY = await knexAkademik.raw('DESCRIBE academic_years');
      console.log('academic_years in AKADEMIK:', (akadAY[0] || akadAY).map(c => ({ field: c.Field, type: c.Type, null: c.Null, default: c.Default })));
      const akadData = await knexAkademik('academic_years').select('*');
      console.log('Akademik AY data:', akadData);
    } catch (e) {
      console.log('No academic_years in AKADEMIK:', e.message);
    }

    console.log('\n=== 2. PSB REGISTRANTS TABLE IN AKADEMIK ===');
    try {
      const psbCols = await knexAkademik.raw('DESCRIBE psb_registrants');
      console.log('psb_registrants in AKADEMIK:');
      (psbCols[0] || psbCols).forEach(c => console.log(`  - ${c.Field.padEnd(25)} : ${c.Type.padEnd(20)} | Null: ${c.Null} | Default: ${c.Default}`));
    } catch (e) {
      console.log('Error psb_registrants:', e.message);
    }

    console.log('\n=== 3. PPDB REGISTRANTS TABLE IN WEBSITE UTAMA ===');
    try {
      const ppdbCols = await knexWebsite.raw('DESCRIBE ppdb_registrants');
      console.log('ppdb_registrants in WEBSITE UTAMA:');
      (ppdbCols[0] || ppdbCols).forEach(c => console.log(`  - ${c.Field.padEnd(25)} : ${c.Type.padEnd(20)} | Null: ${c.Null} | Default: ${c.Default}`));
    } catch (e) {
      console.log('Error ppdb_registrants:', e.message);
    }

  } catch (err) {
    console.error('Audit investigation error:', err);
  } finally {
    await knexCore.destroy();
    await knexAkademik.destroy();
    await knexKeuangan.destroy();
    await knexWebsite.destroy();
    process.exit(0);
  }
}

auditInvestigation();
