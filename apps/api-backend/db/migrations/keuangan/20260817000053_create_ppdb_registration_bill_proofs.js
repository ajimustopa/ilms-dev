/**
 * Migration 53: Create PPDB Registration Bill Proofs Table
 * Modul: Keuangan (ppdb-billing)
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_bill_proofs');
  if (!hasTable) {
    await knex.schema.createTable('ppdb_registration_bill_proofs', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('ppdb_registration_bill_id').unsigned().notNullable();
      table.string('proof_file_url', 255).notNullable();
      table.decimal('transfer_amount', 18, 2).notNullable();
      table.date('transfer_date').notNullable();
      table.string('bank_name', 100).nullable();
      table.string('sender_account_name', 150).nullable();
      table.bigInteger('target_cash_account_id').unsigned().nullable();
      table.enum('status', ['pending', 'verified', 'rejected']).notNullable().defaultTo('pending');
      table.bigInteger('verified_by').unsigned().nullable();
      table.timestamp('verified_at').nullable();
      table.text('rejection_reason').nullable();
      table.timestamps(true, true);

      // Foreign Keys & Indexes
      table.foreign('ppdb_registration_bill_id')
        .references('id')
        .inTable('ppdb_registration_bills')
        .onDelete('CASCADE');

      table.index(['ppdb_registration_bill_id'], 'idx_ppdb_proofs_bill');
      table.index(['status'], 'idx_ppdb_proofs_status');
      table.index(['target_cash_account_id'], 'idx_ppdb_proofs_target_cash');
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ppdb_registration_bill_proofs');
};
