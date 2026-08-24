/**
 * Migration: kitchen_budgets
 * Modul Dapur: Anggaran Dapur (Tahunan, Bulanan, per Porsi, per Kelompok)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_budgets', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('budget_scope', ['annual', 'monthly', 'per_portion', 'per_group']).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.string('category', 100).notNullable();
    table.decimal('budget_amount', 16, 2).notNullable();
    table.decimal('realized_amount', 16, 2).defaultTo(0);
    table.decimal('deviation', 16, 2).nullable();
    table.bigInteger('finance_ref_id').unsigned().nullable(); // referensi Keuangan opsional
    table.enum('status', ['draft', 'submitted', 'approved']).defaultTo('draft');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_budgets');
};
