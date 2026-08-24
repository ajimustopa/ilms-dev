/**
 * Records (Capaian Setoran Hafalan) Service for Alquran Module
 * Sesuai api-contract-alquran.md §2.2 & erd-alquran.md §2.2
 */
const db = require('../../../config/db/alquran');
const studentsService = require('../../akademik/students/service');
const employeesService = require('../../kepegawaian/employees/service');

class RecordsService {
  async listRecords(schoolUnitId, filters = {}) {
    let query = db('hafalan_records').where('school_unit_id', schoolUnitId);

    if (filters.student_ref_id) {
      query = query.where('student_ref_id', filters.student_ref_id);
    }
    if (filters.verification_status) {
      query = query.where('verification_status', filters.verification_status);
    }
    if (filters.date_from) {
      query = query.where('record_date', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('record_date', '<=', filters.date_to);
    }

    return query.orderBy('record_date', 'desc').orderBy('id', 'desc');
  }

  async getRecordById(schoolUnitId, id) {
    return db('hafalan_records')
      .where({ id, school_unit_id: schoolUnitId })
      .first();
  }

  async createRecord(schoolUnitId, data, teacherRefId = 1) {
    const { student_ref_id, juz, page_start = null, page_end = null, record_date, tajwid_score = null, notes = null } = data;

    // In-process validasi data santri dari modul Akademik & musyrif dari modul Kepegawaian
    await studentsService.getStudentById(student_ref_id);
    if (teacherRefId) {
      await employeesService.getEmployeeById(teacherRefId);
    }

    const [id] = await db('hafalan_records').insert({
      school_unit_id: schoolUnitId,
      student_ref_id,
      juz,
      page_start,
      page_end,
      record_date: record_date || new Date().toISOString().slice(0, 10),
      tajwid_score: tajwid_score !== null && tajwid_score !== undefined ? parseFloat(tajwid_score) : null,
      verification_status: 'pending',
      recorded_by_teacher_ref_id: teacherRefId,
      notes
    });

    const actualId = id || (await db('hafalan_records').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;
    return this.getRecordById(schoolUnitId, actualId);
  }

  async verifyRecord(schoolUnitId, id, data, verifierTeacherRefId = 1) {
    const record = await this.getRecordById(schoolUnitId, id);
    if (!record) return { error: 'NOT_FOUND', message: 'Data setoran hafalan tidak ditemukan' };

    // In-process validasi verifier dari modul Kepegawaian
    if (verifierTeacherRefId) {
      await employeesService.getEmployeeById(verifierTeacherRefId);
    }

    const { verification_status, notes } = data;

    await db('hafalan_records')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        verification_status,
        verified_by_teacher_ref_id: verifierTeacherRefId,
        verified_at: db.fn.now(),
        notes: notes !== undefined ? notes : record.notes
      });

    const updated = await this.getRecordById(schoolUnitId, id);
    return { data: updated };
  }
}

module.exports = new RecordsService();
