/**
 * Migration: create_attendance_period_locks_and_audit_logs
 * Modul Kepegawaian - Tabel Kunci Periode Presensi & Audit Log Mutasi Kehadiran
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel attendance_period_locks (Penguncian Periode Presensi Bulanan HRD)
  const hasPeriodLocks = await knex.schema.hasTable('attendance_period_locks');
  if (!hasPeriodLocks) {
    await knex.schema.createTable('attendance_period_locks', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().nullable().index();
      table.integer('period_month').unsigned().notNullable();
      table.integer('period_year').unsigned().notNullable();
      table.enum('status', ['draft', 'locked']).defaultTo('draft');
      table.bigInteger('locked_by').unsigned().nullable();
      table.timestamp('locked_at').nullable();
      table.json('summary_snapshot').nullable();
      table.text('notes').nullable();
      table.timestamps(true, true);

      table.unique(['school_unit_id', 'period_year', 'period_month'], 'uniq_period_unit');
    });
  }

  // 2. Tabel attendance_audit_logs (Catatan Audit Mutasi & Rekonsiliasi Presensi)
  const hasAuditLogs = await knex.schema.hasTable('attendance_audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('attendance_audit_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('attendance_id').unsigned().notNullable().index();
      table.string('action', 50).notNullable(); // MANUAL_ENTRY, CORRECTION, RESOLVE_ANOMALY, STATUS_CHANGE
      table.bigInteger('performed_by').unsigned().nullable();
      table.json('old_values').nullable();
      table.json('new_values').nullable();
      table.text('reason').notNullable();
      table.string('ip_address', 45).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 3. Tambah kolom pendukung anomali & sub-status pada employee_attendances
  const hasSubStatus = await knex.schema.hasColumn('employee_attendances', 'sub_status');
  if (!hasSubStatus) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.string('sub_status', 50).nullable().after('status');
      table.json('anomaly_flags').nullable().after('entry_type');
      table.boolean('is_anomaly').defaultTo(false).after('anomaly_flags');
      table.boolean('anomaly_resolved').defaultTo(false).after('is_anomaly');
      table.bigInteger('anomaly_resolved_by').unsigned().nullable().after('anomaly_resolved');
      table.timestamp('anomaly_resolved_at').nullable().after('anomaly_resolved_by');
      table.text('anomaly_resolution_notes').nullable().after('anomaly_resolved_at');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasSubStatus = await knex.schema.hasColumn('employee_attendances', 'sub_status');
  if (hasSubStatus) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.dropColumn('sub_status');
      table.dropColumn('anomaly_flags');
      table.dropColumn('is_anomaly');
      table.dropColumn('anomaly_resolved');
      table.dropColumn('anomaly_resolved_by');
      table.dropColumn('anomaly_resolved_at');
      table.dropColumn('anomaly_resolution_notes');
    });
  }

  await knex.schema.dropTableIfExists('attendance_audit_logs');
  await knex.schema.dropTableIfExists('attendance_period_locks');
};
