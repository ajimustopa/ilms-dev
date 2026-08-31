const db = require('../src/config/db/manajemen');
const evaluationService = require('../src/modules/manajemen/evaluation/service');

async function testFitur12Verification() {
  console.log('--- TEST FITUR 12: MONITORING, EVALUASI & TINDAK LANJUT (MONEV & RTL) ---');

  try {
    // 1. Dashboard Metrics
    const metrics = await evaluationService.getDashboardMetrics(null);
    console.log('1. Dashboard Metrics OK -> Goals:', metrics.goals_summary.total, 'KPIs:', metrics.kpi_summary.total, 'RTL:', metrics.rtl_summary.total);

    // 2. Monitoring Goals
    const goals = await evaluationService.getMonitoringGoals(null);
    console.log('2. Monitoring Goals OK -> Count:', goals.length);

    // 3. Monitoring Programs
    const programs = await evaluationService.getMonitoringPrograms(null);
    console.log('3. Monitoring Programs OK -> Count:', programs.length);

    // 4. Monitoring KPI
    const kpis = await evaluationService.getMonitoringKPI(null);
    console.log('4. Monitoring KPIs OK -> Count:', kpis.length);

    // 5. Evaluation Findings
    const findings = await evaluationService.getEvaluationFindings(null);
    console.log('5. Auto-aggregated Evaluation Findings OK -> Count:', findings.length);

    // 6. Create Follow-Up (RTL) linked to KPI
    const rtl = await evaluationService.createFollowUp({
      source_type: 'kpi',
      source_id: 1,
      source_code: 'KPI-IKU-01',
      source_name: 'Persentase Kelulusan Ujian CBT Santri',
      issue: 'Capaian kelulusan simulasi CBT baru mencapai 68%, belum mencapai target 85%',
      deviation_analysis: 'Gap deviasi -17% disebabkan oleh kendala penguasaan materi analitis',
      action_plan: 'Penyelenggaraan matrikulasi pendalaman materi dan klinik remedial terpadu',
      pic_employee_id: 1,
      deadline: '2026-09-30',
      status: 'in_progress',
      progress_percent: 40
    }, 1);

    console.log('6. Created RTL OK -> ID:', rtl.id, 'Source:', rtl.source_code, 'Status:', rtl.status);
    if (!rtl.source_code || rtl.progress_percent !== 40) throw new Error('Expected RTL with 40% progress and code');

    // 7. Update RTL Progress to 100%
    const updated = await evaluationService.updateFollowUp(rtl.id, {
      progress_percent: 100,
      completion_notes: 'Seluruh sesi matrikulasi telah terlaksana dengan tingkat kehadiran 95%',
      evidence_url: 'https://storage.aldepos.sch.id/evidence/matrikulasi_report.pdf'
    }, 1);

    console.log('7. Updated RTL OK -> Progress:', updated.progress_percent, '% Status:', updated.status);
    if (updated.progress_percent !== 100 || updated.status !== 'completed') {
      throw new Error('Expected completed status when progress is 100%');
    }

    // 8. Verify RTL by Auditor / Head
    const verified = await evaluationService.verifyFollowUp(rtl.id, {
      notes: 'Terverifikasi efektif oleh Auditor Penjaminan Mutu'
    }, 1);

    console.log('8. Verified RTL OK -> Status:', verified.status, 'Verifier ID:', verified.verified_by_employee_id);
    if (verified.status !== 'verified') throw new Error('Expected verified status');

    // 9. List Follow-ups
    const list = await evaluationService.listFollowUps(null, { status: 'verified' });
    console.log('9. List Verified RTL OK -> Count:', list.length);

    // 10. Clean up test RTL
    await evaluationService.deleteFollowUp(rtl.id);
    console.log('10. Clean up RTL OK');

    console.log('--- ALL FITUR 12 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 12 TEST ERROR:', err);
    process.exit(1);
  }
}

testFitur12Verification();
