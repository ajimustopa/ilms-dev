/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('book_loans', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('book_copy_id').unsigned().notNullable()
      .references('id').inTable('book_copies').onDelete('RESTRICT');
    table.bigInteger('member_id').unsigned().notNullable()
      .references('id').inTable('library_members').onDelete('RESTRICT');
    table.enum('loan_status', ['borrowed', 'returned', 'overdue', 'lost']).notNullable().defaultTo('borrowed');
    table.timestamp('borrowed_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('due_at').notNullable();
    table.timestamp('returned_at').nullable();
    table.smallint('extended_count').unsigned().notNullable().defaultTo(0);
    table.decimal('fine_amount', 12, 2).notNullable().defaultTo(0);
    table.enum('fine_payment_status', ['none', 'unpaid', 'paid', 'waived']).notNullable().defaultTo('none');
    table.bigInteger('borrowed_by').unsigned().nullable(); // users.id
    table.bigInteger('returned_to').unsigned().nullable(); // users.id
    table.timestamps(true, true);

    table.index(['member_id', 'loan_status'], 'idx_loans_member_status');
    table.index(['satuan_pendidikan_id', 'due_at'], 'idx_loans_school_due');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('book_loans');
};
