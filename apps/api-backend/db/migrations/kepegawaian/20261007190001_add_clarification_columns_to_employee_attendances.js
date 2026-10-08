/**
 * Migration: Add clarification and manual entry columns to employee_attendances
 * Mengakomodir pengajuan absensi terlewat / lupa absen yang memerlukan klarifikasi HRD.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasEntryType = await knex.schema.hasColumn('employee_attendances', 'entry_type');
  if (!hasEntryType) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.string('entry_type', 32).defaultTo('realtime_gps').after('status');
      table.boolean('is_clarification_needed').defaultTo(false).after('entry_type');
      table.string('clarification_status', 32).defaultTo('none').after('is_clarification_needed'); // 'none', 'pending', 'approved', 'rejected'
      table.text('clarification_reason').nullable().after('clarification_status');
      table.text('clarification_attachment_url').nullable().after('clarification_reason');
      table.timestamp('clarification_submitted_at').nullable().after('clarification_attachment_url');
      table.bigInteger('clarification_reviewed_by').unsigned().nullable().after('clarification_submitted_at');
      table.timestamp('clarification_reviewed_at').nullable().after('clarification_reviewed_by');
      table.text('clarification_review_notes').nullable().after('clarification_reviewed_at');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasEntryType = await knex.schema.hasColumn('employee_attendances', 'entry_type');
  if (hasEntryType) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.dropColumn('entry_type');
      table.dropColumn('is_clarification_needed');
      table.dropColumn('clarification_status');
      table.dropColumn('clarification_reason');
      table.dropColumn('clarification_attachment_url');
      table.dropColumn('clarification_submitted_at');
      table.dropColumn('clarification_reviewed_by');
      table.dropColumn('clarification_reviewed_at');
      table.dropColumn('clarification_review_notes');
    });
  }
};
