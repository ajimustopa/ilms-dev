/**
 * Attendance Audit Service
 * Modul Kepegawaian - Pencatatan Audit Trail Presensi Pegawai
 */
const db = require('../../../config/db/kepegawaian');

class AttendanceAuditService {
  /**
   * Helper serialisasi objek aman (menghilangkan Knex raw/functions/circular)
   */
  _safeSerialize(obj) {
    if (!obj || typeof obj !== 'object') return null;
    try {
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) {
          clean[k] = null;
        } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          clean[k] = v;
        } else if (v instanceof Date) {
          clean[k] = v.toISOString();
        } else if (typeof v === 'object' && !v.toSQL && !v.client) {
          clean[k] = v;
        }
      }
      return JSON.stringify(clean);
    } catch (e) {
      return null;
    }
  }

  /**
   * Catat aksi mutasi / koreksi / tindak lanjut presensi
   */
  async log({
    attendanceId,
    action,
    performedBy = null,
    oldValues = null,
    newValues = null,
    reason,
    ipAddress = null
  }, trx = null) {
    try {
      const q = trx ? trx('attendance_audit_logs') : db('attendance_audit_logs');
      const [id] = await q.insert({
        attendance_id: attendanceId,
        action,
        performed_by: performedBy,
        old_values: this._safeSerialize(oldValues),
        new_values: this._safeSerialize(newValues),
        reason: reason || 'Pembaruan catatan presensi',
        ip_address: ipAddress || null,
        created_at: db.fn.now()
      });
      return id;
    } catch (err) {
      console.error('[AttendanceAuditService] Gagal mencatat audit log:', err.message);
      return null;
    }
  }

  /**
   * Ambil daftar audit log untuk presensi tertentu
   */
  async getLogs(attendanceId) {
    return this.getLogsForAttendance(attendanceId);
  }

  async getLogsForAttendance(attendanceId) {
    return db('attendance_audit_logs')
      .where({ attendance_id: attendanceId })
      .orderBy('created_at', 'desc');
  }
}

module.exports = new AttendanceAuditService();
