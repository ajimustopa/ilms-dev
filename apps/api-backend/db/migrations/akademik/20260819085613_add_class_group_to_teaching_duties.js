/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasStaClassGroup = await knex.schema.hasColumn('subject_teacher_assignments', 'class_group_id');
  if (!hasStaClassGroup) {
    await knex.schema.alterTable('subject_teacher_assignments', (table) => {
      table.bigInteger('class_group_id').unsigned().nullable()
        .references('id').inTable('class_groups').onDelete('SET NULL');
      table.index(['class_group_id'], 'idx_sta_class_group');
    });
  }

  const hasLogClassGroup = await knex.schema.hasColumn('subject_teacher_assignment_logs', 'class_group_id');
  if (!hasLogClassGroup) {
    await knex.schema.alterTable('subject_teacher_assignment_logs', (table) => {
      table.bigInteger('class_group_id').unsigned().nullable();
      table.string('class_group_name', 100).nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasStaClassGroup = await knex.schema.hasColumn('subject_teacher_assignments', 'class_group_id');
  if (hasStaClassGroup) {
    await knex.schema.alterTable('subject_teacher_assignments', (table) => {
      table.dropForeign(['class_group_id'], 'subject_teacher_assignments_class_group_id_foreign');
      table.dropColumn('class_group_id');
    });
  }

  const hasLogClassGroup = await knex.schema.hasColumn('subject_teacher_assignment_logs', 'class_group_id');
  if (hasLogClassGroup) {
    await knex.schema.alterTable('subject_teacher_assignment_logs', (table) => {
      table.dropColumn('class_group_name');
      table.dropColumn('class_group_id');
    });
  }
};
