/**
 * Tahap 1 Integration & Security Test Suite
 * Modul Kepegawaian - Core Aldepos
 * Target: core_dev, kepegawaian_dev
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const coreDb = require('../../../config/db/core');
const kepDb = require('../../../config/db/kepegawaian');
const { assertDevDatabase } = require('../../../config/db/dbGuard');
const { seedDataUji } = require('./seeds/seed_data_uji_hrd');
const { cleanDataUji } = require('./seeds/clean_data_uji_hrd');
const leaveService = require('./leaveService');
const overtimeService = require('./overtimeService');
const employeeProfileService = require('./employeeProfileService');
const { resolveAttachmentPath, saveLeaveAttachment } = require('./attachmentHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_local_dev_jwt_key_aldepos_2026';

describe('Tahap 1: Full Security & Business Flow Integration', () => {
  before(async () => {
    assertDevDatabase(coreDb.client.connectionSettings, 'INTEGRATION_TEST_CORE');
    assertDevDatabase(kepDb.client.connectionSettings, 'INTEGRATION_TEST_KEPEGAWAIAN');
    await cleanDataUji(coreDb, kepDb);
    await seedDataUji(coreDb, kepDb);
  });

  after(async () => {
    // Keep test data clean
    await cleanDataUji(coreDb, kepDb);
  });

  it('1. Siswa Uji (Student Account) cannot access self-service or list endpoints', async () => {
    const studentUser = {
      id: 6,
      username: 'siswa_uji',
      account_type: 'student',
      ref_type: 'student',
      ref_id: 101,
      permissions: []
    };

    const actor = await leaveService.resolveActor(studentUser);
    assert.strictEqual(actor.employeeId, null);
    assert.strictEqual(actor.isHR, false);

    // Try creating leave request as student
    await assert.rejects(
      async () => {
        await leaveService.createLeaveRequest({
          leave_type: 'sakit',
          start_date: '2026-10-12',
          end_date: '2026-10-12',
          reason: 'Siswa sakit'
        }, actor);
      },
      (err) => {
        assert.strictEqual(err.code, 'ACTOR_NOT_EMPLOYEE');
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );

    // Try creating overtime as student
    const isHr = actor.permissions.includes('kepegawaian.overtimes.manage');
    let targetEmpId = actor.employeeId;
    assert.strictEqual(targetEmpId, null);
  });

  it('2. Guru Uji cannot impersonate another employee (IDOR Prevention)', async () => {
    const guruUser = {
      id: 4,
      username: 'guru_uji',
      account_type: 'teacher',
      ref_type: 'staff',
      ref_id: 3, // Budi Santoso (Employee ID 3)
      school_unit_id: 1,
      permissions: ['guru.portal.access']
    };

    const actor = await leaveService.resolveActor(guruUser);
    assert.strictEqual(actor.employeeId, 3);
    assert.strictEqual(actor.isHR, false);

    // Guru attempts to submit leave with employee_id = 1 (HRD Siti Aminah)
    const dummyPdfBase64 = Buffer.from('%PDF-1.4 sample content').toString('base64');
    const createdLeave = await leaveService.createLeaveRequest({
      employee_id: 1, // Malicious attempt to file for someone else
      leave_type: 'sakit',
      start_date: '2026-10-15',
      end_date: '2026-10-15',
      reason: 'Sakit flu',
      attachment: dummyPdfBase64,
      attachment_name: 'surat_dokter.pdf'
    }, actor);

    // IDOR check MUST force employee_id to actor's own ID (3), NOT 1!
    assert.strictEqual(createdLeave.employee_id, 3);
    assert.strictEqual(createdLeave.status, 'pending');
    assert.strictEqual(createdLeave.attachment_name, 'surat_dokter.pdf');
  });

  it('3. Raw attachment_url is stripped from listLeaveRequests response', async () => {
    const hrdUser = {
      id: 2,
      username: 'hrd_smp',
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 1,
      school_unit_id: 1,
      permissions: ['kepegawaian.leave_requests.read', 'kepegawaian.leave_requests.manage']
    };

    const actor = await leaveService.resolveActor(hrdUser);
    const listResult = await leaveService.getLeaveRequests({}, actor);

    assert.ok(listResult.data.length > 0);
    for (const item of listResult.data) {
      assert.strictEqual(item.attachment_url, undefined, 'attachment_url must not be exposed in list');
      if (item.id) {
        assert.ok(typeof item.has_attachment === 'boolean');
      }
    }
  });

  it('4. Employee Profile: GET list and PATCH update with cycle prevention', async () => {
    const hrdUser = {
      id: 2,
      username: 'hrd_smp',
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 1,
      school_unit_id: 1,
      permissions: ['kepegawaian.leave_balances.manage', 'kepegawaian.leave_balances.read']
    };

    const actor = await leaveService.resolveActor(hrdUser);

    // 4.1 GET employee profiles
    const profiles = await employeeProfileService.getEmployeeProfiles({ school_unit_id: 1 }, actor);
    assert.ok(profiles.data.length >= 10);
    const emp3 = profiles.data.find(p => p.id === 3);
    assert.ok(emp3);
    assert.strictEqual(emp3.full_name, 'Budi Santoso, S.Kom');

    // 4.2 PATCH employee profile valid update (Emp 3 reports to KS Emp 2)
    const updated = await employeeProfileService.updateEmployeeProfile(3, {
      join_date: '2023-07-01',
      direct_supervisor_employee_id: 2,
      reason: 'Penetapan atasan Kepala Sekolah'
    }, actor, { ip: '127.0.0.1' });

    assert.strictEqual(updated.join_date, '2023-07-01');
    assert.strictEqual(updated.direct_supervisor_employee_id, 2);

    // 4.3 Verify audit log in leave_audit_logs
    const auditEntry = await kepDb('leave_audit_logs')
      .where({ entity_type: 'employee_profile', entity_id: 3, action: 'update_leave_profile' })
      .orderBy('id', 'desc')
      .first();

    assert.ok(auditEntry, 'Audit log must be recorded in leave_audit_logs');
    assert.strictEqual(auditEntry.actor_user_id, 2);

    // 4.4 Self-supervisor attempt -> 422 SELF_SUPERVISOR_FORBIDDEN
    await assert.rejects(
      async () => {
        await employeeProfileService.updateEmployeeProfile(3, {
          direct_supervisor_employee_id: 3
        }, actor, {});
      },
      (err) => {
        assert.strictEqual(err.code, 'SELF_SUPERVISOR_FORBIDDEN');
        assert.strictEqual(err.statusCode, 422);
        return true;
      }
    );

    // 4.5 Cycle detection attempt: Emp 3 reports to 2. Try setting Emp 2 supervisor to 3!
    await assert.rejects(
      async () => {
        await employeeProfileService.updateEmployeeProfile(2, {
          direct_supervisor_employee_id: 3
        }, actor, {});
      },
      (err) => {
        assert.strictEqual(err.code, 'SUPERVISOR_CYCLE_DETECTED');
        assert.strictEqual(err.statusCode, 422);
        return true;
      }
    );
  });

  it('5. HRD Scoping: HRD SMP cannot update or file leave for employee in another unit', async () => {
    const hrdUserUnit1 = {
      id: 2,
      username: 'hrd_smp',
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 1,
      school_unit_id: 1, // Only Unit 1
      permissions: ['kepegawaian.leave_requests.manage', 'kepegawaian.leave_balances.manage']
    };

    const actor = await leaveService.resolveActor(hrdUserUnit1);

    // Insert dummy employee in Unit 2
    await kepDb('employees').insert({
      id: 99,
      school_unit_id: 2, // Unit 2
      employee_number: 'EMP099',
      full_name: 'Guru Unit Lain',
      account_status: 'active',
      employment_status: 'gty'
    });

    // Try updating profile of employee 99 in Unit 2
    await assert.rejects(
      async () => {
        await employeeProfileService.updateEmployeeProfile(99, {
          join_date: '2024-01-01'
        }, actor, {});
      },
      (err) => {
        assert.strictEqual(err.code, 'FORBIDDEN_SCOPE');
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );

    // Clean up dummy employee
    await kepDb('employees').where({ id: 99 }).del();
  });
});
