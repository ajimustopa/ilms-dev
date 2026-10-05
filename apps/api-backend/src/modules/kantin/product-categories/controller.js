const productCategoriesService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class ProductCategoriesController {
  async listCategories(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await productCategoriesService.listCategories(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await productCategoriesService.getCategoryById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Kategori tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { category_name } = req.body;
      if (!category_name) {
        return res.status(422).json({ success: false, data: null, message: 'category_name wajib diisi', errors: null });
      }
      const data = await productCategoriesService.createCategory(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Kategori berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await productCategoriesService.updateCategory(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Kategori tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Kategori berhasil diperbarui', errors: null });
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
      const data = await productCategoriesService.updateStatus(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Kategori tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Status kategori berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductCategoriesController();
