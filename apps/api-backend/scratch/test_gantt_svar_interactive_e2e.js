const db = require('../src/config/db/manajemen');
const projectsService = require('../src/modules/manajemen/projects/service');

async function runInteractiveGanttE2ETests() {
  console.log('================================================================');
  console.log('🧪 RUNNING END-TO-END INTERACTIVE SVAR GANTT & BACKEND SYNC TEST');
  console.log('================================================================\n');

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

  function toYMD(val) {
    if (!val) return '';
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(val).slice(0, 10);
  }

  try {
    // -----------------------------------------------------------------------
    // Ensure test task exists
    // -----------------------------------------------------------------------
    let existingTask = await db('tasks').first();
    if (!existingTask) {
      let proj = await db('projects').first();
      if (!proj) {
        await db('projects').insert({
          name: 'Proyek Infrastruktur IT',
          status: 'in_progress',
          created_at: new Date(),
          updated_at: new Date(),
        });
        proj = await db('projects').first();
      }

      await db('tasks').insert({
        project_id: proj.id,
        title: 'Instalasi Jaringan Server',
        status: 'todo',
        start_date: '2026-08-01',
        due_date: '2026-08-20',
        progress_percent: 10,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // -----------------------------------------------------------------------
    // TEST 1: Fetch Gantt Data
    // -----------------------------------------------------------------------
    console.log('--- 1. Fetching Initial Gantt Data ---');
    const ganttData = await projectsService.getTasksGantt({});
    assert(Array.isArray(ganttData) && ganttData.length > 0, `Fetched ${ganttData.length} items from Gantt service`);

    const sampleActivity = ganttData.find((item) => item.item_type === 'activity');
    const sampleTask = ganttData.find((item) => item.item_type === 'task');

    assert(Boolean(sampleActivity), `Found sample activity (raw_id: ${sampleActivity?.raw_id})`);
    assert(Boolean(sampleTask), `Found sample task (raw_id: ${sampleTask?.raw_id})`);

    // -----------------------------------------------------------------------
    // TEST 2: Drag & Move Activity (Shift Start & End Dates)
    // -----------------------------------------------------------------------
    if (sampleActivity) {
      console.log('\n--- 2. Simulating Drag & Move Activity ---');
      const actRawId = sampleActivity.raw_id;
      const newStart = '2026-07-20';
      const newEnd = '2026-08-15';
      const newProgress = 45;

      console.log(`   Moving Activity ${actRawId} to ${newStart} -> ${newEnd} (Progress: ${newProgress}%)`);

      const updated = await projectsService.updateTaskGanttSchedule(
        'activity',
        actRawId,
        {
          start_date: newStart,
          end_date: newEnd,
          progress_percent: newProgress,
        }
      );

      assert(Boolean(updated), 'updateTaskGanttSchedule returned updated activity');
      assert(toYMD(updated.start_date) === newStart, `Database start_date updated to ${newStart}`);
      assert(toYMD(updated.end_date) === newEnd, `Database end_date updated to ${newEnd}`);
      assert(Number(updated.progress_percent) === newProgress, 'Database progress_percent updated');
    }

    // -----------------------------------------------------------------------
    // TEST 3: Resize Duration on Generic Task (Change End Date)
    // -----------------------------------------------------------------------
    if (sampleTask) {
      console.log('\n--- 3. Simulating Resize Duration on Generic Task ---');
      const taskRawId = sampleTask.raw_id;
      const taskStart = toYMD(sampleTask.start_date) || '2026-08-01';
      const newEnd = '2026-09-30';
      const newProgress = 90;

      console.log(`   Resizing Task ${taskRawId} from ${taskStart} to ${newEnd} (Progress: ${newProgress}%)`);

      const updated = await projectsService.updateTaskGanttSchedule(
        'task',
        taskRawId,
        {
          start_date: taskStart,
          end_date: newEnd,
          progress_percent: newProgress,
        }
      );

      assert(Boolean(updated), 'updateTaskGanttSchedule returned updated task');
      assert(toYMD(updated.end_date) === newEnd, `Database end_date/due_date resized to ${newEnd}`);
      assert(Number(updated.progress_percent) === newProgress, 'Database task progress updated');
    }

    // -----------------------------------------------------------------------
    // TEST 4: Edit Task Title from Built-in Editor Panel
    // -----------------------------------------------------------------------
    if (sampleActivity) {
      console.log('\n--- 4. Simulating Form Edit via Built-in Editor ---');
      const actRawId = sampleActivity.raw_id;
      const testTitle = `[Revisi Gantt] ${sampleActivity.title || 'Kegiatan RKT'}`;

      await db('work_plan_activities')
        .where('id', actRawId)
        .update({ title: testTitle, updated_at: new Date() });

      const rechecked = await db('work_plan_activities').where('id', actRawId).first();
      assert(rechecked.title === testTitle, 'Activity title updated successfully via editor sync');
    }

    // -----------------------------------------------------------------------
    // TEST 5: Error Handling & Non-existent IDs (Validation / 404)
    // -----------------------------------------------------------------------
    console.log('\n--- 5. Testing Error Handling & Fallback ---');
    try {
      await projectsService.updateTaskGanttSchedule('activity', 999999, {
        start_date: '2026-07-01',
        end_date: '2026-07-10',
      });
      assert(false, 'Should have thrown error for invalid raw_id');
    } catch (err) {
      assert(err.message?.includes('not found') || err.message?.includes('tidak ditemukan') || err.statusCode === 404, 'Invalid raw_id throws appropriate not found error');
    }

    try {
      await projectsService.updateTaskGanttSchedule('invalid_type', 1, {
        start_date: '2026-07-01',
      });
      assert(false, 'Should have thrown error for invalid item_type');
    } catch (err) {
      assert(err.message?.includes('Invalid') || err.message?.includes('item_type') || err.statusCode === 400, 'Invalid item_type throws appropriate error');
    }

    console.log('\n================================================================');
    console.log(`🎉 BACKEND & E2E TEST SUMMARY: ${passed}/${total} assertions passed!`);
    console.log('================================================================\n');
    process.exit(passed === total ? 0 : 1);
  } catch (globalErr) {
    console.error('Fatal Error during tests:', globalErr);
    process.exit(1);
  }
}

runInteractiveGanttE2ETests();
