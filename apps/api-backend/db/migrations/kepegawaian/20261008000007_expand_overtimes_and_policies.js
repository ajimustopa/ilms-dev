/**
 * Migration M-G: Overtime Policies, Multiplier Tiers, and Overtime Request Expansion
 * Modul Kepegawaian - Core Aldepos
 * Tables/Columns:
 * - overtime_rate_policies
 * - overtime_multiplier_tiers
 * - employee_overtimes (expanded)
 */

exports.up = async function(knex) {
  // 1. overtime_rate_policies
  const hasOvertimePolicies = await knex.schema.hasTable('overtime_rate_policies');
  if (!hasOvertimePolicies) {
    await knex.schema.createTable('overtime_rate_policies', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.string('name', 150).notNullable();
      table.enum('calc_method', ['flat_hourly', 'monthly_wage_divisor']).defaultTo('flat_hourly');
      table.decimal('flat_hourly_rate', 12, 2).nullable();
      table.smallint('wage_divisor').defaultTo(173);
      table.smallint('rounding_minutes').defaultTo(30);
      table.smallint('min_payable_minutes').defaultTo(30);
      table.decimal('max_hours_per_day', 4, 1).defaultTo(4.0);
      table.decimal('max_hours_per_week', 4, 1).defaultTo(18.0);
      table.decimal('max_hours_per_month', 4, 1).defaultTo(72.0);
      table.json('eligible_employment_statuses').nullable();
      table.decimal('comp_off_hours_per_day', 4, 1).nullable();
      table.boolean('is_active').defaultTo(true);
      table.date('effective_from').notNullable();
      table.timestamps(true, true);
    });

    // Seed default policy (SPEC §2 #19, §7.4)
    await knex('overtime_rate_policies').insert({
      id: 1,
      name: 'Kebijakan Lembur Standar Yayasan',
      school_unit_id: null,
      calc_method: 'flat_hourly',
      flat_hourly_rate: null, // Left NULL per SPEC (no fake wage)
      wage_divisor: 173,
      rounding_minutes: 30,
      min_payable_minutes: 30,
      max_hours_per_day: 4.0,
      max_hours_per_week: 18.0,
      max_hours_per_month: 72.0,
      eligible_employment_statuses: JSON.stringify(['GTY', 'PTY']),
      is_active: 1,
      effective_from: '2026-07-01',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // 2. overtime_multiplier_tiers
  const hasMultiplierTiers = await knex.schema.hasTable('overtime_multiplier_tiers');
  if (!hasMultiplierTiers) {
    await knex.schema.createTable('overtime_multiplier_tiers', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('policy_id').unsigned().notNullable();
      table.enum('day_type', ['workday', 'weekend', 'holiday']).notNullable();
      table.decimal('from_hour', 4, 1).notNullable();
      table.decimal('to_hour', 4, 1).nullable();
      table.decimal('multiplier', 3, 1).notNullable();
      table.timestamps(true, true);

      table.foreign('policy_id').references('id').inTable('overtime_rate_policies').onDelete('CASCADE');
      table.index(['policy_id', 'day_type'], 'idx_policy_day_tiers');
    });

    // Seed multiplier tiers (SPEC §2 #19)
    await knex('overtime_multiplier_tiers').insert([
      // Workday: Jam 1 = x1.5, Jam 2+ = x2.0
      { policy_id: 1, day_type: 'workday', from_hour: 0.0, to_hour: 1.0, multiplier: 1.5 },
      { policy_id: 1, day_type: 'workday', from_hour: 1.0, to_hour: null, multiplier: 2.0 },
      // Weekend: Jam 1-8 = x2.0, Jam 9 = x3.0, Jam 10-11 = x4.0
      { policy_id: 1, day_type: 'weekend', from_hour: 0.0, to_hour: 8.0, multiplier: 2.0 },
      { policy_id: 1, day_type: 'weekend', from_hour: 8.0, to_hour: 9.0, multiplier: 3.0 },
      { policy_id: 1, day_type: 'weekend', from_hour: 9.0, to_hour: null, multiplier: 4.0 },
      // Holiday: Jam 1-8 = x2.0, Jam 9 = x3.0, Jam 10-11 = x4.0
      { policy_id: 1, day_type: 'holiday', from_hour: 0.0, to_hour: 8.0, multiplier: 2.0 },
      { policy_id: 1, day_type: 'holiday', from_hour: 8.0, to_hour: 9.0, multiplier: 3.0 },
      { policy_id: 1, day_type: 'holiday', from_hour: 9.0, to_hour: null, multiplier: 4.0 }
    ]);
  }

  // 3. Expand employee_overtimes
  const hasOvertimes = await knex.schema.hasTable('employee_overtimes');
  if (hasOvertimes) {
    const hasOrigin = await knex.schema.hasColumn('employee_overtimes', 'origin');
    const hasAssignedBy = await knex.schema.hasColumn('employee_overtimes', 'assigned_by_user_id');
    const hasBatchId = await knex.schema.hasColumn('employee_overtimes', 'assignment_batch_id');
    const hasSpk = await knex.schema.hasColumn('employee_overtimes', 'spk_number');
    const hasDayType = await knex.schema.hasColumn('employee_overtimes', 'day_type');
    const hasDayTypeOverridden = await knex.schema.hasColumn('employee_overtimes', 'day_type_overridden');
    const hasRequiresAttendance = await knex.schema.hasColumn('employee_overtimes', 'requires_actual_attendance');
    const hasPayableHours = await knex.schema.hasColumn('employee_overtimes', 'payable_hours');
    const hasRealizationStatus = await knex.schema.hasColumn('employee_overtimes', 'realization_status');
    const hasCompensationType = await knex.schema.hasColumn('employee_overtimes', 'compensation_type');
    const hasRatePolicyId = await knex.schema.hasColumn('employee_overtimes', 'rate_policy_id');
    const hasHourlyRateSnapshot = await knex.schema.hasColumn('employee_overtimes', 'hourly_rate_snapshot');
    const hasMultiplierBreakdown = await knex.schema.hasColumn('employee_overtimes', 'multiplier_breakdown');
    const hasEstimatedWage = await knex.schema.hasColumn('employee_overtimes', 'estimated_wage');
    const hasCurrentStepNo = await knex.schema.hasColumn('employee_overtimes', 'current_step_no');
    const hasVersion = await knex.schema.hasColumn('employee_overtimes', 'version');

    await knex.schema.alterTable('employee_overtimes', (table) => {
      if (!hasOrigin) table.enum('origin', ['assigned', 'requested']).defaultTo('requested').after('employee_id');
      if (!hasAssignedBy) table.bigInteger('assigned_by_user_id').unsigned().nullable().after('origin');
      if (!hasBatchId) table.string('assignment_batch_id', 100).nullable().after('assigned_by_user_id');
      if (!hasSpk) table.string('spk_number', 100).nullable().after('assignment_batch_id');
      if (!hasDayType) table.enum('day_type', ['workday', 'weekend', 'holiday']).nullable().after('overtime_date');
      if (!hasDayTypeOverridden) table.boolean('day_type_overridden').defaultTo(false).after('day_type');
      if (!hasRequiresAttendance) table.boolean('requires_actual_attendance').defaultTo(true).after('hours');
      if (!hasPayableHours) table.decimal('payable_hours', 4, 2).nullable().after('requires_actual_attendance');
      if (!hasRealizationStatus) table.enum('realization_status', ['pending', 'matched', 'partial', 'no_attendance', 'manual']).defaultTo('pending').after('payable_hours');
      if (!hasCompensationType) table.enum('compensation_type', ['pay', 'time_off']).defaultTo('pay').after('realization_status');
      if (!hasRatePolicyId) table.bigInteger('rate_policy_id').unsigned().nullable().after('compensation_type');
      if (!hasHourlyRateSnapshot) table.decimal('hourly_rate_snapshot', 12, 2).nullable().after('rate_policy_id');
      if (!hasMultiplierBreakdown) table.json('multiplier_breakdown').nullable().after('hourly_rate_snapshot');
      if (!hasEstimatedWage) table.decimal('estimated_wage', 14, 2).nullable().after('multiplier_breakdown');
      if (!hasCurrentStepNo) table.tinyint('current_step_no').unsigned().nullable().after('status');
      if (!hasVersion) table.integer('version').unsigned().notNullable().defaultTo(1).after('current_step_no');
    });

    await knex.raw(`
      ALTER TABLE employee_overtimes 
      MODIFY COLUMN status ENUM('pending','approved','rejected','cancelled') 
      NOT NULL DEFAULT 'pending'
    `);
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('employee_overtimes')) {
    await knex.schema.alterTable('employee_overtimes', (table) => {
      table.dropColumn('version');
      table.dropColumn('current_step_no');
      table.dropColumn('estimated_wage');
      table.dropColumn('multiplier_breakdown');
      table.dropColumn('hourly_rate_snapshot');
      table.dropColumn('rate_policy_id');
      table.dropColumn('compensation_type');
      table.dropColumn('realization_status');
      table.dropColumn('payable_hours');
      table.dropColumn('requires_actual_attendance');
      table.dropColumn('day_type_overridden');
      table.dropColumn('day_type');
      table.dropColumn('spk_number');
      table.dropColumn('assignment_batch_id');
      table.dropColumn('assigned_by_user_id');
      table.dropColumn('origin');
    });
  }
  if (await knex.schema.hasTable('overtime_multiplier_tiers')) {
    await knex.schema.dropTableIfExists('overtime_multiplier_tiers');
  }
  if (await knex.schema.hasTable('overtime_rate_policies')) {
    await knex.schema.dropTableIfExists('overtime_rate_policies');
  }
};
