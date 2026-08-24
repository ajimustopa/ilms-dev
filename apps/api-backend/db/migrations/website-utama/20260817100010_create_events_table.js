/**
 * Migration: create_events_table
 * Modul Website Utama - Fitur #22: Agenda & Kegiatan Sekolah
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('events', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('event_name', 200).notNullable();
    table.date('event_date').notNullable();
    table.string('location', 255).nullable();
    table.text('description').nullable();
    table.string('poster_url', 255).nullable();
    table.enu('status', ['draft', 'published']).notNullable().defaultTo('draft');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'event_date'], 'idx_events_school_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('events');
};
