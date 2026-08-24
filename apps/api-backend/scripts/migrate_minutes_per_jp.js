/**
 * Migration for minutes_per_jp in curriculum_structures and academic_years / school_settings
 */
const db = require('../src/config/db/akademik');

async function up() {
  console.log('--- Migrating minutes_per_jp config ---');

  const hasColStruct = await db.schema.hasColumn('curriculum_structures', 'minutes_per_jp');
  if (!hasColStruct) {
    await db.schema.alterTable('curriculum_structures', (t) => {
      t.integer('minutes_per_jp').defaultTo(40).comment('Durasi 1 JP dalam menit (misal 40 menit / 45 menit)');
    });
    console.log('Added minutes_per_jp to curriculum_structures');
  }

  const hasColAy = await db.schema.hasColumn('academic_years', 'minutes_per_jp');
  if (!hasColAy) {
    await db.schema.alterTable('academic_years', (t) => {
      t.integer('minutes_per_jp').defaultTo(40).comment('Konfigurasi durasi standar 1 JP sekolah dalam menit');
    });
    console.log('Added minutes_per_jp to academic_years');
  }

  console.log('--- Migration Finished Successfully ---');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
