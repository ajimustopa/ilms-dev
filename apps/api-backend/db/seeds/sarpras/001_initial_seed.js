/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Disable FK checks to allow clean truncate/insert
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  await knex('consumable_stock_opname_items').truncate();
  await knex('consumable_stock_opnames').truncate();
  await knex('consumable_stock_mutations').truncate();
  await knex('consumable_items').truncate();
  await knex('procurements').truncate();
  await knex('vendors').truncate();
  await knex('maintenance_requests').truncate();
  await knex('facility_booking_approvals').truncate();
  await knex('facility_bookings').truncate();
  await knex('asset_mutations').truncate();
  await knex('assets').truncate();
  await knex('facility_rooms').truncate();
  await knex('facility_buildings').truncate();
  await knex('facility_sites').truncate();

  // 1. facility_sites (1 lahan)
  await knex('facility_sites').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Lahan Kampus Utama',
      address: 'Jl. Contoh No. 1',
      land_area_m2: 5000.00,
      ownership_status: 'milik_sendiri',
      certificate_number: 'SHM-001/2020',
      notes: 'Kampus pusat Aldepos IBS',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 2. facility_buildings (2 bangunan)
  await knex('facility_buildings').insert([
    {
      id: 1,
      facility_site_id: 1,
      school_unit_id: 1,
      name: 'Gedung A',
      building_function: 'ruang kelas',
      floor_count: 2,
      building_area_m2: 1200.00,
      construction_year: 2020,
      condition: 'baik',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      facility_site_id: 1,
      school_unit_id: 1,
      name: 'Lapangan Olahraga',
      building_function: 'lapangan olahraga',
      floor_count: 0,
      building_area_m2: 800.00,
      construction_year: 2021,
      condition: 'baik',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 3. facility_rooms (4 ruangan)
  await knex('facility_rooms').insert([
    {
      id: 1,
      facility_building_id: 1,
      school_unit_id: 1,
      room_code: 'A101',
      room_name: 'Ruang Kelas 7A',
      room_type: 'ruang_kelas',
      floor_number: 1,
      area_m2: 64.00,
      capacity: 32,
      condition: 'baik',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      facility_building_id: 1,
      school_unit_id: 1,
      room_code: 'A102',
      room_name: 'Ruang Kelas 7B',
      room_type: 'ruang_kelas',
      floor_number: 1,
      area_m2: 64.00,
      capacity: 32,
      condition: 'baik',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      facility_building_id: 1,
      school_unit_id: 1,
      room_code: 'GDG',
      room_name: 'Ruang Guru',
      room_type: 'ruang_guru',
      floor_number: 1,
      area_m2: 96.00,
      capacity: 20,
      condition: 'baik',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      facility_building_id: 2,
      school_unit_id: 1,
      room_code: 'LAP1',
      room_name: 'Lapangan Basket',
      room_type: 'lapangan',
      floor_number: 0,
      area_m2: 420.00,
      capacity: null,
      condition: 'baik',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 4. assets (3 aset)
  await knex('assets').insert([
    {
      id: 1,
      school_unit_id: 1,
      facility_room_id: 1,
      asset_code: 'AST-0001',
      name: 'Meja Siswa',
      category: 'furnitur',
      acquisition_value: 350000.00,
      acquisition_date: '2024-07-01',
      condition: 'baik',
      qr_code: 'QR-AST-0001',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      school_unit_id: 1,
      facility_room_id: 1,
      asset_code: 'AST-0002',
      name: 'Kursi Siswa',
      category: 'furnitur',
      acquisition_value: 250000.00,
      acquisition_date: '2024-07-01',
      condition: 'baik',
      qr_code: 'QR-AST-0002',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      school_unit_id: 1,
      facility_room_id: 3,
      asset_code: 'AST-0003',
      name: 'Proyektor',
      category: 'elektronik',
      acquisition_value: 4500000.00,
      acquisition_date: '2024-01-15',
      condition: 'baik',
      qr_code: 'QR-AST-0003',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 5. vendors (1 vendor)
  await knex('vendors').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'CV Sumber Sarana',
      contact: '021-9998888',
      category: 'furnitur & ATK',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 6. consumable_items (3 item bahan habis pakai)
  await knex('consumable_items').insert([
    {
      id: 1,
      school_unit_id: 1,
      item_code: 'BHP-0001',
      name: 'Kertas A4',
      unit: 'rim',
      category: 'ATK',
      minimum_stock: 5,
      current_stock: 20,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      school_unit_id: 1,
      item_code: 'BHP-0002',
      name: 'Spidol Whiteboard',
      unit: 'buah',
      category: 'ATK',
      minimum_stock: 10,
      current_stock: 30,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      school_unit_id: 1,
      item_code: 'BHP-0003',
      name: 'Sabun Cuci Tangan',
      unit: 'botol',
      category: 'kebersihan',
      minimum_stock: 5,
      current_stock: 8,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
};
