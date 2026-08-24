/**
 * Bookings Routes
 * Modul Sarpras: Peminjaman (Facility Bookings, Schedule, Approvals)
 */
const express = require('express');
const router = express.Router();
const bookingsController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get('/bookings/schedule', verifyJwt, requirePermission('sarpras.bookings.view_schedule'), bookingsController.getBookingSchedule);
router.get('/bookings', verifyJwt, bookingsController.listBookings);
router.post('/bookings', verifyJwt, requirePermission('sarpras.bookings.create'), bookingsController.createBooking);
router.get('/bookings/:id', verifyJwt, bookingsController.getBookingById);
router.put('/bookings/:id', verifyJwt, bookingsController.updateBooking);
router.delete('/bookings/:id', verifyJwt, bookingsController.cancelBooking);

// Approvals
router.get('/bookings/:id/approvals', verifyJwt, bookingsController.listBookingApprovals);
router.post('/bookings/:id/approve', verifyJwt, requirePermission('sarpras.bookings.approve'), bookingsController.approveBooking);
router.post('/bookings/:id/reject', verifyJwt, requirePermission('sarpras.bookings.approve'), bookingsController.rejectBooking);

module.exports = router;
