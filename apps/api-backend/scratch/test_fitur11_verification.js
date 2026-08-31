const db = require('../src/config/db/manajemen');
const projectsService = require('../src/modules/manajemen/projects/service');

async function testFitur11Verification() {
  console.log('--- TEST FITUR 11: TIMELINE, KALENDER, AGENDA & REMINDER ---');

  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Test Agenda Creation
    const agenda = await projectsService.createAgenda({
      title: 'Rapat Pleno Evaluasi Program Mutu Semester Ganjil',
      category: 'evaluasi',
      description: 'Review capaian KPI dan tindak lanjut mitigasi risiko',
      start_date: todayStr,
      start_time: '09:00',
      end_date: todayStr,
      end_time: '11:30',
      location: 'Ruang Rapat Utama Gedung Pusat',
      pic_employee_id: 1,
      status: 'scheduled'
    }, 1);

    console.log('1. Created Agenda OK -> ID:', agenda.id, 'Title:', agenda.title);

    // 2. Test 5 Agenda Buckets
    const buckets = await projectsService.getAgendaBuckets(null);
    console.log('2. Agenda Buckets OK -> Today:', buckets.today.length, 'Overdue:', buckets.overdue.length, 'Upcoming:', buckets.upcoming.length);
    if (!buckets.today || !buckets.tomorrow || !buckets.week || !buckets.upcoming || !buckets.overdue) {
      throw new Error('Expected all 5 buckets to be defined');
    }

    // 3. Test Calendar Events Aggregation
    const calEvents = await projectsService.getCalendarEvents(null);
    console.log('3. Calendar Events Aggregated OK -> Total Events:', calEvents.length);
    const foundAgenda = calEvents.find(e => e.type === 'agenda' && e.original_id === agenda.id);
    if (!foundAgenda) throw new Error('Expected created agenda in calendar events');

    // 4. Test Hierarchical Gantt Timeline
    const timeline = await projectsService.getHierarchicalTimeline(null);
    console.log('4. Hierarchical Gantt Timeline OK -> Programs Count:', timeline.length);

    // 5. Test Reminder Generator & Idempotency (Strict duplicate prevention)
    const remRun1 = await projectsService.generateDueReminders(null);
    console.log('5. Reminder Generator 1st Run OK -> Created:', remRun1.created_reminders_count);

    const remRun2 = await projectsService.generateDueReminders(null);
    console.log('6. Reminder Generator 2nd Run (Idempotency check) OK -> Created:', remRun2.created_reminders_count);
    if (remRun2.created_reminders_count !== 0) {
      throw new Error('Expected 0 reminders on second run due to unique constraint');
    }

    // 6. Test In-App Notifications List & Read
    const notifs = await projectsService.listNotifications(1);
    console.log('7. Notifications List OK -> Count:', notifs.notifications.length, 'Unread:', notifs.unread_count);

    if (notifs.notifications.length > 0) {
      const firstId = notifs.notifications[0].id;
      await projectsService.markNotificationAsRead(firstId, 1);
      const afterRead = await projectsService.listNotifications(1);
      console.log('8. Mark Read OK -> Unread Count:', afterRead.unread_count);
    }

    // Clean up test agenda
    await projectsService.deleteAgenda(agenda.id);
    console.log('9. Clean up Agenda OK');

    console.log('--- ALL FITUR 11 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 11 TEST ERROR:', err);
    process.exit(1);
  }
}

testFitur11Verification();
