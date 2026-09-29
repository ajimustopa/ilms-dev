Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-kantin.md

> Kontrak REST API resmi modul **Kantin**. Pola mengikuti `api-contract-coreservice.md`. Acuan
> ruang lingkup: `rancangan-kantin.md` §4, skema data: `erd-kantin.md`.

## 1. Informasi Umum & Konvensi

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/kantin`
- **Staging:** `https://staging-api.aldeposibs.com/api/v1/kantin`
- **Lokal:** `http://localhost:3000/api/v1/kantin`

### 1.2 Autentikasi
- **Bearer JWT** (`Authorization: Bearer <access_token>`) — untuk semua endpoint yang diakses
  staf kantin, admin, dan orangtua. Token diterbitkan Core Service (`POST /api/v1/core/auth/login`)
  — Kantin **tidak** menerbitkan token sendiri, hanya memverifikasi (in-process, sesuai
  `ARSITEKTUR-SISTEM.md` §1.1).
- **`X-API-Key`** — untuk pemanggilan service-to-service dari Portal Orangtua (top-up online) dan
  Keuangan (tarik data hak kantin), kalau kedua modul itu memanggil lewat HTTP murni alih-alih
  in-process. Header sama seperti pola Core Service.
- **PIN Anak/PIN Ortu** bukan mekanisme autentikasi JWT — dipakai sebagai verifikasi tambahan di
  endpoint transaksi kasir (`POST /transactions`) dan self-service orangtua, dikirim di body
  request, divalidasi terhadap `canteen_students.child_pin_hash`/`parent_pin_hash`.

### 1.3 Format Response
Sama seperti seluruh sistem (`ARSITEKTUR-SISTEM.md` §4.3): `{ success, data, message, errors }`.

### 1.4 Kode Status HTTP
Sama seperti `api-contract-coreservice.md` §1.4 (200/201/400/401/403/404/409/422/429/500).

### 1.5 Definisi Aktor
- `admin`, `kepala_kantin` — akses penuh konfigurasi & operasional (role Core Service)
- `kasir` — transaksi penjualan, retur
- `bendahara` — top up/tarik tunai, pembayaran hak kantin/vendor, laporan keuangan
- `orangtua` — self-service melihat saldo/riwayat anak, ganti PIN, batasi/blokir jajan
- `internal_service` — Portal Orangtua & Keuangan lewat `X-API-Key`

## 2. Daftar & Detail Endpoint per Modul

