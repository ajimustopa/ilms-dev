const db = require('../src/config/db/manajemen');
const projectsService = require('../src/modules/manajemen/projects/service');

async function runRegressionQA() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE QA & REGRESSION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Backend getTasksGantt with various filters
  // ----------------------------------------------------
  console.log('\n--- 1. Testing GET /api/v1/manajemen/tasks/gantt filter combinations ---');
  
  // 1a. Default foundation context (all tasks)
  const defaultGantt = await projectsService.getTasksGantt({});
  assert(Array.isArray(defaultGantt), 'Default Gantt returns an array');
  console.log(`   Fetched ${defaultGantt.length} items for default context`);

  // 1b. School unit context
  const unitGantt = await projectsService.getTasksGantt({ school_unit_id: 1 });
  assert(Array.isArray(unitGantt), 'School Unit filtered Gantt returns an array');

  // 1c. Specific RIPS Program context
  const program = await db('annual_work_plans').first();
  if (program) {
    const programGantt = await projectsService.getTasksGantt({ rips_program_id: program.id });
    assert(Array.isArray(programGantt), `Program ${program.id} Gantt returns array of activities`);
    if (programGantt.length > 0) {
      assert(programGantt[0].item_type === 'activity', 'Program items have item_type = "activity"');
      assert(programGantt[0].id.startsWith('act-'), 'Activity IDs are prefixed with "act-"');
    }
  }

  // 1d. Specific Generic Project context
  const project = await db('projects').first();
  if (project) {
    const projectGantt = await projectsService.getTasksGantt({ project_id: project.id });
    assert(Array.isArray(projectGantt), `Project ${project.id} Gantt returns array of tasks`);
    if (projectGantt.length > 0) {
      assert(projectGantt[0].item_type === 'task', 'Project items have item_type = "task"');
      assert(projectGantt[0].id.startsWith('task-'), 'Task IDs are prefixed with "task-"');
    }
  }

  // ----------------------------------------------------
  // TEST 2: PATCH /tasks/gantt/:item_type/:raw_id/schedule
  // ----------------------------------------------------
  console.log('\n--- 2. Testing PATCH Schedule update & validation edge cases ---');

  const act = await db('work_plan_activities').first();
  if (act) {
    // Valid update
    const updated = await projectsService.updateTaskGanttSchedule('activity', act.id, {
      start_date: '2026-09-01',
      end_date: '2026-09-20',
      progress_percent: 80,
    });
    assert(updated && updated.id === `act-${act.id}`, 'Activity schedule updated successfully');
    assert(updated.progress_percent === 80, 'Progress percent updated to 80%');

    // Invalid date range (end_date < start_date)
    let invalidDateCaught = false;
    try {
      await projectsService.updateTaskGanttSchedule('activity', act.id, {
        start_date: '2026-10-15',
        end_date: '2026-10-01',
      });
    } catch (e) {
      invalidDateCaught = true;
      assert(e.statusCode === 400, 'Invalid date range throws 400 Bad Request');
    }
    assert(invalidDateCaught, 'Validation caught end_date < start_date');
  }

  const task = await db('tasks').first();
  if (task) {
    const updatedTask = await projectsService.updateTaskGanttSchedule('task', task.id, {
      start_date: '2026-09-05',
      end_date: '2026-09-25',
      progress_percent: 100,
    });
    assert(updatedTask && updatedTask.id === `task-${task.id}`, 'Task schedule updated successfully');
    assert(updatedTask.status === 'done', 'Progress 100% automatically sets task status to "done"');
  }

  // Invalid item_type validation
  let invalidTypeCaught = false;
  try {
    await projectsService.updateTaskGanttSchedule('invalid_type', 999, {});
  } catch (e) {
    invalidTypeCaught = true;
    assert(e.statusCode === 400, 'Invalid item_type throws 400 Bad Request');
  }
  assert(invalidTypeCaught, 'Validation caught invalid item_type');

  // Non-existent ID validation
  let notFoundCaught = false;
  try {
    await projectsService.updateTaskGanttSchedule('activity', 99999999, { start_date: '2026-09-01' });
  } catch (e) {
    notFoundCaught = true;
    assert(e.statusCode === 404, 'Non-existent raw_id throws 404 Not Found');
  }
  assert(notFoundCaught, 'Validation caught non-existent ID');

  // ----------------------------------------------------
  // TEST 3: Dashboard Stats Aggregation
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Dashboard Progress Statistics ---');
  const stats = await projectsService.getTasksProgressDashboard();
  assert(typeof stats.total_tasks === 'number', 'Dashboard total_tasks is a number');
  assert(typeof stats.completed_tasks === 'number', 'Dashboard completed_tasks is a number');
  assert(typeof stats.in_progress_tasks === 'number', 'Dashboard in_progress_tasks is a number');
  assert(typeof stats.avg_progress_percent === 'number', 'Dashboard avg_progress_percent is a number');
  console.log('   Dashboard Aggregates:', stats);

  console.log('\n====================================================');
  console.log(`📊 QA RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================');

  process.exit(passed === total ? 0 : 1);
}

runRegressionQA().catch((err) => {
  console.error('QA script fatal error:', err);
  process.exit(1);
});
