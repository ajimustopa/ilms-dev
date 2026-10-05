/**
 * Migration: Add child_pin_plain to canteen_students
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('canteen_students', 'child_pin_plain');
  if (!hasCol) {
    await knex.schema.table('canteen_students', function(table) {
      table.string('child_pin_plain', 20).nullable().defaultTo('123456');
    });

    // Isi existing null values dengan '123456'
    await knex('canteen_students')
      .whereNull('child_pin_plain')
      .update({ child_pin_plain: '123456' });
  }
};

exports.down = function(knex) {
  return knex.schema.table('canteen_students', function(table) {
    table.dropColumn('child_pin_plain');
  });
};
