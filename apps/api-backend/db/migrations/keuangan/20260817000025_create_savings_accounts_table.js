/**
 * Migration: create_savings_accounts_table
 * Modul Keuangan - Fitur #27: Rekening Tabungan Siswa & Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('savings_accounts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enum('owner_type', ['student', 'employee']).notNullable();
    table.bigInteger('owner_id').unsigned().notNullable();
    table.decimal('balance', 18, 2).notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'owner_type', 'owner_id'], 'uq_savings_owner');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('savings_accounts');
};
