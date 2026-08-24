/**
 * Timetable Engine Database Schema
 * Database: akademik_local
 */
const db = require('../src/config/db/akademik');

async function up() {
  console.log('--- Migrating Timetable Engine Tables ---');

  // 1. Time Slots / Period Structure
  const hasTimeSlots = await db.schema.hasTable('timetable_time_slots');
  if (!hasTimeSlots) {
    await db.schema.createTable('timetable_time_slots', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('day_of_week').notNullable().comment('1=Senin..7=Minggu');
      t.integer('period_index').notNullable().comment('1, 2, 3..');
      t.string('start_time', 10).notNullable().comment('HH:mm');
      t.string('end_time', 10).notNullable().comment('HH:mm');
      t.string('type', 30).defaultTo('lesson').comment('lesson | break | activity');
      t.string('label', 100).nullable().comment('Jam Ke-1, Istirahat, Upacara, dll');
      t.boolean('is_generator_usable').defaultTo(true);
      t.boolean('is_visible').defaultTo(true);
      t.timestamps(true, true);
    });
    console.log('Created timetable_time_slots table');
  }

  // 2. Teacher Availabilities
  const hasTeacherAvail = await db.schema.hasTable('timetable_teacher_availabilities');
  if (!hasTeacherAvail) {
    await db.schema.createTable('timetable_teacher_availabilities', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('teacher_employee_id').notNullable().index();
      t.integer('day_of_week').notNullable();
      t.integer('period_index').notNullable();
      t.string('status', 30).defaultTo('available').comment('available | unavailable | preferred | blocked');
      t.string('notes', 255).nullable();
      t.timestamps(true, true);
      t.unique(['academic_year_id', 'teacher_employee_id', 'day_of_week', 'period_index'], 'uniq_teacher_slot_avail');
    });
    console.log('Created timetable_teacher_availabilities table');
  }

  // 3. Class Group Availabilities
  const hasClassAvail = await db.schema.hasTable('timetable_class_availabilities');
  if (!hasClassAvail) {
    await db.schema.createTable('timetable_class_availabilities', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('class_group_id').notNullable().index();
      t.integer('day_of_week').notNullable();
      t.integer('period_index').notNullable();
      t.string('status', 30).defaultTo('available').comment('available | unavailable | blocked');
      t.string('notes', 255).nullable();
      t.timestamps(true, true);
      t.unique(['academic_year_id', 'class_group_id', 'day_of_week', 'period_index'], 'uniq_class_slot_avail');
    });
    console.log('Created timetable_class_availabilities table');
  }

  // 4. Lessons / Beban Mengajar
  const hasLessons = await db.schema.hasTable('timetable_lessons');
  if (!hasLessons) {
    await db.schema.createTable('timetable_lessons', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.string('type', 30).defaultTo('mapel').comment('mapel | ekskul');
      t.integer('subject_id').nullable().index();
      t.integer('extracurricular_id').nullable().index();
      t.string('name', 255).notNullable();
      t.integer('total_hours_per_week').notNullable().defaultTo(2).comment('Berapa JP per minggu');
      t.integer('duration_per_session').notNullable().defaultTo(2).comment('1 JP, 2 JP berurutan, 3 JP');
      t.string('room_name', 100).nullable();
      t.boolean('is_joined_class').defaultTo(false);
      t.json('target_class_ids').notNullable().comment('Array of class_group_id');
      t.json('teacher_ids').notNullable().comment('Array of employee_id (bisa multiple untuk team teaching)');
      t.json('constraints').nullable().comment('Objek aturan khusus: min_days, max_per_day, preferred_periods, dll');
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
    console.log('Created timetable_lessons table');
  }

  // 5. Non-Lesson Activities
  const hasActivities = await db.schema.hasTable('timetable_activities');
  if (!hasActivities) {
    await db.schema.createTable('timetable_activities', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.string('title', 255).notNullable();
      t.string('type', 30).defaultTo('activity').comment('activity | break | event');
      t.integer('day_of_week').notNullable();
      t.integer('period_index').nullable();
      t.string('start_time', 10).nullable();
      t.string('end_time', 10).nullable();
      t.boolean('applies_to_all_classes').defaultTo(true);
      t.json('target_class_ids').nullable();
      t.json('target_teacher_ids').nullable();
      t.timestamps(true, true);
    });
    console.log('Created timetable_activities table');
  }

  // 6. Timetable Runs / Versions
  const hasRuns = await db.schema.hasTable('timetable_runs');
  if (!hasRuns) {
    await db.schema.createTable('timetable_runs', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.string('name', 255).notNullable();
      t.string('status', 30).defaultTo('draft').comment('draft | generating | review | approved | published | archived');
      t.decimal('score', 5, 2).defaultTo(0.00);
      t.integer('total_lessons_count').defaultTo(0);
      t.integer('placed_lessons_count').defaultTo(0);
      t.integer('conflicts_count').defaultTo(0);
      t.integer('warnings_count').defaultTo(0);
      t.json('diagnostics').nullable();
      t.string('created_by', 100).nullable();
      t.timestamps(true, true);
    });
    console.log('Created timetable_runs table');
  }

  // 7. Timetable Entries
  const hasEntries = await db.schema.hasTable('timetable_entries');
  if (!hasEntries) {
    await db.schema.createTable('timetable_entries', (t) => {
      t.increments('id').primary();
      t.integer('timetable_run_id').notNullable().index();
      t.integer('lesson_id').notNullable().index();
      t.integer('day_of_week').notNullable();
      t.integer('period_index').notNullable();
      t.string('start_time', 10).notNullable();
      t.string('end_time', 10).notNullable();
      t.integer('class_group_id').notNullable().index();
      t.integer('teacher_employee_id').nullable().index();
      t.integer('subject_id').nullable().index();
      t.integer('extracurricular_id').nullable().index();
      t.string('room_name', 100).nullable();
      t.boolean('is_locked').defaultTo(false);
      t.boolean('is_joined_class').defaultTo(false);
      t.json('joined_class_group_ids').nullable();
      t.json('team_teacher_ids').nullable();
      t.timestamps(true, true);
    });
    console.log('Created timetable_entries table');
  }

  // 8. Timetable Audit Logs
  const hasAuditLogs = await db.schema.hasTable('timetable_audit_logs');
  if (!hasAuditLogs) {
    await db.schema.createTable('timetable_audit_logs', (t) => {
      t.increments('id').primary();
      t.integer('satuan_pendidikan_id').notNullable().index();
      t.integer('academic_year_id').notNullable().index();
      t.integer('timetable_run_id').nullable().index();
      t.string('action', 50).notNullable();
      t.text('description').notNullable();
      t.json('details').nullable();
      t.string('created_by', 100).notNullable();
      t.timestamps(true, true);
    });
    console.log('Created timetable_audit_logs table');
  }

  console.log('--- Timetable Engine Tables Migration Finished ---');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
