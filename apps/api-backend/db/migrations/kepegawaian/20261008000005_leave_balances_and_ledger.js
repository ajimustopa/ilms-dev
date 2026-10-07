/**
 * Migration M-E: Leave Balances & Append-Only Ledger
 * Modul Kepegawaian - Core Aldepos
 * Tables:
 * - employee_leave_balances (Cache Table)
 * - leave_ledger_entries (Append-Only Source of Truth)
 */

exports.up = async function(knex) {
  // 1. employee_leave_balances (Cache)
  const hasBalances = await knex.schema.hasTable('employee_leave_balances');
  if (!hasBalances) {
    await knex.schema.createTable('employee_leave_balances', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('period_id').unsigned().notNullable();
      table.bigInteger('policy_id').unsigned().notNullable();
      table.decimal('granted', 5, 1).defaultTo(0.0);
      table.decimal('carry_in', 5, 1).defaultTo(0.0);
      table.decimal('adjusted', 5, 1).defaultTo(0.0);
      table.decimal('used', 5, 1).defaultTo(0.0);
      table.decimal('reserved', 5, 1).defaultTo(0.0);
      table.decimal('expired', 5, 1).defaultTo(0.0);
      table.decimal('available', 5, 1).defaultTo(0.0);
      table.date('carry_expires_on').nullable();
      table.timestamps(true, true);

      table.unique(['employee_id', 'period_id', 'policy_id'], 'uq_emp_period_policy_balance');
      table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      table.foreign('period_id').references('id').inTable('leave_balance_periods').onDelete('CASCADE');
      table.foreign('policy_id').references('id').inTable('leave_balance_policies').onDelete('CASCADE');
    });
  }

  // 2. leave_ledger_entries (Append-Only)
  const hasLedger = await knex.schema.hasTable('leave_ledger_entries');
  if (!hasLedger) {
    await knex.schema.createTable('leave_ledger_entries', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('period_id').unsigned().notNullable();
      table.bigInteger('policy_id').unsigned().notNullable();
      table.enum('bucket', ['current', 'carry_over']).defaultTo('current');
      table.enum('entry_type', [
        'grant',
        'carry_in',
        'reserve',
        'commit',
        'release',
        'refund',
        'joint_leave_debit',
        'expire',
        'adjust',
        'compensation_credit'
      ]).notNullable();
      table.decimal('delta_available', 5, 1).notNullable().defaultTo(0.0);
      table.decimal('delta_reserved', 5, 1).notNullable().defaultTo(0.0);
      table.decimal('delta_used', 5, 1).notNullable().defaultTo(0.0);
      table.date('effective_date').notNullable();
      table.enum('source_type', ['leave_request', 'holiday', 'adjustment', 'period_close', 'overtime', 'system']).notNullable();
      table.bigInteger('source_id').unsigned().nullable();
      table.integer('source_version').unsigned().nullable();
      table.string('idempotency_key', 120).notNullable().unique();
      table.string('reason', 500).nullable();
      table.bigInteger('created_by_user_id').unsigned().nullable();
      table.bigInteger('created_by_employee_id').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['employee_id', 'period_id', 'created_at'], 'idx_ledger_emp_period_time');
      table.index(['source_type', 'source_id'], 'idx_ledger_source');
      table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      table.foreign('period_id').references('id').inTable('leave_balance_periods').onDelete('CASCADE');
      table.foreign('policy_id').references('id').inTable('leave_balance_policies').onDelete('CASCADE');
    });
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('leave_ledger_entries')) {
    await knex.schema.dropTableIfExists('leave_ledger_entries');
  }
  if (await knex.schema.hasTable('employee_leave_balances')) {
    await knex.schema.dropTableIfExists('employee_leave_balances');
  }
};
