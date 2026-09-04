const knexWebsite = require('../src/config/db/website-utama');

async function checkWebsiteTables() {
  try {
    const tables = await knexWebsite.raw("SHOW TABLES");
    console.log('Tables in websiteutama_local:', tables[0]);

    for (const tObj of tables[0]) {
      const tableName = Object.values(tObj)[0];
      if (tableName.includes('ppdb')) {
        console.log(`\n=== Table: ${tableName} ===`);
        const cols = await knexWebsite.raw(`DESCRIBE ${tableName}`);
        (cols[0] || cols).forEach(c => console.log(`  - ${c.Field.padEnd(25)} : ${c.Type.padEnd(25)} | Null: ${c.Null} | Default: ${c.Default}`));
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await knexWebsite.destroy();
  }
}

checkWebsiteTables();
