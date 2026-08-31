# AI-REF: Modul Kantin & Cashless Santri (`kantin`)

> Dokumen referensi teknis modul Kantin untuk AI Agent. Data diambil langsung dari 18 berkas migrasi Knex aktual, router/controller backend, dan router frontend portal.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/kantin/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/kantin/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/kantin/`
- **Database Engine:** MariaDB 10.5 (`aldepos_kantin` / `u622997391_dbkantin`)
- **Status Implementasi:** `jalan-produksi` (Master Vendor & Produk Konsinyasi Titipan, Penerimaan & Retur Barang, POS Kasir Digital Cashless/Tunai/QRIS, Manajemen Saldo & PIN Dompet Santri, Kebijakan Limit Jajan Harian, Bagi Hasil Kantin & Hak Vendor, Parent Control, Laporan Penjualan)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (18 Tabel)

### 2.1 Akses & Pengaturan Menu Internal

#### `access_menus` (Menu Navigasi Modul Kantin)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `menu_key` | `VARCHAR(100)` | NO | - | `UNIQUE` (e.g. `pos`, `wallet`, `vendors`, `reports`) |
| `menu_name` | `VARCHAR(150)` | NO | - | - |
| `path` | `VARCHAR(200)` | NO | - | Path route frontend |
| `icon` | `VARCHAR(100)` | YES | `NULL` | - |
| `sort_order` | `INT UNSIGNED` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `role_menu_access` (Pivot Role - Hak Akses Menu)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `role_name` | `VARCHAR(100)` | NO | - | `'admin','kepala_kantin','kasir','bendahara'` |
| `access_menu_id`| `BIGINT UNSIGNED` | NO | - | `FK -> access_menus(id) CASCADE/CASCADE` |
| `can_access` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_role_menu (role_name, access_menu_id)`

---

### 2.2 Vendor, Kategori & Produk Konsinyasi

#### `vendors` (Mitra Vendor / Penyedia Titipan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `vendor_name` | `VARCHAR(150)` | NO | - | - |
| `phone` | `VARCHAR(30)` | YES | `NULL` | - |
| `address` | `TEXT` | YES | `NULL` | - |
| `canteen_share_pct`| `DECIMAL(5,2)` | NO | `10.00` | Persentase Bagi Hasil Kantin (e.g. 10%) |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `status_changed_at`| `TIMESTAMP` | YES | `NULL` | - |
| `status_note` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_v_school_unit (school_unit_id)`

#### `product_categories` (Kategori Menu & Produk)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `category_name` | `VARCHAR(100)` | NO | - | e.g. "Makanan Berat", "Minuman", "Snack Halal" |
| `description` | `TEXT` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `status_changed_at`| `TIMESTAMP` | YES | `NULL` | - |
| `status_note` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_pc_school_unit (school_unit_id)`