### MODUL 1: KONFIGURASI (Jenis Akses)

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/access-menus` | Daftar menu Kantin & status akses per role | admin, kepala_kantin |
| GET | `/access-menus/roles/:role_name` | Detail akses menu untuk satu role | admin, kepala_kantin |
| POST | `/access-menus/:id/toggle` | Aktif/nonaktifkan akses menu untuk role tertentu | admin, kepala_kantin |

> Fitur "Role" dan "User" (draf asli #5–13) **tidak** punya endpoint di sini — dikelola lewat
> `/api/v1/core/roles` dan `/api/v1/core/users` milik Core Service (lihat
> `rancangan-kantin.md` §4).

##### `POST /access-menus/:id/toggle`
- **Aktor:** `admin`, `kepala_kantin`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengaktifkan/menonaktifkan akses satu menu Kantin untuk satu role.

**Request Body:**
```json
{ "role_name": "kasir", "is_active": false }
```

**Response Sukses:**
```json
{
  "success": true,
  "data": { "id": 5, "role_name": "kasir", "access_menu_id": 5, "is_active": false },
  "message": "Akses menu berhasil diperbarui",
  "errors": null
}
```

---

### MODUL 2: PRODUK

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| POST | `/vendors` | Tambah vendor | admin, kepala_kantin |
| GET | `/vendors` | Daftar vendor | admin, kepala_kantin |
| PUT | `/vendors/:id` | Edit vendor | admin, kepala_kantin |
| PATCH | `/vendors/:id/status` | Aktif/nonaktifkan vendor | admin, kepala_kantin |
| POST | `/product-categories` | Tambah kategori produk | admin, kepala_kantin |
| GET | `/product-categories` | Daftar kategori produk | admin, kepala_kantin |
| PUT | `/product-categories/:id` | Edit kategori produk | admin, kepala_kantin |
| PATCH | `/product-categories/:id/status` | Aktif/nonaktifkan kategori | admin, kepala_kantin |
| POST | `/vendor-products` | Tambah produk vendor | admin, kepala_kantin |
| GET | `/vendor-products` | Daftar produk (dengan warning stok menipis) | admin, kepala_kantin, kasir |
| PUT | `/vendor-products/:id` | Edit produk vendor | admin, kepala_kantin |
| PATCH | `/vendor-products/:id/status` | Aktif/nonaktifkan produk | admin, kepala_kantin |
| POST | `/vendor-products/generate-barcode` | Generate barcode (semua/satu produk) | admin, kepala_kantin |
| PUT | `/vendor-products/:id/barcode` | Edit kode barcode manual | admin, kepala_kantin |
| POST | `/goods-receipts` | Tambah penerimaan barang (titipan/belanja sendiri) | admin, kepala_kantin |
| POST | `/goods-receipts/:id/items` | Tambah item produk ke penerimaan | admin, kepala_kantin |
| GET | `/goods-receipts?receipt_type=titipan` | Riwayat terima barang titipan | admin, kepala_kantin |
| GET | `/goods-receipts?receipt_type=belanja_sendiri` | Riwayat belanja barang sendiri | admin, kepala_kantin |
| POST | `/product-returns` | Retur barang (sisa/rusak) | kasir, admin, kepala_kantin |
| GET | `/product-returns` | Riwayat retur barang | kasir, admin, kepala_kantin |

##### `GET /vendor-products`
- **Aktor:** `admin`, `kepala_kantin`, `kasir`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Daftar produk dengan indikator stok menipis (`current_stock <= min_stock`).

**Response Sukses:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_name": "Air Mineral 600ml",
      "category": "Minuman",
      "unit": "botol",
      "current_stock": 8,
      "min_stock": 10,
      "vendor": "Vendor Snack Sehat",
      "low_stock_warning": true
    }
  ],
  "message": null,
  "errors": null
}
```

---

### MODUL 3: MURID (Atribut Kantin)

