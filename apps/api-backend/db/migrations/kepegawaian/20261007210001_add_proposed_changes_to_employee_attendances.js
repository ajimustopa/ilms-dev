/**
 * Migration: Add proposed changes and clarification type to employee_attendances
 * Mendukung perbandingan presisi antara Data Asli (Sistem) vs Data Usulan (Pegawai).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasProposedChanges = await knex.schema.hasColumn('employee_attendances', 'proposed_changes');
  if (!hasProposedChanges) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.string('clarification_type', 50).nullable().after('clarification_status');
      table.time('proposed_check_in_time').nullable().after('clarification_type');
      table.time('proposed_check_out_time').nullable().after('proposed_check_in_time');
      table.string('proposed_status', 32).nullable().after('proposed_check_out_time');
      table.string('proposed_sub_status', 50).nullable().after('proposed_status');
      table.json('proposed_changes').nullable().after('proposed_sub_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasProposedChanges = await knex.schema.hasColumn('employee_attendances', 'proposed_changes');
  if (hasProposedChanges) {
    await knex.schema.alterTable('employee_attendances', (table) => {
      table.dropColumn('proposed_changes');
      table.dropColumn('proposed_sub_status');
      table.dropColumn('proposed_status');
      table.dropColumn('proposed_check_out_time');
      table.dropColumn('proposed_check_in_time');
      table.dropColumn('clarification_type');
    });
  }
};
