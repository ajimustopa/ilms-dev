/**
 * Pure Validation Functions for Leave Types, Unit Approvers, and Approval Delegations
 * Modul Kepegawaian - Core Aldepos
 * Conforms strictly to SPEC-CUTI-LEMBUR.md §3.2, §3.3, §6.1-6.3, §12
 * Zero database, clock, or external dependencies
 */

const ALLOWED_CATEGORIES = ['annual', 'special', 'sick', 'permit', 'official', 'unpaid', 'other'];
const ALLOWED_COUNT_MODES = ['work_days', 'calendar_days'];
const ALLOWED_ATTACHMENT_RULES = ['none', 'optional', 'required', 'required_after_days'];
const ALLOWED_GENDERS = ['any', 'male', 'female'];
const ALLOWED_MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed'];
const ALLOWED_APPROVER_SOURCES = ['direct_supervisor', 'unit_head', 'hrd_pool', 'yayasan_pool'];
const ALLOWED_DELEGATION_SCOPES = ['leave', 'overtime', 'all'];

/**
 * Validate Leave Type Configuration Invariants (SPEC §3.2)
 * @param {Object} config - Configuration object to validate
 * @param {Object|null} existing - Existing record if updating
 * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string, code: string }>, normalizedData: Object }}
 */
function validateLeaveTypeConfig(config, existing = null) {
  const errors = [];
  const normalized = { ...config };

  // 1. Code validation
  if (!existing && !config.code) {
    errors.push({ field: 'code', message: 'Kode jenis cuti wajib diisi', code: 'REQUIRED_FIELD' });
  } else if (config.code) {
    const codeStr = String(config.code).trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(codeStr)) {
      errors.push({ field: 'code', message: 'Kode jenis cuti hanya boleh huruf kecil, angka, dan garis bawah (snake_case)', code: 'INVALID_FORMAT' });
    }
    normalized.code = codeStr;
  }

  // If existing is system type, code cannot be changed
  if (existing && existing.is_system && config.code && config.code !== existing.code) {
    errors.push({ field: 'code', message: 'Kode jenis cuti bawaan sistem (is_system) tidak boleh diubah', code: 'IMMUTABLE_SYSTEM_CODE' });
  }

  // 2. Name validation
  if (!existing && !config.name) {
    errors.push({ field: 'name', message: 'Nama jenis cuti wajib diisi', code: 'REQUIRED_FIELD' });
  } else if (config.name !== undefined) {
    normalized.name = String(config.name).trim();
    if (!normalized.name) {
      errors.push({ field: 'name', message: 'Nama jenis cuti tidak boleh kosong', code: 'REQUIRED_FIELD' });
    }
  }

  // 3. Category validation
  const category = config.category !== undefined ? config.category : existing?.category;
  if (!category) {
    errors.push({ field: 'category', message: 'Kategori jenis cuti wajib diisi', code: 'REQUIRED_FIELD' });
  } else if (!ALLOWED_CATEGORIES.includes(category)) {
    errors.push({
      field: 'category',
      message: `Kategori tidak valid. Pilihan: ${ALLOWED_CATEGORIES.join(', ')}`,
      code: 'INVALID_CATEGORY'
    });
  } else {
    normalized.category = category;
  }

  // 4. Count mode validation
  const countMode = config.count_mode !== undefined ? config.count_mode : (existing?.count_mode || 'work_days');
  if (!ALLOWED_COUNT_MODES.includes(countMode)) {
    errors.push({
      field: 'count_mode',
      message: `Mode hitung hari tidak valid. Pilihan: ${ALLOWED_COUNT_MODES.join(', ')}`,
      code: 'INVALID_COUNT_MODE'
    });
  } else {
    normalized.count_mode = countMode;
  }

  // 5. Invariant: deducts_balance rules (SPEC §3.2)
  const deductsBalance = config.deducts_balance !== undefined
    ? Boolean(Number(config.deducts_balance))
    : Boolean(Number(existing?.deducts_balance || 0));

  normalized.deducts_balance = deductsBalance;

  // Invariant 5a: Only annual category can deduct balance
  if (deductsBalance && category !== 'annual') {
    errors.push({
      field: 'deducts_balance',
      message: "Hanya jenis cuti berkategori 'annual' (tahunan) yang dapat memotong saldo cuti.",
      code: 'ANNUAL_ONLY_DEDUCTS_BALANCE'
    });
  }

  // Invariant 5b: calendar_days cannot deduct balance
  if (deductsBalance && countMode === 'calendar_days') {
    errors.push({
      field: 'deducts_balance',
      message: 'Mode hitung hari kalender (calendar_days) tidak boleh memotong saldo cuti.',
      code: 'CALENDAR_DAYS_CANNOT_DEDUCT_BALANCE'
    });
  }

  // Invariant 5c: deducts_balance requires balance_policy_id
  const balancePolicyId = config.balance_policy_id !== undefined ? config.balance_policy_id : existing?.balance_policy_id;
  if (deductsBalance) {
    if (balancePolicyId === null || balancePolicyId === undefined || balancePolicyId === '') {
      errors.push({
        field: 'balance_policy_id',
        message: 'Jenis cuti yang memotong saldo wajib memiliki balance_policy_id.',
        code: 'BALANCE_POLICY_REQUIRED'
      });
    } else {
      const numPolicy = Number(balancePolicyId);
      if (isNaN(numPolicy) || numPolicy <= 0) {
        errors.push({
          field: 'balance_policy_id',
          message: 'balance_policy_id harus berupa ID kebijakan yang valid.',
          code: 'INVALID_BALANCE_POLICY'
        });
      } else {
        normalized.balance_policy_id = numPolicy;
      }
    }
  } else {
    normalized.balance_policy_id = null;
  }

  // 6. Range and Numeric Validations
  // 6a. Payroll Pay Percent (0 - 100 or null)
  if (config.payroll_pay_percent !== undefined && config.payroll_pay_percent !== null && config.payroll_pay_percent !== '') {
    const payPercent = Number(config.payroll_pay_percent);
    if (isNaN(payPercent) || payPercent < 0 || payPercent > 100) {
      errors.push({
        field: 'payroll_pay_percent',
        message: 'Persentase gaji harus bernilai antara 0 hingga 100%.',
        code: 'INVALID_PAY_PERCENT'
      });
    } else {
      normalized.payroll_pay_percent = payPercent;
    }
  }

  // 6b. Service Months (>= 0)
  if (config.min_service_months !== undefined && config.min_service_months !== null) {
    const minService = Number(config.min_service_months);
    if (isNaN(minService) || minService < 0) {
      errors.push({
        field: 'min_service_months',
        message: 'Syarat masa kerja minimal tidak boleh negatif.',
        code: 'INVALID_MIN_SERVICE_MONTHS'
      });
    } else {
      normalized.min_service_months = Math.floor(minService);
    }
  }

  // 6c. Notice Days (>= 0)
  if (config.min_notice_days !== undefined && config.min_notice_days !== null) {
    const minNotice = Number(config.min_notice_days);
    if (isNaN(minNotice) || minNotice < 0) {
      errors.push({
        field: 'min_notice_days',
        message: 'Batas minimal pengajuan di awal (H-N) tidak boleh negatif.',
        code: 'INVALID_MIN_NOTICE_DAYS'
      });
    } else {
      normalized.min_notice_days = Math.floor(minNotice);
    }
  }

  // 6d. Backdate Days (>= 0)
  if (config.max_backdate_days !== undefined && config.max_backdate_days !== null) {
    const maxBackdate = Number(config.max_backdate_days);
    if (isNaN(maxBackdate) || maxBackdate < 0) {
      errors.push({
        field: 'max_backdate_days',
        message: 'Batas toleransi pengajuan mundur tidak boleh negatif.',
        code: 'INVALID_MAX_BACKDATE_DAYS'
      });
    } else {
      normalized.max_backdate_days = Math.floor(maxBackdate);
    }
  }

  // 6e. Max Days Per Request (> 0 or null)
  if (config.max_days_per_request !== undefined && config.max_days_per_request !== null && config.max_days_per_request !== '') {
    const maxReq = Number(config.max_days_per_request);
    if (isNaN(maxReq) || maxReq <= 0) {
      errors.push({
        field: 'max_days_per_request',
        message: 'Batas hari per pengajuan harus berupa angka positif.',
        code: 'INVALID_MAX_DAYS_PER_REQUEST'
      });
    } else {
      normalized.max_days_per_request = maxReq;
    }
  }

  // 6f. Max Days Per Year (> 0 or null)
  if (config.max_days_per_year !== undefined && config.max_days_per_year !== null && config.max_days_per_year !== '') {
    const maxYear = Number(config.max_days_per_year);
    if (isNaN(maxYear) || maxYear <= 0) {
      errors.push({
        field: 'max_days_per_year',
        message: 'Batas hari per tahun harus berupa angka positif.',
        code: 'INVALID_MAX_DAYS_PER_YEAR'
      });
    } else {
      normalized.max_days_per_year = maxYear;
    }
  }

  // 6g. Max Occurrences Lifetime (> 0 or null)
  if (config.max_occurrences_lifetime !== undefined && config.max_occurrences_lifetime !== null && config.max_occurrences_lifetime !== '') {
    const maxOccur = Number(config.max_occurrences_lifetime);
    if (isNaN(maxOccur) || maxOccur <= 0) {
      errors.push({
        field: 'max_occurrences_lifetime',
        message: 'Batas frekuensi seumur kerja harus berupa angka bulat positif.',
        code: 'INVALID_MAX_OCCURRENCES'
      });
    } else {
      normalized.max_occurrences_lifetime = Math.floor(maxOccur);
    }
  }

  // 7. Attachment Rule
  const attachmentRule = config.attachment_rule !== undefined ? config.attachment_rule : (existing?.attachment_rule || 'none');
  if (!ALLOWED_ATTACHMENT_RULES.includes(attachmentRule)) {
    errors.push({
      field: 'attachment_rule',
      message: `Aturan lampiran tidak valid. Pilihan: ${ALLOWED_ATTACHMENT_RULES.join(', ')}`,
      code: 'INVALID_ATTACHMENT_RULE'
    });
  } else {
    normalized.attachment_rule = attachmentRule;
    if (attachmentRule === 'required_after_days') {
      const afterDays = config.attachment_required_after_days !== undefined
        ? Number(config.attachment_required_after_days)
        : Number(existing?.attachment_required_after_days || 0);

      if (isNaN(afterDays) || afterDays <= 0) {
        errors.push({
          field: 'attachment_required_after_days',
          message: "Batas hari wajib lampiran ('required_after_days') harus bernilai minimal 1 hari.",
          code: 'INVALID_ATTACHMENT_AFTER_DAYS'
        });
      } else {
        normalized.attachment_required_after_days = Math.floor(afterDays);
      }
    } else {
      normalized.attachment_required_after_days = null;
    }
  }

  // 8. Gender Restriction
  const genderRestriction = config.gender_restriction !== undefined ? config.gender_restriction : (existing?.gender_restriction || 'any');
  if (!ALLOWED_GENDERS.includes(genderRestriction)) {
    errors.push({
      field: 'gender_restriction',
      message: `Batasan gender tidak valid. Pilihan: ${ALLOWED_GENDERS.join(', ')}`,
      code: 'INVALID_GENDER_RESTRICTION'
    });
  } else {
    normalized.gender_restriction = genderRestriction;
  }

  // 9. Eligible Marital Statuses
  if (config.eligible_marital_statuses !== undefined && config.eligible_marital_statuses !== null) {
    let maritalList = config.eligible_marital_statuses;
    if (typeof maritalList === 'string') {
      try { maritalList = JSON.parse(maritalList); } catch (e) { maritalList = [maritalList]; }
    }
    if (Array.isArray(maritalList)) {
      const invalidMarital = maritalList.filter(m => !ALLOWED_MARITAL_STATUSES.includes(String(m).toLowerCase()));
      if (invalidMarital.length > 0) {
        errors.push({
          field: 'eligible_marital_statuses',
          message: `Status pernikahan tidak valid: ${invalidMarital.join(', ')}. Pilihan: ${ALLOWED_MARITAL_STATUSES.join(', ')}`,
          code: 'INVALID_MARITAL_STATUS'
        });
      }
      normalized.eligible_marital_statuses = maritalList.map(m => String(m).toLowerCase());
    }
  }

  // 10. Eligible Employment Statuses
  if (config.eligible_employment_statuses !== undefined && config.eligible_employment_statuses !== null) {
    let empStatusList = config.eligible_employment_statuses;
    if (typeof empStatusList === 'string') {
      try { empStatusList = JSON.parse(empStatusList); } catch (e) { empStatusList = [empStatusList]; }
    }
    if (Array.isArray(empStatusList)) {
      normalized.eligible_employment_statuses = empStatusList.map(s => String(s).trim().toLowerCase());
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedData: normalized
  };
}

