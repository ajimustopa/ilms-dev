/**
 * Migration: create_psychotest_answers_table
 * Modul Kepegawaian - Fitur: Lembar Jawaban Butir Tes Psikologi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_answers', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('session_id').unsigned().notNullable()
      .references('id').inTable('psychotest_sessions').onDelete('CASCADE');
    table.bigInteger('question_id').unsigned().notNullable()
      .references('id').inTable('psychotest_questions').onDelete('CASCADE');
    table.string('selected_option', 50).notNullable(); // 'A', 'B', '1', '2', '3', '4', '5'
    table.string('selected_pole', 20).nullable(); // 'E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'
    table.decimal('raw_score', 5, 2).notNullable().defaultTo(0.00); // Skor per butir (mis. Likert 1-5 setelah inverse)
    table.integer('response_time_seconds').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['session_id', 'question_id'], 'uq_psychotest_answers_session_question');
    table.index(['session_id'], 'idx_psychotest_answers_session');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_answers');
};
