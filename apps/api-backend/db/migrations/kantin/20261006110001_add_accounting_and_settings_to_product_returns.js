/**
 * Migration: add_accounting_and_settings_to_product_returns
 * Modul Kantin - Menambahkan konfigurasi default akuntansi Retur Barang dan kolom pencatatan jurnal akuntansi otomatis pada product_returns
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambahkan kolom akuntansi di product_returns
  const hasReturnsTable = await knex.schema.hasTable('product_returns');
  if (hasReturnsTable) {
    const hasTotalCost = await knex.schema.hasColumn('product_returns', 'total_cost_amount');
    if (!hasTotalCost) {
      await knex.schema.alterTable('product_returns', function (table) {
        table.decimal('total_cost_amount', 15, 2).defaultTo(0);
        table.string('settlement_type', 50).defaultTo('consignment_reduction');
        table.bigInteger('cash_account_id').unsigned().nullable().index();
        table.string('cash_account_name', 150).nullable();
        table.bigInteger('debit_coa_id').unsigned().nullable();
        table.string('debit_coa_code', 50).nullable();
        table.string('debit_coa_name', 150).nullable();
        table.bigInteger('credit_coa_id').unsigned().nullable();
        table.string('credit_coa_code', 50).nullable();
        table.string('credit_coa_name', 150).nullable();
        table.string('fund_source_name', 150).nullable();
        table.bigInteger('bank_statement_id').unsigned().nullable().index();
        table.bigInteger('journal_entry_id').unsigned().nullable().index();
        table.string('journal_number', 50).nullable();
      });
    }
  }

  // 2. Buat tabel canteen_returns_accounting_settings
  const hasSettingsTable = await knex.schema.hasTable('canteen_returns_accounting_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('canteen_returns_accounting_settings', function (table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.unique('school_unit_id', 'uniq_cras_school_unit');
      table.bigInteger('cash_account_id_tunai').unsigned().nullable();
      table.string('cash_account_name_tunai', 150).nullable();
      table.bigInteger('cash_account_id_bank').unsigned().nullable();
      table.string('cash_account_name_bank', 150).nullable();

      // Akun Hutang Konsinyasi Vendor (20102 / 40501)
      table.bigInteger('consignment_payable_coa_id').unsigned().nullable();
      table.string('consignment_payable_coa_code', 50).nullable();
      table.string('consignment_payable_coa_name', 150).nullable();

      // Akun Persediaan Konsinyasi Titipan (10302)
      table.bigInteger('consignment_inventory_coa_id').unsigned().nullable();
      table.string('consignment_inventory_coa_code', 50).nullable();
      table.string('consignment_inventory_coa_name', 150).nullable();

      // Akun Hutang Usaha Dagang Tempo (20100)
      table.bigInteger('trade_payable_coa_id').unsigned().nullable();
      table.string('trade_payable_coa_code', 50).nullable();
      table.string('trade_payable_coa_name', 150).nullable();

      // Akun Persediaan Barang Dagangan Beli Putus (10301)
      table.bigInteger('inventory_coa_id').unsigned().nullable();
      table.string('inventory_coa_code', 50).nullable();
      table.string('inventory_coa_name', 150).nullable();

      // Akun Beban Kerusakan / Pemusnahan Barang (50102 / 50200)
      table.bigInteger('loss_expense_coa_id').unsigned().nullable();
      table.string('loss_expense_coa_code', 50).nullable();
      table.string('loss_expense_coa_name', 150).nullable();

      // Kas Tunai & Bank
      table.bigInteger('cash_coa_id').unsigned().nullable();
      table.string('cash_coa_code', 50).nullable();
      table.string('cash_coa_name', 150).nullable();
      table.bigInteger('bank_coa_id').unsigned().nullable();
      table.string('bank_coa_code', 50).nullable();
      table.string('bank_coa_name', 150).nullable();

      table.string('fund_source_name', 150).defaultTo('Pos Pengembalian & Penyesuaian Stok SBU Kantin');
      table.boolean('auto_journal').defaultTo(true);
      table.timestamps(true, true);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasSettingsTable = await knex.schema.hasTable('canteen_returns_accounting_settings');
  if (hasSettingsTable) {
    await knex.schema.dropTable('canteen_returns_accounting_settings');
  }

  const hasReturnsTable = await knex.schema.hasTable('product_returns');
  if (hasReturnsTable) {
    await knex.schema.alterTable('product_returns', function (table) {
      table.dropColumn('total_cost_amount');
      table.dropColumn('settlement_type');
      table.dropColumn('cash_account_id');
      table.dropColumn('cash_account_name');
      table.dropColumn('debit_coa_id');
      table.dropColumn('debit_coa_code');
      table.dropColumn('debit_coa_name');
      table.dropColumn('credit_coa_id');
      table.dropColumn('credit_coa_code');
      table.dropColumn('credit_coa_name');
      table.dropColumn('fund_source_name');
      table.dropColumn('bank_statement_id');
      table.dropColumn('journal_entry_id');
      table.dropColumn('journal_number');
    });
  }
};
