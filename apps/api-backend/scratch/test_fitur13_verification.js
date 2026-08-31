const db = require('../src/config/db/manajemen');
const projectsService = require('../src/modules/manajemen/projects/service');

async function testFitur13Verification() {
  console.log('--- TEST FITUR 13: APPROVAL CENTER ---');

  try {
    // 1. Workflows Listing & Seeding
    const workflows = await projectsService.listWorkflows(1);
    console.log('1. Workflows Listing OK -> Count:', workflows.length);
    if (workflows.length === 0) throw new Error('Expected default workflows to be seeded');

    const rktWorkflow = workflows.find(w => w.applies_to === 'school_work_plan') || workflows[0];
    console.log('2. Selected Workflow -> ID:', rktWorkflow.id, 'Name:', rktWorkflow.name, 'Steps:', rktWorkflow.steps.length);

    // 2. Create Approval Request for RKT
    const req1 = await projectsService.createApprovalRequest({
      approval_workflow_id: rktWorkflow.id,
      school_unit_id: 1,
      reference_type: 'school_work_plan',
      reference_id: 1,
      requested_by_employee_id: 1,
      notes: 'Pengajuan pengesahan Dokumen RKT TA 2026/2027'
    }, { id: 1, employee_id: 1 });

    console.log('3. Created Approval Request OK -> ID:', req1.id, 'Document:', req1.document_title, 'Step:', req1.current_step, 'Status:', req1.status);
    if (req1.status !== 'pending' || req1.current_step !== 1) throw new Error('Expected pending status and step 1');

    // 3. Act Step 1: Approved
    const step1Approved = await projectsService.actOnApprovalRequest(req1.id, {
      action: 'approved',
      approver_employee_id: 1,
      notes: 'Disetujui oleh Waka Perencanaan. Lanjut ke Kepala Sekolah.'
    }, { id: 1 });

    console.log('4. Step 1 Approved OK -> Current Step:', step1Approved.current_step, 'Status:', step1Approved.status);
    if (step1Approved.current_step !== 2) throw new Error('Expected current step to be 2');

    // 4. Act Step 2: Returned (Perlu Revisi Anggaran)
    const step2Returned = await projectsService.actOnApprovalRequest(req1.id, {
      action: 'returned',
      approver_employee_id: 2,
      notes: 'Mohon rincian pagu sarpras disesuaikan dengan standar biaya yayasan.'
    }, { id: 2 });

    console.log('5. Step 2 Returned OK -> Current Step:', step2Returned.current_step, 'Status:', step2Returned.status);
    if (step2Returned.current_step !== 1) throw new Error('Expected current step reset to 1 on return');

    // 5. Resubmit by Requester
    const resubmitted = await projectsService.resubmitApprovalRequest(req1.id, {
      notes: 'Pagu anggaran telah direvisi sesuai standar biaya yayasan.'
    }, { id: 1 });

    console.log('6. Resubmitted OK -> Step:', resubmitted.current_step, 'Status:', resubmitted.status);
    if (resubmitted.status !== 'pending' || resubmitted.current_step !== 1) throw new Error('Expected pending and step 1');

    // 6. Approve Step 1 again
    await projectsService.actOnApprovalRequest(req1.id, { action: 'approved', approver_employee_id: 1, notes: 'Revisi OK' }, { id: 1 });

    // 7. Approve Step 2 (Final)
    const finalApproved = await projectsService.actOnApprovalRequest(req1.id, {
      action: 'approved',
      approver_employee_id: 2,
      notes: 'Disahkan secara final oleh Kepala Sekolah.'
    }, { id: 2 });

    console.log('7. Final Approval OK -> Status:', finalApproved.status, 'Total Steps:', finalApproved.total_steps);
    if (finalApproved.status !== 'approved') throw new Error('Expected approved final status');

    // 8. Audit Trail History Check
    const auditLogs = await projectsService.getApprovalRequestActions(req1.id);
    console.log('8. Audit Trail Logs Count:', auditLogs.length);
    auditLogs.forEach((log, idx) => {
      console.log(`   [Action #${idx + 1}] ${log.action.toUpperCase()} by ${log.approver_name}: "${log.notes}"`);
    });
    if (auditLogs.length < 4) throw new Error('Expected at least 4 append-only action logs');

    // 9. Clean up test request
    await db('approval_actions').where({ approval_request_id: req1.id }).delete();
    await db('approval_requests').where({ id: req1.id }).delete();
    console.log('9. Clean up test request OK');

    console.log('--- ALL FITUR 13 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 13 TEST ERROR:', err);
    process.exit(1);
  }
}

testFitur13Verification();
