/**
 * Validators for Perpustakaan Circulation Submodule
 */
const { z } = require('zod');

const createLoanSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().optional(),
  book_copy_id: z.number().int().positive('ID Eksemplar buku (book_copy_id) wajib diisi'),
  member_id: z.number().int().positive('ID Anggota perpustakaan (member_id) wajib diisi'),
  due_at: z.string().optional(), // ISO date string or default 7 days from now
});

const returnLoanSchema = z.object({
  fine_amount: z.number().min(0).optional(),
});

const payFineSchema = z.object({
  payment_note: z.string().max(255).optional().nullable(),
});

const createReservationSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().optional(),
  book_id: z.number().int().positive('ID Judul Buku (book_id) wajib diisi'),
  member_id: z.number().int().positive('ID Anggota perpustakaan (member_id) wajib diisi'),
});

const createLostDamagedReportSchema = z.object({
  book_copy_id: z.number().int().positive('ID Eksemplar buku (book_copy_id) wajib diisi'),
  loan_id: z.number().int().positive().optional().nullable(),
  condition_status: z.enum(['lost', 'damaged']),
  description: z.string().optional().nullable(),
  replacement_fee: z.number().min(0).optional().nullable(),
});

const resolveLostDamagedSchema = z.object({
  fee_payment_status: z.enum(['paid', 'waived']).default('paid').optional(),
  resolution_notes: z.string().optional().nullable(),
});

module.exports = {
  createLoanSchema,
  returnLoanSchema,
  payFineSchema,
  createReservationSchema,
  createLostDamagedReportSchema,
  resolveLostDamagedSchema,
};
