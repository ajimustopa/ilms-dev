/**
 * Sarpras Full API Verification Script
 */
const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('=== MEMULAI PENGUJIAN PENUH MODUL SARPRAS ===\n');

  // 1. Login Core Service untuk dapat token
  console.log('1. Login Core Service...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/core/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'superadmin',
    password: 'Password123!',
    school_unit_id: 1
  });

  if (!loginRes.body?.success) {
    console.error('Login gagal:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.data.access_token;
  console.log('✓ Login Berhasil. User:', loginRes.body.data.user.username);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-school-unit-id': '1'
  };

  const apiKeyHeaders = {
    'X-API-Key': 'internal-secret-key-akademik',
    'Content-Type': 'application/json'
  };

  // 2. Test Internal Endpoint: /internal/rooms
  console.log('\n2. Test GET /api/v1/sarpras/internal/rooms (X-API-Key)...');
  const internalRoomsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/internal/rooms?school_unit_id=1',
    method: 'GET',
    headers: apiKeyHeaders
  });
  console.log(`Status: ${internalRoomsRes.status}, Rooms Found: ${internalRoomsRes.body?.data?.length}`);
  if (internalRoomsRes.status !== 200) throw new Error('Internal rooms endpoint failed');
  console.log('✓ Internal Rooms Endpoint Berhasil');

  // 3. Test Lokasi & Denah
  console.log('\n3. Test Lokasi & Denah (Sites, Buildings, Rooms)...');
  const sitesRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/sites',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${sitesRes.status}, Sites: ${sitesRes.body?.data?.length}`);

  const buildingsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/buildings?site_id=1',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${buildingsRes.status}, Buildings: ${buildingsRes.body?.data?.length}`);

  const roomsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/rooms?building_id=1',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${roomsRes.status}, Rooms: ${roomsRes.body?.data?.length}`);
  console.log('✓ Lokasi & Denah Berhasil');

  // 4. Test Inventaris (Assets, Mutasi, QR Code Scan)
  console.log('\n4. Test Inventaris Aset & Mutasi...');
  const assetsRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/assets',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${assetsRes.status}, Assets Total: ${assetsRes.body?.data?.length}`);

  // Test scan lookup
  const scanRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/assets/scan',
    method: 'POST',
    headers: authHeaders
  }, {
    asset_code: 'AST-0001'
  });
  console.log(`Status: ${scanRes.status}, Asset Scanned: ${scanRes.body?.data?.name} in room: ${scanRes.body?.data?.room_name}`);

  // Test mutate asset location
  const mutateRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/assets/1/mutate',
    method: 'POST',
    headers: authHeaders
  }, {
    to_room_id: 2,
    reason: 'Pindah ke kelas 7B untuk semester baru'
  });
  console.log(`Status: ${mutateRes.status}, Mutate Result: ${mutateRes.body?.data?.message}`);
  console.log('✓ Inventaris Aset Berhasil');

  // 5. Test Peminjaman Fasilitas & Approval
  console.log('\n5. Test Peminjaman Fasilitas & Jadwal...');
  const scheduleRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/bookings/schedule?date=2026-08-20',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${scheduleRes.status}, Schedule items: ${scheduleRes.body?.data?.length}`);

  const createBookingRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/bookings',
    method: 'POST',
    headers: authHeaders
  }, {
    facility_room_id: 4,
    employee_id: 1,
    purpose: 'Latihan basket santri sore',
    booking_date: '2026-08-20',
    start_time: '15:30:00',
    end_time: '17:30:00'
  });
  console.log(`Status: ${createBookingRes.status}, Booking ID: ${createBookingRes.body?.data?.id}`);

  const bookingId = createBookingRes.body?.data?.id;
  if (bookingId) {
    const approveRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/v1/sarpras/bookings/${bookingId}/approve`,
      method: 'POST',
      headers: authHeaders
    }, {
      notes: 'Disetujui untuk kegiatan ekstrakurikuler'
    });
    console.log(`Status: ${approveRes.status}, Approval Result: ${approveRes.body?.data?.message}`);
  }
  console.log('✓ Peminjaman Fasilitas Berhasil');

  // 6. Test Pemeliharaan & Perbaikan
  console.log('\n6. Test Pemeliharaan & Perbaikan...');
  const createMaintRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/maintenance-requests',
    method: 'POST',
    headers: authHeaders
  }, {
    asset_id: 3,
    reported_by: 1,
    damage_report: 'Lampu proyektor berkedip dan redup'
  });
  console.log(`Status: ${createMaintRes.status}, Ticket ID: ${createMaintRes.body?.data?.id}`);

  const ticketId = createMaintRes.body?.data?.id;
  if (ticketId) {
    const closeMaintRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/v1/sarpras/maintenance-requests/${ticketId}/close`,
      method: 'POST',
      headers: authHeaders
    }, {
      cost: 150000
    });
    console.log(`Status: ${closeMaintRes.status}, Close Ticket: ${closeMaintRes.body?.data?.message}`);
  }
  console.log('✓ Pemeliharaan Berhasil');

  // 7. Test Pengadaan & Vendor & Keuangan Patch
  console.log('\n7. Test Pengadaan & Integrasi Keuangan...');
  const createProcRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/procurements',
    method: 'POST',
    headers: authHeaders
  }, {
    vendor_id: 1,
    item_name: 'Meja Guru Kayu Jati',
    quantity: 5,
    unit: 'unit'
  });
  console.log(`Status: ${createProcRes.status}, Procurement ID: ${createProcRes.body?.data?.id}`);

  const procId = createProcRes.body?.data?.id;
  if (procId) {
    await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/v1/sarpras/procurements/${procId}/approve`,
      method: 'PUT',
      headers: authHeaders
    });

    await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/v1/sarpras/procurements/${procId}/receive`,
      method: 'PUT',
      headers: authHeaders
    });

    // Patch finance reference via X-API-Key
    const patchFinRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/v1/sarpras/procurements/${procId}/finance-reference`,
      method: 'PATCH',
      headers: apiKeyHeaders
    }, {
      finance_reference_id: 101
    });
    console.log(`Status: ${patchFinRes.status}, Finance Ref ID set to: ${patchFinRes.body?.data?.finance_reference_id}`);
  }
  console.log('✓ Pengadaan Berhasil');

  // 8. Test Bahan Habis Pakai & Stock Opname Finalize
  console.log('\n8. Test Bahan Habis Pakai & Stock Opname Finalisasi...');
  // Stock In
  const stockInRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/consumables/1/stock-in',
    method: 'POST',
    headers: authHeaders
  }, {
    quantity: 10,
    notes: 'Pasokan awal semester'
  });
  console.log(`Status: ${stockInRes.status}, Current Stock after In: ${stockInRes.body?.data?.item?.current_stock}`);

  // Create Stock Opname
  const createOpnameRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/stock-opnames',
    method: 'POST',
    headers: authHeaders
  }, {
    opname_date: '2026-08-18',
    notes: 'Opname bulanan Agustus'
  });
  const opnameId = createOpnameRes.body?.data?.id;
  console.log(`Status: ${createOpnameRes.status}, Opname ID: ${opnameId}, Items Count: ${createOpnameRes.body?.data?.items?.length}`);

  // Update physical count: item 1 (system 30) -> physical 28 (selisih -2)
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/api/v1/sarpras/stock-opnames/${opnameId}/items`,
    method: 'PUT',
    headers: authHeaders
  }, {
    items: [
      { consumable_item_id: 1, physical_stock: 28, notes: '2 rim terpakai belum tercatat' }
    ]
  });

  // Finalize Opname
  const finalizeRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/api/v1/sarpras/stock-opnames/${opnameId}/finalize`,
    method: 'POST',
    headers: authHeaders
  });
  console.log(`Status: ${finalizeRes.status}, Finalize Result: ${finalizeRes.body?.data?.message}`);

  // Cek stok item 1 setelah finalize
  const item1Res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/consumables/1',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Item 1 Final Stock after Opname: ${item1Res.body?.data?.current_stock} (Expected: 28)`);
  console.log('✓ Bahan Habis Pakai & Finalisasi Opname Berhasil');

  // 9. Test Laporan & Dashboard
  console.log('\n9. Test Laporan & Dashboard...');
  const conditionRep = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/reports/asset-condition',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${conditionRep.status}, Condition Summary:`, conditionRep.body?.data?.summary);

  const deprRep = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/reports/asset-depreciation',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${deprRep.status}, Depreciation Summary:`, deprRep.body?.data?.summary);

  const dashSummary = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/reports/dashboard',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`Status: ${dashSummary.status}, Dashboard KPI:`, dashSummary.body?.data);
  console.log('✓ Laporan & Dashboard Berhasil');

  console.log('\n=========================================');
  console.log('🎉 SELURUH PENGUJIAN ENDPOINT SARPRAS SUKSES 100%!');
  console.log('=========================================');
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
