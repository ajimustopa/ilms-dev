/**
 * Migration: create_planning_agenda_and_notifications
 * Modul Manajemen - Fitur 11: Timeline, Kalender, Agenda & Reminder
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasAgenda = await knex.schema.hasTable('planning_agendas');
  if (!hasAgenda) {
    await knex.schema.createTable('planning_agendas', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.string('title', 255).notNullable();
      table.enum('category', ['rapat', 'evaluasi', 'kegiatan_sekolah', 'audit_mutu', 'deadline', 'lainnya']).notNullable().defaultTo('rapat');
      table.text('description').nullable();
      table.date('start_date').notNullable();
      table.string('start_time', 10).nullable();
      table.date('end_date').nullable();
      table.string('end_time', 10).nullable();
      table.string('location', 255).nullable();
      table.bigInteger('pic_employee_id').unsigned().nullable();
      table.enum('reference_type', ['program', 'renop_activity', 'task', 'quality_goal', 'none']).notNullable().defaultTo('none');
      table.bigInteger('reference_id').unsigned().nullable();
      table.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('scheduled');
      table.bigInteger('created_by').unsigned().notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['school_unit_id', 'start_date'], 'idx_pa_unit_date');
      table.index(['category'], 'idx_pa_category');
      table.index(['reference_type', 'reference_id'], 'idx_pa_reference');
    });
  }

  const hasNotifications = await knex.schema.hasTable('user_notifications');
  if (!hasNotifications) {
    await knex.schema.createTable('user_notifications', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.bigInteger('recipient_employee_id').unsigned().notNullable();
      table.enum('type', ['deadline_today', 'overdue_alert', 'agenda_reminder', 'task_assignment', 'system']).notNullable().defaultTo('system');
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.string('reference_type', 50).nullable();
      table.bigInteger('reference_id').unsigned().nullable();
      table.date('due_date').nullable();
      table.timestamp('read_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['recipient_employee_id', 'read_at'], 'idx_un_recipient_read');
      // Unique composite key to strictly prevent duplicate reminders
      table.unique(['recipient_employee_id', 'type', 'reference_type', 'reference_id', 'due_date'], 'uq_un_reminder_dedup');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_notifications');
  await knex.schema.dropTableIfExists('planning_agendas');
};
