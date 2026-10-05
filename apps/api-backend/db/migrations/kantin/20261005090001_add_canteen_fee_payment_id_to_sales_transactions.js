/**
 * Migration: add_canteen_fee_payment_id_to_sales_transactions
 * Modul Kantin - Menambahkan referensi penyerahan dana hak kantin (canteen_fee_payment_id) ke transaksi penjualan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('sales_transactions', 'canteen_fee_payment_id');
  if (!hasCol) {
    await knex.schema.alterTable('sales_transactions', function(table) {
      table.bigInteger('canteen_fee_payment_id').unsigned().nullable()
        .references('id').inTable('canteen_fee_payments').onDelete('SET NULL');
      table.index('canteen_fee_payment_id', 'idx_st_fee_payment_id');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('sales_transactions', 'canteen_fee_payment_id');
  if (hasCol) {
    await knex.schema.alterTable('sales_transactions', function(table) {
      table.dropForeign('canteen_fee_payment_id');
      table.dropIndex('canteen_fee_payment_id', 'idx_st_fee_payment_id');
      table.dropColumn('canteen_fee_payment_id');
    });
  }
};
