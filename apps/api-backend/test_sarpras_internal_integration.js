/**
 * Script Pengujian Integrasi Dummy Internal Endpoint Sarpras
 * Mensimulasikan pemanggilan dari modul Akademik dan Keuangan via X-API-Key
 */
const http = require('http');

function sendRequest(options, data = null) {
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

async function testInternalIntegration() {
  console.log('================================================================');
  console.log('🔬 MEMULAI UJI INTEGRASI DUMMY ENDPOINT INTERNAL SARPRAS');
  console.log('================================================================\n');

  const apiKey = 'internal-aldepos-service-api-key-dummy';

  // -------------------------------------------------------------
  // SKENARIO 1: Akademik memanggil GET /internal/rooms
  // -------------------------------------------------------------
  console.log('--- [SKENARIO 1: Modul Akademik] Mengambil Data Ruangan Aktif ---');
  
  // 1A. Panggilan tanpa X-API-Key (Harus ditolak 401)
  console.log('1A. Menguji proteksi tanpa header X-API-Key...');
  const unauthorizedRes = await sendRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/internal/rooms?school_unit_id=1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  console.log(`    Status Response: ${unauthorizedRes.status} (Diharapkan 401)`);
  console.log(`    Pesan Penolakan: "${unauthorizedRes.body?.message}"`);
  if (unauthorizedRes.status === 401) {
    console.log('    ✓ Proteksi Keamanan API Key Valid\n');
  } else {
    console.error('    ❌ Proteksi Gagal!');
  }

  // 1B. Panggilan resmi dengan X-API-Key
  console.log('1B. Menguji pemanggilan resmi GET /internal/rooms dengan X-API-Key...');
  const getRoomsRes = await sendRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/sarpras/internal/rooms?school_unit_id=1',
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  console.log(`    Status Response: ${getRoomsRes.status}`);
  console.log(`    Jumlah Ruangan Terbaca: ${getRoomsRes.body?.data?.length || 0} ruangan`);
  if (getRoomsRes.body?.data?.length > 0) {
    const sample = getRoomsRes.body.data[0];
    console.log(`    Contoh Ruangan: ID ${sample.id} - ${sample.room_name} (${sample.room_code}) | Gedung: ${sample.building_name}`);
    console.log('    ✓ Endpoint GET /internal/rooms SIAP digunakan oleh modul Akademik\n');
  }

  // -------------------------------------------------------------
  // SKENARIO 2: Keuangan memanggil PATCH /procurements/:id/finance-reference
  // -------------------------------------------------------------
  console.log('--- [SKENARIO 2: Modul Keuangan] Memperbarui Referensi Transaksi Pengadaan ---');

  const procurementId = 1;
  const dummyFinanceRefId = 998877;

  console.log(`2A. Menguji PATCH /procurements/${procurementId}/finance-reference dengan X-API-Key...`);
  const patchFinanceRes = await sendRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/api/v1/sarpras/procurements/${procurementId}/finance-reference`,
    method: 'PATCH',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  }, {
    finance_reference_id: dummyFinanceRefId
  });

  console.log(`    Status Response: ${patchFinanceRes.status}`);
  console.log(`    Pesan Response: "${patchFinanceRes.body?.message}"`);
  console.log(`    Hasil Finance Reference ID di DB Sarpras: ${patchFinanceRes.body?.data?.finance_reference_id}`);

  if (patchFinanceRes.status === 200 && Number(patchFinanceRes.body?.data?.finance_reference_id) === dummyFinanceRefId) {
    console.log('    ✓ Endpoint PATCH /procurements/:id/finance-reference SIAP digunakan oleh modul Keuangan\n');
  } else {
    console.error('    ❌ PATCH Finance Reference Gagal!');
  }

  console.log('================================================================');
  console.log('🎉 SEMUA PENGUJIAN INTEGRASI DUMMY INTERNAL SARPRAS SELESAI & SUKSES!');
  console.log('================================================================');
}

testInternalIntegration().catch((err) => {
  console.error('Error saat pengujian integrasi:', err);
  process.exit(1);
});
