Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-sarpras.md

> Dokumen ini adalah spesifikasi kontrak RESTful API resmi untuk modul **Sarpras**. Mengikuti
> pola `api-contract-coreservice.md`. Menjadi acuan implementasi backend Sarpras dan integrasi
> dengan Akademik (konsumen `facility_rooms`), Kepegawaian (validasi `employee_id`), dan Keuangan
> (konsumen data `procurements`).

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL

- **Production:** `https://api.aldeposibs.com/api/v1/sarpras`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/sarpras`
- **Lokal Development:** `http://localhost:3000/api/v1/sarpras`

### 1.2 Skema Autentikasi & Otorisasi

1. **Bearer Token (JWT) — untuk Pengguna (Admin Sarpras, Pegawai, Atasan):**
   ```http
   Authorization: Bearer <access_token>
   ```
   Token diterbitkan Core Service (`POST /api/v1/core/auth/login`), diverifikasi lokal (in-process)
   oleh modul Sarpras — lihat `ARSITEKTUR-SISTEM.md` Bagian 1.1.

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service:**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai oleh **Akademik** untuk membaca endpoint `internal/rooms` (data ruangan untuk
   penentuan rombel), dan oleh **Keuangan** untuk menerima notifikasi `procurements` yang siap
   diproses jadi transaksi.

### 1.3 Standar Struktur Response JSON

Sama persis dengan Core Service — lihat `api-contract-coreservice.md` §1.3
(`{ success, data, message, errors }`).

### 1.4 Kode Status HTTP

Sama dengan `api-contract-coreservice.md` §1.4 (200/201/400/401/403/404/409/422/5xx).

### 1.5 Filter Multi-Satuan-Pendidikan

Semua endpoint (kecuali endpoint internal service-to-service yang eksplisit lintas-satuan)
**wajib** difilter oleh `school_unit_id` dari header/context user yang sedang aktif, sesuai
`ARSITEKTUR-SISTEM.md` Bagian 3 poin 2.

---

## 2. Lokasi & Denah

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/sites` | Daftar lahan | Admin Sarpras |
| POST | `/sites` | Tambah lahan | Admin Sarpras |
| GET | `/sites/:id` | Detail lahan | Admin Sarpras |
| PUT | `/sites/:id` | Edit lahan | Admin Sarpras |
| DELETE | `/sites/:id` | Hapus lahan | Admin Sarpras |
| GET | `/buildings?site_id=` | Daftar bangunan (filter per lahan) | Admin Sarpras |
| POST | `/buildings` | Tambah bangunan | Admin Sarpras |
| PUT | `/buildings/:id` | Edit bangunan | Admin Sarpras |
| DELETE | `/buildings/:id` | Hapus bangunan | Admin Sarpras |
| GET | `/rooms?building_id=` | Daftar ruangan (filter per bangunan) | Admin Sarpras |
| GET | `/rooms/:id` | Detail ruangan | Admin Sarpras |
| POST | `/rooms` | Tambah ruangan | Admin Sarpras |
| PUT | `/rooms/:id` | Edit ruangan | Admin Sarpras |
| DELETE | `/rooms/:id` | Hapus ruangan | Admin Sarpras |
| GET | `/internal/rooms?school_unit_id=` | **Endpoint internal** — daftar ruangan aktif untuk dikonsumsi Akademik (`X-API-Key`) | internal_service (Akademik) |

---

## 3. Inventaris

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/assets` | Daftar aset (filter kategori, kondisi, room_id) | Admin Sarpras |
| POST | `/assets` | Tambah aset | Admin Sarpras |
| GET | `/assets/:id` | Detail aset | Admin Sarpras |
| PUT | `/assets/:id` | Edit aset | Admin Sarpras |
| DELETE | `/assets/:id` | Hapus/disposal aset | Admin Sarpras |
| POST | `/assets/:id/mutate` | Mutasi lokasi aset (catat `asset_mutations`, update `facility_room_id`) | Admin Sarpras |
| GET | `/assets/:id/mutations` | Riwayat mutasi lokasi | Admin Sarpras |
| POST | `/assets/:id/qr-code` | Generate QR code | Admin Sarpras |
| GET | `/assets/:id/qr-code` | Ambil/cetak QR code | Admin Sarpras |
| POST | `/assets/scan` | Lookup aset dari hasil scan QR/barcode | Admin Sarpras |

---

