# erd-kantin.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 & 4.4 (prinsip arsitektur & konvensi penamaan global),
> `rancangan-kantin.md` Bagian 4–6 (ruang lingkup & keputusan penyesuaian arsitektur).
> Database: MariaDB 10.5, `utf8mb4`, InnoDB. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`, semua
> tabel punya `created_at`/`updated_at TIMESTAMP` kecuali disebutkan *append-only*. Pola mengikuti
> `erd-coreservice.md`.
>
> **Tidak ada FOREIGN KEY fisik ke database modul lain** (Core Service, Akademik, Kepegawaian,
> Keuangan) — kolom seperti `student_id`, `class_group_id`, `assigned_user_id` adalah ID biasa,
> divalidasi lewat pemanggilan service-layer modul pemiliknya (in-process, sesuai
> `ARSITEKTUR-SISTEM.md` §1.1), bukan `CONSTRAINT ... REFERENCES` lintas database.

## 0. Status Keputusan Terbuka (Final)

Seluruh keputusan telah disetujui developer pada 2026-08-18:
- Prioritas semua fitur = **Must** (77 fitur penuh).
- Hak kantin & vendor dicatat lokal di database Kantin (`canteen_fee_payments`, `vendor_fee_payments`), integrasi jurnal ke Keuangan disalurkan via webhook/service in-process.
- Metode bayar top up: ENUM `'cash'`, `'transfer'`, `'qris'`, `'other'`.
- Siswa menggunakan QR Code (kantin), produk fisik menggunakan Barcode.
- Limit jajan harian dikelola terpusat oleh Admin Kantin per rombel / satuan pendidikan (`daily_spending_limits`).
- Validasi `student_id` dan `employee_id` dipanggil in-process ke modul Akademik dan Kepegawaian.

## 1. Daftar Entitas (18 Tabel)

| Modul (`rancangan-kantin.md` §4) | Tabel | `school_unit_id`? |
|---|---|---|
| Konfigurasi (Jenis Akses, direinterpretasi) | `access_menus` | Tidak (global per instalasi Kantin) |
| Konfigurasi (Jenis Akses, direinterpretasi) | `role_menu_access` | Tidak |
| Produk | `vendors` | **Ya** |
| Produk | `product_categories` | **Ya** |
| Produk | `vendor_products` | **Ya** |
| Produk | `goods_receipts` | **Ya** |
| Produk | `goods_receipt_items` | Tidak langsung (ikut `goods_receipts`) |
| Produk | `product_returns` | **Ya** |
| Murid (atribut kantin saja) | `canteen_students` | **Ya** |
| Konfigurasi | `daily_spending_limits` | **Ya** |
| Keuangan | `wallet_transactions` | **Ya** |
| Penjualan | `sales_transactions` | **Ya** |
| Penjualan | `sales_transaction_items` | Tidak langsung (ikut `sales_transactions`) |
| Keuangan | `canteen_fee_payments` | **Ya** |
| Keuangan | `vendor_fee_payments` | **Ya** |
| Keuangan | `operational_expenses` | **Ya** |
| Keamanan (pendukung, tidak ada di draf asli tapi diperlukan) | `canteen_activity_logs` | Ya (nullable) |
| Integrasi (pendukung) | `canteen_webhook_events` | Ya (nullable) |

## 2. Detail Tabel

### 2.1 `access_menus`
*(Direinterpretasi dari fitur "Jenis Akses" #1–4, lihat `rancangan-kantin.md` §4)*
Daftar menu/fitur di dalam aplikasi Kantin yang bisa di-toggle aksesnya per role.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| menu_key | VARCHAR(100) | NOT NULL, UNIQUE — mis. `produk.vendor`, `keuangan.top_up` |
| menu_name | VARCHAR(150) | NOT NULL |
| description | VARCHAR(255) | NULLABLE |

### 2.2 `role_menu_access`
*(Direinterpretasi dari fitur "Jenis Akses"/"Role" #1–8)*
Toggle aktif/nonaktif akses menu per **role Core Service** (nama role, bukan FK fisik — role
sesungguhnya hidup di `roles` milik Core Service).

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| role_name | VARCHAR(100) | NOT NULL — nama role dari Core Service, mis. `kasir`, `kepala_kantin` |
| access_menu_id | BIGINT UNSIGNED | FK lokal → `access_menus.id`, NOT NULL |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

`UNIQUE (role_name, access_menu_id)`.

### 2.3 `vendors`
*(Fitur #14–17)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — ref Core Service |
| vendor_name | VARCHAR(150) | NOT NULL |
| contact | VARCHAR(150) | NULLABLE |
| address | TEXT | NULLABLE |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| status_changed_at | TIMESTAMP | NULLABLE |
| status_note | VARCHAR(255) | NULLABLE |

### 2.4 `product_categories`
*(Fitur #18–21)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| category_name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULLABLE |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| status_changed_at | TIMESTAMP | NULLABLE |
| status_note | VARCHAR(255) | NULLABLE |

### 2.5 `vendor_products`
*(Fitur #22–26)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| barcode | VARCHAR(100) | NULLABLE, UNIQUE — bisa digenerate belakangan (fitur #26) |
| product_name | VARCHAR(150) | NOT NULL |
| product_category_id | BIGINT UNSIGNED | FK → `product_categories.id`, NOT NULL |
| vendor_id | BIGINT UNSIGNED | FK → `vendors.id`, NOT NULL |
| unit | VARCHAR(50) | NOT NULL — satuan (pcs, bungkus, dst) |
| min_stock | INT UNSIGNED | NOT NULL, DEFAULT 0 |
| current_stock | INT UNSIGNED | NOT NULL, DEFAULT 0 — dihitung dari `goods_receipt_items` dikurangi `sales_transaction_items` & `product_returns` |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| status_changed_at | TIMESTAMP | NULLABLE |
| status_note | VARCHAR(255) | NULLABLE |

### 2.6 `goods_receipts`
*(Fitur #27–29 — header penerimaan barang titipan/belanja sendiri)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| vendor_id | BIGINT UNSIGNED | FK → `vendors.id`, NULLABLE (nullable untuk belanja sendiri kantin tanpa vendor) |
| invoice_number | VARCHAR(100) | NULLABLE |
| receipt_date | DATE | NOT NULL |
| receipt_type | ENUM('titipan','belanja_sendiri') | NOT NULL |
| status | ENUM('draft','completed') | NOT NULL, DEFAULT 'draft' |
| created_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |

### 2.7 `goods_receipt_items`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| goods_receipt_id | BIGINT UNSIGNED | FK → `goods_receipts.id`, NOT NULL |
| vendor_product_id | BIGINT UNSIGNED | FK → `vendor_products.id`, NOT NULL |
| qty | INT UNSIGNED | NOT NULL |
| cost_price | DECIMAL(12,2) | NOT NULL — harga beli |
| sale_price | DECIMAL(12,2) | NOT NULL — harga jual |
| expired_at | DATE | NULLABLE |

### 2.8 `product_returns`
*(Fitur #55–56)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| vendor_product_id | BIGINT UNSIGNED | FK → `vendor_products.id`, NOT NULL |
| return_type | ENUM('sisa','rusak') | NOT NULL |
| qty | INT UNSIGNED | NOT NULL |
| note | VARCHAR(255) | NULLABLE |
| returned_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| returned_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.9 `canteen_students`
*(Atribut kantin dari fitur #34–40, **bukan** data induk siswa — lihat `rancangan-kantin.md` §4)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| student_id | BIGINT UNSIGNED | NOT NULL, UNIQUE — ref **Akademik** (`students.id`), bukan FK fisik |
| cached_student_name | VARCHAR(150) | NULLABLE — cache tampilan, disegarkan via webhook Akademik, BUKAN sumber kebenaran |
| cached_class_group_name | VARCHAR(100) | NULLABLE — cache tampilan, sama seperti di atas |
| qr_code | VARCHAR(150) | NULLABLE, UNIQUE |
| wallet_balance | DECIMAL(12,2) | NOT NULL, DEFAULT 0 |
| child_pin_hash | VARCHAR(255) | NULLABLE — PIN anak khusus kantin (bukan PIN akun Core), di-hash |
| parent_pin_hash | VARCHAR(255) | NULLABLE — PIN ortu khusus kantin, di-hash |
| custom_daily_limit | DECIMAL(12,2) | NULLABLE — override limit oleh ortu (fitur #63) |
| is_blocked_by_parent | BOOLEAN | NOT NULL, DEFAULT FALSE — blokir jajan oleh ortu (fitur #64) |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| status_changed_at | TIMESTAMP | NULLABLE |
| status_note | VARCHAR(255) | NULLABLE |

### 2.10 `daily_spending_limits`
*(Fitur #41–44 — limit yang ditetapkan admin, berlaku sebagai default sebelum dipersempit ortu)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| limit_name | VARCHAR(100) | NOT NULL |
| limit_amount | DECIMAL(12,2) | NOT NULL |
| valid_from | DATE | NOT NULL |
| valid_until | DATE | NULLABLE |
| note | VARCHAR(255) | NULLABLE |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| status_changed_at | TIMESTAMP | NULLABLE |
| status_note | VARCHAR(255) | NULLABLE |

### 2.11 `wallet_transactions`
*(Fitur #45–46 — top up, tarik tunai, dan mutasi jajan dicatat di sini juga sebagai referensi)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| canteen_student_id | BIGINT UNSIGNED | FK → `canteen_students.id`, NOT NULL |
| transaction_type | ENUM('top_up','withdrawal','purchase') | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL — nilai absolut, tanda +/- ditentukan `transaction_type` |
| balance_after | DECIMAL(12,2) | NOT NULL |
| payment_method | ENUM('cash','transfer','qris','other') | NULLABLE — hanya untuk `top_up`/`withdrawal` |
| sales_transaction_id | BIGINT UNSIGNED | NULLABLE — FK → `sales_transactions.id`, hanya untuk `purchase` |
| processed_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service (bendahara/admin/sistem) |
| occurred_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.12 `sales_transactions`
*(Fitur #47 — header transaksi kasir)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| buyer_type | ENUM('student','non_student') | NOT NULL |
| canteen_student_id | BIGINT UNSIGNED | NULLABLE — FK → `canteen_students.id`, wajib jika `buyer_type = student` |
| buyer_name | VARCHAR(150) | NULLABLE — untuk pembeli non-siswa |
| payment_method | ENUM('wallet','cash','qris','other') | NOT NULL |
| discount_amount | DECIMAL(12,2) | NOT NULL, DEFAULT 0 |
| total_amount | DECIMAL(12,2) | NOT NULL |
| cashier_id | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service |
| transaction_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.13 `sales_transaction_items`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| sales_transaction_id | BIGINT UNSIGNED | FK → `sales_transactions.id`, NOT NULL |
| vendor_product_id | BIGINT UNSIGNED | FK → `vendor_products.id`, NOT NULL |
| qty | INT UNSIGNED | NOT NULL |
| cost_price | DECIMAL(12,2) | NOT NULL — diambil dari `goods_receipt_items` saat transaksi (snapshot) |
| sale_price | DECIMAL(12,2) | NOT NULL — snapshot harga jual saat transaksi |
| subtotal_cost | DECIMAL(12,2) | NOT NULL — `qty * cost_price` |
| subtotal_price | DECIMAL(12,2) | NOT NULL — `qty * sale_price` (dikurangi potongan khusus titipan bila ada) |

### 2.14 `canteen_fee_payments`
*(Fitur #51–52 — bayar hak kantin dari kas dompet; lihat Keputusan Terbuka §0 soal integrasi Keuangan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| period_start | DATE | NOT NULL |
| period_end | DATE | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| paid_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core Service (bendahara) |
| paid_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.15 `vendor_fee_payments`
*(Fitur #53–54 — bayar hak vendor dari kas kantin)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| vendor_id | BIGINT UNSIGNED | FK → `vendors.id`, NOT NULL |
| period_start | DATE | NOT NULL |
| period_end | DATE | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| paid_by | BIGINT UNSIGNED | NOT NULL |
| paid_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.16 `operational_expenses`
*(Fitur #57–58)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| expense_name | VARCHAR(150) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| expense_date | DATE | NOT NULL |
| note | VARCHAR(255) | NULLABLE |
| recorded_by | BIGINT UNSIGNED | NOT NULL |

### 2.17 `canteen_activity_logs`
*(Pendukung — tidak ada di draf asli, ditambahkan supaya reset PIN/blokir jajan/perubahan status
punya jejak audit lokal Kantin. Append-only, tidak punya `updated_at`.)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE |
| actor_user_id | BIGINT UNSIGNED | NULLABLE — ref `users.id` Core Service |
| action | VARCHAR(100) | NOT NULL |
| target_table | VARCHAR(100) | NULLABLE |
| target_id | BIGINT UNSIGNED | NULLABLE |
| note | VARCHAR(255) | NULLABLE |
| occurred_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.18 `canteen_webhook_events`
*(Pendukung integrasi — event yang dipublish Kantin ke Portal Orangtua/Keuangan, mengikuti format
`ARSITEKTUR-SISTEM.md` §4.3. Append-only.)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| event_type | VARCHAR(100) | NOT NULL — mis. `kantin.wallet.updated`, `kantin.fee.recorded` |
| school_unit_id | BIGINT UNSIGNED | NULLABLE |
| payload | JSON | NOT NULL |
| published_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

## 3. SQL Migrasi Awal (Referensi Manual — Tahap 2 pakai Knex)

> Query di bawah untuk referensi/testing manual lewat phpMyAdmin atau klien MySQL lokal. Untuk
> pengembangan sungguhan, tetap dibuat sebagai file migration Knex terpisah per tabel di
> `apps/api-backend/db/migrations/kantin/` (lihat `panduan-pengembangan-kantin.md` Tahap 2).

```sql
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE access_menus (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  menu_key VARCHAR(100) NOT NULL UNIQUE,
  menu_name VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_menu_access (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  access_menu_id BIGINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_menu (role_name, access_menu_id),
  CONSTRAINT fk_rma_menu FOREIGN KEY (access_menu_id) REFERENCES access_menus(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  vendor_name VARCHAR(150) NOT NULL,
  contact VARCHAR(150) NULL,
  address TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  status_changed_at TIMESTAMP NULL,
  status_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendors_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  status_changed_at TIMESTAMP NULL,
  status_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pc_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendor_products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  barcode VARCHAR(100) NULL UNIQUE,
  product_name VARCHAR(150) NOT NULL,
  product_category_id BIGINT UNSIGNED NOT NULL,
  vendor_id BIGINT UNSIGNED NOT NULL,
  unit VARCHAR(50) NOT NULL,
  min_stock INT UNSIGNED NOT NULL DEFAULT 0,
  current_stock INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  status_changed_at TIMESTAMP NULL,
  status_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vp_category FOREIGN KEY (product_category_id) REFERENCES product_categories(id),
  CONSTRAINT fk_vp_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  INDEX idx_vp_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE goods_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  vendor_id BIGINT UNSIGNED NULL,
  invoice_number VARCHAR(100) NULL,
  receipt_date DATE NOT NULL,
  receipt_type ENUM('titipan','belanja_sendiri') NOT NULL,
  status ENUM('draft','completed') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gr_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  INDEX idx_gr_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE goods_receipt_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goods_receipt_id BIGINT UNSIGNED NOT NULL,
  vendor_product_id BIGINT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  expired_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gri_receipt FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id),
  CONSTRAINT fk_gri_product FOREIGN KEY (vendor_product_id) REFERENCES vendor_products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  vendor_product_id BIGINT UNSIGNED NOT NULL,
  return_type ENUM('sisa','rusak') NOT NULL,
  qty INT UNSIGNED NOT NULL,
  note VARCHAR(255) NULL,
  returned_by BIGINT UNSIGNED NOT NULL,
  returned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_product FOREIGN KEY (vendor_product_id) REFERENCES vendor_products(id),
  INDEX idx_pr_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE canteen_students (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL UNIQUE,
  cached_student_name VARCHAR(150) NULL,
  cached_class_group_name VARCHAR(100) NULL,
  qr_code VARCHAR(150) NULL UNIQUE,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  child_pin_hash VARCHAR(255) NULL,
  parent_pin_hash VARCHAR(255) NULL,
  custom_daily_limit DECIMAL(12,2) NULL,
  is_blocked_by_parent BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  status_changed_at TIMESTAMP NULL,
  status_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cs_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE daily_spending_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  limit_name VARCHAR(100) NOT NULL,
  limit_amount DECIMAL(12,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NULL,
  note VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  status_changed_at TIMESTAMP NULL,
  status_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dsl_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sales_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  buyer_type ENUM('student','non_student') NOT NULL,
  canteen_student_id BIGINT UNSIGNED NULL,
  buyer_name VARCHAR(150) NULL,
  payment_method ENUM('wallet','cash','qris','other') NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  cashier_id BIGINT UNSIGNED NOT NULL,
  transaction_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_canteen_student FOREIGN KEY (canteen_student_id) REFERENCES canteen_students(id),
  INDEX idx_st_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sales_transaction_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_transaction_id BIGINT UNSIGNED NOT NULL,
  vendor_product_id BIGINT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  subtotal_cost DECIMAL(12,2) NOT NULL,
  subtotal_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sti_transaction FOREIGN KEY (sales_transaction_id) REFERENCES sales_transactions(id),
  CONSTRAINT fk_sti_product FOREIGN KEY (vendor_product_id) REFERENCES vendor_products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wallet_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  canteen_student_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('top_up','withdrawal','purchase') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash','transfer','qris','other') NULL,
  sales_transaction_id BIGINT UNSIGNED NULL,
  processed_by BIGINT UNSIGNED NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wt_canteen_student FOREIGN KEY (canteen_student_id) REFERENCES canteen_students(id),
  CONSTRAINT fk_wt_sales_transaction FOREIGN KEY (sales_transaction_id) REFERENCES sales_transactions(id),
  INDEX idx_wt_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE canteen_fee_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  paid_by BIGINT UNSIGNED NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cfp_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendor_fee_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  vendor_id BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  paid_by BIGINT UNSIGNED NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vfp_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  INDEX idx_vfp_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE operational_expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  expense_name VARCHAR(150) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  note VARCHAR(255) NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_oe_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE canteen_activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(100) NULL,
  target_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cal_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE canteen_webhook_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  school_unit_id BIGINT UNSIGNED NULL,
  payload JSON NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cwe_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. Seed Data Dummy (Testing Lokal)

```sql
INSERT INTO access_menus (menu_key, menu_name) VALUES
  ('produk.vendor', 'Manajemen Vendor'),
  ('produk.kategori', 'Kategori Produk'),
  ('produk.daftar', 'Daftar Produk Vendor'),
  ('produk.penerimaan', 'Penerimaan Barang'),
  ('penjualan.transaksi', 'Transaksi Penjualan'),
  ('keuangan.top_up', 'Top Up / Tarik Tunai'),
  ('keuangan.hak_kantin', 'Piutang & Hak Kantin'),
  ('keuangan.hak_vendor', 'Hak Vendor'),
  ('laporan.produk', 'Laporan Produk'),
  ('dashboard.utama', 'Dashboard Kantin');

-- Ganti school_unit_id di bawah dengan ID nyata dari database Core Service lokal (school_units)
INSERT INTO vendors (school_unit_id, vendor_name, contact, status)
VALUES (1, 'Vendor Snack Sehat', '0812-0000-0001', 'active');

INSERT INTO product_categories (school_unit_id, category_name, status)
VALUES (1, 'Minuman', 'active'), (1, 'Makanan Ringan', 'active');

INSERT INTO vendor_products (school_unit_id, barcode, product_name, product_category_id, vendor_id, unit, min_stock, current_stock)
VALUES (1, '8991234500001', 'Air Mineral 600ml', 1, 1, 'botol', 10, 50);

-- Ganti student_id dengan ID nyata dari database Akademik lokal (students) begitu Akademik ada
INSERT INTO canteen_students (school_unit_id, student_id, cached_student_name, cached_class_group_name, wallet_balance, status)
VALUES (1, 1001, 'Contoh Siswa Satu', 'Kelas 5A', 25000, 'active');

INSERT INTO daily_spending_limits (school_unit_id, limit_name, limit_amount, valid_from, status)
VALUES (1, 'Limit Default SD', 20000, '2026-08-18', 'active');
```

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | ERD awal dibuat, 18 tabel. Fitur Role/User/Rombel/Murid-identitas dari draf 77 baris **tidak** dijadikan tabel fisik (lihat `rancangan-kantin.md` §4/§6) — hanya `canteen_students` yang menyimpan atribut kantin dengan referensi `student_id` ke Akademik. Ditambahkan 2 tabel pendukung di luar draf asli: `canteen_activity_logs`, `canteen_webhook_events`. Status: **draft, menunggu review developer** sebelum dianggap final untuk migration Tahap 2 (lihat Keputusan Terbuka §0). |

*(Tambahkan baris baru di atas setiap ada perubahan skema — jangan hapus riwayat lama.)*
