const db = require('../src/config/db/akademik');

async function seedMaster() {
  console.log('--- Seeding Master Data Akademik ---');
  try {
    // 1. Academic Years
    const hasYears = await db('academic_years').first();
    let y26Id = 1;
    if (!hasYears) {
      const [y25] = await db('academic_years').insert({
        name: '2025/2026',
        start_date: '2025-07-15',
        end_date: '2026-06-20',
        is_active: false,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      const [y26] = await db('academic_years').insert({
        name: '2026/2027',
        start_date: '2026-07-15',
        end_date: '2027-06-20',
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      y26Id = y26;
      console.log('[OK] Academic years seeded.');
    } else {
      const activeYear = await db('academic_years').where({ is_active: true }).first() || hasYears;
      y26Id = activeYear.id;
    }

    // 2. Cohorts (Angkatan)
    const hasCohorts = await db('cohorts').first();
    if (!hasCohorts) {
      await db('cohorts').insert([
        { satuan_pendidikan_id: 1, year: '2024', name: 'Angkatan 2024', is_active: true },
        { satuan_pendidikan_id: 1, year: '2025', name: 'Angkatan 2025', is_active: true },
        { satuan_pendidikan_id: 1, year: '2026', name: 'Angkatan 2026', is_active: true },
        { satuan_pendidikan_id: 2, year: '2025', name: 'Angkatan 2025', is_active: true },
        { satuan_pendidikan_id: 2, year: '2026', name: 'Angkatan 2026', is_active: true },
      ]);
      console.log('[OK] Cohorts seeded.');
    }

    // 3. Grade Levels
    const hasGrades = await db('grade_levels').first();
    let g7Id = 1, g8Id = 2, g9Id = 3;
    if (!hasGrades) {
      const [id7] = await db('grade_levels').insert({ name: 'Kelas 7', order: 1 });
      const [id8] = await db('grade_levels').insert({ name: 'Kelas 8', order: 2 });
      const [id9] = await db('grade_levels').insert({ name: 'Kelas 9', order: 3 });
      await db('grade_levels').insert({ name: 'Kelas 10', order: 4 });
      await db('grade_levels').insert({ name: 'Kelas 11', order: 5 });
      await db('grade_levels').insert({ name: 'Kelas 12', order: 6 });
      g7Id = id7;
      g8Id = id8;
      g9Id = id9;
      console.log('[OK] Grade levels seeded.');
    } else {
      const grades = await db('grade_levels').select();
      g7Id = grades[0]?.id || 1;
      g8Id = grades[1]?.id || 2;
      g9Id = grades[2]?.id || 3;
    }

    // 4. Class Groups (Rombel)
    const hasClasses = await db('class_groups').first();
    if (!hasClasses) {
      await db('class_groups').insert([
        { satuan_pendidikan_id: 1, academic_year_id: y26Id, grade_level_id: g7Id, name: '7A', capacity: 32 },
        { satuan_pendidikan_id: 1, academic_year_id: y26Id, grade_level_id: g7Id, name: '7B', capacity: 32 },
        { satuan_pendidikan_id: 1, academic_year_id: y26Id, grade_level_id: g8Id, name: '8A', capacity: 32 },
        { satuan_pendidikan_id: 1, academic_year_id: y26Id, grade_level_id: g8Id, name: '8B', capacity: 32 },
        { satuan_pendidikan_id: 1, academic_year_id: y26Id, grade_level_id: g9Id, name: '9A', capacity: 32 },
        { satuan_pendidikan_id: 1, academic_year_id: y26Id, grade_level_id: g9Id, name: '9B', capacity: 32 },
      ]);
      console.log('[OK] Class groups seeded.');
    }

    console.log('--- SEEDING COMPLETED ---');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedMaster();
