/**
 * Attendance Controller Implementation
 * Modul Kepegawaian - Fitur 3: Kehadiran
 */
const attendanceService = require('./service');

class AttendanceController {
  // 1. Presensi
  async listAttendances(req, res, next) {
    try {
      const result = await attendanceService.listAttendances(req.query);
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
      const result = await attendanceService.checkOut(req.params.id, req.body);
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
      const result = await attendanceService.correctAttendance(req.params.id, req.body);
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
}

module.exports = new AttendanceController();
