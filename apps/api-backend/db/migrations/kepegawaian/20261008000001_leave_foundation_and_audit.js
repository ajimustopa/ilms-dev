/**
 * Migration M-A: Leave Foundation & Audit Logs
 * Modul Kepegawaian - Core Aldepos
 * Tables/Columns:
 * - employees (join_date, direct_supervisor_employee_id)
 * - leave_audit_logs
 * - leave_module_settings
 */

exports.up = async function(knex) {
  // 1. Alter employees table: add join_date & direct_supervisor_employee_id
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    const hasJoinDate = await knex.schema.hasColumn('employees', 'join_date');
    const hasSupervisor = await knex.schema.hasColumn('employees', 'direct_supervisor_employee_id');

    await knex.schema.alterTable('employees', (table) => {
      if (!hasJoinDate) {
        table.date('join_date').nullable();
      }
      if (!hasSupervisor) {
        table.bigInteger('direct_supervisor_employee_id').unsigned().nullable();
      }
    });
  }

  // 2. Create leave_audit_logs
  const hasLeaveAuditLogs = await knex.schema.hasTable('leave_audit_logs');
  if (!hasLeaveAuditLogs) {
    await knex.schema.createTable('leave_audit_logs', (table) => {
      table.bigIncrements('id').primary();
      table.string('entity_type', 50).notNullable(); // 'leave_request', 'leave_balance', 'holiday', 'leave_type', etc.
      table.bigInteger('entity_id').unsigned().notNullable();
      table.string('action', 50).notNullable(); // 'create', 'approve', 'reject', 'adjust', etc.
      table.bigInteger('actor_user_id').unsigned().notNullable();
      table.bigInteger('actor_employee_id').unsigned().nullable();
      table.json('before_json').nullable();
      table.json('after_json').nullable();
      table.string('reason', 500).nullable();
      table.string('ip', 45).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['entity_type', 'entity_id', 'created_at'], 'idx_leave_audit_entity_time');
      table.index(['actor_user_id'], 'idx_leave_audit_actor');
    });
  }

  // 3. Create leave_module_settings
  const hasLeaveModuleSettings = await knex.schema.hasTable('leave_module_settings');
  if (!hasLeaveModuleSettings) {
    await knex.schema.createTable('leave_module_settings', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.string('setting_key', 100).notNullable();
      table.json('setting_value').notNullable();
      table.timestamps(true, true);

      table.unique(['school_unit_id', 'setting_key'], 'uq_unit_setting_key');
    });

    // Seed default settings (SPEC §3.5)
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
      await knex('leave_module_settings').insert({
        school_unit_id: null,
        setting_key: s.setting_key,
        setting_value: s.setting_value,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('leave_module_settings')) {
    await knex.schema.dropTableIfExists('leave_module_settings');
  }
  if (await knex.schema.hasTable('leave_audit_logs')) {
    await knex.schema.dropTableIfExists('leave_audit_logs');
  }
  if (await knex.schema.hasTable('employees')) {
    const hasJoinDate = await knex.schema.hasColumn('employees', 'join_date');
    const hasSupervisor = await knex.schema.hasColumn('employees', 'direct_supervisor_employee_id');
    await knex.schema.alterTable('employees', (table) => {
      if (hasSupervisor) table.dropColumn('direct_supervisor_employee_id');
      if (hasJoinDate) table.dropColumn('join_date');
    });
  }
};
