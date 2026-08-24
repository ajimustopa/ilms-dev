/**
 * Migration: Create student_extracurricular_scores table
 */
const db = require('../src/config/db/akademik');

async function migrate() {
  console.log('🚀 Running migration: student_extracurricular_scores...');

  const hasTable = await db.schema.hasTable('student_extracurricular_scores');
  if (!hasTable) {
    await db.schema.createTable('student_extracurricular_scores', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('semester_id').notNullable().index();
      t.integer('extracurricular_id').unsigned().notNullable().index();
      t.integer('student_id').notNullable().index();
      t.string('predicate', 30).notNullable().defaultTo('Baik'); // Sangat Baik, Baik, Cukup, Kurang
      t.decimal('score', 5, 2).nullable(); // misal 90.00
      t.text('description').nullable(); // Narasi capaian ekskul untuk buku rapor
      t.text('notes').nullable();
      t.integer('recorded_by_employee_id').nullable().index();
      t.timestamps(true, true);

      t.unique(['semester_id', 'extracurricular_id', 'student_id'], 'unique_student_ekskul_sem');
    });
    console.log('✅ Created table: student_extracurricular_scores');
  } else {
    console.log('ℹ️ Table student_extracurricular_scores already exists');
  }

  // Seed sample extracurriculars if empty
  const countRes = await db('extracurriculars').count('id as c');
  const c = countRes[0]?.c || countRes[0]?.['count(*)'] || 0;
  if (Number(c) === 0) {
    await db('extracurriculars').insert([
      {
        satuan_pendidikan_id: 1,
        name: 'Pramuka Wajib',
        schedule: 'Jumat, 15.30 - 17.00',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        name: 'Paskibra',
        schedule: 'Sabtu, 08.00 - 10.00',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        name: 'Futsal & Sepak Bola',
        schedule: 'Sabtu, 15.30 - 17.30',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        name: 'Tahfidz Quran & Hadits',
        schedule: 'Senin & Rabu, 16.00 - 17.30',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }
    ]);
    console.log('✅ Seeded sample extracurriculars');
  }

  console.log('🎉 Migration finished successfully!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
