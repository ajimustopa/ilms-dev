const db = require('../src/config/db/manajemen');
const planningService = require('../src/modules/manajemen/planning/service');

async function testPriorityVerification() {
  console.log('--- TEST FITUR 5: PROGRAM PRIORITAS KELEMBAGAAN ---');

  try {
    // 1. Get an existing program
    let progList = await planningService.listPrograms(null, {});
    let progId = progList[0]?.id;
    if (!progId) {
      const newP = await planningService.createProgram({
        title: 'Program Kurikulum 2026',
        unit_name: 'Bidang Kurikulum'
      });
      progId = newP.id;
    }

    // 2. Set Program Priority
    const updatedProg = await planningService.setProgramPriority(progId, {
      is_priority: true,
      priority_level: 'high',
      priority_reason: 'Mandat Renstra Yayasan untuk Akreditasi Unggul & Smart Digital Learning'
    });
    console.log('1. Set Program Priority OK:', updatedProg.id, 'is_priority:', updatedProg.is_priority, 'level:', updatedProg.priority_level);

    // 3. Query list with filter is_priority=true
    const priorityList = await planningService.listPrograms(null, { is_priority: true });
    console.log('2. Priority list count:', priorityList.length);
    if (priorityList.length === 0) throw new Error('Expected at least 1 priority program');

    // 4. Query program detail with activities, tasks, risks
    const detail = await planningService.getProgramById(progId);
    console.log('3. Priority program detail activities count:', detail.activities.length, 'tasks count:', detail.tasks.length, 'risks count:', detail.risks.length);

    console.log('--- ALL FITUR 5 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 5 TEST ERROR:', err);
    process.exit(1);
  }
}

testPriorityVerification();
