const db = require('../src/config/db/manajemen');
const projectsService = require('../src/modules/manajemen/projects/service');

async function testTaskHubVerification() {
  console.log('--- TEST FITUR 10: TASK HUB TERINTEGRASI (RENOP, CHECKLIST, KANBAN, FILTERS) ---');

  try {
    // 1. Get an existing employee from db_kepegawaian or fallback
    let employeeId = 1;
    try {
      const dbKep = require('../src/config/db/kepegawaian');
      const emp = await dbKep('employees').first();
      if (emp) employeeId = emp.id;
    } catch (e) {}

    // 2. Create Task with link to Renop Activity and initial checklists
    const task = await projectsService.createTask({
      title: 'Validasi Dokumen RPP Berdiferensiasi Guru SMA',
      description: 'Review kelayakan perangkat ajar kurikulum sains & bahasa',
      reference_type: 'renop_activity',
      reference_id: 1,
      relation_code: 'ACT-01',
      relation_name: 'Workshop Modul Ajar SMA',
      assignee_employee_id: employeeId,
      priority: 'high',
      status: 'todo',
      due_date: new Date().toISOString().slice(0, 10), // Today
      checklists: [
        'Kumpulkan draft modul ajar',
        'Review capaian pembelajaran',
        'Pengesahan Kepala Sekolah'
      ]
    }, 1);

    console.log('1. Created Task OK -> ID:', task.id, 'Title:', task.title, 'Checklists:', task.checklists?.length);
    if (!task.checklists || task.checklists.length !== 3) throw new Error('Expected 3 initial checklists');
    if (task.progress_percent !== 0 || task.status !== 'todo') throw new Error('Expected 0% progress and todo status');

    // 3. Toggle First Checklist (1 / 3 = 33%)
    const chk1 = task.checklists[0];
    const taskAfterChk1 = await projectsService.toggleTaskChecklist(chk1.id, true, 1);
    console.log('2. Toggle 1 Checklist OK -> Progress:', taskAfterChk1.progress_percent, '% Status:', taskAfterChk1.status);
    if (taskAfterChk1.progress_percent !== 33 || taskAfterChk1.status !== 'in_progress') {
      throw new Error(`Expected 33% progress and in_progress status, got ${taskAfterChk1.progress_percent} & ${taskAfterChk1.status}`);
    }

    // 4. Toggle Remaining 2 Checklists (3 / 3 = 100% -> Auto 'done')
    await projectsService.toggleTaskChecklist(task.checklists[1].id, true, 1);
    const taskAfterAll = await projectsService.toggleTaskChecklist(task.checklists[2].id, true, 1);
    console.log('3. Toggle All Checklists OK -> Progress:', taskAfterAll.progress_percent, '% Status:', taskAfterAll.status);
    if (taskAfterAll.progress_percent !== 100 || taskAfterAll.status !== 'done') {
      throw new Error('Expected 100% progress and done status');
    }

    // 5. Add Comment
    const comment = await projectsService.addComment(task.id, {
      comment: 'Seluruh modul ajar telah selesai ditinjau dan disahkan oleh Kepala Sekolah.'
    }, 1);
    console.log('4. Added Comment OK -> ID:', comment.id, 'Comment:', comment.comment);

    // 6. Test Time Filters (Today Filter)
    const todayTasks = await projectsService.listTasks(null, { time_filter: 'today' });
    console.log('5. Time Filter "today" OK -> Found:', todayTasks.length, 'tasks');
    if (todayTasks.length === 0) throw new Error('Expected to find created task in today filter');

    // 7. Test Kanban Status Quick Update
    const taskMoved = await projectsService.updateTaskStatus(task.id, 'in_progress', 1);
    console.log('6. Kanban Quick-Move OK -> Status:', taskMoved.status);

    // 8. Clean up test task
    await projectsService.deleteTask(task.id);
    console.log('7. Clean up task OK');

    console.log('--- ALL FITUR 10 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 10 TEST ERROR:', err);
    process.exit(1);
  }
}

testTaskHubVerification();
