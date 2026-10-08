/**
 * Migration: Add custom_day_schedules to attendance_work_schedules
 * Untuk mengakomodir jam masuk dan jam pulang yang berbeda untuk tiap hari pada Master Shift Baku.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('attendance_work_schedules', 'custom_day_schedules');
  if (!hasColumn) {
    await knex.schema.alterTable('attendance_work_schedules', (table) => {
      table.json('custom_day_schedules').nullable().after('days_of_week');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('attendance_work_schedules', 'custom_day_schedules');
  if (hasColumn) {
    await knex.schema.alterTable('attendance_work_schedules', (table) => {
      table.dropColumn('custom_day_schedules');
    });
  }
};
