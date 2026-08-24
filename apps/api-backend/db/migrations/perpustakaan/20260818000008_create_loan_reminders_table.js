/**
 * Migration: loan_reminders (Append-Only)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('loan_reminders', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('loan_id').unsigned().notNullable()
      .references('id').inTable('book_loans').onDelete('CASCADE');
    table.bigInteger('member_id').unsigned().notNullable()
      .references('id').inTable('library_members').onDelete('CASCADE');
    table.enum('reminder_type', ['due_soon', 'overdue', 'fine_unpaid']).notNullable();
    table.string('channel', 50).nullable();
    table.enum('status', ['queued', 'sent', 'failed']).notNullable().defaultTo('queued');
    table.timestamp('sent_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('loan_reminders');
};
