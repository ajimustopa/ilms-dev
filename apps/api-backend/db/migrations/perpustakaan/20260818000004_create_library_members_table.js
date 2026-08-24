/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('library_members', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.enum('ref_type', ['student', 'employee']).notNullable();
    table.bigInteger('ref_id').unsigned().notNullable();
    table.string('member_card_number', 50).nullable().unique();
    table.date('card_valid_until').nullable();
    table.smallint('max_loan_limit').unsigned().notNullable().defaultTo(3);
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.bigInteger('registered_by').unsigned().nullable(); // users.id (Core Service)
    table.timestamps(true, true);

    table.unique(['ref_type', 'ref_id', 'satuan_pendidikan_id'], 'uq_member_ref');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('library_members');
};