> Identitas siswa (NIPD, nama, JK, rombel) diambil dari **Akademik** — endpoint di bawah hanya
> mengelola atribut milik Kantin. Lihat `rancangan-kantin.md` §4.

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/canteen-students` | Daftar siswa dengan atribut kantin (saldo, status, dst) — hasil gabungan referensi Akademik + data lokal | admin, kepala_kantin |
| GET | `/canteen-students/:student_id` | Detail atribut kantin satu siswa | admin, kepala_kantin |
| PATCH | `/canteen-students/:student_id/status` | Aktif/nonaktifkan akses kantin siswa | admin, kepala_kantin |
| POST | `/canteen-students/:student_id/generate-qr` | Generate QR code kantin (semua/satu siswa) | admin, kepala_kantin |
| PUT | `/canteen-students/:student_id/qr` | Edit kode QR manual | admin, kepala_kantin |
| POST | `/canteen-students/:student_id/reset-child-pin` | Reset PIN anak, kembalikan PIN baru | admin, kepala_kantin |
| POST | `/canteen-students/:student_id/reset-parent-pin` | Reset PIN ortu, kembalikan PIN baru | admin, kepala_kantin |

##### `GET /canteen-students`
- **Aktor:** `admin`, `kepala_kantin`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Backend memanggil service Akademik in-process untuk melengkapi nama/rombel;
  `cached_student_name`/`cached_class_group_name` dipakai sebagai fallback jika panggilan gagal.

**Response Sukses:**
```json
{
  "success": true,
  "data": [
    {
      "student_id": 1001,
      "student_name": "Contoh Siswa Satu",
      "class_group_name": "Kelas 5A",
      "wallet_balance": 25000,
      "status": "active",
      "is_blocked_by_parent": false
    }
  ],
  "message": null,
  "errors": null
}
```

---

### MODUL 4: KONFIGURASI (Limit Jajan Harian)

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| POST | `/daily-spending-limits` | Tambah limit jajan harian | admin, kepala_kantin |
| GET | `/daily-spending-limits` | Daftar limit | admin, kepala_kantin |
| PUT | `/daily-spending-limits/:id` | Edit limit | admin, kepala_kantin |
| PATCH | `/daily-spending-limits/:id/status` | Aktif/nonaktifkan limit | admin, kepala_kantin |

---

### MODUL 5: KEUANGAN (Dompet)

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| POST | `/wallet-transactions/top-up` | Top up saldo dompet siswa | bendahara, admin, kepala_kantin |
| POST | `/wallet-transactions/withdrawal` | Tarik tunai saldo dompet siswa | bendahara, admin, kepala_kantin |
| GET | `/wallet-transactions?canteen_student_id=` | Riwayat mutasi dompet (top up, tarik tunai, jajan) | bendahara, admin, kepala_kantin, orangtua (data anak sendiri) |

##### `POST /wallet-transactions/top-up`
- **Aktor:** `bendahara`, `admin`, `kepala_kantin`
- **Status HTTP:** `201 Created`, `404 Not Found`
- **Deskripsi:** Menambah saldo dompet siswa. Dampak: `canteen_students.wallet_balance`
  bertambah, baris baru di `wallet_transactions`, webhook `kantin.wallet.updated` dipublish untuk
  Portal Orangtua.

**Request Body:**
```json
{ "student_id": 1001, "amount": 50000, "payment_method": "cash" }
```

**Response Sukses:**
```json
{
  "success": true,
  "data": {
    "wallet_transaction_id": 12,
    "student_id": 1001,
    "amount": 50000,
    "balance_after": 75000
  },
  "message": "Top up berhasil",
  "errors": null
}
```

---

### MODUL 6: PENJUALAN

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| POST | `/sales-transactions` | Transaksi penjualan (kasir) | kasir, admin, kepala_kantin |
| GET | `/sales-transactions` | Riwayat transaksi penjualan | kasir, admin, kepala_kantin, bendahara |

##### `POST /sales-transactions`
- **Aktor:** `kasir`, `admin`, `kepala_kantin`
- **Status HTTP:** `201 Created`, `400 Bad Request`, `403 Forbidden` (PIN salah / limit terlampaui / saldo kurang)
- **Deskripsi:** Transaksi inti kasir. Dampak: saldo dompet berkurang (jika `payment_method:
  wallet`), `current_stock` produk berkurang, `subtotal_cost`/`subtotal_price` tercatat untuk
  perhitungan hak kantin/vendor, limit jajan harian terpakai, baris `wallet_transactions`
  (`type: purchase`) tercatat jika bayar dari dompet.

**Request Body:**
```json
{
  "buyer_type": "student",
  "student_id": 1001,
  "child_pin": "123456",
  "payment_method": "wallet",
  "discount_amount": 0,
  "items": [
    { "vendor_product_id": 1, "qty": 2 }
  ]
}
```

**Response Sukses:**
```json
{
  "success": true,
  "data": {
    "sales_transaction_id": 88,
    "total_amount": 10000,
    "payment_method": "wallet",
    "wallet_balance_after": 65000
  },
  "message": "Transaksi berhasil",
  "errors": null
}
```

**Response Gagal (`403 Forbidden`, limit terlampaui):**
```json
{
  "success": false,
  "data": null,
  "message": "Transaksi melebihi limit jajan harian",
  "errors": [{ "field": "amount", "message": "Sisa limit hari ini Rp5.000" }]
}
```

---

### MODUL 7: KEUANGAN (Piutang, Hak Kantin/Vendor, Pengeluaran)

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/receivables/canteen-share?period_start=&period_end=` | Piutang hak kantin (total, riwayat penjualan) | bendahara, admin, kepala_kantin |
| GET | `/receivables/canteen-share/detail` | Detail produk terjual, modal, jual, subtotal (khusus titipan: jual - potongan) | bendahara, admin, kepala_kantin |
| GET | `/receivables/vendor-share?vendor_id=` | Hak vendor: jumlah, harga jual, potongan kantin, nominal hak vendor | bendahara, admin, kepala_kantin |
| POST | `/canteen-fee-payments` | Bayar hak kantin dari kas dompet | bendahara, admin, kepala_kantin |
| GET | `/canteen-fee-payments` | Riwayat pembayaran hak kantin | bendahara, admin, kepala_kantin |
| POST | `/vendor-fee-payments` | Bayar hak vendor dari kas kantin | bendahara, admin, kepala_kantin |
| GET | `/vendor-fee-payments` | Riwayat pembayaran hak vendor | bendahara, admin, kepala_kantin |
| POST | `/operational-expenses` | Catat pengeluaran operasional kantin | bendahara, admin, kepala_kantin |
| GET | `/operational-expenses` | Riwayat pengeluaran operasional | bendahara, admin, kepala_kantin |

