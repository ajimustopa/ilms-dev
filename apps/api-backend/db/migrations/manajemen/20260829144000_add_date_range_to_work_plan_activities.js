/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasStartDate = await knex.schema.hasColumn('work_plan_activities', 'start_date');
  const hasEndDate = await knex.schema.hasColumn('work_plan_activities', 'end_date');
  
  await knex.schema.alterTable('work_plan_activities', (table) => {
    if (!hasStartDate) table.date('start_date').nullable().after('activity_date');
    if (!hasEndDate) table.date('end_date').nullable().after('start_date');
  });

  // Isi data eksisting dari activity_date jika ada
  await knex.raw('UPDATE `work_plan_activities` SET `start_date` = `activity_date`, `end_date` = `activity_date` WHERE `start_date` IS NULL AND `activity_date` IS NOT NULL');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasStartDate = await knex.schema.hasColumn('work_plan_activities', 'start_date');
  const hasEndDate = await knex.schema.hasColumn('work_plan_activities', 'end_date');

  await knex.schema.alterTable('work_plan_activities', (table) => {
    if (hasEndDate) table.dropColumn('end_date');
    if (hasStartDate) table.dropColumn('start_date');
  });
};
