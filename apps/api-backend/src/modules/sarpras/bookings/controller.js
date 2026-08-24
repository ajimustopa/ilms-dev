/**
 * Bookings Controller Implementation
 */
const bookingsService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createBookingSchema,
  updateBookingSchema,
  approveRejectSchema
} = require('./validators');

class BookingsController {
  async listBookings(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await bookingsService.listBookings(schoolUnitId, req.user, req.query);
      res.json({ success: true, data, message: 'Daftar pengajuan peminjaman berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await bookingsService.getBookingById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail pengajuan peminjaman berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createBooking(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createBookingSchema.parse(req.body);
      const data = await bookingsService.createBooking(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Pengajuan peminjaman fasilitas berhasil dikirim', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateBooking(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateBookingSchema.parse(req.body);
      const data = await bookingsService.updateBooking(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Pengajuan peminjaman berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await bookingsService.cancelBooking(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBookingSchedule(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await bookingsService.getBookingSchedule(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Jadwal pemakaian fasilitas berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listBookingApprovals(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await bookingsService.listBookingApprovals(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Riwayat approval peminjaman berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveBooking(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = approveRejectSchema.parse(req.body || {});
      const userId = req.user.id;
      const data = await bookingsService.approveBooking(schoolUnitId, req.params.id, parsed, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async rejectBooking(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = approveRejectSchema.parse(req.body || {});
      const userId = req.user.id;
      const data = await bookingsService.rejectBooking(schoolUnitId, req.params.id, parsed, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookingsController();
