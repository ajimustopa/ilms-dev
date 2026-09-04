/**
 * Service Layer for Website Utama Public Endpoints
 * Database: websiteutama_local (via ../db.js)
 */
const db = require('../db');
const dbCore = require('../../../config/db/core');
const dbKepegawaian = require('../../../config/db/kepegawaian');
const dbAkademik = require('../../../config/db/akademik');
const dbKeuangan = require('../../../config/db/keuangan');
const ppdbBillingService = require('../../keuangan/ppdb-billing/service');
const schoolUnitsService = require('../../core/school-units/service');
const { sendToAkademikForVerification } = require('../services/akademikMock');

class PublicWebsiteService {
  // ==========================================
  // 1. Konten Publik
  // ==========================================

  // #14 Beranda
  async getHomeData(schoolUnitId = 1) {
    const unitId = Number(schoolUnitId) || 1;

    // 1. Hero settings
    const hero = await db('home_hero_settings').where({ school_unit_id: unitId }).first();

    // 2. Highlights
    const highlights = await db('home_highlights')
      .where({ school_unit_id: unitId })
      .orderBy('display_order', 'asc');

    // 3. Live stats (Agregat lintas database)
    let totalStudents = 0;
    let totalStaff = 0;
    try {
      const stuCount = await dbAkademik('students').where({ satuan_pendidikan_id: unitId, status: 'aktif' }).count('id as total').first();
      totalStudents = parseInt(stuCount?.total || 0, 10);
    } catch (e) {
      totalStudents = 120; // Fallback demo
    }

    try {
      const empCount = await dbKepegawaian('employees').where({ status: 'aktif' }).count('id as total').first();
      totalStaff = parseInt(empCount?.total || 0, 10);
    } catch (e) {
      totalStaff = 15;
    }

    // 4. Berita terbaru
    const latestNews = await db('news_posts')
      .where({ school_unit_id: unitId, status: 'published' })
      .orderBy('published_at', 'desc')
      .limit(3);

    // 5. Agenda terdekat
    const upcomingEvents = await db('events')
      .where({ school_unit_id: unitId, status: 'published' })
      .where('event_date', '>=', db.fn.now())
      .orderBy('event_date', 'asc')
      .limit(3);

    return {
      hero: hero || {
        school_name_display: 'Aldepos Islamic Boarding School',
        headline: 'Membentuk Generasi Unggul, Cerdas, dan Berakhlak Qurani',
        subheadline: 'Pendidikan Terpadu Berkualitas Berbasis Karakter & Nilai Keislaman',
        cta_button_label: 'Pendaftaran PPDB',
        cta_button_url: '/ppdb'
      },
      highlights,
      live_statistics: {
        total_students: totalStudents,
        total_teachers_staff: totalStaff,
        accreditation_grade: 'A (Unggul)'
      },
      latest_news: latestNews,
      upcoming_events: upcomingEvents
    };
  }

