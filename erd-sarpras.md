# erd-sarpras.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 & 4.4 (prinsip arsitektur & konvensi penamaan global),
> `rancangan-sarpras.md` Bagian 4–5 (ruang lingkup 13 fitur & keputusan terbuka).
> Database: MariaDB 10.5. Query builder: Knex.js. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`,
> semua tabel punya `created_at`/`updated_at TIMESTAMP` kecuali tabel log *append-only*
> (`asset_mutations`, `consumable_stock_mutations` — tidak ditulis ulang di tiap tabel di bawah
> supaya ringkas).
>
> **Tidak ada FK fisik lintas database.** Kolom `employee_id` (Kepegawaian), `approver_user_id`/
> `mutated_by`/`conducted_by`/`requested_by`/`approved_by` (Core Service `users.id`), dan
> `finance_reference_id` (Keuangan) adalah **kolom ID biasa**, divalidasi lewat pemanggilan
> service-layer modul pemiliknya (in-process, sesuai `ARSITEKTUR-SISTEM.md` Bagian 1.1) — bukan
> `CONSTRAINT FOREIGN KEY` di skema di bawah.

## 0. Catatan atas Keputusan Terbuka di `rancangan-sarpras.md` §5

Skema di bawah memakai opsi "sementara" yang tercantum di §5 rancangan (legalitas lahan
sederhana, approval level fleksibel tanpa struktur jabatan otomatis, kategori bahan habis pakai
teks bebas, stock opname per satuan pendidikan, fasilitas non-ruangan sebagai `room_type`
khusus). **Status: draf kerja, bukan final** — beri tahu developer kalau salah satu keputusan
sementara ini perlu diubah sebelum migration dijalankan.

## 1. Daftar Entitas (14 Tabel)

| Modul (`rancangan-sarpras.md` §4) | Tabel | `school_unit_id`? |
|---|---|---|
| Lokasi & Denah | `facility_sites` | Ya |
| Lokasi & Denah | `facility_buildings` | Ya |
| Lokasi & Denah | `facility_rooms` | Ya |
| Inventaris | `assets` | Ya |
| Inventaris | `asset_mutations` (append-only) | Tidak langsung (ikut `assets`) |
| Peminjaman | `facility_bookings` | Ya |
| Peminjaman | `facility_booking_approvals` | Tidak langsung (ikut `facility_bookings`) |
| Pemeliharaan | `maintenance_requests` | Ya |
| Pengadaan | `vendors` | Ya (nullable — bisa yayasan-wide) |
| Pengadaan | `procurements` | Ya |
| Bahan Habis Pakai | `consumable_items` | Ya |
| Bahan Habis Pakai | `consumable_stock_mutations` (append-only) | Ya |
| Bahan Habis Pakai | `consumable_stock_opnames` | Ya |
| Bahan Habis Pakai | `consumable_stock_opname_items` | Tidak langsung (ikut `consumable_stock_opnames`) |

> Fitur "QR code/barcode aset" tidak punya tabel sendiri — pakai kolom `assets.qr_code`.
> Fitur "Laporan kondisi & penyusutan aset" tidak punya tabel sendiri — dihitung dari
> `assets.acquisition_value`/`acquisition_date` saat request (penyusutan garis lurus), bukan
> data tersimpan.

## 2. Detail Tabel

### 2.1 `facility_sites` (Lahan)
*(Fitur Manajemen Lokasi Fisik)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — ref Core Service |
| name | VARCHAR(150) | NOT NULL |
| address | VARCHAR(255) | NULLABLE |
| land_area_m2 | DECIMAL(10,2) | NULLABLE |
| ownership_status | ENUM('milik_sendiri','sewa','pinjam','hibah') | NULLABLE |
| certificate_number | VARCHAR(100) | NULLABLE |
| notes | TEXT | NULLABLE |

### 2.2 `facility_buildings` (Bangunan)
*(Fitur Manajemen Lokasi Fisik — anak dari `facility_sites`)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| facility_site_id | BIGINT UNSIGNED | FK → `facility_sites.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| building_function | VARCHAR(100) | NULLABLE — mis. "ruang kelas", "kantor", "lapangan olahraga" |
| floor_count | SMALLINT UNSIGNED | NULLABLE |
| building_area_m2 | DECIMAL(10,2) | NULLABLE |
| construction_year | YEAR | NULLABLE |
| condition | ENUM('baik','rusak_ringan','rusak_sedang','rusak_berat') | NOT NULL, DEFAULT 'baik' |

