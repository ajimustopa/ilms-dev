/**
 * Initial Seed Data for Kantin Module
 * Sesuai erd-kantin.md §4
 */
exports.seed = async function(knex) {
  // Truncate / clean tables in reverse dependency order
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex('canteen_webhook_events').truncate();
  await knex('canteen_activity_logs').truncate();
  await knex('operational_expenses').truncate();
  await knex('vendor_fee_payments').truncate();
  await knex('canteen_fee_payments').truncate();
  await knex('wallet_transactions').truncate();
  await knex('sales_transaction_items').truncate();
  await knex('sales_transactions').truncate();
  await knex('daily_spending_limits').truncate();
  await knex('canteen_students').truncate();
  await knex('product_returns').truncate();
  await knex('goods_receipt_items').truncate();
  await knex('goods_receipts').truncate();
  await knex('vendor_products').truncate();
  await knex('product_categories').truncate();
  await knex('vendors').truncate();
  await knex('role_menu_access').truncate();
  await knex('access_menus').truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  // 1. Access Menus
  const menus = [
    { id: 1, menu_key: 'produk.vendor', menu_name: 'Manajemen Vendor', description: 'Kelola data vendor titipan/supplier' },
    { id: 2, menu_key: 'produk.kategori', menu_name: 'Kategori Produk', description: 'Kelola kelompok jenis produk makanan/minuman' },
    { id: 3, menu_key: 'produk.daftar', menu_name: 'Daftar Produk Vendor', description: 'Kelola produk, barcode, dan stok minimal' },
    { id: 4, menu_key: 'produk.penerimaan', menu_name: 'Penerimaan Barang', description: 'Pencatatan barang masuk titipan/belanja sendiri' },
    { id: 5, menu_key: 'penjualan.transaksi', menu_name: 'Transaksi Penjualan', description: 'Kasir POS cashless dan tunai' },
    { id: 6, menu_key: 'keuangan.top_up', menu_name: 'Top Up / Tarik Tunai', description: 'Kelola saldo dompet santri' },
    { id: 7, menu_key: 'keuangan.hak_kantin', menu_name: 'Piutang & Hak Kantin', description: 'Pencairan bagi hasil hak kantin' },
    { id: 8, menu_key: 'keuangan.hak_vendor', menu_name: 'Hak Vendor', description: 'Penyelesaian hak pendapatan vendor titipan' },
    { id: 9, menu_key: 'laporan.produk', menu_name: 'Laporan Produk & Penjualan', description: 'Laporan operasional dan rekap transaksi' },
    { id: 10, menu_key: 'dashboard.utama', menu_name: 'Dashboard Kantin', description: 'Ringkasan KPI operasional kantin' }
  ];
  await knex('access_menus').insert(menus);

  // 2. Role Menu Access (Default Active untuk kasir, kepala_kantin, superadmin)
  const roleAccessList = [];
  const roles = ['superadmin', 'admin', 'kepala_kantin', 'bendahara_kantin', 'kasir'];
  roles.forEach(role => {
    menus.forEach(menu => {
      // Kasir hanya akses menu kasir & produk tertentu, role lain akses semua
      const isActive = role === 'kasir' 
        ? ['produk.daftar', 'penjualan.transaksi', 'keuangan.top_up', 'dashboard.utama'].includes(menu.menu_key)
        : true;
      roleAccessList.push({
        role_name: role,
        access_menu_id: menu.id,
        is_active: isActive
      });
    });
  });
  await knex('role_menu_access').insert(roleAccessList);

  // 3. Vendors
  const [vendorId] = await knex('vendors').insert({
    id: 1,
    school_unit_id: 1,
    vendor_name: 'Vendor Snack Sehat Barokah',
    contact: '0812-0000-0001',
    address: 'Jl. Raya Bogor KM 30 No. 12',
    status: 'active'
  });

  // 4. Product Categories
  await knex('product_categories').insert([
    { id: 1, school_unit_id: 1, category_name: 'Minuman', description: 'Aneka minuman segar & air mineral', status: 'active' },
    { id: 2, school_unit_id: 1, category_name: 'Makanan Ringan', description: 'Snack, roti, kue tradisional', status: 'active' },
    { id: 3, school_unit_id: 1, category_name: 'Makanan Berat', description: 'Nasi kotak, mie, lauk pauk', status: 'active' }
  ]);

  // 5. Vendor Products
  await knex('vendor_products').insert([
    {
      id: 1,
      school_unit_id: 1,
      barcode: '8991234500001',
      product_name: 'Air Mineral Santri 600ml',
      product_category_id: 1,
      vendor_id: 1,
      unit: 'botol',
      min_stock: 10,
      current_stock: 50,
      status: 'active'
    },
    {
      id: 2,
      school_unit_id: 1,
      barcode: '8991234500002',
      product_name: 'Roti Gandum Manis',
      product_category_id: 2,
      vendor_id: 1,
      unit: 'bungkus',
      min_stock: 5,
      current_stock: 30,
      status: 'active'
    }
  ]);

  // 6. Canteen Students (Merujuk student_id: 1 dari database akademik_local)
  await knex('canteen_students').insert([
    {
      id: 1,
      school_unit_id: 1,
      student_id: 1,
      cached_student_name: 'Muhammad Rizky',
      cached_class_group_name: '1-A',
      qr_code: 'QR-CANTIN-STU-001',
      wallet_balance: 25000.00,
      status: 'active'
    }
  ]);

  // 7. Daily Spending Limits
  await knex('daily_spending_limits').insert([
    {
      id: 1,
      school_unit_id: 1,
      limit_name: 'Limit Standar Harian Santri',
      limit_amount: 20000.00,
      valid_from: '2026-08-18',
      note: 'Maksimal belanja jajan per hari',
      status: 'active'
    }
  ]);

  console.log('✅ Seed data kantin berhasil ditambahkan!');
};
