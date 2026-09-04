/**
 * Migration: add_payment_account_mapping_id_to_fee_types
 * Modul Keuangan - Menambahkan kolom payment_account_mapping_id pada fee_types untuk aturan transaksi pembayaran
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('fee_types', 'payment_account_mapping_id');
  if (!hasColumn) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.bigInteger('payment_account_mapping_id').unsigned().nullable().after('related_revenue_account_id')
        .references('id').inTable('transaction_account_mappings')
        .onDelete('SET NULL').onUpdate('CASCADE');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('fee_types', 'payment_account_mapping_id');
  if (hasColumn) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.dropForeign(['payment_account_mapping_id']);
      table.dropColumn('payment_account_mapping_id');
    });
  }
};
