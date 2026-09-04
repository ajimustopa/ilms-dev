/**
 * Migration: add_bill_date_to_student_bills
 * Menambahkan kolom bill_date pada tabel student_bills untuk mencatat tanggal penerbitan tagihan resmi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasBillDate = await knex.schema.hasColumn('student_bills', 'bill_date');
  if (!hasBillDate) {
    await knex.schema.alterTable('student_bills', (table) => {
      table.date('bill_date').nullable().after('due_date');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasBillDate = await knex.schema.hasColumn('student_bills', 'bill_date');
  if (hasBillDate) {
    await knex.schema.alterTable('student_bills', (table) => {
      table.dropColumn('bill_date');
    });
  }
};
