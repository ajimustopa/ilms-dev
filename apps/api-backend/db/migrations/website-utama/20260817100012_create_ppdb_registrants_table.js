/**
 * Migration: create_ppdb_registrants_table
 * Modul Website Utama - Fitur #25: Pendaftaran Calon Siswa (PPDB Online)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ppdb_registrants', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('school_year', 20).notNullable();
    table.string('registration_path', 100).notNullable();
    table.string('candidate_full_name', 150).notNullable();
    table.string('candidate_birth_place', 100).nullable();
    table.date('candidate_birth_date').nullable();
    table.enu('candidate_gender', ['L', 'P']).nullable();
    table.text('candidate_address').nullable();
    table.string('father_name', 150).nullable();
    table.string('mother_name', 150).nullable();
    table.string('parent_contact', 50).nullable();
    table.enu('status', ['draft', 'submitted', 'verifying', 'accepted', 'rejected']).notNullable().defaultTo('draft');
    table.bigInteger('academic_ref_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id', 'school_year', 'status'], 'idx_ppdb_school_year_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ppdb_registrants');
};
