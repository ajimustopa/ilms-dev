# AI-REF: Modul Dapur & Logistik Pangan Santri (`dapur`)

> Dokumen referensi teknis modul Dapur & Logistik Pangan untuk AI Agent. Data diambil langsung dari 63 berkas migrasi Knex aktual di `apps/api-backend/db/migrations/dapur/`, router/controller backend `apps/api-backend/src/modules/dapur/`, dan router frontend portal `apps/core-portal/src/apps/dapur/`.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/dapur/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/dapur/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/dapur/`
- **Database Engine:** MariaDB 10.5 (`aldepos_dapur` / `u622997391_dbdapur`)
- **Status Implementasi:** `jalan-produksi` (Skema Lengkap 63 Tabel Migrasi Terstruktur per Siklus Operasional, Master Data Terpadu Satuan/Konversi/Supplier/Bahan/Alergen, Perencanaan Menu & Resep, Siklus Anggaran & Pengadaan Belanja Harian, Manajemen Gudang & Stok, Produksi & Distribusi Porsi Santri, Quality Control & Keamanan Pangan, Audit Trail)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (63 Tabel Terstruktur)

Arsitektur database Dapur menggunakan strategi skema granular dan terkelompok (*domain lifecycle groupings*) mencakup 63 tabel fisik yang dipetakan ke dalam 9 kelompok domain logistik pangan:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STRUKTUR DOMAIN TABEL MODUL DAPUR                     │
├────────────────────────────────┬────────────────────────────────────────┤
│ 1. Master Fondasi & Parameter  │ 6. Produksi & Pengolahan Makanan       │
│ 2. Bahan Baku & Alergen        │ 7. Distribusi Makan & Presensi Santri  │
│ 3. Menu, Resep & Gizi          │ 8. Quality Control, Food Safety & Waste│
│ 4. Perencanaan Kebutuhan & RAP │ 9. Tata Kelola, Staf & Audit Trail     │
│ 5. Pengadaan & Gudang Logistik │                                        │
└────────────────────────────────┴────────────────────────────────────────┘
```

---

### 2.1 Kelompok 1: Master Fondasi, Supplier & Parameter Operasional (7 Tabel)

1. **`kitchen_units`** (Satuan Ukur Berat & Volume): `id`, `unit_code` (e.g. "KG", "GR", "LTR"), `unit_name`, `unit_type` ('mass','volume','piece'), `is_base_unit`.
2. **`kitchen_unit_conversions`** (Tabel Matriks Konversi Satuan): `id`, `from_unit_id` (FK), `to_unit_id` (FK), `multiplier`.
3. **`kitchen_suppliers`** (Mitra Pemasok Bahan Baku & Pasar): `id`, `school_unit_id`, `supplier_name`, `contact_phone`, `address`, `status`.
4. **`kitchen_student_groups`** (Kelompok Santri Penerima Makan): `id`, `school_unit_id`, `group_name` (e.g. "Santri Putra", "Santri Putri", "Asatidz"), `headcount`.
5. **`kitchen_operational_calendar`** (Kalender Operasional Hari Masak): `id`, `school_unit_id`, `date`, `is_operational`, `service_type` ('full','breakfast_only','closed').
6. **`kitchen_system_parameters`** (Parameter Konfigurasi Dapur): `id`, `school_unit_id`, `param_key`, `param_value`, `description`.
7. **`kitchen_master_data`** (Tabel Kamus Master Data Dinamis): `id`, `school_unit_id`, `master_type` (e.g. "storage_location", "meal_time", "packaging_type"), `code`, `name`, `status`.

---

### 2.2 Kelompok 2: Master Bahan Baku & Alergen (2 Tabel)

8. **`kitchen_ingredients`** (Katalog Bahan Mentah / Pangan):
   - `id`, `school_unit_id`, `item_code` (UNIQUE), `item_name`, `category` ('sayur','daging','bumbu','sembako','buah','kering'), `storage_type` ('dry','chilled','frozen'), `base_unit_id` (FK), `min_stock_alert`, `current_stock`, `last_purchase_price`, `shelf_life_days`, `status`.
9. **`kitchen_ingredient_allergens`** (Pemetaan Kandungan Alergen Pangan):
   - `id`, `ingredient_id` (FK), `allergen_type` (e.g. "kacang", "seafood", "gluten", "telur", "susu").

---

