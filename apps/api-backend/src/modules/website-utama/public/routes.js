/**
 * Public Routes for Website Utama & PPDB
 * Base Prefix: /public (akan di-mount ke /api/v1/website-utama/public)
 */
const express = require('express');
const router = express.Router();
const publicController = require('./controller');
const {
  validate,
  ppdbRegistrantSchema,
  ppdbRegistrantUpdateSchema,
  consultationTicketSchema,
  articleCommentSchema,
  consultationBookingSchema
} = require('./validators');

// ==========================================
// 1. Konten Publik (Fitur #14 - #24)
// ==========================================
router.get('/home', publicController.getHome);
router.get('/school-profile', publicController.getSchoolProfile);
router.get('/staff-profiles', publicController.getStaffProfiles);
router.get('/school-life', publicController.getSchoolLife);
router.get('/news', publicController.getNews);
router.get('/news/:slug', publicController.getNewsBySlug);
router.get('/galleries', publicController.getGalleries);
router.get('/galleries/:id', publicController.getGalleryById);
router.get('/faqs', publicController.getFaqs);
router.get('/testimonials', publicController.getTestimonials);
router.get('/events', publicController.getEvents);
router.get('/contact', publicController.getContact);
router.get('/accreditations', publicController.getAccreditations);

// ==========================================
// 2. PPDB Online (Fitur #25 - #28)
// ==========================================
router.post('/ppdb/registrants', validate(ppdbRegistrantSchema), publicController.createRegistrant);
router.put('/ppdb/registrants/:id', validate(ppdbRegistrantUpdateSchema), publicController.updateRegistrant);
router.post('/ppdb/registrants/:id/documents', publicController.addDocument);
router.post('/ppdb/registrants/:id/submit', publicController.submitRegistrant);
router.get('/ppdb/schedules', publicController.getPpdbSchedules);
router.post('/ppdb/registrants/:id/payment', publicController.initiatePayment);
router.get('/ppdb/registrants/:id/payment-status', publicController.getPaymentStatus);
router.get('/ppdb/registrants/:id/status', publicController.getRegistrantStatus);

// ==========================================
// 3. Konsultasi Publik (Fitur #29 - #30)
// ==========================================
router.post('/consultation/tickets', validate(consultationTicketSchema), publicController.createTicket);
router.get('/consultation/tickets/:id', publicController.getTicketDetail);
router.post('/consultation/bookings', validate(consultationBookingSchema), publicController.createBooking);

// ==========================================
// 4. Publikasi & Artikel (Fitur #31 - #32)
// ==========================================
router.get('/articles', publicController.getArticles);
router.get('/articles/:slug', publicController.getArticleBySlug);
router.post('/articles/:id/comments', validate(articleCommentSchema), publicController.addArticleComment);

module.exports = router;
