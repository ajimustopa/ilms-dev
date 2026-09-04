/**
 * Migration: alter_transaction_account_mappings_rules
 * Modul Keuangan - Fitur Aturan Transaksi & Proteksi Aturan Bawaan Sistem
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasIsSystem = await knex.schema.hasColumn('transaction_account_mappings', 'is_system');
  if (!hasIsSystem) {
    await knex.schema.table('transaction_account_mappings', (table) => {
      table.boolean('is_system').notNullable().defaultTo(false).after('credit_account_id');
    });
  }

  const hasDefaultCash = await knex.schema.hasColumn('transaction_account_mappings', 'default_cash_account_id');
  if (!hasDefaultCash) {
    await knex.schema.table('transaction_account_mappings', (table) => {
      table.bigInteger('default_cash_account_id').unsigned().nullable().after('is_system')
        .references('id').inTable('cash_accounts')
        .onDelete('SET NULL').onUpdate('CASCADE')
        .withKeyName('fk_tam_cash_acc');
    });
  }

  const hasFeeType = await knex.schema.hasColumn('transaction_account_mappings', 'related_fee_type_id');
  if (!hasFeeType) {
    await knex.schema.table('transaction_account_mappings', (table) => {
      table.bigInteger('related_fee_type_id').unsigned().nullable().after('default_cash_account_id')
        .references('id').inTable('fee_types')
        .onDelete('SET NULL').onUpdate('CASCADE')
        .withKeyName('fk_tam_fee_type');
    });
  }

  const hasTxCat = await knex.schema.hasColumn('transaction_account_mappings', 'related_transaction_category_id');
  if (!hasTxCat) {
    await knex.schema.table('transaction_account_mappings', (table) => {
      table.bigInteger('related_transaction_category_id').unsigned().nullable().after('related_fee_type_id')
        .references('id').inTable('transaction_categories')
        .onDelete('SET NULL').onUpdate('CASCADE')
        .withKeyName('fk_tam_tx_cat');
    });
  }

  const hasIsActive = await knex.schema.hasColumn('transaction_account_mappings', 'is_active');
  if (!hasIsActive) {
    await knex.schema.table('transaction_account_mappings', (table) => {
      table.boolean('is_active').notNullable().defaultTo(true).after('related_transaction_category_id');
    });
  }

  // Tandai 5 aturan bawaan sistem sebagai is_system = true
  await knex('transaction_account_mappings')
    .whereIn('transaction_code', [
      'student_bill_payment',
      'expense',
      'other_income',
      'payroll_disbursement',
      'opening_balance_entry'
    ])
    .update({ is_system: true, is_active: true });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasIsSystem = await knex.schema.hasColumn('transaction_account_mappings', 'is_system');
  if (hasIsSystem) {
    await knex.schema.table('transaction_account_mappings', (table) => {
      table.dropForeign(['default_cash_account_id'], 'fk_tam_cash_acc');
      table.dropForeign(['related_fee_type_id'], 'fk_tam_fee_type');
      table.dropForeign(['related_transaction_category_id'], 'fk_tam_tx_cat');
      table.dropColumn([
        'is_system',
        'default_cash_account_id',
        'related_fee_type_id',
        'related_transaction_category_id',
        'is_active'
      ]);
    });
  }
};
