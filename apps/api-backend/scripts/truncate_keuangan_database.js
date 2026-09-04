/**
 * Script to completely empty (truncate) all tables in Modul Keuangan database
 */
const db = require('../src/config/db/keuangan');

async function truncateAllKeuanganTables() {
  console.log('=== MEMULAI PENGOSONGAN DATA MODUL KEUANGAN ===\n');

  try {
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await db.raw('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];
    const tableNames = tables
      .map(row => row[tableKey])
      .filter(name => !name.startsWith('knex_migrations'));

    console.log(`Ditemukan ${tableNames.length} tabel modul keuangan yang akan dikosongkan:`);
    for (const tableName of tableNames) {
      await db.raw(`TRUNCATE TABLE \`${tableName}\``);
      console.log(`✓ Berhasil mengosongkan tabel: ${tableName}`);
    }

    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n=== SELURUH TABEL MODUL KEUANGAN BERHASIL DIKOSONGKAN 100% ===');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat mengosongkan tabel:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

truncateAllKeuanganTables();
