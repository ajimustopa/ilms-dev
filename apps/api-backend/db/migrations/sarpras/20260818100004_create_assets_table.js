/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('assets', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('facility_room_id').unsigned().nullable()
      .references('id').inTable('facility_rooms').onDelete('SET NULL');
    table.string('asset_code', 50).notNullable().unique();
    table.string('name', 150).notNullable();
    table.string('category', 100).nullable();
    table.decimal('acquisition_value', 15, 2).nullable();
    table.date('acquisition_date').nullable();
    table.enum('condition', ['baik', 'rusak_ringan', 'rusak_berat']).notNullable().defaultTo('baik');
    table.string('qr_code', 255).nullable().unique();
    table.enum('status', ['active', 'disposed']).notNullable().defaultTo('active');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('assets');
};
