/**
 * Migration: add_cashier_and_revision_to_sales_transactions
 * Modul Kantin - Menambahkan pencatatan nama kasir, status revisi, dan tabel riwayat revisi transaksi POS
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Tambahkan kolom cashier_name, is_revised, revision_count, last_revised_at, status ke sales_transactions
  const hasCashierName = await knex.schema.hasColumn('sales_transactions', 'cashier_name');
  if (!hasCashierName) {
    await knex.schema.alterTable('sales_transactions', function(table) {
      table.string('cashier_name', 150).nullable().after('cashier_id');
      table.boolean('is_revised').defaultTo(false);
      table.integer('revision_count').unsigned().defaultTo(0);
      table.timestamp('last_revised_at').nullable();
      table.enu('status', ['completed', 'revised', 'void']).defaultTo('completed');
    });
  }

  // 2. Buat tabel sales_transaction_revisions untuk audit log revisi transaksi POS
  const hasRevisionTable = await knex.schema.hasTable('sales_transaction_revisions');
  if (!hasRevisionTable) {
    await knex.schema.createTable('sales_transaction_revisions', function(table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('sales_transaction_id').unsigned().notNullable()
        .references('id').inTable('sales_transactions').onDelete('CASCADE');
      table.bigInteger('revised_by').unsigned().notNullable();
      table.string('revised_by_name', 150).nullable();
      table.text('revision_reason').notNullable();
      table.json('previous_data').notNullable();
      table.json('new_data').notNullable();
      table.timestamps(true, true);

      table.index('sales_transaction_id', 'idx_str_tx_id');
      table.index('school_unit_id', 'idx_str_school_unit');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sales_transaction_revisions');

  const hasCashierName = await knex.schema.hasColumn('sales_transactions', 'cashier_name');
  if (hasCashierName) {
    await knex.schema.alterTable('sales_transactions', function(table) {
      table.dropColumn('status');
      table.dropColumn('last_revised_at');
      table.dropColumn('revision_count');
      table.dropColumn('is_revised');
      table.dropColumn('cashier_name');
    });
  }
};
