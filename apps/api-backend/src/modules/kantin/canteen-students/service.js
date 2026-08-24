/**
 * Canteen Students Service
 * Sesuai api-contract-kantin.md Modul 3 & erd-kantin.md §2.9
 */
const bcrypt = require('bcryptjs');
const db = require('../../../config/db/kantin');
const { getStudentDisplayInfo } = require('../utils/studentHelper');

class CanteenStudentsService {
  async listStudents(schoolUnitId, query = {}) {
    let q = db('canteen_students').where('school_unit_id', schoolUnitId);

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.search) {
      q = q.where(function() {
        this.where('cached_student_name', 'like', `%${query.search}%`)
            .orWhere('cached_class_group_name', 'like', `%${query.search}%`)
            .orWhere('qr_code', 'like', `%${query.search}%`);
      });
    }

    const students = await q.orderBy('id', 'desc');

    const result = [];
    for (const s of students) {
      const displayInfo = await getStudentDisplayInfo(s.student_id);
      result.push({
        id: s.id,
        student_id: s.student_id,
        student_name: displayInfo.student_name,
        class_group_name: displayInfo.class_group_name,
        qr_code: s.qr_code,
        wallet_balance: parseFloat(s.wallet_balance),
        custom_daily_limit: s.custom_daily_limit ? parseFloat(s.custom_daily_limit) : null,
        is_blocked_by_parent: Boolean(s.is_blocked_by_parent),
        status: s.status,
        status_note: s.status_note
      });
    }

    return result;
  }

  async getStudentByStudentId(schoolUnitId, studentId) {
    const s = await db('canteen_students')
      .where({ student_id: studentId, school_unit_id: schoolUnitId })
      .first();

    if (!s) return null;

    const displayInfo = await getStudentDisplayInfo(studentId);
    return {
      id: s.id,
      student_id: s.student_id,
      student_name: displayInfo.student_name,
      class_group_name: displayInfo.class_group_name,
      qr_code: s.qr_code,
      wallet_balance: parseFloat(s.wallet_balance),
      custom_daily_limit: s.custom_daily_limit ? parseFloat(s.custom_daily_limit) : null,
      is_blocked_by_parent: Boolean(s.is_blocked_by_parent),
      has_child_pin: Boolean(s.child_pin_hash),
      has_parent_pin: Boolean(s.parent_pin_hash),
      status: s.status,
      status_note: s.status_note
    };
  }

  async ensureCanteenStudentRecord(schoolUnitId, studentId) {
    let s = await db('canteen_students').where({ student_id: studentId }).first();
    if (!s) {
      const displayInfo = await getStudentDisplayInfo(studentId);
      const defaultQr = `QR-CANTIN-STU-${String(studentId).padStart(4, '0')}`;
      const defaultPinHash = await bcrypt.hash('123456', 10);

      const [id] = await db('canteen_students').insert({
        school_unit_id: schoolUnitId,
        student_id: studentId,
        cached_student_name: displayInfo.student_name,
        cached_class_group_name: displayInfo.class_group_name,
        qr_code: defaultQr,
        wallet_balance: 0,
        child_pin_hash: defaultPinHash,
        parent_pin_hash: defaultPinHash,
        status: 'active'
      });

      s = await db('canteen_students').where({ id }).first();
    }
    return s;
  }

  async updateStatus(schoolUnitId, studentId, payload) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    const { status, status_note = null } = payload;

    await db('canteen_students')
      .where({ id: s.id })
      .update({
        status,
        status_note,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return this.getStudentByStudentId(schoolUnitId, studentId);
  }

  async generateQr(schoolUnitId, studentId) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    const newQr = `QR-CANTIN-STU-${String(studentId).padStart(4, '0')}`;

    await db('canteen_students')
      .where({ id: s.id })
      .update({ qr_code: newQr, updated_at: db.fn.now() });

    return this.getStudentByStudentId(schoolUnitId, studentId);
  }

  async updateQr(schoolUnitId, studentId, qrCode) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ qr_code: qrCode, updated_at: db.fn.now() });

    return this.getStudentByStudentId(schoolUnitId, studentId);
  }

  async resetChildPin(schoolUnitId, studentId) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    // Generate 6 digit random PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = await bcrypt.hash(newPin, 10);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ child_pin_hash: pinHash, updated_at: db.fn.now() });

    return {
      student_id: Number(studentId),
      new_pin: newPin,
      message: 'PIN anak berhasil di-reset'
    };
  }

  async resetParentPin(schoolUnitId, studentId) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = await bcrypt.hash(newPin, 10);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ parent_pin_hash: pinHash, updated_at: db.fn.now() });

    return {
      student_id: Number(studentId),
      new_pin: newPin,
      message: 'PIN orangtua berhasil di-reset'
    };
  }
}

module.exports = new CanteenStudentsService();
