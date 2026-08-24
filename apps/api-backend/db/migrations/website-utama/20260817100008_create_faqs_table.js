/**
 * Migration: create_faqs_table
 * Modul Website Utama - Fitur #20: FAQ (Tanya Jawab)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('faqs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('question', 255).notNullable();
    table.text('answer').notNullable();
    table.string('category', 100).nullable();
    table.smallint('display_order').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_faqs_school');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('faqs');
};
