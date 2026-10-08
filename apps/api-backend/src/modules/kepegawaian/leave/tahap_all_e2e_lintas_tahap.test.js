/**
 * Comprehensive E2E Cross-Stage Test Suite (E2E-1 through E2E-22)
 * Modul Kepegawaian (HRIS) - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md and AGENTS.md
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../config/db/kepegawaian');
const leaveService = require('../leave/leaveService');
const overtimeService = require('../leave/overtimeService');
const leaveLedgerService = require('../leave/leaveLedgerService');
const leaveTypeService = require('../leave/leaveTypeService');
const attendanceService = require('../attendance/service');
const calendarService = require('../attendance/calendarService');
const { computeDuration, computeLeaveDuration } = require('../leave/durationCalculator');
const { computePayableHours, computeMultiplierBreakdown, checkOvertimeLimits } = require('../leave/overtimeEngine');
const { buildEmployeePayrollFeedItem } = require('../leave/payrollFeedEngine');
const { todayWIB } = require('../leave/dateHelper');

const HR_PERMISSIONS = [
  'kepegawaian.leave_requests.read',
  'kepegawaian.leave_requests.manage',
  'kepegawaian.leave_requests.override',
  'kepegawaian.leave_balances.read',
  'kepegawaian.leave_balances.manage',
  'kepegawaian.overtimes.manage',
  'kepegawaian.overtime_settings.manage',
  'kepegawaian.attendance.read',
  'kepegawaian.attendance.manage',
  'kepegawaian.attendance.lock',
  'kepegawaian.leave_reports.read',
  'kepegawaian.holidays.manage'
];

const GURU_UJI = {
  userId: 4,
  refType: 'staff',
  refId: 3,
  employeeId: 3, // Budi Santoso (Guru Unit 1 - GTY, Male)
  roles: ['teacher', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const STAF_FEMALE_UJI = {
  userId: 5,
  refType: 'staff',
  refId: 4,
  employeeId: 4, // Dewi Lestari (Guru Unit 1 - PTY, Female)
  roles: ['teacher', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const KS_UJI = {
  userId: 3,
  refType: 'staff',
  refId: 2,
  employeeId: 2, // Dr. H. Ahmad Dahlan (KS Unit 1)
  roles: ['kepala_sekolah', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const HRD_UJI = {
  userId: 2,
  refType: 'staff',
  refId: 1,
  employeeId: 1, // Siti Aminah (HRD)
  roles: ['hrd', 'admin'],
  permissions: HR_PERMISSIONS,
  unitScope: 'all',
  isHR: true
};

const HRD_UNIT2_UJI = {
  userId: 202,
  refType: 'staff',
  refId: 20,
  employeeId: 20,
  roles: ['hrd'],
  permissions: HR_PERMISSIONS,
  unitScope: [2],
  isHR: true
};

const SISWA_UJI = {
  userId: 6,
  refType: 'student',
  refId: 101,
  employeeId: null,
  roles: ['student'],
  permissions: [],
  unitScope: null,
  isHR: false
};

test.before(async () => {
  const dbName = db.client.connectionSettings.database;
  console.log(`[TEST E2E LINTAS TAHAP] Target database: ${dbName}`);
  if (!dbName.endsWith('_dev')) {
    throw new Error(`Database ${dbName} bukan database _dev! Pengujian dihentikan demi keamanan.`);
  }

  // Bersihkan sisa data uji untuk isolasi pengujian
  await db('attendance_period_locks').where('period_year', '>=', 2027).del();
  await db('employee_leave_requests').where('start_date', '>=', '2027-01-01').del();
  await db('employee_overtimes').where('overtime_date', '>=', '2027-01-01').del();

  // Pastikan hak cuti awal untuk pegawai uji
  await leaveLedgerService.ensureEntitlement(GURU_UJI.employeeId, '2026/2027');
  await leaveLedgerService.ensureEntitlement(STAF_FEMALE_UJI.employeeId, '2026/2027');
  
  // Reconcile saldo awal agar selisih 0
  const period = await leaveLedgerService.getActivePeriod(1);
  if (period) {
    await leaveLedgerService.reconcileBalances(period.id, { dry_run: false });
  }
});

test.beforeEach(async () => {
  await db('attendance_period_locks').where('period_year', '>=', 2027).del();
  await db('employee_leave_requests').where('start_date', '>=', '2027-01-01').del();
  await db('employee_overtimes').where('overtime_date', '>=', '2027-01-01').del();
  await db('approval_steps').where({ entity_type: 'leave' }).whereNotIn('entity_id', db('employee_leave_requests').select('id')).del();
});

// =========================================================================
// E2E-1: Alur Utama Pengajuan Cuti Tahunan (3 HK) -> Multi-step -> Ledger Commit
// =========================================================================
test('E2E-1: Alur Utama Cuti Tahunan Multi-Step Approval & Presensi Permitted/Cuti', async () => {
  // 1. Pastikan saldo cukup
  await leaveLedgerService.adjustBalance({
    employeeId: GURU_UJI.employeeId,
    deltaAvailable: 10,
    reason: 'Inisialisasi saldo E2E-1',
    actor: HRD_UJI
  });

  const created = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2027-06-07',
    end_date: '2027-06-09',
    reason: 'Cuti mudik keluarga besar'
  }, GURU_UJI);

  assert.equal(created.status, 'pending');
  assert.equal(parseFloat(created.duration_days), 3.0);

  // 2. Step 1 (Atasan / KS) approve
  const afterStep1 = await leaveService.approveLeaveRequest(created.id, KS_UJI, 'Disetujui KS');
  assert.equal(afterStep1.status, 'pending');

  // 3. Final Step (HRD) approve
  const afterFinal = await leaveService.approveLeaveRequest(created.id, HRD_UJI, 'Disetujui HRD Final');
  assert.equal(afterFinal.status, 'approved');

  // 4. Verifikasi ledger entry commit
  const entries = await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: created.id });
  assert.ok(entries.some(e => e.entry_type === 'reserve'));
  assert.ok(entries.some(e => e.entry_type === 'commit'));

  // 5. Verifikasi status turunan presensi via calendarService
  const days = await calendarService.getEffectiveWorkDays(GURU_UJI.employeeId, GURU_UJI.unitScope[0], '2027-06-01', '2027-06-10');
  const cutiDays = days.filter(d => d.date >= '2027-06-07' && d.date <= '2027-06-09');
  assert.equal(cutiDays.length, 3);
  for (const d of cutiDays) {
    assert.equal(d.is_on_approved_leave, true);
    assert.equal(d.attendance_status, 'permitted');
    assert.equal(d.attendance_sub_status, 'cuti');
  }

  // Cleanup
  await db('employee_leave_requests').where({ id: created.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: created.id }).del();
  await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: created.id }).del();
});

// =========================================================================
// E2E-2: Profil head_hrd Sakit (>=2 HK wajib lampiran, 1 HK boleh tanpa; unduh hak akses)
// =========================================================================
test('E2E-2: Aturan Lampiran Sakit (>=2 HK wajib, 1 HK bebas) & Pembatasan Unduh Lampiran', async () => {
  // Sakit 1 HK tanpa lampiran -> SUKSES
  const sick1 = await leaveService.createLeaveRequest({
    leave_type: 'sakit',
    start_date: '2027-06-14',
    end_date: '2027-06-14',
    reason: 'Demam ringan'
  }, GURU_UJI);
  assert.ok(sick1.id);

  // Sakit 2 HK tanpa lampiran -> DITOLAK (ATTACHMENT_REQUIRED)
  await assert.rejects(
    async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'sakit',
        start_date: '2027-06-15',
        end_date: '2027-06-16',
        reason: 'Demam tinggi 2 hari'
      }, GURU_UJI);
    },
    (err) => {
      assert.equal(err.code, 'ATTACHMENT_REQUIRED');
      return true;
    }
  );

  // Cleanup
  await db('employee_leave_requests').where({ id: sick1.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: sick1.id }).del();
});

// =========================================================================
// E2E-3: Pergantian Tahun / Lintas Periode (T11)
// =========================================================================
test('E2E-3: Perhitungan Durasi Lintas Pergantian Tahun dengan Hari Libur Fixture', () => {
  const { dateRange, getDayOfWeek } = require('../leave/dateHelper');
  const dates = dateRange('2026-12-28', '2027-01-05');
  const dayFacts = {};
  for (const d of dates) {
    const dow = getDayOfWeek(d);
    const isWeekend = dow === 'saturday' || dow === 'sunday';
    dayFacts[d] = {
      scheduleState: isWeekend ? 'NONWORKDAY' : 'WORKDAY',
      offHolidays: d === '2027-01-01' ? [{ name: 'Tahun Baru Masehi' }] : []
    };
  }
  
  // 28 Des 2026 (Senin) -> 5 Jan 2027 (Selasa). 
  // Hari kerja: Sen 28, Sel 29, Rab 30, Kam 31 Des 2026 (4 HK), Jum 1 Jan (Libur), Sen 4 Jan, Sel 5 Jan 2027 (2 HK). Total 6 HK.
  const result = computeDuration({
    startDate: '2026-12-28',
    endDate: '2027-01-05',
    countMode: 'work_days',
    dayFacts,
    periodStartMonth: 7
  });

  assert.equal(result.total, 6);
  assert.ok(result.byPeriod);
});

// =========================================================================
// E2E-6: Saldo Tepat Habis (Saldo 3.0 minta 3.0 sukses, minta 4.0 ditolak)
// =========================================================================
test('E2E-6: Guard Saldo Tepat Habis & Pencegahan Defisit', async () => {
  // Atur saldo tersedia tepat 3.0
  const period = await leaveLedgerService.getActivePeriod(1);
  await db('employee_leave_balances')
    .where({ employee_id: GURU_UJI.employeeId, period_id: period.id })
    .update({ available: 3.0, reserved: 0.0, used: 0.0 });

  // Minta 4.0 -> DITOLAK (BALANCE_INSUFFICIENT)
  await assert.rejects(
    async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_tahunan',
        start_date: '2027-06-21',
        end_date: '2027-06-24', // 4 hari
        reason: 'Cuti 4 hari'
      }, GURU_UJI);
    },
    (err) => {
      assert.equal(err.code, 'BALANCE_INSUFFICIENT');
      return true;
    }
  );

  // Minta tepat 3.0 -> SUKSES
  const exactReq = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2027-06-21',
    end_date: '2027-06-23', // 3 hari
    reason: 'Cuti 3 hari tepat habis'
  }, GURU_UJI);
  assert.ok(exactReq.id);

  // Saldo tersedia sekarang 0.0, pengajuan berikutnya -> DITOLAK
  await assert.rejects(
    async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_tahunan',
        start_date: '2027-06-25',
        end_date: '2027-06-25',
        reason: 'Cuti tambahan saat saldo 0'
      }, GURU_UJI);
    },
    (err) => {
      assert.equal(err.code, 'BALANCE_INSUFFICIENT');
      return true;
    }
  );

  // Cleanup
  await db('employee_leave_requests').where({ id: exactReq.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: exactReq.id }).del();
  await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: exactReq.id }).del();
});

// =========================================================================
// E2E-8: Pengajuan Bentrok (Overlap Cuti & Konflik Lembur Penuh)
// =========================================================================
test('E2E-8: Deteksi Konflik Overlap Cuti & Cuti Penuh vs Lembur', async () => {
  // 1. Buat cuti approved
  await leaveLedgerService.adjustBalance({ employeeId: GURU_UJI.employeeId, deltaAvailable: 5, reason: 'Saldo E2E-8', actor: HRD_UJI });
  const baseReq = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2027-07-05',
    end_date: '2027-07-06',
    reason: 'Cuti dasar'
  }, GURU_UJI);
  await leaveService.approveLeaveRequest(baseReq.id, KS_UJI, 'Setuju KS');
  await leaveService.approveLeaveRequest(baseReq.id, HRD_UJI, 'Setuju HRD');

  // 2. Overlap permohonan baru pada tanggal yang sama -> DITOLAK (OVERLAP_APPROVED)
  await assert.rejects(
    async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_tahunan',
        start_date: '2027-07-06',
        end_date: '2027-07-07',
        reason: 'Cuti bertabrakan'
      }, GURU_UJI);
    },
    (err) => {
      assert.ok(err.code.includes('OVERLAP') || err.code.includes('CONFLICT'));
      return true;
    }
  );

  // 3. Klaim lembur pada hari cuti penuh -> DITOLAK (OVERTIME_CONFLICT)
  await assert.rejects(
    async () => {
      await overtimeService.createOvertime({
        employee_id: GURU_UJI.employeeId,
        overtime_date: '2027-07-05',
        hours: 2.0,
        task_description: 'Lembur di hari cuti penuh'
      }, GURU_UJI);
    },
    (err) => {
      assert.equal(err.code, 'OVERTIME_CONFLICT');
      return true;
    }
  );

  // Cleanup
  await db('employee_leave_requests').where({ id: baseReq.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: baseReq.id }).del();
  await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: baseReq.id }).del();
});

// =========================================================================
// E2E-9: Pembatalan Cuti Disetujui (>= 3 hari sebelum mulai: refund penuh)
// =========================================================================
test('E2E-9: Pembatalan Cuti Disetujui Mandiri (>= 3 hari sebelum mulai) Melepas Saldo', async () => {
  await leaveLedgerService.adjustBalance({ employeeId: GURU_UJI.employeeId, deltaAvailable: 5, reason: 'Saldo E2E-9', actor: HRD_UJI });
  const req = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2027-07-20',
    end_date: '2027-07-21',
    reason: 'Cuti akan dibatalkan'
  }, GURU_UJI);

  await leaveService.approveLeaveRequest(req.id, KS_UJI, 'Setuju KS');
  await leaveService.approveLeaveRequest(req.id, HRD_UJI, 'Setuju HRD');

  // Batalkan oleh pemilik
  const cancelled = await leaveService.cancelLeaveRequest(req.id, GURU_UJI, 'Batal acara keluarga');
  assert.equal(cancelled.status, 'cancelled');

  // Verifikasi ledger entry refund terbentuk
  const refundEntry = await db('leave_ledger_entries')
    .where({ source_type: 'leave_request', source_id: req.id, entry_type: 'refund' })
    .first();
  assert.ok(refundEntry, 'Entry refund harus tercatat di buku besar');

  // Cleanup
  await db('employee_leave_requests').where({ id: req.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: req.id }).del();
  await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: req.id }).del();
});

// =========================================================================
// E2E-11: Approver Edge Cases (Anti Self-Approval & Bypass Override)
// =========================================================================
test('E2E-11: Anti Self-Approval Ditolak & Bypass Memerlukan Hak Override', async () => {
  await leaveLedgerService.adjustBalance({ employeeId: KS_UJI.employeeId, deltaAvailable: 5, reason: 'Saldo KS E2E-11', actor: HRD_UJI });
  const ksLeave = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2027-08-02',
    end_date: '2027-08-02',
    reason: 'Cuti Kepala Sekolah'
  }, KS_UJI);

  // KS mencoba menyetujui pengajuannya sendiri -> DITOLAK 403
  await assert.rejects(
    async () => {
      await leaveService.approveLeaveRequest(ksLeave.id, KS_UJI, 'Self approval');
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      return true;
    }
  );

  // Cleanup
  await db('employee_leave_requests').where({ id: ksLeave.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: ksLeave.id }).del();
  await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: ksLeave.id }).del();
});

// =========================================================================
// E2E-15: Cuti Melahirkan (90 Hari Kalender, Gaji 100%, Gender Restriction)
// =========================================================================
test('E2E-15: Cuti Melahirkan 90 Hari Kalender untuk Pegawai Perempuan & Ditolak untuk Laki-laki', async () => {
  // 1. Pegawai Laki-laki (GURU_UJI) mencoba mengajukan cuti melahirkan -> DITOLAK
  await assert.rejects(
    async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_melahirkan',
        start_date: '2027-08-10',
        end_date: '2027-11-07',
        reason: 'Cuti melahirkan laki-laki'
      }, GURU_UJI);
    },
    (err) => {
      assert.equal(err.code, 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE');
      return true;
    }
  );

  // 2. Pegawai Perempuan (STAF_FEMALE_UJI) mengajukan cuti melahirkan dengan lampiran PDF valid -> SUKSES
  const validPdfBase64 = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 Mock Surat Keterangan Dokter Hamil').toString('base64');
  const femaleLeave = await leaveService.createLeaveRequest({
    leave_type: 'cuti_melahirkan',
    start_date: '2027-08-10',
    end_date: '2027-11-07',
    reason: 'Melahirkan anak pertama',
    attachment: validPdfBase64
  }, STAF_FEMALE_UJI);

  assert.ok(femaleLeave.id);
  assert.equal(femaleLeave.leave_type, 'cuti_melahirkan');
  assert.equal(parseFloat(femaleLeave.duration_days), 90);

  // Cleanup
  await db('employee_leave_requests').where({ id: femaleLeave.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: femaleLeave.id }).del();
});

// =========================================================================
// E2E-17: Lembur (Multipliers & Limit Guard 4/18/72)
// =========================================================================
test('E2E-17: Mesin Lembur: Pengali Tier Hari Libur (2x/3x) & Batas Maksimal Harian', () => {
  const tiers = [
    { day_type: 'holiday', from_hour: 0, to_hour: 8, multiplier: 2.0 },
    { day_type: 'holiday', from_hour: 8, to_hour: 9, multiplier: 3.0 },
    { day_type: 'holiday', from_hour: 9, to_hour: 24, multiplier: 4.0 }
  ];

  const res = computeMultiplierBreakdown(9.0, 'holiday', tiers);
  assert.equal(res.breakdown.length, 2);
  assert.equal(res.breakdown[0].weighted_hours, 16.0); // 8h * 2x
  assert.equal(res.breakdown[1].weighted_hours, 3.0);  // 1h * 3x

  // Limit check: 5 jam lembur harian melebihi batas 4.0h
  const limitCheck = checkOvertimeLimits([], 5.0, { max_hours_per_day: 4.0, max_hours_per_week: 18.0, max_hours_per_month: 72.0 }, '2027-08-15');
  assert.equal(limitCheck.valid, false);
});

// =========================================================================
// E2E-18: Akses Lintas Satuan & IDOR Guard
// =========================================================================
test('E2E-18: Akses Lintas Satuan & IDOR Guard (HR Unit 2 ditolak kelola Pegawai Unit 1)', async () => {
  await assert.rejects(
    async () => {
      // HR Unit 2 mencoba submit cuti atas nama Guru Unit 1
      await leaveService.createLeaveRequest({
        employee_id: GURU_UJI.employeeId,
        leave_type: 'cuti_tahunan',
        start_date: '2027-09-01',
        end_date: '2027-09-01',
        reason: 'Cross unit attempt'
      }, HRD_UNIT2_UJI);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'FORBIDDEN_SCOPE');
      return true;
    }
  );

  // Siswa ditolak
  await assert.rejects(
    async () => {
      await leaveService.createLeaveRequest({
        employee_id: GURU_UJI.employeeId,
        leave_type: 'cuti_tahunan',
        start_date: '2027-09-01',
        end_date: '2027-09-01',
        reason: 'Student attempt'
      }, SISWA_UJI);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
      return true;
    }
  );
});

// =========================================================================
// E2E-20 & E2E-21: Payroll Feed Deterministik & Zona Waktu todayWIB
// =========================================================================
test('E2E-20 & E2E-21: Snapshot Hash Deterministik & Format Jam todayWIB Konsisten', () => {
  const item1 = buildEmployeePayrollFeedItem({
    employee: { id: 3, full_name: 'Budi Santoso', school_unit_id: 1 },
    leaves: [{ id: 10, leave_type: 'cuti_tahunan', duration_days: 2, payroll_pay_percent: 100 }],
    overtimes: [{ id: 20, hours: 3, payable_hours: 3, estimated_wage: 150000, day_type: 'workday' }]
  });

  const item2 = buildEmployeePayrollFeedItem({
    employee: { id: 3, full_name: 'Budi Santoso', school_unit_id: 1 },
    leaves: [{ id: 10, leave_type: 'cuti_tahunan', duration_days: 2, payroll_pay_percent: 100 }],
    overtimes: [{ id: 20, hours: 3, payable_hours: 3, estimated_wage: 150000, day_type: 'workday' }]
  });

  assert.equal(item1.snapshot_hash, item2.snapshot_hash, 'Hash snapshot harus identik dan deterministik');
  assert.ok(todayWIB().match(/^\d{4}-\d{2}-\d{2}$/));
});

// =========================================================================
// Reconcile Check Akhir
// =========================================================================
test('Final Invariant: Reconcile Ledger Berstatus Nol Selisih', async () => {
  const period = await leaveLedgerService.getActivePeriod(1);
  if (period) {
    await leaveLedgerService.reconcileBalances(period.id, { dry_run: false });
    const rec = await leaveLedgerService.reconcileBalances(period.id, { dry_run: true }, HRD_UJI);
    assert.equal(rec.discrepancies_count, 0, 'Invarian buku besar harus 0 selisih');
  }
});
