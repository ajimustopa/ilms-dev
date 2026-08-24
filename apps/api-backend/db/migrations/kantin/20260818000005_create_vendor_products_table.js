/**
 * Migration: vendor_products
 * Sesuai erd-kantin.md §2.5 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('vendor_products', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('barcode', 100).nullable().unique();
    table.string('product_name', 150).notNullable();
    table.bigInteger('product_category_id').unsigned().notNullable()
      .references('id').inTable('product_categories').onDelete('RESTRICT');
    table.bigInteger('vendor_id').unsigned().notNullable()
      .references('id').inTable('vendors').onDelete('RESTRICT');
    table.string('unit', 50).notNullable();
    table.integer('min_stock').unsigned().notNullable().defaultTo(0);
    table.integer('current_stock').unsigned().notNullable().defaultTo(0);
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('status_changed_at').nullable();
    table.string('status_note', 255).nullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_vp_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vendor_products');
};
