/**
 * Migration: add_accounting_and_settings_to_canteen_fee_payments
 * Modul Kantin
 */
exports.up = async function(knex) {
  // 1. Buat tabel konfigurasi akuntansi setor hak kantin jika belum ada
  const hasSettingsTable = await knex.schema.hasTable('canteen_fee_accounting_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('canteen_fee_accounting_settings', function(table) {
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

      table.unique(['school_unit_id'], 'uniq_cfas_school_unit');
    });
  }

  // 2. Tambahkan kolom akuntansi ke tabel canteen_fee_payments jika belum ada
  await knex.schema.alterTable('canteen_fee_payments', function(table) {
    table.bigInteger('cash_account_id').unsigned().nullable();
    table.string('cash_account_name', 255).nullable();
    table.bigInteger('debit_coa_id').unsigned().nullable();
    table.string('debit_coa_code', 50).nullable();
    table.string('debit_coa_name', 255).nullable();
    table.bigInteger('credit_coa_id').unsigned().nullable();
    table.string('credit_coa_code', 50).nullable();
    table.string('credit_coa_name', 255).nullable();
    table.string('fund_source_name', 255).nullable();
    table.bigInteger('bank_statement_id').unsigned().nullable();
    table.text('notes').nullable();
  });
};

exports.down = async function(knex) {
  const hasSettingsTable = await knex.schema.hasTable('canteen_fee_accounting_settings');
  if (hasSettingsTable) {
    await knex.schema.dropTableIfExists('canteen_fee_accounting_settings');
  }

  const hasCol = await knex.schema.hasColumn('canteen_fee_payments', 'cash_account_id');
  if (hasCol) {
    await knex.schema.alterTable('canteen_fee_payments', function(table) {
      table.dropColumn('notes');
      table.dropColumn('bank_statement_id');
      table.dropColumn('fund_source_name');
      table.dropColumn('credit_coa_name');
      table.dropColumn('credit_coa_code');
      table.dropColumn('credit_coa_id');
      table.dropColumn('debit_coa_name');
      table.dropColumn('debit_coa_code');
      table.dropColumn('debit_coa_id');
      table.dropColumn('cash_account_name');
      table.dropColumn('cash_account_id');
    });
  }
};
