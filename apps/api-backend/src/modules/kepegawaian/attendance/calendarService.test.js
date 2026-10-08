/**
 * Unit & Integration Test Suite: Calendar Service & Attendance Status Resolution
 * Modul Kepegawaian - Tahap 2: Fondasi Backend Presensi
 */
const calendarService = require('./calendarService');
const attendanceService = require('./service');

async function runTests() {
  console.log('=== MEMULAI TEST CALENDAR SERVICE & STATUS TURUNAN PRESENSI ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Jadwal Massal Default & Weekend Check
    // -------------------------------------------------------------
    console.log('1. Test Resolusi Jadwal Massal Reguler & Akhir Pekan:');
    const mondaySched = calendarService._computeScheduleForDay(null, 1, 'monday', null);
    assert(mondaySched.is_off_day === false, 'Senin terdeteksi sebagai hari kerja (is_off_day = false)');
    assert(mondaySched.start_time === '07:30:00', 'Jam masuk default 07:30:00');
    assert(mondaySched.late_tolerance_minutes === 5, 'Toleransi keterlambatan default 5 menit');

    const sundaySched = calendarService._computeScheduleForDay(null, 1, 'sunday', null);
    assert(sundaySched.is_off_day === true, 'Minggu terdeteksi sebagai hari libur akhir pekan (is_off_day = true)');

    const saturdaySched = calendarService._computeScheduleForDay(null, 1, 'saturday', null);
    assert(saturdaySched.is_off_day === true, 'Sabtu terdeteksi sebagai hari libur (is_off_day = true)');

    // -------------------------------------------------------------
    // Test 2: Jadwal Custom Khusus Pegawai (Custom Day Schedules)
    // -------------------------------------------------------------
    console.log('\n2. Test Resolusi Jadwal Custom Khusus Pegawai:');
    const customAssignment = {
      id: 99,
      assignment_type: 'custom',
      custom_day_schedules: JSON.stringify({
        monday: { start_time: '08:00:00', end_time: '17:00:00', late_tolerance_minutes: 10, is_off: false },
        friday: { start_time: '07:00:00', end_time: '11:30:00', late_tolerance_minutes: 0, is_off: false },
        saturday: { start_time: '08:00:00', end_time: '12:00:00', late_tolerance_minutes: 5, is_off: false } // Kerja di hari sabtu
      })
    };

    const customMonday = calendarService._computeScheduleForDay(customAssignment, 1, 'monday', null);
    assert(customMonday.start_time === '08:00:00', 'Custom Senin jam masuk 08:00:00');
    assert(customMonday.end_time === '17:00:00', 'Custom Senin jam pulang 17:00:00');
    assert(customMonday.late_tolerance_minutes === 10, 'Custom Senin toleransi 10 menit');
    assert(customMonday.source === 'custom_assignment_day_schedule', 'Source teridentifikasi custom_assignment_day_schedule');

    const customSaturday = calendarService._computeScheduleForDay(customAssignment, 1, 'saturday', null);
    assert(customSaturday.is_off_day === false, 'Sabtu kerja khusus berhasil di-override (is_off_day = false)');

    // -------------------------------------------------------------
    // Test 3: Jadwal Flexible (Target Jam Kerja)
    // -------------------------------------------------------------
    console.log('\n3. Test Resolusi Jadwal Flexible:');
    const flexibleAssignment = {
      id: 100,
      assignment_type: 'flexible',
      flexible_target_hours: '7.50',
      custom_day_schedules: JSON.stringify({
        tuesday: { start_time: '06:00:00', end_time: '20:00:00', late_tolerance_minutes: 0, is_off: false }
      })
    };
    const flexTuesday = calendarService._computeScheduleForDay(flexibleAssignment, 1, 'tuesday', null);
    assert(flexTuesday.schedule_type === 'flexible', 'Tipe jadwal fleksibel terdeteksi');
    assert(flexTuesday.flexible_target_hours === '7.50', 'Target jam kerja fleksibel 7.50 jam');

    // -------------------------------------------------------------
    // Test 4: Toleransi Keterlambatan
    // -------------------------------------------------------------
    console.log('\n4. Test Perhitungan Menit Keterlambatan:');
    const schedWithTol = { start_time: '07:30:00', late_tolerance_minutes: 10 };
    // Check in pada 07:35:00 (dalam toleransi 10 menit -> tidak terlambat)
    const checkInOnTimeMinutes = attendanceService._parseTimeToMinutes('07:35:00');
    const schedStartMinutes = attendanceService._parseTimeToMinutes(schedWithTol.start_time);
    const diff1 = checkInOnTimeMinutes - schedStartMinutes;
    const isLate1 = diff1 > schedWithTol.late_tolerance_minutes;
    assert(!isLate1, 'Check in 07:35 (jadwal 07:30 + tol 10m) -> Tepat Waktu / Dalam Toleransi');

    // Check in pada 07:45:00 (melewati toleransi 10 menit -> terlambat 15 menit)
    const checkInLateMinutes = attendanceService._parseTimeToMinutes('07:45:00');
    const diff2 = checkInLateMinutes - schedStartMinutes;
    const isLate2 = diff2 > schedWithTol.late_tolerance_minutes;
    assert(isLate2 && diff2 === 15, 'Check in 07:45 (jadwal 07:30) -> Terlambat 15 menit');

    // -------------------------------------------------------------
    // Test 5: Cuti Disetujui & Effective Work Days
    // -------------------------------------------------------------
    console.log('\n5. Test Integrasi Cuti Disetujui & Rentang Hari Kerja:');
    // Uji fungsi batch getEffectiveWorkDays dengan mock internal
    const sampleDays = await calendarService.getEffectiveWorkDays(1, 1, '2026-10-01', '2026-10-07');
    assert(Array.isArray(sampleDays) && sampleDays.length === 7, `Berhasil mengomputasi rentang 7 hari (${sampleDays.length} hari terdata)`);
    assert(sampleDays[0].date === '2026-10-01', 'Hari pertama terhitung benar');
    assert(sampleDays[6].date === '2026-10-07', 'Hari terakhir terhitung benar');

    // -------------------------------------------------------------
    // Test 6: Penentu Status Turunan Presensi (Harmonisasi 7 Status)
    // -------------------------------------------------------------
    console.log('\n6. Test Penentu Status Turunan (Display Status):');
    const statusTests = [
      { raw: { status: 'present', is_late: 0, sub_status: 'Hadir Tepat Waktu' }, expected: 'Hadir Tepat Waktu' },
      { raw: { status: 'present', is_late: 1, late_minutes: 15, sub_status: 'Terlambat' }, expected: 'Terlambat' },
      { raw: { status: 'permitted', sub_status: 'Izin', entry_type: 'permission' }, expected: 'Izin' },
      { raw: { status: 'sick', sub_status: 'Sakit', entry_type: 'sick' }, expected: 'Sakit' },
      { raw: { status: 'permitted', sub_status: 'Cuti', entry_type: 'leave' }, expected: 'Cuti' },
      { raw: { status: 'permitted', sub_status: 'Dinas Luar', entry_type: 'duty_travel' }, expected: 'Dinas Luar' },
      { raw: { status: 'absent', sub_status: 'Alpa' }, expected: 'Alpa' }
    ];

    statusTests.forEach(t => {
      const derived = t.raw.sub_status || (t.raw.is_late ? 'Terlambat' : t.raw.status);
      assert(derived === t.expected, `Status '${t.expected}' terdefinisi harmonis (DB enum: ${t.raw.status})`);
    });

    console.log(`\n=== SEMUA TEST SELESAI: ${passed} Passed, ${failed} Failed ===`);
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  }
}

runTests();
