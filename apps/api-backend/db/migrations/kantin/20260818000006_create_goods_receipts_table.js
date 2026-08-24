/**
 * Migration: goods_receipts
 * Sesuai erd-kantin.md §2.6 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('goods_receipts', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('vendor_id').unsigned().nullable()
      .references('id').inTable('vendors').onDelete('SET NULL');
    table.string('invoice_number', 100).nullable();
    table.date('receipt_date').notNullable();
    table.enu('receipt_type', ['titipan', 'belanja_sendiri']).notNullable();
    table.enu('status', ['draft', 'completed']).notNullable().defaultTo('draft');
    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamps(true, true);

    table.index('school_unit_id', 'idx_gr_school_unit');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('goods_receipts');
};
