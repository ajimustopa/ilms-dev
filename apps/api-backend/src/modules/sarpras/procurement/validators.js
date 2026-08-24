const { z } = require('zod');

const createVendorSchema = z.object({
  name: z.string().min(1, 'Nama vendor wajib diisi'),
  contact: z.string().optional().nullable(),
  category: z.string().optional().nullable()
});

const updateVendorSchema = createVendorSchema.partial();

const createProcurementSchema = z.object({
  vendor_id: z.number().or(z.string()).optional().nullable(),
  item_name: z.string().min(1, 'Nama barang wajib diisi'),
  quantity: z.number().or(z.string()),
  unit: z.string().optional().nullable(),
  finance_reference_id: z.number().or(z.string()).optional().nullable()
});

const updateFinanceReferenceSchema = z.object({
  finance_reference_id: z.number().or(z.string()).refine(val => val !== undefined && val !== null, {
    message: 'finance_reference_id wajib diisi'
  })
});

module.exports = {
  createVendorSchema,
  updateVendorSchema,
  createProcurementSchema,
  updateFinanceReferenceSchema
};
