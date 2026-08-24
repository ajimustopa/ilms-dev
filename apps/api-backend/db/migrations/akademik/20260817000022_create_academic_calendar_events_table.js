/**
 * Migration: create_academic_calendar_events_table
 * Modul Akademik - Fitur: Kalender Akademik (Academic Calendar Events)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('academic_calendar_events', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('title', 150).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.bigInteger('grade_level_id').unsigned().nullable()
      .references('id').inTable('grade_levels');
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_calendar_satuan');
    table.index(['start_date'], 'idx_calendar_start_date');
    table.index(['end_date'], 'idx_calendar_end_date');
    table.index(['grade_level_id'], 'idx_calendar_grade_level');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('academic_calendar_events');
};