#### `vendor_products` (Katalog Menu & Produk Makanan/Minuman)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `vendor_id` | `BIGINT UNSIGNED` | NO | - | `FK -> vendors(id) CASCADE/CASCADE` |
| `category_id` | `BIGINT UNSIGNED` | NO | - | `FK -> product_categories(id) CASCADE/CASCADE` |
| `product_code` | `VARCHAR(50)` | NO | - | e.g. "PRD-001" |
| `product_name` | `VARCHAR(150)` | NO | - | - |
| `barcode` | `VARCHAR(100)` | YES | `NULL` | `UNIQUE` |
| `cost_price` | `DECIMAL(12,2)` | NO | - | Harga Pokok Beli / Setor Vendor |
| `sale_price` | `DECIMAL(12,2)` | NO | - | Harga Jual ke Santri |
| `stock_qty` | `INT` | NO | `0` | Stok Tersedia di Kantin |
| `min_stock_alert`| `INT` | NO | `5` | - |
| `is_halal_certified`| `TINYINT(1)` | NO | `1` | Sertifikasi Halal |
| `halal_cert_number` | `VARCHAR(100)` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `status_changed_at`| `TIMESTAMP` | YES | `NULL` | - |
| `status_note` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_vp_unit_code (school_unit_id, product_code)`, `idx_vp_school_unit (school_unit_id)`

---

### 2.3 Logistik Penitipan & Retur Barang

#### `goods_receipts` (Penerimaan / Penitipan Barang dari Vendor)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `vendor_id` | `BIGINT UNSIGNED` | NO | - | `FK -> vendors(id) CASCADE/CASCADE` |
| `receipt_date` | `DATE` | NO | - | - |
| `note` | `VARCHAR(255)` | YES | `NULL` | - |
| `received_by` | `BIGINT UNSIGNED` | NO | - | User ID Staf Penerima |
| `received_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_gr_school_unit (school_unit_id)`

#### `goods_receipt_items` (Rincian Item Penitipan Barang)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `goods_receipt_id`| `BIGINT UNSIGNED` | NO | - | `FK -> goods_receipts(id) CASCADE/CASCADE` |
| `vendor_product_id`| `BIGINT UNSIGNED`| NO | - | `FK -> vendor_products(id) CASCADE/CASCADE` |
| `qty_received` | `INT UNSIGNED` | NO | - | Jumlah Titipan Masuk |
| `cost_price` | `DECIMAL(12,2)` | NO | - | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `product_returns` (Retur Sisa / Rusak ke Vendor)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `vendor_id` | `BIGINT UNSIGNED` | NO | - | `FK -> vendors(id) CASCADE/CASCADE` |
| `vendor_product_id`| `BIGINT UNSIGNED`| NO | - | `FK -> vendor_products(id) CASCADE/CASCADE` |
| `qty_returned` | `INT UNSIGNED` | NO | - | Jumlah Retur |
| `return_reason` | `VARCHAR(150)` | NO | - | 'sisa_harian', 'rusak', 'kadaluarsa' |
| `note` | `VARCHAR(255)` | YES | `NULL` | - |
| `returned_by` | `BIGINT UNSIGNED` | NO | - | User ID Staf Kantin |
| `returned_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_pr_school_unit (school_unit_id)`

---

### 2.4 Dompet Cashless Santri, QR Code & Limit Harian

#### `canteen_students` (Akun Dompet Cashless Santri)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `UNIQUE` (ID Siswa dari Akademik) |
| `qr_code` | `VARCHAR(150)` | YES | `NULL` | `UNIQUE` (Barcode / Token Kartu Santri) |
| `cached_student_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `cached_class_group_name`| `VARCHAR(100)`| YES | `NULL` | - |
| `wallet_balance` | `DECIMAL(12,2)` | NO | `0.00` | Saldo Dompet Digital Santri |
| `child_pin_hash` | `VARCHAR(255)` | YES | `NULL` | PIN Santri di Kasir POS |
| `parent_pin_hash` | `VARCHAR(255)` | YES | `NULL` | PIN Otorisasi Orang Tua |
| `custom_daily_limit`| `DECIMAL(12,2)`| YES | `NULL` | Override Batas Jajan Khusus |
| `is_blocked_by_parent`| `TINYINT(1)` | NO | `0` | Saklar Pemblokiran Kartu |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `status_changed_at`| `TIMESTAMP` | YES | `NULL` | - |
| `status_note` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_cs_school_unit (school_unit_id)`

#### `daily_spending_limits` (Kebijakan Batas Jajan Satuan Pendidikan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `limit_name` | `VARCHAR(100)` | NO | - | e.g. "Batas Maksimal Reguler Santri" |
| `limit_amount` | `DECIMAL(12,2)` | NO | - | Nominal Batas Harian (e.g. Rp 25.000) |
| `valid_from` | `DATE` | NO | - | - |
| `valid_until` | `DATE` | YES | `NULL` | - |
| `note` | `VARCHAR(255)` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `status_changed_at`| `TIMESTAMP` | YES | `NULL` | - |
| `status_note` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_dsl_school_unit (school_unit_id)`

---

### 2.5 Transaksi Kasir POS & Mutasi Dompet

