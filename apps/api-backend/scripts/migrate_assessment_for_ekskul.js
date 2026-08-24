/**
 * Migration: Support Extracurricular in assessment_sessions and assessment_types
 */
const db = require('../src/config/db/akademik');

async function migrate() {
  console.log('🚀 Running migration: support extracurricular in assessment...');

  // 1. assessment_sessions: make subject_id nullable and add extracurricular_id
  const hasSubjectId = await db.schema.hasColumn('assessment_sessions', 'subject_id');
  const hasExtraId = await db.schema.hasColumn('assessment_sessions', 'extracurricular_id');

  if (!hasExtraId) {
    await db.schema.table('assessment_sessions', (t) => {
      t.integer('extracurricular_id').unsigned().nullable().index().after('subject_id');
    });
    console.log('✅ Added extracurricular_id to assessment_sessions');
  }

  // Alter subject_id to nullable
  await db.raw('ALTER TABLE `assessment_sessions` MODIFY `subject_id` INT NULL');
  console.log('✅ Made subject_id nullable in assessment_sessions');

  // 2. assessment_types: add category column ('mapel' | 'ekskul')
  const hasCategory = await db.schema.hasColumn('assessment_types', 'category');
  if (!hasCategory) {
    await db.schema.table('assessment_types', (t) => {
      t.string('category', 20).defaultTo('mapel').index().after('satuan_pendidikan_id');
    });
    console.log('✅ Added category to assessment_types');
  }

  // 3. Seed default assessment types for ekskul if empty
  const countEkskul = await db('assessment_types').where({ category: 'ekskul' }).count('id as c');
  const cVal = countEkskul[0]?.c || countEkskul[0]?.['count(*)'] || 0;
  if (Number(cVal) === 0) {
    await db('assessment_types').insert([
      {
        satuan_pendidikan_id: 1,
        category: 'ekskul',
        name: 'Kehadiran & Keaktifan Latihan',
        code: 'KEHADIRAN',
        description: 'Penilaian keaktifan dan kehadiran latihan rutin berkala',
        weight_percentage: 40.00,
        is_tp_based: false,
        order_index: 1,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        category: 'ekskul',
        name: 'Keterampilan & Praktik / Unjuk Bakat',
        code: 'PRAKTIK',
        description: 'Penilaian teknik, keterampilan, dan penguasaan materi ekskul',
        weight_percentage: 30.00,
        is_tp_based: false,
        order_index: 2,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      },
      {
        satuan_pendidikan_id: 1,
        category: 'ekskul',
        name: 'Evaluasi / Uji Kenaikan Tingkat Akhir',
        code: 'EVALUASI_AKHIR',
        description: 'Evaluasi performa, kepemimpinan, dan etika di akhir semester',
        weight_percentage: 30.00,
        is_tp_based: false,
        order_index: 3,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }
    ]);
    console.log('✅ Seeded default assessment types for extracurriculars');
  }

  console.log('🎉 Migration finished successfully!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
