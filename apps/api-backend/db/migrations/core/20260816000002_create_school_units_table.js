/**
 * Migration: create_school_units_table
 * Fitur #7: CRUD Satuan Pendidikan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('school_units', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('foundation_id').unsigned().notNullable()
      .references('id').inTable('foundation_profiles')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('name', 200).notNullable();
    table.string('level', 50).notNullable();
    table.string('npsn', 20).nullable().unique();
    table.text('address').nullable();
    table.string('principal_name', 150).nullable();
    table.string('phone_number', 30).nullable();
    table.string('website', 150).nullable();
    table.string('email', 150).nullable();
    table.string('logo', 255).nullable();
    table.string('operating_license', 150).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['foundation_id'], 'idx_school_units_foundation');
    table.index(['is_active'], 'idx_school_units_is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('school_units');
};
