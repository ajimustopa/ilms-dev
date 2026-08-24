/**
 * Migration: kitchen_menus
 * Modul Dapur: Perencanaan Menu
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_menus', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('menu_type', ['daily', 'weekly_template', 'monthly_cycle', 'special']).notNullable();
    table.string('name', 150).nullable();
    table.date('menu_date').nullable();
    table.date('period_start').nullable();
    table.date('period_end').nullable();
    table.bigInteger('parent_menu_id').unsigned().nullable();
    table.smallint('version').defaultTo(1);
    table.enum('status', ['draft', 'locked', 'approved', 'substituted']).defaultTo('draft');
    table.boolean('is_favorite').defaultTo(false);
    table.bigInteger('proposed_by').unsigned().nullable();
    table.timestamps(true, true);

    table.foreign('parent_menu_id').references('id').inTable('kitchen_menus').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_menus');
};
