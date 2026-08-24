/**
 * Migration: create_self_evaluations_table
 * Modul Manajemen - Fitur #195: Evaluasi Diri Sekolah (Evadir)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('self_evaluations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.specificType('period_year', 'SMALLINT UNSIGNED').notNullable();
    table.string('standard_component', 150).notNullable();
    table.decimal('score', 5, 2).nullable();
    table.text('notes').nullable();
    table.enum('status', ['draft', 'submitted', 'reviewed']).notNullable().defaultTo('draft');
    table.bigInteger('submitted_by').unsigned().nullable();
    table.timestamp('submitted_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_se_school_unit');
    table.index(['period_year'], 'idx_se_period_year');
    table.index(['status'], 'idx_se_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('self_evaluations');
};
