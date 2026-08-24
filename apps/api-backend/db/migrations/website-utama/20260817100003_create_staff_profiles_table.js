/**
 * Migration: create_staff_profiles_table
 * Modul Website Utama - Fitur #16: Struktur Organisasi & Profil Pengajar
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('staff_profiles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('employee_ref_id').unsigned().nullable();
    table.string('full_name', 150).notNullable();
    table.string('position', 150).notNullable();
    table.string('photo_url', 255).nullable();
    table.text('short_bio').nullable();
    table.smallint('display_order').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_staff_school');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('staff_profiles');
};
