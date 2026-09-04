/**
 * Migration: alter_budget_plans_and_expense_items
 * Modul Keuangan - Fitur #10 & #11: Rincian Belanja RAPBS Terintegrasi Katalog & Pengesahan RAPBS
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Alter budget_plans: tambahkan published_by, approved_by, approved_at
  const hasPublishedBy = await knex.schema.hasColumn('budget_plans', 'published_by');
  if (!hasPublishedBy) {
    await knex.schema.table('budget_plans', (table) => {
      table.bigInteger('published_by').unsigned().nullable().after('published_at');
      table.bigInteger('approved_by').unsigned().nullable().after('published_by');
      table.timestamp('approved_at').nullable().after('approved_by');
    });
  }

  // 2. Alter budget_plan_expense_items: tambahkan catalog_item_id, fund_source_fee_type_id, unit, quantity, unit_price
  const hasCatalogItemId = await knex.schema.hasColumn('budget_plan_expense_items', 'catalog_item_id');
  if (!hasCatalogItemId) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.bigInteger('catalog_item_id').unsigned().nullable().after('budget_program_id');
      table.bigInteger('fund_source_fee_type_id').unsigned().nullable().after('catalog_item_id');
      table.string('unit', 30).nullable().after('name');
      table.decimal('quantity', 10, 2).notNullable().defaultTo(1.00).after('unit');
      table.decimal('unit_price', 18, 2).notNullable().defaultTo(0.00).after('quantity');
    });

    // Populate unit_price dari planned_amount untuk data yang sudah ada
    await knex('budget_plan_expense_items')
      .where('unit_price', 0)
      .update({
        unit_price: knex.ref('planned_amount')
      });

    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.foreign('catalog_item_id', 'fk_bpei_catalog')
        .references('id').inTable('catalog_items')
        .onDelete('SET NULL').onUpdate('CASCADE');
      table.foreign('fund_source_fee_type_id', 'fk_bpei_fee_type')
        .references('id').inTable('fee_types')
        .onDelete('SET NULL').onUpdate('CASCADE');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasPublishedBy = await knex.schema.hasColumn('budget_plans', 'published_by');
  if (hasPublishedBy) {
    await knex.schema.table('budget_plans', (table) => {
      table.dropColumn(['published_by', 'approved_by', 'approved_at']);
    });
  }

  const hasCatalogItemId = await knex.schema.hasColumn('budget_plan_expense_items', 'catalog_item_id');
  if (hasCatalogItemId) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.dropForeign(['catalog_item_id'], 'fk_bpei_catalog');
      table.dropForeign(['fund_source_fee_type_id'], 'fk_bpei_fee_type');
      table.dropColumn(['catalog_item_id', 'fund_source_fee_type_id', 'unit', 'quantity', 'unit_price']);
    });
  }
};
