Status: perlu-revisi
Diperbarui: 2026-08-24

# erd-dapur.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 & 4.4 (prinsip global, penamaan Inggris `snake_case`
> final), `rancangan-dapur.md` Bagian 4–5 (ruang lingkup 202 fitur & 7 keputusan final).
> Database: MariaDB 10.5. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`. Semua tabel punya
> `created_at`/`updated_at TIMESTAMP` kecuali tabel log *append-only* (disebut eksplisit).
> **Status: FINAL — 7 Keputusan di `rancangan-dapur.md` Bagian 5 telah ditetapkan (1A, 2B, 3B, 4C, 5B, 6A, 7A) dan skema siap dijadikan acuan file migrasi database Knex.**

## 0. Strategi Pengelompokan Tabel (Sesuai Keputusan Developer)

202 fitur dikonsolidasikan jadi **tabel generik per kategori** (bukan 1 tabel per sub-fitur),
karena banyak fitur berbagi pola kolom identik (lihat pola berulang di
`rancangan-dapur.md` Bagian 4: `kode,nama,kategori,status,periode,keterangan` untuk master;
`tanggal,objek,nilai,status,keterangan,PIC` untuk log umum; `tanggal,objek,indikator,hasil,
batas,PIC,catatan` untuk checklist; dst). Tabel generik memakai kolom **discriminator** (mis.
`master_type`, `log_type`, `check_type`) untuk membedakan sub-fitur di dalamnya.

Total: **~48 tabel** (rata-rata 1 tabel menaungi ±4 fitur — konsisten dengan volume 202 fitur
tanpa membuat 202 tabel terpisah). Berdasarkan arsitektur **Central Kitchen (Keputusan #2)**,
kolom `satuan_pendidikan_id` bersifat `NULLABLE` pada tabel master bahan baku, gudang persediaan,
dan produksi, namun bersifat **`NOT NULL` (Wajib)** pada tabel hilir yaitu distribusi makanan
(`kitchen_meal_distributions`) dan absensi makan (`kitchen_meal_attendances`).

## 1. Daftar Entitas per Kategori

### 1.1 Master Data (rancangan §4.1 — 14 fitur)

| Tabel | Menaungi Fitur | Catatan |
|---|---|---|
| `kitchen_ingredients` | Master bahan baku | Referensi ke `kitchen_units`, `kitchen_master_data` (kategori bahan), alergen via pivot |
| `kitchen_units` | Master satuan & konversi | + `kitchen_unit_conversions` (pivot rasio antar satuan) |
| `kitchen_unit_conversions` | (bagian dari fitur di atas) | Pivot `from_unit_id`/`to_unit_id`/`factor` |
| `kitchen_suppliers` | Master supplier | Data kontak, bukan transaksi |
| `kitchen_student_groups` | Master kelompok santri | Cache/referensi dari Akademik — `academic_ref_id`, tanpa FK fisik |
| `kitchen_operational_calendar` | Kalender hari operasional | Tanggal + status operasional (buka/libur/darurat) |
| `kitchen_system_parameters` | Parameter sistem dapur | Key-value, mirip `system_settings` Core |
| `kitchen_master_data` | Kategori bahan, lokasi penyimpanan, alat dapur, jenis makan, alergi & pantangan, jenis kemasan, standar kualitas bahan, hari besar/acara (8 fitur) | Generik, `master_type` ENUM pembeda |
| `kitchen_ingredient_allergens` | (pendukung Master bahan baku + Master alergi) | Pivot `ingredient_id` ↔ `kitchen_master_data` (type=allergen) |

### 1.2 Menu (rancangan §4.2 — 14 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_menus` | Perencanaan menu, Template mingguan, Siklus bulanan, Versi & histori, Penguncian, Substitusi, Kalender menu khusus, Usulan menu (8 fitur) — `menu_type` ENUM, `parent_menu_id` untuk versi/substitusi |
| `kitchen_menu_items` | Komponen menu per hidangan, porsi, qty |
| `kitchen_menu_nutrition` | Standar gizi/nutrisi menu, Alergen menu (per menu item, referensi `kitchen_master_data` type=allergen) |
| `kitchen_menu_diversity_checks` | Pengecekan keberagaman menu, Penandaan menu favorit — generik `check_type` |
| `kitchen_menu_cost_limits` | Batas biaya per porsi |
| `kitchen_menu_evaluations` | Evaluasi & feedback menu |

