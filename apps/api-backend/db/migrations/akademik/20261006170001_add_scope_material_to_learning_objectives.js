/**
 * Migration: add_scope_material_to_learning_objectives
 * Menambahkan kolom scope_material pada tabel learning_objectives di modul akademik
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasScope = await knex.schema.hasColumn('learning_objectives', 'scope_material');
  if (!hasScope) {
    await knex.schema.alterTable('learning_objectives', (table) => {
      table.string('scope_material', 255).nullable().after('code');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasScope = await knex.schema.hasColumn('learning_objectives', 'scope_material');
  if (hasScope) {
    await knex.schema.alterTable('learning_objectives', (table) => {
      table.dropColumn('scope_material');
    });
  }
};
