/**
 * Assets Controller Implementation
 */
const assetsService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createAssetSchema,
  updateAssetSchema,
  mutateAssetSchema,
  scanAssetSchema
} = require('./validators');

class AssetsController {
  async listAssets(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await assetsService.listAssets(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar aset berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getAssetById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await assetsService.getAssetById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail aset berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createAsset(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createAssetSchema.parse(req.body);
      const data = await assetsService.createAsset(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Aset berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateAsset(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateAssetSchema.parse(req.body);
      const data = await assetsService.updateAsset(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Aset berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteAsset(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await assetsService.deleteAsset(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async mutateAssetLocation(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = mutateAssetSchema.parse(req.body);
      const userId = req.user.id;
      const data = await assetsService.mutateAssetLocation(schoolUnitId, req.params.id, parsed, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listAssetMutations(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await assetsService.listAssetMutations(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Riwayat mutasi aset berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async generateQrCode(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await assetsService.generateQrCode(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'QR code berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getQrCode(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await assetsService.getQrCode(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Data QR code aset berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async scanLookupAsset(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = scanAssetSchema.parse(req.body);
      const data = await assetsService.scanLookupAsset(schoolUnitId, parsed);
      res.json({ success: true, data, message: 'Aset berhasil ditemukan dari scan QR/Barcode', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AssetsController();
