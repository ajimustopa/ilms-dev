/**
 * Institution Profile Service Implementation
 * Modul Manajemen - Fitur Profil Lembaga (Legalitas, Kop Surat, Stempel, Specimen Tanda Tangan)
 */
const db = require('../../../config/db/manajemen');
const foundationService = require('../../core/foundation/service');
const schoolUnitsService = require('../../core/school-units/service');

class InstitutionProfileService {
  /**
   * Helper untuk validasi owner_type & owner_id
   */
  async resolveOwner(ownerType, ownerId) {
    if (!ownerType || !['foundation', 'school_unit'].includes(ownerType)) {
      const error = new Error("owner_type harus bernilai 'foundation' atau 'school_unit'");
      error.statusCode = 422;
      throw error;
    }

    if (ownerType === 'foundation') {
      const profile = await foundationService.getProfile();
      return {
        owner_type: 'foundation',
        owner_id: profile ? profile.id : Number(ownerId) || 1,
        owner_data: profile,
      };
    } else {
      if (!ownerId) {
        const error = new Error('owner_id (ID Satuan Pendidikan) wajib disertakan');
        error.statusCode = 422;
        throw error;
      }
      const unit = await schoolUnitsService.getSchoolUnitById(ownerId);
      return {
        owner_type: 'school_unit',
        owner_id: Number(ownerId),
        owner_data: unit,
      };
    }
  }

