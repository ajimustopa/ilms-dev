/**
 * Migration: add_attendance_status_details_to_employee_attendances
 * Modul Kepegawaian - Menambah kolom evaluasi kehadiran otomatis (radius, keterlambatan, pulang cepat, relasi master)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('employee_attendances', (table) => {
    table.boolean('is_within_radius').notNullable().defaultTo(true).after('check_in_notes');
    table.boolean('is_late').notNullable().defaultTo(false).after('is_within_radius');
    table.integer('late_minutes').unsigned().notNullable().defaultTo(0).after('is_late');
    table.boolean('is_early_departure').notNullable().defaultTo(false).after('check_out_notes');
    table.integer('early_departure_minutes').unsigned().notNullable().defaultTo(0).after('is_early_departure');
    table.bigInteger('matched_location_id').unsigned().nullable().after('early_departure_minutes');
    table.bigInteger('matched_schedule_id').unsigned().nullable().after('matched_location_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('employee_attendances', (table) => {
    table.dropColumn('is_within_radius');
    table.dropColumn('is_late');
    table.dropColumn('late_minutes');
    table.dropColumn('is_early_departure');
    table.dropColumn('early_departure_minutes');
    table.dropColumn('matched_location_id');
    table.dropColumn('matched_schedule_id');
  });
};
