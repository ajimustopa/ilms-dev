/**
 * Targets Service for Alquran Module
 * Sesuai api-contract-alquran.md §2.1 & erd-alquran.md §2.1
 */
const db = require('../../../config/db/alquran');
const curriculumService = require('../../akademik/curriculum/service');

class TargetsService {
  async listTargets(schoolUnitId, filters = {}) {
    let query = db('hafalan_targets').where('school_unit_id', schoolUnitId);

    if (filters.class_ref_id) {
      query = query.where('class_ref_id', filters.class_ref_id);
    }
    if (filters.period_label) {
      query = query.where('period_label', 'like', `%${filters.period_label}%`);
    }

    return query.orderBy('id', 'desc');
  }

  async getTargetById(schoolUnitId, id) {
    return db('hafalan_targets')
      .where({ id, school_unit_id: schoolUnitId })
      .first();
  }

  async createTarget(schoolUnitId, data, userId = null) {
    const { class_ref_id, academic_period_ref_id = null, period_label = null, target_type, target_value, notes = null } = data;

    // In-process validasi: pastikan class_ref_id ada di modul Akademik
    await curriculumService.getClassGroupById(class_ref_id);

    const [id] = await db('hafalan_targets').insert({
      school_unit_id: schoolUnitId,
      class_ref_id,
      academic_period_ref_id,
      period_label,
      target_type,
      target_value,
      notes,
      created_by_ref_id: userId
    });

    const actualId = id || (await db('hafalan_targets').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;
    return this.getTargetById(schoolUnitId, actualId);
  }

  async updateTarget(schoolUnitId, id, data) {
    const before = await this.getTargetById(schoolUnitId, id);
    if (!before) return null;

    // In-process validasi jika class_ref_id diubah
    if (data.class_ref_id && data.class_ref_id !== before.class_ref_id) {
      await curriculumService.getClassGroupById(data.class_ref_id);
    }

    await db('hafalan_targets')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        class_ref_id: data.class_ref_id !== undefined ? data.class_ref_id : before.class_ref_id,
        academic_period_ref_id: data.academic_period_ref_id !== undefined ? data.academic_period_ref_id : before.academic_period_ref_id,
        period_label: data.period_label !== undefined ? data.period_label : before.period_label,
        target_type: data.target_type !== undefined ? data.target_type : before.target_type,
        target_value: data.target_value !== undefined ? data.target_value : before.target_value,
        notes: data.notes !== undefined ? data.notes : before.notes
      });

    return this.getTargetById(schoolUnitId, id);
  }

  async deleteTarget(schoolUnitId, id) {
    const before = await this.getTargetById(schoolUnitId, id);
    if (!before) return false;

    await db('hafalan_targets')
      .where({ id, school_unit_id: schoolUnitId })
      .delete();

    return true;
  }
}

module.exports = new TargetsService();
