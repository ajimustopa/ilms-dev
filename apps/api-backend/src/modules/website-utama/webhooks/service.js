/**
 * Webhook Service for Website Utama Module
 * Database: websiteutama_local (via ../db.js)
 */
const db = require('../db');

class WebsiteUtamaWebhookService {
  /**
   * Memproses event ppdb.status_changed dari Akademik
   * @param {Object} payload - Format standar webhook global
   */
  async handlePpdbStatusChanged(payload) {
    const { event_type, data, satuan_pendidikan_id } = payload;

    if (!data || !data.registrant_id || !data.status) {
      const error = new Error("Payload data wajib menyertakan 'registrant_id' dan 'status'");
      error.statusCode = 422;
      throw error;
    }

    const registrantId = Number(data.registrant_id);
    const existing = await db('ppdb_registrants').where({ id: registrantId }).first();

    if (!existing) {
      const error = new Error(`Data pendaftar PPDB ID ${registrantId} tidak ditemukan`);
      error.statusCode = 404;
      throw error;
    }

    const updateFields = {
      status: data.status,
      updated_at: db.fn.now()
    };

    if (data.academic_ref_id !== undefined) {
      updateFields.academic_ref_id = data.academic_ref_id;
    }

    // 1. Update kolom status & academic_ref_id di ppdb_registrants
    await db('ppdb_registrants').where({ id: registrantId }).update(updateFields);

    // 2. Catat baris baru di ppdb_status_logs (changed_by: null karena otomatis via webhook)
    await db('ppdb_status_logs').insert({
      registrant_id: registrantId,
      status: data.status,
      note: data.note || `Status otomatis disinkronisasi dari Akademik (${event_type})`,
      changed_by: null,
      occurred_at: db.fn.now()
    });

    const updated = await db('ppdb_registrants').where({ id: registrantId }).first();

    return {
      registrant_id: registrantId,
      status: updated.status,
      academic_ref_id: updated.academic_ref_id,
      updated_at: updated.updated_at
    };
  }
}

module.exports = new WebsiteUtamaWebhookService();