  /**
   * GET Ringkasan Gabungan (Data Dasar Core + Dokumen Legalitas + Kop + Stempel + Specimen)
   */
  async getSummary(query = {}) {
    const ownerType = query.owner_type || 'foundation';
    const ownerId = query.owner_id ? Number(query.owner_id) : (ownerType === 'foundation' ? 1 : null);

    const resolved = await this.resolveOwner(ownerType, ownerId);

    // Ambil daftar dokumen legalitas
    const legalDocuments = await db('institution_legal_documents')
      .leftJoin('legal_document_types', 'institution_legal_documents.legal_document_type_id', 'legal_document_types.id')
      .where({
        'institution_legal_documents.owner_type': resolved.owner_type,
        'institution_legal_documents.owner_id': resolved.owner_id,
      })
      .select(
        'institution_legal_documents.*',
        'legal_document_types.name as legal_document_type_name',
        'legal_document_types.requires_expiry'
      )
      .orderBy('institution_legal_documents.created_at', 'desc');

    // Cek status kadaluarsa otomatis & warning < 30 hari
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const processedLegalDocs = legalDocuments.map((doc) => {
      let isExpiringSoon = false;
      let isExpired = false;
      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date);
        if (exp < now) {
          isExpired = true;
        } else if (exp <= thirtyDaysAhead) {
          isExpiringSoon = true;
        }
      }
      return {
        ...doc,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon,
      };
    });

    // Ambil Kop Surat
    const letterheads = await db('institution_letterheads')
      .where({
        owner_type: resolved.owner_type,
        owner_id: resolved.owner_id,
      })
      .orderBy('is_default', 'desc')
      .orderBy('id', 'desc');

    // Ambil Cap Stempel
    const stamps = await db('institution_stamps')
      .where({
        owner_type: resolved.owner_type,
        owner_id: resolved.owner_id,
      })
      .orderBy('is_default', 'desc')
      .orderBy('id', 'desc');

    // Ambil Specimen Tanda Tangan
    const signatures = await db('institution_signatures')
      .where({
        owner_type: resolved.owner_type,
        owner_id: resolved.owner_id,
      })
      .orderBy('is_default', 'desc')
      .orderBy('id', 'desc');

    // Default Kop, Stempel, Signature
    const defaultLetterhead = letterheads.find((l) => l.is_default === 1) || letterheads[0] || null;
    const defaultStamp = stamps.find((s) => s.is_default === 1) || stamps[0] || null;
    const defaultSignature = signatures.find((s) => s.is_default === 1) || signatures[0] || null;

    return {
      owner_type: resolved.owner_type,
      owner_id: resolved.owner_id,
      base_profile: resolved.owner_data,
      legal_documents: processedLegalDocs,
      letterheads,
      stamps,
      signatures,
      defaults: {
        letterhead: defaultLetterhead,
        stamp: defaultStamp,
        signature: defaultSignature,
      },
      stats: {
        total_legal_docs: processedLegalDocs.length,
        expiring_legal_docs: processedLegalDocs.filter((d) => d.is_expiring_soon).length,
        expired_legal_docs: processedLegalDocs.filter((d) => d.is_expired).length,
        total_letterheads: letterheads.length,
        total_stamps: stamps.length,
        total_signatures: signatures.length,
      },
    };
  }

  // ==========================================
  // 1. LEGAL DOCUMENT TYPES (MASTER)
  // ==========================================
  async listLegalDocumentTypes() {
    return db('legal_document_types').orderBy('id', 'asc');
  }

  async createLegalDocumentType(payload) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error("Field 'name' wajib diisi");
      error.statusCode = 422;
      throw error;
    }
    const [id] = await db('legal_document_types').insert({
      name: payload.name.trim(),
      requires_expiry: payload.requires_expiry ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('legal_document_types').where({ id }).first();
  }

  async updateLegalDocumentType(id, payload) {
    const docType = await db('legal_document_types').where({ id }).first();
    if (!docType) {
      const error = new Error('Tipe dokumen legalitas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('legal_document_types').where({ id }).update({
      name: payload.name ? payload.name.trim() : docType.name,
      requires_expiry: payload.requires_expiry !== undefined ? (payload.requires_expiry ? 1 : 0) : docType.requires_expiry,
      updated_at: db.fn.now(),
    });
    return db('legal_document_types').where({ id }).first();
  }

  async deleteLegalDocumentType(id) {
    const countUsed = await db('institution_legal_documents').where({ legal_document_type_id: id }).count('* as count');
    if (countUsed[0].count > 0) {
      const error = new Error('Tipe dokumen tidak dapat dihapus karena masih digunakan oleh dokumen legalitas');
      error.statusCode = 422;
      throw error;
    }
    await db('legal_document_types').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 2. INSTITUTION LEGAL DOCUMENTS
  // ==========================================
  async listLegalDocuments(query = {}) {
    let q = db('institution_legal_documents')
      .leftJoin('legal_document_types', 'institution_legal_documents.legal_document_type_id', 'legal_document_types.id')
      .select(
        'institution_legal_documents.*',
        'legal_document_types.name as legal_document_type_name',
        'legal_document_types.requires_expiry'
      );

    if (query.owner_type) {
      q = q.where('institution_legal_documents.owner_type', query.owner_type);
    }
    if (query.owner_id) {
      q = q.where('institution_legal_documents.owner_id', query.owner_id);
    }
    if (query.status) {
      q = q.where('institution_legal_documents.status', query.status);
    }
    if (query.legal_document_type_id) {
      q = q.where('institution_legal_documents.legal_document_type_id', query.legal_document_type_id);
    }

    const items = await q.orderBy('institution_legal_documents.created_at', 'desc');

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    return items.map((doc) => {
      let isExpiringSoon = false;
      let isExpired = false;
      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date);
        if (exp < now) isExpired = true;
        else if (exp <= thirtyDaysAhead) isExpiringSoon = true;
      }
      return {
        ...doc,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon,
      };
    });
  }

  async getLegalDocumentById(id) {
    const doc = await db('institution_legal_documents')
      .leftJoin('legal_document_types', 'institution_legal_documents.legal_document_type_id', 'legal_document_types.id')
      .where('institution_legal_documents.id', id)
      .select(
        'institution_legal_documents.*',
        'legal_document_types.name as legal_document_type_name',
        'legal_document_types.requires_expiry'
      )
      .first();

    if (!doc) {
      const error = new Error('Dokumen legalitas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return doc;
  }

  async createLegalDocument(payload) {
    if (!payload.owner_type || !payload.owner_id || !payload.legal_document_type_id) {
      const error = new Error("Field 'owner_type', 'owner_id', dan 'legal_document_type_id' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('institution_legal_documents').insert({
      owner_type: payload.owner_type,
      owner_id: payload.owner_id,
      legal_document_type_id: payload.legal_document_type_id,
      document_number: payload.document_number || null,
      issuing_authority: payload.issuing_authority || null,
      issued_date: payload.issued_date || null,
      expiry_date: payload.expiry_date || null,
      file_url: payload.file_url || null,
      status: payload.status || 'berlaku',
      notes: payload.notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return this.getLegalDocumentById(id);
  }

  async updateLegalDocument(id, payload) {
    await this.getLegalDocumentById(id);

    const updateData = {
      updated_at: db.fn.now(),
    };
    if (payload.legal_document_type_id) updateData.legal_document_type_id = payload.legal_document_type_id;
    if (payload.document_number !== undefined) updateData.document_number = payload.document_number;
    if (payload.issuing_authority !== undefined) updateData.issuing_authority = payload.issuing_authority;
    if (payload.issued_date !== undefined) updateData.issued_date = payload.issued_date;
    if (payload.expiry_date !== undefined) updateData.expiry_date = payload.expiry_date;
    if (payload.file_url !== undefined) updateData.file_url = payload.file_url;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    await db('institution_legal_documents').where({ id }).update(updateData);
    return this.getLegalDocumentById(id);
  }

  async deleteLegalDocument(id) {
    await this.getLegalDocumentById(id);
    await db('institution_legal_documents').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 3. INSTITUTION LETTERHEADS (KOP SURAT)
  // ==========================================
  async listLetterheads(query = {}) {
    let q = db('institution_letterheads');
    if (query.owner_type) q = q.where('owner_type', query.owner_type);
    if (query.owner_id) q = q.where('owner_id', query.owner_id);
    return q.orderBy('is_default', 'desc').orderBy('id', 'desc');
  }

  async createLetterhead(payload) {
    if (!payload.owner_type || !payload.owner_id || !payload.name) {
      const error = new Error("Field 'owner_type', 'owner_id', dan 'name' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    if (payload.is_default) {
      await db('institution_letterheads')
        .where({ owner_type: payload.owner_type, owner_id: payload.owner_id })
        .update({ is_default: 0 });
    }

    const [id] = await db('institution_letterheads').insert({
      owner_type: payload.owner_type,
      owner_id: payload.owner_id,
      name: payload.name.trim(),
      logo_file_url: payload.logo_file_url || null,
      header_html: payload.header_html || null,
      is_default: payload.is_default ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return db('institution_letterheads').where({ id }).first();
  }

  async updateLetterhead(id, payload) {
    const lh = await db('institution_letterheads').where({ id }).first();
    if (!lh) {
      const error = new Error('Kop surat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (payload.is_default) {
      await db('institution_letterheads')
        .where({ owner_type: lh.owner_type, owner_id: lh.owner_id })
        .update({ is_default: 0 });
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.logo_file_url !== undefined) updateData.logo_file_url = payload.logo_file_url;
    if (payload.header_html !== undefined) updateData.header_html = payload.header_html;
    if (payload.is_default !== undefined) updateData.is_default = payload.is_default ? 1 : 0;

    await db('institution_letterheads').where({ id }).update(updateData);
    return db('institution_letterheads').where({ id }).first();
  }

  async setDefaultLetterhead(id) {
    const lh = await db('institution_letterheads').where({ id }).first();
    if (!lh) {
      const error = new Error('Kop surat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('institution_letterheads')
      .where({ owner_type: lh.owner_type, owner_id: lh.owner_id })
      .update({ is_default: 0 });

    await db('institution_letterheads').where({ id }).update({ is_default: 1, updated_at: db.fn.now() });
    return db('institution_letterheads').where({ id }).first();
  }

  async deleteLetterhead(id) {
    const lh = await db('institution_letterheads').where({ id }).first();
    if (!lh) {
      const error = new Error('Kop surat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('institution_letterheads').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 4. INSTITUTION STAMPS (CAP STEMPEL)
  // ==========================================
  async listStamps(query = {}) {
    let q = db('institution_stamps');
    if (query.owner_type) q = q.where('owner_type', query.owner_type);
    if (query.owner_id) q = q.where('owner_id', query.owner_id);
    return q.orderBy('is_default', 'desc').orderBy('id', 'desc');
  }

  async createStamp(payload) {
    if (!payload.owner_type || !payload.owner_id || !payload.name || !payload.image_file_url) {
      const error = new Error("Field 'owner_type', 'owner_id', 'name', dan 'image_file_url' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    if (payload.is_default) {
      await db('institution_stamps')
        .where({ owner_type: payload.owner_type, owner_id: payload.owner_id })
        .update({ is_default: 0 });
    }

    const [id] = await db('institution_stamps').insert({
      owner_type: payload.owner_type,
      owner_id: payload.owner_id,
      name: payload.name.trim(),
      stamp_type: payload.stamp_type || 'digital',
      image_file_url: payload.image_file_url,
      is_default: payload.is_default ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return db('institution_stamps').where({ id }).first();
  }

  async updateStamp(id, payload) {
    const st = await db('institution_stamps').where({ id }).first();
    if (!st) {
      const error = new Error('Cap stempel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (payload.is_default) {
      await db('institution_stamps')
        .where({ owner_type: st.owner_type, owner_id: st.owner_id })
        .update({ is_default: 0 });
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.stamp_type) updateData.stamp_type = payload.stamp_type;
    if (payload.image_file_url !== undefined) updateData.image_file_url = payload.image_file_url;
    if (payload.is_default !== undefined) updateData.is_default = payload.is_default ? 1 : 0;

    await db('institution_stamps').where({ id }).update(updateData);
    return db('institution_stamps').where({ id }).first();
  }

  async setDefaultStamp(id) {
    const st = await db('institution_stamps').where({ id }).first();
    if (!st) {
      const error = new Error('Cap stempel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('institution_stamps')
      .where({ owner_type: st.owner_type, owner_id: st.owner_id })
      .update({ is_default: 0 });

    await db('institution_stamps').where({ id }).update({ is_default: 1, updated_at: db.fn.now() });
    return db('institution_stamps').where({ id }).first();
  }

  async deleteStamp(id) {
    const st = await db('institution_stamps').where({ id }).first();
    if (!st) {
      const error = new Error('Cap stempel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('institution_stamps').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 5. INSTITUTION SIGNATURES (SPECIMEN TANDA TANGAN)
  // ==========================================
  async listSignatures(query = {}) {
    let q = db('institution_signatures');
    if (query.owner_type) q = q.where('owner_type', query.owner_type);
    if (query.owner_id) q = q.where('owner_id', query.owner_id);
    return q.orderBy('is_default', 'desc').orderBy('id', 'desc');
  }

  async createSignature(payload) {
    if (!payload.owner_type || !payload.owner_id || !payload.position_title) {
      const error = new Error("Field 'owner_type', 'owner_id', dan 'position_title' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    if (payload.is_default) {
      await db('institution_signatures')
        .where({ owner_type: payload.owner_type, owner_id: payload.owner_id })
        .update({ is_default: 0 });
    }

    const [id] = await db('institution_signatures').insert({
      owner_type: payload.owner_type,
      owner_id: payload.owner_id,
      employee_id: payload.employee_id || null,
      position_title: payload.position_title.trim(),
      signature_image_url: payload.signature_image_url || null,
      is_default: payload.is_default ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return db('institution_signatures').where({ id }).first();
  }

  async updateSignature(id, payload) {
    const sig = await db('institution_signatures').where({ id }).first();
    if (!sig) {
      const error = new Error('Specimen tanda tangan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (payload.is_default) {
      await db('institution_signatures')
        .where({ owner_type: sig.owner_type, owner_id: sig.owner_id })
        .update({ is_default: 0 });
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.employee_id !== undefined) updateData.employee_id = payload.employee_id;
    if (payload.position_title) updateData.position_title = payload.position_title.trim();
    if (payload.signature_image_url !== undefined) updateData.signature_image_url = payload.signature_image_url;
    if (payload.is_default !== undefined) updateData.is_default = payload.is_default ? 1 : 0;

    await db('institution_signatures').where({ id }).update(updateData);
    return db('institution_signatures').where({ id }).first();
  }

  async setDefaultSignature(id) {
    const sig = await db('institution_signatures').where({ id }).first();
    if (!sig) {
      const error = new Error('Specimen tanda tangan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('institution_signatures')
      .where({ owner_type: sig.owner_type, owner_id: sig.owner_id })
      .update({ is_default: 0 });

    await db('institution_signatures').where({ id }).update({ is_default: 1, updated_at: db.fn.now() });
    return db('institution_signatures').where({ id }).first();
  }

  async deleteSignature(id) {
    const sig = await db('institution_signatures').where({ id }).first();
    if (!sig) {
      const error = new Error('Specimen tanda tangan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('institution_signatures').where({ id }).del();
    return { success: true };
  }
}

module.exports = InstitutionProfileService;
