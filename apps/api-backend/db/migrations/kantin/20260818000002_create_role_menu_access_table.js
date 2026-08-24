/**
 * Migration: role_menu_access
 * Sesuai erd-kantin.md §2.2 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('role_menu_access', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.string('role_name', 100).notNullable();
    table.bigInteger('access_menu_id').unsigned().notNullable()
      .references('id').inTable('access_menus').onDelete('CASCADE');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.unique(['role_name', 'access_menu_id'], 'uq_role_menu');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('role_menu_access');
};
