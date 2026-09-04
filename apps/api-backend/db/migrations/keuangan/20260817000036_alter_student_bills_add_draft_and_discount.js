/**
 * Migration: alter_student_bills_add_draft_and_discount
 * Modul Keuangan - Fitur Tagihan Siswa: Status Draft, Diskon, Edit Reason & Penerbitan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Ubah ENUM status untuk menyertakan 'draft'
  await knex.raw(`
    ALTER TABLE \`student_bills\` 
    MODIFY COLUMN \`status\` ENUM('draft', 'unpaid', 'partially_paid', 'paid', 'cancelled') 
    NOT NULL DEFAULT 'draft'
  `);

  // 2. Tambahkan kolom discount_amount, previous_data, edit_reason, published_at, published_by
  const hasDiscount = await knex.schema.hasColumn('student_bills', 'discount_amount');
  if (!hasDiscount) {
    await knex.schema.table('student_bills', (table) => {
      table.decimal('discount_amount', 18, 2).notNullable().defaultTo(0.00).after('amount');
      table.json('previous_data').nullable().after('status');
      table.text('edit_reason').nullable().after('previous_data');
      table.timestamp('published_at').nullable().after('edit_reason');
      table.bigInteger('published_by').unsigned().nullable().after('published_at');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasDiscount = await knex.schema.hasColumn('student_bills', 'discount_amount');
  if (hasDiscount) {
    await knex.schema.table('student_bills', (table) => {
      table.dropColumn(['discount_amount', 'previous_data', 'edit_reason', 'published_at', 'published_by']);
    });
  }

  await knex.raw(`
    ALTER TABLE \`student_bills\` 
    MODIFY COLUMN \`status\` ENUM('unpaid', 'partially_paid', 'paid', 'cancelled') 
    NOT NULL DEFAULT 'unpaid'
  `);
};
