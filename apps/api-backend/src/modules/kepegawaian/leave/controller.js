/**
 * Leave & Overtime Controller
 * Modul Kepegawaian - Core Aldepos
 * Handles all Leave Types, Holidays, Ledger Balances, Requests, Approvals, Overtimes, and Reports
 */

const leaveService = require('./leaveService');
const holidayService = require('./holidayService');
const leaveTypeService = require('./leaveTypeService');
const leaveLedgerService = require('./leaveLedgerService');
const overtimeService = require('./overtimeService');

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
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateLeaveType(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.updateLeaveType(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Jenis cuti berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async toggleLeaveTypeActive(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { is_active } = req.body;
      const data = await leaveTypeService.toggleLeaveTypeActive(req.params.id, is_active, actor);
      return res.json({ success: true, data, message: 'Status jenis cuti berhasil diubah', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
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

  async getUnitApprovers(req, res) {
    try {
      const data = await leaveTypeService.getUnitApprovers(req.query.school_unit_id);
      return res.json({ success: true, data, message: 'Daftar approver satuan pendidikan', errors: null });
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
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getDelegations(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const isHr = actor.permissions.includes('kepegawaian.leave_types.manage');
      const empId = isHr ? req.query.employee_id : actor.employeeId;
      const data = await leaveTypeService.getDelegations(empId, req.query.school_unit_id);
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
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async deleteDelegation(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveTypeService.deleteDelegation(req.params.id, actor);
      return res.json({ success: true, data, message: 'Delegasi berhasil dicabut', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
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
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
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

  // =========================================================================
  // Holidays (Kalender Libur)
  // =========================================================================

  async getHolidays(req, res) {
    try {
      const data = await holidayService.getHolidays(req.query);
      return res.json({ success: true, data, message: 'Daftar hari libur', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async createHoliday(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await holidayService.createHoliday(req.body, actor);
      return res.status(201).json({ success: true, data, message: 'Hari libur berhasil ditambahkan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async updateHoliday(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await holidayService.updateHoliday(req.params.id, req.body, actor);
      return res.json({ success: true, data, message: 'Hari libur berhasil diperbarui', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async deleteHoliday(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await holidayService.deleteHoliday(req.params.id, actor);
      return res.json({ success: true, data, message: 'Hari libur berhasil dihapus', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  // =========================================================================
  // Balances & Ledger (Saldo & Jatah Cuti)
  // =========================================================================

  async getBalances(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveLedgerService.getBalances(req.query);
      return res.json({ success: true, data: data.data, meta: { total: data.total, page: data.page, per_page: data.perPage }, message: 'Daftar saldo cuti pegawai', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getMyBalance(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      if (!actor.employeeId) {
        return res.status(403).json({ success: false, data: null, message: 'Akun Anda tidak terikat dengan profil pegawai', errors: null });
      }
      const data = await leaveLedgerService.getEmployeeBalance(actor.employeeId, req.query.period);
      return res.json({ success: true, data, message: 'Saldo cuti saya', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getLedger(req, res) {
    try {
      const data = await leaveLedgerService.getLedger(req.params.employeeId, req.query.period_id);
      return res.json({ success: true, data, message: 'Mutasi buku besar (ledger) cuti', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async adjustBalance(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const { employee_id, delta_available, period_id, reason } = req.body;
      const data = await leaveLedgerService.adjustBalance({
        employeeId: employee_id,
        deltaAvailable: delta_available,
        periodId: period_id,
        reason,
        actor
      });
      return res.json({ success: true, data, message: 'Saldo cuti berhasil disesuaikan', errors: null });
    } catch (err) {
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  // =========================================================================
  // Leave Requests (Pengajuan, Preview, Approval, Revision, Cancel)
  // =========================================================================

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
        return res.status(403).json({ success: false, data: null, message: 'Akun Anda tidak terikat dengan profil pegawai', errors: null });
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
      const data = await leaveService.getCalendarMatrix(req.query, actor);
      return res.json({ success: true, data, message: 'Matriks kalender cuti bulanan', errors: null });
    } catch (err) {
      return res.status(500).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }

  async getReportsSummary(req, res) {
    try {
      const actor = await leaveService.resolveActor(req.user);
      const data = await leaveService.getReportsSummary(req.query, actor);
      return res.json({ success: true, data, message: 'Ringkasan laporan cuti', errors: null });
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
        return res.status(403).json({ success: false, data: null, message: 'Akun Anda tidak terikat dengan profil pegawai', errors: null });
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
      const isHr = actor.permissions.includes('kepegawaian.overtimes.manage');
      let targetEmpId = actor.employeeId;
      let origin = 'requested';

      if (req.body.employee_id && isHr) {
        targetEmpId = Number(req.body.employee_id);
        if (targetEmpId !== actor.employeeId) {
          origin = 'assigned';
        }
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
      return res.status(err.statusCode || 422).json({ success: false, data: null, message: err.message, errors: [err.message] });
    }
  }
}

module.exports = new LeaveController();