const { formatDbDate } = require('./dateHelper');

/**
 * Pure helper to detect date range overlap between two intervals [startA, endA] and [startB, endB]
 * end date of null is considered infinity (+9999-12-31)
 */
function isDateRangeOverlapping(startA, endA, startB, endB) {
  const sA = formatDbDate(startA);
  const eA = endA ? formatDbDate(endA) : '9999-12-31';
  const sB = formatDbDate(startB);
  const eB = endB ? formatDbDate(endB) : '9999-12-31';

  return sA <= eB && eA >= sB;
}

/**
 * Pure validation for Unit Approver non-overlapping period (SPEC §6.1, §10.2)
 * @param {Array<Object>} existingApprovers - List of existing approver records for the same unit & role
 * @param {Object} newApprover - { school_unit_id, approver_role, employee_id, valid_from, valid_to }
 * @param {number|null} excludeId - ID to exclude if updating
 * @returns {{ isValid: boolean, error: string|null, conflictingApprover: Object|null }}
 */
function checkUnitApproverOverlap(existingApprovers, newApprover, excludeId = null) {
  const valid_from = formatDbDate(newApprover.valid_from);
  const valid_to = newApprover.valid_to ? formatDbDate(newApprover.valid_to) : null;

  if (!valid_from) {
    return { isValid: false, error: 'Tanggal mulai berlaku (valid_from) wajib diisi.', conflictingApprover: null };
  }

  if (valid_to && valid_to < valid_from) {
    return { isValid: false, error: 'Tanggal akhir berlaku (valid_to) tidak boleh lebih awal dari tanggal mulai (valid_from).', conflictingApprover: null };
  }

  for (const existing of existingApprovers) {
    if (excludeId && Number(existing.id) === Number(excludeId)) {
      continue;
    }

    if (isDateRangeOverlapping(valid_from, valid_to, existing.valid_from, existing.valid_to)) {
      return {
        isValid: false,
        error: `Terdapat tumpang tindih masa jabatan Kepala Sekolah/Approver untuk rentang ${formatDbDate(existing.valid_from)} s.d ${existing.valid_to ? formatDbDate(existing.valid_to) : 'seterusnya'} (Pegawai ID: ${existing.employee_id}).`,
        conflictingApprover: existing
      };
    }
  }

  return { isValid: true, error: null, conflictingApprover: null };
}

