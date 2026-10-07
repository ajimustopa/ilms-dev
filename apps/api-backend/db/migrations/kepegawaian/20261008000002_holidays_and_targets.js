/**
 * Migration M-B: Holidays and Holiday Schedule Targets
 * Modul Kepegawaian - Core Aldepos
 * Tables:
 * - holidays
 * - holiday_schedule_targets
 */

exports.up = async function(knex) {
  const hasHolidays = await knex.schema.hasTable('holidays');
  if (!hasHolidays) {
    await knex.schema.createTable('holidays', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.string('name', 150).notNullable();
      table.enum('holiday_type', [
        'national',
        'joint_leave',
        'school_semester',
        'school_ramadan',
        'school_exam',
        'foundation',
        'unit_special'
      ]).notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.boolean('is_off_day').defaultTo(true);
      table.enum('applies_to', ['all_employees', 'schedules']).defaultTo('all_employees');
      table.boolean('deducts_annual_leave').defaultTo(false);
      table.enum('date_rule', ['fixed_date', 'floating']).defaultTo('floating');
      table.enum('review_status', ['confirmed', 'draft_needs_review']).defaultTo('confirmed');
      table.enum('source', ['manual', 'imported_file', 'copied', 'academic_calendar']).defaultTo('manual');
      table.string('source_ref', 255).nullable();
      table.bigInteger('academic_event_id').unsigned().nullable();
      table.text('notes').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['school_unit_id', 'start_date', 'end_date'], 'idx_holidays_unit_dates');
      table.index(['holiday_type', 'start_date'], 'idx_holidays_type_date');
    });
  }

  const hasTargets = await knex.schema.hasTable('holiday_schedule_targets');
  if (!hasTargets) {
    await knex.schema.createTable('holiday_schedule_targets', (table) => {
      table.bigInteger('holiday_id').unsigned().notNullable();
      table.bigInteger('work_schedule_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.primary(['holiday_id', 'work_schedule_id']);
      table.foreign('holiday_id').references('id').inTable('holidays').onDelete('CASCADE');
      table.foreign('work_schedule_id').references('id').inTable('attendance_work_schedules').onDelete('CASCADE');
    });
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('holiday_schedule_targets')) {
    await knex.schema.dropTableIfExists('holiday_schedule_targets');
  }
  if (await knex.schema.hasTable('holidays')) {
    await knex.schema.dropTableIfExists('holidays');
  }
};
