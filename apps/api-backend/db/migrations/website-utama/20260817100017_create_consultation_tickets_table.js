/**
 * Migration: create_consultation_tickets_table
 * Modul Website Utama - Fitur #29: Tiket Konsultasi Publik
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('consultation_tickets', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('contact', 100).notNullable();
    table.string('subject', 200).notNullable();
    table.text('content').notNullable();
    table.enu('status', ['open', 'closed']).notNullable().defaultTo('open');
    table.bigInteger('assigned_to').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'status'], 'idx_tickets_school_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('consultation_tickets');
};
