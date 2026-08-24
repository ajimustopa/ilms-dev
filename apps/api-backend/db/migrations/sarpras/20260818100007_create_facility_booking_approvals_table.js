/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('facility_booking_approvals', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('facility_booking_id').unsigned().notNullable()
      .references('id').inTable('facility_bookings').onDelete('CASCADE');
    table.bigInteger('approver_user_id').unsigned().notNullable(); // Ref Core Service users.id
    table.specificType('approval_level', 'SMALLINT UNSIGNED').notNullable().defaultTo(1);
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.text('notes').nullable();
    table.timestamp('approved_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('facility_booking_approvals');
};
