/**
 * Migration: Expand psb_tests, psb_test_sessions, and psb_registrants for selection tests & announcements
 */
exports.up = async function(knex) {
  // 1. Expand psb_tests
  const hasTestType = await knex.schema.hasColumn('psb_tests', 'test_type');
  if (!hasTestType) {
    await knex.schema.alterTable('psb_tests', function(table) {
      table.string('test_type', 50).defaultTo('academic').after('name');
      table.decimal('weight_percentage', 5, 2).defaultTo(100.00).after('passing_score');
    });
  }

  // 2. Expand psb_test_sessions
  const hasRoom = await knex.schema.hasColumn('psb_test_sessions', 'room_location');
  if (!hasRoom) {
    await knex.schema.alterTable('psb_test_sessions', function(table) {
      table.string('room_location', 100).nullable().after('scheduled_at');
      table.string('examiner_name', 150).nullable().after('room_location');
      table.text('notes').nullable().after('examiner_name');
    });
  }

  // 3. Expand psb_registrants
  const hasScore = await knex.schema.hasColumn('psb_registrants', 'final_selection_score');
  if (!hasScore) {
    await knex.schema.alterTable('psb_registrants', function(table) {
      table.decimal('final_selection_score', 5, 2).nullable().after('status');
      table.string('selection_decision', 50).nullable().after('final_selection_score');
      table.dateTime('selection_decided_at').nullable().after('selection_decision');
      table.string('decision_letter_number', 100).nullable().after('selection_decided_at');
      table.text('announcement_notes').nullable().after('decision_letter_number');
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.alterTable('psb_registrants', function(table) {
    table.dropColumn('announcement_notes');
    table.dropColumn('decision_letter_number');
    table.dropColumn('selection_decided_at');
    table.dropColumn('selection_decision');
    table.dropColumn('final_selection_score');
  });

  await knex.schema.alterTable('psb_test_sessions', function(table) {
    table.dropColumn('notes');
    table.dropColumn('examiner_name');
    table.dropColumn('room_location');
  });

  await knex.schema.alterTable('psb_tests', function(table) {
    table.dropColumn('weight_percentage');
    table.dropColumn('test_type');
  });
};
