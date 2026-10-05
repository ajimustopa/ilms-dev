/**
 * Migration: add_accounting_and_settings_to_goods_receipts
 * Modul Kantin - Menambahkan konfigurasi default akuntansi Penerimaan Barang (Titipan & Beli Putus) dan kolom pencatatan jurnal akuntansi otomatis pada goods_receipts
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambahkan kolom akuntansi di goods_receipts
  const hasReceiptsTable = await knex.schema.hasTable('goods_receipts');
  if (hasReceiptsTable) {
    await knex.schema.alterTable('goods_receipts', function (table) {
      table.decimal('total_cost_amount', 15, 2).defaultTo(0);
      table.string('payment_method', 50).defaultTo('consignment');
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
      table.text('notes').nullable();
    });
  }

  // 2. Buat tabel canteen_goods_receipts_accounting_settings untuk konfigurasi default akuntansi
  const hasSettingsTable = await knex.schema.hasTable('canteen_goods_receipts_accounting_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('canteen_goods_receipts_accounting_settings', function (table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable().unique();
      table.bigInteger('cash_account_id_tunai').unsigned().nullable();
      table.string('cash_account_name_tunai', 150).nullable();
      table.bigInteger('cash_account_id_bank').unsigned().nullable();
      table.string('cash_account_name_bank', 150).nullable();
      
      // COA Persediaan Barang Dagangan / Bahan (Beli Putus)
      table.bigInteger('inventory_coa_id').unsigned().nullable();
      table.string('inventory_coa_code', 50).nullable();
      table.string('inventory_coa_name', 150).nullable();

      // COA Persediaan Konsinyasi Titipan
      table.bigInteger('consignment_inventory_coa_id').unsigned().nullable();
      table.string('consignment_inventory_coa_code', 50).nullable();
      table.string('consignment_inventory_coa_name', 150).nullable();

      // COA Hutang Konsinyasi Vendor
      table.bigInteger('consignment_payable_coa_id').unsigned().nullable();
      table.string('consignment_payable_coa_code', 50).nullable();
      table.string('consignment_payable_coa_name', 150).nullable();

      // COA Hutang Dagang Tempo (Beli Putus Tempo)
      table.bigInteger('trade_payable_coa_id').unsigned().nullable();
      table.string('trade_payable_coa_code', 50).nullable();
      table.string('trade_payable_coa_name', 150).nullable();

      // COA Kas Tunai & Bank
      table.bigInteger('cash_coa_id').unsigned().nullable();
      table.string('cash_coa_code', 50).nullable();
      table.string('cash_coa_name', 150).nullable();
      table.bigInteger('bank_coa_id').unsigned().nullable();
      table.string('bank_coa_code', 50).nullable();
      table.string('bank_coa_name', 150).nullable();

      table.string('fund_source_name', 150).defaultTo('Pos Pengadaan Stok & Pembelian SBU Kantin');
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
  const hasSettingsTable = await knex.schema.hasTable('canteen_goods_receipts_accounting_settings');
  if (hasSettingsTable) {
    await knex.schema.dropTable('canteen_goods_receipts_accounting_settings');
  }

  const hasReceiptsTable = await knex.schema.hasTable('goods_receipts');
  if (hasReceiptsTable) {
    await knex.schema.alterTable('goods_receipts', function (table) {
      table.dropColumn('total_cost_amount');
      table.dropColumn('payment_method');
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
      table.dropColumn('notes');
    });
  }
};
