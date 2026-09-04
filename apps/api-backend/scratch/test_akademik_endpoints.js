const express = require('express');
const dbAkademik = require('../src/config/db/akademik');
const dbCore = require('../src/config/db/core');

async function testEndpoints() {
  console.log('=== TEST AKADEMIK BACKEND SERVICES & QUERIES ===\n');

  try {
    // 1. Check School Units in core
    const units = await dbCore('school_units').select('id', 'name', 'level');
    console.log('Core School Units:', units);

    // 2. Check academic summary query (used by Dashboard)
    console.log('\n--- 2. Academic Summary Service Check ---');
    try {
      const ReportsService = require('../src/modules/akademik/reports/service');
      const reportsService = new ReportsService();
      const summary1 = await reportsService.getAcademicSummary({ satuan_pendidikan_id: 1 });
      console.log('Summary Unit 1:', summary1);
      const summary2 = await reportsService.getAcademicSummary({ satuan_pendidikan_id: 2 });
      console.log('Summary Unit 2:', summary2);
      const summaryNoUnit = await reportsService.getAcademicSummary({});
      console.log('Summary No Unit:', summaryNoUnit);
    } catch (e) {
      console.log('ReportsService error:', e);
    }

    // 3. Check Students Service Check
    console.log('\n--- 3. Students Service Check ---');
    try {
      const StudentService = require('../src/modules/akademik/students/service');
      const studentService = new StudentService();
      const studentsRes1 = await studentService.listStudents({ satuan_pendidikan_id: 1, limit: 10 });
      console.log('Students Unit 1 count:', studentsRes1.total, 'items returned:', studentsRes1.data?.length);
      const studentsResNoUnit = await studentService.listStudents({ limit: 10 });
      console.log('Students No Unit count:', studentsResNoUnit.total, 'items returned:', studentsResNoUnit.data?.length);
    } catch (e) {
      console.log('StudentService error:', e);
    }

    // 4. Check Class Groups (Rombel)
    console.log('\n--- 4. Class Groups Check ---');
    try {
      const cgs = await dbAkademik('class_groups').select('*');
      console.log('Total class_groups:', cgs.length, cgs);
    } catch (e) {
      console.log('class_groups error:', e);
    }

    // 5. Check Curriculum / Subjects / Mata Pelajaran
    console.log('\n--- 5. Subjects / Mata Pelajaran Check ---');
    try {
      const subjects = await dbAkademik('subjects').select('*');
      console.log('Total subjects:', subjects.length);
      console.log(subjects.slice(0, 5));
    } catch (e) {
      console.log('subjects error:', e);
    }

    // 6. Check Class Memberships
    console.log('\n--- 6. Class Memberships (Anggota Rombel) Check ---');
    try {
      const memberships = await dbAkademik('class_memberships').select('*');
      console.log('Total class_memberships:', memberships.length);
    } catch (e) {
      console.log('class_memberships error:', e);
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await dbAkademik.destroy();
    await dbCore.destroy();
  }
}

testEndpoints();
