/**
 * Migration: create_consultation_ticket_replies_table
 * Modul Website Utama - Fitur #29: Balasan Tiket Konsultasi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('consultation_ticket_replies', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('ticket_id').unsigned().notNullable()
      .references('id').inTable('consultation_tickets').onDelete('CASCADE');
    table.bigInteger('replied_by').unsigned().notNullable();
    table.text('content').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['ticket_id'], 'idx_ticket_replies_ticket');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('consultation_ticket_replies');
};
