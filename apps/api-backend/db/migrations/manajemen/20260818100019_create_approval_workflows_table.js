/**
 * Migration: create_approval_workflows_table
 * Modul Manajemen - Fitur #200: Definisi Alur Persetujuan (Approval Workflows)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('approval_workflows', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.string('name', 150).notNullable();
    table.string('applies_to', 50).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_aw_school_unit');
    table.index(['applies_to'], 'idx_aw_applies_to');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('approval_workflows');
};