### 2.3 `facility_rooms` (Ruangan)
*(Fitur Manajemen Lokasi Fisik — anak dari `facility_buildings`; dikonsumsi Akademik untuk
`room_id` rombel)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| facility_building_id | BIGINT UNSIGNED | FK → `facility_buildings.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| room_code | VARCHAR(50) | NOT NULL |
| room_name | VARCHAR(150) | NOT NULL |
| room_type | ENUM('ruang_kelas','laboratorium','perpustakaan','ruang_guru','ruang_kepsek','uks','gudang','toilet','aula','lapangan','kantin','lainnya') | NOT NULL |
| floor_number | SMALLINT | NULLABLE |
| area_m2 | DECIMAL(10,2) | NULLABLE |
| capacity | SMALLINT UNSIGNED | NULLABLE |
| condition | ENUM('baik','rusak_ringan','rusak_sedang','rusak_berat') | NOT NULL, DEFAULT 'baik' |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

`UNIQUE (facility_building_id, room_code)`.

### 2.4 `assets`
*(Fitur Inventaris aset/barang + QR code)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| facility_room_id | BIGINT UNSIGNED | NULLABLE — FK → `facility_rooms.id`, lokasi terkini |
| asset_code | VARCHAR(50) | NOT NULL, UNIQUE |
| name | VARCHAR(150) | NOT NULL |
| category | VARCHAR(100) | NULLABLE |
| acquisition_value | DECIMAL(15,2) | NULLABLE |
| acquisition_date | DATE | NULLABLE |
| condition | ENUM('baik','rusak_ringan','rusak_berat') | NOT NULL, DEFAULT 'baik' |
| qr_code | VARCHAR(255) | NULLABLE, UNIQUE |
| status | ENUM('active','disposed') | NOT NULL, DEFAULT 'active' |

### 2.5 `asset_mutations` (append-only, tanpa `updated_at`)
*(Pendukung Fitur Inventaris — histori mutasi lokasi)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| asset_id | BIGINT UNSIGNED | FK → `assets.id`, NOT NULL |
| from_room_id | BIGINT UNSIGNED | NULLABLE — FK → `facility_rooms.id` |
| to_room_id | BIGINT UNSIGNED | FK → `facility_rooms.id`, NOT NULL |
| mutated_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| reason | VARCHAR(255) | NULLABLE |
| mutated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.6 `facility_bookings`
*(Fitur Peminjaman ruang/fasilitas + Jadwal pemakaian fasilitas)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| facility_room_id | BIGINT UNSIGNED | NULLABLE — FK → `facility_rooms.id` |
| other_facility_name | VARCHAR(150) | NULLABLE — kalau fasilitas belum tercatat sbg `facility_rooms` |
| employee_id | BIGINT UNSIGNED | NOT NULL — ref Kepegawaian |
| purpose | VARCHAR(255) | NOT NULL |
| booking_date | DATE | NOT NULL |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| status | ENUM('pending','approved','rejected','cancelled') | NOT NULL, DEFAULT 'pending' |

`INDEX (facility_room_id, booking_date)` — untuk query jadwal pemakaian.

### 2.7 `facility_booking_approvals`
*(Fitur Approval peminjaman berjenjang)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| facility_booking_id | BIGINT UNSIGNED | FK → `facility_bookings.id`, NOT NULL |
| approver_user_id | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| approval_level | SMALLINT UNSIGNED | NOT NULL, DEFAULT 1 |
| status | ENUM('pending','approved','rejected') | NOT NULL, DEFAULT 'pending' |
| notes | TEXT | NULLABLE |
| approved_at | TIMESTAMP | NULLABLE |

### 2.8 `maintenance_requests`
*(Fitur Permintaan & perbaikan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| asset_id | BIGINT UNSIGNED | NULLABLE — FK → `assets.id` |
| facility_room_id | BIGINT UNSIGNED | NULLABLE — FK → `facility_rooms.id` |
| reported_by | BIGINT UNSIGNED | NOT NULL — ref Kepegawaian (`employee_id`) |
| damage_report | TEXT | NOT NULL |
| repair_status | ENUM('dilaporkan','diproses','selesai','ditutup') | NOT NULL, DEFAULT 'dilaporkan' |
| cost | DECIMAL(15,2) | NULLABLE |
| closed_at | TIMESTAMP | NULLABLE |

### 2.9 `vendors`
*(Fitur Manajemen supplier/vendor)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — kosong berarti berlaku yayasan-wide |
| name | VARCHAR(150) | NOT NULL |
| contact | VARCHAR(150) | NULLABLE |
| category | VARCHAR(100) | NULLABLE |

### 2.10 `procurements`
*(Fitur Pengadaan barang)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| vendor_id | BIGINT UNSIGNED | NULLABLE — FK → `vendors.id` |
| item_name | VARCHAR(150) | NOT NULL |
| quantity | DECIMAL(10,2) | NOT NULL |
| unit | VARCHAR(30) | NULLABLE |
| status | ENUM('diajukan','disetujui','diterima','ditolak') | NOT NULL, DEFAULT 'diajukan' |
| requested_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| approved_by | BIGINT UNSIGNED | NULLABLE — ref `users.id` Core Service |
| finance_reference_id | BIGINT UNSIGNED | NULLABLE — ID transaksi di Keuangan (bukan FK fisik) |
| received_at | TIMESTAMP | NULLABLE |

### 2.11 `consumable_items`
*(Fitur Master bahan habis pakai)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| item_code | VARCHAR(50) | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| unit | VARCHAR(30) | NOT NULL |
| category | VARCHAR(100) | NULLABLE — teks bebas (lihat keputusan terbuka §0) |
| minimum_stock | DECIMAL(10,2) | NOT NULL, DEFAULT 0 |
| current_stock | DECIMAL(10,2) | NOT NULL, DEFAULT 0 — di-update aplikasi tiap ada mutasi, direkonsiliasi lewat stock opname |

`UNIQUE (school_unit_id, item_code)`.

### 2.12 `consumable_stock_mutations` (append-only, tanpa `updated_at`)
*(Fitur Mutasi stok masuk/keluar)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| consumable_item_id | BIGINT UNSIGNED | FK → `consumable_items.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| mutation_type | ENUM('in','out') | NOT NULL |
| quantity | DECIMAL(10,2) | NOT NULL |
| reference_type | ENUM('procurement','usage','adjustment','opname') | NULLABLE |
| reference_id | BIGINT UNSIGNED | NULLABLE — mis. `procurements.id` atau `consumable_stock_opnames.id` |
| facility_room_id | BIGINT UNSIGNED | NULLABLE — FK → `facility_rooms.id`, tujuan pemakaian |
| mutated_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| notes | VARCHAR(255) | NULLABLE |
| occurred_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.13 `consumable_stock_opnames`
*(Fitur Stock opname — header)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| opname_date | DATE | NOT NULL |
| conducted_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| status | ENUM('draft','final') | NOT NULL, DEFAULT 'draft' |
| notes | TEXT | NULLABLE |

