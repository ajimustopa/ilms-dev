/**
 * Migration: Create Assessment Types & Assessment Sessions tables
 */
const db = require('../src/config/db/akademik');

async function migrate() {
  console.log('🚀 Running migration: assessment_types, assessment_sessions, assessment_session_scores...');

  // 1. Table: assessment_types (Master Jenis Pengujian & Bobot Kontribusi Rapor)
  const hasAssessmentTypes = await db.schema.hasTable('assessment_types');
  if (!hasAssessmentTypes) {
    await db.schema.createTable('assessment_types', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').nullable().index();
      t.string('name', 100).notNullable(); // misal: Formatif / Tugas Harian, Sumatif Tengah Semester (STS)
      t.string('code', 30).notNullable(); // misal: FORMATIF, STS, SAS
      t.text('description').nullable();
      t.decimal('weight_percentage', 5, 2).defaultTo(0).comment('Bobot kontribusi ke Nilai Akhir Rapor (%)');
      t.boolean('is_tp_based').defaultTo(true).comment('Apakah pengujian dipecah per Tujuan Pembelajaran (TP)');
      t.integer('order_index').defaultTo(1);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
    console.log('✅ Created table: assessment_types');
  } else {
    console.log('ℹ️ Table assessment_types already exists');
  }

  // 2. Table: assessment_sessions (Pelaksanaan / Sesi Pengujian)
  const hasAssessmentSessions = await db.schema.hasTable('assessment_sessions');
  if (!hasAssessmentSessions) {
    await db.schema.createTable('assessment_sessions', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('semester_id').notNullable().index();
      t.integer('class_group_id').notNullable().index();
      t.integer('subject_id').notNullable().index();
      t.integer('assessment_type_id').unsigned().notNullable().index();
      t.string('title', 150).notNullable(); // misal: Formatif 1 - Pola Bilangan, Ulangan Bab 2
      t.date('assessment_date').notNullable();
      t.text('learning_objective_ids').nullable().comment('JSON array of TP IDs yang diujikan');
      t.decimal('max_score', 5, 2).defaultTo(100);
      t.text('notes').nullable();
      t.integer('teacher_employee_id').nullable().index();
      t.timestamps(true, true);
    });
    console.log('✅ Created table: assessment_sessions');
  } else {
    console.log('ℹ️ Table assessment_sessions already exists');
  }

  // 3. Table: assessment_session_scores (Nilai Siswa per Sesi & per TP)
  const hasSessionScores = await db.schema.hasTable('assessment_session_scores');
  if (!hasSessionScores) {
    await db.schema.createTable('assessment_session_scores', (t) => {
      t.increments('id').primary();
      t.integer('assessment_session_id').unsigned().notNullable().index();
      t.integer('student_id').notNullable().index();
      t.integer('learning_objective_id').nullable().index().comment('ID TP jika penilaian diinput spesifik per TP');
      t.decimal('score', 5, 2).nullable();
      t.text('feedback').nullable();
      t.timestamps(true, true);

      t.index(['assessment_session_id', 'student_id']);
    });
    console.log('✅ Created table: assessment_session_scores');
  } else {
    console.log('ℹ️ Table assessment_session_scores already exists');
  }

  // 4. Seed default assessment types for satuan_pendidikan_id = 1 if empty
  const countRes = await db('assessment_types').where({ satuan_pendidikan_id: 1 }).count('id as c');
  const countVal = countRes[0]?.c || countRes[0]?.['count(*)'] || 0;
  if (Number(countVal) === 0) {
    await db('assessment_types').insert([
      {
        satuan_pendidikan_id: 1,
        name: 'Formatif (Tugas & Latihan Harian)',
        code: 'FORMATIF',
        description: 'Penilaian harian berkala berbasis Tujuan Pembelajaran (TP)',
        weight_percentage: 40.00,
        is_tp_based: true,
        order_index: 1,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        name: 'Sumatif Tengah Semester (STS)',
        code: 'STS',
        description: 'Penilaian sumatif di pertengahan semester',
        weight_percentage: 30.00,
        is_tp_based: false,
        order_index: 2,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        name: 'Sumatif Akhir Semester (SAS)',
        code: 'SAS',
        description: 'Penilaian sumatif akhir semester komprehensif',
        weight_percentage: 30.00,
        is_tp_based: false,
        order_index: 3,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }
    ]);
    console.log('✅ Seeded default assessment types for school unit 1');
  }

  console.log('🎉 Migration finished successfully!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