### 2.3 Kelompok 3: Perencanaan Menu, Resep & Nutrisi Gizi (11 Tabel)

10. **`kitchen_menus`** (Master Paket Menu Makanan): `id`, `school_unit_id`, `menu_code`, `menu_name`, `meal_time` ('breakfast','lunch','dinner','snack'), `status`.
11. **`kitchen_recipes`** (Buku Resep Standar Masakan): `id`, `school_unit_id`, `recipe_code`, `recipe_name`, `standard_portion_pax` (porsi standar e.g. 100 pax), `prep_time_minutes`, `cook_time_minutes`, `instructions`.
12. **`kitchen_menu_items`** (Relasi Menu ke Resep): `id`, `menu_id` (FK), `recipe_id` (FK), `is_main_dish`.
13. **`kitchen_menu_nutrition`** (Kandungan Gizi Menu): `id`, `menu_id` (FK), `calories_kcal`, `protein_gram`, `carbo_gram`, `fat_gram`, `fiber_gram`.
14. **`kitchen_menu_diversity_checks`** (Pemeriksaan Variasi & Keberagaman Menu): `id`, `menu_id` (FK), `cycle_period`, `diversity_score`.
15. **`kitchen_menu_cost_limits`** (Batas Plafon Biaya per Porsi Santri): `id`, `school_unit_id`, `max_cost_per_portion`.
16. **`kitchen_menu_evaluations`** (Evaluasi Kualitas Menu): `id`, `menu_id` (FK), `evaluation_date`, `taste_score`, `leftover_rate_pct`.
17. **`kitchen_recipe_ingredients`** (Komposisi Takaran Resep): `id`, `recipe_id` (FK), `ingredient_id` (FK), `quantity_per_pax`, `unit_id` (FK), `waste_percentage`.
18. **`kitchen_recipe_steps`** (Langkah-Langkah Memasak): `id`, `recipe_id` (FK), `step_number`, `instruction`, `critical_control_point`.
19. **`kitchen_recipe_references`** (Referensi Literatur & Standar SOP Masak): `id`, `recipe_id` (FK), `reference_title`, `url`.
20. **`kitchen_recipe_cost_simulations`** (Simulasi HPP Biaya Resep per Porsi): `id`, `recipe_id` (FK), `simulated_cost_per_pax`, `simulation_date`.

---

### 2.4 Kelompok 4: Perencanaan Kebutuhan (MRP) & Anggaran Belanja (7 Tabel)

21. **`kitchen_meal_plans`** (Jadwal Siklus Menu Mingguan/Bulanan): `id`, `school_unit_id`, `plan_date`, `meal_time`, `menu_id` (FK), `target_pax`, `status`.
22. **`kitchen_material_requirements`** (Kalkulasi Kebutuhan Bahan Otomatis / MRP): `id`, `meal_plan_id` (FK), `ingredient_id` (FK), `required_quantity`, `allocated_from_stock`, `to_purchase_quantity`.
23. **`kitchen_capacity_plans`** (Perencanaan Kapasitas Dapur & Peralatan): `id`, `school_unit_id`, `date`, `total_pax_capacity`.
24. **`kitchen_budgets`** (Alokasi Plafon Anggaran Belanja Dapur dari RAPBS Keuangan): `id`, `school_unit_id`, `fiscal_period`, `allocated_amount`, `spent_amount`.
25. **`kitchen_cost_estimates`** (Estimasi Rencana Pengeluaran): `id`, `meal_plan_id` (FK), `estimated_total_cost`.
26. **`kitchen_cost_records`** (Realisasi Biaya Riil Bahan Baku): `id`, `school_unit_id`, `record_date`, `actual_cost`.
27. **`kitchen_spending_commitments`** (Komitmen Pengeluaran Belanja Logistik): `id`, `budget_id` (FK), `committed_amount`.

---

### 2.5 Kelompok 5: Pengadaan Pasar, Penerimaan & Manajemen Gudang (13 Tabel)

