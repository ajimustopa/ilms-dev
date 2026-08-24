/**
 * Migration: create_ppdb_status_logs_table
 * Modul Website Utama - Fitur #28: Log Riwayat Status PPDB (Append-Only)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ppdb_status_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('registrant_id').unsigned().notNullable()
      .references('id').inTable('ppdb_registrants').onDelete('CASCADE');
    table.string('status', 50).notNullable();
    table.text('note').nullable();
    table.bigInteger('changed_by').unsigned().nullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    table.index(['registrant_id', 'occurred_at'], 'idx_ppdb_logs_reg_occ');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ppdb_status_logs');
};