### 1.3 Resep & Standar Produksi (rancangan §4.3 — 15 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_recipes` | Master menu masakan, Resep standar, Resep per jumlah porsi, Standar porsi, Standar bumbu, Versi resep, Konversi resep batch, Persetujuan resep (8 fitur) |
| `kitchen_recipe_ingredients` | Komposisi bahan/bumbu per resep, termasuk Yield/bobot bersih |
| `kitchen_recipe_steps` | Langkah proses masak, Suhu/waktu proses standar, SOP sanitasi per proses, Standar penyajian (4 fitur) — `step_type` |
| `kitchen_recipe_references` | Foto referensi hidangan |
| `kitchen_recipe_cost_simulations` | Simulasi biaya resep |

### 1.4 Perencanaan Kebutuhan (rancangan §4.4 — 14 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_meal_plans` | Forecast jumlah porsi, Perencanaan porsi per kelas/kelompok, Buffer porsi (3 fitur) |
| `kitchen_material_requirements` | Kebutuhan bahan per menu/mingguan/bulanan, Net requirement setelah stok, Perencanaan bahan substitusi, Peringatan kebutuhan mendesak (6 fitur) — `period_type` ENUM |
| `kitchen_capacity_plans` | Perencanaan kapasitas dapur, Workload produksi, Rencana kebutuhan kemasan, Rencana kebutuhan tenaga kerja, Simulasi perubahan jumlah santri (5 fitur) — `plan_type` ENUM |

### 1.5 Anggaran & Biaya (rancangan §4.5 — 14 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_budgets` | Anggaran tahunan/bulanan/per porsi/per kelompok, Persetujuan anggaran, Komparasi anggaran vs realisasi (6 fitur) — `budget_scope` ENUM |
| `kitchen_cost_estimates` | Estimasi biaya menu, Simulasi biaya pekanan, Kontrol deviasi biaya | 
| `kitchen_cost_records` | Biaya bahan per porsi, Biaya waste, Biaya overhead dapur, Alokasi biaya per layanan makan (4 fitur, realisasi aktual) — `cost_type` ENUM, sumber: lihat Keputusan Terbuka #6 |
| `kitchen_spending_commitments` | Pengendalian komitmen belanja |

### 1.6 Pengadaan & Belanja (rancangan §4.6 — 15 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_purchase_requests` | Permintaan pembelian, Persetujuan pembelian |
| `kitchen_purchase_orders` | Rencana pembelian, Purchase order, Jadwal belanja |
| `kitchen_purchase_order_items` | Item per PO |
| `kitchen_daily_shopping_lists` | Daftar belanja harian, Checklist belanja |
| `kitchen_supplier_price_history` | Perbandingan harga supplier, Histori harga bahan, Pemilihan supplier (3 fitur) |
| `kitchen_purchase_transactions` | Pencatatan & bukti transaksi belanja, Retur ke supplier, Pembelian darurat (4 fitur) — `transaction_type` ENUM |
| `kitchen_purchase_reconciliations` | Rekonsiliasi belanja |

### 1.7 Penerimaan Bahan (rancangan §4.7 — 12 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_goods_receipts` | Penerimaan bahan (header), Berita acara penerimaan, Penerimaan parsial, Lead time supplier (dihitung dari PO vs receipt) |
| `kitchen_goods_receipt_items` | Pemeriksaan kuantitas/kualitas/suhu, Tanggal kedaluwarsa/lot, Penolakan, Selisih penerimaan, Penempatan awal bahan, Dokumentasi (7 fitur, per item) |

### 1.8 Persediaan & Gudang (rancangan §4.8 — 16 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_stock_balances` | Stok bahan baku, Stok per lot, Minimum stok, Reorder point, Bahan mendekati kedaluwarsa, Stok kritis, Nilai persediaan (7 fitur, saldo terkini) |
| `kitchen_stock_movements` | Penyesuaian stok, Mutasi antar lokasi, Pengambilan bahan, FIFO/FEFO (dihitung dari urutan lot di sini), Pemusnahan stok, Retur internal (6 fitur) — `movement_type` ENUM, *append-only* |
| `kitchen_stock_opnames` | Stock opname (header) |
| `kitchen_stock_opname_items` | Detail opname per bahan/lot |
| `kitchen_picking_lists` | Picking list, Kartu stok (kartu stok = view dari `kitchen_stock_movements`, tidak perlu tabel sendiri) |

