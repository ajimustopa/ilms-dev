/**
 * Migration: create_psychotest_dimensions_table
 * Modul Kepegawaian - Fitur: Tes Psikologi (Dimensi & Trait Kepribadian)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_dimensions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('test_type_id').unsigned().notNullable()
      .references('id').inTable('psychotest_types').onDelete('CASCADE');
    table.string('code', 30).notNullable(); // mis. 'EI', 'SN', 'TF', 'JP' atau 'O', 'C', 'E', 'A', 'N'
    table.string('name', 150).notNullable();
    table.string('pole_positive_code', 20).nullable(); // 'E', 'S', 'T', 'J', 'O_high'
    table.string('pole_positive_label', 100).nullable(); // 'Ekstrovert (Extraversion)', 'Terbuka (High Openness)'
    table.string('pole_negative_code', 20).nullable(); // 'I', 'N', 'F', 'P', 'O_low'
    table.string('pole_negative_label', 100).nullable(); // 'Introvert (Introversion)', 'Praktis / Tertutup'
    table.text('description').nullable();
    table.integer('order_number').notNullable().defaultTo(1);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['test_type_id', 'code'], 'uq_psychotest_dimensions_type_code');
    table.index(['test_type_id', 'order_number'], 'idx_psychotest_dimensions_type_order');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_dimensions');
};
