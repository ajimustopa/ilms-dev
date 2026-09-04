/**
 * Controller Layer for Website Utama Public Endpoints
 */
const publicService = require('./service');

class PublicWebsiteController {
  // ==========================================
  // 1. Konten Publik
  // ==========================================
  async getHome(req, res, next) {
    try {
      const data = await publicService.getHomeData(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Data beranda publik berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getSchoolProfile(req, res, next) {
    try {
      const data = await publicService.getSchoolProfile(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Profil sekolah berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStaffProfiles(req, res, next) {
    try {
      const data = await publicService.getStaffProfiles(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Profil pengajar & staf berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getSchoolLife(req, res, next) {
    try {
      const data = await publicService.getSchoolLife(req.query.school_unit_id, req.query.category);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar fasilitas & kehidupan sekolah berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getNews(req, res, next) {
    try {
      const result = await publicService.getNews(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Daftar berita & pengumuman berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getNewsBySlug(req, res, next) {
    try {
      const data = await publicService.getNewsBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail berita berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getGalleries(req, res, next) {
    try {
      const data = await publicService.getGalleries(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar galeri kegiatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getGalleryById(req, res, next) {
    try {
      const data = await publicService.getGalleryById(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail album galeri berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getFaqs(req, res, next) {
    try {
      const data = await publicService.getFaqs(req.query.school_unit_id, req.query.category);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar FAQ berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getTestimonials(req, res, next) {
    try {
      const data = await publicService.getTestimonials(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar testimoni berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getEvents(req, res, next) {
    try {
      const data = await publicService.getEvents(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Agenda kegiatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getContact(req, res, next) {
    try {
      const data = await publicService.getContactInfo(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Informasi kontak sekolah berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getAccreditations(req, res, next) {
    try {
      const data = await publicService.getAccreditations(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Informasi akreditasi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 2. PPDB
  // ==========================================
  async createRegistrant(req, res, next) {
    try {
      const data = await publicService.createRegistrant(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Draft formulir pendaftaran PPDB berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRegistrant(req, res, next) {
    try {
      const data = await publicService.updateRegistrant(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Data draft pendaftaran berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addDocument(req, res, next) {
    try {
      const data = await publicService.addRegistrantDocument(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Dokumen pendaftaran berhasil diunggah',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async submitRegistrant(req, res, next) {
    try {
      const data = await publicService.submitRegistrant(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Pendaftaran berhasil dikirim, menunggu verifikasi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getPpdbSchedules(req, res, next) {
    try {
      const data = await publicService.getPpdbSchedules(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Jadwal seleksi PPDB berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async initiatePayment(req, res, next) {
    try {
      const data = await publicService.initiatePayment(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Inisiasi pembayaran pendaftaran berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadPaymentProof(req, res, next) {
    try {
      const data = await publicService.uploadPaymentProof(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data,
        message: data.message || 'Bukti transfer berhasil diunggah',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getPaymentStatus(req, res, next) {
    try {
      const data = await publicService.getPaymentStatus(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Status pembayaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getRegistrantStatus(req, res, next) {
    try {
      const data = await publicService.getRegistrantStatus(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Status pendaftaran PPDB berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 3. Konsultasi Publik
  // ==========================================
  async createTicket(req, res, next) {
    try {
      const data = await publicService.createTicket(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tiket konsultasi berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getTicketDetail(req, res, next) {
    try {
      const data = await publicService.getTicketDetail(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail tiket konsultasi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createBooking(req, res, next) {
    try {
      const data = await publicService.createBooking(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Booking jadwal konsultasi virtual berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 4. Publikasi & Artikel
  // ==========================================
  async getArticles(req, res, next) {
    try {
      const result = await publicService.getArticles(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        message: 'Daftar artikel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getArticleBySlug(req, res, next) {
    try {
      const data = await publicService.getArticleBySlug(req.params.slug);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail artikel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addArticleComment(req, res, next) {
    try {
      const data = await publicService.addArticleComment(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Komentar artikel berhasil dikirim dan menunggu moderasi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PublicWebsiteController();
