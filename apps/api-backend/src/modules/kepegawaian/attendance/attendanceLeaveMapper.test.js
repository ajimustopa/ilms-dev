const test = require('node:test');
const assert = require('node:assert/strict');
const { mapLeaveTypeToAttendance, deriveDailyAttendanceStatus } = require('./attendanceLeaveMapper');

test('mapLeaveTypeToAttendance mapping rules', async (t) => {
  await t.test('sakit -> sick', () => {
    const res = mapLeaveTypeToAttendance('sakit', 'sick');
    assert.equal(res.status, 'sick');
    assert.equal(res.sub_status, null);
    assert.equal(res.entry_type, 'leave');
  });

  await t.test('izin_pribadi / izin -> permitted / izin', () => {
    const res1 = mapLeaveTypeToAttendance('izin_pribadi', 'permit');
    assert.equal(res1.status, 'permitted');
    assert.equal(res1.sub_status, 'izin');

    const res2 = mapLeaveTypeToAttendance('izin', null);
    assert.equal(res2.status, 'permitted');
    assert.equal(res2.sub_status, 'izin');
  });

  await t.test('dinas_luar -> permitted / dinas_luar / duty_travel', () => {
    const res = mapLeaveTypeToAttendance('dinas_luar', 'official');
    assert.equal(res.status, 'permitted');
    assert.equal(res.sub_status, 'dinas_luar');
    assert.equal(res.entry_type, 'duty_travel');
  });

  await t.test('cuti_tahunan / cuti_melahirkan / cuti_khusus -> permitted / cuti', () => {
    const resAnnual = mapLeaveTypeToAttendance('cuti_tahunan', 'annual');
    assert.equal(resAnnual.status, 'permitted');
    assert.equal(resAnnual.sub_status, 'cuti');

    const resMelahirkan = mapLeaveTypeToAttendance('cuti_melahirkan', 'special');
    assert.equal(resMelahirkan.status, 'permitted');
    assert.equal(resMelahirkan.sub_status, 'cuti');

    const resKhusus = mapLeaveTypeToAttendance('cuti_khusus', 'special');
    assert.equal(resKhusus.status, 'permitted');
    assert.equal(resKhusus.sub_status, 'cuti');

    const resUnpaid = mapLeaveTypeToAttendance('cuti_tanpa_gaji', 'unpaid');
    assert.equal(resUnpaid.status, 'permitted');
    assert.equal(resUnpaid.sub_status, 'cuti');
  });
});

test('deriveDailyAttendanceStatus resolution rules', async (t) => {
  await t.test('Rule: Cuti TIDAK PERNAH menimpa present', () => {
    const existingAttendance = {
      id: 101,
      employee_id: 5,
      attendance_date: '2026-10-08',
      status: 'present',
      check_in_time: '07:15:00',
      check_out_time: '16:05:00',
      is_late: 0
    };

    const approvedLeave = {
      id: 99,
      employee_id: 5,
      leave_type: 'cuti_tahunan',
      start_portion: 'full',
      reason: 'Liburan keluarga'
    };

    const res = deriveDailyAttendanceStatus({
      date: '2026-10-08',
      schedule: { is_off_day: false },
      approvedLeave,
      existingAttendance
    });

    assert.equal(res.status, 'present');
    assert.equal(res.is_on_approved_leave, true);
    assert.equal(res.leave_request_id, 99);
    assert.equal(res.leave_type_code, 'cuti_tahunan');
    assert.equal(res.check_in_time, '07:15:00');
  });

  await t.test('Rule: Cuti disetujui menang atas absent/unspecified', () => {
    const approvedLeave = {
      id: 88,
      employee_id: 5,
      leave_type: 'cuti_tahunan',
      start_portion: 'full',
      reason: 'Cuti mudik'
    };

    const res = deriveDailyAttendanceStatus({
      date: '2026-10-08',
      schedule: { is_off_day: false },
      approvedLeave,
      existingAttendance: null
    });

    assert.equal(res.status, 'permitted');
    assert.equal(res.sub_status, 'cuti');
    assert.equal(res.leave_request_id, 88);
    assert.equal(res.leave_type_code, 'cuti_tahunan');
    assert.equal(res.leave_portion, 'full');
    assert.equal(res.is_on_approved_leave, true);
  });

  await t.test('Rule: Hari libur nasional / sekolah', () => {
    const holiday = {
      id: 12,
      name: 'Hari Libur Nasional Contoh',
      is_off_day: true
    };

    const res = deriveDailyAttendanceStatus({
      date: '2026-10-08',
      schedule: { is_off_day: false },
      approvedLeave: null,
      holiday,
      existingAttendance: null
    });

    assert.equal(res.status, 'holiday');
    assert.equal(res.holiday_off, true);
    assert.equal(res.holiday_name, 'Hari Libur Nasional Contoh');
    assert.equal(res.is_work_day, false);
  });

  await t.test('Rule: Hari weekend/jadwal non-kerja', () => {
    const res = deriveDailyAttendanceStatus({
      date: '2026-10-11',
      schedule: { is_off_day: true },
      approvedLeave: null,
      holiday: null,
      existingAttendance: null
    });

    assert.equal(res.status, 'off');
    assert.equal(res.is_work_day, false);
  });
});
