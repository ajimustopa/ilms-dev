/**
 * Migration: access_menus
 * Sesuai erd-kantin.md §2.1 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('access_menus', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.string('menu_key', 100).notNullable().unique();
    table.string('menu_name', 150).notNullable();
    table.string('description', 255).nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('access_menus');
};
