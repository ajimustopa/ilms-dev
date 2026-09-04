/**
 * Migration: fix_fee_types_billing_patterns
 * Memperbaiki nilai billing_pattern pada fee_types agar jenis biaya sekali bayar terdefinisi sebagai 'incidental'
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Update fee_types yang kosong atau null menjadi 'incidental'
  await knex('fee_types')
    .whereNull('billing_pattern')
    .orWhere('billing_pattern', '')
    .orWhere('billing_pattern', 'one_time')
    .update({ billing_pattern: 'incidental' });

  // Update spesifik untuk memastikan konsistensi
  await knex('fee_types').where('name', 'Pendaftaran').update({ billing_pattern: 'incidental' });
  await knex('fee_types').where('name', 'Sarpras').update({ billing_pattern: 'incidental' });
  await knex('fee_types').where('name', 'Seragam').update({ billing_pattern: 'incidental' });
  await knex('fee_types').where('name', 'Bangunan').update({ billing_pattern: 'incidental' });
  await knex('fee_types').where('name', 'Kegiatan Akhir Jenjang').update({ billing_pattern: 'incidental' });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // No rollback needed
};
