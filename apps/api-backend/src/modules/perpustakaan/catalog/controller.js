/**
 * Catalog Controller Implementation
 * Modul Perpustakaan: Katalog Buku & Bahan Pustaka, Eksemplar, dan Kategori
 */
const catalogService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createCategorySchema,
  updateCategorySchema,
  createBookSchema,
  updateBookSchema,
  createBookCopySchema,
} = require('./validators');

class CatalogController {
  // ==========================================
  // KATEGORI BUKU
  // ==========================================

  async listCategories(req, res, next) {
    try {
      const data = await catalogService.listCategories(req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar kategori buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const data = await catalogService.getCategoryById(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Detail kategori buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const parsed = createCategorySchema.parse(req.body);
      const data = await catalogService.createCategory(parsed);
      res.status(201).json({
        success: true,
        data,
        message: 'Kategori buku berhasil ditambahkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const parsed = updateCategorySchema.parse(req.body);
      const data = await catalogService.updateCategory(req.params.id, parsed);
      res.json({
        success: true,
        data,
        message: 'Kategori buku berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const data = await catalogService.deleteCategory(req.params.id);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // KOLEKSI BUKU & PUSTAKA
  // ==========================================

  async listBooks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await catalogService.listBooks(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar koleksi buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getBookById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await catalogService.getBookById(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Detail koleksi buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createBook(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createBookSchema.parse(req.body);
      const data = await catalogService.createBook(schoolUnitId, parsed);
      res.status(201).json({
        success: true,
        data,
        message: 'Koleksi buku berhasil ditambahkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateBook(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateBookSchema.parse(req.body);
      const data = await catalogService.updateBook(schoolUnitId, req.params.id, parsed);
      res.json({
        success: true,
        data,
        message: 'Koleksi buku berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteBook(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await catalogService.deleteBook(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: data.message,
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // EKSEMPLAR BUKU
  // ==========================================

  async listBookCopies(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await catalogService.listBookCopies(schoolUnitId, req.params.id);
      res.json({
        success: true,
        data,
        message: 'Daftar eksemplar buku berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async createBookCopy(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createBookCopySchema.parse(req.body);
      const data = await catalogService.createBookCopy(schoolUnitId, req.params.id, parsed);
      res.status(201).json({
        success: true,
        data,
        message: 'Eksemplar fisik berhasil ditambahkan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CatalogController();
