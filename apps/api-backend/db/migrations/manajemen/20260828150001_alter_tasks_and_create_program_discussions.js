/**
 * Migration: 20260828150001_alter_tasks_and_create_program_discussions
 * Modul Manajemen - Integrasi Tugas/Aktivitas RKT & Ruang Diskusi Program
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. ALTER tasks (hanya menambah kolom yang belum ada)
  const hasTasks = await knex.schema.hasTable('tasks');
  if (hasTasks) {
    const hasDocLink = await knex.schema.hasColumn('tasks', 'document_link');
    const hasNotes = await knex.schema.hasColumn('tasks', 'notes');
    const hasWpaId = await knex.schema.hasColumn('tasks', 'work_plan_activity_id');

    await knex.schema.alterTable('tasks', (table) => {
      if (!hasDocLink) table.string('document_link', 255).nullable();
      if (!hasNotes) table.text('notes').nullable();
      if (!hasWpaId) {
        table.bigInteger('work_plan_activity_id').unsigned().nullable();
        table.foreign('work_plan_activity_id', 'fk_tasks_wpa')
          .references('id')
          .inTable('work_plan_activities')
          .onDelete('SET NULL');
        table.index(['work_plan_activity_id'], 'idx_tasks_wpa');
      }
    });
  }

  // 2. CREATE program_discussions
  const hasDiscussions = await knex.schema.hasTable('program_discussions');
  if (!hasDiscussions) {
    await knex.schema.createTable('program_discussions', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('rips_program_id').unsigned().notNullable();
      table.bigInteger('author_user_id').unsigned().notNullable();
      table.text('message').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.foreign('rips_program_id', 'fk_pd_program')
        .references('id')
        .inTable('rips_programs')
        .onDelete('CASCADE');

      table.index(['rips_program_id'], 'idx_pd_program');
      table.index(['author_user_id'], 'idx_pd_author');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('program_discussions');
  const hasTasks = await knex.schema.hasTable('tasks');
  if (hasTasks) {
    const hasWpaId = await knex.schema.hasColumn('tasks', 'work_plan_activity_id');
    const hasNotes = await knex.schema.hasColumn('tasks', 'notes');
    const hasDocLink = await knex.schema.hasColumn('tasks', 'document_link');

    await knex.schema.alterTable('tasks', (table) => {
      if (hasWpaId) {
        table.dropForeign(['work_plan_activity_id'], 'fk_tasks_wpa');
        table.dropColumn('work_plan_activity_id');
      }
      if (hasNotes) table.dropColumn('notes');
      if (hasDocLink) table.dropColumn('document_link');
    });
  }
};
