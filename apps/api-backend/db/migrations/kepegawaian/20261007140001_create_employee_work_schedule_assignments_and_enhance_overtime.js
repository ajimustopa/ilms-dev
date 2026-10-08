/**
 * Migration: create_employee_work_schedule_assignments_and_enhance_overtime
 * Modul Kepegawaian - Fitur: 3 Metode Penetapan Jadwal Presensi & Pencatatan Lembur Terpadu
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah kolom pendukung di attendance_work_schedules jika belum ada
  const hasScheduleType = await knex.schema.hasColumn('attendance_work_schedules', 'schedule_type');
  if (!hasScheduleType) {
    await knex.schema.alterTable('attendance_work_schedules', (table) => {
      table.enum('schedule_type', ['massal', 'shift', 'flexible']).notNullable().defaultTo('massal').after('name');
      table.decimal('flexible_target_hours', 4, 2).nullable().defaultTo(8.00).after('early_departure_tolerance_minutes');
    });
  }

  // 2. Tabel Penugasan Jadwal Pegawai (3 Metode: Massal, Custom per Pegawai, Fleksibel)
  const hasScheduleAssignments = await knex.schema.hasTable('employee_work_schedule_assignments');
  if (!hasScheduleAssignments) {
    await knex.schema.createTable('employee_work_schedule_assignments', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().index();
      table.bigInteger('employee_id').unsigned().notNullable().index()
        .references('id').inTable('employees').onDelete('CASCADE');
      table.enum('assignment_type', ['massal', 'custom_employee', 'flexible']).notNullable().defaultTo('massal').index();
      table.bigInteger('schedule_id').unsigned().nullable().index()
        .references('id').inTable('attendance_work_schedules').onDelete('SET NULL');
      table.time('custom_start_time').nullable();
      table.time('custom_end_time').nullable();
      table.string('custom_days_of_week', 255).nullable().comment('Array JSON atau comma-separated, misal ["monday","wednesday"]');
      table.integer('custom_late_tolerance_minutes').unsigned().nullable().defaultTo(15);
      table.integer('custom_early_tolerance_minutes').unsigned().nullable().defaultTo(0);
      table.decimal('flexible_target_hours', 4, 2).nullable().defaultTo(8.00);
      table.date('effective_start_date').nullable().index();
      table.date('effective_end_date').nullable().index();
      table.boolean('is_active').notNullable().defaultTo(true).index();
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    });
  }

  // 3. Tambah kolom pendukung di employee_overtimes
  const hasStartTime = await knex.schema.hasColumn('employee_overtimes', 'start_time');
  if (!hasStartTime) {
    await knex.schema.alterTable('employee_overtimes', (table) => {
      table.time('start_time').nullable().after('overtime_date');
      table.time('end_time').nullable().after('start_time');
      table.time('actual_start_time').nullable().after('end_time');
      table.time('actual_end_time').nullable().after('actual_start_time');
      table.text('task_description').nullable().after('hours');
      table.string('attachment_url', 255).nullable().after('task_description');
      table.text('rejection_reason').nullable().after('status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasScheduleAssignments = await knex.schema.hasTable('employee_work_schedule_assignments');
  if (hasScheduleAssignments) {
    await knex.schema.dropTableIfExists('employee_work_schedule_assignments');
  }

  const hasStartTime = await knex.schema.hasColumn('employee_overtimes', 'start_time');
  if (hasStartTime) {
    await knex.schema.alterTable('employee_overtimes', (table) => {
      table.dropColumn('rejection_reason');
      table.dropColumn('attachment_url');
      table.dropColumn('task_description');
      table.dropColumn('actual_end_time');
      table.dropColumn('actual_start_time');
      table.dropColumn('end_time');
      table.dropColumn('start_time');
    });
  }

  const hasScheduleType = await knex.schema.hasColumn('attendance_work_schedules', 'schedule_type');
  if (hasScheduleType) {
    await knex.schema.alterTable('attendance_work_schedules', (table) => {
      table.dropColumn('flexible_target_hours');
      table.dropColumn('schedule_type');
    });
  }
};