  // #15 Profil Sekolah (Proxy ke Core Service)
  async getSchoolProfile(schoolUnitId = 1) {
    const unitId = Number(schoolUnitId) || 1;
    try {
      const unit = await schoolUnitsService.getSchoolUnitById(unitId);
      const siteSettings = await db('site_settings')
        .where(b => b.where('school_unit_id', unitId).orWhereNull('school_unit_id'));
      
      const settingsMap = {};
      siteSettings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

      return {
        ...unit,
        vision_mission: settingsMap['vision_mission'] || 'Mewujudkan insan bertaqwa, berprestasi, dan berwawasan global.',
        history: settingsMap['history'] || 'Didirikan dengan dedikasi tinggi untuk pendidikan Islam terpadu.',
        headmaster_greeting: settingsMap['headmaster_greeting'] || 'Selamat datang di portal resmi sekolah kami.'
      };
    } catch (err) {
      const error = new Error('Profil sekolah tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
  }

  // #16 Profil Pengajar & Struktur
  async getStaffProfiles(schoolUnitId) {
    let query = db('staff_profiles');
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    return query.orderBy('display_order', 'asc');
  }

  // #17 Kehidupan Sekolah
  async getSchoolLife(schoolUnitId, category) {
    let query = db('school_life_items').where({ status: 'published' });
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    if (category) {
      query = query.where({ category });
    }
    return query.orderBy('created_at', 'desc');
  }

  // #18 Berita & Pengumuman
  async getNews(params = {}) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.max(1, parseInt(params.limit, 10) || 10);
    const offset = (page - 1) * limit;

    let baseQuery = db('news_posts').where({ status: 'published' });

    if (params.school_unit_id) {
      baseQuery = baseQuery.where({ school_unit_id: Number(params.school_unit_id) });
    }
    if (params.category) {
      baseQuery = baseQuery.where({ category: params.category });
    }
    if (params.search) {
      baseQuery = baseQuery.where(b => {
        b.where('title', 'like', `%${params.search}%`)
         .orWhere('content', 'like', `%${params.search}%`);
      });
    }

    const [{ total }] = await baseQuery.clone().count('id as total');
    const rows = await baseQuery.orderBy('published_at', 'desc').limit(limit).offset(offset);

    return {
      items: rows,
      pagination: {
        page,
        limit,
        total: parseInt(total, 10),
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  async getNewsBySlug(slug) {
    const item = await db('news_posts').where({ slug, status: 'published' }).first();
    if (!item) {
      const error = new Error('Berita tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  // #19 Galeri
  async getGalleries(schoolUnitId) {
    let query = db('galleries');
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    const galleries = await query.orderBy('created_at', 'desc');
    
    // Attach thumbnail
    const result = [];
    for (const g of galleries) {
      const thumb = await db('gallery_items').where({ gallery_id: g.id }).orderBy('display_order', 'asc').first();
      result.push({
        ...g,
        thumbnail_url: thumb?.media_url || null,
        total_items: (await db('gallery_items').where({ gallery_id: g.id }).count('id as total').first())?.total || 0
      });
    }
    return result;
  }

  async getGalleryById(id) {
    const gallery = await db('galleries').where({ id }).first();
    if (!gallery) {
      const error = new Error('Album galeri tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    const items = await db('gallery_items').where({ gallery_id: id }).orderBy('display_order', 'asc');
    return {
      ...gallery,
      items
    };
  }

  // #20 FAQ
  async getFaqs(schoolUnitId, category) {
    let query = db('faqs');
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    if (category) {
      query = query.where({ category });
    }
    return query.orderBy('display_order', 'asc');
  }

  // #21 Testimoni
  async getTestimonials(schoolUnitId) {
    let query = db('testimonials').where({ is_visible: true });
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    return query.orderBy('created_at', 'desc');
  }

  // #22 Events / Agenda
  async getEvents(params = {}) {
    let query = db('events').where({ status: 'published' });
    if (params.school_unit_id) {
      query = query.where({ school_unit_id: Number(params.school_unit_id) });
    }
    if (params.year) {
      query = query.whereRaw('YEAR(event_date) = ?', [Number(params.year)]);
    }
    if (params.month) {
      query = query.whereRaw('MONTH(event_date) = ?', [Number(params.month)]);
    }
    return query.orderBy('event_date', 'asc');
  }

  // #23 Kontak & Lokasi
  async getContactInfo(schoolUnitId = 1) {
    const unitId = Number(schoolUnitId) || 1;
    try {
      const unit = await schoolUnitsService.getSchoolUnitById(unitId);
      return {
        school_unit_id: unitId,
        school_name: unit.name,
        address: unit.address || 'Jl. Raya Aldepos No. 1, Cijeruk, Bogor',
        phone: unit.phone || '0251-1234567',
        email: unit.email || 'info@aldeposibs.com',
        whatsapp: '0812-3456-7890',
        maps_coordinates: {
          latitude: -6.6521,
          longitude: 106.7823
        }
      };
    } catch (e) {
      return {
        school_unit_id: unitId,
        school_name: 'Aldepos Islamic Boarding School',
        address: 'Jl. Raya Aldepos No. 1, Cijeruk, Bogor',
        phone: '0251-1234567',
        email: 'info@aldeposibs.com',
        whatsapp: '0812-3456-7890'
      };
    }
  }

  // #24 Akreditasi
  async getAccreditations(schoolUnitId) {
    let query = db('accreditations');
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    return query.orderBy('year', 'desc');
  }

  // ==========================================
  // 2. PPDB Online
  // ==========================================

  // #25 Simpan / Draft Pendaftar
  async createRegistrant(payload) {
    const [id] = await db('ppdb_registrants').insert({
      school_unit_id: payload.school_unit_id,
      school_year: payload.school_year,
      registration_path: payload.registration_path,
      nisn: payload.nisn ? payload.nisn.trim() : null,
      candidate_full_name: payload.candidate_full_name.trim(),
      candidate_birth_place: payload.candidate_birth_place || null,
      candidate_birth_date: payload.candidate_birth_date || null,
      candidate_gender: payload.candidate_gender || null,
      candidate_address: payload.candidate_address || null,
      previous_school_name: payload.previous_school_name || null,
      father_name: payload.father_name || null,
      mother_name: payload.mother_name || null,
      parent_contact: payload.parent_contact || null,
      status: 'draft',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const trackingCode = `PPDB-${payload.school_year.split('/')[0]}-${String(id).padStart(6, '0')}`;

    // Catat log
    await db('ppdb_status_logs').insert({
      registrant_id: id,
      status: 'draft',
      note: 'Draft formulir pendaftaran dibuat',
      occurred_at: db.fn.now()
    });

    const created = await db('ppdb_registrants').where({ id }).first();
    return {
      ...created,
      tracking_code: trackingCode
    };
  }

  async updateRegistrant(id, payload) {
    const reg = await db('ppdb_registrants').where({ id }).first();
    if (!reg) {
      const error = new Error('Data pendaftar tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    if (reg.status !== 'draft') {
      const error = new Error('Formulir pendaftaran yang sudah dikirim tidak dapat diedit secara publik');
      error.statusCode = 400;
      throw error;
    }

    const updateFields = {};
    const allowed = [
      'school_year',
      'registration_path',
      'nisn',
      'candidate_full_name',
      'candidate_birth_place',
      'candidate_birth_date',
      'candidate_gender',
      'candidate_address',
      'previous_school_name',
      'father_name',
      'mother_name',
      'parent_contact'
    ];

    for (const k of allowed) {
      if (payload[k] !== undefined) {
        updateFields[k] = payload[k];
      }
    }

    await db('ppdb_registrants').where({ id }).update({
      ...updateFields,
      updated_at: db.fn.now()
    });

    return db('ppdb_registrants').where({ id }).first();
  }

  async addRegistrantDocument(registrantId, { document_type, file_url }) {
    const reg = await db('ppdb_registrants').where({ id: registrantId }).first();
    if (!reg) {
      const error = new Error('Pendaftar tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const [id] = await db('ppdb_registrant_documents').insert({
      registrant_id: registrantId,
      document_type,
      file_url: file_url || `/uploads/ppdb/doc_${registrantId}_${Date.now()}.pdf`,
      uploaded_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('ppdb_registrant_documents').where({ id }).first();
  }

  async submitRegistrant(id) {
    const reg = await db('ppdb_registrants').where({ id }).first();
    if (!reg) {
      const error = new Error('Data pendaftar tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Panggil service intake Akademik untuk sinkronisasi pendaftar & auto-provisioning akun
    const intakeResult = await sendToAkademikForVerification(reg);

    await db('ppdb_registrants').where({ id }).update({
      status: 'submitted',
      academic_ref_id: intakeResult.academic_ref_id,
      updated_at: db.fn.now()
    });

    // Catat log status 'submitted'
    await db('ppdb_status_logs').insert({
      registrant_id: id,
      status: 'submitted',
      note: 'Formulir pendaftaran berhasil diajukan dan diteruskan untuk verifikasi berkas',
      occurred_at: db.fn.now()
    });

    // Catat log status 'verifying' (Tersinkron ke sistem Akademik)
    await db('ppdb_status_logs').insert({
      registrant_id: id,
      status: 'verifying',
      note: 'Tersinkron ke sistem Akademik',
      occurred_at: db.fn.now()
    });

    // 5. Otomatis terbitkan tagihan pendaftaran PPDB di Modul Keuangan (ppdb_registration_bills)
    let keuanganBillId = null;
    const unitId = Number(reg.school_unit_id) || 1;
    const candidateName = reg.candidate_full_name || reg.full_name || 'Calon Santri Baru';

    try {
      const bill = await ppdbBillingService.createRegistrationBillFromPublic({
        school_unit_id: unitId,
        target_academic_year_id: 2,
        psb_registrant_ref_id: intakeResult.academic_ref_id,
        registrant_name_snapshot: candidateName,
        registration_number_snapshot: intakeResult.registration_number,
        amount: 350000.00,
        notes: `Pendaftaran Online Website Utama (Ref: ${candidateName})`
      });
      keuanganBillId = bill ? bill.id : null;
    } catch (billErr) {
      console.warn('Auto create ppdb registration bill in Keuangan skipped/error:', billErr.message);
    }

    const trackingCode = `PPDB-${reg.school_year.split('/')[0]}-${String(id).padStart(6, '0')}`;

    return {
      id,
      status: 'submitted',
      tracking_code: trackingCode,
      academic_ref_id: intakeResult.academic_ref_id,
      registration_number: intakeResult.registration_number,
      keuangan_bill_id: keuanganBillId,
      username: intakeResult.username,
      password: intakeResult.password,
      message: 'Pendaftaran berhasil diajukan dan tagihan pendaftaran telah diterbitkan.'
    };
  }

  // #26 Jadwal Seleksi
  async getPpdbSchedules(schoolUnitId) {
    let query = db('ppdb_selection_schedules');
    if (schoolUnitId) {
      query = query.where({ school_unit_id: Number(schoolUnitId) });
    }
    return query.orderBy('test_date', 'asc');
  }

  // #27 Pembayaran PPDB (Manual Bank Transfer & Proof Upload ke Keuangan)
  // Catatan Arsitektur: Tabel lokal ppdb_payments diarsipkan (deprecated), seluruh pencatatan kini ke ppdb_registration_bills di Keuangan.
  async initiatePayment(registrantId, payload = {}) {
    const reg = await db('ppdb_registrants').where({ id: registrantId }).first();
    if (!reg) {
      const error = new Error('Data pendaftar tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const candidateName = reg.candidate_full_name || reg.full_name || 'Calon Santri Baru';

    // Ambil atau pastikan tagihan ada di modul Keuangan
    let bill = null;
    if (reg.academic_ref_id) {
      bill = await dbKeuangan('ppdb_registration_bills')
        .where({ psb_registrant_ref_id: reg.academic_ref_id })
        .first();
    }
    if (!bill) {
      bill = await dbKeuangan('ppdb_registration_bills')
        .where({ registrant_name_snapshot: candidateName })
        .orderBy('id', 'desc')
        .first();
    }

    if (!bill) {
      bill = await ppdbBillingService.createRegistrationBillFromPublic({
        school_unit_id: reg.school_unit_id || 1,
        psb_registrant_ref_id: reg.academic_ref_id || registrantId,
        registrant_name_snapshot: candidateName,
        registration_number_snapshot: reg.registration_number || null,
        amount: payload.amount || 350000.00
      });
    }

    const bankAccounts = await ppdbBillingService.getPublicBankAccounts(reg.school_unit_id || 1);

    return {
      bill_id: bill.id,
      registrant_id: registrantId,
      amount: parseFloat(bill.amount),
      status: bill.status,
      bank_accounts: bankAccounts,
      payment_method: 'bank_transfer_manual',
      instructions: 'Silakan transfer ke salah satu rekening resmi di atas, kemudian unggah struk bukti transfer.'
    };
  }

  async uploadPaymentProof(registrantId, payload = {}) {
    const reg = await db('ppdb_registrants').where({ id: registrantId }).first();
    if (!reg) {
      const error = new Error('Data pendaftar tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const candidateName = reg.candidate_full_name || reg.full_name || 'Calon Santri Baru';

    let bill = await dbKeuangan('ppdb_registration_bills')
      .where({ psb_registrant_ref_id: reg.academic_ref_id || registrantId })
      .first();

    if (!bill) {
      bill = await dbKeuangan('ppdb_registration_bills')
        .where({ registrant_name_snapshot: candidateName })
        .orderBy('id', 'desc')
        .first();
    }

    if (!bill) {
      const error = new Error('Tagihan pendaftaran belum diterbitkan');
      error.statusCode = 404;
      throw error;
    }

    const proof = await ppdbBillingService.uploadPublicRegistrationProof(bill.id, {
      proof_file_url: payload.proof_file_url,
      transfer_amount: payload.transfer_amount,
      transfer_date: payload.transfer_date,
      bank_name: payload.bank_name,
      sender_account_name: payload.sender_account_name,
      target_cash_account_id: payload.target_cash_account_id
    });

    await db('ppdb_status_logs').insert({
      registrant_id: registrantId,
      status: 'payment_uploaded',
      note: 'Bukti transfer pendaftaran telah diunggah dan menunggu verifikasi bendahara',
      occurred_at: db.fn.now()
    });

    return {
      message: 'Bukti transfer berhasil diunggah. Tim keuangan akan memverifikasi dalam 1x24 jam.',
      proof
    };
  }

  async getPaymentStatus(registrantId) {
    const reg = await db('ppdb_registrants').where({ id: registrantId }).first();
    if (!reg) {
      return {
        registrant_id: registrantId,
        payment_status: 'unpaid',
        message: 'Data pendaftar tidak ditemukan'
      };
    }

    const candidateName = reg.candidate_full_name || reg.full_name || 'Calon Santri Baru';

    let bill = null;
    if (reg.academic_ref_id) {
      bill = await dbKeuangan('ppdb_registration_bills')
        .where({ psb_registrant_ref_id: reg.academic_ref_id })
        .first();
    }
    if (!bill) {
      bill = await dbKeuangan('ppdb_registration_bills')
        .where({ registrant_name_snapshot: candidateName })
        .orderBy('id', 'desc')
        .first();
    }

    if (!bill) {
      return {
        registrant_id: registrantId,
        payment_status: 'unpaid',
        message: 'Belum ada tagihan pendaftaran'
      };
    }

    const statusData = await ppdbBillingService.getPublicBillStatus(bill.id);
    return {
      registrant_id: registrantId,
      bill_id: bill.id,
      ...statusData
    };
  }

  // #28 Tracking Status PPDB
  async getRegistrantStatus(id) {
    const reg = await db('ppdb_registrants').where({ id }).first();
    if (!reg) {
      const error = new Error('Pendaftar tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const logs = await db('ppdb_status_logs')
      .where({ registrant_id: id })
      .orderBy('occurred_at', 'desc');

    const trackingCode = `PPDB-${reg.school_year.split('/')[0]}-${String(id).padStart(6, '0')}`;

    return {
      id,
      registrant_id: id,
      tracking_code: trackingCode,
      school_unit_id: reg.school_unit_id,
      school_year: reg.school_year,
      registration_path: reg.registration_path,
      candidate_full_name: reg.candidate_full_name,
      candidate_birth_place: reg.candidate_birth_place,
      candidate_birth_date: reg.candidate_birth_date,
      candidate_gender: reg.candidate_gender,
      candidate_address: reg.candidate_address,
      father_name: reg.father_name,
      mother_name: reg.mother_name,
      parent_contact: reg.parent_contact,
      status: reg.status,
      current_status: reg.status,
      status_logs: logs,
      status_history: logs
    };
  }

  // ==========================================
  // 3. Konsultasi Publik
  // ==========================================

  // #29 Form Konsultasi
  async createTicket(payload) {
    const [id] = await db('consultation_tickets').insert({
      school_unit_id: payload.school_unit_id,
      name: payload.name.trim(),
      contact: payload.contact.trim(),
      subject: payload.subject.trim(),
      content: payload.content.trim(),
      status: 'open',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const ticketCode = `TCK-${Date.now().toString().slice(-6)}-${id}`;
    return {
      id,
      ticket_code: ticketCode,
      subject: payload.subject,
      status: 'open'
    };
  }

  async getTicketDetail(id) {
    const ticket = await db('consultation_tickets').where({ id }).first();
    if (!ticket) {
      const error = new Error('Tiket konsultasi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const replies = await db('consultation_ticket_replies')
      .where({ ticket_id: id })
      .orderBy('created_at', 'asc');

    return {
      ...ticket,
      replies
    };
  }

  // #30 Booking Konsultasi Virtual
  async createBooking(payload) {
    const [id] = await db('consultation_bookings').insert({
      school_unit_id: payload.school_unit_id,
      name: payload.name.trim(),
      contact: payload.contact.trim(),
      scheduled_at: payload.scheduled_at,
      status: 'booked',
      meeting_link: 'https://meet.google.com/aldepos-consultation',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('consultation_bookings').where({ id }).first();
  }

  // ==========================================
  // 4. Publikasi & Artikel
  // ==========================================

  // #31 Artikel Publik
  async getArticles(params = {}) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.max(1, parseInt(params.limit, 10) || 10);
    const offset = (page - 1) * limit;

    let baseQuery = db('articles').where({ status: 'published' });

    if (params.school_unit_id) {
      baseQuery = baseQuery.where({ school_unit_id: Number(params.school_unit_id) });
    }
    if (params.category) {
      baseQuery = baseQuery.where({ category: params.category });
    }
    if (params.search) {
      baseQuery = baseQuery.where('title', 'like', `%${params.search}%`);
    }

    const [{ total }] = await baseQuery.clone().count('id as total');
    const rows = await baseQuery.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return {
      items: rows,
      pagination: {
        page,
        limit,
        total: parseInt(total, 10),
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  async getArticleBySlug(slug) {
    const article = await db('articles').where({ slug, status: 'published' }).first();
    if (!article) {
      const error = new Error('Artikel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Increment views_count
    await db('articles').where({ id: article.id }).increment('views_count', 1);

    // Ambil komentar approved
    const comments = await db('article_comments')
      .where({ article_id: article.id, status: 'approved' })
      .orderBy('created_at', 'asc');

    return {
      ...article,
      views_count: article.views_count + 1,
      comments
    };
  }

  // #32 Kirim Komentar Artikel
  async addArticleComment(articleId, payload) {
    const article = await db('articles').where({ id: articleId, status: 'published' }).first();
    if (!article) {
      const error = new Error('Artikel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const [id] = await db('article_comments').insert({
      article_id: articleId,
      commenter_name: payload.commenter_name.trim(),
      content: payload.content.trim(),
      status: 'pending', // Menunggu moderasi admin
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return {
      id,
      article_id: articleId,
      commenter_name: payload.commenter_name,
      status: 'pending',
      message: 'Komentar Anda telah diterima dan akan ditampilkan setelah disetujui moderator.'
    };
  }
}

module.exports = new PublicWebsiteService();
