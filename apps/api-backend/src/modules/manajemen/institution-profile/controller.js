/**
 * Institution Profile Controller
 * Modul Manajemen - Fitur Profil Lembaga
 */
const InstitutionProfileService = require('./service');
const service = new InstitutionProfileService();

class InstitutionProfileController {
  // Summary
  async getSummary(req, res, next) {
    try {
      const data = await service.getSummary(req.query);
      res.json({
        success: true,
        data,
        message: 'Ringkasan profil lembaga berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // 1. Legal Document Types (Master)
  async listLegalDocumentTypes(req, res, next) {
    try {
      const data = await service.listLegalDocumentTypes();
      res.json({
        success: true,
        data,
        message: 'Daftar tipe dokumen legalitas berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createLegalDocumentType(req, res, next) {
    try {
      const data = await service.createLegalDocumentType(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tipe dokumen legalitas berhasil dibuat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLegalDocumentType(req, res, next) {
    try {
      const data = await service.updateLegalDocumentType(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Tipe dokumen legalitas berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLegalDocumentType(req, res, next) {
    try {
      await service.deleteLegalDocumentType(req.params.id);
      res.json({
        success: true,
        data: null,
        message: 'Tipe dokumen legalitas berhasil dihapus',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Institution Legal Documents
  async listLegalDocuments(req, res, next) {
    try {
      const data = await service.listLegalDocuments(req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar dokumen legalitas berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getLegalDocumentById(req, res, next) {
    try {
      const data = await service.getLegalDocumentById(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Detail dokumen legalitas berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createLegalDocument(req, res, next) {
    try {
      const data = await service.createLegalDocument(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Dokumen legalitas berhasil ditambahkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLegalDocument(req, res, next) {
    try {
      const data = await service.updateLegalDocument(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Dokumen legalitas berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLegalDocument(req, res, next) {
    try {
      await service.deleteLegalDocument(req.params.id);
      res.json({
        success: true,
        data: null,
        message: 'Dokumen legalitas berhasil dihapus',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Institution Letterheads
  async listLetterheads(req, res, next) {
    try {
      const data = await service.listLetterheads(req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar kop surat berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createLetterhead(req, res, next) {
    try {
      const data = await service.createLetterhead(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Kop surat berhasil dibuat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLetterhead(req, res, next) {
    try {
      const data = await service.updateLetterhead(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Kop surat berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultLetterhead(req, res, next) {
    try {
      const data = await service.setDefaultLetterhead(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Kop surat default berhasil ditetapkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLetterhead(req, res, next) {
    try {
      await service.deleteLetterhead(req.params.id);
      res.json({
        success: true,
        data: null,
        message: 'Kop surat berhasil dihapus',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Institution Stamps
  async listStamps(req, res, next) {
    try {
      const data = await service.listStamps(req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar cap stempel berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createStamp(req, res, next) {
    try {
      const data = await service.createStamp(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Cap stempel berhasil dibuat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStamp(req, res, next) {
    try {
      const data = await service.updateStamp(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Cap stempel berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultStamp(req, res, next) {
    try {
      const data = await service.setDefaultStamp(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Cap stempel default berhasil ditetapkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteStamp(req, res, next) {
    try {
      await service.deleteStamp(req.params.id);
      res.json({
        success: true,
        data: null,
        message: 'Cap stempel berhasil dihapus',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Institution Signatures
  async listSignatures(req, res, next) {
    try {
      const data = await service.listSignatures(req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar specimen tanda tangan berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createSignature(req, res, next) {
    try {
      const data = await service.createSignature(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Specimen tanda tangan berhasil dibuat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSignature(req, res, next) {
    try {
      const data = await service.updateSignature(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Specimen tanda tangan berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultSignature(req, res, next) {
    try {
      const data = await service.setDefaultSignature(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Specimen tanda tangan default berhasil ditetapkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSignature(req, res, next) {
    try {
      await service.deleteSignature(req.params.id);
      res.json({
        success: true,
        data: null,
        message: 'Specimen tanda tangan berhasil dihapus',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InstitutionProfileController();
