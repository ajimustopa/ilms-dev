/**
 * Migration: kitchen_staff_assignments
 * Modul Dapur: Penugasan Staf Dapur, Shift Kerja & Stasiun Operasional
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_staff_assignments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('core_user_id').unsigned().notNullable(); // ref Core Service user
    table.enum('staff_role', [
      'admin_dapur',
      'kepala_dapur',
      'petugas_gudang',
      'petugas_distribusi',
      'qc_dapur',
      'admin_sistem'
    ]).notNullable();
    table.enum('shift', ['pagi', 'siang', 'malam', 'full_day']).defaultTo('pagi');
    table.enum('station', ['persiapan', 'masak', 'gudang', 'distribusi', 'qc', 'umum']).defaultTo('umum');
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_staff_assignments');
};
