/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('facility_sites', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('address', 255).nullable();
    table.decimal('land_area_m2', 10, 2).nullable();
    table.enum('ownership_status', ['milik_sendiri', 'sewa', 'pinjam', 'hibah']).nullable();
    table.string('certificate_number', 100).nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('facility_sites');
};
