# AI-REF: Modul Sarana & Prasarana (`sarpras`)

> Dokumen referensi teknis modul Sarpras untuk AI Agent. Data diambil langsung dari 14 berkas migrasi Knex aktual, router/controller backend, dan router frontend portal.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/sarpras/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/sarpras/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/sarpras/`
- **Database Engine:** MariaDB 10.5 (`aldepos_sarpras` / `u622997391_dbsarpras`)
- **Status Implementasi:** `jalan-produksi` (Hierarki Lokasi Fisik Lahan/Gedung/Ruangan, Inventaris Aset & QR Code, Peminjaman Fasilitas Multi-Tier Approval, Tiket Pemeliharaan, Pengadaan & BHP/Stock Opname)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (14 Tabel)

### 2.1 Lokasi Fisik & Hierarki Bangunan

#### `facility_sites` (Master Lahan / Kampus)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Kampus Pusat Putri", "Kampus Putra Cibubur" |
| `address` | `TEXT` | YES | `NULL` | - |
| `area_sqm` | `DECIMAL(10,2)` | YES | `NULL` | Luas Tanah (m²) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `facility_buildings` (Master Gedung / Bangunan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `facility_site_id` | `BIGINT UNSIGNED` | NO | - | `FK -> facility_sites(id) CASCADE/CASCADE` |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Gedung Abu Bakar", "Gedung Umar Bin Khattab" |
| `floors_count` | `SMALLINT UNSIGNED`| NO | `1` | Jumlah Lantai |
| `building_area_sqm`| `DECIMAL(10,2)`| YES | `NULL` | Luas Bangunan (m²) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `facility_rooms` (Master Ruangan / Fasilitas Fisik)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `facility_building_id`| `BIGINT UNSIGNED`| NO | - | `FK -> facility_buildings(id) CASCADE/CASCADE` |
| `room_code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "R-LAB-KOMP-1", "R-KELAS-7A") |
| `name` | `VARCHAR(150)` | NO | - | - |
| `floor_number` | `SMALLINT UNSIGNED`| NO | `1` | Posisi Lantai |
| `capacity` | `INT UNSIGNED` | YES | `NULL` | Kapasitas Orang |
| `room_type` | `ENUM` | NO | `'lainnya'` | `'kelas','lab','asrama','kantor','ibadah','olahraga','lainnya'` |
| `status` | `ENUM` | NO | `'tersedia'` | `'tersedia','digunakan','perbaikan'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.2 Inventaris Aset Tetap & Mutasi Lokasi

#### `assets` (Master Aset Inventaris Tetap)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `facility_room_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> facility_rooms(id) SET NULL/CASCADE` |
| `asset_code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "AST-2026-0012") |
| `qr_code` | `VARCHAR(255)` | YES | `NULL` | `UNIQUE` (Data payload barcode/QR) |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Proyektor Epson EB-X500", "PC Server CBT" |
| `category` | `VARCHAR(100)` | YES | `NULL` | e.g. "Elektronik", "Furnitur", "Kendaraan" |
| `acquisition_value`| `DECIMAL(15,2)`| YES | `NULL` | Nilai Perolehan Aset (Rp) |
| `acquisition_date` | `DATE` | YES | `NULL` | Tanggal Pembelian / Pengadaan |
| `condition` | `ENUM` | NO | `'baik'` | `'baik','rusak_ringan','rusak_berat'` |
| `status` | `ENUM` | NO | `'active'` | `'active','disposed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `asset_mutations` (Riwayat Perpindahan Lokasi Aset)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `asset_id` | `BIGINT UNSIGNED` | NO | - | `FK -> assets(id) CASCADE/CASCADE` |
| `from_room_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> facility_rooms(id) SET NULL/CASCADE` |
| `to_room_id` | `BIGINT UNSIGNED` | NO | - | `FK -> facility_rooms(id) RESTRICT/CASCADE` |
| `mutated_by` | `BIGINT UNSIGNED` | NO | - | User ID Eksekutor (Core Service) |
| `reason` | `VARCHAR(255)` | YES | `NULL` | Alasan mutasi aset |
| `mutated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

### 2.3 Peminjaman Fasilitas & Tiket Pemeliharaan

