/**
 * Books Controller for Alquran Module
 */
const booksService = require('./service');

class BooksController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listBooks = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await booksService.listBooks(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar kitab kuning berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createBook = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const { book_name } = req.body;

      if (!book_name) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validasi gagal: book_name wajib diisi',
          errors: [{ field: 'book_name', message: 'Field wajib' }]
        });
      }

      const data = await booksService.createBook(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Data kitab kuning berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateBook = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await booksService.updateBook(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Data kitab kuning tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Data kitab kuning berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  deleteBook = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const success = await booksService.deleteBook(schoolUnitId, req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, data: null, message: 'Data kitab kuning tidak ditemukan', errors: null });
      }
      res.json({ success: true, data: null, message: 'Data kitab kuning berhasil dinonaktifkan', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new BooksController();
