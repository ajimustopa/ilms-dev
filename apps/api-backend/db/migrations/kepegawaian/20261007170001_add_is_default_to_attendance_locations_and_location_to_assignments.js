/**
 * Migration: add_is_default_to_attendance_locations_and_location_to_assignments
 * Modul Kepegawaian - Fitur: Penetapan Titik Lokasi GPS Default Unit & Kustom Lokasi GPS per Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tambah kolom is_default pada tabel attendance_locations
  const hasLocationsTable = await knex.schema.hasTable('attendance_locations');
  if (hasLocationsTable) {
    const hasIsDefault = await knex.schema.hasColumn('attendance_locations', 'is_default');
    if (!hasIsDefault) {
      await knex.schema.alterTable('attendance_locations', (table) => {
        table.boolean('is_default').notNullable().defaultTo(false).index('idx_att_loc_is_default').after('notes')
          .comment('Penanda titik lokasi GPS default utama untuk satuan pendidikan ini');
      });
    }
  }

  // 2. Tambah kolom konfigurasi lokasi pada employee_work_schedule_assignments
  const hasAssignmentsTable = await knex.schema.hasTable('employee_work_schedule_assignments');
  if (hasAssignmentsTable) {
    const hasLocationType = await knex.schema.hasColumn('employee_work_schedule_assignments', 'location_assignment_type');
    if (!hasLocationType) {
      await knex.schema.alterTable('employee_work_schedule_assignments', (table) => {
        table.string('location_assignment_type', 50).notNullable().defaultTo('all_locations').index('idx_ewsa_loc_type').after('flexible_target_hours')
          .comment('Mode lokasi presensi pegawai: all_locations | default_only | custom_locations');
      });
    }

    const hasAllowedLocations = await knex.schema.hasColumn('employee_work_schedule_assignments', 'allowed_location_ids');
    if (!hasAllowedLocations) {
      await knex.schema.alterTable('employee_work_schedule_assignments', (table) => {
        table.json('allowed_location_ids').nullable().after('location_assignment_type')
          .comment('Daftar ID attendance_locations yang diizinkan untuk pegawai ini jika tipe custom_locations');
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasAssignmentsTable = await knex.schema.hasTable('employee_work_schedule_assignments');
  if (hasAssignmentsTable) {
    const hasAllowedLocations = await knex.schema.hasColumn('employee_work_schedule_assignments', 'allowed_location_ids');
    if (hasAllowedLocations) {
      await knex.schema.alterTable('employee_work_schedule_assignments', (table) => {
        table.dropColumn('allowed_location_ids');
      });
    }

    const hasLocationType = await knex.schema.hasColumn('employee_work_schedule_assignments', 'location_assignment_type');
    if (hasLocationType) {
      await knex.schema.alterTable('employee_work_schedule_assignments', (table) => {
        table.dropColumn('location_assignment_type');
      });
    }
  }

  const hasLocationsTable = await knex.schema.hasTable('attendance_locations');
  if (hasLocationsTable) {
    const hasIsDefault = await knex.schema.hasColumn('attendance_locations', 'is_default');
    if (hasIsDefault) {
      await knex.schema.alterTable('attendance_locations', (table) => {
        table.dropColumn('is_default');
      });
    }
  }
};
