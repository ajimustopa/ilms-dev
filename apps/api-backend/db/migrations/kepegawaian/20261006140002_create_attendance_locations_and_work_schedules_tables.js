/**
 * Migration: create_attendance_locations_and_work_schedules_tables
 * Modul Kepegawaian - Fitur: Master Multi-Titik Lokasi GPS & Pengaturan Jam Kerja Fleksibel
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel Master Multi-Titik Lokasi Absensi GPS
  await knex.schema.createTable('attendance_locations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().index();
    table.string('name', 150).notNullable();
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.decimal('radius_meters', 10, 2).notNullable().defaultTo(100.00);
    table.text('address').nullable();
    table.text('notes').nullable();
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  // 2. Tabel Pengaturan Jam Kerja & Toleransi
  await knex.schema.createTable('attendance_work_schedules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().index();
    table.string('name', 100).notNullable();
    table.enum('day_of_week', ['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).notNullable().defaultTo('all').index();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.integer('late_tolerance_minutes').unsigned().notNullable().defaultTo(15);
    table.integer('early_departure_tolerance_minutes').unsigned().notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('attendance_work_schedules');
  await knex.schema.dropTableIfExists('attendance_locations');
};
