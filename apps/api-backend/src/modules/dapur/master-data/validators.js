/**
 * Validators for Dapur Master Data Submodule
 */
const { z } = require('zod');

const createIngredientSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  category_id: z.number().int().positive(),
  base_unit_id: z.number().int().positive(),
  min_stock: z.number().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
  description: z.string().optional().nullable(),
  allergen_ids: z.array(z.number().int().positive()).optional(),
});

const updateIngredientSchema = createIngredientSchema.partial();

const createUnitSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  unit_type: z.enum(['weight', 'volume', 'count']),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

const createUnitConversionSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  from_unit_id: z.number().int().positive(),
  to_unit_id: z.number().int().positive(),
  factor: z.number().positive(),
});

const createSupplierSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  contact_person: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

const createStudentGroupSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  academic_ref_id: z.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(100),
  group_type: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
});

const createOperationalCalendarSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  calendar_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_operational: z.boolean().default(true),
  reason: z.string().max(255).optional().nullable(),
});

const updateSystemParameterSchema = z.object({
  param_key: z.string().min(1).max(150),
  param_value: z.string().optional().nullable(),
  description: z.string().max(255).optional().nullable(),
});

const createMasterDataSchema = z.object({
  satuan_pendidikan_id: z.number().int().positive().nullable().optional(),
  master_type: z.enum([
    'ingredient_category',
    'storage_location',
    'equipment',
    'meal_type',
    'allergen',
    'packaging_type',
    'quality_standard',
    'special_day',
  ]),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  category: z.string().max(100).optional().nullable(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
  description: z.string().optional().nullable(),
});

const updateMasterDataSchema = createMasterDataSchema.partial();

module.exports = {
  createIngredientSchema,
  updateIngredientSchema,
  createUnitSchema,
  createUnitConversionSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createStudentGroupSchema,
  createOperationalCalendarSchema,
  updateSystemParameterSchema,
  createMasterDataSchema,
  updateMasterDataSchema,
};