#### `facility_bookings` (Peminjaman Ruangan & Fasilitas)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `facility_room_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> facility_rooms(id) SET NULL/CASCADE` |
| `other_facility_name`| `VARCHAR(150)`| YES | `NULL` | Jika fasilitas non-ruangan (e.g. Bus Sekolah) |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai Pemohon (Kepegawaian) |
| `purpose` | `VARCHAR(255)` | NO | - | Tujuan Penggunaan (e.g. "Rapat Pleno Guru") |
| `booking_date` | `DATE` | NO | - | - |
| `start_time` | `TIME` | NO | - | - |
| `end_time` | `TIME` | NO | - | - |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected','cancelled'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_fb_room_date (facility_room_id, booking_date)`

#### `facility_booking_approvals` (Persetujuan Peminjaman Multi-Tier)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `facility_booking_id`| `BIGINT UNSIGNED`| NO | - | `FK -> facility_bookings(id) CASCADE/CASCADE` |
| `approver_user_id`| `BIGINT UNSIGNED` | NO | - | User ID Pejabat Approver (Core Service) |
| `approval_level` | `SMALLINT UNSIGNED`| NO | `1` | Level Tier Approval (1: Sarpras, 2: Pimpinan) |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected'` |
| `notes` | `TEXT` | YES | `NULL` | Catatan persetujuan / penolakan |
| `approved_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `maintenance_requests` (Tiket Perbaikan & Pemeliharaan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `asset_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> assets(id) SET NULL/CASCADE` |
| `facility_room_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> facility_rooms(id) SET NULL/CASCADE` |
| `reported_by` | `BIGINT UNSIGNED` | NO | - | ID Pegawai Pelapor (Kepegawaian) |
| `damage_report` | `TEXT` | NO | - | Deskripsi Kerusakan Fisik |
| `repair_status` | `ENUM` | NO | `'dilaporkan'` | `'dilaporkan','diproses','selesai','ditutup'` |
| `cost` | `DECIMAL(15,2)` | YES | `NULL` | Realisasi Biaya Perbaikan (Rp) |
| `closed_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.4 Pengadaan & Vendor Rekanan

#### `vendors` (Mitra Vendor & Rekanan Sarpras)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = Berlaku Yayasan-wide |
| `name` | `VARCHAR(150)` | NO | - | Nama Toko / Kontraktor / Supplier |
| `contact` | `VARCHAR(150)` | YES | `NULL` | No. HP / Kontak PIC |
| `category` | `VARCHAR(100)` | YES | `NULL` | e.g. "Konstruksi", "IT & Komputer", "Furnitur" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `procurements` (Pengajuan & Realisasi Pengadaan Sarpras)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `vendor_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> vendors(id) SET NULL/CASCADE` |
| `item_name` | `VARCHAR(150)` | NO | - | - |
| `quantity` | `DECIMAL(10,2)` | NO | - | Jumlah Barang |
| `unit` | `VARCHAR(30)` | YES | `NULL` | e.g. "Unit", "Set", "Pcs" |
| `status` | `ENUM` | NO | `'diajukan'` | `'diajukan','disetujui','diterima','ditolak'` |
| `requested_by` | `BIGINT UNSIGNED` | NO | - | User ID Pemohon (Core Service) |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Approver |
| `finance_reference_id`| `BIGINT UNSIGNED`| YES| `NULL` | Ref Transaksi Pengeluaran Keuangan |
| `received_at` | `TIMESTAMP` | YES | `NULL` | Tanggal Barang Fisik Diterima |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.5 Bahan Habis Pakai (BHP) & Stock Opname