### 2.14 `consumable_stock_opname_items`
*(Fitur Stock opname — detail per item)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| stock_opname_id | BIGINT UNSIGNED | FK → `consumable_stock_opnames.id`, NOT NULL |
| consumable_item_id | BIGINT UNSIGNED | FK → `consumable_items.id`, NOT NULL |
| system_stock | DECIMAL(10,2) | NOT NULL — diambil dari `consumable_items.current_stock` saat opname dibuat |
| physical_stock | DECIMAL(10,2) | NOT NULL — hasil hitung fisik |
| difference | DECIMAL(10,2) | NOT NULL — `physical_stock - system_stock` |
| notes | VARCHAR(255) | NULLABLE |

`UNIQUE (stock_opname_id, consumable_item_id)`. Saat opname di-*finalize*, tiap baris dengan
`difference != 0` menghasilkan satu baris baru di `consumable_stock_mutations`
(`reference_type = 'opname'`) dan meng-update `consumable_items.current_stock`.

## 3. SQL Migration Reference (MariaDB 10.5, InnoDB, utf8mb4)

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. facility_sites
CREATE TABLE facility_sites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NULL,
  land_area_m2 DECIMAL(10,2) NULL,
  ownership_status ENUM('milik_sendiri','sewa','pinjam','hibah') NULL,
  certificate_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. facility_buildings
