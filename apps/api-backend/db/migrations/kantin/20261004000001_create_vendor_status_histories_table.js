/**
 * Migration: vendor_status_histories
 * Mencatat riwayat perubahan status aktif/non-aktif vendor beserta alasan dan petugas
 */
exports.up = function(knex) {
  return knex.schema.createTable('vendor_status_histories', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('vendor_id').unsigned().notNullable();
    table.enu('previous_status', ['active', 'inactive']).notNullable();
    table.enu('new_status', ['active', 'inactive']).notNullable();
    table.text('reason').notNullable();
    table.bigInteger('changed_by').unsigned().nullable();
    table.string('changed_by_name', 150).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['school_unit_id', 'vendor_id'], 'idx_vsh_vendor');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vendor_status_histories');
};
