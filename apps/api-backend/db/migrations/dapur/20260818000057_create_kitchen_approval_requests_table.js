/**
 * Migration: kitchen_approval_requests
 * Modul Dapur: Sistem Approval Bertingkat Dokumen Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_approval_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('document_type', 100).notNullable(); // menu, recipe, purchase_request, purchase_order, budget, opname
    table.bigInteger('document_ref_id').unsigned().notNullable();
    table.bigInteger('requested_by').unsigned().notNullable();
    table.bigInteger('approver_id').unsigned().nullable();
    table.smallint('level').defaultTo(1);
    table.enum('status', ['pending', 'approved', 'rejected', 'revised']).defaultTo('pending');
    table.text('notes').nullable();
    table.timestamp('decided_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_approval_requests');
};
