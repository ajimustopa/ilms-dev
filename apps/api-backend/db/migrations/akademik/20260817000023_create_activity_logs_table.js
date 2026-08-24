/**
 * Migration: create_activity_logs_table
 * Modul Akademik - Fitur: Audit Log Aktivitas Modul Akademik (Append-Only)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('activity_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('action', 100).notNullable();
    table.json('data_before').nullable();
    table.json('data_after').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['satuan_pendidikan_id'], 'idx_activity_logs_satuan');
    table.index(['user_id'], 'idx_activity_logs_user');
    table.index(['action'], 'idx_activity_logs_action');
    table.index(['created_at'], 'idx_activity_logs_created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('activity_logs');
};
