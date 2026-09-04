/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasDesc = await knex.schema.hasColumn('fee_types', 'description');
  if (!hasDesc) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.text('description').nullable().after('billing_pattern');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasDesc = await knex.schema.hasColumn('fee_types', 'description');
  if (hasDesc) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.dropColumn('description');
    });
  }
};
