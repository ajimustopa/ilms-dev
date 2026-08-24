/**
 * Migration: create_psychotest_types_table
 * Modul Kepegawaian - Fitur: Tes Psikologi (MBTI & Kepribadian Big Five)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_types', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.string('code', 50).notNullable().unique(); // 'mbti', 'big_five'
    table.string('name', 150).notNullable();
    table.string('scoring_method', 50).notNullable(); // 'dichotomy_4axis', 'trait_average'
    table.text('description').nullable();
    table.text('instructions').nullable();
    table.integer('duration_minutes').notNullable().defaultTo(30);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['code'], 'idx_psychotest_types_code');
    table.index(['is_active'], 'idx_psychotest_types_is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_types');
};
