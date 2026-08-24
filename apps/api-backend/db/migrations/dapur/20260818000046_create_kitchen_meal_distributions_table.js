/**
 * Migration: kitchen_meal_distributions
 * Modul Dapur: Distribusi Makanan ke Satuan Pendidikan / Kelompok Santri
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_meal_distributions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable(); // Wajib (hilir distribusi per unit)
    table.date('distribution_date').notNullable();
    table.bigInteger('meal_type_id').unsigned().notNullable();
    table.bigInteger('student_group_id').unsigned().notNullable();
    table.integer('planned_portion').notNullable();
    table.integer('delivered_portion').nullable();
    table.integer('returned_portion').nullable();
    table.integer('extra_portion').defaultTo(0);
    table.string('shift', 30).nullable();
    table.bigInteger('handed_over_by').unsigned().nullable(); // ref petugas distribusi
    table.enum('status', ['scheduled', 'delivered', 'confirmed']).defaultTo('scheduled');
    table.timestamps(true, true);

    table.foreign('meal_type_id').references('id').inTable('kitchen_master_data').onDelete('RESTRICT');
    table.foreign('student_group_id').references('id').inTable('kitchen_student_groups').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_meal_distributions');
};
