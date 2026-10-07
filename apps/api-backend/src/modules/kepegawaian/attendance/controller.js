/**
 * Attendance Controller Implementation
 * Modul Kepegawaian - Fitur 3: Kehadiran
 */
const attendanceService = require('./service');

class AttendanceController {
  // 1. Presensi
  async listAttendances(req, res, next) {
    try {
      const result = await attendanceService.listAttendances(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const result = await attendanceService.checkIn(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Presensi masuk (check-in) berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req, res, next) {
    try {
      const result = await attendanceService.checkOut(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Presensi keluar (check-out) berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async correctAttendance(req, res, next) {
    try {
      const result = await attendanceService.correctAttendance(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data presensi berhasil diperbarui/dikoreksi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const result = await attendanceService.getTodayStatus(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status presensi hari ini berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Cuti & Izin
  async listLeaveRequests(req, res, next) {
    try {
      const result = await attendanceService.listLeaveRequests(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan cuti/izin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyLeaveRequests(req, res, next) {
    try {
      const result = await attendanceService.getMyLeaveRequests(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan izin pribadi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getLeaveAttachment(req, res, next) {
    try {
      const result = await attendanceService.getLeaveAttachment(req.params.id, req.user);
      
      if (req.query.download === 'true' || req.query.raw === 'true') {
        if (result.exists_on_disk) {
          return res.download(result.absolute_file_path, result.attachment_name);
        }
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Data berkas lampiran izin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLeaveRequest(req, res, next) {
    try {
      const result = await attendanceService.createLeaveRequest(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengajuan cuti/izin berhasil dikirim',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async approveLeaveRequest(req, res, next) {
    try {
      const result = await attendanceService.approveLeaveRequest(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan cuti/izin berhasil disetujui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectLeaveRequest(req, res, next) {
    try {
      const result = await attendanceService.rejectLeaveRequest(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan cuti/izin berhasil ditolak',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Lembur
  async listOvertimes(req, res, next) {
    try {
      const result = await attendanceService.listOvertimes(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan lembur berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyOvertimes(req, res, next) {
    try {
      const result = await attendanceService.getMyOvertimes(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan lembur pribadi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createOvertime(req, res, next) {
    try {
      const result = await attendanceService.createOvertime(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengajuan lembur berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async approveOvertime(req, res, next) {
    try {
      const result = await attendanceService.approveOvertime(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan lembur berhasil disetujui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectOvertime(req, res, next) {
    try {
      const result = await attendanceService.rejectOvertime(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan lembur ditolak',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3b. Penugasan Jadwal (3 Metode Penetapan)
  async listScheduleAssignments(req, res, next) {
    try {
      const result = await attendanceService.listScheduleAssignments(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar penugasan jadwal kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getScheduleAssignmentById(req, res, next) {
    try {
      const result = await attendanceService.getScheduleAssignmentById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail penugasan jadwal kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createScheduleAssignment(req, res, next) {
    try {
      const result = await attendanceService.createScheduleAssignment(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Penugasan jadwal berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateScheduleAssignment(req, res, next) {
    try {
      const result = await attendanceService.updateScheduleAssignment(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Penugasan jadwal berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteScheduleAssignment(req, res, next) {
    try {
      const result = await attendanceService.deleteScheduleAssignment(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Penugasan jadwal berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async setAllEmployeesDefaultLocation(req, res, next) {
    try {
      const unitId = req.body.satuan_pendidikan_id || req.query.satuan_pendidikan_id || 1;
      const result = await attendanceService.setAllEmployeesDefaultLocation(unitId);
      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Master Lokasi Absensi
  async listLocations(req, res, next) {
    try {
      const result = await attendanceService.listLocations(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar lokasi absensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getLocationById(req, res, next) {
    try {
      const result = await attendanceService.getLocationById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail lokasi absensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLocation(req, res, next) {
    try {
      const result = await attendanceService.createLocation(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Lokasi absensi baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLocation(req, res, next) {
    try {
      const result = await attendanceService.updateLocation(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lokasi absensi berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultLocation(req, res, next) {
    try {
      const result = await attendanceService.setDefaultLocation(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: result.message || 'Lokasi berhasil ditetapkan sebagai Titik GPS Default Unit',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLocation(req, res, next) {
    try {
      const result = await attendanceService.deleteLocation(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lokasi absensi berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Pengaturan Jam Kerja
  async listWorkSchedules(req, res, next) {
    try {
      const result = await attendanceService.listWorkSchedules(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengaturan jam kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getWorkScheduleById(req, res, next) {
    try {
      const result = await attendanceService.getWorkScheduleById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail pengaturan jam kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createWorkSchedule(req, res, next) {
    try {
      const result = await attendanceService.createWorkSchedule(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengaturan jam kerja baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkSchedule(req, res, next) {
    try {
      const result = await attendanceService.updateWorkSchedule(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengaturan jam kerja berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorkSchedule(req, res, next) {
    try {
      const result = await attendanceService.deleteWorkSchedule(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengaturan jam kerja berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Pengajuan & Klarifikasi Lupa Absen
  async submitClarification(req, res, next) {
    try {
      const result = await attendanceService.submitClarification(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengajuan klarifikasi lupa absen berhasil dikirim dan menunggu konfirmasi HRD',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listClarifications(req, res, next) {
    try {
      const result = await attendanceService.listClarifications(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar klarifikasi absensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getClarificationDetail(req, res, next) {
    try {
      const result = await attendanceService.getClarificationDetail(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail pengajuan klarifikasi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async reviewClarification(req, res, next) {
    try {
      const result = await attendanceService.reviewClarification(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: `Klarifikasi absensi berhasil di-${req.body.status === 'approved' ? 'setujui' : 'tolak'}`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Dasbor HRD & Metrik
  async getDashboardSummary(req, res, next) {
    try {
      const result = await attendanceService.getDashboardSummary(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Ringkasan dasbor presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceDetail(req, res, next) {
    try {
      const result = await attendanceService.getAttendanceDetail(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail catatan presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. Belum Presensi & Quick Mark
  async listAbsentCandidates(req, res, next) {
    try {
      const result = await attendanceService.listAbsentCandidates(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pegawai belum presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async quickMarkAttendance(req, res, next) {
    try {
      const result = await attendanceService.quickMarkAttendance(req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: result.message || 'Status presensi berhasil ditandai',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Anomali & Tindak Lanjut
  async listAnomalies(req, res, next) {
    try {
      const result = await attendanceService.listAnomalies(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar anomali presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async resolveAnomaly(req, res, next) {
    try {
      const result = await attendanceService.resolveAnomaly(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Tindak lanjut anomali presensi berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. Rekap Bulanan & Matriks 1-31
  async getMonthlySummary(req, res, next) {
    try {
      const result = await attendanceService.getMonthlySummary(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Rekapitulasi presensi bulanan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMonthlyMatrix(req, res, next) {
    try {
      const result = await attendanceService.getMonthlyMatrix(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Matriks kalender presensi bulanan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMonthlyTrends(req, res, next) {
    try {
      const result = await attendanceService.getMonthlyTrends(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Tren kehadiran harian bulanan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async exportMonthlyExcel(req, res, next) {
    try {
      const { filename, buffer } = await attendanceService.exportMonthlyExcel(req.query, req.user);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async exportMonthlyPdf(req, res, next) {
    try {
      const { filename, buffer } = await attendanceService.exportMonthlyPdf(req.query, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  // 11. Manual Entry Single & Bulk
  async manualEntry(req, res, next) {
    try {
      const result = await attendanceService.manualEntry(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Presensi manual berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async bulkManualEntry(req, res, next) {
    try {
      const result = await attendanceService.bulkManualEntry(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: result.message || 'Presensi massal berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 12. Tutup Periode Presensi & Payroll Pipeline
  async getPeriodLockStatus(req, res, next) {
    try {
      const result = await attendanceService.getPeriodLockStatus(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status kesiapan dan penguncian periode presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getPeriodReadiness(req, res, next) {
    try {
      const result = await attendanceService.getPeriodReadiness(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data checklist audit kesiapan periode presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async lockPeriod(req, res, next) {
    try {
      const result = await attendanceService.lockPeriod(req.body, req.user);
      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message || 'Periode presensi berhasil dikunci',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async unlockPeriod(req, res, next) {
    try {
      const result = await attendanceService.unlockPeriod(req.body, req.user);
      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message || 'Kunci periode presensi berhasil dibuka',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async submitPeriodToPayroll(req, res, next) {
    try {
      const result = await attendanceService.submitPeriodToPayroll(req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: result.message || 'Data presensi berhasil diserahkan ke modul Penggajian (Payroll)',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();
