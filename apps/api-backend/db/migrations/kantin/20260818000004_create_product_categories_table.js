/**
 * Migration: product_categories
 * Sesuai erd-kantin.md §2.4 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('product_categories', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('category_name', 100).notNullable();
    table.text('description').nullable();
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('status_changed_at').nullable();
    table.string('status_note', 255).nullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_pc_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_categories');
};
