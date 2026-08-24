/**
 * Migration: vendors
 * Sesuai erd-kantin.md §2.3 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('vendors', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('vendor_name', 150).notNullable();
    table.string('contact', 150).nullable();
    table.text('address').nullable();
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('status_changed_at').nullable();
    table.string('status_note', 255).nullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_vendors_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vendors');
};
