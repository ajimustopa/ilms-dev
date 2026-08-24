const { z } = require('zod');

const createSiteSchema = z.object({
  name: z.string().min(1, 'Nama lahan wajib diisi'),
  address: z.string().optional().nullable(),
  land_area_m2: z.number().or(z.string()).optional().nullable(),
  ownership_status: z.enum(['milik_sendiri', 'sewa', 'pinjam', 'hibah']).optional().nullable(),
  certificate_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

const updateSiteSchema = createSiteSchema.partial();

const createBuildingSchema = z.object({
  facility_site_id: z.number().or(z.string()),
  name: z.string().min(1, 'Nama bangunan wajib diisi'),
  building_function: z.string().optional().nullable(),
  floor_count: z.number().or(z.string()).optional().nullable(),
  building_area_m2: z.number().or(z.string()).optional().nullable(),
  construction_year: z.number().or(z.string()).optional().nullable(),
  condition: z.enum(['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat']).optional().default('baik')
});

const updateBuildingSchema = createBuildingSchema.partial();

const createRoomSchema = z.object({
  facility_building_id: z.number().or(z.string()),
  room_code: z.string().min(1, 'Kode ruangan wajib diisi'),
  room_name: z.string().min(1, 'Nama ruangan wajib diisi'),
  room_type: z.enum([
    'ruang_kelas',
    'laboratorium',
    'perpustakaan',
    'ruang_guru',
    'ruang_kepsek',
    'uks',
    'gudang',
    'toilet',
    'aula',
    'lapangan',
    'kantin',
    'lainnya'
  ]),
  floor_number: z.number().or(z.string()).optional().nullable(),
  area_m2: z.number().or(z.string()).optional().nullable(),
  capacity: z.number().or(z.string()).optional().nullable(),
  condition: z.enum(['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat']).optional().default('baik'),
  is_active: z.boolean().optional().default(true)
});

const updateRoomSchema = createRoomSchema.partial();

module.exports = {
  createSiteSchema,
  updateSiteSchema,
  createBuildingSchema,
  updateBuildingSchema,
  createRoomSchema,
  updateRoomSchema
};