#### `sales_transactions` (Transaksi Penjualan Kasir POS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `buyer_type` | `ENUM` | NO | - | `'student','non_student'` |
| `canteen_student_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> canteen_students(id) SET NULL` |
| `buyer_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `payment_method` | `ENUM` | NO | - | `'wallet','cash','qris','other'` |
| `discount_amount` | `DECIMAL(12,2)` | NO | `0.00` | - |
| `total_amount` | `DECIMAL(12,2)` | NO | - | Total Pembayaran |
| `cashier_id` | `BIGINT UNSIGNED` | NO | - | User ID Kasir |
| `transaction_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_st_school_unit (school_unit_id)`

#### `sales_transaction_items` (Rincian Item Penjualan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `sales_transaction_id`| `BIGINT UNSIGNED`| NO | - | `FK -> sales_transactions(id) CASCADE/CASCADE` |
| `vendor_product_id`| `BIGINT UNSIGNED`| NO | - | `FK -> vendor_products(id) RESTRICT/CASCADE` |
| `qty` | `INT UNSIGNED` | NO | - | - |
| `cost_price` | `DECIMAL(12,2)` | NO | - | HPP |
| `sale_price` | `DECIMAL(12,2)` | NO | - | Harga Jual |
| `subtotal_cost` | `DECIMAL(12,2)` | NO | - | `qty * cost_price` |
| `subtotal_price` | `DECIMAL(12,2)` | NO | - | `qty * sale_price` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `wallet_transactions` (Mutasi Saldo Dompet Santri)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `canteen_student_id`| `BIGINT UNSIGNED`| NO | - | `FK -> canteen_students(id) CASCADE/CASCADE` |
| `transaction_type`| `ENUM` | NO | - | `'top_up','withdrawal','purchase'` |
| `amount` | `DECIMAL(12,2)` | NO | - | Nominal Mutasi |
| `balance_after` | `DECIMAL(12,2)` | NO | - | Saldo Akhir Setelah Transaksi |
| `payment_method` | `ENUM` | YES | `NULL` | `'cash','transfer','qris','other'` |
| `sales_transaction_id`| `BIGINT UNSIGNED`| YES| `NULL` | `FK -> sales_transactions(id) SET NULL` |
| `processed_by` | `BIGINT UNSIGNED` | NO | - | User ID Petugas Kasir/Admin |
| `occurred_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_wt_school_unit (school_unit_id)`

---

### 2.6 Bagi Hasil, Settlement Vendor, Pengeluaran & Audit Logs

#### `canteen_fee_payments` (Penyetoran Hak Bagi Hasil Kantin ke Yayasan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `period_start` | `DATE` | NO | - | - |
| `period_end` | `DATE` | NO | - | - |
| `amount` | `DECIMAL(12,2)` | NO | - | Total Setoran Hak Yayasan |
| `paid_by` | `BIGINT UNSIGNED` | NO | - | Petugas yang menyetorkan |
| `paid_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_cfp_school_unit (school_unit_id)`

#### `vendor_fee_payments` (Penyelesaian Pembayaran / Settlement Vendor)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `vendor_id` | `BIGINT UNSIGNED` | NO | - | `FK -> vendors(id) CASCADE/CASCADE` |
| `period_start` | `DATE` | NO | - | - |
| `period_end` | `DATE` | NO | - | - |
| `amount` | `DECIMAL(12,2)` | NO | - | Total Realisasi Bayar ke Vendor |
| `paid_by` | `BIGINT UNSIGNED` | NO | - | Bendahara / Kasir Kantin |
| `paid_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_vfp_school_unit (school_unit_id)`

#### `operational_expenses` (Pengeluaran Operasional Kantin)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `expense_name` | `VARCHAR(150)` | NO | - | e.g. "Gas Elpiji", "Es Batu", "Plastik & Sedotan" |
| `amount` | `DECIMAL(12,2)` | NO | - | - |
| `expense_date` | `DATE` | NO | - | - |
| `note` | `VARCHAR(255)` | YES | `NULL` | - |
| `recorded_by` | `BIGINT UNSIGNED` | NO | - | Petugas yang mencatat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_oe_school_unit (school_unit_id)`

