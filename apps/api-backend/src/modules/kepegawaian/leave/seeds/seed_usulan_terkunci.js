/**
 * Configuration Seed: Master Leave Types, Approval Profiles, and Module Settings [USULAN-TERKUNCI]
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2, §3, §5.1, §6, §10.2, §10.3 (M-C)
 * Target: kepegawaian_dev (127.0.0.1:3306)
 * Idempotent: can be executed multiple times without duplicating rows.
 */

const { assertDevDatabase } = require('../../../../config/db/dbGuard');

async function seedUsulanTerkunci(kepDb) {
  assertDevDatabase(kepDb.client.connectionSettings, 'SEED_USULAN_TERKUNCI_KEPEGAWAIAN');

  console.log('[USULAN-TERKUNCI] Seeding master approval profiles, profile steps, leave types, settings, and thresholds...');

  // 1. Approval Profiles (SPEC §3.4)
  const profiles = [
    { id: 1, code: 'std_3', name: 'Standar 3 Tingkat (Atasan Langsung -> KS -> HRD)', is_active: 1 },
    { id: 2, code: 'head_hrd', name: '2 Tingkat (Kepala Sekolah -> HRD)', is_active: 1 },
    { id: 3, code: 'light_hrd', name: '1 Tingkat (HRD Langsung)', is_active: 1 }
  ];

  for (const p of profiles) {
    const existing = await kepDb('leave_approval_profiles').where({ code: p.code }).first();
    if (!existing) {
      await kepDb('leave_approval_profiles').insert({
        id: p.id,
        code: p.code,
        name: p.name,
        is_active: p.is_active,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await kepDb('leave_approval_profiles').where({ id: existing.id }).update({
        name: p.name,
        is_active: p.is_active,
        updated_at: new Date()
      });
    }
  }

  // 2. Profile Steps (SPEC §3.4)
  const profileSteps = [
    // std_3 (id: 1)
    { profile_id: 1, step_no: 1, step_name: 'Persetujuan Atasan Langsung', approver_source: 'direct_supervisor', is_required: 0, sla_hours: 48 },
    { profile_id: 1, step_no: 2, step_name: 'Persetujuan Kepala Sekolah', approver_source: 'unit_head', is_required: 1, sla_hours: 48 },
    { profile_id: 1, step_no: 3, step_name: 'Persetujuan Akhir HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 72 },
    // head_hrd (id: 2)
    { profile_id: 2, step_no: 1, step_name: 'Persetujuan Kepala Sekolah', approver_source: 'unit_head', is_required: 1, sla_hours: 48 },
    { profile_id: 2, step_no: 2, step_name: 'Persetujuan Akhir HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 72 },
    // light_hrd (id: 3)
    { profile_id: 3, step_no: 1, step_name: 'Persetujuan HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 72 }
  ];

  for (const s of profileSteps) {
    const existingStep = await kepDb('leave_approval_profile_steps')
      .where({ profile_id: s.profile_id, step_no: s.step_no })
      .first();

    if (!existingStep) {
      await kepDb('leave_approval_profile_steps').insert({
        profile_id: s.profile_id,
        step_no: s.step_no,
        step_name: s.step_name,
        approver_source: s.approver_source,
        is_required: s.is_required,
        sla_hours: s.sla_hours,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await kepDb('leave_approval_profile_steps')
        .where({ id: existingStep.id })
        .update({
          step_name: s.step_name,
          approver_source: s.approver_source,
          is_required: s.is_required,
          sla_hours: s.sla_hours,
          updated_at: new Date()
        });
    }
  }

  // 3. Leave Types (18 types, SPEC §3.3)
  const leaveTypesSeed = [
    {
      code: 'cuti_tahunan',
      name: 'Cuti Tahunan',
      category: 'annual',
      description: 'Jatah cuti tahunan reguler bagi pendidik dan tenaga kependidikan tetap (GTY/PTY).',
      color: '#3b82f6',
      is_system: 1,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 1,
      balance_policy_id: null, // linked when policy is created or defaults to policy 1
      half_day_allowed: 1,
      attachment_rule: 'none',
      gender_restriction: 'any',
      eligible_employment_statuses: JSON.stringify(['gty', 'pty']),
      min_service_months: 0,
      min_notice_days: 3,
      max_backdate_days: 0,
      payroll_pay_percent: 100.00,
      affects_attendance_allowance: 0,
      affects_discipline: 0,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 1,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 1
    },
    {
      code: 'sakit',
      name: 'Sakit',
      category: 'sick',
      description: 'Izin ketidakhadiran karena kondisi kesehatan/sakit dengan atau tanpa surat dokter.',
      color: '#ef4444',
      is_system: 1,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      half_day_allowed: 1,
      attachment_rule: 'required_after_days',
      attachment_required_after_days: 2,
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 7,
      payroll_pay_percent: 100.00,
      affects_attendance_allowance: 0,
      affects_discipline: 0,
      attendance_status: 'sick',
      attendance_sub_status: null,
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 2
    },
    {
      code: 'izin_pribadi',
      name: 'Izin Pribadi',
      category: 'permit',
      description: 'Izin keperluan pribadi mendesak di luar jatah cuti tahunan.',
      color: '#f59e0b',
      is_system: 1,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      half_day_allowed: 1,
      max_days_per_request: 2.0,
      max_days_per_year: 6.0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 3,
      payroll_pay_percent: 100.00,
      affects_attendance_allowance: 1,
      affects_discipline: 0,
      attendance_status: 'permitted',
      attendance_sub_status: 'izin',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 3
    },
    {
      code: 'dinas_luar',
      name: 'Dinas Luar',
      category: 'official',
      description: 'Penugasan dinas resmi, pelatihan institusi, seminar, atau rapat luar kantor.',
      color: '#10b981',
      is_system: 1,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      half_day_allowed: 1,
      attachment_rule: 'required',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 7,
      payroll_pay_percent: 100.00,
      affects_attendance_allowance: 0,
      affects_discipline: 0,
      attendance_status: 'permitted',
      attendance_sub_status: 'dinas_luar',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 4
    },
    {
      code: 'cuti_melahirkan',
      name: 'Cuti Melahirkan',
      category: 'special',
      description: 'Cuti istirahat melahirkan bagi pegawai wanita.',
      color: '#ec4899',
      is_system: 1,
      is_active: 1,
      count_mode: 'calendar_days',
      deducts_balance: 0,
      max_days_per_request: 90.0,
      attachment_rule: 'required',
      gender_restriction: 'female',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 30,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 5
    },
    {
      code: 'cuti_keguguran',
      name: 'Cuti Keguguran',
      category: 'special',
      description: 'Cuti istirahat pemulihan pasca keguguran kandungan.',
      color: '#f43f5e',
      is_system: 0,
      is_active: 1,
      count_mode: 'calendar_days',
      deducts_balance: 0,
      max_days_per_request: 45.0,
      attachment_rule: 'required',
      gender_restriction: 'female',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 14,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 6
    },
    {
      code: 'cuti_menikah',
      name: 'Cuti Menikah',
      category: 'special',
      description: 'Cuti pernikahan pertama pegawai yang bersangkutan.',
      color: '#8b5cf6',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 3.0,
      max_occurrences_lifetime: 1,
      attachment_rule: 'required',
      eligible_marital_statuses: JSON.stringify(['single']),
      min_service_months: 0,
      min_notice_days: 7,
      max_backdate_days: 0,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 7
    },
    {
      code: 'cuti_istri_melahirkan',
      name: 'Cuti Istri Melahirkan / Keguguran',
      category: 'special',
      description: 'Cuti pendampingan kelahiran atau perawatan istri keguguran.',
      color: '#06b6d4',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 2.0,
      attachment_rule: 'required',
      gender_restriction: 'male',
      eligible_marital_statuses: JSON.stringify(['married']),
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 14,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 8
    },
    {
      code: 'cuti_duka_keluarga_inti',
      name: 'Cuti Duka (Keluarga Inti)',
      category: 'special',
      description: 'Cuti duka wafatnya suami/istri, orang tua/mertua, atau anak kandung.',
      color: '#64748b',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 2.0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 7,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 9
    },
    {
      code: 'cuti_duka_serumah',
      name: 'Cuti Duka (Anggota Keluarga Serumah)',
      category: 'special',
      description: 'Cuti duka wafatnya anggota keluarga yang tinggal satu rumah.',
      color: '#475569',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 1.0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 7,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 10
    },
    {
      code: 'cuti_keluarga_sakit',
      name: 'Cuti Keluarga Sakit Keras',
      category: 'special',
      description: 'Cuti merawat keluarga inti yang sedang sakit keras / opname di rumah sakit.',
      color: '#d97706',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 2.0,
      max_days_per_year: 6.0,
      attachment_rule: 'required',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 3,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 11
    },
    {
      code: 'cuti_keluarga_menikah',
      name: 'Cuti Pernikahan Anak / Saudara Kandung',
      category: 'special',
      description: 'Cuti menghadiri pernikahan anak atau saudara kandung pegawai.',
      color: '#7c3aed',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 2.0,
      attachment_rule: 'required',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 3,
      max_backdate_days: 0,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 12
    },
    {
      code: 'cuti_khitan_baptis_anak',
      name: 'Cuti Khitan / Baptis Anak',
      category: 'special',
      description: 'Cuti perayaan khitanan atau pembaptisan anak kandung pegawai.',
      color: '#0284c7',
      is_system: 0,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      max_days_per_request: 2.0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 3,
      max_backdate_days: 0,
      payroll_pay_percent: 100.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 2,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 13
    },
    {
      code: 'cuti_ibadah_haji',
      name: 'Cuti Ibadah Haji',
      category: 'special',
      description: 'Cuti menunaikan ibadah haji ke tanah suci (1 kali seumur kerja).',
      color: '#059669',
      is_system: 0,
      is_active: 1,
      count_mode: 'calendar_days',
      deducts_balance: 0,
      max_days_per_request: 40.0,
      max_occurrences_lifetime: 1,
      attachment_rule: 'required',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 30,
      max_backdate_days: 0,
      payroll_pay_percent: 0.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 1,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 14
    },
    {
      code: 'cuti_umrah',
      name: 'Cuti Ibadah Umrah',
      category: 'special',
      description: 'Cuti menunaikan ibadah umrah ke tanah suci.',
      color: '#14b8a6',
      is_system: 0,
      is_active: 1,
      count_mode: 'calendar_days',
      deducts_balance: 0,
      max_days_per_request: 14.0,
      attachment_rule: 'required',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 14,
      max_backdate_days: 0,
      payroll_pay_percent: 0.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 1,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 15
    },
    {
      code: 'cuti_tanpa_gaji',
      name: 'Cuti di Luar Tanggungan (Unpaid)',
      category: 'unpaid',
      description: 'Cuti di luar tanggungan yayasan tanpa pembayaran gaji.',
      color: '#94a3b8',
      is_system: 0,
      is_active: 0, // Inactive by default per SPEC §2 #12, §3.3
      count_mode: 'calendar_days',
      deducts_balance: 0,
      max_days_per_request: 30.0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 7,
      max_backdate_days: 0,
      payroll_pay_percent: 0.00,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 1,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 16
    },
    {
      code: 'cuti_khusus',
      name: 'Cuti Khusus (Lainnya)',
      category: 'special',
      description: 'Cuti khusus generik yang memerlukan reklasifikasi jenis spesifik oleh HRD.',
      color: '#6366f1',
      is_system: 1,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 0,
      payroll_pay_percent: null,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 3,
      visible_in_self_service: 1,
      reason_required: 0,
      sort_order: 17
    },
    {
      code: 'lainnya',
      name: 'Lainnya',
      category: 'other',
      description: 'Jenis izin / cuti lain yang tidak tercakup dalam kategori di atas (wajib alasan).',
      color: '#a855f7',
      is_system: 1,
      is_active: 1,
      count_mode: 'work_days',
      deducts_balance: 0,
      attachment_rule: 'optional',
      gender_restriction: 'any',
      min_service_months: 0,
      min_notice_days: 0,
      max_backdate_days: 0,
      payroll_pay_percent: null,
      attendance_status: 'permitted',
      attendance_sub_status: 'cuti',
      approval_profile_id: 3,
      visible_in_self_service: 1,
      reason_required: 1,
      sort_order: 18
    }
  ];

  for (const lt of leaveTypesSeed) {
    const existing = await kepDb('leave_types').where({ code: lt.code }).first();
    if (!existing) {
      await kepDb('leave_types').insert({
        ...lt,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await kepDb('leave_types').where({ id: existing.id }).update({
        name: lt.name,
        category: lt.category,
        description: lt.description,
        color: lt.color,
        is_system: lt.is_system,
        is_active: existing.code === 'cuti_tanpa_gaji' ? existing.is_active : lt.is_active,
        count_mode: lt.count_mode,
        deducts_balance: lt.deducts_balance,
        half_day_allowed: lt.half_day_allowed,
        attachment_rule: lt.attachment_rule,
        attachment_required_after_days: lt.attachment_required_after_days,
        gender_restriction: lt.gender_restriction,
        eligible_employment_statuses: lt.eligible_employment_statuses,
        eligible_marital_statuses: lt.eligible_marital_statuses,
        min_service_months: lt.min_service_months,
        min_notice_days: lt.min_notice_days,
        max_backdate_days: lt.max_backdate_days,
        max_days_per_request: lt.max_days_per_request,
        max_days_per_year: lt.max_days_per_year,
        max_occurrences_lifetime: lt.max_occurrences_lifetime,
        payroll_pay_percent: lt.payroll_pay_percent,
        affects_attendance_allowance: lt.affects_attendance_allowance || 0,
        affects_discipline: lt.affects_discipline || 0,
        attendance_status: lt.attendance_status,
        attendance_sub_status: lt.attendance_sub_status,
        approval_profile_id: lt.approval_profile_id,
        visible_in_self_service: lt.visible_in_self_service,
        reason_required: lt.reason_required,
        sort_order: lt.sort_order,
        updated_at: new Date()
      });
    }
  }

  // 4. Default Leave Module Settings (SPEC §3.5)
  const defaultSettings = [
    { setting_key: 'flexible_employee_day_rule', setting_value: JSON.stringify('mon_fri') },
    { setting_key: 'holiday_inside_calendar_leave_counted', setting_value: JSON.stringify(true) },
    { setting_key: 'employee_self_cancel_approved_until_days_before', setting_value: JSON.stringify(3) },
    { setting_key: 'reason_visible_to_supervisor_for_sick', setting_value: JSON.stringify(false) },
    { setting_key: 'overtime_self_claim_max_backdate_days', setting_value: JSON.stringify(7) },
    { setting_key: 'approval_overdue_hours', setting_value: JSON.stringify(72) },
    { setting_key: 'semester_ranges', setting_value: JSON.stringify([]) }
  ];

  for (const s of defaultSettings) {
    const existing = await kepDb('leave_module_settings')
      .where({ school_unit_id: null, setting_key: s.setting_key })
      .first();

    if (!existing) {
      await kepDb('leave_module_settings').insert({
        school_unit_id: null,
        setting_key: s.setting_key,
        setting_value: s.setting_value,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await kepDb('leave_module_settings').where({ id: existing.id }).update({
        setting_value: s.setting_value,
        updated_at: new Date()
      });
    }
  }

  // 5. Default Absence Thresholds (SPEC §2 #36, §10.2)
  const defaultThreshold = await kepDb('absence_thresholds')
    .where({ school_unit_id: null, group_type: 'unit' })
    .first();

  if (!defaultThreshold) {
    await kepDb('absence_thresholds').insert({
      school_unit_id: null,
      group_type: 'unit',
      group_ref_id: null,
      max_absent_count: 5,
      max_absent_percent: 20.00,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  console.log('[USULAN-TERKUNCI] Master configurations successfully seeded.');
}

module.exports = { seedUsulanTerkunci };
