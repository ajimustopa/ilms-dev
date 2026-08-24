/**
 * Migration: kitchen_special_meal_recipients
 * Modul Dapur: Daftar Penerima Porsi Khusus / Diet / Alergi
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_special_meal_recipients', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('meal_distribution_id').unsigned().notNullable();
    table.bigInteger('student_ref_id').unsigned().nullable(); // ref santri
    table.string('reason', 150).nullable(); // misal: diet rendah garam, alergi seafood
    table.string('label_text', 150).nullable();
    table.timestamps(true, true);

    table.foreign('meal_distribution_id').references('id').inTable('kitchen_meal_distributions').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_special_meal_recipients');
};
