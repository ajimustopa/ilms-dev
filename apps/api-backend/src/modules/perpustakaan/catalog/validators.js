/**
 * Validators for Perpustakaan Catalog Submodule
 */
const { z } = require('zod');

const createCategorySchema = z.object({
  category_name: z.string().min(1, 'Nama kategori wajib diisi').max(150),
  category_code: z.string().max(30).optional().nullable(),
  description: z.string().optional().nullable(),
});

const updateCategorySchema = createCategorySchema.partial();

const createBookSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().optional(),
  material_type: z.enum(['book', 'journal', 'ebook', 'magazine', 'cd', 'other']).default('book').optional(),
  title: z.string().min(1, 'Judul koleksi wajib diisi').max(255),
  author: z.string().max(255).optional().nullable(),
  publisher: z.string().max(150).optional().nullable(),
  publish_year: z.number().int().min(1000).max(3000).optional().nullable(),
  isbn: z.string().max(30).optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  shelf_location: z.string().max(50).optional().nullable(),
  cover_image_url: z.string().max(255).optional().nullable(),
  total_copies: z.number().int().min(0).default(0).optional(),
  source_type: z.enum(['purchase', 'donation', 'other']).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

const updateBookSchema = createBookSchema.partial();

const createBookCopySchema = z.object({
  copy_code: z.string().max(50).optional().nullable(),
  condition_status: z.enum(['good', 'damaged', 'lost']).default('good').optional(),
  circulation_status: z.enum(['available', 'borrowed', 'reserved', 'under_repair']).default('available').optional(),
  shelf_location: z.string().max(50).optional().nullable(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createBookSchema,
  updateBookSchema,
  createBookCopySchema,
};
