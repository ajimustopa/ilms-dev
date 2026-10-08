/**
 * Migration: Add days_of_week JSON to attendance_work_schedules
 * Untuk mendukung 1 master skema jam kerja mingguan yang berlaku untuk kombinasi hari dalam sepekan.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('attendance_work_schedules', 'days_of_week');
  if (!hasColumn) {
    await knex.schema.alterTable('attendance_work_schedules', (table) => {
      table.json('days_of_week').nullable().after('day_of_week');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('attendance_work_schedules', 'days_of_week');
  if (hasColumn) {
    await knex.schema.alterTable('attendance_work_schedules', (table) => {
      table.dropColumn('days_of_week');
    });
  }
};
