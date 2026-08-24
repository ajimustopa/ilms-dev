/**
 * Migration: kitchen_meal_attendances
 * Modul Dapur: Absensi Makan Santri (Model Hybrid: Rombel/Asrama & Individu)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_meal_attendances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('meal_distribution_id').unsigned().notNullable();
    table.enum('attendance_level', ['individual', 'group']).defaultTo('group');
    table.bigInteger('student_group_id').unsigned().notNullable();
    table.bigInteger('student_ref_id').unsigned().nullable(); // ref santri dari Akademik jika individual
    table.boolean('is_present').defaultTo(true);
    table.boolean('portion_reduced').defaultTo(false);
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.foreign('meal_distribution_id').references('id').inTable('kitchen_meal_distributions').onDelete('CASCADE');
    table.foreign('student_group_id').references('id').inTable('kitchen_student_groups').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_meal_attendances');
};