#### `canteen_activity_logs` (Audit Log Modul Kantin)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `actor_user_id` | `BIGINT UNSIGNED` | YES | `NULL` | User Core Service |
| `action` | `VARCHAR(100)` | NO | - | e.g. "CREATE_TRANSACTION", "TOP_UP_WALLET" |
| `target_table` | `VARCHAR(100)` | YES | `NULL` | - |
| `target_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `note` | `VARCHAR(255)` | YES | `NULL` | - |
| `occurred_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `canteen_webhook_events` (Event Webhook Kantin)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `event_type` | `VARCHAR(100)` | NO | - | `canteen.wallet.top_up`, `canteen.purchase.completed` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `payload` | `JSON` | NO | - | Payload data event |
| `published_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

## 3. Kontrak API Ringkas (`/api/v1/kantin`)

### 3.1 Vendor & Produk Titipan
| Method | Endpoint Path | Izin / Role Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/vendors` | `admin`, `kepala_kantin` | Query: `?status=&search=` | `{ vendors: array }` |
| `POST` | `/vendors` | `admin`, `kepala_kantin` | `{ vendor_name: string, phone?: string, address?: string, canteen_share_pct?: number }` | `{ id: number, vendor_name: string }` |
| `GET` | `/vendors/:id` | `admin`, `kepala_kantin` | - | `{ vendor: object, products: array }` |
| `PUT` | `/vendors/:id` | `admin`, `kepala_kantin` | `{ vendor_name: string, phone?: string, address?: string, canteen_share_pct?: number }` | `{ id: number, updated: boolean }` |
| `PATCH`| `/vendors/:id/status` | `admin`, `kepala_kantin` | `{ status: 'active'\|'inactive', status_note?: string }` | `{ id: number, status: string }` |
| `GET` | `/product-categories` | `admin`, `kepala_kantin` | Query: `?status=` | `{ categories: array }` |
| `POST` | `/product-categories` | `admin`, `kepala_kantin` | `{ category_name: string, description?: string }` | `{ id: number }` |
| `GET` | `/vendor-products` | `admin`, `kepala_kantin`, `kasir` | Query: `?vendor_id=&category_id=&status=&search=` | `{ products: array }` |
| `POST` | `/vendor-products` | `admin`, `kepala_kantin` | `{ vendor_id: number, category_id: number, product_code: string, product_name: string, barcode?: string, cost_price: number, sale_price: number, min_stock_alert?: number, is_halal_certified?: boolean }` | `{ id: number }` |
| `PUT` | `/vendor-products/:id`| `admin`, `kepala_kantin` | `{ product_name: string, cost_price: number, sale_price: number, barcode?: string }` | `{ id: number, updated: boolean }` |
| `POST` | `/vendor-products/generate-barcode`| `admin`, `kepala_kantin`| - | `{ barcode: string }` |
| `POST` | `/goods-receipts` | `admin`, `kepala_kantin` | `{ vendor_id: number, receipt_date: string, note?: string, items: array<{ vendor_product_id: number, qty_received: number, cost_price: number }> }` | `{ id: number, items_count: number }` |
| `POST` | `/product-returns` | `admin`, `kepala_kantin`, `kasir`| `{ vendor_id: number, vendor_product_id: number, qty_returned: number, return_reason: string, note?: string }` | `{ id: number }` |

