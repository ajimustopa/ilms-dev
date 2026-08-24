/**
 * Migration for Curriculum Structures (Struktur Kurikulum: Alokasi JP per Mapel per Jenjang/Tingkat per Pekan)
 * And Teaching Duties allocated_hours
 */
const db = require('../src/config/db/akademik');

async function up() {
  console.log('--- Migrating Curriculum Structure Schema ---');

  // 1. Create curriculum_structures table
  const hasTable = await db.schema.hasTable('curriculum_structures');
  if (!hasTable) {
    await db.schema.createTable('curriculum_structures', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('grade_level_id').notNullable().index();
      t.integer('subject_id').notNullable().index();
      t.integer('hours_per_week').notNullable().defaultTo(2).comment('Alokasi JP per pekan untuk mapel ini di jenjang ini');
      t.integer('session_duration').defaultTo(2).comment('Durasi per sesi (mis. 2 JP berurutan)');
      t.text('notes').nullable();
      t.timestamps(true, true);
      t.unique(['academic_year_id', 'grade_level_id', 'subject_id'], 'uniq_curr_struct_slot');
    });
    console.log('Created curriculum_structures table');
  }

  // 2. Add allocated_hours to subject_teacher_assignments if not exists
  const hasAllocatedHours = await db.schema.hasColumn('subject_teacher_assignments', 'allocated_hours');
  if (!hasAllocatedHours) {
    await db.schema.alterTable('subject_teacher_assignments', (t) => {
      t.integer('allocated_hours').nullable().comment('JP yang diampu oleh guru ini untuk rombel tersebut');
    });
    console.log('Added allocated_hours to subject_teacher_assignments');
  }

  console.log('--- Migration Finished Successfully ---');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
