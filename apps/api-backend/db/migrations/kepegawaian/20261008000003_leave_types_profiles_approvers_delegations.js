/**
 * Migration M-C: Leave Types, Approval Profiles, Unit Approvers, and Delegations
 * Modul Kepegawaian - Core Aldepos
 * Tables:
 * - leave_approval_profiles
 * - leave_approval_profile_steps
 * - leave_types
 * - school_unit_approvers
 * - approval_delegations
 */

exports.up = async function(knex) {
  // 1. leave_approval_profiles
  const hasProfiles = await knex.schema.hasTable('leave_approval_profiles');
  if (!hasProfiles) {
    await knex.schema.createTable('leave_approval_profiles', (table) => {
      table.bigIncrements('id').primary();
      table.string('code', 50).notNullable().unique();
      table.string('name', 100).notNullable();
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    // Seed profiles (SPEC §3.4)
    await knex('leave_approval_profiles').insert([
      { id: 1, code: 'std_3', name: 'Standar 3 Tingkat (Atasan -> KS -> HRD)', is_active: 1 },
      { id: 2, code: 'head_hrd', name: '2 Tingkat (KS -> HRD)', is_active: 1 },
      { id: 3, code: 'light_hrd', name: '1 Tingkat (HRD Langsung)', is_active: 1 }
    ]);
  }

  // 2. leave_approval_profile_steps
  const hasProfileSteps = await knex.schema.hasTable('leave_approval_profile_steps');
  if (!hasProfileSteps) {
    await knex.schema.createTable('leave_approval_profile_steps', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('profile_id').unsigned().notNullable();
      table.tinyint('step_no').unsigned().notNullable();
      table.string('step_name', 100).notNullable();
      table.enum('approver_source', ['direct_supervisor', 'unit_head', 'hrd_pool', 'yayasan_pool']).notNullable();
      table.boolean('is_required').defaultTo(true);
      table.decimal('min_days_threshold', 5, 1).nullable();
      table.smallint('sla_hours').nullable().defaultTo(72);
      table.timestamps(true, true);

      table.unique(['profile_id', 'step_no'], 'uq_profile_step');
      table.foreign('profile_id').references('id').inTable('leave_approval_profiles').onDelete('CASCADE');
    });

    // Seed profile steps
    await knex('leave_approval_profile_steps').insert([
      // std_3
      { profile_id: 1, step_no: 1, step_name: 'Persetujuan Atasan Langsung', approver_source: 'direct_supervisor', is_required: 0, sla_hours: 48 },
      { profile_id: 1, step_no: 2, step_name: 'Persetujuan Kepala Sekolah', approver_source: 'unit_head', is_required: 1, sla_hours: 48 },
      { profile_id: 1, step_no: 3, step_name: 'Persetujuan Akhir HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 72 },
      // head_hrd
      { profile_id: 2, step_no: 1, step_name: 'Persetujuan Kepala Sekolah', approver_source: 'unit_head', is_required: 1, sla_hours: 48 },
      { profile_id: 2, step_no: 2, step_name: 'Persetujuan Akhir HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 72 },
      // light_hrd
      { profile_id: 3, step_no: 1, step_name: 'Persetujuan HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 72 }
    ]);
  }

  // 3. leave_types
  const hasLeaveTypes = await knex.schema.hasTable('leave_types');
  if (!hasLeaveTypes) {
    await knex.schema.createTable('leave_types', (table) => {
      table.bigIncrements('id').primary();
      table.string('code', 100).notNullable().unique();
      table.string('name', 150).notNullable();
      table.enum('category', ['annual', 'special', 'sick', 'permit', 'official', 'unpaid', 'other']).notNullable();
      table.text('description').nullable();
      table.string('color', 30).defaultTo('#3b82f6');
      table.integer('sort_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_system').defaultTo(false);
      table.enum('count_mode', ['work_days', 'calendar_days']).defaultTo('work_days');
      table.boolean('deducts_balance').defaultTo(false);
      table.bigInteger('balance_policy_id').unsigned().nullable();
      table.decimal('max_days_per_request', 5, 1).nullable();
      table.decimal('max_days_per_year', 5, 1).nullable();
      table.smallint('max_occurrences_lifetime').nullable();
      table.boolean('half_day_allowed').defaultTo(false);
      table.enum('attachment_rule', ['none', 'optional', 'required', 'required_after_days']).defaultTo('none');
      table.smallint('attachment_required_after_days').nullable();
      table.enum('gender_restriction', ['any', 'male', 'female']).defaultTo('any');
      table.json('eligible_employment_statuses').nullable();
      table.json('eligible_marital_statuses').nullable();
      table.smallint('min_service_months').defaultTo(0);
      table.smallint('min_notice_days').defaultTo(0);
      table.smallint('max_backdate_days').defaultTo(0);
      table.decimal('payroll_pay_percent', 5, 2).nullable();
      table.boolean('affects_attendance_allowance').defaultTo(false);
      table.boolean('affects_discipline').defaultTo(false);
      table.string('attendance_status', 50).notNullable().defaultTo('permitted');
      table.string('attendance_sub_status', 50).nullable().defaultTo('cuti');
      table.bigInteger('approval_profile_id').unsigned().nullable();
      table.boolean('visible_in_self_service').defaultTo(true);
      table.boolean('reason_required').defaultTo(false);
      table.timestamps(true, true);

      table.foreign('approval_profile_id').references('id').inTable('leave_approval_profiles').onDelete('SET NULL');
    });

    // Seed 18 leave types (SPEC §3.3)
    const typesSeed = [
      {
        code: 'cuti_tahunan', name: 'Cuti Tahunan', category: 'annual', is_system: 1, is_active: 1,
        count_mode: 'work_days', deducts_balance: 1, half_day_allowed: 1, attachment_rule: 'none',
        gender_restriction: 'any', eligible_employment_statuses: JSON.stringify(['GTY', 'PTY']),
        min_notice_days: 3, max_backdate_days: 0, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 1, sort_order: 1
      },
      {
        code: 'sakit', name: 'Sakit', category: 'sick', is_system: 1, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, half_day_allowed: 1, attachment_rule: 'required_after_days',
        attachment_required_after_days: 2, gender_restriction: 'any', min_notice_days: 0, max_backdate_days: 7,
        payroll_pay_percent: 100, attendance_status: 'sick', attendance_sub_status: null, approval_profile_id: 2, sort_order: 2
      },
      {
        code: 'izin_pribadi', name: 'Izin Pribadi', category: 'permit', is_system: 1, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, half_day_allowed: 1, max_days_per_request: 2.0,
        max_days_per_year: 6.0, attachment_rule: 'optional', gender_restriction: 'any', min_notice_days: 0,
        max_backdate_days: 3, payroll_pay_percent: 100, affects_attendance_allowance: 1,
        attendance_status: 'permitted', attendance_sub_status: 'izin', approval_profile_id: 2, sort_order: 3
      },
      {
        code: 'dinas_luar', name: 'Dinas Luar', category: 'official', is_system: 1, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, half_day_allowed: 1, attachment_rule: 'required',
        gender_restriction: 'any', min_notice_days: 0, max_backdate_days: 7, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'dinas_luar', approval_profile_id: 2, sort_order: 4
      },
      {
        code: 'cuti_melahirkan', name: 'Cuti Melahirkan', category: 'special', is_system: 1, is_active: 1,
        count_mode: 'calendar_days', deducts_balance: 0, max_days_per_request: 90.0, attachment_rule: 'required',
        gender_restriction: 'female', min_notice_days: 0, max_backdate_days: 30, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 5
      },
      {
        code: 'cuti_keguguran', name: 'Cuti Keguguran', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'calendar_days', deducts_balance: 0, max_days_per_request: 45.0, attachment_rule: 'required',
        gender_restriction: 'female', min_notice_days: 0, max_backdate_days: 14, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 6
      },
      {
        code: 'cuti_menikah', name: 'Cuti Menikah', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 3.0, max_occurrences_lifetime: 1,
        attachment_rule: 'required', eligible_marital_statuses: JSON.stringify(['single']),
        min_notice_days: 7, max_backdate_days: 0, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 7
      },
      {
        code: 'cuti_istri_melahirkan', name: 'Cuti Istri Melahirkan/Keguguran', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 2.0, attachment_rule: 'required',
        gender_restriction: 'male', eligible_marital_statuses: JSON.stringify(['married']),
        min_notice_days: 0, max_backdate_days: 14, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 8
      },
      {
        code: 'cuti_duka_keluarga_inti', name: 'Cuti Duka (Keluarga Inti)', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 2.0, attachment_rule: 'optional',
        gender_restriction: 'any', min_notice_days: 0, max_backdate_days: 7, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 9
      },
      {
        code: 'cuti_duka_serumah', name: 'Cuti Duka (Anggota Keluarga Serumah)', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 1.0, attachment_rule: 'optional',
        gender_restriction: 'any', min_notice_days: 0, max_backdate_days: 7, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 10
      },
      {
        code: 'cuti_keluarga_sakit', name: 'Cuti Keluarga Sakit Keras', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 2.0, max_days_per_year: 6.0,
        attachment_rule: 'required', gender_restriction: 'any', min_notice_days: 0, max_backdate_days: 3,
        payroll_pay_percent: 100, attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 11
      },
      {
        code: 'cuti_keluarga_menikah', name: 'Cuti Pernikahan Anak/Saudara Kandung', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 2.0, attachment_rule: 'required',
        gender_restriction: 'any', min_notice_days: 3, max_backdate_days: 0, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 12
      },
      {
        code: 'cuti_khitan_baptis_anak', name: 'Cuti Khitan / Baptis Anak', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, max_days_per_request: 2.0, attachment_rule: 'optional',
        gender_restriction: 'any', min_notice_days: 3, max_backdate_days: 0, payroll_pay_percent: 100,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 2, sort_order: 13
      },
      {
        code: 'cuti_ibadah_haji', name: 'Cuti Ibadah Haji', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'calendar_days', deducts_balance: 0, max_days_per_request: 40.0, max_occurrences_lifetime: 1,
        attachment_rule: 'required', gender_restriction: 'any', min_notice_days: 30, max_backdate_days: 0,
        payroll_pay_percent: 0, attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 1, sort_order: 14
      },
      {
        code: 'cuti_umrah', name: 'Cuti Ibadah Umrah', category: 'special', is_system: 0, is_active: 1,
        count_mode: 'calendar_days', deducts_balance: 0, max_days_per_request: 14.0, attachment_rule: 'required',
        gender_restriction: 'any', min_notice_days: 14, max_backdate_days: 0, payroll_pay_percent: 0,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 1, sort_order: 15
      },
      {
        code: 'cuti_tanpa_gaji', name: 'Cuti di Luar Tanggungan (Unpaid)', category: 'unpaid', is_system: 0, is_active: 0, // Inactive by default
        count_mode: 'calendar_days', deducts_balance: 0, max_days_per_request: 30.0, attachment_rule: 'optional',
        gender_restriction: 'any', min_notice_days: 7, max_backdate_days: 0, payroll_pay_percent: 0,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 1, sort_order: 16
      },
      {
        code: 'cuti_khusus', name: 'Cuti Khusus (Lainnya)', category: 'special', is_system: 1, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, attachment_rule: 'optional', gender_restriction: 'any',
        min_notice_days: 0, max_backdate_days: 0, payroll_pay_percent: null,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 3, sort_order: 17
      },
      {
        code: 'lainnya', name: 'Lainnya', category: 'other', is_system: 1, is_active: 1,
        count_mode: 'work_days', deducts_balance: 0, attachment_rule: 'optional', reason_required: 1,
        gender_restriction: 'any', min_notice_days: 0, max_backdate_days: 0, payroll_pay_percent: null,
        attendance_status: 'permitted', attendance_sub_status: 'cuti', approval_profile_id: 3, sort_order: 18
      }
    ];

    for (const t of typesSeed) {
      await knex('leave_types').insert({
        ...t,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // 4. school_unit_approvers
  const hasUnitApprovers = await knex.schema.hasTable('school_unit_approvers');
  if (!hasUnitApprovers) {
    await knex.schema.createTable('school_unit_approvers', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.enum('approver_role', ['unit_head']).notNullable().defaultTo('unit_head');
      table.bigInteger('employee_id').unsigned().notNullable();
      table.date('valid_from').notNullable();
      table.date('valid_to').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      table.index(['school_unit_id', 'approver_role', 'valid_from', 'valid_to'], 'idx_unit_approvers_lookup');
    });
  }

  // 5. approval_delegations
  const hasDelegations = await knex.schema.hasTable('approval_delegations');
  if (!hasDelegations) {
    await knex.schema.createTable('approval_delegations', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('delegator_employee_id').unsigned().notNullable();
      table.bigInteger('delegate_employee_id').unsigned().notNullable();
      table.enum('scope', ['leave', 'overtime', 'all']).defaultTo('all');
      table.date('valid_from').notNullable();
      table.date('valid_to').notNullable();
      table.string('reason', 500).nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('revoked_at').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      table.index(['delegator_employee_id', 'valid_from', 'valid_to'], 'idx_delegator_active');
      table.index(['delegate_employee_id', 'valid_from', 'valid_to'], 'idx_delegate_active');
    });
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('approval_delegations')) {
    await knex.schema.dropTableIfExists('approval_delegations');
  }
  if (await knex.schema.hasTable('school_unit_approvers')) {
    await knex.schema.dropTableIfExists('school_unit_approvers');
  }
  if (await knex.schema.hasTable('leave_types')) {
    await knex.schema.dropTableIfExists('leave_types');
  }
  if (await knex.schema.hasTable('leave_approval_profile_steps')) {
    await knex.schema.dropTableIfExists('leave_approval_profile_steps');
  }
  if (await knex.schema.hasTable('leave_approval_profiles')) {
    await knex.schema.dropTableIfExists('leave_approval_profiles');
  }
};
