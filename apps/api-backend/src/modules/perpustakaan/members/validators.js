/**
 * Validators for Perpustakaan Members Submodule
 */
const { z } = require('zod');

const registerMemberSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().optional(),
  ref_type: z.enum(['student', 'employee']),
  ref_id: z.number().int().positive('ID Referensi (ref_id) wajib berupa bilangan bulat positif'),
  member_card_number: z.string().max(50).optional().nullable(),
  card_valid_until: z.string().optional().nullable(),
  max_loan_limit: z.number().int().min(1).default(3).optional(),
});

const updateMemberStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

module.exports = {
  registerMemberSchema,
  updateMemberStatusSchema,
};
