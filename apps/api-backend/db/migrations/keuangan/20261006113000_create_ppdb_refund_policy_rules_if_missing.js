/**
 * Migration 100: Create ppdb_refund_policy_rules if missing
 * Modul: Keuangan (ppdb-billing)
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_refund_policy_rules');
  if (!hasTable) {
    await knex.schema.createTable('ppdb_refund_policy_rules', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.string('name', 150).nullable();
      table.string('fee_component', 50).notNullable().defaultTo('enrollment_fee');
      table.boolean('is_refundable').notNullable().defaultTo(true);
      table.date('cutoff_date').nullable();
      table.decimal('refund_percentage', 5, 2).notNullable().defaultTo(100.00);
      table.decimal('deduction_percentage', 5, 2).notNullable().defaultTo(0.00);
      table.string('description', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(['school_unit_id', 'fee_component'], 'idx_ppdb_refund_policy_unit_fee');
    });

    // Seed default rules for units
    const units = [1, 2];
    for (const unitId of units) {
      await knex('ppdb_refund_policy_rules').insert([
        {
          school_unit_id: unitId,
          name: 'Biaya Pendaftaran / Formulir',
          fee_component: 'registration_fee',
          is_refundable: false,
          cutoff_date: null,
          refund_percentage: 0.00,
          deduction_percentage: 100.00,
          description: 'Biaya pendaftaran dan tes seleksi awal bersifat hangus (non-refundable)',
          is_active: true
        },
        {
          school_unit_id: unitId,
          name: 'Pengunduran Diri Sebelum Orientasi / Masuk Asrama',
          fee_component: 'enrollment_fee',
          is_refundable: true,
          cutoff_date: '2026-07-01',
          refund_percentage: 80.00,
          deduction_percentage: 20.00,
          description: 'Pengembalian uang pangkal 80% (dipotong 20% biaya administrasi)',
          is_active: true
        },
        {
          school_unit_id: unitId,
          name: 'Pengunduran Diri Setelah Masuk / Mulai KBM',
          fee_component: 'enrollment_fee',
          is_refundable: true,
          cutoff_date: '2026-08-01',
          refund_percentage: 50.00,
          deduction_percentage: 50.00,
          description: 'Pengembalian uang pangkal 50% setelah kegiatan belajar mengajar dimulai',
          is_active: true
        }
      ]);
    }
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ppdb_refund_policy_rules');
};
