/**
 * Admin Routes for Website Utama & PPDB Module
 * Base Prefix: /admin (akan di-mount ke /api/v1/website-utama/admin)
 */
const express = require('express');
const router = express.Router();
const adminController = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const { requireCmsRole } = require('../middleware/requireCmsRole');

// Seluruh route admin wajib login dengan JWT
router.use(verifyJwt);

// ==========================================
// 1. Konten Publik (Role: superadmin_cms, admin_konten)
// ==========================================
const kontenGuard = requireCmsRole('superadmin_cms', 'admin_konten');

// #14 Hero & Highlights
router.get('/home/hero', kontenGuard, adminController.getHero);
router.put('/home/hero', kontenGuard, adminController.updateHero);
router.get('/home/highlights', kontenGuard, adminController.listHighlights);
router.post('/home/highlights', kontenGuard, adminController.createHighlight);
router.put('/home/highlights/:id', kontenGuard, adminController.updateHighlight);
router.delete('/home/highlights/:id', kontenGuard, adminController.deleteHighlight);

// #16 Profil Staf
router.get('/staff-profiles', kontenGuard, adminController.listStaffProfiles);
router.post('/staff-profiles', kontenGuard, adminController.createStaffProfile);
router.put('/staff-profiles/:id', kontenGuard, adminController.updateStaffProfile);
router.delete('/staff-profiles/:id', kontenGuard, adminController.deleteStaffProfile);

// #17 Kehidupan Sekolah
router.get('/school-life', kontenGuard, adminController.listSchoolLife);
router.post('/school-life', kontenGuard, adminController.createSchoolLife);
router.put('/school-life/:id', kontenGuard, adminController.updateSchoolLife);
router.delete('/school-life/:id', kontenGuard, adminController.deleteSchoolLife);

// #18 Berita & Pengumuman
router.get('/news', kontenGuard, adminController.listNews);
router.post('/news', kontenGuard, adminController.createNews);
router.put('/news/:id', kontenGuard, adminController.updateNews);
router.patch('/news/:id/publish', kontenGuard, adminController.publishNews);
router.patch('/news/:id/archive', kontenGuard, adminController.archiveNews);
router.delete('/news/:id', kontenGuard, adminController.deleteNews);

// #19 Galeri
router.get('/galleries', kontenGuard, adminController.listGalleries);
router.post('/galleries', kontenGuard, adminController.createGallery);
router.put('/galleries/:id', kontenGuard, adminController.updateGallery);
router.delete('/galleries/:id', kontenGuard, adminController.deleteGallery);
router.post('/galleries/:id/items', kontenGuard, adminController.addGalleryItem);
router.delete('/galleries/:id/items/:itemId', kontenGuard, adminController.deleteGalleryItem);

// #20 FAQ
router.get('/faqs', kontenGuard, adminController.listFaqs);
router.post('/faqs', kontenGuard, adminController.createFaq);
router.put('/faqs/:id', kontenGuard, adminController.updateFaq);
router.delete('/faqs/:id', kontenGuard, adminController.deleteFaq);

// #21 Testimoni
router.get('/testimonials', kontenGuard, adminController.listTestimonials);
router.post('/testimonials', kontenGuard, adminController.createTestimonial);
router.put('/testimonials/:id', kontenGuard, adminController.updateTestimonial);
router.patch('/testimonials/:id/toggle-visibility', kontenGuard, adminController.toggleTestimonialVisibility);
router.delete('/testimonials/:id', kontenGuard, adminController.deleteTestimonial);

// #22 Events
router.get('/events', kontenGuard, adminController.listEvents);
router.post('/events', kontenGuard, adminController.createEvent);
router.put('/events/:id', kontenGuard, adminController.updateEvent);
router.patch('/events/:id/publish', kontenGuard, adminController.publishEvent);
router.delete('/events/:id', kontenGuard, adminController.deleteEvent);

// #24 Akreditasi
router.get('/accreditations', kontenGuard, adminController.listAccreditations);
router.post('/accreditations', kontenGuard, adminController.createAccreditation);
router.put('/accreditations/:id', kontenGuard, adminController.updateAccreditation);
router.delete('/accreditations/:id', kontenGuard, adminController.deleteAccreditation);

