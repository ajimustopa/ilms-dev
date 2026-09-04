/**
 * Migration: alter_catalog_items_and_create_price_history
 * Modul Keuangan - Fitur Master Standar Biaya / Katalog Item & Riwayat Harga
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Alter catalog_items
  const hasExpenseCategory = await knex.schema.hasColumn('catalog_items', 'expense_category_id');
  if (!hasExpenseCategory) {
    // Ambil fallback ID expense category pertama jika ada
    const defaultExpenseCat = await knex('transaction_categories')
      .where({ category_kind: 'expense' })
      .first();
    const defaultCatId = defaultExpenseCat ? defaultExpenseCat.id : null;

    await knex.schema.table('catalog_items', (table) => {
      table.bigInteger('expense_category_id').unsigned().nullable().after('school_unit_id');
      table.bigInteger('academic_year_id').unsigned().notNullable().defaultTo(1).after('expense_category_id');
      table.boolean('is_active').notNullable().defaultTo(true).after('reference_price');
    });

    if (defaultCatId) {
      await knex('catalog_items')
        .whereNull('expense_category_id')
        .update({ expense_category_id: defaultCatId });
    }

    // Tambahkan foreign key dengan nama ringkas
    await knex.schema.table('catalog_items', (table) => {
      table.foreign('expense_category_id', 'fk_ci_exp_cat')
        .references('id').inTable('transaction_categories')
        .onDelete('RESTRICT').onUpdate('CASCADE');
      table.index(['academic_year_id'], 'idx_ci_acad_year');
    });
  }

  // 2. Buat tabel catalog_item_price_history
  const hasHistoryTable = await knex.schema.hasTable('catalog_item_price_history');
  if (!hasHistoryTable) {
    await knex.schema.createTable('catalog_item_price_history', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('catalog_item_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable();
      table.decimal('old_price', 18, 2).notNullable();
      table.decimal('new_price', 18, 2).notNullable();
      table.bigInteger('changed_by').unsigned().nullable();
      table.string('reason', 255).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.foreign('catalog_item_id', 'fk_ciph_item')
        .references('id').inTable('catalog_items')
        .onDelete('CASCADE').onUpdate('CASCADE');
      table.index(['catalog_item_id'], 'idx_ciph_item');
      table.index(['academic_year_id'], 'idx_ciph_year');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('catalog_item_price_history');
  const hasExpenseCategory = await knex.schema.hasColumn('catalog_items', 'expense_category_id');
  if (hasExpenseCategory) {
    await knex.schema.table('catalog_items', (table) => {
      table.dropForeign(['expense_category_id'], 'fk_ci_exp_cat');
      table.dropColumn(['expense_category_id', 'academic_year_id', 'is_active']);
    });
  }
};
