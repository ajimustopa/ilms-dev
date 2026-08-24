/**
 * Migration: kitchen_student_groups
 * Modul Dapur: Master Kelompok Santri (Cache/Ref Akademik)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_student_groups', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('academic_ref_id').unsigned().nullable();
    table.string('name', 100).notNullable();
    table.string('group_type', 50).nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_student_groups');
};
