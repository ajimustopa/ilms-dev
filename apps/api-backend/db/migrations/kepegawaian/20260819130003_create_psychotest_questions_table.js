/**
 * Migration: create_psychotest_questions_table
 * Modul Kepegawaian - Fitur: Bank Soal & Butir Instrumen Tes Psikologi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_questions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('test_type_id').unsigned().notNullable()
      .references('id').inTable('psychotest_types').onDelete('CASCADE');
    table.bigInteger('dimension_id').unsigned().notNullable()
      .references('id').inTable('psychotest_dimensions').onDelete('CASCADE');
    table.string('question_code', 50).nullable();
    table.text('question_text').notNullable();
    table.enum('question_type', ['forced_choice', 'likert_5', 'likert_7', 'multiple_choice']).notNullable().defaultTo('forced_choice');
    table.enum('scoring_direction', ['normal', 'reverse']).notNullable().defaultTo('normal');
    table.text('option_a_text').nullable(); // Khusus forced_choice (opsi kutub A)
    table.string('option_a_pole', 20).nullable(); // 'E', 'S', 'T', 'J'
    table.text('option_b_text').nullable(); // Khusus forced_choice (opsi kutub B)
    table.string('option_b_pole', 20).nullable(); // 'I', 'N', 'F', 'P'
    table.integer('order_number').notNullable().defaultTo(1);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['test_type_id', 'dimension_id'], 'idx_psychotest_questions_type_dim');
    table.index(['test_type_id', 'order_number'], 'idx_psychotest_questions_type_order');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_questions');
};
