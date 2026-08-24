/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('facility_bookings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('facility_room_id').unsigned().nullable()
      .references('id').inTable('facility_rooms').onDelete('SET NULL');
    table.string('other_facility_name', 150).nullable();
    table.bigInteger('employee_id').unsigned().notNullable(); // Ref Kepegawaian employees.id
    table.string('purpose', 255).notNullable();
    table.date('booking_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'cancelled']).notNullable().defaultTo('pending');
    table.timestamps(true, true);

    table.index(['facility_room_id', 'booking_date'], 'idx_fb_room_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('facility_bookings');
};
