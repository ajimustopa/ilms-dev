const dbAkademik = require('../src/config/db/akademik');
const dbCore = require('../src/config/db/core');

async function diagnose() {
  console.log('=== DIAGNOSE AKADEMIK DATA & DATABASE TABLES ===\n');

  try {
    // 1. Check Core School Units
    console.log('--- 1. CORE SCHOOL UNITS ---');
    try {
      const units = await dbCore('school_units').select('id', 'name', 'level', 'code');
      console.log('School Units in Core DB:', units);
    } catch (e) {
      console.log('Error querying core school_units:', e.message);
    }

    // 2. Check Akademik Master Data
    console.log('\n--- 2. AKADEMIK MASTER DATA ---');
    try {
      const years = await dbAkademik('academic_years').select('*');
      console.log('Academic Years count:', years.length);
      console.log(years);
    } catch (e) {
      console.log('academic_years error:', e.message);
    }

    try {
      const semesters = await dbAkademik('semesters').select('*');
      console.log('\nSemesters count:', semesters.length);
      console.log(semesters);
    } catch (e) {
      console.log('semesters error:', e.message);
    }

    try {
      const students = await dbAkademik('students').select('id', 'nisn', 'nis', 'full_name', 'satuan_pendidikan_id', 'status');
      console.log('\nStudents count:', students.length);
      console.log(students.slice(0, 10));
    } catch (e) {
      console.log('students error:', e.message);
    }

    try {
      const classGroups = await dbAkademik('class_groups').select('id', 'name', 'grade_level', 'satuan_pendidikan_id', 'academic_year_id');
      console.log('\nClass Groups (Rombel) count:', classGroups.length);
      console.log(classGroups);
    } catch (e) {
      console.log('class_groups error:', e.message);
    }

    try {
      const psb = await dbAkademik('psb_registrants').select('id', 'registration_number', 'full_name', 'school_unit_id', 'status');
      console.log('\nPSB Registrants count:', psb.length);
      console.log(psb.slice(0, 5));
    } catch (e) {
      console.log('psb_registrants error:', e.message);
    }

    try {
      const courses = await dbAkademik('courses').select('id', 'code', 'name', 'satuan_pendidikan_id');
      console.log('\nCourses count:', courses.length);
      console.log(courses.slice(0, 5));
    } catch (e) {
      console.log('courses error:', e.message);
    }

    try {
      const summary = await dbAkademik('students')
        .select('satuan_pendidikan_id')
        .count('id as total')
        .groupBy('satuan_pendidikan_id');
      console.log('\nStudents grouped by satuan_pendidikan_id:', summary);
    } catch (e) {
      console.log('group by error:', e.message);
    }

  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    await dbAkademik.destroy();
    await dbCore.destroy();
  }
}

diagnose();
