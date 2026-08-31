const db = require('../src/config/db/manajemen');
const planningService = require('../src/modules/manajemen/planning/service');
const qualityService = require('../src/modules/manajemen/quality/service');
const evaluationService = require('../src/modules/manajemen/evaluation/service');
const projectsService = require('../src/modules/manajemen/projects/service');

async function testFitur14EndToEndFlow() {
  console.log('=== TEST FITUR 14: SIMULASI END-TO-END SISTEM PERENCANAAN TERINTEGRASI ===');

  try {
    const schoolUnitId = 1;
    const userId = 1;

    // PRE-CLEANUP
    await db('approval_actions').where('notes', 'like', '%E2E%').orWhere('notes', 'like', '%pengesahan%').delete().catch(() => {});
    await db('evaluation_follow_ups').where('issue', 'like', '%kosakata%').orWhere('source_code', 'like', '%E2E%').delete().catch(() => {});
    await db('task_checklists').where('title', 'like', '%silabus%').delete().catch(() => {});
    await db('tasks').where('title', 'like', '%E2E%').delete().catch(() => {});
    await db('work_plan_activities').where('code', 'like', '%E2E%').delete().catch(() => {});
    await db('work_plan_programs').where('code', 'like', '%E2E%').delete().catch(() => {});
    await db('school_work_plans').where('title', 'like', '%E2E%').delete().catch(() => {});
    await db('quality_indicator_achievements').where('notes', 'like', '%toefl%').delete().catch(() => {});
    await db('quality_indicators').where('code', 'like', '%E2E%').delete().catch(() => {});
    await db('strategic_goals').where('code', 'like', '%E2E%').delete().catch(() => {});
    await db('institution_development_plans').where('title', 'like', '%E2E%').delete().catch(() => {});

    // STEP 1: Buat Renstra Lembaga (RIPS)
    const renstra = await planningService.createRips({
      school_unit_id: schoolUnitId,
      plan_type: 'renstra',
      title: 'Rencana Strategis Mutu Unggul 2026-2030 (E2E Test)',
      vision: 'Menjadi Lembaga Pendidikan Islam Modern Rujukan Nasional Berkarakter Qurani',
      mission: '1. Menyelenggarakan pendidikan holistik; 2. Mengembangkan sarana berbasis TIK; 3. Mewujudkan tata kelola akuntabel',
      period_start: 2026,
      period_end: 2030,
      status: 'active'
    }, userId);
    console.log('1. [RENSTRA] Created OK -> ID:', renstra.id, 'Title:', renstra.title);

    // STEP 2: Buat Sasaran Strategis (BSC)
    const goal = await planningService.createStrategicGoal({
      institution_development_plan_id: renstra.id,
      code: 'SS-E2E-01',
      name: 'Peningkatan Daya Saing Lulusan Berstandar Internasional',
      perspective: 'learning_growth',
      baseline_year: 2025,
      baseline_value: 70,
      target_value: 90,
      unit: '%',
      weight: 25.00
    }, userId);
    console.log('2. [SASARAN STRATEGIS] Created OK -> ID:', goal.id, 'Code:', goal.code, 'Perspective:', goal.perspective);

    // STEP 3: Buat Kamus Indikator KPI
    const kpi = await qualityService.createIndicator({
      school_unit_id: schoolUnitId,
      code: 'KPI-E2E-01',
      name: 'Rata-rata Skor Kemahiran Berbahasa Arab & Inggris Santri',
      category: 'akademik',
      unit_of_measure: 'Poin',
      target_value: 85,
      strategic_goal_id: goal.id,
      calculation_method: 'higher_is_better'
    }, userId);
    console.log('3. [KAMUS KPI] Created OK -> ID:', kpi.id, 'Code:', kpi.code, 'Goal Linked:', kpi.strategic_goal_id);

    // STEP 4: Input Realisasi & Capaian KPI
    const kpiAch = await qualityService.recordAchievement(kpi.id, {
      period: 'Semester Ganjil 2026/2027',
      actual_value: 88,
      evidence_url: 'https://storage.aldepos.sch.id/evidence/language_score.pdf',
      notes: 'Hasil tes toefl/toAfl internal santri'
    }, userId);
    console.log('4. [KPI ACHIEVEMENT] Recorded OK -> Actual:', kpiAch.actual_value, 'Achievement %:', kpiAch.achievement_percentage);

    // STEP 5: Buat Dokumen Rencana Kerja Tahunan (RKT)
    const rkt = await planningService.createRks({
      school_unit_id: schoolUnitId,
      academic_year_id: 1,
      title: 'RKT Unggulan Akademik & Bahasa TA 2026/2027 (E2E Test)',
      plan_type: 'rkt',
      period_start_year: 2026,
      period_end_year: 2027,
      status: 'draft',
      total_budget: 150000000
    }, userId);
    console.log('5. [RKT] Created OK -> ID:', rkt.id, 'Title:', rkt.title);

    // STEP 6: Buat Program Kerja & Tandai sebagai Program Prioritas
    const prog = await planningService.createProgram({
      school_work_plan_id: rkt.id,
      strategic_goal_id: goal.id,
      quality_indicator_id: kpi.id,
      code: 'PRG-E2E-01',
      title: 'Program Akselerasi Native Speaker & Digital Language Lab',
      description: 'Peningkatan jam terbang berbahasa santri melalui tutor asing dan laboratorium TIK',
      budget_estimate: 75000000,
      budget_realization: 70000000,
      is_priority: 1,
      priority_level: 'high',
      priority_reason: 'Kebutuhan akreditasi internasional dan daya saing global santri',
      progress_percentage: 80,
      status: 'in_progress',
      pic_employee_id: 1
    }, userId);
    console.log('6. [PROGRAM PRIORITAS] Created OK -> ID:', prog.id, 'Code:', prog.code, 'Priority:', prog.is_priority);

    // STEP 7: Buat Kegiatan Renop
    const act = await planningService.createActivity({
      work_plan_program_id: prog.id,
      code: 'ACT-E2E-01',
      name: 'Workshop Pelatihan Intensif Guru Bahasa Asing',
      output: '20 Guru tersertifikasi',
      target_output: 20,
      unit: 'Orang',
      start_date: '2026-09-01',
      end_date: '2026-09-05',
      pic_employee_id: 1,
      progress_percent: 100,
      status: 'completed'
    }, userId);
    console.log('7. [RENOP KEGIATAN] Created OK -> ID:', act.id, 'Code:', act.code, 'Name:', act.name);

    // STEP 8: Buat Task Hub & Checklist
    const task = await projectsService.createTask({
      school_unit_id: schoolUnitId,
      title: 'Penyusunan Modul Ajar Bahasa Arab Berbasis Multimedia (E2E Test)',
      reference_type: 'renop_activity',
      reference_id: act.id,
      relation_code: act.code,
      relation_name: act.name,
      assignee_employee_id: 1,
      priority: 'high',
      due_date: '2026-09-10',
      status: 'in_progress',
      checklists: ['Rancang silabus', 'Uji coba materi', 'Cetak modul']
    }, { id: userId, employee_id: 1 });
    console.log('8. [TASK HUB] Created OK -> ID:', task.id, 'Title:', task.title, 'Status:', task.status);

    // STEP 9: Buat Rencana Tindak Lanjut (RTL) Temuan Monev
    const rtl = await evaluationService.createFollowUp({
      school_unit_id: schoolUnitId,
      source_type: 'kpi',
      source_id: kpi.id,
      source_code: kpi.code,
      source_name: kpi.name,
      issue: 'Perlu penguatan kosakata spesifik sains pada santri kelas akhir',
      deviation_analysis: 'Analisis menunjukkan santri kuat di percakapan umum namun perlu suplemen istilah sains',
      action_plan: 'Penerbitan kamus saku dwibahasa tematik sains dan teknologi',
      pic_employee_id: 1,
      deadline: '2026-10-15',
      status: 'in_progress',
      progress_percent: 50
    }, userId);
    console.log('9. [RTL MONEV] Created OK -> ID:', rtl.id, 'Issue:', rtl.issue, 'Status:', rtl.status);

    // STEP 10: Pengajuan Persetujuan Berjenjang (Approval Request) Dokumen RKT
    const workflows = await projectsService.listWorkflows(schoolUnitId);
    const wf = workflows.find(w => w.applies_to === 'school_work_plan') || workflows[0];

    const approvalReq = await projectsService.createApprovalRequest({
      approval_workflow_id: wf.id,
      school_unit_id: schoolUnitId,
      reference_type: 'school_work_plan',
      reference_id: rkt.id,
      requested_by_employee_id: 1,
      notes: 'Pengajuan pengesahan dokumen RKT TA 2026/2027 melalui alur multi-jenjang'
    }, { id: userId, employee_id: 1 });
    console.log('10. [APPROVAL SUBMIT] Created OK -> ID:', approvalReq.id, 'Workflow:', approvalReq.workflow_name, 'Step:', approvalReq.current_step);

    // STEP 11: Proses Tindakan Persetujuan Berjenjang hingga Final Approved
    // Step 1 Approved
    const step1 = await projectsService.actOnApprovalRequest(approvalReq.id, {
      action: 'approved',
      approver_employee_id: 1,
      notes: 'Disetujui Waka'
    }, { id: 1 });
    console.log('11a. [APPROVAL STEP 1] Approved -> Current Step:', step1.current_step);

    // Step 2 Approved (Final)
    const step2 = await projectsService.actOnApprovalRequest(approvalReq.id, {
      action: 'approved',
      approver_employee_id: 2,
      notes: 'Disahkan oleh Kepala Satuan Pendidikan'
    }, { id: 2 });
    console.log('11b. [APPROVAL STEP 2] Final Approved -> Status:', step2.status);
    if (step2.status !== 'approved') throw new Error('Expected final approved status');

    // STEP 12: Uji Dashboard Eksekutif Agregat
    const dashboard = await planningService.getExecutiveDashboard(schoolUnitId);
    console.log('12. [EXECUTIVE DASHBOARD] Live Metrics Summary:');
    console.log('   - Renstra Aktif:', dashboard.strategic.active_renstra?.title);
    console.log('   - Total Sasaran BSC:', dashboard.strategic.total_goals);
    console.log('   - Total Program Kerja:', dashboard.programs.total_programs, '(Prioritas:', dashboard.programs.priority_programs_count, ')');
    console.log('   - Pagu Anggaran Rencana:', dashboard.programs.total_budget_estimate, 'Realisasi:', dashboard.programs.total_budget_realization);
    console.log('   - Kamus KPI Terpantau:', dashboard.kpi.total_indicators, '(Rata-rata Capaian:', dashboard.kpi.avg_achievement_percentage, '%)');
    console.log('   - Total Tasks Terpantau:', dashboard.tasks.total_tasks);
    console.log('   - Total RTL Terdaftar:', dashboard.rtl.total_rtl);
    console.log('   - Total Approval Requests:', dashboard.approvals.total_requests);

    // Validation checks
    if (!dashboard.strategic.active_renstra) throw new Error('Expected active renstra in executive dashboard');
    if (dashboard.programs.priority_programs_count < 1) throw new Error('Expected at least 1 priority program');

    // STEP 13: Clean up test fixtures created during E2E simulation
    await db('approval_actions').where({ approval_request_id: approvalReq.id }).delete();
    await db('approval_requests').where({ id: approvalReq.id }).delete();
    await db('evaluation_follow_ups').where({ id: rtl.id }).delete();
    await db('task_checklists').where({ task_id: task.id }).delete();
    await db('tasks').where({ id: task.id }).delete();
    await db('work_plan_activities').where({ id: act.id }).delete();
    await db('work_plan_programs').where({ id: prog.id }).delete();
    await db('school_work_plans').where({ id: rkt.id }).delete();
    await db('quality_indicator_achievements').where({ id: kpiAch.id }).delete();
    await db('quality_indicators').where({ id: kpi.id }).delete();
    await db('strategic_goals').where({ id: goal.id }).delete();
    await db('institution_development_plans').where({ id: renstra.id }).delete();
    console.log('13. Clean up E2E test data completed OK');

    console.log('=== ALL FITUR 14 END-TO-END FLOW TESTS PASSED 100% SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 14 E2E TEST ERROR:', err);
    process.exit(1);
  }
}

testFitur14EndToEndFlow();
