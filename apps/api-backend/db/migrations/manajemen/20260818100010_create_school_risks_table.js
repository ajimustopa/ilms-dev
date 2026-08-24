/**
 * Migration: create_school_risks_table
 * Modul Manajemen - Fitur #202: Manajemen Risiko & Isu Sekolah
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('school_risks', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('title', 200).notNullable();
    table.string('category', 100).nullable();
    table.text('description').nullable();
    table.enum('likelihood', ['low', 'medium', 'high']).nullable();
    table.enum('impact', ['low', 'medium', 'high']).nullable();
    table.enum('status', ['identified', 'mitigating', 'resolved', 'closed']).notNullable().defaultTo('identified');
    table.text('mitigation_plan').nullable();
    table.bigInteger('owner_employee_id').unsigned().nullable();
    table.date('identified_at').notNullable();
    table.date('resolved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_sr_school_unit');
    table.index(['status'], 'idx_sr_status');
    table.index(['owner_employee_id'], 'idx_sr_owner_employee');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('school_risks');
};
