/**
 * Migration: sync_sma_assessment_types_from_smp
 * Modul Akademik - Menyelaraskan master jenis pengujian & bobot kontribusi nilai rapor
 * pada satuan pendidikan SMA (id: 2) agar sama persis dengan SMP (id: 1).
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Ambil seluruh data master assessment_types dari SMP (satuan_pendidikan_id = 1)
  const smpTypes = await knex('assessment_types')
    .where({ satuan_pendidikan_id: 1 })
    .orderBy('order_index', 'asc');

  if (smpTypes && smpTypes.length > 0) {
    for (const smpType of smpTypes) {
      const existingSma = await knex('assessment_types')
        .where({
          satuan_pendidikan_id: 2,
          code: smpType.code,
          category: smpType.category || 'mapel'
        })
        .first();

      if (!existingSma) {
        await knex('assessment_types').insert({
          satuan_pendidikan_id: 2,
          category: smpType.category || 'mapel',
          academic_year_id: smpType.academic_year_id || null,
          name: smpType.name,
          code: smpType.code,
          description: smpType.description,
          weight_percentage: smpType.weight_percentage,
          is_tp_based: smpType.is_tp_based,
          order_index: smpType.order_index,
          is_active: smpType.is_active,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
      } else {
        await knex('assessment_types')
          .where({ id: existingSma.id })
          .update({
            name: smpType.name,
            description: smpType.description,
            weight_percentage: smpType.weight_percentage,
            is_tp_based: smpType.is_tp_based,
            order_index: smpType.order_index,
            is_active: smpType.is_active,
            updated_at: knex.fn.now()
          });
      }
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Rollback jika diperlukan
};