#### `consumable_items` (Master Barang Habis Pakai / BHP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `item_code` | `VARCHAR(50)` | NO | - | e.g. "BHP-ATK-001" |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Kertas HVS A4 75gr", "Spidol Whiteboard" |
| `unit` | `VARCHAR(30)` | NO | - | "Rim", "Pcs", "Box", "Botol" |
| `category` | `VARCHAR(100)` | YES | `NULL` | e.g. "ATK", "Kebersihan", "Elektronik" |
| `minimum_stock` | `DECIMAL(10,2)` | NO | `0.00` | Batas Alert Stok Menipis |
| `current_stock` | `DECIMAL(10,2)` | NO | `0.00` | Stok Fisik Berjalan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_consumable_code (school_unit_id, item_code)`

#### `consumable_stock_mutations` (Kartu Mutasi Stok BHP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `consumable_item_id`| `BIGINT UNSIGNED`| NO | - | `FK -> consumable_items(id) CASCADE/CASCADE` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `mutation_type` | `ENUM` | NO | - | `'in','out'` |
| `quantity` | `DECIMAL(10,2)` | NO | - | Jumlah Masuk / Keluar |
| `reference_type` | `ENUM` | YES | `NULL` | `'procurement','usage','adjustment','opname'` |
| `reference_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Sumber Referensi |
| `facility_room_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> facility_rooms(id) SET NULL/CASCADE` (Ruangan Pengguna) |
| `mutated_by` | `BIGINT UNSIGNED` | NO | - | User ID Pencatat (Core Service) |
| `notes` | `VARCHAR(255)` | YES | `NULL` | - |
| `occurred_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `idx_csm_item_time (consumable_item_id, occurred_at)`

#### `consumable_stock_opnames` (Header Stock Opname BHP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `opname_date` | `DATE` | NO | - | Tanggal Penghitungan Fisik |
| `conducted_by` | `BIGINT UNSIGNED` | NO | - | User ID Petugas Opname |
| `status` | `ENUM` | NO | `'draft'` | `'draft','final'` |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `consumable_stock_opname_items` (Rincian Selisih Fisik vs Sistem BHP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `stock_opname_id` | `BIGINT UNSIGNED` | NO | - | `FK -> consumable_stock_opnames(id) CASCADE/CASCADE` |
| `consumable_item_id`| `BIGINT UNSIGNED`| NO | - | `FK -> consumable_items(id) CASCADE/CASCADE` |
| `system_stock` | `DECIMAL(10,2)` | NO | - | Stok Tercatat di Sistem |
| `physical_stock` | `DECIMAL(10,2)` | NO | - | Hasil Hitung Fisik Gudang |
| `difference` | `DECIMAL(10,2)` | NO | - | Selisih (`physical - system`) |
| `notes` | `VARCHAR(255)` | YES | `NULL` | Keterangan Rusak / Hilang |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_opname_item (stock_opname_id, consumable_item_id)`

---

## 3. Kontrak API Ringkas (`/api/v1/sarpras`)

### 3.1 Fasilitas Fisik & Ruangan
| Method | Endpoint Path | Izin / Hak Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/sites` | `sarpras.facility.sites.manage` | - | `{ sites: array }` |
| `POST` | `/sites` | `sarpras.facility.sites.manage` | `{ name: string, address?: string, area_sqm?: number }` | `{ id: number, name: string }` |
| `GET` | `/buildings` | `sarpras.facility.buildings.manage` | Query: `?site_id=` | `{ buildings: array }` |
| `POST` | `/buildings` | `sarpras.facility.buildings.manage` | `{ facility_site_id: number, name: string, floors_count: number, building_area_sqm?: number }` | `{ id: number }` |
| `GET` | `/rooms` | `sarpras.facility.rooms.manage` | Query: `?building_id=&room_type=&status=` | `{ rooms: array }` |
| `POST` | `/rooms` | `sarpras.facility.rooms.manage` | `{ facility_building_id: number, room_code: string, name: string, floor_number: number, capacity?: number, room_type: string }` | `{ id: number, room_code: string }` |
| `GET` | `/internal/rooms` | `X-API-Key` (Akademik) | Query: `?school_unit_id=&room_type=kelas` | `{ rooms: array<{ id, room_code, name, capacity, room_type, status }> }` |

### 3.2 Inventaris Aset & Mutasi
| Method | Endpoint Path | Izin / Hak Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/assets` | `sarpras.assets.manage` | Query: `?room_id=&category=&condition=&status=&search=&page=&limit=` | `{ assets: array, pagination: object }` |
| `POST` | `/assets` | `sarpras.assets.manage` | `{ facility_room_id?: number, asset_code: string, name: string, category?: string, acquisition_value?: number, acquisition_date?: string, condition?: string }` | `{ id: number, asset_code: string }` |
| `POST` | `/assets/scan` | `sarpras.assets.manage` | `{ qr_code: string }` | `{ asset: object, current_room: object, last_maintenance: object }` |
| `POST` | `/assets/:id/mutate` | `sarpras.assets.mutate` | `{ to_room_id: number, reason?: string }` | `{ id: number, mutated_at: string }` |
| `GET` | `/assets/:id/mutations`| `sarpras.assets.manage` | - | `{ mutations: array }` |
| `POST` | `/assets/:id/qr-code` | `sarpras.assets.manage` | - | `{ qr_code: string, download_url: string }` |

