/**
 * Migration: create_psychotest_type_profiles_table
 * Modul Kepegawaian - Fitur: Profil Kepribadian & Rekomendasi HRD
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_type_profiles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('test_type_id').unsigned().notNullable()
      .references('id').inTable('psychotest_types').onDelete('CASCADE');
    table.string('profile_code', 50).notNullable(); // mis. 'INTJ', 'ENFP', 'O_tinggi', 'SUMMARY'
    table.string('profile_label', 150).notNullable(); // mis. 'The Mastermind (Ahli Strategi)', 'Keterbukaan Tinggi'
    table.text('description_text').notNullable();
    table.text('strengths_text').nullable();
    table.text('weaknesses_text').nullable();
    table.text('hrd_recommendation_text').notNullable();
    table.text('suitable_roles').nullable(); // Jabatan/peran yang cocok
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['test_type_id', 'profile_code'], 'uq_psychotest_profiles_type_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_type_profiles');
};