28. **`kitchen_purchase_requests`** (Daftar Usulan Permintaan Belanja): `id`, `school_unit_id`, `request_date`, `status`.
29. **`kitchen_purchase_orders`** (Surat Pesanan Belanja / PO Pasar): `id`, `school_unit_id`, `supplier_id` (FK), `order_number`, `order_date`, `delivery_date`, `total_amount`, `status`.
30. **`kitchen_purchase_order_items`** (Rincian Item PO): `id`, `purchase_order_id` (FK), `ingredient_id` (FK), `qty_ordered`, `unit_price`, `subtotal`.
31. **`kitchen_daily_shopping_lists`** (Daftar Belanja Harian Pasar Tradisional): `id`, `shopping_date`, `pic_shopper_id`, `status`.
32. **`kitchen_supplier_price_history`** (Riwayat Fluktuasi Harga Pasar): `id`, `supplier_id` (FK), `ingredient_id` (FK), `price`, `effective_date`.
33. **`kitchen_purchase_transactions`** (Transaksi Pembayaran Belanja Logistik): `id`, `purchase_order_id` (FK), `invoice_number`, `amount_paid`, `payment_method`.
34. **`kitchen_purchase_reconciliations`** (Rekonsiliasi Belanja vs Nota Pasar): `id`, `purchase_order_id` (FK), `discrepancy_amount`, `status`.
35. **`kitchen_goods_receipts`** (Surat Tanda Penerimaan Barang Gudang): `id`, `purchase_order_id` (FK), `received_date`, `received_by`, `status`.
36. **`kitchen_goods_receipt_items`** (Rincian & Timbangan Fisik Masuk): `id`, `goods_receipt_id` (FK), `ingredient_id` (FK), `qty_received`, `is_accepted`, `rejection_reason`.
37. **`kitchen_stock_balances`** (Saldo Stok Fisik Gudang Berjalan): `id`, `school_unit_id`, `ingredient_id` (FK), `storage_location`, `current_quantity`, `unit_id` (FK).
38. **`kitchen_stock_movements`** (Kartu Mutasi Keluar/Masuk Stok): `id`, `ingredient_id` (FK), `movement_type` ('in','out','adjustment','spoilage'), `quantity`, `reference_type`, `reference_id`, `occurred_at`.
39. **`kitchen_stock_opnames`** (Sesi Stock Opname Fisik Gudang): `id`, `school_unit_id`, `opname_date`, `conducted_by`, `status`.
40. **`kitchen_stock_opname_items`** (Selisih Fisik vs Sistem Gudang): `id`, `stock_opname_id` (FK), `ingredient_id` (FK), `system_qty`, `physical_qty`, `difference`.

---

### 2.6 Kelompok 6: Produksi & Pengolahan Makanan (5 Tabel)

41. **`kitchen_production_schedules`** (Jadwal Shift Memasak Tim Juru Masak): `id`, `schedule_date`, `shift_type` ('morning','evening'), `cook_leader_id`.
42. **`kitchen_production_batches`** (Batch Masak di Dapur): `id`, `meal_plan_id` (FK), `recipe_id` (FK), `batch_code`, `target_pax`, `actual_pax_produced`, `cooking_started_at`, `cooking_finished_at`, `status`.
43. **`kitchen_production_batch_materials`** (Bahan Mentah yang Diambil untuk Batch): `id`, `batch_id` (FK), `ingredient_id` (FK), `qty_used`.
44. **`kitchen_production_logs`** (Log Suhu & Catatan Masak): `id`, `batch_id` (FK), `log_time`, `cooking_temperature_celsius`, `notes`.
45. **`kitchen_picking_lists`** (Daftar Pengambilan Bahan dari Gudang ke Meja Masak): `id`, `batch_id` (FK), `status`.

---

### 2.7 Kelompok 7: Distribusi Porsi Makan & Presensi Santri (3 Tabel)

46. **`kitchen_meal_distributions`** (Distribusi Makanan ke Ruang Makan Santri): `id`, `meal_plan_id` (FK), `dining_hall_location`, `total_portions_sent`, `temperature_at_serving`.
47. **`kitchen_meal_attendances`** (Presensi Makan Santri / Tap Kartu Santri): `id`, `meal_plan_id` (FK), `student_id`, `tapped_at`, `status` ('present','dietary_special','absent').
48. **`kitchen_special_meal_recipients`** (Daftar Santri Diet Khusus / Sakit di UKS): `id`, `student_id`, `dietary_type` ('sakit','alergi','pantangan'), `custom_menu_notes`.

---

### 2.8 Kelompok 8: Quality Control (QC), Food Safety & Food Waste (6 Tabel)

