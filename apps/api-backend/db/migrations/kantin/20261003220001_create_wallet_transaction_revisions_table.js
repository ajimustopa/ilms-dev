/**
 * Migration: create_wallet_transaction_revisions_table
 * Modul Kantin - Menyimpan catatan riwayat revisi dan jejak audit transaksi dompet santri
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('wallet_transaction_revisions');
  if (!hasTable) {
    await knex.schema.createTable('wallet_transaction_revisions', function(table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('wallet_transaction_id').unsigned().notNullable()
        .references('id').inTable('wallet_transactions').onDelete('CASCADE');
      table.bigInteger('revised_by').unsigned().notNullable();
      table.string('revised_by_name', 100).nullable();
      table.text('revision_reason').notNullable();
      table.json('previous_data').notNullable();
      table.json('new_data').notNullable();
      table.timestamps(true, true);

      table.index('wallet_transaction_id', 'idx_wtr_tx_id');
      table.index('school_unit_id', 'idx_wtr_school_unit');
    });
  }

  const hasIsRevised = await knex.schema.hasColumn('wallet_transactions', 'is_revised');
  if (!hasIsRevised) {
    await knex.schema.alterTable('wallet_transactions', function(table) {
      table.boolean('is_revised').defaultTo(false);
      table.integer('revision_count').unsigned().defaultTo(0);
      table.timestamp('last_revised_at').nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasIsRevised = await knex.schema.hasColumn('wallet_transactions', 'is_revised');
  if (hasIsRevised) {
    await knex.schema.alterTable('wallet_transactions', function(table) {
      table.dropColumn('last_revised_at');
      table.dropColumn('revision_count');
      table.dropColumn('is_revised');
    });
  }

  await knex.schema.dropTableIfExists('wallet_transaction_revisions');
};
