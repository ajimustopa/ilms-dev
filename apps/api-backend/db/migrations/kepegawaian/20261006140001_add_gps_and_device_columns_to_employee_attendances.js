/**
 * Migration: add_gps_and_device_columns_to_employee_attendances
 * Modul Kepegawaian - Menambah kolom GPS Geolocation, Akurasi, Device Info, dan Notes
 * untuk check-in dan check-out terpisah pada employee_attendances.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('employee_attendances', (table) => {
    // Check-in GPS & Device fields
    table.decimal('check_in_latitude', 10, 8).nullable().after('check_in_time');
    table.decimal('check_in_longitude', 11, 8).nullable().after('check_in_latitude');
    table.decimal('check_in_distance_meters', 10, 2).nullable().after('check_in_longitude');
    table.decimal('check_in_accuracy_meters', 10, 2).nullable().after('check_in_distance_meters');
    table.text('check_in_device_info').nullable().after('check_in_accuracy_meters');
    table.text('check_in_notes').nullable().after('check_in_device_info');

    // Check-out GPS & Device fields
    table.decimal('check_out_latitude', 10, 8).nullable().after('check_out_time');
    table.decimal('check_out_longitude', 11, 8).nullable().after('check_out_latitude');
    table.decimal('check_out_distance_meters', 10, 2).nullable().after('check_out_longitude');
    table.decimal('check_out_accuracy_meters', 10, 2).nullable().after('check_out_distance_meters');
    table.text('check_out_device_info').nullable().after('check_out_accuracy_meters');
    table.text('check_out_notes').nullable().after('check_out_device_info');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('employee_attendances', (table) => {
    table.dropColumn('check_in_latitude');
    table.dropColumn('check_in_longitude');
    table.dropColumn('check_in_distance_meters');
    table.dropColumn('check_in_accuracy_meters');
    table.dropColumn('check_in_device_info');
    table.dropColumn('check_in_notes');

    table.dropColumn('check_out_latitude');
    table.dropColumn('check_out_longitude');
    table.dropColumn('check_out_distance_meters');
    table.dropColumn('check_out_accuracy_meters');
    table.dropColumn('check_out_device_info');
    table.dropColumn('check_out_notes');
  });
};