### 3.2 Akun Cashless Santri & Limit Jajan
| Method | Endpoint Path | Izin / Role Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/canteen-students` | `admin`, `kepala_kantin` | Query: `?status=&search=&page=&limit=` | `{ students: array, pagination: object }` |
| `GET` | `/canteen-students/:student_id`| `admin`, `kepala_kantin` | - | `{ student: object, wallet_balance: number, custom_daily_limit: number, is_blocked_by_parent: boolean }` |
| `POST` | `/canteen-students/:student_id/generate-qr`| `admin`, `kepala_kantin`| - | `{ qr_code: string }` |
| `POST` | `/canteen-students/:student_id/reset-child-pin`| `admin`, `kepala_kantin`| `{ new_pin: string }` | `{ success: boolean }` |
| `GET` | `/daily-spending-limits` | `admin`, `kepala_kantin` | - | `{ limits: array }` |
| `POST` | `/daily-spending-limits` | `admin`, `kepala_kantin` | `{ limit_name: string, limit_amount: number, valid_from: string, valid_until?: string }` | `{ id: number }` |

### 3.3 Transaksi POS Kasir, Dompet & Pembagian Hasil
| Method | Endpoint Path | Izin / Role Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `POST` | `/sales-transactions` | `admin`, `kepala_kantin`, `kasir` | `{ buyer_type: 'student'\|'non_student', student_id?: number, payment_method: 'wallet'\|'cash'\|'qris', child_pin?: string, items: array<{ vendor_product_id: number, qty: number }> }` | `{ id: number, total_amount: number, remaining_wallet_balance?: number }` |
| `GET` | `/sales-transactions` | `admin`, `kepala_kantin`, `kasir`, `bendahara` | Query: `?start_date=&end_date=&payment_method=&page=&limit=` | `{ transactions: array, pagination: object }` |
| `GET` | `/sales-transactions/:id` | `admin`, `kepala_kantin`, `kasir`, `bendahara` | - | `{ transaction: object, items: array }` |
| `POST` | `/wallet-transactions/top-up` | `admin`, `kepala_kantin`, `bendahara` | `{ student_id: number, amount: number, payment_method: string }` | `{ transaction_id: number, new_balance: number }` |
| `POST` | `/wallet-transactions/withdrawal`| `admin`, `kepala_kantin`, `bendahara`| `{ student_id: number, amount: number }` | `{ transaction_id: number, new_balance: number }` |
| `GET` | `/receivables/canteen-share` | `admin`, `kepala_kantin`, `bendahara` | Query: `?start_date=&end_date=` | `{ total_canteen_share: number, summary: array }` |
| `GET` | `/receivables/vendor-share` | `admin`, `kepala_kantin`, `bendahara` | Query: `?vendor_id=&start_date=&end_date=` | `{ vendors: array<{ vendor_id, vendor_name, total_sales, vendor_share_amount }> }` |
| `POST` | `/canteen-fee-payments` | `admin`, `kepala_kantin`, `bendahara` | `{ period_start: string, period_end: string, amount: number }` | `{ id: number }` |
| `POST` | `/vendor-fee-payments` | `admin`, `kepala_kantin`, `bendahara` | `{ vendor_id: number, period_start: string, period_end: string, amount: number }` | `{ id: number }` |
| `POST` | `/operational-expenses` | `admin`, `kepala_kantin`, `bendahara` | `{ expense_name: string, amount: number, expense_date: string, note?: string }` | `{ id: number }` |
| `GET` | `/dashboard/summary` | `admin`, `kepala_kantin`, `kasir`, `bendahara` | - | `{ today_sales: number, today_topup: number, total_students_wallet: number, low_stock_products: number }` |

### 3.4 Parent Control (Orang Tua Santri)
| Method | Endpoint Path | Izin / Role Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/parent/students/:student_id/spending-history`| `orangtua`, `admin` | Query: `?start_date=&end_date=` | `{ purchases: array, topups: array, current_balance: number }` |
| `PUT` | `/parent/students/:student_id/spending-limit` | `orangtua`, `admin` | `{ custom_daily_limit: number }` | `{ success: boolean }` |
| `PATCH`| `/parent/students/:student_id/block` | `orangtua`, `admin` | `{ is_blocked: boolean }` | `{ is_blocked: boolean }` |
| `POST` | `/parent/students/:student_id/change-pin` | `orangtua`, `admin` | `{ current_pin: string, new_pin: string }` | `{ success: boolean }` |

---

## 4. Workflows & State Machines

