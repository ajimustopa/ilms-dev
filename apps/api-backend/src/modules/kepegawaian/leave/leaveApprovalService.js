/**
 * Leave & Overtime Multi-Level Approval Service
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §6
 */

const db = require('../../../config/db/kepegawaian');

class LeaveApprovalService {
  /**
   * Build snapshot approval steps when a leave or overtime request is created
   */
  async buildSteps({ entityType = 'leave', entityId, requestVersion = 1, profileId, employeeId, schoolUnitId, durationDays = 1 }, trx) {
    const runner = trx || db;

    // Fetch profile steps
    const profileSteps = await runner('leave_approval_profile_steps')
      .where({ profile_id: profileId })
      .orderBy('step_no', 'asc');

    if (profileSteps.length === 0) {
      // Fallback 1-step HRD
      profileSteps.push({
        step_no: 1,
        approver_source: 'hrd_pool',
        is_required: 1,
        sla_hours: 72
      });
    }

    // Fetch employee details to check supervisor
    const employee = await runner('employees').where({ id: employeeId }).first();

    // Fetch school unit approver (KS)
    const unitApprover = await runner('school_unit_approvers')
      .where({ school_unit_id: schoolUnitId, approver_role: 'unit_head' })
      .first();

    const stepsToInsert = [];

    for (const ps of profileSteps) {
      // Check threshold if present
      if (ps.min_days_threshold && durationDays < parseFloat(ps.min_days_threshold)) {
        continue;
      }

      let assignedEmployeeId = null;
      let status = 'pending';
      let skipReason = null;

      if (ps.approver_source === 'direct_supervisor') {
        if (employee && employee.direct_supervisor_employee_id) {
          assignedEmployeeId = employee.direct_supervisor_employee_id;
        } else {
          // If optional and supervisor is missing -> skip
          if (!ps.is_required) {
            status = 'skipped';
            skipReason = 'skipped:no_supervisor';
          }
        }
      } else if (ps.approver_source === 'unit_head') {
        if (unitApprover) {
          assignedEmployeeId = unitApprover.employee_id;
        }
        // If KS is the applicant -> KS step is skipped / advanced directly to HRD (SPEC §6.4)
        if (assignedEmployeeId === employeeId) {
          status = 'skipped';
          skipReason = 'skipped:applicant_is_unit_head';
        }
      } else if (ps.approver_source === 'hrd_pool') {
        // Pool of HRD users (assignedEmployeeId is null, any HRD in scope can act)
        assignedEmployeeId = null;
      }

      stepsToInsert.push({
        entity_type: entityType,
        entity_id: entityId,
        request_version: requestVersion,
        step_no: ps.step_no,
        approver_source: ps.approver_source,
        assigned_employee_id: assignedEmployeeId,
        status,
        skip_reason: skipReason,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    if (stepsToInsert.length > 0) {
      await runner('approval_steps').insert(stepsToInsert);
    }

    // Determine initial current_step_no (first non-skipped step)
    const activeStep = stepsToInsert.find(s => s.status === 'pending');
    return activeStep ? activeStep.step_no : 1;
  }

  /**
   * Check if actor is allowed to approve/reject on a specific step
   */
  async canActorActOnStep(step, actor, schoolUnitId) {
    if (!actor) return false;

    // Super Admin or users with override permission can always act
    if (actor.permissions.includes('kepegawaian.leave_requests.override')) {
      return true;
    }

    // HRD can act on HRD pool or if they have manage permission
    const isHr = actor.permissions.includes('kepegawaian.leave_requests.manage');
    if (step.approver_source === 'hrd_pool' && isHr) {
      return true;
    }

    // If step is directly assigned to actor's employeeId
    if (step.assigned_employee_id && actor.employeeId && step.assigned_employee_id === actor.employeeId) {
      return true;
    }

    // Check active delegations
    if (step.assigned_employee_id && actor.employeeId) {
      const today = new Date().toISOString().slice(0, 10);
      const delegation = await db('approval_delegations')
        .where({
          delegator_employee_id: step.assigned_employee_id,
          delegate_employee_id: actor.employeeId,
          is_active: 1
        })
        .andWhere('valid_from', '<=', today)
        .andWhere('valid_to', '>=', today)
        .first();

      if (delegation) {
        return { isDelegate: true, delegatorEmployeeId: step.assigned_employee_id };
      }
    }

    // Fallback: HRD can act on unassigned steps
    if (isHr) {
      return true;
    }

    return false;
  }
}

module.exports = new LeaveApprovalService();