### 1.9 Produksi & Operasional Dapur (rancangan §4.9 — 15 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_production_schedules` | Jadwal produksi |
| `kitchen_production_batches` | Work order produksi, Batch produksi, Status kelulusan batch (via kolom status, lihat §1.11) |
| `kitchen_production_batch_materials` | Kitting bahan, Pencatatan pemakaian bahan, Kelebihan/kekurangan pemakaian (3 fitur) |
| `kitchen_production_logs` | Log proses masak, Checklist persiapan, Pencatatan hasil masak, Pencatatan sisa masakan, Rework masakan, Downtime alat, Serah terima shift, Check-in area produksi, Checklist kebersihan akhir (9 fitur) — `log_type` ENUM |

### 1.10 Distribusi & Absensi Makan (rancangan §4.10 — 14 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_meal_distributions` | Jadwal distribusi makan, Porsi per kelompok, Daftar pengantaran, Serah terima makanan, Kontrol jumlah porsi keluar, Makan tambahan, Pengembalian makanan, Jadwal distribusi shift (8 fitur) |
| `kitchen_meal_attendances` | Absensi makan santri, Absensi per kelas/asrama, Pengurangan porsi karena tidak hadir, Rekap tingkat konsumsi (agregat via query) (4 fitur) — granularitas: lihat Keputusan Terbuka #4 |
| `kitchen_special_meal_recipients` | Daftar penerima khusus, Label porsi khusus |

### 1.11 Kontrol Kualitas & Keamanan Pangan (rancangan §4.11 — 15 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_qc_checks` | Checklist penerimaan mutu, kebersihan personel, suhu penyimpanan/masak/holding, organoleptik, sanitasi alat/area, kalibrasi alat ukur, audit internal mutu (9 fitur) — `check_type` ENUM |
| `kitchen_food_sampling` | Sampling makanan |
| `kitchen_food_safety_incidents` | Insiden keamanan pangan, Tindakan korektif & preventif, Peringatan pelanggaran kritis (3 fitur) |
| `kitchen_batch_qc_results` | Status kelulusan batch (relasi ke `kitchen_production_batches`) |

