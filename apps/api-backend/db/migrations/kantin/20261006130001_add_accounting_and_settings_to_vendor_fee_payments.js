/**
 * Migration: add_accounting_and_settings_to_vendor_fee_payments
 * Modul Kantin
 */
exports.up = async function(knex) {
  // 1. Buat tabel konfigurasi akuntansi penyerahan hak vendor jika belum ada
  const hasSettingsTable = await knex.schema.hasTable('canteen_vendor_fee_accounting_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('canteen_vendor_fee_accounting_settings', function(table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.boolean('auto_journal_enabled').notNullable().defaultTo(true);
      table.string('default_fund_source_name', 100).notNullable().defaultTo('Kantin Sekolah');
      table.bigInteger('default_cash_account_id').unsigned().nullable();
      table.bigInteger('default_bank_account_id').unsigned().nullable();
      table.bigInteger('debit_coa_id').unsigned().nullable();
      table.bigInteger('credit_coa_id').unsigned().nullable();
      table.bigInteger('default_bank_statement_id').unsigned().nullable();
      table.timestamps(true, true);

      table.unique(['school_unit_id'], 'uniq_cvfas_school_unit');
    });
  }

  // 2. Tambahkan kolom akuntansi pelengkap ke tabel vendor_fee_payments
  await knex.schema.alterTable('vendor_fee_payments', function(table) {
    table.string('cash_account_name', 255).nullable();
    table.bigInteger('debit_coa_id').unsigned().nullable();
    table.string('debit_coa_code', 50).nullable();
    table.string('debit_coa_name', 255).nullable();
    table.bigInteger('credit_coa_id').unsigned().nullable();
    table.string('credit_coa_code', 50).nullable();
    table.string('credit_coa_name', 255).nullable();
    table.string('fund_source_name', 255).nullable();
    table.bigInteger('journal_entry_id').unsigned().nullable();
    table.string('journal_number', 50).nullable();
  });
};

exports.down = async function(knex) {
  const hasSettingsTable = await knex.schema.hasTable('canteen_vendor_fee_accounting_settings');
  if (hasSettingsTable) {
    await knex.schema.dropTableIfExists('canteen_vendor_fee_accounting_settings');
  }

  const hasCol = await knex.schema.hasColumn('vendor_fee_payments', 'journal_number');
  if (hasCol) {
    await knex.schema.alterTable('vendor_fee_payments', function(table) {
      table.dropColumn('journal_number');
      table.dropColumn('journal_entry_id');
      table.dropColumn('fund_source_name');
      table.dropColumn('credit_coa_name');
      table.dropColumn('credit_coa_code');
      table.dropColumn('credit_coa_id');
      table.dropColumn('debit_coa_name');
      table.dropColumn('debit_coa_code');
      table.dropColumn('debit_coa_id');
      table.dropColumn('cash_account_name');
    });
  }
};
