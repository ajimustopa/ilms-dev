/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('lost_damaged_reports', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('book_copy_id').unsigned().notNullable()
      .references('id').inTable('book_copies').onDelete('CASCADE');
    table.bigInteger('loan_id').unsigned().nullable()
      .references('id').inTable('book_loans').onDelete('SET NULL');
    table.enum('condition_status', ['lost', 'damaged']).notNullable();
    table.text('description').nullable();
    table.decimal('replacement_fee', 12, 2).nullable();
    table.enum('fee_payment_status', ['none', 'unpaid', 'paid', 'waived']).notNullable().defaultTo('none');
    table.bigInteger('reported_by').unsigned().nullable(); // users.id
    table.enum('resolution_status', ['open', 'resolved']).notNullable().defaultTo('open');
    table.timestamp('resolved_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('lost_damaged_reports');
};
