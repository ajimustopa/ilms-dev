const vendorProductsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class VendorProductsController {
  async listProducts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorProductsService.listProducts(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getProductById(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorProductsService.getProductById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Produk tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { product_name, product_category_id, vendor_id } = req.body;
      if (!product_name || !product_category_id || !vendor_id) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'product_name, product_category_id, dan vendor_id wajib diisi',
          errors: null
        });
      }
      const data = await vendorProductsService.createProduct(schoolUnitId, req.body, req.user);
      res.status(201).json({ success: true, data, message: 'Produk vendor berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorProductsService.updateProduct(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Produk tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Produk vendor berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { status } = req.body;
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(422).json({ success: false, data: null, message: 'status harus active atau inactive', errors: null });
      }
      const data = await vendorProductsService.updateStatus(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Produk tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Status produk berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async generateBarcode(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorProductsService.generateBarcode(schoolUnitId, req.body);
      res.json({ success: true, data, message: 'Barcode berhasil di-generate', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateBarcode(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { barcode } = req.body;
      if (!barcode) {
        return res.status(422).json({ success: false, data: null, message: 'barcode wajib diisi', errors: null });
      }
      const data = await vendorProductsService.updateBarcode(schoolUnitId, req.params.id, barcode);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Produk tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Barcode berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getProductHistory(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorProductsService.getProductHistory(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Produk tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VendorProductsController();
