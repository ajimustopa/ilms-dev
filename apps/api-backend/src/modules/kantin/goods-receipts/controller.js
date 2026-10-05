const goodsReceiptsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class GoodsReceiptsController {
  async getAccountingConfig(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await goodsReceiptsService.getAccountingConfig(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async saveAccountingConfig(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await goodsReceiptsService.saveAccountingConfig(schoolUnitId, req.body);
      res.json({ success: true, data, message: 'Konfigurasi akuntansi penerimaan barang berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listBankStatements(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await goodsReceiptsService.listBankStatements(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listReceipts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await goodsReceiptsService.listReceipts(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getReceiptById(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await goodsReceiptsService.getReceiptById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Penerimaan barang tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createReceipt(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { receipt_type } = req.body;
      if (!receipt_type || !['titipan', 'belanja_sendiri', 'belanja'].includes(receipt_type)) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'receipt_type wajib bernilai titipan atau belanja_sendiri',
          errors: null
        });
      }
      const data = await goodsReceiptsService.createReceipt(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Penerimaan barang berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addItem(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { vendor_product_id, qty, cost_price, sale_price } = req.body;
      if (!vendor_product_id || !qty || cost_price === undefined || sale_price === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'vendor_product_id, qty, cost_price, dan sale_price wajib diisi',
          errors: null
        });
      }
      const data = await goodsReceiptsService.addItem(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Penerimaan barang tidak ditemukan', errors: null });
      }
      res.status(201).json({ success: true, data, message: 'Item berhasil ditambahkan ke penerimaan barang', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GoodsReceiptsController();
