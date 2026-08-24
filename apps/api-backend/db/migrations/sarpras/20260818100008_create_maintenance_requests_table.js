/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('maintenance_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('asset_id').unsigned().nullable()
      .references('id').inTable('assets').onDelete('SET NULL');
    table.bigInteger('facility_room_id').unsigned().nullable()
      .references('id').inTable('facility_rooms').onDelete('SET NULL');
    table.bigInteger('reported_by').unsigned().notNullable(); // Ref Kepegawaian employees.id
    table.text('damage_report').notNullable();
    table.enum('repair_status', ['dilaporkan', 'diproses', 'selesai', 'ditutup']).notNullable().defaultTo('dilaporkan');
    table.decimal('cost', 15, 2).nullable();
    table.timestamp('closed_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('maintenance_requests');
};
