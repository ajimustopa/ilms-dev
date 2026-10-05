/**
 * Migration 93: Relax unique constraint on ppdb_registration_payments.receipt_number
 * Allows multipayment (multi-pos / multi-bill split allocations sharing a single official receipt number)
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_payments');
  if (hasTable) {
    // Cek apakah index unique ada
    const [indexes] = await knex.raw("SHOW INDEX FROM ppdb_registration_payments WHERE Key_name = 'ppdb_registration_payments_receipt_number_unique'");
    if (indexes && indexes.length > 0) {
      await knex.schema.alterTable('ppdb_registration_payments', function(table) {
        table.dropUnique(['receipt_number'], 'ppdb_registration_payments_receipt_number_unique');
        table.index(['receipt_number'], 'idx_ppdb_payments_receipt_number');
      });
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_payments');
  if (hasTable) {
    const [indexes] = await knex.raw("SHOW INDEX FROM ppdb_registration_payments WHERE Key_name = 'idx_ppdb_payments_receipt_number'");
    if (indexes && indexes.length > 0) {
      await knex.schema.alterTable('ppdb_registration_payments', function(table) {
        table.dropIndex(['receipt_number'], 'idx_ppdb_payments_receipt_number');
        table.unique(['receipt_number'], 'ppdb_registration_payments_receipt_number_unique');
      });
    }
  }
};
