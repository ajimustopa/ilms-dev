/**
 * Migration: kitchen_qc_checks
 * Modul Dapur: Kontrol Mutu & Sanitasi (Suhu, Kebersihan, Organoleptik, Kalibrasi, Audit)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_qc_checks', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('check_type', [
      'receiving_quality',
      'staff_hygiene',
      'storage_temperature',
      'cooking_temperature',
      'holding_temperature',
      'organoleptic',
      'equipment_sanitation',
      'area_sanitation',
      'equipment_calibration',
      'internal_audit'
    ]).notNullable();
    table.string('reference_type', 50).nullable();
    table.bigInteger('reference_id').unsigned().nullable();
    table.string('indicator', 150).nullable();
    table.string('result_value', 100).nullable();
    table.string('threshold', 100).nullable();
    table.bigInteger('pic_id').unsigned().nullable(); // ref QC Dapur
    table.text('notes').nullable();
    table.timestamp('checked_at').defaultTo(knex.fn.now());
    table.enum('status', ['pass', 'fail']).defaultTo('pass');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_qc_checks');
};
