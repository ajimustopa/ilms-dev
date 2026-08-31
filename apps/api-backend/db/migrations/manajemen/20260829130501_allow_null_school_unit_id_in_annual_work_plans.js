/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.raw('ALTER TABLE `annual_work_plans` MODIFY `school_unit_id` BIGINT(20) UNSIGNED NULL');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw('ALTER TABLE `annual_work_plans` MODIFY `school_unit_id` BIGINT(20) UNSIGNED NOT NULL');
};
