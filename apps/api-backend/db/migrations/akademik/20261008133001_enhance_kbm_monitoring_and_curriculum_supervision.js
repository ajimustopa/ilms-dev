/**
 * Migration: enhance_kbm_monitoring_and_curriculum_supervision
 * Modul Akademik - Peningkatan Skema Monitoring KBM, Supervisi Kurikulum Jurnal Mengajar, & Pengajuan Izin Santri
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah kolom supervisi kurikulum & status KBM pada teaching_journals
  const hasTeachingJournals = await knex.schema.hasTable('teaching_journals');
  if (hasTeachingJournals) {
    await knex.schema.alterTable('teaching_journals', (table) => {
      table.string('curriculum_status', 30).notNullable().defaultTo('unverified'); // 'unverified', 'verified', 'needs_revision'
      table.text('curriculum_notes').nullable();
      table.bigInteger('verified_by_user_id').unsigned().nullable();
      table.timestamp('verified_at').nullable();
      table.string('kbm_status', 30).notNullable().defaultTo('completed'); // 'completed', 'rescheduled', 'substitute'
      table.boolean('has_homework').notNullable().defaultTo(false);
      table.string('homework_title', 255).nullable();
      table.date('homework_deadline').nullable();

      table.index(['curriculum_status'], 'idx_tj_curriculum_status');
    });
  }

  // 2. Tambah kolom tanggal akhir & unit sekolah pada student_leave_requests
  const hasLeaveRequests = await knex.schema.hasTable('student_leave_requests');
  if (hasLeaveRequests) {
    await knex.schema.alterTable('student_leave_requests', (table) => {
      table.date('end_date').nullable();
      table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
      table.string('approval_stage', 50).nullable().defaultTo('kesiswaan');
      table.string('rejection_reason', 255).nullable();

      table.index(['satuan_pendidikan_id'], 'idx_leave_requests_unit');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTeachingJournals = await knex.schema.hasTable('teaching_journals');
  if (hasTeachingJournals) {
    await knex.schema.alterTable('teaching_journals', (table) => {
      table.dropIndex(['curriculum_status'], 'idx_tj_curriculum_status');
      table.dropColumn('curriculum_status');
      table.dropColumn('curriculum_notes');
      table.dropColumn('verified_by_user_id');
      table.dropColumn('verified_at');
      table.dropColumn('kbm_status');
      table.dropColumn('has_homework');
      table.dropColumn('homework_title');
      table.dropColumn('homework_deadline');
    });
  }

  const hasLeaveRequests = await knex.schema.hasTable('student_leave_requests');
  if (hasLeaveRequests) {
    await knex.schema.alterTable('student_leave_requests', (table) => {
      table.dropIndex(['satuan_pendidikan_id'], 'idx_leave_requests_unit');
      table.dropColumn('end_date');
      table.dropColumn('satuan_pendidikan_id');
      table.dropColumn('approval_stage');
      table.dropColumn('rejection_reason');
    });
  }
};
