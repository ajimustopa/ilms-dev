/**
 * Migration: create_lesson_and_activity_attendances_tables
 * Modul Akademik - Presensi Per Jam Pelajaran & Presensi Kegiatan (Ekskul/Acara)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel lesson_attendances (Presensi per Jam Pelajaran)
  await knex.schema.createTable('lesson_attendances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable();
    table.bigInteger('class_group_id').unsigned().notNullable();
    table.bigInteger('subject_schedule_id').unsigned().notNullable();
    table.date('date').notNullable();
    table.enum('status', ['present', 'sick', 'permitted', 'absent', 'late']).notNullable().defaultTo('present');
    table.time('check_in_time').nullable();
    table.bigInteger('recorded_by').unsigned().nullable();
    table.enum('input_method', ['manual', 'rfid']).notNullable().defaultTo('manual');
    table.string('device_ref', 100).nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.unique(['student_id', 'subject_schedule_id', 'date'], 'uq_lesson_attendance_student_schedule_date');
    table.index(['class_group_id', 'date'], 'idx_lesson_att_class_date');
    table.index(['subject_schedule_id', 'date'], 'idx_lesson_att_schedule_date');
  });

  // 2. Tabel activity_attendances (Presensi Kegiatan / Ekskul / Acara Sekolah)
  await knex.schema.createTable('activity_attendances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable();
    table.enum('activity_type', ['ekskul', 'acara_sekolah', 'lainnya']).notNullable().defaultTo('ekskul');
    table.bigInteger('activity_ref_id').unsigned().nullable();
    table.string('activity_name', 150).notNullable();
    table.date('date').notNullable();
    table.enum('status', ['present', 'absent', 'excused']).notNullable().defaultTo('present');
    table.bigInteger('recorded_by').unsigned().nullable();
    table.enum('input_method', ['manual', 'rfid']).notNullable().defaultTo('manual');
    table.string('device_ref', 100).nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.index(['student_id', 'date'], 'idx_activity_att_student_date');
    table.index(['activity_type', 'activity_ref_id', 'date'], 'idx_activity_att_ref_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('activity_attendances');
  await knex.schema.dropTableIfExists('lesson_attendances');
};
