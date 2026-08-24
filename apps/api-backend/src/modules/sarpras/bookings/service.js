/**
 * Bookings Service Implementation
 * Modul Sarpras: Peminjaman (Facility Bookings, Schedule, Approvals)
 */
const db = require('../../../config/db/sarpras');
const { validateEmployee, validateUser } = require('../utils/crossModuleHelper');

class BookingsService {
  async listBookings(schoolUnitId, user, query = {}) {
    let q = db('facility_bookings')
      .leftJoin('facility_rooms', 'facility_bookings.facility_room_id', 'facility_rooms.id')
      .where('facility_bookings.school_unit_id', schoolUnitId)
      .select(
        'facility_bookings.*',
        'facility_rooms.room_code',
        'facility_rooms.room_name'
      );

    // Jika pegawai biasa (bukan admin_sarpras atau super_admin), filter by employee_id miliknya
    const isSpecialAdmin = user.account_type === 'admin' || user.role_name === 'super_admin' || user.role_name === 'admin_sarpras';
    if (!isSpecialAdmin && user.ref_type === 'employee' && user.ref_id) {
      q = q.where('facility_bookings.employee_id', user.ref_id);
    } else if (query.employee_id) {
      q = q.where('facility_bookings.employee_id', query.employee_id);
    }

    if (query.status) {
      q = q.where('facility_bookings.status', query.status);
    }
    if (query.date) {
      q = q.where('facility_bookings.booking_date', query.date);
    }
    if (query.room_id) {
      q = q.where('facility_bookings.facility_room_id', query.room_id);
    }

    return q.orderBy('facility_bookings.id', 'desc');
  }

