/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('facility_buildings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('facility_site_id').unsigned().notNullable()
      .references('id').inTable('facility_sites').onDelete('RESTRICT');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('building_function', 100).nullable();
    table.specificType('floor_count', 'SMALLINT UNSIGNED').nullable();
    table.decimal('building_area_m2', 10, 2).nullable();
    table.specificType('construction_year', 'YEAR').nullable();
    table.enum('condition', ['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat']).notNullable().defaultTo('baik');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('facility_buildings');
};
