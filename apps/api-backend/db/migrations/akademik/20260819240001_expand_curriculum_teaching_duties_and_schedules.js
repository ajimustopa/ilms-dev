/**
 * Migration: expand_curriculum_teaching_duties_and_schedules
 * Modul Akademik - Fitur:
 * 1. Expand class_groups for Ekstrakurikuler
 * 2. Pembagian Tugas Mengajar & Ekskul (Multi-teacher & Log Riwayat Alasan)
 * 3. Jadwal Pelajaran (Rombel Gabungan & Anti-Bentrok)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Expand class_groups for Ekstrakurikuler
  const hasType = await knex.schema.hasColumn('class_groups', 'type');
  if (!hasType) {
    await knex.schema.alterTable('class_groups', (table) => {
      table.string('type', 30).notNullable().defaultTo('reguler'); // 'reguler' | 'ekstrakurikuler'
      table.bigInteger('extracurricular_id').unsigned().nullable()
        .references('id').inTable('extracurriculars').onDelete('SET NULL');
      table.index(['type'], 'idx_class_groups_type');
    });
  }

  // 2. Pembagian Tugas Mengajar & Ekskul (Subject Teacher Assignments)
  const hasTeacherAssignments = await knex.schema.hasTable('subject_teacher_assignments');
  if (!hasTeacherAssignments) {
    await knex.schema.createTable('subject_teacher_assignments', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable()
        .references('id').inTable('academic_years').onDelete('CASCADE');
      table.string('type', 20).notNullable().defaultTo('mapel'); // 'mapel' | 'ekskul'
      table.bigInteger('subject_id').unsigned().nullable()
        .references('id').inTable('subjects').onDelete('CASCADE');
      table.bigInteger('extracurricular_id').unsigned().nullable()
        .references('id').inTable('extracurriculars').onDelete('CASCADE');
      table.bigInteger('teacher_employee_id').unsigned().notNullable();
      table.string('role_description', 100).nullable().defaultTo('Guru Pengampu');
      table.text('notes').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['satuan_pendidikan_id'], 'idx_sta_satuan');
      table.index(['academic_year_id'], 'idx_sta_academic_year');
      table.index(['subject_id'], 'idx_sta_subject');
      table.index(['extracurricular_id'], 'idx_sta_extra');
      table.index(['teacher_employee_id'], 'idx_sta_teacher');
    });
  }

  // 3. Log Riwayat Perubahan Penugasan Guru (Audit / Reason Logs)
  const hasAssignmentLogs = await knex.schema.hasTable('subject_teacher_assignment_logs');
  if (!hasAssignmentLogs) {
    await knex.schema.createTable('subject_teacher_assignment_logs', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable();
      table.bigInteger('assignment_id').unsigned().nullable();
      table.string('action', 30).notNullable(); // 'penambahan' | 'penghapusan' | 'perubahan'
      table.string('type', 20).notNullable().defaultTo('mapel'); // 'mapel' | 'ekskul'
      table.bigInteger('target_id').unsigned().nullable(); // subject_id or extracurricular_id
      table.string('target_name', 150).nullable();
      table.bigInteger('teacher_employee_id').unsigned().notNullable();
      table.string('teacher_name', 150).nullable();
      table.text('reason').notNullable();
      table.string('created_by', 100).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['satuan_pendidikan_id'], 'idx_stal_satuan');
      table.index(['academic_year_id'], 'idx_stal_academic_year');
      table.index(['teacher_employee_id'], 'idx_stal_teacher');
    });
  }

  // 4. Jadwal Pelajaran (Subject Schedules)
  const hasSubjectSchedules = await knex.schema.hasTable('subject_schedules');
  if (!hasSubjectSchedules) {
    await knex.schema.createTable('subject_schedules', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable()
        .references('id').inTable('academic_years').onDelete('CASCADE');
      table.string('schedule_type', 20).notNullable().defaultTo('mapel'); // 'mapel' | 'ekskul'
      table.bigInteger('subject_id').unsigned().nullable()
        .references('id').inTable('subjects').onDelete('CASCADE');
      table.bigInteger('extracurricular_id').unsigned().nullable()
        .references('id').inTable('extracurriculars').onDelete('CASCADE');
      table.bigInteger('teacher_employee_id').unsigned().nullable();
      table.tinyint('day_of_week').notNullable().defaultTo(1); // 1 = Senin ... 7 = Minggu
      table.string('start_time', 10).notNullable(); // e.g. "07:30"
      table.string('end_time', 10).notNullable();   // e.g. "09:00"
      table.string('period_label', 50).nullable(); // e.g. "Jam Ke 1-2"
      table.string('room_name', 100).nullable();
      table.boolean('is_combined_class').notNullable().defaultTo(false);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['satuan_pendidikan_id'], 'idx_ss_satuan');
      table.index(['academic_year_id'], 'idx_ss_academic_year');
      table.index(['day_of_week'], 'idx_ss_day');
      table.index(['teacher_employee_id'], 'idx_ss_teacher');
    });
  }

  // 5. Relasi Jadwal ke Rombel (Subject Schedule Class Groups - supports Combined Classes)
  const hasScheduleClassGroups = await knex.schema.hasTable('subject_schedule_class_groups');
  if (!hasScheduleClassGroups) {
    await knex.schema.createTable('subject_schedule_class_groups', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('schedule_id').unsigned().notNullable()
        .references('id').inTable('subject_schedules').onDelete('CASCADE');
      table.bigInteger('class_group_id').unsigned().notNullable()
        .references('id').inTable('class_groups').onDelete('CASCADE');

      table.unique(['schedule_id', 'class_group_id'], 'uq_schedule_class_group');
      table.index(['schedule_id'], 'idx_sscg_schedule');
      table.index(['class_group_id'], 'idx_sscg_class_group');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('subject_schedule_class_groups');
  await knex.schema.dropTableIfExists('subject_schedules');
  await knex.schema.dropTableIfExists('subject_teacher_assignment_logs');
  await knex.schema.dropTableIfExists('subject_teacher_assignments');
  const hasType = await knex.schema.hasColumn('class_groups', 'type');
  if (hasType) {
    await knex.schema.alterTable('class_groups', (table) => {
      table.dropColumn('extracurricular_id');
      table.dropColumn('type');
    });
  }
};
