/**
 * Pure Approval Engine for Leave & Overtime
 * Modul Kepegawaian - Core Aldepos
 * Conforms strictly to SPEC-CUTI-LEMBUR.md §6 and §12
 * 
 * PURE FUNCTION - NO DB / NO KNEX IMPORTS
 */

/**
 * Builds snapshot approval steps for a request based on profile, applicant, duration, and resolvers.
 * SPEC §6.1, §6.2, §6.4
 * 
 * @param {object} profile - { id, code, name, steps: [{ step_no, step_name, approver_source, is_required, min_days_threshold, sla_hours }] }
 * @param {object} employee - { id, school_unit_id, direct_supervisor_employee_id }
 * @param {number} durationDays - total calculated duration in days
 * @param {object} resolvers - { getUnitHead: (unitId) => ({ employeeId, name }), isApplicantOnlyHrd: (empId, unitId) => boolean }
 * @returns {{ steps: Array<object>, initialStepNo: number | null }}
 */
function buildApprovalSteps(profile = {}, employee = {}, durationDays = 1, resolvers = {}) {
  const rawSteps = (profile.steps && profile.steps.length > 0)
    ? [...profile.steps]
    : [
        {
          step_no: 1,
          step_name: 'Persetujuan HRD',
          approver_source: 'hrd_pool',
          is_required: 1,
          sla_hours: 72
        }
      ];

  // Sort by step_no asc
  rawSteps.sort((a, b) => a.step_no - b.step_no);

  const snapshotSteps = [];

  for (const ps of rawSteps) {
    // 1. Check min_days_threshold
    if (ps.min_days_threshold !== null && ps.min_days_threshold !== undefined) {
      if (durationDays < parseFloat(ps.min_days_threshold)) {
        // Step does not apply for this short duration
        continue;
      }
    }

    let assignedEmployeeId = null;
    let status = 'pending';
    let skipReason = null;
    let source = ps.approver_source;

    if (source === 'direct_supervisor') {
      if (employee.direct_supervisor_employee_id) {
        assignedEmployeeId = employee.direct_supervisor_employee_id;
        // Anti self-approval: if supervisor is the applicant themselves
        if (assignedEmployeeId === employee.id) {
          status = 'skipped';
          skipReason = 'skipped:applicant_is_supervisor';
        }
      } else {
        // Direct supervisor is missing
        if (!ps.is_required) {
          status = 'skipped';
          skipReason = 'skipped:no_supervisor';
        } else {
          // Required step but supervisor missing -> unassigned
          assignedEmployeeId = null;
        }
      }
    } else if (source === 'unit_head') {
      const unitHead = resolvers.getUnitHead ? resolvers.getUnitHead(employee.school_unit_id) : null;
      if (unitHead && unitHead.employeeId) {
        assignedEmployeeId = unitHead.employeeId;
        // Anti self-approval (SPEC §6.4: "pemohon KS -> langsung HRD")
        if (assignedEmployeeId === employee.id) {
          status = 'skipped';
          skipReason = 'skipped:applicant_is_unit_head';
        } else if (employee.direct_supervisor_employee_id && assignedEmployeeId === employee.direct_supervisor_employee_id) {
          // Redundant step if direct supervisor is also unit head
          status = 'skipped';
          skipReason = 'skipped:supervisor_is_unit_head';
        }
      } else {
        // Unit head missing -> unassigned
        assignedEmployeeId = null;
      }
    } else if (source === 'hrd_pool') {
      // Check if applicant is the ONLY HRD (SPEC §6.4: "pemohon satu-satunya HRD -> yayasan_pool")
      const isOnlyHrd = resolvers.isApplicantOnlyHrd ? resolvers.isApplicantOnlyHrd(employee.id, employee.school_unit_id) : false;
      if (isOnlyHrd) {
        source = 'yayasan_pool';
      }
      assignedEmployeeId = null;
    } else if (source === 'yayasan_pool') {
      assignedEmployeeId = null;
    }

    snapshotSteps.push({
      step_no: ps.step_no,
      step_name: ps.step_name || `Langkah ${ps.step_no}`,
      approver_source: source,
      assigned_employee_id: assignedEmployeeId,
      status,
      skip_reason: skipReason,
      acted_by_user_id: null,
      acted_by_employee_id: null,
      on_behalf_of_employee_id: null,
      acted_at: null,
      comment: null
    });
  }

  // Find first active pending step
  const firstActive = snapshotSteps.find(s => s.status === 'pending');
  const initialStepNo = firstActive ? firstActive.step_no : null;

  return {
    steps: snapshotSteps,
    initialStepNo
  };
}

