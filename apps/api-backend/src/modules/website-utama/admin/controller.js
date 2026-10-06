/**
 * Controller Layer for Website Utama Admin Endpoints
 */
const adminService = require('./service');

class AdminWebsiteController {
  // 1. Hero & Highlights
  async getHero(req, res, next) {
    try {
      const data = await adminService.getHero(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Hero settings berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async updateHero(req, res, next) {
    try {
      const data = await adminService.updateHero(req.schoolUnitId, req.body);
      res.status(200).json({ success: true, data, message: 'Hero settings berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async listHighlights(req, res, next) {
    try {
      const data = await adminService.listHighlights(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar highlights berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createHighlight(req, res, next) {
    try {
      const data = await adminService.createHighlight({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Highlight berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  }

  async updateHighlight(req, res, next) {
    try {
      const data = await adminService.updateHighlight(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Highlight berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteHighlight(req, res, next) {
    try {
      await adminService.deleteHighlight(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Highlight berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 2. Staff Profiles
  async listStaffProfiles(req, res, next) {
    try {
      const data = await adminService.listStaffProfiles(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar profil pengajar berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createStaffProfile(req, res, next) {
    try {
      const data = await adminService.createStaffProfile({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Profil pengajar berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  }

  async updateStaffProfile(req, res, next) {
    try {
      const data = await adminService.updateStaffProfile(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Profil pengajar berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteStaffProfile(req, res, next) {
    try {
      await adminService.deleteStaffProfile(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Profil pengajar berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 3. School Life
  async listSchoolLife(req, res, next) {
    try {
      const data = await adminService.listSchoolLife(req.schoolUnitId, req.query.category);
      res.status(200).json({ success: true, data, message: 'Daftar kehidupan sekolah berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createSchoolLife(req, res, next) {
    try {
      const data = await adminService.createSchoolLife({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Item kehidupan sekolah berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  }

  async updateSchoolLife(req, res, next) {
    try {
      const data = await adminService.updateSchoolLife(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Item kehidupan sekolah berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteSchoolLife(req, res, next) {
    try {
      await adminService.deleteSchoolLife(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Item kehidupan sekolah berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 4. News
  async listNews(req, res, next) {
    try {
      const data = await adminService.listNews({ school_unit_id: req.schoolUnitId, ...req.query });
      res.status(200).json({ success: true, data, message: 'Daftar berita berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async listTeacherAnnouncements(req, res, next) {
    try {
      const data = await adminService.listTeacherAnnouncements({ school_unit_id: req.schoolUnitId || req.query.school_unit_id, ...req.query }, req.user);
      res.status(200).json({ success: true, data, message: 'Daftar pengumuman guru berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async getTeacherAnnouncementById(req, res, next) {
    try {
      const data = await adminService.getTeacherAnnouncementById(req.params.id, req.user);
      res.status(200).json({ success: true, data, message: 'Detail pengumuman guru berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createNews(req, res, next) {
    try {
      const data = await adminService.createNews({ ...req.body, school_unit_id: req.schoolUnitId }, req.user.id);
      res.status(201).json({ success: true, data, message: 'Berita berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updateNews(req, res, next) {
    try {
      const data = await adminService.updateNews(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Berita berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async publishNews(req, res, next) {
    try {
      const data = await adminService.publishNews(req.params.id);
      res.status(200).json({ success: true, data, message: 'Berita berhasil dipublikasikan', errors: null });
    } catch (err) { next(err); }
  }

  async archiveNews(req, res, next) {
    try {
      const data = await adminService.archiveNews(req.params.id);
      res.status(200).json({ success: true, data, message: 'Berita berhasil diarsipkan', errors: null });
    } catch (err) { next(err); }
  }

  async deleteNews(req, res, next) {
    try {
      await adminService.deleteNews(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Berita berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 5. Galleries
  async listGalleries(req, res, next) {
    try {
      const data = await adminService.listGalleries(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar album galeri berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createGallery(req, res, next) {
    try {
      const data = await adminService.createGallery({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Album galeri berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updateGallery(req, res, next) {
    try {
      const data = await adminService.updateGallery(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Album galeri berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteGallery(req, res, next) {
    try {
      await adminService.deleteGallery(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Album galeri berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  async addGalleryItem(req, res, next) {
    try {
      const data = await adminService.addGalleryItem(req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'Item galeri berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  }

  async deleteGalleryItem(req, res, next) {
    try {
      await adminService.deleteGalleryItem(req.params.itemId || req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Item galeri berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 6. FAQs
  async listFaqs(req, res, next) {
    try {
      const data = await adminService.listFaqs(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar FAQ berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createFaq(req, res, next) {
    try {
      const data = await adminService.createFaq({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'FAQ berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  }

  async updateFaq(req, res, next) {
    try {
      const data = await adminService.updateFaq(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'FAQ berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteFaq(req, res, next) {
    try {
      await adminService.deleteFaq(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'FAQ berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 7. Testimonials
  async listTestimonials(req, res, next) {
    try {
      const data = await adminService.listTestimonials(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar testimoni berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createTestimonial(req, res, next) {
    try {
      const data = await adminService.createTestimonial({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Testimoni berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updateTestimonial(req, res, next) {
    try {
      const data = await adminService.updateTestimonial(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Testimoni berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async toggleTestimonialVisibility(req, res, next) {
    try {
      const data = await adminService.toggleTestimonialVisibility(req.params.id);
      res.status(200).json({ success: true, data, message: 'Status visibilitas testimoni berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteTestimonial(req, res, next) {
    try {
      await adminService.deleteTestimonial(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Testimoni berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 8. Events
  async listEvents(req, res, next) {
    try {
      const data = await adminService.listEvents(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar agenda kegiatan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createEvent(req, res, next) {
    try {
      const data = await adminService.createEvent({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Agenda kegiatan berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updateEvent(req, res, next) {
    try {
      const data = await adminService.updateEvent(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Agenda kegiatan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async publishEvent(req, res, next) {
    try {
      const data = await adminService.publishEvent(req.params.id);
      res.status(200).json({ success: true, data, message: 'Agenda kegiatan berhasil dipublikasikan', errors: null });
    } catch (err) { next(err); }
  }

  async deleteEvent(req, res, next) {
    try {
      await adminService.deleteEvent(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Agenda kegiatan berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // 9. Accreditations
  async listAccreditations(req, res, next) {
    try {
      const data = await adminService.listAccreditations(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar akreditasi berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createAccreditation(req, res, next) {
    try {
      const data = await adminService.createAccreditation({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Data akreditasi berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updateAccreditation(req, res, next) {
    try {
      const data = await adminService.updateAccreditation(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Data akreditasi berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteAccreditation(req, res, next) {
    try {
      await adminService.deleteAccreditation(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Data akreditasi berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  // ==========================================
  // 10. PPDB Admin
  // ==========================================
  async listPpdbRegistrants(req, res, next) {
    try {
      const data = await adminService.listPpdbRegistrants({ school_unit_id: req.schoolUnitId, ...req.query });
      res.status(200).json({ success: true, data, message: 'Daftar pendaftar PPDB berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async getPpdbRegistrantDetail(req, res, next) {
    try {
      const data = await adminService.getPpdbRegistrantDetail(req.params.id);
      res.status(200).json({ success: true, data, message: 'Detail pendaftar PPDB berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async updatePpdbRegistrantStatus(req, res, next) {
    try {
      const data = await adminService.updatePpdbRegistrantStatus(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, data, message: 'Status pendaftar PPDB berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async getPpdbStatusLogs(req, res, next) {
    try {
      const data = await adminService.getPpdbStatusLogs(req.params.id);
      res.status(200).json({ success: true, data, message: 'Riwayat status PPDB berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async listPpdbSchedules(req, res, next) {
    try {
      const data = await adminService.listPpdbSchedules(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Jadwal seleksi PPDB berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createPpdbSchedule(req, res, next) {
    try {
      const data = await adminService.createPpdbSchedule({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Jadwal seleksi PPDB berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updatePpdbSchedule(req, res, next) {
    try {
      const data = await adminService.updatePpdbSchedule(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Jadwal seleksi PPDB berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deletePpdbSchedule(req, res, next) {
    try {
      await adminService.deletePpdbSchedule(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Jadwal seleksi PPDB berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  async listPpdbPayments(req, res, next) {
    try {
      const data = await adminService.listPpdbPayments({ school_unit_id: req.schoolUnitId, ...req.query });
      res.status(200).json({ success: true, data, message: 'Rekap pembayaran PPDB berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async verifyPpdbPayment(req, res, next) {
    try {
      const data = await adminService.verifyPpdbPayment(req.params.id);
      res.status(200).json({ success: true, data, message: 'Pembayaran PPDB berhasil diverifikasi', errors: null });
    } catch (err) { next(err); }
  }

  async getPpdbStatistics(req, res, next) {
    try {
      const data = await adminService.getPpdbStatistics(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Statistik pendaftar PPDB berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  // ==========================================
  // 11. Konsultasi Admin
  // ==========================================
  async listTickets(req, res, next) {
    try {
      const data = await adminService.listTickets(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar tiket konsultasi berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async replyTicket(req, res, next) {
    try {
      const data = await adminService.replyTicket(req.params.id, req.body, req.user.id);
      res.status(201).json({ success: true, data, message: 'Balasan tiket berhasil dikirim', errors: null });
    } catch (err) { next(err); }
  }

  async assignTicket(req, res, next) {
    try {
      const data = await adminService.assignTicket(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Tiket berhasil didelegasikan', errors: null });
    } catch (err) { next(err); }
  }

  async closeTicket(req, res, next) {
    try {
      const data = await adminService.closeTicket(req.params.id);
      res.status(200).json({ success: true, data, message: 'Tiket konsultasi berhasil ditutup', errors: null });
    } catch (err) { next(err); }
  }

  async listBookings(req, res, next) {
    try {
      const data = await adminService.listBookings(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar booking konsultasi virtual berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async updateBookingStatus(req, res, next) {
    try {
      const data = await adminService.updateBookingStatus(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Status booking konsultasi berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  // ==========================================
  // 12. Publikasi & Artikel Admin
  // ==========================================
  async listArticles(req, res, next) {
    try {
      const data = await adminService.listArticles({ school_unit_id: req.schoolUnitId, ...req.query }, req.user);
      res.status(200).json({ success: true, data, message: 'Daftar artikel berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async createArticle(req, res, next) {
    try {
      const data = await adminService.createArticle({ ...req.body, school_unit_id: req.schoolUnitId }, req.user.id);
      res.status(201).json({ success: true, data, message: 'Draft artikel berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  }

  async updateArticle(req, res, next) {
    try {
      const data = await adminService.updateArticle(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Artikel berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async deleteArticle(req, res, next) {
    try {
      await adminService.deleteArticle(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Artikel berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  }

  async submitArticleReview(req, res, next) {
    try {
      const data = await adminService.submitArticleReview(req.params.id);
      res.status(200).json({ success: true, data, message: 'Artikel berhasil diajukan untuk review', errors: null });
    } catch (err) { next(err); }
  }

  async publishArticle(req, res, next) {
    try {
      const data = await adminService.publishArticle(req.params.id);
      res.status(200).json({ success: true, data, message: 'Artikel berhasil dipublikasikan', errors: null });
    } catch (err) { next(err); }
  }

  async listArticleComments(req, res, next) {
    try {
      const data = await adminService.listArticleComments(req.params.id || req.query.article_id);
      res.status(200).json({ success: true, data, message: 'Daftar komentar artikel berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async moderateComment(req, res, next) {
    try {
      const data = await adminService.moderateComment(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Status komentar artikel berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  // ==========================================
  // 13. Theme, CMS Access & Site Settings
  // ==========================================
  async getTheme(req, res, next) {
    try {
      const data = await adminService.getTheme(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Theme settings berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async updateTheme(req, res, next) {
    try {
      const data = await adminService.updateTheme(req.schoolUnitId, req.body);
      res.status(200).json({ success: true, data, message: 'Theme settings berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async listCmsAccess(req, res, next) {
    try {
      const data = await adminService.listCmsAccess(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Daftar hak akses CMS berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async grantCmsAccess(req, res, next) {
    try {
      const data = await adminService.grantCmsAccess({ ...req.body, school_unit_id: req.schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Hak akses CMS berhasil diberikan', errors: null });
    } catch (err) { next(err); }
  }

  async updateCmsAccess(req, res, next) {
    try {
      const data = await adminService.updateCmsAccess(req.params.id, req.body);
      res.status(200).json({ success: true, data, message: 'Hak akses CMS berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  }

  async revokeCmsAccess(req, res, next) {
    try {
      await adminService.revokeCmsAccess(req.params.id);
      res.status(200).json({ success: true, data: null, message: 'Hak akses CMS berhasil dicabut', errors: null });
    } catch (err) { next(err); }
  }

  async listSiteSettings(req, res, next) {
    try {
      const data = await adminService.listSiteSettings(req.schoolUnitId);
      res.status(200).json({ success: true, data, message: 'Pengaturan situs berhasil diambil', errors: null });
    } catch (err) { next(err); }
  }

  async updateSiteSettings(req, res, next) {
    try {
      const data = await adminService.updateSiteSettings(req.schoolUnitId, req.body);
      res.status(200).json({ success: true, data, message: 'Pengaturan situs berhasil disimpan', errors: null });
    } catch (err) { next(err); }
  }

  async getSitemap(req, res, next) {
    try {
      const xml = await adminService.generateSitemap();
      res.header('Content-Type', 'application/xml');
      res.status(200).send(xml);
    } catch (err) { next(err); }
  }

  async getRobots(req, res, next) {
    try {
      const txt = await adminService.generateRobots();
      res.header('Content-Type', 'text/plain');
      res.status(200).send(txt);
    } catch (err) { next(err); }
  }
}

module.exports = new AdminWebsiteController();
