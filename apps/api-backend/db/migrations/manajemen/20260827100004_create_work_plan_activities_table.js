/**
 * Migration: create_work_plan_activities_table
 * Modul Manajemen - Fitur 4: Rencana Operasional (Renop) - Kegiatan & Subkegiatan
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('work_plan_activities');
  if (!hasTable) {
    await knex.schema.createTable('work_plan_activities', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('work_plan_program_id').unsigned().notNullable();
      table.bigInteger('parent_activity_id').unsigned().nullable();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.string('code', 50).notNullable();
      table.string('name', 250).notNullable();
      table.text('description').nullable();
      table.text('output').nullable();
      table.string('target_output', 100).nullable();
      table.string('unit', 50).nullable(); // e.g. "Dokumen", "Peserta", "Unit", "Paket"
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.bigInteger('pic_employee_id').unsigned().nullable();
      table.string('unit_name', 150).nullable();
      table.string('budget_reference', 100).nullable();
      table.string('budget_account_code', 50).nullable();
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0.00);
      table.enum('status', ['planned', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('planned');
      table.string('document_url', 255).nullable();
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('work_plan_program_id', 'fk_wpa_program')
        .references('id')
        .inTable('work_plan_programs')
        .onDelete('CASCADE');

      table.foreign('parent_activity_id', 'fk_wpa_parent')
        .references('id')
        .inTable('work_plan_activities')
        .onDelete('SET NULL');

      table.index(['work_plan_program_id'], 'idx_wpa_program');
      table.index(['parent_activity_id'], 'idx_wpa_parent');
      table.index(['school_unit_id'], 'idx_wpa_unit');
      table.index(['pic_employee_id'], 'idx_wpa_pic');
      table.index(['status'], 'idx_wpa_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('work_plan_activities');
};
