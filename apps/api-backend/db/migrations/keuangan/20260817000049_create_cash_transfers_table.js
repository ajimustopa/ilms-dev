/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('cash_transfers');
  if (!hasTable) {
    await knex.schema.createTable('cash_transfers', (table) => {
      table.bigIncrements('id').primary();
      table.integer('school_unit_id').notNullable().index();
      table.string('transfer_number', 50).notNullable().unique();
      table.date('transfer_date').notNullable().index();
      table.bigInteger('from_cash_account_id').unsigned().notNullable()
        .references('id').inTable('cash_accounts').onDelete('RESTRICT');
      table.bigInteger('to_cash_account_id').unsigned().notNullable()
        .references('id').inTable('cash_accounts').onDelete('RESTRICT');
      table.decimal('amount', 15, 2).notNullable();
      table.string('reference_number', 100).nullable();
      table.text('reason').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      table.index(['school_unit_id', 'transfer_date']);
      table.index(['from_cash_account_id']);
      table.index(['to_cash_account_id']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('cash_transfers');
};