49. **`kitchen_qc_checks`** (Pemeriksaan Kualitas & Kesegaran Bahan Masuk): `id`, `goods_receipt_item_id` (FK), `freshness_grade`, `temperature_celsius`, `passed`.
50. **`kitchen_food_sampling`** (Penyimpanan Sampel Makanan Uji 24 Jam): `id`, `batch_id` (FK), `sampling_time`, `stored_at_fridge_celsius`, `retention_until`.
51. **`kitchen_food_safety_incidents`** (Insiden Keamanan Pangan / Laporan Kontaminasi): `id`, `incident_date`, `description`, `root_cause`, `corrective_action`.
52. **`kitchen_batch_qc_results`** (Hasil Uji Organoleptik Rasa, Bau & Kematangan): `id`, `batch_id` (FK), `aroma_score`, `taste_score`, `texture_score`, `approved_for_service`.
53. **`kitchen_waste_records`** (Pencatatan Sisa Makanan / Food Waste): `id`, `meal_plan_id` (FK), `waste_type` ('prep_waste','leftover_food','plate_waste'), `weight_kg`.
54. **`kitchen_waste_reduction_targets`** (Target Efisiensi Zero-Food-Waste): `id`, `period`, `target_waste_kg_per_pax`.

---

### 2.9 Kelompok 9: Tata Kelola, Staf, Notifikasi & Audit Trail (9 Tabel)

55. **`kitchen_report_schedules`** (Jadwal Pelaporan Konsumsi Gizi & Biaya): `id`, `report_type`, `frequency`.
56. **`kitchen_staff_assignments`** (Penugasan Tugas Juru Masak, Pencuci & Logistik): `id`, `employee_id` (FK Kepegawaian), `role_type` ('head_chef','cook','prep','steward','nutritionist').
57. **`kitchen_approval_requests`** (Pengajuan Approval Menu & Belanja Besar): `id`, `request_type`, `status`.
58. **`kitchen_notifications`** (Notifikasi Peringatan Stok Menipis & Bahan Expired): `id`, `message`, `is_read`.
59. **`kitchen_audit_trails`** (Log Audit Operasional Dapur): `id`, `actor_user_id`, `action`, `occurred_at`.
60. **`kitchen_period_locks`** (Kunci Cut-Off Laporan Bulanan): `id`, `period_month`, `period_year`, `is_locked`.
61. **`kitchen_data_imports`** (Log Unggah Impor Bahan/Menu Massal): `id`, `filename`, `imported_rows`.
62. **`kitchen_data_validations`** (Aturan Validasi Nutrisi): `id`, `rule_code`, `status`.
63. **`kitchen_service_status`** (Status Kesiapan Dapur Live): `id`, `status_code`, `service_readiness`.

---

## 3. Kontrak API Ringkas (`/api/v1/dapur`)

### 3.1 Master Data Bahan, Unit & Pemasok
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/ingredients` | `dapur.master.view` | Query: `?category=&storage_type=&search=&page=&limit=` | `{ ingredients: array, pagination: object }` |
| `POST` | `/ingredients` | `dapur.master.manage` | `{ item_code: string, item_name: string, category: string, storage_type: string, base_unit_id: number, min_stock_alert: number }` | `{ id: number, item_name: string }` |
| `GET` | `/units` | `dapur.master.view` | - | `{ units: array }` |
| `POST` | `/units` | `dapur.master.manage` | `{ unit_code: string, unit_name: string, unit_type: string }` | `{ id: number }` |
| `GET` | `/units/conversions` | `dapur.master.view` | - | `{ conversions: array }` |
| `POST` | `/units/conversions` | `dapur.master.manage` | `{ from_unit_id: number, to_unit_id: number, multiplier: number }` | `{ id: number }` |
| `GET` | `/suppliers` | `dapur.master.view` | Query: `?status=` | `{ suppliers: array }` |
| `POST` | `/suppliers` | `dapur.master.manage` | `{ supplier_name: string, contact_phone?: string, address?: string }` | `{ id: number }` |
| `GET` | `/student-groups` | `dapur.master.view` | - | `{ groups: array<{ id, group_name, headcount }> }` |
| `GET` | `/operational-calendar`| `dapur.master.view` | Query: `?month=&year=` | `{ calendar: array }` |
| `GET` | `/master-data` | `dapur.master.view` | Query: `?master_type=` | `{ items: array }` |
| `POST` | `/master-data` | `dapur.master.manage` | `{ master_type: string, code: string, name: string }` | `{ id: number }` |

### 3.2 Laporan & Dashboard Operasional Dapur
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/dashboard` | `dapur.master.view` | - | `{ active_meal_plans: number, total_headcount: number, low_stock_ingredients: array, today_budget_spent: number }` |