/**
 * Pure authorization check if actor can act on a specific approval step
 * SPEC §6.3, §6.4
 * 
 * @param {object} actor - { userId, employeeId, permissions: string[], unitScope: number[] | 'all', roles: string[] }
 * @param {object} step - { step_no, approver_source, assigned_employee_id, status }
 * @param {Array<object>} delegations - list of active delegation records
 * @param {string} today - YYYY-MM-DD
 * @param {number|null} requestEmployeeId - applicant employee id
 * @returns {{ canAct: boolean, reason?: string, isOverride?: boolean, isDelegate?: boolean, onBehalfOfEmployeeId?: number }}
 */
function canActOnStep(actor = {}, step = {}, delegations = [], today = new Date().toISOString().slice(0, 10), requestEmployeeId = null) {
  if (!actor || !actor.userId) {
    return { canAct: false, reason: 'ACTOR_REQUIRED' };
  }

  const permissions = actor.permissions || [];
  const isOverride = permissions.includes('kepegawaian.leave_requests.override');

  // Override permission can always act on any step
  if (isOverride) {
    return { canAct: true, isOverride: true };
  }

  // Anti Self-Approval (SPEC §6.4): Non-override actor cannot approve their own request
  if (actor.employeeId && requestEmployeeId && actor.employeeId === requestEmployeeId) {
    return { canAct: false, reason: 'SELF_APPROVAL_FORBIDDEN' };
  }

  const isHrManage = permissions.includes('kepegawaian.leave_requests.manage');

  // If step is assigned to a specific employee
  if (step.assigned_employee_id) {
    // 1. Direct match
    if (actor.employeeId && step.assigned_employee_id === actor.employeeId) {
      return { canAct: true };
    }

    // 2. Check active delegations (depth = 1, no re-delegation)
    if (actor.employeeId && delegations && delegations.length > 0) {
      for (const d of delegations) {
        if (!d.is_active || d.revoked_at) continue;
        if (d.scope !== 'leave' && d.scope !== 'all') continue;
        if (d.valid_from > today || d.valid_to < today) continue;

        // Check exact delegator match
        if (d.delegator_employee_id === step.assigned_employee_id && d.delegate_employee_id === actor.employeeId) {
          return {
            canAct: true,
            isDelegate: true,
            onBehalfOfEmployeeId: step.assigned_employee_id
          };
        }
      }
    }

    // If assigned to someone else and actor is HRD, HRD can act only if overriding/unassigned
    // Regular HRD cannot act for another supervisor unless step is unassigned or actor has override
    return { canAct: false, reason: 'NOT_ASSIGNED_APPROVER' };
  }

  // If step is unassigned (assigned_employee_id is null on supervisor/unit_head)
  if (step.approver_source === 'direct_supervisor' || step.approver_source === 'unit_head') {
    if (isHrManage) {
      return { canAct: true, isUnassignedFallback: true };
    }
    return { canAct: false, reason: 'UNASSIGNED_REQUIRES_HR' };
  }

  // If step is hrd_pool
  if (step.approver_source === 'hrd_pool') {
    if (isHrManage) {
      return { canAct: true };
    }
    return { canAct: false, reason: 'REQUIRES_HR_PERMISSION' };
  }

  // If step is yayasan_pool
  if (step.approver_source === 'yayasan_pool') {
    const isYayasan = (actor.roles && actor.roles.includes('admin_yayasan')) || isOverride;
    if (isYayasan) {
      return { canAct: true };
    }
    return { canAct: false, reason: 'REQUIRES_YAYASAN_ROLE' };
  }

  return { canAct: false, reason: 'NOT_AUTHORIZED' };
}

/**
 * Pure state transition machine for Leave Request approval
 * SPEC §6.5
 * 
 * @param {object} state - { currentStatus, currentStepNo, version, steps: Array<object>, entityType?: 'leave'|'overtime' }
 * @param {object} action - { type, actor, comment, reason, bypassReason, onBehalfOfEmployeeId, isOwner, isOverride, today }
 * @returns {object} updated state - { currentStatus, currentStepNo, version, steps: Array<object> }
 * @throws {Error} if transition is illegal or required parameters missing
 */
