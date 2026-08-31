/**
 * Migration: 20260828140001_create_annual_work_plan_tables
 * Modul Manajemen - Fitur Rencana Kerja Tahunan (RKT), Aktivitas/Langkah Kegiatan, dan Kepanitiaan Program
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. annual_work_plans
  const hasAwp = await knex.schema.hasTable('annual_work_plans');
  if (!hasAwp) {
    await knex.schema.createTable('annual_work_plans', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.string('academic_year', 20).notNullable(); // e.g. "2026/2027"
      table.string('title', 200).notNullable();
      table.bigInteger('parent_rkjm_id').unsigned().nullable();
      table.integer('current_version').unsigned().notNullable().defaultTo(1);
      table.enum('status', ['draft', 'published', 'archived']).notNullable().defaultTo('draft');
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('parent_rkjm_id', 'fk_awp_rkjm')
        .references('id')
        .inTable('long_term_work_plans')
        .onDelete('SET NULL');

      table.unique(['school_unit_id', 'academic_year'], 'uq_awp_unit_year');
      table.index(['school_unit_id'], 'idx_awp_unit');
      table.index(['academic_year'], 'idx_awp_year');
      table.index(['status'], 'idx_awp_status');
    });
  }

  // 2. work_plan_activities (dibuat ulang dengan skema baru)
  const hasActivities = await knex.schema.hasTable('work_plan_activities');
  if (!hasActivities) {
    await knex.schema.createTable('work_plan_activities', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('annual_work_plan_id').unsigned().notNullable();
      table.bigInteger('rips_program_id').unsigned().notNullable();
      table.bigInteger('parent_activity_id').unsigned().nullable();
      table.string('title', 255).notNullable();
      table.enum('tag', [
        'dokumen',
        'rapat',
        'pengadaan',
        'koordinasi',
        'sosialisasi',
        'kegiatan_utama',
        'dokumentasi',
        'lainnya'
      ]).notNullable().defaultTo('lainnya');
      table.date('activity_date').nullable();
      table.bigInteger('assignee_employee_id').unsigned().nullable();
      table.string('document_link', 255).nullable();
      table.enum('status', ['planned', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('planned');
      table.tinyint('progress_percent', 3).unsigned().notNullable().defaultTo(0);
      table.text('notes').nullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('annual_work_plan_id', 'fk_wpa_awp')
        .references('id')
        .inTable('annual_work_plans')
        .onDelete('CASCADE');

      table.foreign('rips_program_id', 'fk_wpa_program')
        .references('id')
        .inTable('rips_programs')
        .onDelete('CASCADE');

      table.foreign('parent_activity_id', 'fk_wpa_parent')
        .references('id')
        .inTable('work_plan_activities')
        .onDelete('CASCADE');

      table.index(['annual_work_plan_id', 'rips_program_id'], 'idx_wpa_awp_prog');
      table.index(['tag'], 'idx_wpa_tag');
      table.index(['status'], 'idx_wpa_status');
      table.index(['order_index'], 'idx_wpa_order');
    });
  }

  // 3. program_committees
  const hasCommittees = await knex.schema.hasTable('program_committees');
  if (!hasCommittees) {
    await knex.schema.createTable('program_committees', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('annual_work_plan_id').unsigned().notNullable();
      table.bigInteger('rips_program_id').unsigned().notNullable();
      table.string('sk_number', 100).nullable();
      table.date('sk_date').nullable();
      table.string('sk_file_url', 255).nullable();
      table.enum('status', ['draft', 'disahkan']).notNullable().defaultTo('draft');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('annual_work_plan_id', 'fk_pcomm_awp')
        .references('id')
        .inTable('annual_work_plans')
        .onDelete('CASCADE');

      table.foreign('rips_program_id', 'fk_pcomm_prog')
        .references('id')
        .inTable('rips_programs')
        .onDelete('CASCADE');

      table.unique(['annual_work_plan_id', 'rips_program_id'], 'uq_pcomm_awp_prog');
      table.index(['status'], 'idx_pcomm_status');
    });
  }

  // 4. program_committee_members
  const hasMembers = await knex.schema.hasTable('program_committee_members');
  if (!hasMembers) {
    await knex.schema.createTable('program_committee_members', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('program_committee_id').unsigned().notNullable();
      table.bigInteger('committee_position_type_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('program_committee_id', 'fk_pcm_committee')
        .references('id')
        .inTable('program_committees')
        .onDelete('CASCADE');

      table.foreign('committee_position_type_id', 'fk_pcm_postype')
        .references('id')
        .inTable('committee_position_types')
        .onDelete('RESTRICT');

      table.index(['program_committee_id'], 'idx_pcm_committee');
      table.index(['employee_id'], 'idx_pcm_employee');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('program_committee_members');
  await knex.schema.dropTableIfExists('program_committees');
  await knex.schema.dropTableIfExists('work_plan_activities');
  await knex.schema.dropTableIfExists('annual_work_plans');
};
