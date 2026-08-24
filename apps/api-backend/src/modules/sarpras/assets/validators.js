const { z } = require('zod');

const createAssetSchema = z.object({
  facility_room_id: z.number().or(z.string()).optional().nullable(),
  asset_code: z.string().min(1, 'Kode aset wajib diisi'),
  name: z.string().min(1, 'Nama aset wajib diisi'),
  category: z.string().optional().nullable(),
  acquisition_value: z.number().or(z.string()).optional().nullable(),
  acquisition_date: z.string().optional().nullable(),
  condition: z.enum(['baik', 'rusak_ringan', 'rusak_berat']).optional().default('baik'),
  qr_code: z.string().optional().nullable(),
  status: z.enum(['active', 'disposed']).optional().default('active')
});

const updateAssetSchema = createAssetSchema.partial();

const mutateAssetSchema = z.object({
  to_room_id: z.number().or(z.string()),
  reason: z.string().optional().nullable()
});

const scanAssetSchema = z.object({
  qr_code: z.string().optional().nullable(),
  asset_code: z.string().optional().nullable()
}).refine(data => data.qr_code || data.asset_code, {
  message: 'Salah satu dari qr_code atau asset_code harus disertakan'
});

module.exports = {
  createAssetSchema,
  updateAssetSchema,
  mutateAssetSchema,
  scanAssetSchema
};