function applyAction(state = {}, action = {}) {
  const {
    currentStatus = 'pending',
    currentStepNo = 1,
    version = 1,
    steps = []
  } = state;

  const {
    type,
    actor = {},
    comment = null,
    reason = null,
    bypassReason = null,
    onBehalfOfEmployeeId = null,
    isOwner = false,
    isOverride = false,
    today = new Date().toISOString()
  } = action;

  function createIllegalTransitionError(msg) {
    const err = new Error(msg || `Transisi aksi '${type}' tidak diizinkan pada status '${currentStatus}'`);
    err.code = 'ILLEGAL_TRANSITION';
    return err;
  }

  const updatedSteps = steps.map(s => ({ ...s }));

  // ==========================================
  // STATE: pending
  // ==========================================
  if (currentStatus === 'pending') {
    if (type === 'approve') {
      const stepIdx = updatedSteps.findIndex(s => s.step_no === currentStepNo);
      if (stepIdx === -1 || updatedSteps[stepIdx].status !== 'pending') {
        throw createIllegalTransitionError(`Langkah ke-${currentStepNo} tidak dalam status pending`);
      }

      updatedSteps[stepIdx].status = 'approved';
      updatedSteps[stepIdx].acted_by_user_id = actor.userId || null;
      updatedSteps[stepIdx].acted_by_employee_id = actor.employeeId || null;
      updatedSteps[stepIdx].on_behalf_of_employee_id = onBehalfOfEmployeeId || null;
      updatedSteps[stepIdx].acted_at = today;
      updatedSteps[stepIdx].comment = comment || null;

      // Find next pending step
      const nextPendingStep = updatedSteps.find(s => s.step_no > currentStepNo && s.status === 'pending');

      if (nextPendingStep) {
        return {
          currentStatus: 'pending',
          currentStepNo: nextPendingStep.step_no,
          version,
          steps: updatedSteps
        };
      } else {
        // Final approval
        return {
          currentStatus: 'approved',
          currentStepNo: null,
          version,
          steps: updatedSteps
        };
      }
    }

    if (type === 'reject') {
      const rejectReason = reason || comment;
      if (!rejectReason || String(rejectReason).trim() === '') {
        const err = new Error('Alasan penolakan wajib diisi');
        err.code = 'REJECTION_REASON_REQUIRED';
        throw err;
      }

      const stepIdx = updatedSteps.findIndex(s => s.step_no === currentStepNo);
      if (stepIdx !== -1) {
        updatedSteps[stepIdx].status = 'rejected';
        updatedSteps[stepIdx].acted_by_user_id = actor.userId || null;
        updatedSteps[stepIdx].acted_by_employee_id = actor.employeeId || null;
        updatedSteps[stepIdx].on_behalf_of_employee_id = onBehalfOfEmployeeId || null;
        updatedSteps[stepIdx].acted_at = today;
        updatedSteps[stepIdx].comment = rejectReason;
      }

      return {
        currentStatus: 'rejected',
        currentStepNo: null,
        version,
        steps: updatedSteps
      };
    }

    if (type === 'request-revision') {
      const revComment = comment || reason;
      if (!revComment || String(revComment).trim() === '') {
        const err = new Error('Catatan permintaan revisi wajib diisi');
        err.code = 'REVISION_COMMENT_REQUIRED';
        throw err;
      }

      const stepIdx = updatedSteps.findIndex(s => s.step_no === currentStepNo);
      if (stepIdx !== -1) {
        updatedSteps[stepIdx].status = 'revision_requested';
        updatedSteps[stepIdx].acted_by_user_id = actor.userId || null;
        updatedSteps[stepIdx].acted_by_employee_id = actor.employeeId || null;
        updatedSteps[stepIdx].on_behalf_of_employee_id = onBehalfOfEmployeeId || null;
        updatedSteps[stepIdx].acted_at = today;
        updatedSteps[stepIdx].comment = revComment;
      }

      return {
        currentStatus: 'revision_requested',
        currentStepNo,
        version,
        steps: updatedSteps
      };
    }

    if (type === 'cancel') {
      return {
        currentStatus: 'cancelled',
        currentStepNo: null,
        version,
        steps: updatedSteps
      };
    }

    if (type === 'bypass') {
      if (!isOverride && !(actor.permissions || []).includes('kepegawaian.leave_requests.override')) {
        const err = new Error('Bypass approval memerlukan hak akses override');
        err.code = 'OVERRIDE_PERMISSION_REQUIRED';
        throw err;
      }

      if (!bypassReason || String(bypassReason).trim() === '') {
        const err = new Error('Alasan bypass approval wajib diisi');
        err.code = 'BYPASS_REASON_REQUIRED';
        throw err;
      }

      // Mark all remaining pending steps as bypassed
      for (const s of updatedSteps) {
        if (s.status === 'pending') {
          s.status = 'bypassed';
          s.acted_by_user_id = actor.userId || null;
          s.acted_by_employee_id = actor.employeeId || null;
          s.acted_at = today;
          s.skip_reason = 'bypassed:hr_override';
          s.comment = bypassReason;
        }
      }

      return {
        currentStatus: 'approved',
        currentStepNo: null,
        version,
        steps: updatedSteps
      };
    }

    throw createIllegalTransitionError();
  }

  // ==========================================
  // STATE: revision_requested
  // ==========================================
  if (currentStatus === 'revision_requested') {
    if (type === 'resubmit') {
      const nextVersion = version + 1;
      // Reset steps for next version: all non-skipped steps reset to pending
      const resetSteps = updatedSteps.map(s => {
        if (s.status === 'skipped') {
          return { ...s };
        }
        return {
          ...s,
          status: 'pending',
          acted_by_user_id: null,
          acted_by_employee_id: null,
          on_behalf_of_employee_id: null,
          acted_at: null,
          comment: null
        };
      });

      const firstPending = resetSteps.find(s => s.status === 'pending');
      const nextStepNo = firstPending ? firstPending.step_no : 1;

      return {
        currentStatus: 'pending',
        currentStepNo: nextStepNo,
        version: nextVersion,
        steps: resetSteps
      };
    }

    if (type === 'cancel') {
      return {
        currentStatus: 'cancelled',
        currentStepNo: null,
        version,
        steps: updatedSteps
      };
    }

    if (type === 'reject') {
      return {
        currentStatus: 'rejected',
        currentStepNo: null,
        version,
        steps: updatedSteps
      };
    }

    throw createIllegalTransitionError();
  }

  // ==========================================
  // STATE: approved
  // ==========================================
  if (currentStatus === 'approved') {
    if (type === 'cancel') {
      return {
        currentStatus: 'cancelled',
        currentStepNo: null,
        version,
        steps: updatedSteps
      };
    }

    throw createIllegalTransitionError('Pengajuan yang telah disetujui hanya dapat dibatalkan');
  }

  // ==========================================
  // STATE: rejected or cancelled (FINAL)
  // ==========================================
  if (currentStatus === 'rejected' || currentStatus === 'cancelled') {
    throw createIllegalTransitionError(`Pengajuan dengan status '${currentStatus}' bersifat final dan tidak dapat diubah`);
  }

  throw createIllegalTransitionError(`Status '${currentStatus}' tidak dikenal`);
}

/**
 * Pure transition validator for overtime status (4 values)
 * SPEC §6.5 & §7
 * 
 * @param {string} currentStatus - 'pending' | 'approved' | 'rejected' | 'cancelled'
 * @param {string} actionType - 'approve' | 'reject' | 'cancel'
 * @returns {string} next status
 * @throws {Error} if illegal
 */
function nextOvertimeStatus(currentStatus, actionType) {
  if (currentStatus === 'pending') {
    if (actionType === 'approve') return 'approved';
    if (actionType === 'reject') return 'rejected';
    if (actionType === 'cancel') return 'cancelled';
  }

  if (currentStatus === 'approved') {
    if (actionType === 'cancel') return 'cancelled';
  }

  const err = new Error(`Aksi '${actionType}' tidak valid untuk status lembur '${currentStatus}'`);
  err.code = 'ILLEGAL_TRANSITION';
  throw err;
}

module.exports = {
  buildApprovalSteps,
  canActOnStep,
  applyAction,
  nextOvertimeStatus
};
