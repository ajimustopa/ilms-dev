/**
 * Service Layer for Website Utama Admin Endpoints
 * Database: websiteutama_local (via ../db.js)
 */
const db = require('../db');
const dbCore = require('../../../config/db/core');

class AdminWebsiteService {
  // ==========================================
  // 1. Konten Publik (CRUD Admin)
  // ==========================================

  // #14 Hero & Highlights
  async getHero(schoolUnitId) {
    const hero = await db('home_hero_settings').where({ school_unit_id: schoolUnitId }).first();
    return hero || null;
  }

  async updateHero(schoolUnitId, payload) {
    const existing = await db('home_hero_settings').where({ school_unit_id: schoolUnitId }).first();
    if (existing) {
      await db('home_hero_settings').where({ school_unit_id: schoolUnitId }).update({
        ...payload,
        updated_at: db.fn.now()
      });
    } else {
      await db('home_hero_settings').insert({
        school_unit_id: schoolUnitId,
        ...payload,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }
    return db('home_hero_settings').where({ school_unit_id: schoolUnitId }).first();
  }

  async listHighlights(schoolUnitId) {
    return db('home_highlights').where({ school_unit_id: schoolUnitId }).orderBy('display_order', 'asc');
  }

  async createHighlight(payload) {
    const [id] = await db('home_highlights').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('home_highlights').where({ id }).first();
  }

  async updateHighlight(id, payload) {
    await db('home_highlights').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('home_highlights').where({ id }).first();
  }

  async deleteHighlight(id) {
    return db('home_highlights').where({ id }).del();
  }

  // #16 Profil Staf & Pengajar
  async listStaffProfiles(schoolUnitId) {
    let q = db('staff_profiles');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('display_order', 'asc');
  }

  async createStaffProfile(payload) {
    const [id] = await db('staff_profiles').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('staff_profiles').where({ id }).first();
  }

  async updateStaffProfile(id, payload) {
    await db('staff_profiles').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('staff_profiles').where({ id }).first();
  }

  async deleteStaffProfile(id) {
    return db('staff_profiles').where({ id }).del();
  }

  // #17 Kehidupan Sekolah
  async listSchoolLife(schoolUnitId, category) {
    let q = db('school_life_items');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    if (category) q = q.where({ category });
    return q.orderBy('created_at', 'desc');
  }

  async createSchoolLife(payload) {
    const [id] = await db('school_life_items').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('school_life_items').where({ id }).first();
  }

  async updateSchoolLife(id, payload) {
    await db('school_life_items').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('school_life_items').where({ id }).first();
  }

  async deleteSchoolLife(id) {
    return db('school_life_items').where({ id }).del();
  }

  // #18 Berita & Pengumuman (CMS Admin & Internal Guru)
  async listNews(params = {}) {
    let q = db('news_posts');
    if (params.school_unit_id) q = q.where({ school_unit_id: params.school_unit_id });
    if (params.status) q = q.where({ status: params.status });
    if (params.target_audience) q = q.where({ target_audience: params.target_audience });
    if (params.category) q = q.where({ category: params.category });
    if (params.search) {
      q = q.where(b => {
        b.where('title', 'like', `%${params.search}%`).orWhere('content', 'like', `%${params.search}%`);
      });
    }
    return q.orderBy('created_at', 'desc');
  }

  // Khusus Pengumuman / Berita Internal Guru (Portal Guru)
  async listTeacherAnnouncements(params = {}, user = null) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.max(1, parseInt(params.limit, 10) || 10);
    const offset = (page - 1) * limit;

    let baseQuery = db('news_posts')
      .where({ status: 'published' })
      .whereIn('target_audience', ['teachers', 'all_internal', 'public']);

    if (params.school_unit_id) {
      baseQuery = baseQuery.where({ school_unit_id: Number(params.school_unit_id) });
    }
    if (params.target_audience && ['teachers', 'all_internal', 'public'].includes(params.target_audience)) {
      baseQuery = baseQuery.where({ target_audience: params.target_audience });
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
    
    const hasPinned = await db.schema.hasColumn('news_posts', 'is_pinned');
    if (hasPinned) {
      baseQuery = baseQuery.orderBy('is_pinned', 'desc');
    }
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

  async getTeacherAnnouncementById(id, user = null) {
    const item = await db('news_posts')
      .where({ id, status: 'published' })
      .whereIn('target_audience', ['teachers', 'all_internal', 'public'])
      .first();

    if (!item) {
      const error = new Error('Pengumuman guru tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  async createNews(payload, userId) {
    const targetAudience = payload.target_audience || 'public';
    const [id] = await db('news_posts').insert({
      school_unit_id: payload.school_unit_id,
      title: payload.title,
      slug: payload.slug,
      content: payload.content,
      category: payload.category || null,
      target_audience: targetAudience,
      cover_image_url: payload.cover_image_url || null,
      status: payload.status || 'draft',
      published_at: payload.status === 'published' ? (payload.published_at || db.fn.now()) : null,
      created_by: userId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('news_posts').where({ id }).first();
  }

  async updateNews(id, payload) {
    const updateData = {
      ...payload,
      updated_at: db.fn.now()
    };
    if (payload.status === 'published' && !payload.published_at) {
      updateData.published_at = db.fn.now();
    }
    await db('news_posts').where({ id }).update(updateData);
    return db('news_posts').where({ id }).first();
  }

  async publishNews(id) {
    await db('news_posts').where({ id }).update({
      status: 'published',
      published_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('news_posts').where({ id }).first();
  }

  async archiveNews(id) {
    await db('news_posts').where({ id }).update({
      status: 'archived',
      updated_at: db.fn.now()
    });
    return db('news_posts').where({ id }).first();
  }

  async deleteNews(id) {
    return db('news_posts').where({ id }).del();
  }

  // #19 Galeri & Item
  async listGalleries(schoolUnitId) {
    let q = db('galleries');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('created_at', 'desc');
  }

  async createGallery(payload) {
    const [id] = await db('galleries').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('galleries').where({ id }).first();
  }

  async updateGallery(id, payload) {
    await db('galleries').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('galleries').where({ id }).first();
  }

  async deleteGallery(id) {
    return db('galleries').where({ id }).del();
  }

  async addGalleryItem(galleryId, payload) {
    const [id] = await db('gallery_items').insert({
      gallery_id: galleryId,
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('gallery_items').where({ id }).first();
  }

  async deleteGalleryItem(itemId) {
    return db('gallery_items').where({ id: itemId }).del();
  }

  // #20 FAQ
  async listFaqs(schoolUnitId) {
    let q = db('faqs');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('display_order', 'asc');
  }

  async createFaq(payload) {
    const [id] = await db('faqs').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('faqs').where({ id }).first();
  }

  async updateFaq(id, payload) {
    await db('faqs').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('faqs').where({ id }).first();
  }

  async deleteFaq(id) {
    return db('faqs').where({ id }).del();
  }

  // #21 Testimoni
  async listTestimonials(schoolUnitId) {
    let q = db('testimonials');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('created_at', 'desc');
  }

  async createTestimonial(payload) {
    const [id] = await db('testimonials').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('testimonials').where({ id }).first();
  }

  async updateTestimonial(id, payload) {
    await db('testimonials').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('testimonials').where({ id }).first();
  }

  async toggleTestimonialVisibility(id) {
    const current = await db('testimonials').where({ id }).first();
    if (!current) throw new Error('Testimoni tidak ditemukan');
    const newStatus = !current.is_visible;
    await db('testimonials').where({ id }).update({
      is_visible: newStatus,
      updated_at: db.fn.now()
    });
    return db('testimonials').where({ id }).first();
  }

  async deleteTestimonial(id) {
    return db('testimonials').where({ id }).del();
  }

  // #22 Events
  async listEvents(schoolUnitId) {
    let q = db('events');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('event_date', 'asc');
  }

  async createEvent(payload) {
    const [id] = await db('events').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('events').where({ id }).first();
  }

  async updateEvent(id, payload) {
    await db('events').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('events').where({ id }).first();
  }

  async publishEvent(id) {
    await db('events').where({ id }).update({
      status: 'published',
      updated_at: db.fn.now()
    });
    return db('events').where({ id }).first();
  }

  async deleteEvent(id) {
    return db('events').where({ id }).del();
  }

  // #24 Akreditasi
  async listAccreditations(schoolUnitId) {
    let q = db('accreditations');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('year', 'desc');
  }

  async createAccreditation(payload) {
    const [id] = await db('accreditations').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('accreditations').where({ id }).first();
  }

  async updateAccreditation(id, payload) {
    await db('accreditations').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('accreditations').where({ id }).first();
  }

  async deleteAccreditation(id) {
    return db('accreditations').where({ id }).del();
  }

  // ==========================================
  // 2. PPDB Admin
  // ==========================================
  async listPpdbRegistrants(params = {}) {
    let q = db('ppdb_registrants');
    if (params.school_unit_id) q = q.where({ school_unit_id: params.school_unit_id });
    if (params.status) q = q.where({ status: params.status });
    if (params.school_year) q = q.where({ school_year: params.school_year });
    if (params.registration_path) q = q.where({ registration_path: params.registration_path });
    return q.orderBy('created_at', 'desc');
  }

  async getPpdbRegistrantDetail(id) {
    const reg = await db('ppdb_registrants').where({ id }).first();
    if (!reg) throw new Error('Data pendaftar tidak ditemukan');

    const documents = await db('ppdb_registrant_documents').where({ registrant_id: id });
    const payments = await db('ppdb_payments').where({ registrant_id: id });
    const statusLogs = await db('ppdb_status_logs').where({ registrant_id: id }).orderBy('occurred_at', 'desc');

    return {
      ...reg,
      documents,
      payments,
      status_logs: statusLogs
    };
  }

  async updatePpdbRegistrantStatus(id, { status, note }, userId) {
    const reg = await db('ppdb_registrants').where({ id }).first();
    if (!reg) throw new Error('Data pendaftar tidak ditemukan');

    await db('ppdb_registrants').where({ id }).update({
      status,
      updated_at: db.fn.now()
    });

    await db('ppdb_status_logs').insert({
      registrant_id: id,
      status,
      note: note || `Status diubah menjadi ${status} oleh admin`,
      changed_by: userId || null,
      occurred_at: db.fn.now()
    });

    return db('ppdb_registrants').where({ id }).first();
  }

  async getPpdbStatusLogs(registrantId) {
    return db('ppdb_status_logs').where({ registrant_id: registrantId }).orderBy('occurred_at', 'desc');
  }

  // Jadwal Seleksi
  async listPpdbSchedules(schoolUnitId) {
    let q = db('ppdb_selection_schedules');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('test_date', 'asc');
  }

  async createPpdbSchedule(payload) {
    const [id] = await db('ppdb_selection_schedules').insert({
      ...payload,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('ppdb_selection_schedules').where({ id }).first();
  }

  async updatePpdbSchedule(id, payload) {
    await db('ppdb_selection_schedules').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('ppdb_selection_schedules').where({ id }).first();
  }

  async deletePpdbSchedule(id) {
    return db('ppdb_selection_schedules').where({ id }).del();
  }

  // Pembayaran
  async listPpdbPayments(params = {}) {
    let q = db('ppdb_payments')
      .join('ppdb_registrants', 'ppdb_payments.registrant_id', 'ppdb_registrants.id')
      .select(
        'ppdb_payments.*',
        'ppdb_registrants.candidate_full_name',
        'ppdb_registrants.school_unit_id',
        'ppdb_registrants.school_year'
      );

    if (params.school_unit_id) q = q.where('ppdb_registrants.school_unit_id', params.school_unit_id);
    if (params.payment_status) q = q.where('ppdb_payments.payment_status', params.payment_status);

    return q.orderBy('ppdb_payments.created_at', 'desc');
  }

  async verifyPpdbPayment(paymentId) {
    const payment = await db('ppdb_payments').where({ id: paymentId }).first();
    if (!payment) throw new Error('Data pembayaran tidak ditemukan');

    await db('ppdb_payments').where({ id: paymentId }).update({
      payment_status: 'paid',
      paid_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('ppdb_payments').where({ id: paymentId }).first();
  }

  async getPpdbStatistics(schoolUnitId) {
    let base = db('ppdb_registrants');
    if (schoolUnitId) base = base.where({ school_unit_id: schoolUnitId });

    const total = (await base.clone().count('id as total').first())?.total || 0;
    const submitted = (await base.clone().where({ status: 'submitted' }).count('id as total').first())?.total || 0;
    const accepted = (await base.clone().where({ status: 'accepted' }).count('id as total').first())?.total || 0;
    const rejected = (await base.clone().where({ status: 'rejected' }).count('id as total').first())?.total || 0;

    return {
      total_pendaftar: parseInt(total, 10),
      total_menunggu_verifikasi: parseInt(submitted, 10),
      total_diterima: parseInt(accepted, 10),
      total_ditolak: parseInt(rejected, 10)
    };
  }

  // ==========================================
  // 3. Konsultasi Admin
  // ==========================================
  async listTickets(schoolUnitId) {
    let q = db('consultation_tickets');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('created_at', 'desc');
  }

  async replyTicket(ticketId, { content }, userId) {
    const ticket = await db('consultation_tickets').where({ id: ticketId }).first();
    if (!ticket) throw new Error('Tiket tidak ditemukan');

    const [id] = await db('consultation_ticket_replies').insert({
      ticket_id: ticketId,
      replied_by: userId,
      content: content.trim(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('consultation_ticket_replies').where({ id }).first();
  }

  async assignTicket(ticketId, { assigned_to }) {
    await db('consultation_tickets').where({ id: ticketId }).update({
      assigned_to,
      updated_at: db.fn.now()
    });
    return db('consultation_tickets').where({ id: ticketId }).first();
  }

  async closeTicket(ticketId) {
    await db('consultation_tickets').where({ id: ticketId }).update({
      status: 'closed',
      updated_at: db.fn.now()
    });
    return db('consultation_tickets').where({ id: ticketId }).first();
  }

  async listBookings(schoolUnitId) {
    let q = db('consultation_bookings');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('scheduled_at', 'asc');
  }

  async updateBookingStatus(id, { status, meeting_link }) {
    const updateData = { status, updated_at: db.fn.now() };
    if (meeting_link) updateData.meeting_link = meeting_link;

    await db('consultation_bookings').where({ id }).update(updateData);
    return db('consultation_bookings').where({ id }).first();
  }

  // ==========================================
  // 4. Publikasi & Artikel Admin
  // ==========================================
  async listArticles(params = {}, user = null) {
    let q = db('articles');
    if (params.school_unit_id) q = q.where({ school_unit_id: params.school_unit_id });
    if (params.status) q = q.where({ status: params.status });

    // Jika editor artikel biasa, hanya lihat artikel miliknya
    if (user && user.cmsRole === 'editor_artikel') {
      q = q.where({ author_user_id: user.id });
    }

    return q.orderBy('created_at', 'desc');
  }

  async createArticle(payload, userId) {
    const [id] = await db('articles').insert({
      ...payload,
      author_user_id: userId,
      status: 'draft',
      views_count: 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('articles').where({ id }).first();
  }

  async updateArticle(id, payload) {
    await db('articles').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('articles').where({ id }).first();
  }

  async deleteArticle(id) {
    return db('articles').where({ id }).del();
  }

  async submitArticleReview(id) {
    await db('articles').where({ id }).update({
      status: 'in_review',
      updated_at: db.fn.now()
    });
    return db('articles').where({ id }).first();
  }

  async publishArticle(id) {
    await db('articles').where({ id }).update({
      status: 'published',
      updated_at: db.fn.now()
    });
    return db('articles').where({ id }).first();
  }

  async listArticleComments(articleId) {
    let q = db('article_comments');
    if (articleId) q = q.where({ article_id: articleId });
    return q.orderBy('created_at', 'desc');
  }

  async moderateComment(commentId, { status }) {
    await db('article_comments').where({ id: commentId }).update({
      status,
      updated_at: db.fn.now()
    });
    return db('article_comments').where({ id: commentId }).first();
  }

  // ==========================================
  // 5. CMS Admin & Pengaturan Situs
  // ==========================================
  async getTheme(schoolUnitId) {
    const theme = await db('theme_settings').where({ school_unit_id: schoolUnitId }).first();
    return theme || {
      school_unit_id: schoolUnitId,
      color_preset: 'emerald',
      typography_preset: 'outfit',
      is_active: true
    };
  }

  async updateTheme(schoolUnitId, payload) {
    const existing = await db('theme_settings').where({ school_unit_id: schoolUnitId }).first();
    if (existing) {
      await db('theme_settings').where({ school_unit_id: schoolUnitId }).update({
        ...payload,
        updated_at: db.fn.now()
      });
    } else {
      await db('theme_settings').insert({
        school_unit_id: schoolUnitId,
        ...payload,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }
    return db('theme_settings').where({ school_unit_id: schoolUnitId }).first();
  }

  // CMS Access Grants
  async listCmsAccess(schoolUnitId) {
    let q = db('cms_access_grants');
    if (schoolUnitId) q = q.where({ school_unit_id: schoolUnitId });
    return q.orderBy('created_at', 'desc');
  }

  async grantCmsAccess(payload) {
    const [id] = await db('cms_access_grants').insert({
      ...payload,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('cms_access_grants').where({ id }).first();
  }

  async updateCmsAccess(id, payload) {
    await db('cms_access_grants').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('cms_access_grants').where({ id }).first();
  }

  async revokeCmsAccess(id) {
    return db('cms_access_grants').where({ id }).del();
  }

  // Site Settings
  async listSiteSettings(schoolUnitId) {
    let q = db('site_settings');
    if (schoolUnitId) {
      q = q.where(b => b.where({ school_unit_id: schoolUnitId }).orWhereNull('school_unit_id'));
    }
    return q;
  }

  async updateSiteSettings(schoolUnitId, settingsArray) {
    for (const item of settingsArray) {
      const existing = await db('site_settings')
        .where({ school_unit_id: schoolUnitId || null, setting_key: item.setting_key })
        .first();

      if (existing) {
        await db('site_settings')
          .where({ id: existing.id })
          .update({
            setting_value: item.setting_value,
            description: item.description || existing.description,
            updated_at: db.fn.now()
          });
      } else {
        await db('site_settings').insert({
          school_unit_id: schoolUnitId || null,
          setting_key: item.setting_key,
          setting_value: item.setting_value,
          description: item.description || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }
    return this.listSiteSettings(schoolUnitId);
  }

  async generateSitemap() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://aldeposibs.com/</loc><priority>1.0</priority></url>
  <url><loc>https://aldeposibs.com/profil</loc><priority>0.8</priority></url>
  <url><loc>https://aldeposibs.com/ppdb</loc><priority>0.9</priority></url>
  <url><loc>https://aldeposibs.com/berita</loc><priority>0.7</priority></url>
  <url><loc>https://aldeposibs.com/kontak</loc><priority>0.6</priority></url>
</urlset>`;
  }

  async generateRobots() {
    return `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://aldeposibs.com/sitemap.xml`;
  }
}

module.exports = new AdminWebsiteService();