// ==========================================
// 2. PPDB Admin (Role: superadmin_cms, admin_ppdb)
// ==========================================
const ppdbGuard = requireCmsRole('superadmin_cms', 'admin_ppdb');

router.get('/ppdb/registrants', ppdbGuard, adminController.listPpdbRegistrants);
router.get('/ppdb/registrants/:id', ppdbGuard, adminController.getPpdbRegistrantDetail);
router.patch('/ppdb/registrants/:id/status', ppdbGuard, adminController.updatePpdbRegistrantStatus);
router.get('/ppdb/registrants/:id/status-logs', ppdbGuard, adminController.getPpdbStatusLogs);
router.get('/ppdb/schedules', ppdbGuard, adminController.listPpdbSchedules);
router.post('/ppdb/schedules', ppdbGuard, adminController.createPpdbSchedule);
router.put('/ppdb/schedules/:id', ppdbGuard, adminController.updatePpdbSchedule);
router.delete('/ppdb/schedules/:id', ppdbGuard, adminController.deletePpdbSchedule);
router.get('/ppdb/payments', ppdbGuard, adminController.listPpdbPayments);
router.patch('/ppdb/payments/:id/verify', ppdbGuard, adminController.verifyPpdbPayment);
router.get('/ppdb/statistics', ppdbGuard, adminController.getPpdbStatistics);

// ==========================================
// 3. Konsultasi Admin (Role: superadmin_cms, admin_konsultasi)
// ==========================================
const consultGuard = requireCmsRole('superadmin_cms', 'admin_konsultasi');

router.get('/consultation/tickets', consultGuard, adminController.listTickets);
router.post('/consultation/tickets/:id/reply', consultGuard, adminController.replyTicket);
router.patch('/consultation/tickets/:id/assign', consultGuard, adminController.assignTicket);
router.patch('/consultation/tickets/:id/close', consultGuard, adminController.closeTicket);
router.get('/consultation/bookings', consultGuard, adminController.listBookings);
router.patch('/consultation/bookings/:id', consultGuard, adminController.updateBookingStatus);

// ==========================================
// 4. Publikasi Artikel (Role: superadmin_cms, moderator_artikel, editor_artikel)
// ==========================================
const articleAuthorGuard = requireCmsRole('superadmin_cms', 'moderator_artikel', 'editor_artikel');
const articleModeratorGuard = requireCmsRole('superadmin_cms', 'moderator_artikel');

router.get('/articles', articleAuthorGuard, adminController.listArticles);
router.post('/articles', articleAuthorGuard, adminController.createArticle);
router.put('/articles/:id', articleAuthorGuard, adminController.updateArticle);
router.delete('/articles/:id', articleAuthorGuard, adminController.deleteArticle);
router.patch('/articles/:id/submit-review', articleAuthorGuard, adminController.submitArticleReview);
router.patch('/articles/:id/publish', articleModeratorGuard, adminController.publishArticle);
router.get('/articles/comments', articleModeratorGuard, adminController.listArticleComments);
router.get('/articles/:id/comments', articleModeratorGuard, adminController.listArticleComments);
router.patch('/articles/comments/:id/moderate', articleModeratorGuard, adminController.moderateComment);

// ==========================================
// 5. CMS Admin & Site Settings (Role: superadmin_cms)
// ==========================================
const superadminGuard = requireCmsRole('superadmin_cms');

router.get('/theme', superadminGuard, adminController.getTheme);
router.put('/theme', superadminGuard, adminController.updateTheme);
router.get('/theme/preview', superadminGuard, adminController.getTheme);

router.get('/cms-access', superadminGuard, adminController.listCmsAccess);
router.post('/cms-access', superadminGuard, adminController.grantCmsAccess);
router.patch('/cms-access/:id', superadminGuard, adminController.updateCmsAccess);
router.delete('/cms-access/:id', superadminGuard, adminController.revokeCmsAccess);

router.get('/site-settings', superadminGuard, adminController.listSiteSettings);
router.put('/site-settings', superadminGuard, adminController.updateSiteSettings);
router.get('/site-settings/sitemap', superadminGuard, adminController.getSitemap);
router.get('/site-settings/robots', superadminGuard, adminController.getRobots);

module.exports = router;
