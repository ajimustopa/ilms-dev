const db = require('../src/config/db/manajemen');
const projectsService = require('../src/modules/manajemen/projects/service');

async function runTest() {
  console.log('--- Testing Gantt Schedule PATCH Service ---');

  // 1. Get an existing work_plan_activity
  const act = await db('work_plan_activities').first();
  if (act) {
    console.log(`Found activity ID ${act.id}, current dates: ${act.start_date} - ${act.end_date}, progress: ${act.progress_percent}%`);

    // Test successful update
    const updatedAct = await projectsService.updateTaskGanttSchedule('activity', act.id, {
      start_date: '2026-09-01',
      end_date: '2026-09-15',
      progress_percent: 45
    });
    console.log('Updated Activity Result:', updatedAct);

    // Test invalid date validation
    try {
      await projectsService.updateTaskGanttSchedule('activity', act.id, {
        start_date: '2026-09-20',
        end_date: '2026-09-10'
      });
      console.error('FAILED: Invalid date should have thrown an error!');
    } catch (err) {
      console.log('SUCCESS: Invalid date properly caught with message:', err.message);
    }
  }

  // 2. Get an existing task
  const task = await db('tasks').first();
  if (task) {
    console.log(`Found task ID ${task.id}, current dates: ${task.start_date} - ${task.due_date}, progress: ${task.progress_percent}%`);

    const updatedTask = await projectsService.updateTaskGanttSchedule('task', task.id, {
      start_date: '2026-09-05',
      end_date: '2026-09-25',
      progress_percent: 75
    });
    console.log('Updated Task Result:', updatedTask);
  }

  // 3. Test invalid item_type
  try {
    await projectsService.updateTaskGanttSchedule('unknown', 1, {});
    console.error('FAILED: Invalid item_type should have thrown an error!');
  } catch (err) {
    console.log('SUCCESS: Invalid item_type properly caught with message:', err.message);
  }

  console.log('--- All Gantt Schedule PATCH Tests Completed Successfully ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
