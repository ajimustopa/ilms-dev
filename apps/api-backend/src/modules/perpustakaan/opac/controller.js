/**
 * OPAC Controller Implementation
 * Modul Perpustakaan: Online Public Access Catalog (OPAC)
 * Akses Publik tanpa autentikasi JWT
 */
const opacService = require('./service');

class OpacController {
  async searchPublicCatalog(req, res, next) {
    try {
      const data = await opacService.searchPublicCatalog(req.query);
      res.json({
        success: true,
        data,
        message: 'Pencarian katalog publik OPAC berhasil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicBookDetail(req, res, next) {
    try {
      const data = await opacService.getPublicBookDetail(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Detail katalog buku OPAC berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OpacController();