- **Alur Transaksi Kasir POS Digital:** Kasir scan QR/barcode santri $\rightarrow$ sistem memvalidasi: (1) status blokir orang tua (`is_blocked_by_parent`), (2) kecukupan saldo dompet (`wallet_balance`), (3) batas limit jajan harian $\rightarrow$ santri input PIN $\rightarrow$ saldo dompet terpotong otomatis, stok berkurang, transaksi tersimpan di `sales_transactions` & `wallet_transactions`.
- **Alur Penitipan & Konsinyasi Vendor:** Vendor kirim barang $\rightarrow$ dicatat di `goods_receipts` (stok bertambah) $\rightarrow$ barang terjual di POS kasir $\rightarrow$ sisa barang diretur via `product_returns` (stok berkurang) $\rightarrow$ sistem menghitung bagi hasil: (1) Hak Vendor = Total Penjualan - Bagi Hasil Kantin, (2) Hak Kantin = `% Bagi Hasil` $\rightarrow$ penyelesaian settlement via `vendor_fee_payments`.
- **Parent Self-Control Lifecycle:** Orang tua memantau riwayat jajan anak via Portal Orangtua $\rightarrow$ dapat menyetel batas maksimal jajan per hari (`custom_daily_limit`) atau memblokir kartu seketika (`is_blocked_by_parent: true`) jika kartu santri hilang.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/kantin/login` | `src/apps/kantin/pages/Login.jsx` | Login kasir, pengelola & kepala kantin |
| `/kantin/dashboard` | `src/apps/kantin/pages/Dashboard.jsx` | Ringkasan omset harian, grafik penjualan, total saldo santri & alert stok |
| `/kantin/pos` | `src/apps/kantin/pages/TransaksiPenjualan.jsx` | Kasir POS: scan QR/barcode, kalkulator belanja, validasi PIN & print struk |
| `/kantin/wallet` *(alias: `/kantin/topup`)* | `src/apps/kantin/pages/TopUpTarikTunai.jsx` | Teller top-up saldo kartu santri, tarik tunai & histori mutasi kasir |
| `/kantin/students` *(alias: `/kantin/saldo-siswa`)*| `src/apps/kantin/pages/DataSiswaKantin.jsx` | Data kartu santri, generate barcode/QR, reset PIN anak & status aktif |
| `/kantin/limits` *(alias: `/kantin/limit-jajan`)* | `src/apps/kantin/pages/LimitJajan.jsx` | Manajemen kebijakan batas maksimal belanja harian siswa per unit |
| `/kantin/products` *(alias: `/kantin/produk`)* | `src/apps/kantin/pages/ProdukVendor.jsx` | Katalog menu, harga pokok, harga jual, generate barcode & status halal |
| `/kantin/categories` *(alias: `/kantin/kategori`)* | `src/apps/kantin/pages/KategoriProduk.jsx` | Master kategori menu makanan basah, kering & minuman |
| `/kantin/vendors` *(alias: `/kantin/vendor`)* | `src/apps/kantin/pages/Vendor.jsx` | Master data mitra vendor titipan & persentase bagi hasil |
| `/kantin/goods-receipts` *(alias: `/kantin/penerimaan`)*| `src/apps/kantin/pages/PenerimaanBarang.jsx`| Form penerimaan penitipan barang dari vendor & input stok awal |
| `/kantin/product-returns` *(alias: `/kantin/retur`)* | `src/apps/kantin/pages/ReturBarang.jsx` | Pencatatan retur barang sisa/rusak ke vendor |
| `/kantin/receivables-canteen` | `src/apps/kantin/pages/PiutangHakKantin.jsx` | Rekapitulasi hak pendapatan bagi hasil kantin yayasan |
| `/kantin/receivables-vendor` *(alias: `/kantin/hak-vendor`)*| `src/apps/kantin/pages/HakVendor.jsx` | Rekapitulasi dan penyelesaian pembayaran hak vendor titipan |
| `/kantin/expenses` *(alias: `/kantin/pengeluaran`)*| `src/apps/kantin/pages/PengeluaranOperasional.jsx`| Pencatatan beban operasional kantin (gas, es batu, plastik) |
| `/kantin/reports` *(alias: `/kantin/laporan`)* | `src/apps/kantin/pages/LaporanKantin.jsx` | Laporan omset penjualan, per vendor, arus kasir & rekap konsumsi |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi token JWT SSO, data Satuan Pendidikan & profil yayasan.
  - `akademik`: Data siswa & santri aktif untuk registrasi kartu dompet cashless kantin (`cached_student_name`, `cached_class_group_name`).
  - `keuangan`: Menyetorkan pendapatan bagi hasil kantin yayasan (`canteen_fee_payments`) ke kas pendapatan sekolah.
- **Modul yang Memanggil Kantin (Consumers):**
  - `portal-orangtua`: Endpoint parent-facing (`/api/v1/kantin/parent/students/:student_id/*`) untuk monitoring jajan santri, riwayat belanja harian, limit jajan, dan blokir kartu.
  - `keuangan`: Menerima laporan omset penjualan kasir dan bagian laba kotor unit usaha kantin.
  - `manajemen`: Agregat laporan pendapatan unit bisnis mandiri yayasan untuk dashboard eksekutif.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Hardware Card Reader NFC / RFID Integration:** Saat ini transaksi kasir mendukung Barcode / QR Code scanner camera dan input PIN manual; integrasi driver pembaca kartu RFID/NFC fisik USB langsung ke browser masih dalam tahap roadmap.
2. **Auto-Sync Saldo dari Payment Gateway:** Top-up saldo saat ini dilakukan via kasir fisik kantin (tunai/transfer manual); integrasi top-up otomatis instan via Virtual Account langsung dari Portal Orangtua sedang disiapkan.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
