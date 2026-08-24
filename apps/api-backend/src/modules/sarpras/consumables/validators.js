const { z } = require('zod');

const createConsumableItemSchema = z.object({
  item_code: z.string().min(1, 'Kode barang wajib diisi'),
  name: z.string().min(1, 'Nama barang wajib diisi'),
  unit: z.string().min(1, 'Satuan barang wajib diisi'),
  category: z.string().optional().nullable(),
  minimum_stock: z.number().or(z.string()).optional().default(0),
  current_stock: z.number().or(z.string()).optional().default(0)
});

const updateConsumableItemSchema = createConsumableItemSchema.partial();

const stockMutationSchema = z.object({
  quantity: z.number().or(z.string()).refine(val => Number(val) > 0, {
    message: 'Jumlah quantity harus lebih besar dari 0'
  }),
  reference_type: z.enum(['procurement', 'usage', 'adjustment', 'opname']).optional().nullable(),
  reference_id: z.number().or(z.string()).optional().nullable(),
  facility_room_id: z.number().or(z.string()).optional().nullable(),
  notes: z.string().optional().nullable()
});

const createOpnameSchema = z.object({
  opname_date: z.string().min(1, 'Tanggal opname wajib diisi'),
  notes: z.string().optional().nullable()
});

const updateOpnameItemsSchema = z.object({
  items: z.array(
    z.object({
      consumable_item_id: z.number().or(z.string()),
      physical_stock: z.number().or(z.string()),
      notes: z.string().optional().nullable()
    })
  ).min(1, 'Daftar item opname wajib diisi')
});

module.exports = {
  createConsumableItemSchema,
  updateConsumableItemSchema,
  stockMutationSchema,
  createOpnameSchema,
  updateOpnameItemsSchema
};