/**
 * Pure validation for Approval Delegation rules (SPEC §6.3, §10.2)
 * Invariants:
 * 1. delegator_employee_id !== delegate_employee_id (no self-delegation)
 * 2. valid_to >= valid_from
 * 3. Depth = 1 (no chaining):
 *    - Delegate cannot be an active delegator to someone else in overlapping period
 *    - Delegator cannot be an active delegate from someone else in overlapping period
 * 4. No overlapping active delegation for same delegator
 *
 * @param {Array<Object>} activeDelegations - List of all currently active delegations
 * @param {Object} newDelegation - { delegator_employee_id, delegate_employee_id, scope, valid_from, valid_to }
 * @param {number|null} excludeId - ID to exclude if updating
 * @returns {{ isValid: boolean, error: string|null, code: string|null }}
 */
function validateDelegationRules(activeDelegations, newDelegation, excludeId = null) {
  const delegatorId = Number(newDelegation.delegator_employee_id);
  const delegateId = Number(newDelegation.delegate_employee_id);
  const valid_from = formatDbDate(newDelegation.valid_from);
  const valid_to = formatDbDate(newDelegation.valid_to);
  const { scope = 'all' } = newDelegation;

  if (!delegatorId || !delegateId) {
    return { isValid: false, error: 'Pemberi delegasi dan penerima delegasi wajib ditentukan.', code: 'REQUIRED_FIELD' };
  }

  // 1. No self-delegation
  if (delegatorId === delegateId) {
    return { isValid: false, error: 'Tidak dapat mendelegasikan wewenang persetujuan kepada diri sendiri.', code: 'SELF_DELEGATION_FORBIDDEN' };
  }

  // 2. Date validation
  if (!valid_from || !valid_to) {
    return { isValid: false, error: 'Rentang tanggal delegasi (valid_from dan valid_to) wajib diisi.', code: 'REQUIRED_FIELD' };
  }

  if (valid_to < valid_from) {
    return { isValid: false, error: 'Tanggal akhir delegasi tidak boleh lebih awal dari tanggal mulai.', code: 'INVALID_DATE_RANGE' };
  }

  // Filter active delegations
  const list = activeDelegations.filter(d => (!excludeId || Number(d.id) !== Number(excludeId)) && (d.is_active === 1 || d.is_active === true || d.is_active === undefined));

  for (const d of list) {
    const overlaps = isDateRangeOverlapping(valid_from, valid_to, d.valid_from, d.valid_to);
    if (!overlaps) continue;

    const dDelegator = Number(d.delegator_employee_id);
    const dDelegate = Number(d.delegate_employee_id);

    // 3. No duplicate delegation for same delegator with overlapping dates
    if (dDelegator === delegatorId) {
      const scopeOverlap = scope === 'all' || d.scope === 'all' || scope === d.scope;
      if (scopeOverlap) {
        return {
          isValid: false,
          error: `Pemberi delegasi sudah memiliki delegasi aktif untuk cakupan ${d.scope} pada rentang ${formatDbDate(d.valid_from)} s.d ${formatDbDate(d.valid_to)}.`,
          code: 'OVERLAPPING_DELEGATION'
        };
      }
    }

    // 4. Depth = 1 rules (no chaining / cyclic)
    // 4a. Target delegate is ALREADY delegating their tasks to someone else
    if (dDelegator === delegateId) {
      return {
        isValid: false,
        error: `Penerima delegasi sedang mendelegasikan wewenangnya kepada pihak lain pada periode yang sama (Pendelegasian berantai tidak diperbolehkan).`,
        code: 'DELEGATION_CHAIN_FORBIDDEN'
      };
    }

    // 4b. Delegator is ALREADY acting as a delegate from someone else
    if (dDelegate === delegatorId) {
      return {
        isValid: false,
        error: `Pemberi delegasi saat ini berstatus sebagai penerima delegasi dari pihak lain pada periode yang sama (Wewenang titipan tidak dapat didelegasikan kembali).`,
        code: 'RE_DELEGATION_FORBIDDEN'
      };
    }
  }

  return { isValid: true, error: null, code: null };
}

module.exports = {
  validateLeaveTypeConfig,
  checkUnitApproverOverlap,
  validateDelegationRules,
  isDateRangeOverlapping,
  ALLOWED_CATEGORIES,
  ALLOWED_COUNT_MODES,
  ALLOWED_ATTACHMENT_RULES,
  ALLOWED_GENDERS,
  ALLOWED_MARITAL_STATUSES,
  ALLOWED_APPROVER_SOURCES,
  ALLOWED_DELEGATION_SCOPES
};
