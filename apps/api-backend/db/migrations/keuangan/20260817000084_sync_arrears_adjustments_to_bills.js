/**
 * Migration 84: Sync Arrears Adjustments to Student Bills
 */

exports.up = async function (knex) {
  try {
    const arrearsFeeTypes = await knex('fee_types')
      .where('code', 'arrears_previous_year')
      .orWhere('id', 11)
      .orWhereRaw("LOWER(name) LIKE '%tunggakan%'")
      .select('id');
    const ftIds = arrearsFeeTypes.map(f => f.id);
    if (ftIds.length === 0) return;

    const adjustments = await knex('student_fee_adjustments')
      .leftJoin('student_fee_scheme_assignments', 'student_fee_adjustments.assignment_id', 'student_fee_scheme_assignments.id')
      .whereIn('student_fee_adjustments.fee_type_id', ftIds)
      .where('student_fee_adjustments.status', 'approved')
      .where('student_fee_adjustments.override_amount', '>', 0)
      .select(
        'student_fee_adjustments.*',
        'student_fee_scheme_assignments.academic_year_id as assigned_ay_id'
      );

    for (const adj of adjustments) {
      const ayId = adj.assigned_ay_id || 3;
      const existingBill = await knex('student_bills')
        .where({
          student_id: adj.student_id,
          fee_type_id: adj.fee_type_id,
          academic_year_id: ayId
        })
        .whereNotIn('status', ['cancelled', 'written_off'])
        .first();

      const amt = parseFloat(adj.override_amount || 0);
      if (!existingBill && amt > 0) {
        const bDate = adj.approved_at ? String(adj.approved_at).slice(0, 10) : (adj.created_at ? String(adj.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10));
        const dDate = ayId === 3 ? '2024-08-31' : (ayId === 1 ? '2025-08-31' : '2026-08-31');
        await knex('student_bills').insert({
          school_unit_id: adj.school_unit_id || 1,
          student_id: adj.student_id,
          fee_type_id: adj.fee_type_id,
          academic_year_id: ayId,
          period_month: null,
          period_year: ayId === 3 ? 2024 : (ayId === 1 ? 2025 : 2026),
          amount: amt,
          paid_amount: 0,
          discount_amount: 0,
          status: 'unpaid',
          bill_date: bDate,
          due_date: dDate,
          edit_reason: adj.reason || 'Penerbitan otomatis dari penetapan tunggakan TP sebelumnya',
          published_at: adj.approved_at || adj.created_at || new Date(),
          published_by: adj.approved_by || 1,
          created_at: adj.created_at || new Date(),
          updated_at: new Date()
        });
      }
    }
  } catch (err) {
    console.warn('Migration 84 warning:', err.message);
  }
};

exports.down = async function (knex) {
  // no-op
};
