/**
 * Migration: add_custom_day_schedules_to_schedule_assignments
 * Modul Kepegawaian - Menambahkan kolom custom_day_schedules (JSON) untuk penetapan jam kerja berbeda per hari
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('employee_work_schedule_assignments');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('employee_work_schedule_assignments', 'custom_day_schedules');
    if (!hasColumn) {
      await knex.schema.alterTable('employee_work_schedule_assignments', (table) => {
        table.json('custom_day_schedules').nullable().after('custom_days_of_week')
          .comment('Pengaturan jam kerja detail per hari, misal { monday: { is_active: true, start_time: "07:00", end_time: "15:00" }, ... }');
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('employee_work_schedule_assignments');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('employee_work_schedule_assignments', 'custom_day_schedules');
    if (hasColumn) {
      await knex.schema.alterTable('employee_work_schedule_assignments', (table) => {
        table.dropColumn('custom_day_schedules');
      });
    }
  }
};
