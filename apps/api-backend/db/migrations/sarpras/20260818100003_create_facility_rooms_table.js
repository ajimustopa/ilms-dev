/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('facility_rooms', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('facility_building_id').unsigned().notNullable()
      .references('id').inTable('facility_buildings').onDelete('RESTRICT');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('room_code', 50).notNullable();
    table.string('room_name', 150).notNullable();
    table.enum('room_type', [
      'ruang_kelas',
      'laboratorium',
      'perpustakaan',
      'ruang_guru',
      'ruang_kepsek',
      'uks',
      'gudang',
      'toilet',
      'aula',
      'lapangan',
      'kantin',
      'lainnya'
    ]).notNullable();
    table.smallint('floor_number').nullable();
    table.decimal('area_m2', 10, 2).nullable();
    table.specificType('capacity', 'SMALLINT UNSIGNED').nullable();
    table.enum('condition', ['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat']).notNullable().defaultTo('baik');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.unique(['facility_building_id', 'room_code'], { indexName: 'uq_room_code' });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('facility_rooms');
};