CREATE TABLE facility_buildings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  facility_site_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  building_function VARCHAR(100) NULL,
  floor_count SMALLINT UNSIGNED NULL,
  building_area_m2 DECIMAL(10,2) NULL,
  construction_year YEAR NULL,
  condition ENUM('baik','rusak_ringan','rusak_sedang','rusak_berat') NOT NULL DEFAULT 'baik',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fb_site FOREIGN KEY (facility_site_id) REFERENCES facility_sites(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. facility_rooms
CREATE TABLE facility_rooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  facility_building_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  room_code VARCHAR(50) NOT NULL,
  room_name VARCHAR(150) NOT NULL,
  room_type ENUM('ruang_kelas','laboratorium','perpustakaan','ruang_guru','ruang_kepsek','uks','gudang','toilet','aula','lapangan','kantin','lainnya') NOT NULL,
  floor_number SMALLINT NULL,
  area_m2 DECIMAL(10,2) NULL,
  capacity SMALLINT UNSIGNED NULL,
  condition ENUM('baik','rusak_ringan','rusak_sedang','rusak_berat') NOT NULL DEFAULT 'baik',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_room_code (facility_building_id, room_code),
  CONSTRAINT fk_fr_building FOREIGN KEY (facility_building_id) REFERENCES facility_buildings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. assets
CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  facility_room_id BIGINT UNSIGNED NULL,
  asset_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NULL,
  acquisition_value DECIMAL(15,2) NULL,
  acquisition_date DATE NULL,
  condition ENUM('baik','rusak_ringan','rusak_berat') NOT NULL DEFAULT 'baik',
  qr_code VARCHAR(255) NULL UNIQUE,
  status ENUM('active','disposed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assets_room FOREIGN KEY (facility_room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. asset_mutations
CREATE TABLE asset_mutations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  from_room_id BIGINT UNSIGNED NULL,
  to_room_id BIGINT UNSIGNED NOT NULL,
  mutated_by BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  mutated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_am_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT fk_am_from_room FOREIGN KEY (from_room_id) REFERENCES facility_rooms(id),
  CONSTRAINT fk_am_to_room FOREIGN KEY (to_room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. facility_bookings
CREATE TABLE facility_bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  facility_room_id BIGINT UNSIGNED NULL,
  other_facility_name VARCHAR(150) NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fb_room_date (facility_room_id, booking_date),
  CONSTRAINT fk_fbk_room FOREIGN KEY (facility_room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. facility_booking_approvals
CREATE TABLE facility_booking_approvals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  facility_booking_id BIGINT UNSIGNED NOT NULL,
  approver_user_id BIGINT UNSIGNED NOT NULL,
  approval_level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fba_booking FOREIGN KEY (facility_booking_id) REFERENCES facility_bookings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. maintenance_requests
CREATE TABLE maintenance_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  asset_id BIGINT UNSIGNED NULL,
  facility_room_id BIGINT UNSIGNED NULL,
  reported_by BIGINT UNSIGNED NOT NULL,
  damage_report TEXT NOT NULL,
  repair_status ENUM('dilaporkan','diproses','selesai','ditutup') NOT NULL DEFAULT 'dilaporkan',
  cost DECIMAL(15,2) NULL,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mr_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT fk_mr_room FOREIGN KEY (facility_room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. vendors
CREATE TABLE vendors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(150) NULL,
  category VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. procurements
CREATE TABLE procurements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  vendor_id BIGINT UNSIGNED NULL,
  item_name VARCHAR(150) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(30) NULL,
  status ENUM('diajukan','disetujui','diterima','ditolak') NOT NULL DEFAULT 'diajukan',
  requested_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  finance_reference_id BIGINT UNSIGNED NULL,
  received_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_proc_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. consumable_items
CREATE TABLE consumable_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  category VARCHAR(100) NULL,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_consumable_code (school_unit_id, item_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. consumable_stock_mutations
CREATE TABLE consumable_stock_mutations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  consumable_item_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  mutation_type ENUM('in','out') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reference_type ENUM('procurement','usage','adjustment','opname') NULL,
  reference_id BIGINT UNSIGNED NULL,
  facility_room_id BIGINT UNSIGNED NULL,
  mutated_by BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(255) NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_csm_item_time (consumable_item_id, occurred_at),
  CONSTRAINT fk_csm_item FOREIGN KEY (consumable_item_id) REFERENCES consumable_items(id),
  CONSTRAINT fk_csm_room FOREIGN KEY (facility_room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. consumable_stock_opnames
CREATE TABLE consumable_stock_opnames (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  opname_date DATE NOT NULL,
  conducted_by BIGINT UNSIGNED NOT NULL,
  status ENUM('draft','final') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. consumable_stock_opname_items
CREATE TABLE consumable_stock_opname_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_opname_id BIGINT UNSIGNED NOT NULL,
  consumable_item_id BIGINT UNSIGNED NOT NULL,
  system_stock DECIMAL(10,2) NOT NULL,
  physical_stock DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_opname_item (stock_opname_id, consumable_item_id),
  CONSTRAINT fk_csoi_opname FOREIGN KEY (stock_opname_id) REFERENCES consumable_stock_opnames(id),
  CONSTRAINT fk_csoi_item FOREIGN KEY (consumable_item_id) REFERENCES consumable_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. Seed Data Dummy (untuk testing lokal)

```sql
INSERT INTO facility_sites (school_unit_id, name, address, land_area_m2, ownership_status)
VALUES (1, 'Lahan Kampus Utama', 'Jl. Contoh No. 1', 5000.00, 'milik_sendiri');

INSERT INTO facility_buildings (facility_site_id, school_unit_id, name, building_function, floor_count, condition)
VALUES (1, 1, 'Gedung A', 'ruang kelas', 2, 'baik'),
       (1, 1, 'Lapangan Olahraga', 'lapangan olahraga', 0, 'baik');

INSERT INTO facility_rooms (facility_building_id, school_unit_id, room_code, room_name, room_type, floor_number, capacity, condition)
VALUES (1, 1, 'A101', 'Ruang Kelas 7A', 'ruang_kelas', 1, 32, 'baik'),
       (1, 1, 'A102', 'Ruang Kelas 7B', 'ruang_kelas', 1, 32, 'baik'),
       (1, 1, 'GDG', 'Ruang Guru', 'ruang_guru', 1, 20, 'baik'),
       (2, 1, 'LAP1', 'Lapangan Basket', 'lapangan', 0, NULL, 'baik');

INSERT INTO assets (school_unit_id, facility_room_id, asset_code, name, category, acquisition_value, acquisition_date, condition)
VALUES (1, 1, 'AST-0001', 'Meja Siswa', 'furnitur', 350000.00, '2024-07-01', 'baik'),
       (1, 1, 'AST-0002', 'Kursi Siswa', 'furnitur', 250000.00, '2024-07-01', 'baik'),
       (1, 3, 'AST-0003', 'Proyektor', 'elektronik', 4500000.00, '2024-01-15', 'baik');

INSERT INTO vendors (school_unit_id, name, contact, category)
VALUES (1, 'CV Sumber Sarana', '021-9998888', 'furnitur & ATK');

INSERT INTO consumable_items (school_unit_id, item_code, name, unit, category, minimum_stock, current_stock)
VALUES (1, 'BHP-0001', 'Kertas A4', 'rim', 'ATK', 5, 20),
       (1, 'BHP-0002', 'Spidol Whiteboard', 'buah', 'ATK', 10, 30),
       (1, 'BHP-0003', 'Sabun Cuci Tangan', 'botol', 'kebersihan', 5, 8);
```

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat, 14 tabel, mengikuti pola `erd-coreservice.md`. Status: draf kerja — 4 keputusan sementara di `rancangan-sarpras.md` §5 belum final, review sebelum migration dijalankan ke production. |