### 3.3 Peminjaman Fasilitas & Pemeliharaan
| Method | Endpoint Path | Izin / Hak Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/bookings/schedule` | `sarpras.bookings.view_schedule` | Query: `?room_id=&start_date=&end_date=` | `{ bookings: array<{ id, room_name, purpose, booking_date, start_time, end_time, status }> }` |
| `POST` | `/bookings` | `sarpras.bookings.create` | `{ facility_room_id?: number, other_facility_name?: string, purpose: string, booking_date: string, start_time: string, end_time: string }` | `{ id: number, status: 'pending' }` |
| `POST` | `/bookings/:id/approve` | `sarpras.bookings.approve` | `{ notes?: string }` | `{ id: number, status: 'approved' }` |
| `POST` | `/bookings/:id/reject` | `sarpras.bookings.approve` | `{ notes?: string }` | `{ id: number, status: 'rejected' }` |
| `GET` | `/maintenance-requests` | `authenticate` | Query: `?status=&page=&limit=` | `{ requests: array, pagination: object }` |
| `POST` | `/maintenance-requests` | `sarpras.maintenance.report` | `{ asset_id?: number, facility_room_id?: number, damage_report: string }` | `{ id: number, repair_status: 'dilaporkan' }` |
| `PUT` | `/maintenance-requests/:id`| `sarpras.maintenance.manage` | `{ repair_status: string, cost?: number }` | `{ id: number, updated: boolean }` |
| `POST` | `/maintenance-requests/:id/close`| `sarpras.maintenance.manage` | `{ notes?: string }` | `{ id: number, repair_status: 'ditutup', closed_at: string }` |

### 3.4 Pengadaan & Bahan Habis Pakai (BHP)
| Method | Endpoint Path | Izin / Hak Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/procurements` | `sarpras.procurement.manage` | Query: `?status=` | `{ procurements: array }` |
| `POST` | `/procurements` | `sarpras.procurement.manage` | `{ vendor_id?: number, item_name: string, quantity: number, unit?: string }` | `{ id: number, status: 'diajukan' }` |
| `PUT` | `/procurements/:id/approve`| `sarpras.procurement.manage` | - | `{ id: number, status: 'disetujui' }` |
| `PUT` | `/procurements/:id/receive`| `sarpras.procurement.manage` | `{ received_date: string }` | `{ id: number, status: 'diterima' }` |
| `PATCH`| `/procurements/:id/finance-reference`| `X-API-Key` (Keuangan)| `{ finance_reference_id: number }` | `{ id: number, finance_reference_id: number }` |
| `GET` | `/consumables` | `sarpras.consumables.manage` | Query: `?category=&search=` | `{ items: array }` |
| `GET` | `/consumables/low-stock` | `sarpras.consumables.manage` | - | `{ low_stock_items: array }` |
| `POST` | `/consumables/:id/stock-in` | `sarpras.consumables.manage` | `{ quantity: number, notes?: string }` | `{ id: number, new_stock: number }` |
| `POST` | `/consumables/:id/stock-out` | `sarpras.consumables.manage` | `{ quantity: number, facility_room_id?: number, notes?: string }` | `{ id: number, new_stock: number }` |
| `POST` | `/stock-opnames` | `sarpras.consumables.opname` | `{ opname_date: string, notes?: string }` | `{ id: number, status: 'draft' }` |
| `PUT` | `/stock-opnames/:id/items` | `sarpras.consumables.opname` | `{ items: array<{ consumable_item_id: number, physical_stock: number, notes?: string }> }` | `{ success: boolean }` |
| `POST` | `/stock-opnames/:id/finalize`| `sarpras.consumables.opname`| - | `{ id: number, status: 'final', adjustments_applied: number }` |
| `GET` | `/reports/dashboard` | `sarpras.reports.view` | - | `{ total_assets: number, asset_condition_summary: object, pending_bookings: number, active_maintenance: number }` |

---

## 4. Workflows & State Machines

