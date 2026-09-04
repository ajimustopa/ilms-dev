/**
 * Migration 61: Relax unique constraint on ppdb_registration_bills to allow installments
 * Drop uq_ppdb_bills_unit_reg_fee and replace with regular index
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (hasTable) {
    await knex.schema.alterTable('ppdb_registration_bills', function(table) {
      table.dropUnique(['school_unit_id', 'psb_registrant_ref_id', 'fee_type_id'], 'uq_ppdb_bills_unit_reg_fee');
      table.index(['school_unit_id', 'psb_registrant_ref_id', 'fee_type_id'], 'idx_ppdb_bills_unit_reg_fee');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_registration_bills');
  if (hasTable) {
    await knex.schema.alterTable('ppdb_registration_bills', function(table) {
      table.dropIndex(['school_unit_id', 'psb_registrant_ref_id', 'fee_type_id'], 'idx_ppdb_bills_unit_reg_fee');
      table.unique(['school_unit_id', 'psb_registrant_ref_id', 'fee_type_id'], 'uq_ppdb_bills_unit_reg_fee');
    });
  }
};
