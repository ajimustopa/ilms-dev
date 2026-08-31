/**
 * Migration: Refactor Planning Hierarchy to RKJP, RKJM, RKT
 * Merges old RPS & RJM into RKJM (4-5 Years) and standardizes RJJP to RKJP (8-10 Years)
 */
exports.up = async function (knex) {
  // 1. Modify ENUM column in school_work_plans to include rkjp and rkjm
  await knex.raw(`
    ALTER TABLE school_work_plans 
    MODIFY COLUMN plan_type ENUM('rkjp', 'rkjm', 'rkt', 'rjjp', 'rps', 'rjm') NOT NULL DEFAULT 'rkjm'
  `);

  // 2. Safely migrate existing data
  // Update rjjp -> rkjp
  await knex('school_work_plans')
    .where({ plan_type: 'rjjp' })
    .update({
      plan_type: 'rkjp',
      code: knex.raw("REPLACE(code, 'RJJP-', 'RKJP-')")
    });

  // Update rps -> rkjm
  await knex('school_work_plans')
    .where({ plan_type: 'rps' })
    .update({
      plan_type: 'rkjm',
      code: knex.raw("REPLACE(code, 'RPS-', 'RKJM-')")
    });

  // Update rjm -> rkjm
  await knex('school_work_plans')
    .where({ plan_type: 'rjm' })
    .update({
      plan_type: 'rkjm',
      code: knex.raw("REPLACE(code, 'RJM-', 'RKJM-')")
    });

  // 3. Fix any hierarchical links to ensure clean chain: Renstra -> RKJP -> RKJM -> RKT
  // Find RKJP
  const rkjp = await knex('school_work_plans').where({ plan_type: 'rkjp' }).first();
  if (rkjp) {
    // If an RKJM has no parent or had an inverted parent, set parent_plan_id to rkjp.id
    await knex('school_work_plans')
      .where({ plan_type: 'rkjm' })
      .whereNot({ id: rkjp.id })
      .update({
        parent_plan_id: rkjp.id
      });
  }

  // Find first RKJM to link RKTs
  const rkjm = await knex('school_work_plans').where({ plan_type: 'rkjm' }).first();
  if (rkjm) {
    await knex('school_work_plans')
      .where({ plan_type: 'rkt' })
      .update({
        parent_plan_id: rkjm.id
      });
  }
};

exports.down = async function (knex) {
  // Revert back to legacy types if rolled back
  await knex('school_work_plans')
    .where({ plan_type: 'rkjp' })
    .update({ plan_type: 'rjjp' });

  await knex('school_work_plans')
    .where({ plan_type: 'rkjm' })
    .update({ plan_type: 'rps' });
};
