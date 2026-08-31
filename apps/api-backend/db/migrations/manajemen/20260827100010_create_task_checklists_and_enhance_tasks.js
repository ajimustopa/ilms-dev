/**
 * Migration: create_task_checklists_and_enhance_tasks
 * Modul Manajemen - Fitur 10: Task Hub Terintegrasi & Checklists
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasProgress = await knex.schema.hasColumn('tasks', 'progress_percent');
  if (!hasProgress) {
    await knex.schema.alterTable('tasks', (table) => {
      table.date('start_date').nullable().after('due_date');
      table.integer('progress_percent').notNullable().defaultTo(0).after('start_date');
      table.timestamp('completed_at').nullable().after('progress_percent');
      table.string('relation_code', 50).nullable().after('reference_id');
      table.string('relation_name', 255).nullable().after('relation_code');
    });
  }

  const hasChecklists = await knex.schema.hasTable('task_checklists');
  if (!hasChecklists) {
    await knex.schema.createTable('task_checklists', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('task_id').unsigned().notNullable();
      table.string('title', 255).notNullable();
      table.boolean('is_completed').notNullable().defaultTo(false);
      table.timestamp('completed_at').nullable();
      table.bigInteger('completed_by').unsigned().nullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('task_id', 'fk_tc_checklist_task')
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE');

      table.index(['task_id'], 'idx_tcl_task');
      table.index(['is_completed'], 'idx_tcl_completed');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('task_checklists');

  const hasProgress = await knex.schema.hasColumn('tasks', 'progress_percent');
  if (hasProgress) {
    await knex.schema.alterTable('tasks', (table) => {
      table.dropColumn('start_date');
      table.dropColumn('progress_percent');
      table.dropColumn('completed_at');
      table.dropColumn('relation_code');
      table.dropColumn('relation_name');
    });
  }
};
