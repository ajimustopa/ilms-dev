/**
 * Migration: Enhance strategic_goals for RIPS Master Plan & RKJP/RKJM Trajectory Targets
 */
exports.up = async function (knex) {
  const hasColFieldSnp = await knex.schema.hasColumn('strategic_goals', 'field_snp');
  const hasColCurrentCond = await knex.schema.hasColumn('strategic_goals', 'current_condition');
  const hasColIdealCond = await knex.schema.hasColumn('strategic_goals', 'ideal_condition');
  const hasColStrategyProg = await knex.schema.hasColumn('strategic_goals', 'strategy_program');
  const hasColTrajectory = await knex.schema.hasColumn('strategic_goals', 'trajectory_targets');

  await knex.schema.alterTable('strategic_goals', (table) => {
    if (!hasColFieldSnp) table.string('field_snp', 120).nullable().after('perspective');
    if (!hasColCurrentCond) table.text('current_condition').nullable().after('target_description');
    if (!hasColIdealCond) table.text('ideal_condition').nullable().after('current_condition');
    if (!hasColStrategyProg) table.text('strategy_program').nullable().after('ideal_condition');
    if (!hasColTrajectory) table.json('trajectory_targets').nullable().after('strategy_program');
  });

  // Populate default trajectory & RIPS fields for existing data
  const existingGoals = await knex('strategic_goals').select('id', 'name', 'perspective', 'description', 'target_description', 'baseline_value', 'target_value', 'unit');
  for (const g of existingGoals) {
    let field = 'Standar Standar Nasional Pendidikan (SNP)';
    const p = String(g.perspective || '').toLowerCase();
    if (p.includes('learning') || p.includes('pembelajaran') || p.includes('santri')) field = 'Standar Kompetensi Lulusan & Proses';
    else if (p.includes('internal') || p.includes('tata kelola')) field = 'Standar Pengelolaan & Penilaian';
    else if (p.includes('stakeholder') || p.includes('pemangku')) field = 'Standar Pendidik & Tenaga Kependidikan';
    else if (p.includes('financial') || p.includes('finansial')) field = 'Standar Sarana, Prasarana & Pembiayaan';

    const bVal = g.baseline_value ? `${g.baseline_value} ${g.unit || ''}` : 'Kondisi awal berjalan';
    const tVal = g.target_value ? `${g.target_value} ${g.unit || ''}` : (g.target_description || '100% Tercapai');

    // Create a smooth default 8-year trajectory from baseline to target
    const bNum = parseFloat(g.baseline_value) || 20;
    const tNum = parseFloat(g.target_value) || 100;
    const step = (tNum - bNum) / 7;

    const traj = {
      "2026": `${Math.round(bNum + step * 1)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2027": `${Math.round(bNum + step * 2)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2028": `${Math.round(bNum + step * 3)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2029": `${Math.round(bNum + step * 4)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2030": `${Math.round(bNum + step * 5)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2031": `${Math.round(bNum + step * 6)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2032": `${Math.round(bNum + step * 6.5)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2033": `${Math.round(tNum)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2034": `${Math.round(tNum)}${g.unit ? ` ${g.unit}` : '%'}`,
      "2035": `${Math.round(tNum)}${g.unit ? ` ${g.unit}` : '%'}`
    };

    await knex('strategic_goals')
      .where({ id: g.id })
      .update({
        field_snp: field,
        current_condition: bVal,
        ideal_condition: tVal,
        strategy_program: g.description || `Program Akselerasi ${g.name}`,
        trajectory_targets: JSON.stringify(traj)
      });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('strategic_goals', (table) => {
    table.dropColumn('field_snp');
    table.dropColumn('current_condition');
    table.dropColumn('ideal_condition');
    table.dropColumn('strategy_program');
    table.dropColumn('trajectory_targets');
  });
};