## 4. Peminjaman

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/bookings` | Daftar pengajuan peminjaman | Pegawai (miliknya), Admin Sarpras (semua) |
| POST | `/bookings` | Ajukan peminjaman ruang/fasilitas | Pegawai |
| GET | `/bookings/:id` | Detail pengajuan | Pegawai (miliknya), Admin Sarpras |
| PUT | `/bookings/:id` | Ubah jadwal (sebelum disetujui) | Pegawai (miliknya), Admin Sarpras |
| DELETE | `/bookings/:id` | Batalkan pengajuan | Pegawai (miliknya), Admin Sarpras |
| GET | `/bookings/schedule?room_id=&date=` | Jadwal pemakaian fasilitas (kalender ketersediaan) | Pegawai, Admin Sarpras |
| GET | `/bookings/:id/approvals` | Riwayat approval berjenjang | Admin Sarpras, Atasan terkait |
| POST | `/bookings/:id/approve` | Setujui (per level approval) | Atasan |
| POST | `/bookings/:id/reject` | Tolak | Atasan, Admin Sarpras |

---

## 5. Pemeliharaan

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/maintenance-requests` | Daftar laporan kerusakan | Pegawai (miliknya), Admin Sarpras (semua) |
| POST | `/maintenance-requests` | Laporkan kerusakan | Pegawai |
| GET | `/maintenance-requests/:id` | Detail laporan | Pegawai (miliknya), Admin Sarpras |
| PUT | `/maintenance-requests/:id` | Update status/tindak lanjut/biaya | Admin Sarpras |
| POST | `/maintenance-requests/:id/close` | Tutup tiket perbaikan | Admin Sarpras |

---

## 6. Pengadaan

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/vendors` | Daftar supplier | Admin Sarpras |
| POST | `/vendors` | Tambah supplier | Admin Sarpras |
| PUT | `/vendors/:id` | Edit supplier | Admin Sarpras |
| DELETE | `/vendors/:id` | Hapus supplier | Admin Sarpras |
| GET | `/procurements` | Daftar pengadaan | Admin Sarpras |
| POST | `/procurements` | Ajukan pengadaan barang | Admin Sarpras |
| GET | `/procurements/:id` | Detail pengadaan | Admin Sarpras |
| PUT | `/procurements/:id/approve` | Setujui pengadaan | Admin Sarpras |
| PUT | `/procurements/:id/receive` | Tandai barang diterima | Admin Sarpras |
| PATCH | `/procurements/:id/finance-reference` | **Endpoint internal** — Keuangan mengisi `finance_reference_id` setelah diproses (`X-API-Key`) | internal_service (Keuangan) |

---

## 7. Bahan Habis Pakai

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/consumables` | Daftar bahan habis pakai | Admin Sarpras |
| POST | `/consumables` | Tambah item bahan habis pakai | Admin Sarpras |
| PUT | `/consumables/:id` | Edit item | Admin Sarpras |
| DELETE | `/consumables/:id` | Hapus item | Admin Sarpras |
| GET | `/consumables/low-stock` | Daftar item di bawah `minimum_stock` | Admin Sarpras |
| POST | `/consumables/:id/stock-in` | Catat stok masuk (mis. dari pengadaan) | Admin Sarpras |
| POST | `/consumables/:id/stock-out` | Catat stok keluar (pemakaian) | Admin Sarpras |
| GET | `/consumables/:id/mutations` | Riwayat mutasi stok item | Admin Sarpras |
| GET | `/stock-opnames` | Daftar sesi stock opname | Admin Sarpras |
| POST | `/stock-opnames` | Mulai sesi opname (auto-isi `system_stock` semua item aktif) | Admin Sarpras |
| GET | `/stock-opnames/:id` | Detail sesi opname + daftar item | Admin Sarpras |
| PUT | `/stock-opnames/:id/items` | Isi `physical_stock` per item | Admin Sarpras |
| POST | `/stock-opnames/:id/finalize` | Finalisasi — hitung selisih, buat mutasi `adjustment`, update `current_stock` | Admin Sarpras |

---

## 8. Laporan

| Method | Endpoint | Deskripsi | Aktor |
|---|---|---|---|
| GET | `/reports/asset-condition?period=` | Laporan kondisi aset | Admin Sarpras |
| GET | `/reports/asset-depreciation?period=` | Laporan penyusutan aset (dihitung dari `acquisition_value`/`acquisition_date`, garis lurus) | Admin Sarpras |

---

## 9. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat, mengikuti pola `api-contract-coreservice.md`. Endpoint internal (`/internal/rooms`, `/procurements/:id/finance-reference`) ditambahkan untuk mendukung konsumsi lintas modul oleh Akademik & Keuangan sesuai `rancangan-sarpras.md` Bagian 2. |

