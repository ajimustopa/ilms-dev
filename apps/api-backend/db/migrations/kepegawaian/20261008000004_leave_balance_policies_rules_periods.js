/**
 * Migration M-D: Leave Balance Policies, Entitlement Rules, and Periods
 * Modul Kepegawaian - Core Aldepos
 * Tables:
 * - leave_balance_policies
 * - leave_entitlement_rules
 * - leave_balance_periods
 */

exports.up = async function(knex) {
  // 1. leave_balance_policies
  const hasPolicies = await knex.schema.hasTable('leave_balance_policies');
  if (!hasPolicies) {
    await knex.schema.createTable('leave_balance_policies', (table) => {
      table.bigIncrements('id').primary();
      table.string('code', 50).notNullable().unique();
      table.string('name', 150).notNullable();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.tinyint('period_start_month').unsigned().defaultTo(7); // Jul-Jun
      table.enum('proration_mode', ['none', 'monthly']).defaultTo('monthly');
      table.smallint('proration_join_day_cutoff').defaultTo(15);
      table.enum('rounding', ['floor_half', 'nearest_half', 'ceil_half']).defaultTo('floor_half');
      table.smallint('min_service_months_for_eligibility').defaultTo(0);
      table.boolean('carry_over_enabled').defaultTo(true);
      table.decimal('carry_over_max_days', 5, 1).defaultTo(6.0);
      table.smallint('carry_over_expiry_months').defaultTo(3);
      table.boolean('allow_negative').defaultTo(false);
      table.decimal('negative_limit_days', 5, 1).defaultTo(0.0);
      table.boolean('is_active').defaultTo(true);
      table.date('effective_from').notNullable();
      table.timestamps(true, true);
    });

    // Seed default annual policy (SPEC §5.1)
    await knex('leave_balance_policies').insert({
      id: 1,
      code: 'annual_default',
      name: 'Kebijakan Cuti Tahunan Standar (Tahun Ajaran Jul-Jun)',
      school_unit_id: null,
      period_start_month: 7,
      proration_mode: 'monthly',
      proration_join_day_cutoff: 15,
      rounding: 'floor_half',
      min_service_months_for_eligibility: 0,
      carry_over_enabled: 1,
      carry_over_max_days: 6.0,
      carry_over_expiry_months: 3,
      allow_negative: 0,
      negative_limit_days: 0.0,
      is_active: 1,
      effective_from: '2026-07-01',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Link leave_types cuti_tahunan to policy 1
    if (await knex.schema.hasTable('leave_types')) {
      await knex('leave_types')
        .where({ code: 'cuti_tahunan' })
        .update({ balance_policy_id: 1 });
    }
  }

  // 2. leave_entitlement_rules
  const hasRules = await knex.schema.hasTable('leave_entitlement_rules');
  if (!hasRules) {
    await knex.schema.createTable('leave_entitlement_rules', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('policy_id').unsigned().notNullable();
      table.string('employment_status', 50).nullable();
      table.smallint('min_service_months').defaultTo(0);
      table.smallint('max_service_months').nullable();
      table.decimal('days', 5, 1).notNullable().defaultTo(12.0);
      table.smallint('priority').defaultTo(10);
      table.timestamps(true, true);

      table.foreign('policy_id').references('id').inTable('leave_balance_policies').onDelete('CASCADE');
      table.index(['policy_id', 'employment_status'], 'idx_rules_policy_status');
    });

    // Seed entitlement rules (SPEC §5.1)
    await knex('leave_entitlement_rules').insert([
      { policy_id: 1, employment_status: 'GTY', min_service_months: 0, days: 12.0, priority: 10 },
      { policy_id: 1, employment_status: 'PTY', min_service_months: 0, days: 12.0, priority: 10 }
    ]);
  }

  // 3. leave_balance_periods
  const hasPeriods = await knex.schema.hasTable('leave_balance_periods');
  if (!hasPeriods) {
    await knex.schema.createTable('leave_balance_periods', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('policy_id').unsigned().notNullable();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.string('period_key', 50).notNullable(); // e.g. '2026/2027'
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.enum('status', ['open', 'closed']).defaultTo('open');
      table.timestamp('closed_at').nullable();
      table.bigInteger('closed_by').unsigned().nullable();
      table.timestamps(true, true);

      table.foreign('policy_id').references('id').inTable('leave_balance_policies').onDelete('CASCADE');
      table.index(['policy_id', 'school_unit_id', 'period_key'], 'idx_periods_lookup');
    });

    // Seed active period 2026/2027
    await knex('leave_balance_periods').insert({
      id: 1,
      policy_id: 1,
      school_unit_id: null,
      period_key: '2026/2027',
      start_date: '2026-07-01',
      end_date: '2027-06-30',
      status: 'open',
      created_at: new Date(),
      updated_at: new Date()
    });
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('leave_balance_periods')) {
    await knex.schema.dropTableIfExists('leave_balance_periods');
  }
  if (await knex.schema.hasTable('leave_entitlement_rules')) {
    await knex.schema.dropTableIfExists('leave_entitlement_rules');
  }
  if (await knex.schema.hasTable('leave_balance_policies')) {
    await knex.schema.dropTableIfExists('leave_balance_policies');
  }
};