---

### MODUL 8: ORANGTUA

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/parent/students/:student_id/wallet` | Lihat saldo dompet anak | orangtua |
| GET | `/parent/students/:student_id/wallet/history` | Riwayat mutasi dompet anak | orangtua |
| GET | `/parent/students/:student_id/spending-history` | Riwayat jajan anak | orangtua |
| POST | `/parent/students/:student_id/change-pin` | Ganti PIN ortu | orangtua |
| PUT | `/parent/students/:student_id/spending-limit` | Batasi jumlah jajan anak (override) | orangtua |
| PATCH | `/parent/students/:student_id/block` | Blokir/buka blokir jajan anak | orangtua |

> Endpoint modul ini dipanggil dari Portal Orangtua (via `X-API-Key`) atau langsung dari
> pengguna orangtua yang login (via JWT dengan `account_type: parent`) — dua-duanya divalidasi
> memiliki relasi ke `student_id` yang diminta lewat data Akademik.

---

### MODUL 9: LAPORAN

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/reports/products?export=` | Laporan produk (masuk, terjual, sisa, retur, modal, pendapatan, keuntungan kantin/vendor) | admin, kasir, bendahara, kepala_kantin |
| GET | `/reports/vendors?export=` | Laporan vendor (hak vendor, terbayar, produk dititip) | admin, kasir, bendahara, kepala_kantin |
| GET | `/reports/cash?export=` | Laporan kas kantin | admin, kasir, bendahara, kepala_kantin |
| GET | `/reports/monthly?month=&export=` | Laporan bulanan keseluruhan | admin, kasir, bendahara, kepala_kantin |
| GET | `/reports/monthly-spending?month=&export=` | Laporan jajan bulanan | admin, kasir, bendahara, kepala_kantin |

`export` bernilai `csv`/`xlsx`/`pdf` (opsional) — detail format file diputuskan saat implementasi
Tahap 3, tidak wajib final di kontrak ini.

---

### MODUL 10: DASHBOARD

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/dashboard/summary` | Ringkasan: total modal barang, total penjualan bulan ini, total pengeluaran non-barang, saldo kantin, saldo dompet, total piutang hak kantin, total hak vendor | admin, kasir, bendahara, kepala_kantin |
| GET | `/dashboard/sales-chart?period=` | Data grafik penjualan | admin, kasir, bendahara, kepala_kantin |

## 3. Webhook yang Dipublish Kantin

| Event Type | Dipicu Oleh | Dikonsumsi Oleh |
|---|---|---|
| `kantin.wallet.updated` | Top up, tarik tunai, transaksi jajan | Portal Orangtua |
| `kantin.spending.recorded` | Transaksi penjualan (jajan) selesai | Portal Orangtua |
| `kantin.fee.recorded` | Pembayaran hak kantin dicatat | Keuangan (opsional, lihat `rancangan-kantin.md` §5) |

Payload mengikuti format global `{ event_type, timestamp, data, satuan_pendidikan_id }`.

## 4. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Kontrak API awal dibuat, 10 modul mengikuti struktur `erd-kantin.md`. Endpoint Role/User dihilangkan sesuai `rancangan-kantin.md` §4 — diarahkan ke `/api/v1/core/roles` dan `/api/v1/core/users`. Status: **draft**, contoh request/response perlu direview terhadap keputusan terbuka (metode bayar, prioritas fitur) di `rancangan-kantin.md` §5. |

*(Tambahkan baris baru di atas setiap ada perubahan kontrak — jangan hapus riwayat lama.)*