---

## 4. Workflows & State Machines

- **Siklus Menu & Kalkulasi Bahan Otomatis (MRP):** Penyusunan draf siklus menu 10 harian di `kitchen_meal_plans` $\rightarrow$ evaluasi gizi & plafon biaya $\rightarrow$ sistem menghitung kebutuhan bahan riil berdasarkan jumlah santri aktif (`headcount`) $\rightarrow$ terpecah otomatis menjadi: (1) Bahan yang diambil dari saldo gudang (`allocated_from_stock`), (2) Bahan yang harus dibeli ke pasar (`to_purchase_quantity`).
- **Siklus Pengadaan & Penerimaan Bahan Basah/Kering:** Generate daftar belanja harian (`kitchen_daily_shopping_lists`) $\rightarrow$ PO Pasar $\rightarrow$ Barang tiba $\rightarrow$ Uji QC fisik & timbangan di `kitchen_goods_receipts` $\rightarrow$ Jika lolos QC, stok gudang `kitchen_stock_balances` bertambah otomatis.
- **Siklus Pengolahan & Food Safety (HACCP):** Pengambilan bahan baku $\rightarrow$ Masak batch di dapur $\rightarrow$ Pencatatan suhu titik kritis masak $\rightarrow$ Uji organoleptik batch $\rightarrow$ Pengambilan sampel makanan 24 jam (`kitchen_food_sampling`) $\rightarrow$ Distribusi porsi makan santri.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/dapur/login` | `src/apps/dapur/pages/Login.jsx` | Login form kepala dapur, juru masak & staf logistik |
| `/dapur/dashboard` | `src/apps/dapur/pages/Dashboard.jsx` | Statistik konsumsi makan santri, jadwal masak hari ini & alert stok |
| `/dapur/master-data` *(alias: `/dapur/master`)*| `src/apps/dapur/pages/MasterData.jsx` | Pengelolaan bahan mentah, satuan ukur, konversi, supplier & kelompok santri |
| `/dapur/menus` | `src/apps/dapur/pages/MasterData.jsx` | Katalog paket menu makan santri & kandungan gizi |
| `/dapur/recipes` | `src/apps/dapur/pages/MasterData.jsx` | Buku resep standar, takaran per porsi & instruksi masak |
| `/dapur/planning` | `src/apps/dapur/pages/MasterData.jsx` | Perencanaan jadwal siklus makan mingguan santri |
| `/dapur/budgets` | `src/apps/dapur/pages/MasterData.jsx` | Alokasi anggaran dapur & monitoring realisasi belanja |
| `/dapur/procurement`| `src/apps/dapur/pages/MasterData.jsx` | Usulan pembelian bahan, PO pasar & histori harga supplier |
| `/dapur/receipts` | `src/apps/dapur/pages/MasterData.jsx` | Penerimaan barang gudang & verifikasi timbangan QC |
| `/dapur/inventory` | `src/apps/dapur/pages/MasterData.jsx` | Kartu mutasi stok bahan pangan basah/kering & stock opname |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi token JWT SSO, data Satuan Pendidikan & profil Yayasan.
  - `akademik`: Data headcount santri aktif asrama (`student_groups`) untuk estimasi jumlah porsi makan harian.
  - `kepegawaian`: Data penugasan staf juru masak dapur (`employees`).
  - `keuangan`: Alokasi anggaran belanja logistik makan santri dari pos pengeluaran RAPBS.
- **Modul yang Memanggil Dapur (Consumers):**
  - `manajemen`: Agregat laporan kepuasan konsumsi santri, efisiensi biaya makan per santri, dan pengelolaan food waste untuk dashboard eksekutif.
  - `portal-orangtua`: Jadwal menu makan santri & catatan diet khusus santri.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Barcode / QR Tapping Ruang Makan Santri:** Skema tabel `kitchen_meal_attendances` telah siap untuk mencatat presensi makan santri; integrasi terminal card scanner fisik di pintu ruang makan sedang disiapkan.
2. **Sub-Modul Frontend Dedicated Component:** Halaman frontend saat ini menggunakan arsitektur `MasterData.jsx` modular terpadu dengan navigasi tab internal yang melayani seluruh rute navigasi dapur.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