- **Alur Peminjaman Fasilitas:** Pegawai mengajukan jadwal ruangan $\rightarrow$ sistem mengecek ketiadaan konflik jadwal $\rightarrow$ status `pending` $\rightarrow$ Approval oleh Kepala Sarpras / Pejabat Sekolah $\rightarrow$ `approved` (jadwal terkunci di kalender fasilitas) ATAU `rejected` / `cancelled`.
- **Alur Tiket Pemeliharaan Aset/Ruangan:** Guru/Pegawai melapor kerusakan fisik $\rightarrow$ tiket berstatus `dilaporkan` $\rightarrow$ Petugas teknisi mengecek & menaikkan ke `diproses` $\rightarrow$ Perbaikan selesai & input realisasi biaya (`cost`) $\rightarrow$ `selesai` $\rightarrow$ Verifikasi Sarpras $\rightarrow$ `ditutup`.
- **Alur Pengadaan Fasilitas & Hubungan Keuangan:** Pengajuan draf barang $\rightarrow$ `diajukan` $\rightarrow$ Disetujui Kepala Sarpras $\rightarrow$ `disetujui` (diteruskan ke Modul Keuangan via mata anggaran RAPBS) $\rightarrow$ Realisasi pencairan dana (`finance_reference_id`) $\rightarrow$ Barang tiba fisik di sekolah $\rightarrow$ `diterima` (otomatis masuk ke katalog aset tetap / stok BHP).
- **Alur Stock Opname BHP:** Pembuatan sesi opname `draft` $\rightarrow$ input penghitungan fisik $\rightarrow$ kalkulasi selisih otomatis (`difference = physical_stock - system_stock`) $\rightarrow$ `finalize` $\rightarrow$ status `final` dan sistem meng-update `current_stock` master BHP serta membukukan kartu mutasi `adjustment`.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/sarpras/login` | `src/apps/sarpras/pages/Login.jsx` | Login petugas & staf sarana prasarana |
| `/sarpras/dashboard` | `src/apps/sarpras/pages/Dashboard.jsx` | Statistik aset, status kondisi, peminjaman pending & tiket perbaikan |
| `/sarpras/facilities` *(alias: `/sarpras/lokasi`)* | `src/apps/sarpras/pages/LokasiFisik.jsx` | Hierarki master lahan (sites), gedung & denah ruangan/laboratorium |
| `/sarpras/assets` *(alias: `/sarpras/aset`)* | `src/apps/sarpras/pages/InventarisAset.jsx` | Master aset tetap, QR Code scanner lookup, mutasi ruangan & kondisi |
| `/sarpras/consumables` *(alias: `/sarpras/bhp`)* | `src/apps/sarpras/pages/BahanHabisPakai.jsx` | Master barang habis pakai, stok masuk/keluar & sesi stock opname fisik |
| `/sarpras/bookings` *(alias: `/sarpras/peminjaman`)* | `src/apps/sarpras/pages/PeminjamanFasilitas.jsx` | Kalender jadwal peminjaman ruangan, form booking & persetujuan multi-level |
| `/sarpras/maintenance` *(alias: `/sarpras/pemeliharaan`)* | `src/apps/sarpras/pages/Pemeliharaan.jsx` | Monitoring tiket laporan kerusakan, proses perbaikan teknisi & penutupan tiket |
| `/sarpras/procurement` *(alias: `/sarpras/pengadaan`)* | `src/apps/sarpras/pages/Pengadaan.jsx` | Usulan pengadaan barang sarpras, tracking persetujuan & penerimaan fisik |
| `/sarpras/reports` *(alias: `/sarpras/laporan`)* | `src/apps/sarpras/pages/Laporan.jsx` | Rekapitulasi kondisi aset, nilai depresiasi perolehan & rekapitulasi BHP |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi token JWT SSO, profil Satuan Pendidikan & profil Yayasan, audit log.
  - `kepegawaian`: Mengambil data pegawai (`employees`) untuk penanggung jawab ruangan, peminjam fasilitas, dan pelapor kerusakan.
  - `keuangan`: Pengajuan anggaran pengadaan barang/aset tetap & pencatatan biaya pemeliharaan (`procurements.finance_reference_id`).
- **Modul yang Memanggil Sarpras (Consumers):**
  - `akademik`: Mengambil data master ruangan kelas, lab komputer, dan lapangan (`GET /api/v1/sarpras/internal/rooms`) untuk penempatan rombel dan plotting jadwal pelajaran anti-bentrok.
  - `cbe`: Penentuan ruang ujian CBT berbasis kapasitas ruangan lab komputer.
  - `perpustakaan`: Pemetaan fisik ruangan dan fasilitas gedung perpustakaan.
  - `manajemen`: Agregat laporan total nilai aset yayasan, kondisi sarana, dan utilisasi fasilitas untuk monev mutu.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Depresiasi Nilai Aset Otomatis:** Perhitungan penyusutan nilai aset (metode garis lurus) saat ini disajikan secara komputasi on-the-fly pada modul laporan (`/reports/asset-depreciation`), belum ada tabel periodik depresiasi aset tersendiri.
2. **Mobile Camera QR Scanner Direct Integration:** Scan QR aset di portal desktop menggunakan library webcam browser; pengembangan PWA mobile scanner khusus teknisi sarpras masuk dalam tahap lanjutan.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
