/**
 * Migration: kitchen_audit_trails (Append-Only)
 * Modul Dapur: Audit Trail Perubahan Data & Aktivitas Pengguna Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_audit_trails', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('actor_id').unsigned().nullable(); // core_user_id
    table.string('action', 100).notNullable(); // create, update, delete, approve, cancel, adjust
    table.string('entity_type', 100).notNullable(); // table or domain name
    table.bigInteger('entity_id').unsigned().nullable();
    table.json('data_before').nullable();
    table.json('data_after').nullable();
    table.timestamp('occurred_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now()); // append-only, no updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_audit_trails');
};