### 1.12 Waste & Kehilangan (rancangan §4.12 — 12 fitur)

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_waste_records` | Pencatatan bahan rusak/kedaluwarsa/hilang, Makanan terbuang, Klasifikasi waste, Nilai kerugian waste, Analisis akar penyebab (rekap via query) (6 fitur) — `waste_type` ENUM |
| `kitchen_waste_reduction_targets` | Target pengurangan waste, Monitoring waste vs target, Tindakan pengurangan waste (3 fitur) |

### 1.13 Analitik & Laporan (rancangan §4.13 — 18 fitur)

Tidak ada tabel transaksi baru — seluruh laporan/dashboard/analisis dihasilkan dari **query/view**
atas tabel-tabel Bagian 1.1–1.12 (mis. `laporan stok` = query `kitchen_stock_balances`, `laporan
waste` = query `kitchen_waste_records`). Hanya 1 tabel pendukung:

| Tabel | Menaungi Fitur |
|---|---|
| `kitchen_report_schedules` | Jadwal laporan otomatis (Could), log Ekspor laporan |

### 1.14 Workflow, Pengguna & Audit (rancangan §4.14 — 14 fitur)

| Tabel | Menaungi Fitur | Catatan |
|---|---|---|
| `kitchen_staff_assignments` | Manajemen pengguna dapur, Role & hak akses | **Draf sesuai Keputusan Terbuka #5** — hanya penugasan staf ke peran operasional dapur (`ref_id` ke Core `users`), role/permission sesungguhnya tetap di Core Service. **Perlu konfirmasi.** |
| `kitchen_approval_requests` | Approval bertingkat |
| `kitchen_notifications` | Notifikasi tugas, stok kritis, expiry (3 fitur) — `notification_type` ENUM |
| `kitchen_audit_trails` | Audit trail, Riwayat perubahan data (2 fitur) — *append-only* |
| `kitchen_period_locks` | Penguncian periode, Tutup buku dapur |
| `kitchen_data_imports` | Import data massal |
| `kitchen_data_validations` | Validasi data lintas modul |
| `kitchen_service_status` | Status layanan dapur — **isi/definisi menunggu klarifikasi developer (Keputusan Terbuka #7)** |

## 2. Detail Kolom per Tabel (Ringkas)

> Kolom umum yang **tidak diulang** di tiap tabel di bawah: `id BIGINT UNSIGNED PK
> AUTO_INCREMENT`, `created_at`, `updated_at TIMESTAMP` (kecuali disebut *append-only* → tanpa
> `updated_at`). Kolom `satuan_pendidikan_id BIGINT UNSIGNED NULLABLE` (ref Core Service, tanpa FK
> fisik) ditambahkan ke semua tabel transaksional — **NULLABLE sampai Keputusan Terbuka #2
> dikonfirmasi**.

### 2.1 Master Data

**`kitchen_ingredients`** — `code VARCHAR(30) UNIQUE`, `name VARCHAR(150)`,
`category_id BIGINT UNSIGNED` (→ `kitchen_master_data` type=ingredient_category),
`base_unit_id BIGINT UNSIGNED` (→ `kitchen_units`), `min_stock DECIMAL(12,2) NULLABLE`,
`status ENUM('active','inactive')`, `description TEXT NULLABLE`.

**`kitchen_units`** — `code VARCHAR(20) UNIQUE`, `name VARCHAR(50)`,
`unit_type ENUM('weight','volume','count')`, `status ENUM('active','inactive')`.

**`kitchen_unit_conversions`** — `from_unit_id`, `to_unit_id` (→ `kitchen_units`),
`factor DECIMAL(12,6) NOT NULL`. `UNIQUE(from_unit_id, to_unit_id)`.

**`kitchen_suppliers`** — `code VARCHAR(30) UNIQUE`, `name VARCHAR(150)`, `contact_person
VARCHAR(100) NULLABLE`, `phone VARCHAR(30) NULLABLE`, `address TEXT NULLABLE`,
`status ENUM('active','inactive')`.

**`kitchen_student_groups`** — `academic_ref_id BIGINT UNSIGNED` (ref Akademik, tanpa FK fisik),
`name VARCHAR(100)`, `group_type VARCHAR(50) NULLABLE` (kelas/asrama/rombel — sesuai istilah
Akademik), `status ENUM('active','inactive')`.

**`kitchen_operational_calendar`** — `calendar_date DATE UNIQUE`, `is_operational BOOLEAN
DEFAULT TRUE`, `reason VARCHAR(255) NULLABLE`.

**`kitchen_system_parameters`** — `param_key VARCHAR(150) UNIQUE`, `param_value TEXT NULLABLE`,
`description VARCHAR(255) NULLABLE`.

**`kitchen_master_data`** — `master_type ENUM('ingredient_category','storage_location',
'equipment','meal_type','allergen','packaging_type','quality_standard','special_day')`,
`code VARCHAR(30)`, `name VARCHAR(150)`, `category VARCHAR(100) NULLABLE`,
`period_start DATE NULLABLE`, `period_end DATE NULLABLE`, `status ENUM('active','inactive')`,
`description TEXT NULLABLE`. `UNIQUE(master_type, code)`.

**`kitchen_ingredient_allergens`** — pivot `ingredient_id` (→ `kitchen_ingredients`),
`allergen_id` (→ `kitchen_master_data` type=allergen). `UNIQUE(ingredient_id, allergen_id)`.

### 2.2 Menu

**`kitchen_menus`** — `menu_type ENUM('daily','weekly_template','monthly_cycle','special')`,
`menu_date DATE NULLABLE`, `period_start DATE NULLABLE`, `period_end DATE NULLABLE`,
`parent_menu_id BIGINT UNSIGNED NULLABLE` (self-ref, untuk versi/substitusi), `version SMALLINT
DEFAULT 1`, `status ENUM('draft','locked','approved','substituted')`, `is_favorite BOOLEAN
DEFAULT FALSE`, `proposed_by BIGINT UNSIGNED NULLABLE`.

**`kitchen_menu_items`** — `menu_id` (→ `kitchen_menus`), `dish_name VARCHAR(150)`,
`recipe_id BIGINT UNSIGNED NULLABLE` (→ `kitchen_recipes`), `portion_qty DECIMAL(10,2)`,
`portion_unit_id` (→ `kitchen_units`).

**`kitchen_menu_nutrition`** — `menu_item_id` (→ `kitchen_menu_items`), `nutrient_type
VARCHAR(50)` (kalori/protein/karbohidrat/dst), `value DECIMAL(10,2)`, `unit VARCHAR(20)`.

**`kitchen_menu_diversity_checks`** — `menu_id`, `check_type ENUM('diversity','favorite_tag')`,
`result TEXT NULLABLE`, `checked_by BIGINT UNSIGNED NULLABLE`, `checked_at TIMESTAMP`.

**`kitchen_menu_cost_limits`** — `menu_id NULLABLE`, `period_start`, `period_end`,
`max_cost_per_portion DECIMAL(12,2)`.

**`kitchen_menu_evaluations`** — `menu_id`, `evaluated_by BIGINT UNSIGNED NULLABLE`,
`rating SMALLINT NULLABLE`, `feedback TEXT NULLABLE`, `evaluated_at TIMESTAMP`.

### 2.3 Resep & Standar Produksi

**`kitchen_recipes`** — `menu_item_id NULLABLE` (→ `kitchen_menu_items`), `name VARCHAR(150)`,
`base_portion_qty DECIMAL(10,2)`, `parent_recipe_id BIGINT UNSIGNED NULLABLE` (versi),
`version SMALLINT DEFAULT 1`, `status ENUM('draft','approved')`, `approved_by BIGINT UNSIGNED
NULLABLE`, `approved_at TIMESTAMP NULLABLE`.

**`kitchen_recipe_ingredients`** — `recipe_id`, `ingredient_id` (→ `kitchen_ingredients`),
`qty DECIMAL(12,3)`, `unit_id` (→ `kitchen_units`), `yield_percentage DECIMAL(5,2) NULLABLE`,
`is_seasoning BOOLEAN DEFAULT FALSE`.

**`kitchen_recipe_steps`** — `recipe_id`, `step_type ENUM('cooking','temperature_time',
'sanitation_sop','presentation')`, `step_number SMALLINT`, `instruction TEXT`,
`temperature_celsius DECIMAL(5,2) NULLABLE`, `duration_minutes INT NULLABLE`.

**`kitchen_recipe_references`** — `recipe_id`, `photo_url VARCHAR(255)`, `caption VARCHAR(255)
NULLABLE`.

**`kitchen_recipe_cost_simulations`** — `recipe_id`, `simulation_date DATE`,
`total_cost DECIMAL(14,2)`, `cost_per_portion DECIMAL(12,2)`, `source_price VARCHAR(100)
NULLABLE`.

### 2.4 Perencanaan Kebutuhan

**`kitchen_meal_plans`** — `menu_id` (→ `kitchen_menus`), `plan_date DATE`,
`student_group_id NULLABLE` (→ `kitchen_student_groups`), `forecast_portion INT`,
`buffer_portion INT DEFAULT 0`, `status ENUM('draft','confirmed')`.

**`kitchen_material_requirements`** — `period_type ENUM('per_menu','weekly','monthly')`,
`period_start DATE`, `period_end DATE`, `ingredient_id` (→ `kitchen_ingredients`),
`gross_qty DECIMAL(14,3)`, `stock_qty DECIMAL(14,3) NULLABLE`, `net_qty DECIMAL(14,3)`,
`substitution_note TEXT NULLABLE`, `is_urgent BOOLEAN DEFAULT FALSE`.

**`kitchen_capacity_plans`** — `plan_type ENUM('kitchen_capacity','workload','packaging',
'labor','student_change_simulation')`, `plan_date DATE`, `value DECIMAL(14,2)`,
`unit VARCHAR(30) NULLABLE`, `note TEXT NULLABLE`.

### 2.5 Anggaran & Biaya

**`kitchen_budgets`** — `budget_scope ENUM('annual','monthly','per_portion','per_group')`,
`period_start DATE`, `period_end DATE`, `category VARCHAR(100)`, `budget_amount DECIMAL(16,2)`,
`realized_amount DECIMAL(16,2) DEFAULT 0`, `deviation DECIMAL(16,2) NULLABLE`,
`finance_ref_id BIGINT UNSIGNED NULLABLE` (ref modul Keuangan opsional — Keputusan #3),
`status ENUM('draft','submitted','approved')`, `approved_by BIGINT UNSIGNED NULLABLE`.

**`kitchen_cost_estimates`** — `period_start DATE`, `period_end DATE`, `item_name VARCHAR(150)`,
`qty DECIMAL(12,3)`, `unit_cost DECIMAL(12,2)`, `total_cost DECIMAL(14,2)`,
`price_source VARCHAR(100) NULLABLE`.

**`kitchen_cost_records`** — `cost_type ENUM('ingredient_per_portion','waste','overhead',
'per_service_allocation')`, `period_start DATE`, `period_end DATE`, `amount DECIMAL(14,2)`,
`source_ref VARCHAR(100) NULLABLE` (dihitung otomatis dari `kitchen_stock_movements` / `kitchen_waste_records` — Keputusan #6).

**`kitchen_spending_commitments`** — `purchase_order_id NULLABLE` (→
`kitchen_purchase_orders`), `committed_amount DECIMAL(14,2)`,
`status ENUM('open','closed')`.

### 2.6 Pengadaan & Belanja

**`kitchen_purchase_requests`** — `requested_by BIGINT UNSIGNED`, `request_date DATE`,
`status ENUM('draft','submitted','approved','rejected')`, `approved_by BIGINT UNSIGNED
NULLABLE`.

**`kitchen_purchase_orders`** — `purchase_request_id NULLABLE`, `supplier_id` (→
`kitchen_suppliers`), `po_date DATE`, `planned_date DATE NULLABLE`,
`status ENUM('draft','sent','partially_received','completed','cancelled')`,
`document_url VARCHAR(255) NULLABLE`.

**`kitchen_purchase_order_items`** — `purchase_order_id`, `ingredient_id`, `qty DECIMAL(12,3)`,
`unit_id`, `unit_price DECIMAL(12,2)`.

**`kitchen_daily_shopping_lists`** — `list_date DATE`, `status ENUM('open','checked','done')`,
`items JSON`.

**`kitchen_supplier_price_history`** — `supplier_id`, `ingredient_id`, `price_date DATE`,
`unit_price DECIMAL(12,2)`, `is_selected BOOLEAN DEFAULT FALSE`.

**`kitchen_purchase_transactions`** — `transaction_type ENUM('purchase','return','emergency')`,
`purchase_order_id NULLABLE`, `supplier_id`, `transaction_date DATE`, `total_amount
DECIMAL(14,2)`, `proof_document_url VARCHAR(255) NULLABLE`, `status ENUM('draft','verified')`.

**`kitchen_purchase_reconciliations`** — `purchase_order_id`, `reconciled_amount
DECIMAL(14,2)`, `discrepancy DECIMAL(14,2) NULLABLE`, `status ENUM('open','closed')`.

### 2.7 Penerimaan Bahan

**`kitchen_goods_receipts`** — `purchase_order_id` (→ `kitchen_purchase_orders`),
`supplier_id`, `receipt_date DATE`, `received_by BIGINT UNSIGNED`,
`invoice_number VARCHAR(100) NULLABLE`, `status ENUM('received','partial','rejected')`,
`document_url VARCHAR(255) NULLABLE`.

**`kitchen_goods_receipt_items`** — `goods_receipt_id`, `ingredient_id`, `ordered_qty
DECIMAL(12,3)`, `received_qty DECIMAL(12,3)`, `rejected_qty DECIMAL(12,3) DEFAULT 0`,
`unit_id`, `lot_number VARCHAR(50) NULLABLE`, `expiry_date DATE NULLABLE`,
`storage_location_id NULLABLE` (→ `kitchen_master_data` type=storage_location),
`temperature_celsius DECIMAL(5,2) NULLABLE`, `quality_status ENUM('pass','fail','conditional')`,
`rejection_reason TEXT NULLABLE`, `notes TEXT NULLABLE`.

### 2.8 Persediaan & Gudang

**`kitchen_stock_balances`** — `ingredient_id` (→ `kitchen_ingredients`),
`storage_location_id` (→ `kitchen_master_data`), `lot_number VARCHAR(50) NULLABLE`,
`expiry_date DATE NULLABLE`, `current_qty DECIMAL(14,3) DEFAULT 0`, `unit_id`,
`avg_unit_cost DECIMAL(14,2) DEFAULT 0`, `last_received_at TIMESTAMP NULLABLE`,
`last_issued_at TIMESTAMP NULLABLE`.

**`kitchen_stock_movements`** *(append-only)* — `movement_type ENUM('in_receipt',
'out_production','out_waste','out_disposal','adjustment','transfer_in','transfer_out',
'internal_return')`, `ingredient_id`, `from_location_id NULLABLE`,
`storage_location_id`, `lot_number VARCHAR(50) NULLABLE`, `qty DECIMAL(14,3)` (+/-),
`reference_type VARCHAR(50) NULLABLE`, `reference_id BIGINT UNSIGNED NULLABLE`,
`moved_by BIGINT UNSIGNED NULLABLE`, `moved_at TIMESTAMP`.

**`kitchen_stock_opnames`** — `opname_date DATE`, `status ENUM('draft','completed')`,
`conducted_by BIGINT UNSIGNED NULLABLE`.

**`kitchen_stock_opname_items`** — `stock_opname_id`, `ingredient_id`, `storage_location_id`,
`lot_number VARCHAR(50) NULLABLE`, `system_qty DECIMAL(14,3)`, `actual_qty DECIMAL(14,3)`,
`variance_qty DECIMAL(14,3) NULLABLE`.

**`kitchen_picking_lists`** — `production_batch_id NULLABLE` (→
`kitchen_production_batches`), `picking_date DATE`, `status ENUM('open','picked')`.

### 2.9 Produksi & Operasional Dapur

**`kitchen_production_schedules`** — `schedule_date DATE`, `menu_id`,
`status ENUM('planned','in_progress','done')`.

**`kitchen_production_batches`** — `production_schedule_id NULLABLE`, `batch_code
VARCHAR(50) UNIQUE`, `menu_id`, `planned_portion INT`, `actual_portion INT NULLABLE`,
`pic_id BIGINT UNSIGNED NULLABLE` (ref Kepegawaian), `status ENUM('draft','in_progress',
'paused','completed','verified','released','rejected')`.

**`kitchen_production_batch_materials`** — `production_batch_id`, `ingredient_id`,
`planned_qty DECIMAL(12,3)`, `actual_qty DECIMAL(12,3) NULLABLE`, `variance_qty
DECIMAL(12,3) NULLABLE`.

**`kitchen_production_logs`** *(append-only)* — `log_type ENUM('cooking_process',
'prep_checklist','cooking_result','leftover','rework','equipment_downtime',
'shift_handover','area_checkin','cleaning_checklist')`, `production_batch_id NULLABLE`,
`recorded_by BIGINT UNSIGNED NULLABLE`, `notes TEXT NULLABLE`, `recorded_at TIMESTAMP`.

### 2.10 Distribusi & Absensi Makan

**`kitchen_meal_distributions`** — `satuan_pendidikan_id BIGINT UNSIGNED NOT NULL`,
`distribution_date DATE`, `meal_type_id` (→
`kitchen_master_data` type=meal_type), `student_group_id`, `planned_portion INT`,
`delivered_portion INT NULLABLE`, `returned_portion INT NULLABLE`, `extra_portion INT
DEFAULT 0`, `shift VARCHAR(30) NULLABLE`, `handed_over_by BIGINT UNSIGNED NULLABLE`,
`status ENUM('scheduled','delivered','confirmed')`.

**`kitchen_meal_attendances`** — `satuan_pendidikan_id BIGINT UNSIGNED NOT NULL`,
`meal_distribution_id`, `attendance_level ENUM('individual','group') DEFAULT 'group'`,
`student_group_id BIGINT UNSIGNED NOT NULL`, `student_ref_id BIGINT UNSIGNED NULLABLE`
(ref Akademik individu — Keputusan #4), `is_present BOOLEAN DEFAULT TRUE`,
`portion_reduced BOOLEAN DEFAULT FALSE`.

**`kitchen_special_meal_recipients`** — `meal_distribution_id`, `student_ref_id BIGINT
UNSIGNED NULLABLE`, `reason VARCHAR(150) NULLABLE`, `label_text VARCHAR(150) NULLABLE`.

### 2.11 Kontrol Kualitas & Keamanan Pangan

**`kitchen_qc_checks`** — `check_type ENUM('receiving_quality','staff_hygiene',
'storage_temperature','cooking_temperature','holding_temperature','organoleptic',
'equipment_sanitation','area_sanitation','equipment_calibration','internal_audit')`,
`reference_type VARCHAR(50) NULLABLE`, `reference_id BIGINT UNSIGNED NULLABLE`,
`indicator VARCHAR(150) NULLABLE`, `result_value VARCHAR(100) NULLABLE`,
`threshold VARCHAR(100) NULLABLE`, `pic_id BIGINT UNSIGNED NULLABLE`, `notes TEXT NULLABLE`,
`checked_at TIMESTAMP`, `status ENUM('pass','fail')`.

**`kitchen_food_sampling`** — `production_batch_id`, `sample_date DATE`, `result TEXT
NULLABLE`, `status ENUM('kept','disposed')`.

**`kitchen_food_safety_incidents`** — `incident_date DATE`, `description TEXT`,
`severity ENUM('low','medium','high','critical')`, `corrective_action TEXT NULLABLE`,
`preventive_action TEXT NULLABLE`, `status ENUM('open','closed')`.

**`kitchen_batch_qc_results`** — `production_batch_id`, `release_status ENUM('released',
'rejected','pending')`, `reviewed_by BIGINT UNSIGNED NULLABLE`, `reviewed_at TIMESTAMP
NULLABLE`.

### 2.12 Waste & Kehilangan

**`kitchen_waste_records`** — `waste_type ENUM('damaged_ingredient','expired_ingredient',
'lost_ingredient','wasted_food')`, `ingredient_id NULLABLE`, `menu_id NULLABLE`, `qty
DECIMAL(12,3) NULLABLE`, `unit_id NULLABLE`, `estimated_loss_value DECIMAL(14,2) NULLABLE`,
`classification VARCHAR(100) NULLABLE`, `root_cause TEXT NULLABLE`, `recorded_date DATE`.

**`kitchen_waste_reduction_targets`** — `period_start DATE`, `period_end DATE`, `target_value
DECIMAL(12,2)`, `actual_value DECIMAL(12,2) NULLABLE`, `action_taken TEXT NULLABLE`.

### 2.13 Analitik & Laporan

**`kitchen_report_schedules`** — `report_type VARCHAR(100)`, `schedule_cron VARCHAR(50)
NULLABLE`, `last_exported_at TIMESTAMP NULLABLE`, `status ENUM('active','inactive')`.

### 2.14 Workflow, Pengguna & Audit

**`kitchen_staff_assignments`** — `core_user_id BIGINT UNSIGNED` (ref Core Service),
`staff_role ENUM('admin_dapur','kepala_dapur','petugas_gudang','petugas_distribusi',
'qc_dapur','admin_sistem')`, `shift ENUM('pagi','siang','malam','full_day') DEFAULT 'pagi'`,
`station ENUM('persiapan','masak','gudang','distribusi','qc','umum') DEFAULT 'umum'`,
`status ENUM('active','inactive')`.

**`kitchen_approval_requests`** — `document_type VARCHAR(100)`, `document_ref_id BIGINT
UNSIGNED`, `requested_by BIGINT UNSIGNED`, `approver_id BIGINT UNSIGNED NULLABLE`,
`level SMALLINT DEFAULT 1`, `status ENUM('pending','approved','rejected','revised')`,
`decided_at TIMESTAMP NULLABLE`.

**`kitchen_notifications`** — `notification_type ENUM('task','low_stock','expiry')`,
`recipient_id BIGINT UNSIGNED`, `reference_type VARCHAR(50) NULLABLE`, `reference_id BIGINT
UNSIGNED NULLABLE`, `message VARCHAR(255)`, `is_read BOOLEAN DEFAULT FALSE`, `sent_at
TIMESTAMP`.

**`kitchen_audit_trails`** *(append-only)* — `actor_id BIGINT UNSIGNED NULLABLE`,
`action VARCHAR(100)`, `entity_type VARCHAR(100)`, `entity_id BIGINT UNSIGNED NULLABLE`,
`data_before JSON NULLABLE`, `data_after JSON NULLABLE`, `occurred_at TIMESTAMP`.

**`kitchen_period_locks`** — `period_start DATE`, `period_end DATE`, `lock_type
ENUM('period_lock','book_closing')`, `locked_by BIGINT UNSIGNED NULLABLE`, `locked_at
TIMESTAMP NULLABLE`, `status ENUM('open','locked')`.

**`kitchen_data_imports`** — `import_type VARCHAR(100)`, `file_url VARCHAR(255) NULLABLE`,
`imported_rows INT NULLABLE`, `failed_rows INT NULLABLE`, `status ENUM('processing','done',
'failed')`.

**`kitchen_data_validations`** — `validation_type VARCHAR(100)`, `entity_type VARCHAR(100)`,
`entity_id BIGINT UNSIGNED NULLABLE`, `result ENUM('valid','invalid')`, `notes TEXT
NULLABLE`, `validated_at TIMESTAMP`.

**`kitchen_service_status`** — `service_date DATE`, `meal_type_id BIGINT UNSIGNED NULLABLE`
(→ `kitchen_master_data` type=meal_type), `status ENUM('normal','delayed','emergency_menu',
'closed_holiday','fasting') DEFAULT 'normal'`, `announcement_message TEXT NULLABLE`, `note TEXT NULLABLE`.

## 3. Catatan Implementasi Migration

- Urutan migration disarankan mengikuti urutan Bagian 1 (Master Data → Menu → Resep →
  Perencanaan → Anggaran → Pengadaan → Penerimaan → Persediaan → Produksi → Distribusi → QC →
  Waste → Laporan → Workflow) karena FK antar tabel Dapur (bukan lintas database) umumnya mengalir
  ke arah yang sama.
- Contoh `CREATE TABLE` konkret per tahap disediakan di `panduan-pengembangan-dapur.md` Tahap 2.

## 4. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat & skema final ditetapkan berdasarkan 7 Keputusan di `rancangan-dapur.md` Bagian 5 (1A, 2B, 3B, 4C, 5B, 6A, 7A): ~48 tabel generik, Central Kitchen model, hybrid absensi makan, penugasan shift staf lokal, biaya real-time, dan status layanan pengumuman makan. Status: FINAL / Siap Migrasi Knex. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan skema — jangan hapus riwayat
lama.)*