  async getBookingById(schoolUnitId, id) {
    const booking = await db('facility_bookings')
      .leftJoin('facility_rooms', 'facility_bookings.facility_room_id', 'facility_rooms.id')
      .leftJoin('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .where('facility_bookings.id', id)
      .where('facility_bookings.school_unit_id', schoolUnitId)
      .select(
        'facility_bookings.*',
        'facility_rooms.room_code',
        'facility_rooms.room_name',
        'facility_buildings.name as building_name'
      )
      .first();

    if (!booking) {
      const err = new Error('Pengajuan peminjaman tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const approvals = await db('facility_booking_approvals')
      .where({ facility_booking_id: id })
      .orderBy('approval_level', 'asc');

    return { ...booking, approvals };
  }

  async createBooking(schoolUnitId, payload) {
    // Validasi pegawai di Kepegawaian
    await validateEmployee(payload.employee_id);

    // Cek tabrakan jadwal jika facility_room_id diisi
    if (payload.facility_room_id) {
      const conflict = await db('facility_bookings')
        .where({
          school_unit_id: schoolUnitId,
          facility_room_id: payload.facility_room_id,
          booking_date: payload.booking_date
        })
        .whereIn('status', ['pending', 'approved'])
        .where((builder) => {
          builder
            .whereBetween('start_time', [payload.start_time, payload.end_time])
            .orWhereBetween('end_time', [payload.start_time, payload.end_time])
            .orWhere((b2) => {
              b2.where('start_time', '<=', payload.start_time).andWhere('end_time', '>=', payload.end_time);
            });
        })
        .first();

      if (conflict) {
        const err = new Error('Fasilitas/ruangan sudah dipesan pada waktu tersebut');
        err.statusCode = 409;
        throw err;
      }
    }

    const [id] = await db('facility_bookings').insert({
      school_unit_id: schoolUnitId,
      facility_room_id: payload.facility_room_id || null,
      other_facility_name: payload.other_facility_name || null,
      employee_id: payload.employee_id,
      purpose: payload.purpose,
      booking_date: payload.booking_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.getBookingById(schoolUnitId, id);
  }

  async updateBooking(schoolUnitId, id, payload) {
    const booking = await this.getBookingById(schoolUnitId, id);
    if (booking.status !== 'pending') {
      const err = new Error('Pengajuan peminjaman hanya dapat diubah selama berstatus pending');
      err.statusCode = 400;
      throw err;
    }

    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;
    delete updateData.employee_id;
    delete updateData.status;

    await db('facility_bookings').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getBookingById(schoolUnitId, id);
  }

  async cancelBooking(schoolUnitId, id) {
    const booking = await this.getBookingById(schoolUnitId, id);
    if (booking.status === 'cancelled') {
      const err = new Error('Pengajuan peminjaman sudah dibatalkan');
      err.statusCode = 400;
      throw err;
    }

    await db('facility_bookings').where({ id, school_unit_id: schoolUnitId }).update({
      status: 'cancelled',
      updated_at: new Date()
    });
    return { message: 'Pengajuan peminjaman berhasil dibatalkan' };
  }

  async getBookingSchedule(schoolUnitId, query = {}) {
    let q = db('facility_bookings')
      .leftJoin('facility_rooms', 'facility_bookings.facility_room_id', 'facility_rooms.id')
      .where('facility_bookings.school_unit_id', schoolUnitId)
      .whereIn('facility_bookings.status', ['pending', 'approved']);

    if (query.room_id) {
      q = q.where('facility_bookings.facility_room_id', query.room_id);
    }
    if (query.date) {
      q = q.where('facility_bookings.booking_date', query.date);
    }

    return q.select(
      'facility_bookings.id',
      'facility_bookings.facility_room_id',
      'facility_rooms.room_name',
      'facility_bookings.other_facility_name',
      'facility_bookings.employee_id',
      'facility_bookings.purpose',
      'facility_bookings.booking_date',
      'facility_bookings.start_time',
      'facility_bookings.end_time',
      'facility_bookings.status'
    ).orderBy('facility_bookings.start_time', 'asc');
  }

  async listBookingApprovals(schoolUnitId, id) {
    await this.getBookingById(schoolUnitId, id);
    return db('facility_booking_approvals')
      .where({ facility_booking_id: id })
      .orderBy('approval_level', 'asc');
  }

  async approveBooking(schoolUnitId, id, payload, approverUserId) {
    const booking = await this.getBookingById(schoolUnitId, id);
    if (booking.status !== 'pending') {
      const err = new Error(`Pengajuan peminjaman tidak dapat disetujui karena berstatus ${booking.status}`);
      err.statusCode = 400;
      throw err;
    }

    await validateUser(approverUserId);

    return db.transaction(async (trx) => {
      // 1. Tambahkan baris approval
      await trx('facility_booking_approvals').insert({
        facility_booking_id: id,
        approver_user_id: approverUserId,
        approval_level: (booking.approvals?.length || 0) + 1,
        status: 'approved',
        notes: payload.notes || null,
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });

      // 2. Update status pengajuan jadi approved
      await trx('facility_bookings').where({ id, school_unit_id: schoolUnitId }).update({
        status: 'approved',
        updated_at: new Date()
      });

      const updated = await trx('facility_bookings').where({ id }).first();
      return { booking: updated, message: 'Peminjaman fasilitas berhasil disetujui' };
    });
  }

  async rejectBooking(schoolUnitId, id, payload, approverUserId) {
    const booking = await this.getBookingById(schoolUnitId, id);
    if (booking.status !== 'pending') {
      const err = new Error(`Pengajuan peminjaman tidak dapat ditolak karena berstatus ${booking.status}`);
      err.statusCode = 400;
      throw err;
    }

    await validateUser(approverUserId);

    return db.transaction(async (trx) => {
      await trx('facility_booking_approvals').insert({
        facility_booking_id: id,
        approver_user_id: approverUserId,
        approval_level: (booking.approvals?.length || 0) + 1,
        status: 'rejected',
        notes: payload.notes || null,
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx('facility_bookings').where({ id, school_unit_id: schoolUnitId }).update({
        status: 'rejected',
        updated_at: new Date()
      });

      const updated = await trx('facility_bookings').where({ id }).first();
      return { booking: updated, message: 'Pengajuan peminjaman fasilitas telah ditolak' };
    });
  }
}

module.exports = new BookingsService();
