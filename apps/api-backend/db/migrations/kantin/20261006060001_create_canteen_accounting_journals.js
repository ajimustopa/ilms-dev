/**
 * Migration: create_canteen_accounting_journals
 * SBU Kantin - Tabel Jurnal Akuntansi Mandiri (Jurnal Umum, Penyesuaian, Penutup, Pembalik) & Baris Jurnal
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasEntries = await knex.schema.hasTable('canteen_journal_entries');
  if (!hasEntries) {
    await knex.schema.createTable('canteen_journal_entries', function (table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('school_unit_id').unsigned().notNullable().index();
      table.string('entry_number', 60).notNullable().unique();
      table.date('entry_date').notNullable().index();
      table.string('entry_type', 30).notNullable().defaultTo('general').index(); // 'general', 'adjustment', 'closing', 'reversing'
      table.string('reference_number', 100).nullable();
      table.string('description', 255).notNullable();
      table.decimal('total_debit', 15, 2).notNullable().defaultTo(0);
      table.decimal('total_credit', 15, 2).notNullable().defaultTo(0);
      table.boolean('is_balanced').notNullable().defaultTo(true);
      table.string('status', 20).notNullable().defaultTo('posted'); // 'draft', 'posted', 'void'
      table.bigInteger('recorded_by').unsigned().notNullable();
      table.timestamps(true, true);

      table.index(['school_unit_id', 'entry_date'], 'idx_cje_unit_date');
    });
  }

  const hasLines = await knex.schema.hasTable('canteen_journal_lines');
  if (!hasLines) {
    await knex.schema.createTable('canteen_journal_lines', function (table) {
      table.bigIncrements('id').primary().unsigned();
      table.bigInteger('canteen_journal_entry_id').unsigned().notNullable().references('id').inTable('canteen_journal_entries').onDelete('CASCADE');
      table.bigInteger('coa_account_id').unsigned().nullable();
      table.string('coa_account_code', 50).notNullable();
      table.string('coa_account_name', 150).notNullable();
      table.decimal('debit', 15, 2).notNullable().defaultTo(0);
      table.decimal('credit', 15, 2).notNullable().defaultTo(0);
      table.string('memo', 255).nullable();
      table.timestamps(true, true);

      table.index('canteen_journal_entry_id', 'idx_cjl_entry_id');
      table.index('coa_account_code', 'idx_cjl_coa_code');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('canteen_journal_lines');
  await knex.schema.dropTableIfExists('canteen_journal_entries');
};
