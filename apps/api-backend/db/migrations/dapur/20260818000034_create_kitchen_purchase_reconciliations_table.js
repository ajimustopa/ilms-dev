/**
 * Migration: kitchen_purchase_reconciliations
 * Modul Dapur: Rekonsiliasi Belanja Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_purchase_reconciliations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('purchase_order_id').unsigned().notNullable();
    table.decimal('reconciled_amount', 14, 2).notNullable();
    table.decimal('discrepancy', 14, 2).nullable().defaultTo(0);
    table.text('discrepancy_reason').nullable();
    table.enum('status', ['open', 'closed']).defaultTo('open');
    table.timestamps(true, true);

    table.foreign('purchase_order_id').references('id').inTable('kitchen_purchase_orders').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_purchase_reconciliations');
};
