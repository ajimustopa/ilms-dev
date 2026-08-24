const { z } = require('zod');

const createMaintenanceSchema = z.object({
  asset_id: z.number().or(z.string()).optional().nullable(),
  facility_room_id: z.number().or(z.string()).optional().nullable(),
  reported_by: z.number().or(z.string()),
  damage_report: z.string().min(1, 'Deskripsi laporan kerusakan wajib diisi')
}).refine(data => data.asset_id || data.facility_room_id, {
  message: 'Salah satu dari asset_id atau facility_room_id harus disertakan'
});

const updateMaintenanceSchema = z.object({
  repair_status: z.enum(['dilaporkan', 'diproses', 'selesai', 'ditutup']).optional(),
  cost: z.number().or(z.string()).optional().nullable(),
  damage_report: z.string().optional()
});

const closeMaintenanceSchema = z.object({
  cost: z.number().or(z.string()).optional().nullable(),
  notes: z.string().optional().nullable()
});

module.exports = {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  closeMaintenanceSchema
};
