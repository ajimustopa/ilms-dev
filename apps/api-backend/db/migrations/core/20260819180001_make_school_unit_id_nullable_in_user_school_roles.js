/**
 * Migration: make_school_unit_id_nullable_in_user_school_roles
 * Mengubah kolom school_unit_id pada tabel user_school_roles menjadi NULLABLE
 * agar mendukung hak akses tingkat Yayasan (Lintas Seluruh Satuan Pendidikan).
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('user_school_roles', (table) => {
    table.bigInteger('school_unit_id').unsigned().nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('user_school_roles', (table) => {
    table.bigInteger('school_unit_id').unsigned().notNullable().alter();
  });
};
