/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('procurements', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('vendor_id').unsigned().nullable()
      .references('id').inTable('vendors').onDelete('SET NULL');
    table.string('item_name', 150).notNullable();
    table.decimal('quantity', 10, 2).notNullable();
    table.string('unit', 30).nullable();
    table.enum('status', ['diajukan', 'disetujui', 'diterima', 'ditolak']).notNullable().defaultTo('diajukan');
    table.bigInteger('requested_by').unsigned().notNullable(); // Ref Core Service users.id
    table.bigInteger('approved_by').unsigned().nullable(); // Ref Core Service users.id
    table.bigInteger('finance_reference_id').unsigned().nullable(); // ID transaksi di Keuangan
    table.timestamp('received_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('procurements');
};
