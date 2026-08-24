const { z } = require('zod');

const createBookingSchema = z.object({
  facility_room_id: z.number().or(z.string()).optional().nullable(),
  other_facility_name: z.string().optional().nullable(),
  employee_id: z.number().or(z.string()),
  purpose: z.string().min(1, 'Tujuan peminjaman wajib diisi'),
  booking_date: z.string().min(1, 'Tanggal peminjaman wajib diisi'),
  start_time: z.string().min(1, 'Waktu mulai wajib diisi'),
  end_time: z.string().min(1, 'Waktu selesai wajib diisi')
}).refine(data => data.facility_room_id || data.other_facility_name, {
  message: 'Salah satu dari ruangan atau nama fasilitas lainnya harus diisi'
});

const updateBookingSchema = z.object({
  facility_room_id: z.number().or(z.string()).optional().nullable(),
  other_facility_name: z.string().optional().nullable(),
  purpose: z.string().optional(),
  booking_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional()
});

const approveRejectSchema = z.object({
  notes: z.string().optional().nullable()
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  approveRejectSchema
};
