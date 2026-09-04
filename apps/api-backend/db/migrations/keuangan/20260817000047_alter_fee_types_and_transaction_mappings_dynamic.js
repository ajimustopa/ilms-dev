/**
 * Migration: alter_fee_types_and_transaction_mappings_dynamic
 * Modul Keuangan - Menambahkan relasi revenue account pada fee_types,
 * dynamic flag pada transaction_account_mappings, status written_off pada student_bills,
 * dan source_type pendukung pada journal_entries.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah related_revenue_account_id pada fee_types
  const hasFeeTypeCol = await knex.schema.hasColumn('fee_types', 'related_revenue_account_id');
  if (!hasFeeTypeCol) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.bigInteger('related_revenue_account_id').unsigned().nullable();
    });
  }

  // 2. Tambah is_dynamic_account & linked_feature_note pada transaction_account_mappings
  // Serta buat debit_account_id & credit_account_id nullable
  const hasDynCol = await knex.schema.hasColumn('transaction_account_mappings', 'is_dynamic_account');
  if (!hasDynCol) {
    await knex.schema.alterTable('transaction_account_mappings', (table) => {
      table.boolean('is_dynamic_account').notNullable().defaultTo(false);
      table.string('linked_feature_note', 255).nullable();
    });
  }

  // Ubah kolom debit_account_id dan credit_account_id agar NULLABLE
  await knex.raw(`
    ALTER TABLE transaction_account_mappings 
    MODIFY COLUMN debit_account_id BIGINT UNSIGNED NULL,
    MODIFY COLUMN credit_account_id BIGINT UNSIGNED NULL
  `);

  // 3. Tambah status 'written_off' pada student_bills
  await knex.raw(`
    ALTER TABLE student_bills 
    MODIFY COLUMN status ENUM('draft', 'unpaid', 'partially_paid', 'paid', 'cancelled', 'written_off') NOT NULL DEFAULT 'draft'
  `);

  // 4. Perluas ENUM source_type pada journal_entries
  await knex.raw(`
    ALTER TABLE journal_entries 
    MODIFY COLUMN source_type VARCHAR(50) NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.alterTable('fee_types', (table) => {
      table.dropColumn('related_revenue_account_id');
    });
  } catch (e) {}

  try {
    await knex.schema.alterTable('transaction_account_mappings', (table) => {
      table.dropColumn('is_dynamic_account');
      table.dropColumn('linked_feature_note');
    });
  } catch (e) {}
};
