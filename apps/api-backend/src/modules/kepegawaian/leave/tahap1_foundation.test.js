/**
 * Tahap 1 Unit Tests: Fondasi Keamanan Cuti/Lembur, resolveActor, Unit Scoping, todayWIB, MIME Validation & Cycle Detection
 * Modul Kepegawaian - Core Aldepos
 * Uses built-in node:test runner
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { evaluateActor, isUnitInScope, HR_PERMISSIONS } = require('../common/actorHelper');
const { todayWIB, parseDate, addDays, diffInDays, dateRange } = require('./dateHelper');
const { detectMimeFromBuffer } = require('./attachmentHelper');
const { detectSupervisorCycle } = require('./employeeProfileService');

describe('Tahap 1: Actor Evaluation & IDOR Security', () => {
  it('should reject student account (ref_type=student) and set employeeId to null', () => {
    const studentUser = {
      id: 6,
      username: 'siswa_uji',
      account_type: 'student',
      ref_type: 'student',
      ref_id: 101,
      permissions: ['akademik.students.read']
    };

    const actor = evaluateActor(studentUser, null);
    assert.strictEqual(actor.employeeId, null);
    assert.strictEqual(actor.isHR, false);
    assert.strictEqual(actor.isInactive, false);
  });

  it('should reject user with null ref_type', () => {
    const user = {
      id: 99,
      username: 'guest',
      account_type: 'public',
      ref_type: null,
      ref_id: null
    };

    const actor = evaluateActor(user, null);
    assert.strictEqual(actor.employeeId, null);
    assert.strictEqual(actor.isHR, false);
  });

  it('should properly resolve active teacher/staff employee', () => {
    const teacherUser = {
      id: 4,
      username: 'guru_uji',
      account_type: 'teacher',
      ref_type: 'staff',
      ref_id: 3,
      school_unit_id: 1,
      permissions: ['guru.portal.access']
    };

    const employeeRecord = {
      id: 3,
      school_unit_id: 1,
      full_name: 'Budi Santoso, S.Kom',
      account_status: 'active',
      status: 'active'
    };

    const actor = evaluateActor(teacherUser, employeeRecord);
    assert.strictEqual(actor.employeeId, 3);
    assert.strictEqual(actor.isHR, false);
    assert.strictEqual(actor.isInactive, false);
    assert.deepStrictEqual(actor.unitScope, [1]);
  });

  it('should mark inactive employee as isInactive=true and employeeId=null', () => {
    const teacherUser = {
      id: 4,
      username: 'guru_nonaktif',
      account_type: 'teacher',
      ref_type: 'staff',
      ref_id: 3,
      permissions: []
    };

    const inactiveRecord = {
      id: 3,
      school_unit_id: 1,
      full_name: 'Budi Nonaktif',
      account_status: 'inactive'
    };

    const actor = evaluateActor(teacherUser, inactiveRecord);
    assert.strictEqual(actor.employeeId, null);
    assert.strictEqual(actor.isInactive, true);
  });

  it('should recognize HR actor based on granular permissions', () => {
    const hrdUser = {
      id: 2,
      username: 'hrd_smp',
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 1,
      school_unit_id: 1,
      permissions: ['kepegawaian.leave_requests.manage']
    };

    const hrdRecord = {
      id: 1,
      school_unit_id: 1,
      full_name: 'Siti Aminah (HRD)',
      account_status: 'active'
    };

    const actor = evaluateActor(hrdUser, hrdRecord);
    assert.strictEqual(actor.employeeId, 1);
    assert.strictEqual(actor.isHR, true);
  });

  it('should grant unrestricted scope (unitScope=null) to super_admin', () => {
    const superAdmin = {
      id: 1,
      username: 'superadmin',
      account_type: 'super_admin',
      is_super_admin: true,
      permissions: ['superadmin']
    };

    const actor = evaluateActor(superAdmin, null);
    assert.strictEqual(actor.unitScope, null);
    assert.strictEqual(actor.isHR, true);
  });
});

describe('Tahap 1: Unit Scope Validation', () => {
  it('should allow any unit for unrestricted actor (unitScope=null)', () => {
    assert.strictEqual(isUnitInScope(null, 1), true);
    assert.strictEqual(isUnitInScope(null, 2), true);
    assert.strictEqual(isUnitInScope(null, 999), true);
  });

  it('should enforce specific unit boundaries', () => {
    assert.strictEqual(isUnitInScope([1], 1), true);
    assert.strictEqual(isUnitInScope([1], 2), false);
    assert.strictEqual(isUnitInScope([1, 3], 3), true);
    assert.strictEqual(isUnitInScope([1, 3], 4), false);
  });
});

describe('Tahap 1: Pure Date Helper & Clock Injection', () => {
  it('should accept injected string date', () => {
    assert.strictEqual(todayWIB('2026-10-08'), '2026-10-08');
  });

  it('should convert UTC Date object to Asia/Jakarta (WIB) YYYY-MM-DD', () => {
    // 2026-12-31 23:30:00 UTC is 2027-01-01 06:30:00 WIB (UTC+7)
    const dateObj = new Date('2026-12-31T23:30:00.000Z');
    assert.strictEqual(todayWIB(dateObj), '2027-01-01');
  });

  it('should perform pure date calculations without timezone drift', () => {
    assert.strictEqual(addDays('2026-10-05', 5), '2026-10-10');
    assert.strictEqual(diffInDays('2026-10-05', '2026-10-10'), 5);
    const range = dateRange('2026-10-05', '2026-10-07');
    assert.deepStrictEqual(range, ['2026-10-05', '2026-10-06', '2026-10-07']);
  });
});

describe('Tahap 1: Attachment Magic Bytes & MIME Inspection', () => {
  it('should detect PDF magic bytes %PDF-', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
    const detected = detectMimeFromBuffer(pdfBuffer);
    assert.deepStrictEqual(detected, { mimeType: 'application/pdf', ext: 'pdf' });
  });

  it('should detect JPEG magic bytes FF D8 FF', () => {
    const jpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const detected = detectMimeFromBuffer(jpgBuffer);
    assert.deepStrictEqual(detected, { mimeType: 'image/jpeg', ext: 'jpg' });
  });

  it('should detect PNG magic bytes 89 50 4E 47 0D 0A 1A 0A', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const detected = detectMimeFromBuffer(pngBuffer);
    assert.deepStrictEqual(detected, { mimeType: 'image/png', ext: 'png' });
  });

  it('should detect WEBP magic bytes RIFF...WEBP', () => {
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x20, 0x00, 0x00, 0x00, // Size
      0x57, 0x45, 0x42, 0x50  // WEBP
    ]);
    const detected = detectMimeFromBuffer(webpBuffer);
    assert.deepStrictEqual(detected, { mimeType: 'image/webp', ext: 'webp' });
  });

  it('should reject malicious / unknown byte buffers (e.g. executable MZ)', () => {
    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const detected = detectMimeFromBuffer(exeBuffer);
    assert.strictEqual(detected, null);
  });
});

describe('Tahap 1: Supervisor Cycle Detection Logic', () => {
  // Mock knex for pure cycle testing
  function createMockKnex(hierarchyMap) {
    return function(table) {
      return {
        where({ id }) {
          return {
            select() {
              return {
                async first() {
                  const supervisorId = hierarchyMap[id] || null;
                  return supervisorId ? { direct_supervisor_employee_id: supervisorId } : null;
                }
              };
            }
          };
        }
      };
    }
  }

  it('should detect self supervisor assignment (A -> A)', async () => {
    const mockKnex = createMockKnex({});
    const hasCycle = await detectSupervisorCycle(mockKnex, 5, 5);
    assert.strictEqual(hasCycle, true);
  });

  it('should detect 2-node cycle (A -> B -> A)', async () => {
    // Current state: Employee 2 has supervisor 1. We propose assigning supervisor 2 to Employee 1.
    const mockKnex = createMockKnex({
      2: 1 // 2 reports to 1
    });
    // Assigning 1's supervisor to 2 would create 1 -> 2 -> 1
    const hasCycle = await detectSupervisorCycle(mockKnex, 1, 2);
    assert.strictEqual(hasCycle, true);
  });

  it('should detect 3-node cycle (1 -> 2 -> 3 -> 1)', async () => {
    const mockKnex = createMockKnex({
      2: 3, // 2 reports to 3
      3: 1  // 3 reports to 1
    });
    // Assigning 1's supervisor to 2 creates 1 -> 2 -> 3 -> 1
    const hasCycle = await detectSupervisorCycle(mockKnex, 1, 2);
    assert.strictEqual(hasCycle, true);
  });

  it('should allow valid acyclic hierarchy (1 -> 2 -> 3 -> null)', async () => {
    const mockKnex = createMockKnex({
      2: 3, // 2 reports to 3
      3: null // 3 is top level
    });
    // Assigning 1's supervisor to 2 creates 1 -> 2 -> 3 (valid!)
    const hasCycle = await detectSupervisorCycle(mockKnex, 1, 2);
    assert.strictEqual(hasCycle, false);
  });
});
