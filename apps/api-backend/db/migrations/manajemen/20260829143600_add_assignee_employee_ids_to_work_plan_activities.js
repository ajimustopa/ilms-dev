/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('work_plan_activities', 'assignee_employee_ids');
  if (!hasColumn) {
    await knex.schema.alterTable('work_plan_activities', (table) => {
      table.json('assignee_employee_ids').nullable().after('assignee_employee_id');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('work_plan_activities', 'assignee_employee_ids');
  if (hasColumn) {
    await knex.schema.alterTable('work_plan_activities', (table) => {
      table.dropColumn('assignee_employee_ids');
    });
  }
};
