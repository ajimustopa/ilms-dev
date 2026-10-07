/**
 * Migration M-F: Expand Leave Requests and Create Approval Steps
 * Modul Kepegawaian - Core Aldepos
 * Tables/Columns:
 * - employee_leave_requests (expanded)
 * - approval_steps
 */

exports.up = async function(knex) {
  // 1. Expand employee_leave_requests
  const hasLeaveReqs = await knex.schema.hasTable('employee_leave_requests');
  if (hasLeaveReqs) {
    const hasLeaveTypeId = await knex.schema.hasColumn('employee_leave_requests', 'leave_type_id');
    const hasDurationDays = await knex.schema.hasColumn('employee_leave_requests', 'duration_days');
    const hasCountMode = await knex.schema.hasColumn('employee_leave_requests', 'count_mode');
    const hasDayBreakdown = await knex.schema.hasColumn('employee_leave_requests', 'day_breakdown');
    const hasStartPortion = await knex.schema.hasColumn('employee_leave_requests', 'start_portion');
    const hasEndPortion = await knex.schema.hasColumn('employee_leave_requests', 'end_portion');
    const hasCurrentStepNo = await knex.schema.hasColumn('employee_leave_requests', 'current_step_no');
    const hasVersion = await knex.schema.hasColumn('employee_leave_requests', 'version');
    const hasSubmittedBy = await knex.schema.hasColumn('employee_leave_requests', 'submitted_by_user_id');
    const hasSubmittedOnBehalf = await knex.schema.hasColumn('employee_leave_requests', 'submitted_on_behalf');
    const hasBypassApproval = await knex.schema.hasColumn('employee_leave_requests', 'bypass_approval');
    const hasBypassReason = await knex.schema.hasColumn('employee_leave_requests', 'bypass_reason');
    const hasCancelledAt = await knex.schema.hasColumn('employee_leave_requests', 'cancelled_at');
    const hasCancelledBy = await knex.schema.hasColumn('employee_leave_requests', 'cancelled_by_user_id');
    const hasCancelReason = await knex.schema.hasColumn('employee_leave_requests', 'cancel_reason');

    await knex.schema.alterTable('employee_leave_requests', (table) => {
      if (!hasLeaveTypeId) table.bigInteger('leave_type_id').unsigned().nullable().after('leave_type');
      if (!hasDurationDays) table.decimal('duration_days', 5, 1).nullable().after('end_date');
      if (!hasCountMode) table.enum('count_mode', ['work_days', 'calendar_days']).nullable().after('duration_days');
      if (!hasDayBreakdown) table.json('day_breakdown').nullable().after('count_mode');
      if (!hasStartPortion) table.enum('start_portion', ['full', 'am', 'pm']).notNullable().defaultTo('full').after('day_breakdown');
      if (!hasEndPortion) table.enum('end_portion', ['full', 'am', 'pm']).notNullable().defaultTo('full').after('start_portion');
      if (!hasCurrentStepNo) table.tinyint('current_step_no').unsigned().nullable().after('status');
      if (!hasVersion) table.integer('version').unsigned().notNullable().defaultTo(1).after('current_step_no');
      if (!hasSubmittedBy) table.bigInteger('submitted_by_user_id').unsigned().nullable().after('version');
      if (!hasSubmittedOnBehalf) table.boolean('submitted_on_behalf').defaultTo(false).after('submitted_by_user_id');
      if (!hasBypassApproval) table.boolean('bypass_approval').defaultTo(false).after('submitted_on_behalf');
      if (!hasBypassReason) table.string('bypass_reason', 500).nullable().after('bypass_approval');
      if (!hasCancelledAt) table.timestamp('cancelled_at').nullable().after('bypass_reason');
      if (!hasCancelledBy) table.bigInteger('cancelled_by_user_id').unsigned().nullable().after('cancelled_at');
      if (!hasCancelReason) table.string('cancel_reason', 500).nullable().after('cancelled_by_user_id');
    });

    // Alter status column enum safely using raw query if on mysql/mariadb
    await knex.raw(`
      ALTER TABLE employee_leave_requests 
      MODIFY COLUMN status ENUM('pending','approved','rejected','revision_requested','cancelled') 
      NOT NULL DEFAULT 'pending'
    `);

    // Indexes for employee_leave_requests (SPEC §10.1)
    // Check if index exists or create inside alterTable / raw
    try {
      await knex.schema.alterTable('employee_leave_requests', (table) => {
        table.index(['school_unit_id', 'status', 'start_date'], 'idx_leave_unit_status_start');
        table.index(['employee_id', 'start_date', 'end_date'], 'idx_leave_emp_dates');
        table.index(['status'], 'idx_leave_status');
      });
    } catch (e) {
      // Index might already exist, ignore duplicate index error
    }

    // Backfill leave_type_id from LOWER(TRIM(leave_type)) (SPEC §10.3)
    const hasLeaveTypesTable = await knex.schema.hasTable('leave_types');
    if (hasLeaveTypesTable) {
      const leaveRows = await knex('employee_leave_requests').whereNull('leave_type_id');
      if (leaveRows.length > 0) {
        const leaveTypes = await knex('leave_types').select('id', 'code');
        const typeMap = new Map(leaveTypes.map(t => [t.code.toLowerCase(), t.id]));
        const fallbackOther = typeMap.get('lainnya') || null;

        for (const req of leaveRows) {
          const normalizedCode = (req.leave_type || '').toLowerCase().trim();
          const matchedId = typeMap.get(normalizedCode) || fallbackOther;
          if (matchedId) {
            await knex('employee_leave_requests').where({ id: req.id }).update({ leave_type_id: matchedId });
          }
        }
      }
    }
  }

  // 2. Create approval_steps
  const hasApprovalSteps = await knex.schema.hasTable('approval_steps');
  if (!hasApprovalSteps) {
    await knex.schema.createTable('approval_steps', (table) => {
      table.bigIncrements('id').primary();
      table.enum('entity_type', ['leave', 'overtime']).notNullable();
      table.bigInteger('entity_id').unsigned().notNullable();
      table.integer('request_version').unsigned().notNullable().defaultTo(1);
      table.tinyint('step_no').unsigned().notNullable();
      table.enum('approver_source', ['direct_supervisor', 'unit_head', 'hrd_pool', 'yayasan_pool']).notNullable();
      table.bigInteger('assigned_employee_id').unsigned().nullable();
      table.enum('status', ['pending', 'approved', 'rejected', 'revision_requested', 'skipped', 'bypassed']).defaultTo('pending');
      table.bigInteger('acted_by_user_id').unsigned().nullable();
      table.bigInteger('acted_by_employee_id').unsigned().nullable();
      table.bigInteger('on_behalf_of_employee_id').unsigned().nullable();
      table.timestamp('acted_at').nullable();
      table.string('comment', 500).nullable();
      table.string('skip_reason', 255).nullable();
      table.timestamps(true, true);

      table.unique(['entity_type', 'entity_id', 'request_version', 'step_no'], 'uq_step_entity_version_no');
      table.index(['entity_type', 'entity_id', 'status'], 'idx_step_entity_lookup');
      table.index(['assigned_employee_id', 'status'], 'idx_step_assigned_inbox');
    });
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('approval_steps')) {
    await knex.schema.dropTableIfExists('approval_steps');
  }
  if (await knex.schema.hasTable('employee_leave_requests')) {
    try {
      await knex.schema.alterTable('employee_leave_requests', (table) => {
        table.dropIndex(['school_unit_id', 'status', 'start_date'], 'idx_leave_unit_status_start');
        table.dropIndex(['employee_id', 'start_date', 'end_date'], 'idx_leave_emp_dates');
        table.dropIndex(['status'], 'idx_leave_status');
      });
    } catch (e) {
      // ignore if indexes do not exist
    }

    await knex.schema.alterTable('employee_leave_requests', (table) => {
      table.dropColumn('cancel_reason');
      table.dropColumn('cancelled_by_user_id');
      table.dropColumn('cancelled_at');
      table.dropColumn('bypass_reason');
      table.dropColumn('bypass_approval');
      table.dropColumn('submitted_on_behalf');
      table.dropColumn('submitted_by_user_id');
      table.dropColumn('version');
      table.dropColumn('current_step_no');
      table.dropColumn('end_portion');
      table.dropColumn('start_portion');
      table.dropColumn('day_breakdown');
      table.dropColumn('count_mode');
      table.dropColumn('duration_days');
      table.dropColumn('leave_type_id');
    });
  }
};
