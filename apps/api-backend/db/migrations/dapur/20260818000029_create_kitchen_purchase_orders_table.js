/**
 * Migration: kitchen_purchase_orders
 * Modul Dapur: Purchase Order (PO) & Rencana Pembelian
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_purchase_orders', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('po_number', 50).nullable().unique();
    table.bigInteger('purchase_request_id').unsigned().nullable();
    table.bigInteger('supplier_id').unsigned().notNullable();
    table.date('po_date').notNullable();
    table.date('planned_date').nullable();
    table.decimal('total_amount', 14, 2).defaultTo(0);
    table.enum('status', ['draft', 'sent', 'partially_received', 'completed', 'cancelled']).defaultTo('draft');
    table.string('document_url', 255).nullable();
    table.timestamps(true, true);

    table.foreign('purchase_request_id').references('id').inTable('kitchen_purchase_requests').onDelete('SET NULL');
    table.foreign('supplier_id').references('id').inTable('kitchen_suppliers').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_purchase_orders');
};
