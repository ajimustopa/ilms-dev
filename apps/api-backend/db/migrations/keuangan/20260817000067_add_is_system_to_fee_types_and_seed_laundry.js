/**
 * Migration: add_is_system_to_fee_types_and_seed_laundry
 * Modul Keuangan - Menambahkan kolom is_system & code pada fee_types serta seed 'Kelebihan Laundry'
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasIsSystem = await knex.schema.hasColumn('fee_types', 'is_system');
  if (!hasIsSystem) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.boolean('is_system').notNullable().defaultTo(false).after('is_active');
    });
  }

  const hasCode = await knex.schema.hasColumn('fee_types', 'code');
  if (!hasCode) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.string('code', 50).nullable().after('fee_group_id');
    });
  }

  // Cari akun pendapatan lainnya (608 / 60801) jika ada sebagai default revenue account
  const revAcc = await knex('chart_of_accounts')
    .where('account_code', '608')
    .orWhere('account_code', '60801')
    .first();
  const revAccId = revAcc ? revAcc.id : null;

  // Cek apakah 'Kelebihan Laundry' sudah ada
  const existingGlobal = await knex('fee_types')
    .where({ code: 'excess_laundry' })
    .orWhere({ name: 'Kelebihan Laundry' })
    .first();

  if (!existingGlobal) {
    await knex('fee_types').insert({
      school_unit_id: 0, // Global untuk semua unit
      fee_group_id: null,
      code: 'excess_laundry',
      name: 'Kelebihan Laundry',
      billing_pattern: 'monthly',
      description: 'Tagihan atas kelebihan pemakaian kuota layanan laundry santri/siswa. Variabel default sistem untuk modul layanan laundry.',
      related_revenue_account_id: revAccId,
      is_active: true,
      is_system: true
    });
  } else {
    await knex('fee_types')
      .where({ id: existingGlobal.id })
      .update({
        code: 'excess_laundry',
        name: 'Kelebihan Laundry',
        billing_pattern: 'monthly',
        is_system: true,
        is_active: true,
        description: existingGlobal.description || 'Tagihan atas kelebihan pemakaian kuota layanan laundry santri/siswa. Variabel default sistem untuk modul layanan laundry.',
        related_revenue_account_id: existingGlobal.related_revenue_account_id || revAccId
      });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Hapus fee_type kelebihan laundry
  await knex('fee_types').where({ code: 'excess_laundry' }).delete();

  const hasCode = await knex.schema.hasColumn('fee_types', 'code');
  if (hasCode) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.dropColumn('code');
    });
  }

  const hasIsSystem = await knex.schema.hasColumn('fee_types', 'is_system');
  if (hasIsSystem) {
    await knex.schema.alterTable('fee_types', (table) => {
      table.dropColumn('is_system');
    });
  }
};
