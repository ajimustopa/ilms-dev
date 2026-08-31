/**
 * Zod Validation Schemas for Website Utama Public Endpoints
 */
const { z } = require('zod');

// 1. Skema Submit / Draft Pendaftar PPDB
const ppdbRegistrantSchema = z.object({
  school_unit_id: z.coerce.number().positive({ message: 'school_unit_id harus berupa angka positif' }),
  school_year: z.string().min(1, { message: 'school_year wajib diisi (mis. 2027/2028)' }),
  registration_path: z.string().min(1, { message: 'registration_path wajib diisi (mis. reguler, prestasi, beasiswa)' }),
  nisn: z.string().optional().nullable(),
  candidate_full_name: z.string().min(2, { message: 'candidate_full_name minimal 2 karakter' }),
  candidate_birth_place: z.string().optional().nullable(),
  candidate_birth_date: z.string().optional().nullable(),
  candidate_gender: z.enum(['L', 'P'], { message: "candidate_gender harus 'L' atau 'P'" }).optional().nullable(),
  candidate_address: z.string().optional().nullable(),
  previous_school_name: z.string().optional().nullable(),
  father_name: z.string().optional().nullable(),
  mother_name: z.string().optional().nullable(),
  parent_contact: z.string().optional().nullable(),
});

// 2. Skema Update Draft Pendaftar PPDB
const ppdbRegistrantUpdateSchema = z.object({
  school_year: z.string().optional(),
  registration_path: z.string().optional(),
  nisn: z.string().optional().nullable(),
  candidate_full_name: z.string().min(2).optional(),
  candidate_birth_place: z.string().optional().nullable(),
  candidate_birth_date: z.string().optional().nullable(),
  candidate_gender: z.enum(['L', 'P']).optional().nullable(),
  candidate_address: z.string().optional().nullable(),
  previous_school_name: z.string().optional().nullable(),
  father_name: z.string().optional().nullable(),
  mother_name: z.string().optional().nullable(),
  parent_contact: z.string().optional().nullable(),
});

// 3. Skema Tiket Konsultasi Publik
const consultationTicketSchema = z.object({
  school_unit_id: z.coerce.number().positive({ message: 'school_unit_id harus berupa angka positif' }),
  name: z.string().min(2, { message: 'name minimal 2 karakter' }),
  contact: z.string().min(5, { message: 'contact (email / no. WhatsApp) minimal 5 karakter' }),
  subject: z.string().min(3, { message: 'subject minimal 3 karakter' }),
  content: z.string().min(5, { message: 'content pertanyaan konsultasi minimal 5 karakter' }),
});

// 4. Skema Komentar Artikel
const articleCommentSchema = z.object({
  commenter_name: z.string().min(2, { message: 'commenter_name minimal 2 karakter' }),
  content: z.string().min(3, { message: 'content komentar minimal 3 karakter' }),
});

// 5. Skema Booking Konsultasi Virtual
const consultationBookingSchema = z.object({
  school_unit_id: z.coerce.number().positive({ message: 'school_unit_id harus berupa angka positif' }),
  name: z.string().min(2, { message: 'name minimal 2 karakter' }),
  contact: z.string().min(5, { message: 'contact minimal 5 karakter' }),
  scheduled_at: z.string().min(1, { message: 'scheduled_at wajib diisi (format timestamp/ISO)' }),
});

// Middleware Factory Helper
function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError || err.name === 'ZodError' || err.errors || err.issues) {
        const issues = err.errors || err.issues || [];
        const formattedErrors = issues.map(e => ({
          field: Array.isArray(e.path) ? e.path.join('.') : 'body',
          message: e.message
        }));
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validasi data gagal. Periksa kembali input Anda.',
          errors: formattedErrors
        });
      }
      next(err);
    }
  };
}

module.exports = {
  ppdbRegistrantSchema,
  ppdbRegistrantUpdateSchema,
  consultationTicketSchema,
  articleCommentSchema,
  consultationBookingSchema,
  validate
};
