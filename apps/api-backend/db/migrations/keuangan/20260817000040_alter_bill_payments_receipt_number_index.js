/**
 * Migration: alter_bill_payments_receipt_number_index
 * Modul Keuangan - Mengizinkan nomor kwitansi gabungan (shared receipt_number) untuk pembayaran split multi-pos
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Drop unique constraint on receipt_number if exists, and add normal index
  try {
    await knex.schema.table('bill_payments', (table) => {
      table.dropUnique(['receipt_number']);
    });
  } catch (e) {
    // Unique might be named differently or already dropped
    try {
      await knex.raw('ALTER TABLE `bill_payments` DROP INDEX `bill_payments_receipt_number_unique`');
    } catch (rawErr) {
      console.warn('Drop unique index on receipt_number warning:', rawErr.message);
    }
  }

  await knex.schema.table('bill_payments', (table) => {
    table.index(['receipt_number'], 'idx_bill_payments_receipt_number');
  });

  // Perluas payment_method enum jika belum lengkap
  try {
    await knex.raw(`
      ALTER TABLE \`bill_payments\` 
      MODIFY COLUMN \`payment_method\` ENUM('cash', 'transfer', 'bank_transfer', 'gateway') NOT NULL
    `);
  } catch (err) {
    console.warn('payment_method enum update warning:', err.message);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.table('bill_payments', (table) => {
      table.dropIndex(['receipt_number'], 'idx_bill_payments_receipt_number');
      table.unique(['receipt_number']);
    });
  } catch (e) {
    // ignore
  }
};
