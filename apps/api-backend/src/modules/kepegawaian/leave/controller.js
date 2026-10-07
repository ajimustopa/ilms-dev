/**
 * Leave & Overtime Controller
 * Modul Kepegawaian - Core Aldepos
 * Handles all Leave Types, Holidays, Ledger Balances, Requests, Approvals, Overtimes, and Reports
 * Conforms to SPEC-CUTI-LEMBUR.md §9, §10, §11
 */

const fs = require('fs');
const path = require('path');
const leaveService = require('./leaveService');
const holidayService = require('./holidayService');
const leaveTypeService = require('./leaveTypeService');
const leaveLedgerService = require('./leaveLedgerService');
const overtimeService = require('./overtimeService');
const employeeProfileService = require('./employeeProfileService');
const leaveReportService = require('./leaveReportService');
const { resolveAttachmentPath } = require('./attachmentHelper');

class LeaveController {
  // =========================================================================
  // Master & Settings (Holidays, Types, Profiles, Approvers, Delegations)
  // =========================================================================

  async getLeaveTypes(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.getLeaveTypes(req.query, actor);
      return res.json({ success: true, data, message: 'Daftar jenis cuti', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLeaveTypeDetail(req, res) {
    try {
      const data = await leaveTypeService.getLeaveType(req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Jenis cuti tidak ditemukan', errors: null });
      return res.json({ success: true, data, message: 'Detail jenis cuti', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async createLeaveType(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.createLeaveType(req.body, actor);
      return res.status(201).json({ success: true, data, message: 'Jenis cuti berhasil dibuat', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async updateLeaveType(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.updateLeaveType(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Jenis cuti berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async toggleLeaveTypeActive(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { is_active } = req.body;
      const data = await leaveTypeService.toggleLeaveTypeActive(req.params.id, is_active, actor);
      return res.json({ success: true, data, message: 'Status jenis cuti berhasil diubah', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'ERROR', message: err.message }]
      });
    }
  }

  async deleteLeaveType(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await leaveTypeService.deleteLeaveType(req.params.id, actor);
      return res.json({ success: true, data: result, message: result.message, errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'ERROR', message: err.message }]
      });
    }
  }

  async getApprovalProfiles(req, res) {
    try {
      const data = await leaveTypeService.getApprovalProfiles();
      return res.json({ success: true, data, message: 'Daftar profil approval', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateApprovalProfile(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.updateApprovalProfile(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Profil approval berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'ERROR', message: err.message }]
      });
    }
  }

  async getUnitApprovers(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.getUnitApprovers(req.query.school_unit_id, actor);
      return res.json({ success: true, data, message: 'Daftar approver satuan pendidikan', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getPrincipalSuggestions(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.getPrincipalSuggestions(req.query.school_unit_id, actor);
      return res.json({ success: true, data, message: 'Saran kandidat Kepala Sekolah', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async setUnitApprover(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.setUnitApprover(req.body, actor);
      return res.json({ success: true, data, message: 'Approver unit berhasil disimpan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async updateUnitApprover(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.updateUnitApprover(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Approver unit berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async deleteUnitApprover(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await leaveTypeService.deleteUnitApprover(req.params.id, actor);
      return res.json({ success: true, data: result, message: result.message, errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'ERROR', message: err.message }]
      });
    }
  }

  async getDelegations(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.getDelegations(req.query.employee_id, req.query.school_unit_id, actor);
      return res.json({ success: true, data, message: 'Daftar delegasi persetujuan', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async createDelegation(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.createDelegation(req.body, actor);
      return res.status(201).json({ success: true, data, message: 'Delegasi persetujuan berhasil dibuat', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async deleteDelegation(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await leaveTypeService.deleteDelegation(req.params.id, actor);
      return res.json({ success: true, data: result, message: result.message, errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'ERROR', message: err.message }]
      });
    }
  }

  async getLeaveSettings(req, res) {
    try {
      const data = await leaveTypeService.getLeaveSettings(req.query.school_unit_id);
      return res.json({ success: true, data, message: 'Pengaturan modul cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateLeaveSettings(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.updateLeaveSettings(req.body.school_unit_id, req.body.settings, actor);
      return res.json({ success: true, data, message: 'Pengaturan cuti berhasil disimpan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async getAbsenceThresholds(req, res) {
    try {
      const data = await leaveTypeService.getAbsenceThresholds(req.query.school_unit_id);
      return res.json({ success: true, data, message: 'Ambang rawan ketidakhadiran', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateAbsenceThresholds(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.updateAbsenceThresholds(req.body.school_unit_id, req.body.thresholds, actor);
      return res.json({ success: true, data, message: 'Ambang rawan ketidakhadiran berhasil disimpan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  // =========================================================================
  // Employee Profile Completeness (SPEC §11.1)
  // =========================================================================

  async getEmployeeProfiles(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await employeeProfileService.getEmployeeProfiles(req.query, actor);
      return res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Daftar kelengkapan profil pegawai',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'SERVER_ERROR', message: err.message }]
      });
    }
  }

  async updateEmployeeProfile(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const reqMeta = { ip: req.ip || req.connection?.remoteAddress };
      const data = await employeeProfileService.updateEmployeeProfile(req.params.employeeId, req.body, actor, reqMeta);
      return res.json({
        success: true,
        data,
        message: 'Profil kelengkapan pegawai berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  // =========================================================================
  // Holidays (Kalender Libur) - SPEC §10.2, §10.4, §11.1
  // =========================================================================

  async getHolidays(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await holidayService.getHolidays(req.query, actor);
      return res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Daftar kalender libur',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'SERVER_ERROR', message: err.message }]
      });
    }
  }

  async createHoliday(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await holidayService.createHoliday(req.body, actor);
      return res.status(201).json({
        success: true,
        data,
        message: 'Hari libur berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async updateHoliday(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await holidayService.updateHoliday(req.params.id, req.body, actor);
      return res.json({
        success: true,
        data,
        message: 'Hari libur berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async deleteHoliday(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await holidayService.deleteHoliday(req.params.id, actor);
      return res.json({
        success: true,
        data,
        message: 'Hari libur berhasil dihapus',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'DELETE_ERROR', message: err.message }]
      });
    }
  }

  async importHolidays(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await holidayService.importHolidays(req.body, actor);
      return res.json({
        success: true,
        data: result.data || result,
        message: result.message || 'Hasil impor hari libur',
        errors: result.errors || null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'IMPORT_ERROR', message: err.message }]
      });
    }
  }

  async copyYearHolidays(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await holidayService.copyYear(req.body, actor);
      return res.json({
        success: true,
        data: result.data,
        message: result.message,
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'COPY_ERROR', message: err.message }]
      });
    }
  }

  async syncAcademicHolidays(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await holidayService.syncAcademicCalendar(req.body, actor);
      return res.json({
        success: true,
        data: result.data,
        message: result.message,
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'SYNC_ERROR', message: err.message }]
      });
    }
  }

  async applyJointLeaveDeduction(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await leaveLedgerService.applyJointLeaveDeduction(req.params.id, actor);
      return res.json({
        success: true,
        data: result,
        message: 'Pemotongan cuti bersama berhasil diproses',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'JOINT_LEAVE_ERROR', message: err.message }]
      });
    }
  }

  async getEffectiveHolidays(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      let targetEmployeeId = req.query.employee_id ? Number(req.query.employee_id) : actor.employeeId;
      const isPrivileged = actor.permissions.includes(HR_PERMISSIONS.LEAVE_READ) ||
                          actor.permissions.includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
                          actor.permissions.includes(HR_PERMISSIONS.HOLIDAYS_MANAGE);

      if (!isPrivileged || !targetEmployeeId) {
        targetEmployeeId = actor.employeeId;
      }

      if (!targetEmployeeId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Akun Anda tidak terikat dengan profil pegawai',
          errors: [{ code: 'ACTOR_NOT_EMPLOYEE', message: 'Pegawai tidak teridentifikasi' }]
        });
      }

      const fromDate = req.query.from || req.query.date_from || `${todayWIB().slice(0, 7)}-01`;
      const toDate = req.query.to || req.query.date_to || `${todayWIB().slice(0, 7)}-31`;
      const unitId = req.query.school_unit_id ? Number(req.query.school_unit_id) : (actor.unitScope !== 'all' && Array.isArray(actor.unitScope) ? actor.unitScope[0] : 1);

      const offDaysMap = await holidayService.getOffDaysForEmployee(targetEmployeeId, unitId, fromDate, toDate);
      const totalOffDays = Object.values(offDaysMap).filter(arr => arr.length > 0).length;

      return res.json({
        success: true,
        data: {
          employee_id: targetEmployeeId,
          from: fromDate,
          to: toDate,
          total_holiday_off_days: totalOffDays,
          off_days: offDaysMap
        },
        message: 'Daftar hari libur efektif pegawai',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'SERVER_ERROR', message: err.message }]
      });
    }
  }

  // =========================================================================
  // Balances & Ledger (SPEC §5, §11.3)
  // =========================================================================

  async getBalances(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await leaveLedgerService.getBalances(req.query, actor);
      return res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, page: result.page, per_page: result.perPage },
        message: 'Daftar saldo cuti pegawai',
        errors: null
      });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getMyBalance(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      if (!actor.employeeId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Akun Anda tidak terikat dengan profil pegawai aktif',
          errors: [{ code: 'ACTOR_NOT_EMPLOYEE', message: 'Bukan akun pegawai aktif' }]
        });
      }
      const data = await leaveLedgerService.getEmployeeBalance(actor.employeeId, req.query.period || '2026/2027', actor);
      return res.json({ success: true, data, message: 'Saldo cuti saya', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLedger(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.getLedgerEntries(req.params.employeeId, req.query, actor);
      return res.json({ success: true, data, message: 'Riwayat mutasi ledger cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async adjustBalance(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.adjustBalance(req.body, actor);
      return res.json({ success: true, data, message: 'Penyesuaian saldo cuti berhasil dicatat', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async bulkAssignBalances(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.bulkAssignEntitlements(req.body, actor);
      return res.json({ success: true, data, message: 'Bulk assign jatah cuti berhasil diproses', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async closePeriod(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.closePeriod(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: data.dry_run ? 'Pratinjau penutupan periode (dry-run)' : 'Periode cuti berhasil ditutup', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async reconcilePeriod(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.reconcileBalances(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: data.dry_run ? 'Hasil rekonsiliasi saldo (dry-run)' : 'Rekonsiliasi saldo berhasil diterapkan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getBalancePolicies(req, res) {
    try {
      const data = await leaveLedgerService.getBalancePolicies();
      return res.json({ success: true, data, message: 'Daftar kebijakan saldo cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateBalancePolicy(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.updateBalancePolicy(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Kebijakan saldo cuti berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  // =========================================================================
  // Leave Requests (Pengajuan, Preview, Approval, Revision, Cancel, Attachment)
  // =========================================================================

  async previewDuration(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.computeDurationForRequest(req.body, actor);
      return res.json({
        success: true,
        data,
        message: 'Pratinjau durasi cuti berhasil dihitung',
        errors: null
      });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async previewLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.previewLeaveRequest(req.body, actor);
      return res.json({ success: true, data, message: 'Pratinjau perhitungan cuti', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }] });
    }
  }

  async createLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.createLeaveRequest(req.body, actor);
      return res.status(201).json({ success: true, data, message: 'Permohonan cuti/izin berhasil diajukan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async listLeaveRequests(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await leaveService.getLeaveRequests(req.query, actor);
      return res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, page: result.page, per_page: result.perPage },
        message: 'Daftar permohonan cuti',
        errors: null
      });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getMyLeaveRequests(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      if (!actor.employeeId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Akun Anda tidak terikat dengan profil pegawai aktif',
          errors: [{ code: 'ACTOR_NOT_EMPLOYEE', message: 'Bukan akun pegawai aktif' }]
        });
      }
      const query = { ...req.query, employee_id: actor.employeeId };
      const result = await leaveService.getLeaveRequests(query, actor);
      return res.json({ success: true, data: result.data, message: 'Daftar cuti saya', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLeaveRequestDetail(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.getLeaveRequestById(req.params.id, actor);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Pengajuan cuti tidak ditemukan', errors: null });
      return res.json({ success: true, data, message: 'Detail permohonan cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLeaveAttachment(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const leave = await leaveService.getLeaveRequestById(req.params.id, actor);
      if (!leave) {
        return res.status(404).json({ success: false, data: null, message: 'Pengajuan cuti tidak ditemukan', errors: null });
      }

      if (!leave.attachment_url) {
        return res.status(404).json({ success: false, data: null, message: 'Pengajuan cuti ini tidak memiliki lampiran berkas', errors: null });
      }

      // Authorization check: owner OR HR in scope OR step approver
      const isOwner = actor.employeeId && Number(actor.employeeId) === Number(leave.employee_id);
      const isHr = actor.permissions.some(p => ['kepegawaian.leave_requests.manage', 'kepegawaian.leave_requests.read', 'kepegawaian.leave_requests.override'].includes(p)) || actor.isHR;

      if (!isOwner && !isHr) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Anda tidak memiliki hak akses untuk mengunduh lampiran pengajuan cuti ini',
          errors: [{ code: 'FORBIDDEN_SCOPE', message: 'Akses lampiran ditolak' }]
        });
      }

      const { absolutePath, exists } = resolveAttachmentPath(leave.attachment_url);
      if (!exists || !fs.existsSync(absolutePath)) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Berkas lampiran fisik tidak ditemukan di server penyimpanan',
          errors: [{ code: 'FILE_NOT_FOUND', message: 'Berkas fisik tidak ditemukan' }]
        });
      }

      const mimeType = leave.attachment_mime_type || 'application/octet-stream';
      const filename = leave.attachment_name || path.basename(absolutePath);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      const fileStream = fs.createReadStream(absolutePath);
      fileStream.pipe(res);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        data: null,
        message: err.message,
        errors: [{ code: err.code || 'SERVER_ERROR', message: err.message }]
      });
    }
  }

  async approveLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { comment, bypass } = req.body;
      const data = await leaveService.approveLeaveRequest(req.params.id, actor, comment, bypass);
      return res.json({ success: true, data, message: 'Permohonan cuti berhasil disetujui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async rejectLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const reason = req.body.rejection_reason || req.body.reason;
      const data = await leaveService.rejectLeaveRequest(req.params.id, actor, reason);
      return res.json({ success: true, data, message: 'Permohonan cuti berhasil ditolak', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async requestRevision(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.requestRevision(req.params.id, actor, req.body.comment);
      return res.json({ success: true, data, message: 'Permintaan revisi berhasil dikirim', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLeaveInbox(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.getLeaveInbox(req.query, actor);
      return res.json({ success: true, data: data.data, meta: { total: data.total }, message: 'Kotak masuk persetujuan cuti', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLeaveNeedsReview(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.getLeaveNeedsReview(req.query, actor);
      return res.json({ success: true, data: data.data, meta: { total: data.total }, message: 'Daftar cuti perlu peninjauan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async resubmitLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.resubmitLeaveRequest(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Permohonan cuti berhasil dikirim ulang', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async reassignApprover(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.reassignApprover(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Approver berhasil dialihkan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async reclassifyLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.reclassifyLeaveRequest(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Jenis cuti berhasil direklasifikasi', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async recalculateLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.recalculateLeaveRequest(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Durasi cuti berhasil direkalkulasi', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async bulkApproveLeaveRequests(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { ids, comment } = req.body;
      const data = await leaveService.bulkApproveLeaveRequests(ids, actor, comment);
      return res.json({ success: true, data: data.results, message: 'Bulk approve selesai diproses', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async bulkRejectLeaveRequests(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { ids, reason } = req.body;
      const data = await leaveService.bulkRejectLeaveRequests(ids, actor, reason);
      return res.json({ success: true, data: data.results, message: 'Bulk reject selesai diproses', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async cancelLeaveRequest(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const reason = req.body.cancel_reason || req.body.reason;
      const data = await leaveService.cancelLeaveRequest(req.params.id, actor, reason);
      return res.json({ success: true, data, message: 'Pengajuan cuti berhasil dibatalkan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getCalendarMatrix(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveReportService.getCalendarMatrix(req.query, actor);
      return res.json({ success: true, data, message: 'Matriks kalender ketidakhadiran', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getReportsSummary(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveReportService.getReportsSummary(req.query, actor);
      return res.json({ success: true, data, message: 'Ringkasan laporan cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getReportsByType(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveReportService.getReportsByType(req.query, actor);
      return res.json({ success: true, data, message: 'Laporan per jenis cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getReportsTrend(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveReportService.getReportsTrend(req.query, actor);
      return res.json({ success: true, data, message: 'Tren bulanan ketidakhadiran & lembur', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getReportsTop(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveReportService.getReportsTop(req.query, actor);
      return res.json({ success: true, data, message: 'Daftar pegawai paling sering tidak hadir', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getReportsRecap(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveReportService.getReportsRecap(req.query, actor);
      return res.json({ success: true, data, message: 'Rekapitulasi cuti & lembur per pegawai', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async exportReports(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { filename, contentType, buffer } = await leaveReportService.exportReport(req.query, actor);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getPayrollFeed(req, res) {
    try {
      const data = await leaveService.getPayrollFeed(req.query);
      return res.json({ success: true, data: data.data, meta: { period: data.period, as_of: data.as_of }, message: 'Feed data cuti & lembur ke payroll', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  // =========================================================================
  // Overtime (Lembur)
  // =========================================================================

  async listOvertimes(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const result = await overtimeService.getOvertimes(req.query, actor);
      return res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, page: result.page, per_page: result.perPage },
        message: 'Daftar pengajuan lembur',
        errors: null
      });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getMyOvertimes(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      if (!actor.employeeId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Akun Anda tidak terikat dengan profil pegawai aktif',
          errors: [{ code: 'ACTOR_NOT_EMPLOYEE', message: 'Bukan akun pegawai aktif' }]
        });
      }
      const query = { ...req.query, employee_id: actor.employeeId };
      const result = await overtimeService.getOvertimes(query, actor);
      return res.json({ success: true, data: result.data, message: 'Daftar lembur saya', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getOvertimeDetail(req, res) {
    try {
      const data = await overtimeService.getOvertimeById(req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data lembur tidak ditemukan', errors: null });
      return res.json({ success: true, data, message: 'Detail lembur', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async createOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const isHr = actor.permissions.some(p => ['kepegawaian.overtimes.manage', 'kepegawaian.leave_requests.manage'].includes(p)) || actor.isHR;
      let targetEmpId = actor.employeeId;
      let origin = 'requested';

      if (req.body.employee_id && isHr) {
        targetEmpId = Number(req.body.employee_id);
        if (targetEmpId !== actor.employeeId) {
          origin = 'assigned';
        }
      }

      if (!targetEmpId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Akun Anda tidak terikat dengan profil pegawai aktif',
          errors: [{ code: 'ACTOR_NOT_EMPLOYEE', message: 'Bukan akun pegawai aktif' }]
        });
      }

      const data = await overtimeService.createOvertime({
        ...req.body,
        employee_id: targetEmpId,
        origin
      }, actor);

      return res.status(201).json({ success: true, data, message: 'Pengajuan lembur berhasil dibuat', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async approveOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await overtimeService.approveOvertime(req.params.id, actor, req.body.comment);
      return res.json({ success: true, data, message: 'Lembur berhasil disetujui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async rejectOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const reason = req.body.rejection_reason || req.body.reason;
      const data = await overtimeService.rejectOvertime(req.params.id, actor, reason);
      return res.json({ success: true, data, message: 'Lembur berhasil ditolak', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async cancelOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const reason = req.body.cancel_reason || req.body.reason;
      const data = await overtimeService.cancelOvertime(req.params.id, actor, reason);
      return res.json({ success: true, data, message: 'Lembur berhasil dibatalkan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async reconcileOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await overtimeService.reconcileOvertime(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Rekonsiliasi lembur berhasil disimpan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }
  async previewOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await overtimeService.previewOvertime(req.body, actor);
      return res.json({ success: true, data, message: 'Pratinjau lembur', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async bulkCreateOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await overtimeService.bulkCreateOvertime(req.body, actor);
      return res.status(201).json({ success: true, data, message: 'Penugasan lembur massal berhasil diproses', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async bulkApproveOvertime(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const ids = req.body.ids || req.body.overtime_ids || [];
      const data = await overtimeService.bulkApproveOvertimes(ids, req.body, actor);
      return res.json({ success: true, data, message: 'Persetujuan lembur massal selesai diproses', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }

  async getOvertimeSettings(req, res) {
    try {
      const data = await overtimeService.getOvertimeSettings(req.query.school_unit_id);
      return res.json({ success: true, data, message: 'Pengaturan lembur', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateOvertimeSettings(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await overtimeService.updateOvertimeSettings(req.body, actor);
      return res.json({ success: true, data, message: 'Pengaturan lembur berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({
        success: false,
        data: null,
        message: err.message,
        errors: err.errors || [{ code: err.code || 'VALIDATION_ERROR', message: err.message }]
      });
    }
  }
}

module.exports = new LeaveController();
