/**
 * Migration: product_returns
 * Sesuai erd-kantin.md §2.8 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('product_returns', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('vendor_product_id').unsigned().notNullable()
      .references('id').inTable('vendor_products').onDelete('RESTRICT');
    table.enu('return_type', ['sisa', 'rusak']).notNullable();
    table.integer('qty').unsigned().notNullable();
    table.string('note', 255).nullable();
    table.bigInteger('returned_by').unsigned().notNullable();
    table.timestamp('returned_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_pr_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_returns');
};
