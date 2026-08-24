/**
 * Migration: kitchen_food_safety_incidents
 * Modul Dapur: Pencatatan Insiden Keamanan Pangan & Tindakan Korektif
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_food_safety_incidents', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('incident_date').notNullable();
    table.text('description').notNullable();
    table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
    table.text('corrective_action').nullable();
    table.text('preventive_action').nullable();
    table.enum('status', ['open', 'closed']).defaultTo('open');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_food_safety_incidents');
};
