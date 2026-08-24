/**
 * Migration: create_consultation_bookings_table
 * Modul Website Utama - Fitur #30: Booking Konsultasi Virtual
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('consultation_bookings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('contact', 100).notNullable();
    table.timestamp('scheduled_at').notNullable();
    table.string('meeting_link', 255).nullable();
    table.enu('status', ['booked', 'confirmed', 'rescheduled', 'cancelled', 'done']).notNullable().defaultTo('booked');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'scheduled_at'], 'idx_consult_bookings_school_sched');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('consultation_bookings');
};
