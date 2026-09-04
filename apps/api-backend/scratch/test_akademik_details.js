const dbAkademik = require('../src/config/db/akademik');
const ReportsService = require('../src/modules/akademik/reports/service');
const AttendanceService = require('../src/modules/akademik/attendance/service');

async function testDetail() {
  console.log('=== TEST DETAILED AKADEMIK TABLES & SERVICES ===\n');

  try {
    // 1. Reports Service
    console.log('1. Testing ReportsService.getAcademicSummary({ satuan_pendidikan_id: 1 })...');
    try {
      const rep = new ReportsService();
      const res = await rep.getAcademicSummary({ satuan_pendidikan_id: 1 });
      console.log('Reports summary success:', res);
    } catch (e) {
      console.error('Reports summary FAILED:', e.message);
    }

    // 2. Attendance Summary
    console.log('\n2. Testing AttendanceService.getAttendanceSummary({ satuan_pendidikan_id: 1 })...');
    try {
      const att = new AttendanceService();
      const res = await att.getAttendanceSummary({ satuan_pendidikan_id: 1 });
      console.log('Attendance summary success:', res);
    } catch (e) {
      console.error('Attendance summary FAILED:', e.message);
    }

    // 3. Inspect columns of student_attendances
    console.log('\n3. Inspecting columns of student_attendances...');
    try {
      const cols = await dbAkademik('student_attendances').columnInfo();
      console.log('student_attendances columns:', Object.keys(cols));
    } catch (e) {
      console.error('student_attendances error:', e.message);
    }

    // 4. Inspect columns of leave_requests / student_leaves
    console.log('\n4. Inspecting leave_requests table...');
    try {
      const leaves = await dbAkademik('leave_requests').select('*').limit(5);
      console.log('leave_requests rows:', leaves.length);
    } catch (e) {
      console.error('leave_requests error:', e.message);
    }

    // 5. Inspect calendar_events
    console.log('\n5. Inspecting calendar_events table...');
    try {
      const cal = await dbAkademik('calendar_events').select('*').limit(5);
      console.log('calendar_events rows:', cal.length);
    } catch (e) {
      console.error('calendar_events error:', e.message);
    }

    // 6. Inspect psb_processes
    console.log('\n6. Inspecting psb_processes table...');
    try {
      const psb = await dbAkademik('psb_processes').select('*').limit(5);
      console.log('psb_processes rows:', psb.length);
    } catch (e) {
      console.error('psb_processes error:', e.message);
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await dbAkademik.destroy();
  }
}

testDetail();
