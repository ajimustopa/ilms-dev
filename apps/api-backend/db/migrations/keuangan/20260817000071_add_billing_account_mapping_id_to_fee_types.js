/**
 * Migration: add_billing_account_mapping_id_to_fee_types
 * Modul Keuangan - Menambahkan kolom billing_account_mapping_id pada fee_types untuk aturan transaksi penagihan / penerbitan piutang
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('fee_types', 'billing_account_mapping_id');
  if (!hasCol) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.bigInteger('billing_account_mapping_id').unsigned().nullable().after('related_revenue_account_id')
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
  const hasCol = await knex.schema.hasColumn('fee_types', 'billing_account_mapping_id');
  if (hasCol) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.dropForeign(['billing_account_mapping_id']);
      table.dropColumn('billing_account_mapping_id');
    });
  }
};
