# AI-REF: Modul Keuangan & Akuntansi (`keuangan`)

> Dokumen referensi teknis modul Keuangan untuk AI Agent. Disinkronkan langsung dari 62 berkas migrasi Knex aktual (`apps/api-backend/db/migrations/keuangan/`), 15 submodul router/controller backend (`apps/api-backend/src/modules/keuangan/`), dan 18 halaman frontend portal (`apps/core-portal/src/apps/keuangan/pages/`).

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/keuangan/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/keuangan/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/keuangan/` (62 Migrasi)
- **Database Engine:** MariaDB 10.5 / MySQL 8 (`aldepos_keuangan` / `u622997391_dbkeuangan`)
- **Status Implementasi:** `jalan-produksi` (COA 7 Kelompok Akuntansi Nirlaba, Skema Biaya Pendidikan, 17 Aturan Transaksi Terkunci, RAPBS Matriks 12 Bulan, Katalog Standar Biaya & Belanja Lump Sum per Kegiatan, Penetapan Tagihan Siswa & Diskon, Multipayment Splitting Bukti Transfer, Pengeluaran RAPBS, Kartu Bayar Siswa Matriks 12 Bulan Juli-Juni, Kinerja Penagihan Bulanan Collection Performance, Single-Batch Ingest N+1 Fix, Aging Schedule & Ekspor Excel-PDF, Migrasi Historis Cutover, Saldo per Jenis Biaya per Tahun Ajaran, Penagihan & Pembayaran PPDB Calon Murid, Verifikasi Bukti Bayar Transfer Publik, Pinjaman & Realokasi Antar Tahun Ajaran, Payroll Ingest & Rejection Guard, Laporan Keuangan Standar Akuntansi & Export PDF, PPDB Lifecycle Aligned & Safeguard Revisions)
- **Commit Terakhir Modul:** `0a6bf24` (2026-08-31)

---

## 2. ERD & Skema Database Aktual (46 Domain Tables)

### 2.1 Master Data Keuangan, Akun Kas, Bagan Akun (COA) & Aturan Transaksi

#### 1. `cash_accounts` (Rekening Kas & Bank)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint / Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan (SMP/SMA/Yayasan) |
| `account_code` | `VARCHAR(50)` | NO | - | e.g. "KAS-UTAMA", "BNI-SPP-01" |
| `account_name` | `VARCHAR(150)` | NO | - | Nama Akun / Rekening |
| `account_type` | `ENUM('cash','bank')` | NO | - | Jenis Kas: Tunai / Bank |
| `bank_name` | `VARCHAR(100)` | YES | `NULL` | Nama Bank (e.g. "BNI", "BSI") |
| `account_number` | `VARCHAR(50)` | YES | `NULL` | Nomor Rekening |
| `account_holder` | `VARCHAR(150)` | YES | `NULL` | Atas Nama Pemilik Rekening |
| `balance` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Berjalan Kas/Bank |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif/Nonaktif |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_cash_account_code (school_unit_id, account_code)`

#### 2. `chart_of_accounts` (Bagan Akun Standar / COA - 7 Kelompok Nirlaba)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint / Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `account_code` | `VARCHAR(50)` | NO | - | e.g. "10100", "20000", "50100", "60100", "71000" |
| `account_name` | `VARCHAR(150)` | NO | - | Nama Akun |
| `account_group` | `ENUM` | NO | `'current_asset'` | `current_asset`, `non_current_asset`, `current_liability`, `long_term_liability`, `net_assets`, `revenue`, `expense` |
| `account_type` | `ENUM` | NO | - | `asset`, `liability`, `equity`, `revenue`, `expense` (kompatibilitas legacy) |
| `normal_balance` | `ENUM('debit','credit')` | NO | - | Saldo Normal Akun |
| `parent_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> chart_of_accounts(id) RESTRICT/CASCADE` |
| `is_system` | `TINYINT(1)` | NO | `0` | Akun bawaan sistem (tidak boleh dihapus) |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif Akun |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_coa_code (school_unit_id, account_code)`

#### 3. `cash_account_opening_balances` (Saldo Awal Rekening Kas)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint / Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id) CASCADE/CASCADE` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran |
| `opening_balance` | `DECIMAL(18,2)` | NO | `0.00` | Nominal Saldo Awal |
| `as_of_date` | `DATE` | NO | - | Tanggal Efektif Saldo Awal |
| `opening_date` | `DATE` | YES | `NULL` | Tanggal Pembukuan Saldo Awal |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_account_opening_balance (cash_account_id, academic_year_id)`

#### 4. `transaction_account_mappings` (Katalog 16 Aturan Transaksi Jurnal Otomatis)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint / Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `transaction_code` | `VARCHAR(100)` | NO | - | Kode Unik (e.g. `student_bill_issued`, `student_bill_payment`, `payroll_disbursement`) |
| `transaction_label` | `VARCHAR(150)` | NO | - | Label / Nama Aturan Transaksi |
| `debit_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> chart_of_accounts(id)` |
| `credit_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> chart_of_accounts(id)` |
| `is_system` | `TINYINT(1)` | NO | `0` | Proteksi sistem (tidak dapat dihapus sembarangan) |
| `default_cash_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> cash_accounts(id)` |
| `related_fee_type_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> fee_types(id)` |
| `related_transaction_category_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> transaction_categories(id)` |
| `is_dynamic_account` | `TINYINT(1)` | NO | `0` | Flag akun dinamis (resolusi runtime via kasir/katalog) |
| `linked_feature_note` | `VARCHAR(255)` | YES | `NULL` | Keterangan modul/fitur pemicu |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif Aturan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 5. `cash_transfers` (Mutasi Transfer Kas Antar Rekening)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint / Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `transfer_number` | `VARCHAR(50)` | NO | - | Nomor Referensi Transfer |
| `from_cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id)` Rekening Sumber |
| `to_cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id)` Rekening Tujuan |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Transfer |
| `transfer_date` | `DATE` | NO | - | Tanggal Transfer |
| `notes` | `TEXT` | YES | `NULL` | Catatan / Alasan Transfer |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.2 Kelompok Pos Biaya, Skema Biaya & Penugasan Siswa

#### 6. `fee_groups` (Kelompok Biaya Sekolah)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `code` | `VARCHAR(50)` | NO | - | e.g. "SPP", "DAFTAR_ULANG", "SARPRAS" |
| `name` | `VARCHAR(150)` | NO | - | - |
| `description` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 7. `fee_types` (Jenis Biaya & Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `fee_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_groups(id) RESTRICT/CASCADE` |
| `name` | `VARCHAR(150)` | NO | - | Nama Jenis Biaya (e.g. "SPP", "Kegiatan", "Seragam") |
| `billing_pattern` | `ENUM` | NO | `'monthly'` | `'monthly','yearly','one_time'` |
| `description` | `TEXT` | YES | `NULL` | Keterangan Pos Biaya |
| `related_revenue_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> chart_of_accounts(id)` Akun Pendapatan Terkait |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 8. `fee_schemes` (Master Template Skema Biaya Pendidikan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Skema Reguler Angkatan 2026/2027" |
| `code` | `VARCHAR(50)` | YES | `NULL` | Kode Skema |
| `description` | `TEXT` | YES | `NULL` | - |
| `target_cohort_id` | `BIGINT UNSIGNED` | YES | `NULL` | Filter Angkatan |
| `target_grade_level_id` | `BIGINT UNSIGNED` | YES | `NULL` | Filter Tingkat Kelas |
| `target_class_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | Filter Rombel |
| `total_amount` | `DECIMAL(18,2)` | NO | `0.00` | Total Akumulasi Biaya Setahun |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 9. `fee_scheme_items` (Rincian Item Pos Biaya dalam Skema)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `fee_scheme_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_schemes(id) CASCADE/CASCADE` |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id) RESTRICT/CASCADE` |
| `nominal` | `DECIMAL(18,2)` | NO | - | Nominal Biaya |
| `billing_cycle` | `ENUM` | NO | `'monthly'` | `'monthly','yearly','one_time'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 10. `student_fee_scheme_assignments` (Penugasan Skema Biaya per Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa dari Akademik |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran |
| `fee_scheme_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> fee_schemes(id)` |
| `is_custom` | `TINYINT(1)` | NO | `0` | Flag Custom Penetapan Manual |
| `custom_details` | `LONGTEXT` (JSON) | YES | `NULL` | Rincian nominal custom per pos biaya |
| `notes` | `TEXT` | YES | `NULL` | Catatan beasiswa/keringanan khusus |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_ay_assignment (student_id, academic_year_id)`

#### 11. `student_fee_adjustments` (Dispensasi & Keringanan Biaya Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id)` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `adjustment_type` | `ENUM` | NO | - | `'scholarship','waiver','discount','custom_amount'` |
| `value_type` | `ENUM` | NO | - | `'percentage','fixed'` |
| `value` | `DECIMAL(18,2)` | NO | - | Nominal / Persen Keringanan |
| `reason` | `TEXT` | NO | - | Alasan Keringanan |
| `status` | `ENUM` | NO | `'draft'` | `'draft','submitted','approved','rejected'` |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `approved_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 12. `fee_reference_amounts` (Matriks Tarif Legacy)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id)` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `cohort_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `grade_level_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `amount` | `DECIMAL(18,2)` | NO | - | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.3 Standar Biaya Katalog & RAPBS (Matriks 12 Bulan)

#### 13. `catalog_items` (Standar Biaya & Plafon Pengadaan Barang/Jasa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(200)` | NO | - | Nama Barang / Jasa |
| `unit` | `VARCHAR(30)` | NO | - | Satuan (Rim, Paket, Buah, Bulan) |
| `reference_price` | `DECIMAL(18,2)` | NO | - | Harga Acuan Plafon Tertinggi |
| `standard_unit_price` | `DECIMAL(18,2)` | YES | `NULL` | Legacy standard price |
| `expense_category_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> transaction_categories(id)` |
| `academic_year_id` | `BIGINT UNSIGNED` | YES | `NULL` | Tahun Ajaran Berlaku |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 14. `catalog_item_price_history` (Riwayat Perubahan Harga Acuan Katalog)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `catalog_item_id` | `BIGINT UNSIGNED` | NO | - | `FK -> catalog_items(id) CASCADE/CASCADE` |
| `old_reference_price` | `DECIMAL(18,2)` | NO | - | Harga Acuan Lama |
| `new_reference_price` | `DECIMAL(18,2)` | NO | - | Harga Acuan Baru |
| `reason` | `TEXT` | YES | `NULL` | Alasan Penyesuaian Harga |
| `changed_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pengubah |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 15. `budget_programs` (Program Kerja RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `code` | `VARCHAR(50)` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Program Mutu Akademik", "Sarpras" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 16. `budget_plans` (Header Dokumen RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(200)` | YES | `NULL` | Judul Dokumen RAPBS |
| `version` | `SMALLINT UNSIGNED` | NO | `1` | Versi Dokumen (1, 2, 3...) |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published'` |
| `total_planned_income` | `DECIMAL(18,2)` | NO | `0.00` | Target Rencana Penerimaan |
| `total_planned_expense` | `DECIMAL(18,2)` | NO | `0.00` | Total Rencana Belanja |
| `published_at` | `TIMESTAMP` | YES | `NULL` | Waktu Pengesahan RAPBS |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_budget_plans_version (school_unit_id, academic_year_id, version)`

#### 17. `budget_plan_income_items` (Rincian Target Pendapatan RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `budget_plan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> budget_plans(id) CASCADE/CASCADE` |
| `name` | `VARCHAR(150)` | NO | - | Nama Sumber Pendapatan |
| `fee_type_id` | `BIGINT UNSIGNED` | YES | `NULL` | Pos Biaya Santri Terkait |
| `transaction_category_id` | `BIGINT UNSIGNED` | YES | `NULL` | Kategori Penerimaan Non-Siswa |
| `planned_amount` | `DECIMAL(18,2)` | NO | - | Total Target Setahun |
| `max_cap_amount` | `DECIMAL(18,2)` | YES | `NULL` | Batas Plafon Tahunan dari Hasil Generate Penetapan |
| `monthly_distribution` | `TEXT` (JSON) | YES | `NULL` | Sebaran target 12 bulan (`{"m1":..., "m12":...}`) |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 18. `budget_plan_expense_items` (Rincian Belanja RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `budget_plan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> budget_plans(id) CASCADE/CASCADE` |
| `budget_program_id` | `BIGINT UNSIGNED` | NO | - | `FK -> budget_programs(id)` |
| `catalog_item_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> catalog_items(id)` Standar Biaya (NULL pada mode Lump Sum) |
| `fund_source_fee_type_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> fee_types(id)` Sumber Dana Pos Biaya (Wajib diisi pada kedua mode) |
| `entry_mode` | `ENUM('itemized','lump_sum')` | NO | `'itemized'` | Mode Penganggaran: Rincian Item Katalog vs Lump Sum per Kegiatan |
| `rkt_program_id` | `BIGINT UNSIGNED` | YES | `NULL` | Referensi RKT Modul Manajemen |
| `name` | `VARCHAR(150)` | NO | - | Nama Item Belanja / Nama Kegiatan |
| `unit` | `VARCHAR(30)` | YES | `NULL` | Satuan (NULL pada mode Lump Sum) |
| `quantity` | `DECIMAL(10,2)` | YES | `NULL` | Total Kuantitas Setahun (NULL pada mode Lump Sum) |
| `unit_price` | `DECIMAL(18,2)` | YES | `NULL` | Harga Satuan (NULL pada mode Lump Sum) |
| `planned_amount` | `DECIMAL(18,2)` | NO | - | Total Plafon Belanja ($q \times p$ pada Itemized / Input Langsung pada Lump Sum) |
| `lump_sum_description` | `TEXT` | YES | `NULL` | Uraian Kegiatan / Penjelasan Keperluan (Wajib diisi jika `entry_mode='lump_sum'`) |
| `monthly_distribution` | `TEXT` (JSON) | YES | `NULL` | Sebaran 12 bulan (Volume pada Itemized / Nominal Rp pada Lump Sum) |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.4 Tagihan Siswa, Pembayaran, Multi-Splitting & Saldo Pos Dana

#### 19. `student_bills` (Tagihan Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id)` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `bill_number` | `VARCHAR(50)` | NO | - | Nomor Tagihan |
| `billing_period` | `VARCHAR(20)` | YES | `NULL` | Periode Tagihan (e.g. "2026-07") |
| `gross_amount` | `DECIMAL(18,2)` | NO | - | Nominal Bruto |
| `discount_amount` | `DECIMAL(18,2)` | NO | `0.00` | Potongan / Diskon |
| `discount_type` | `VARCHAR(50)` | YES | `NULL` | Tipe Diskon |
| `discount_reason` | `TEXT` | YES | `NULL` | Alasan Diskon |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Bersih Tagihan |
| `paid_amount` | `DECIMAL(18,2)` | NO | `0.00` | Nominal Terbayar |
| `remaining_amount` | `DECIMAL(18,2)` | NO | - | Sisa Tagihan |
| `due_date` | `DATE` | NO | - | Jatuh Tempo |
| `status` | `ENUM` | NO | `'draft'` | `'draft','unpaid','partially_paid','paid','cancelled','written_off'` |
| `is_legacy_data` | `TINYINT(1)` | NO | `0` | Data Historis Migrasi (Non-Jurnal) |
| `legacy_reference_info` | `VARCHAR(255)` | YES | `NULL` | Keterangan Dokumen Asal |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_bill_period (student_id, fee_type_id, academic_year_id, billing_period)`

#### 20. `bill_payments` (Kwitansi & Transaksi Pembayaran Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id)` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id)` Rekening Penerima |
| `receipt_number` | `VARCHAR(50)` | NO | - | Nomor Kwitansi Pembayaran |
| `amount_paid` | `DECIMAL(18,2)` | NO | - | Nominal Pembayaran |
| `payment_date` | `DATE` | NO | - | Tanggal Pembayaran |
| `payment_method` | `ENUM` | NO | `'cash'` | `'cash','bank_transfer','payment_gateway'` |
| `notes` | `TEXT` | YES | `NULL` | Catatan Kasir |
| `is_legacy_data` | `TINYINT(1)` | NO | `0` | Data Historis Migrasi |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_bp_receipt (receipt_number)`

#### 21. `bill_payment_proofs` (Bukti Transfer Unggahan Orang Tua)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_bill_id` | `BIGINT UNSIGNED` | YES | `NULL` | Tagihan Utama |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa |
| `proof_file_url` | `VARCHAR(255)` | NO | - | URL / Path Gambar Bukti Transfer |
| `transfer_amount` | `DECIMAL(18,2)` | NO | - | Nominal Transfer di Struk |
| `transfer_date` | `DATE` | NO | - | Tanggal Transfer |
| `bank_name` | `VARCHAR(100)` | YES | `NULL` | Bank Pengirim |
| `sender_account_name` | `VARCHAR(150)` | YES | `NULL` | Atas Nama Pengirim |
| `status` | `ENUM` | NO | `'pending'` | `'pending','verified','rejected'` |
| `is_split_payment` | `TINYINT(1)` | NO | `0` | Flag Pembayaran Multi-Tagihan (Split) |
| `total_allocated_amount` | `DECIMAL(18,2)` | NO | `0.00` | Total Alokasi ke Berbagai Tagihan |
| `verified_by` | `BIGINT UNSIGNED` | YES | `NULL` | Bendahara Verifikator |
| `verified_at` | `TIMESTAMP` | YES | `NULL` | - |
| `rejection_reason` | `TEXT` | YES | `NULL` | Alasan Penolakan Bukti |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 22. `bill_payment_proof_allocations` (Pecahan Alokasi Multi-Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `bill_payment_proof_id` | `BIGINT UNSIGNED` | NO | - | `FK -> bill_payment_proofs(id) CASCADE/CASCADE` |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id) CASCADE/CASCADE` |
| `allocated_amount` | `DECIMAL(18,2)` | NO | - | Nominal Alokasi per Tagihan |
| `notes` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 23. `bill_reminder_logs` (Riwayat Pengiriman Pengingat Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id) CASCADE/CASCADE` |
| `channel` | `ENUM` | NO | `'whatsapp'` | `'whatsapp','email','sms'` |
| `sent_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `status` | `ENUM` | NO | `'sent'` | `'sent','failed'` |

#### 24. `fund_balances` (Buku Saldo per Sumber Dana & Tahun Ajaran)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `fund_type` | `ENUM('fee_type','transaction_category','opening_pool')` | NO | - | Tipe Sumber Dana |
| `fund_ref_id` | `BIGINT UNSIGNED` | NO | `0` | ID Pos Biaya / Kategori / 0 (Opening Pool) |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | `2` | Tahun Ajaran Dana |
| `balance` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Berjalan Pos Dana |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_fund_balances_unit_type_ref_ay (school_unit_id, fund_type, fund_ref_id, academic_year_id)`

#### 25. `fund_balance_mutations` (Mutasi Masuk/Keluar Saldo Pos Dana)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `fund_balance_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fund_balances(id) CASCADE/CASCADE` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | `2` | Tahun Ajaran Mutasi |
| `direction` | `ENUM('in','out')` | NO | - | Masuk ('in') / Keluar ('out') |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Mutasi |
| `balance_before` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Sebelum Mutasi |
| `balance_after` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Sesudah Mutasi |
| `source_table` | `VARCHAR(50)` | NO | - | `bill_payments`, `expenses`, `other_incomes`, `cash_account_opening_balances` |
| `source_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Referensi Dokumen |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 26. `finance_cutover_settings` (Batas Tanggal Cutover Migrasi Historis)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `cutover_date` | `DATE` | NO | - | Tanggal Efektif Cutover (Transaksi sebelum tanggal ini tidak dibuatkan jurnal) |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_fcs_unit (school_unit_id)`

---

### 2.5 Pengeluaran, Penerimaan Lain, Payroll & Pembukuan Akuntansi

#### 27. `transaction_categories` (Kategori Transaksi Keuangan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `category_kind` | `ENUM('income','expense')`| NO | - | Jenis Kategori |
| `name` | `VARCHAR(150)` | NO | - | e.g. "BOS", "Donasi", "ATK", "Konsumsi" |
| `related_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> chart_of_accounts(id)` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 28. `expenses` (Pengeluaran Operasional & Belanja RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | YES | `NULL` | Tahun Ajaran Beban Belanja |
| `budget_plan_expense_item_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> budget_plan_expense_items(id)` |
| `item_name` | `VARCHAR(200)` | NO | - | Nama Belanja / Pengeluaran |
| `unit` | `VARCHAR(30)` | YES | `NULL` | Satuan |
| `unit_price` | `DECIMAL(18,2)` | NO | - | Harga Satuan |
| `quantity` | `DECIMAL(10,2)` | NO | `1.00` | Volume / Kuantitas |
| `total_amount` | `DECIMAL(18,2)` | NO | - | Total Nominal Pengeluaran |
| `vendor` | `VARCHAR(150)` | YES | `NULL` | Rekanan / Vendor / Toko |
| `proof_number` | `VARCHAR(100)` | YES | `NULL` | Nomor Nota / Faktur / Kwitansi |
| `expense_date` | `DATE` | NO | - | Tanggal Pengeluaran |
| `notes` | `TEXT` | YES | `NULL` | - |
| `fund_source_type` | `ENUM('fee_type','transaction_category','opening_pool')` | YES | `'opening_pool'` | Sumber Kantong Dana |
| `fund_source_ref_id` | `BIGINT UNSIGNED` | YES | `0` | ID Pos Biaya / Kategori |
| `fund_source_override_reason` | `TEXT` | YES | `NULL` | Alasan jika berbeda dari default RAPBS |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 29. `other_incomes` (Penerimaan Non-SPP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `income_number` | `VARCHAR(50)` | NO | - | Nomor Bukti Penerimaan |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `transaction_category_id` | `BIGINT UNSIGNED` | NO | - | `FK -> transaction_categories(id)` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id)` |
| `source_name` | `VARCHAR(150)` | NO | - | Sumber Penerimaan (e.g. "Pemerintah BOS", "Donatur") |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Penerimaan |
| `proof_number` | `VARCHAR(100)` | YES | `NULL` | - |
| `received_at` | `DATE` | NO | - | Tanggal Diterima |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 30. `payroll_disbursements` (Pencairan Gaji Pegawai dari Kepegawaian)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `payroll_period_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Periode Payroll Kepegawaian |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai dari Kepegawaian |
| `cash_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> cash_accounts(id)` Rekening Kas Pencairan |
| `period_month` | `TINYINT UNSIGNED` | NO | - | Bulan Penggajian (1-12) |
| `period_year` | `SMALLINT UNSIGNED` | NO | - | Tahun Penggajian |
| `amount` | `DECIMAL(18,2)` | NO | - | Total Nominal Gaji Bersih (Take Home Pay) |
| `breakdown_snapshot` | `LONGTEXT` (JSON) | YES | `NULL` | Snapshot rincian komponen gaji saat dikunci |
| `status` | `ENUM` | NO | `'pending'` | `'pending','disbursed','rejected'` |
| `disbursed_at` | `TIMESTAMP` | YES | `NULL` | Waktu Pencairan Kas |
| `disbursed_by` | `BIGINT UNSIGNED` | YES | `NULL` | Bendahara Pencair |
| `rejected_reason` | `TEXT` | YES | `NULL` | Alasan Penolakan / Pengembalian ke HRD |
| `rejected_at` | `TIMESTAMP` | YES | `NULL` | Waktu Dikembalikan ke HRD |
| `rejected_by` | `BIGINT UNSIGNED` | YES | `NULL` | Bendahara Pengembalian |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 31. `journal_entries` (Header Jurnal Umum Akuntansi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `journal_number` | `VARCHAR(50)` | NO | - | Nomor Jurnal (e.g. `JRN-20260901-0001`) |
| `journal_date` | `DATE` | NO | - | Tanggal Jurnal |
| `source_type` | `VARCHAR(50)` | NO | - | `student_bill_issued`, `student_bill_payment`, `student_bill_discount`, `student_bill_write_off`, `expense`, `other_income`, `payroll_disbursement`, `manual_entry`, `opening_balance`, `cash_transfer`, `fiscal_year_closing` |
| `source_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Referensi Dokumen Sumber |
| `description` | `TEXT` | NO | - | Keterangan Jurnal |
| `total_debit` | `DECIMAL(18,2)` | NO | `0.00` | Total Sisi Debit |
| `total_credit` | `DECIMAL(18,2)` | NO | `0.00` | Total Sisi Kredit |
| `is_reversed` | `TINYINT(1)` | NO | `0` | Flag Jurnal Dibalik / Dibatalkan |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 32. `journal_entry_lines` (Rincian Baris Debit / Kredit Jurnal)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `journal_entry_id` | `BIGINT UNSIGNED` | NO | - | `FK -> journal_entries(id) CASCADE/CASCADE` |
| `chart_of_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> chart_of_accounts(id) RESTRICT/CASCADE` |
| `entry_side` | `ENUM('debit','credit')` | NO | - | Posisi Entri: Debit atau Kredit |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Baris |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 33. `savings_accounts` (Rekening Tabungan Santri / Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `account_number` | `VARCHAR(50)` | NO | - | Nomor Tabungan |
| `owner_type` | `ENUM('student','employee')`| NO | - | Pemilik Tabungan: Siswa / Pegawai |
| `owner_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa / Pegawai |
| `balance` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Tabungan |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 34. `savings_transactions` (Transaksi Setor & Tarik Tabungan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `savings_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> savings_accounts(id) CASCADE/CASCADE` |
| `transaction_type` | `ENUM('deposit','withdrawal')`| NO | - | Setor / Tarik |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Transaksi |
| `balance_after` | `DECIMAL(18,2)` | NO | - | Saldo Setelah Transaksi |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 35. `fiscal_year_closings` (Tutup Buku Tahunan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran yang Ditutup |
| `closed_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | Waktu Penutupan Buku |
| `closed_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `retained_earnings` | `DECIMAL(18,2)` | NO | - | Surplus / Defisit Bersih yang Dipindahkan |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 36. `finance_audit_logs` (Audit Trail Catatan Perubahan Data Keuangan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `user_id` | `BIGINT UNSIGNED` | YES | `NULL` | User Pelaku Aksi |
| `action` | `VARCHAR(100)` | NO | - | `create`, `update`, `delete`, `approve`, `reject`, `disburse` |
| `entity_name` | `VARCHAR(100)` | NO | - | Nama Tabel / Entitas |
| `entity_id` | `BIGINT UNSIGNED` | NO | - | ID Rekor yang Diubah |
| `old_values` | `LONGTEXT` (JSON) | YES | `NULL` | Nilai Lama Sebelum Perubahan |
| `new_values` | `LONGTEXT` (JSON) | YES | `NULL` | Nilai Baru Sesudah Perubahan |
| `reason` | `TEXT` | YES | `NULL` | Alasan Wajib Perubahan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### 37. `payment_reconciliations` (Rekonsiliasi Bank & Ingest Mutasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id)` |
| `bill_payment_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> bill_payments(id)` |
| `statement_date` | `DATE` | NO | - | Tanggal Rekening Koran |
| `bank_description` | `VARCHAR(255)` | NO | - | Deskripsi Mutasi Bank |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Mutasi |
| `status` | `ENUM` | NO | `'unmatched'` | `'unmatched','matched','discrepancy'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 38. `payment_gateway_transactions` (Transaksi Payment Gateway - Nonaktif / Arsip)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id)` |
| `gateway_provider` | `VARCHAR(50)` | NO | - | e.g. "midtrans", "xendit" |
| `transaction_id` | `VARCHAR(100)` | NO | - | ID Transaksi Gateway |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal |
| `status` | `ENUM` | NO | `'pending'` | `'pending','paid','expired','failed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### 39. `ppdb_registration_bills` (Tagihan Biaya Pendaftaran & Uang Pangkal PPDB Calon Murid)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `academic_year_id` | `BIGINT UNSIGNED` | YES | `NULL` | Tahun Ajaran Transaksi/Berjalan (`idx_ppdb_bills_academic_year`) |
| `target_academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran yang Dituju Calon Murid (`idx_ppdb_bills_target_ay`) |
| `psb_registrant_ref_id` | `BIGINT UNSIGNED` | NO | - | Referensi ID Calon Murid (`psb_registrants.id` di Akademik) |
| `registrant_name_snapshot` | `VARCHAR(150)` | NO | - | Snapshot Nama Calon Murid |
| `registration_number_snapshot`| `VARCHAR(50)` | YES | `NULL` | Snapshot No. Registrasi Calon Murid |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id)` (Pendaftaran / Uang Pangkal) |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Net Tagihan PPDB |
| `version` | `INT UNSIGNED` | NO | `1` | Nomor Versi Tagihan (Mendukung Revisi) |
| `paid_amount` | `DECIMAL(18,2)` | NO | `0.00` | Akumulasi Pembayaran Kas/Bank Terverifikasi (Safeguard Lock) |
| `discount_type` | `ENUM('percentage','fixed_amount','full_waiver')` | YES | `NULL` | Tipe Diskon Kasuistik |
| `discount_amount` | `DECIMAL(18,2)` | NO | `0.00` | Nominal Keringanan / Diskon |
| `discount_percentage` | `DECIMAL(5,2)` | YES | `NULL` | Persentase Diskon Kasuistik |
| `discount_sk_number` | `VARCHAR(100)` | YES | `NULL` | Nomor Surat Keputusan (SK) Diskon |
| `discount_sk_date` | `DATE` | YES | `NULL` | Tanggal SK Diskon |
| `discount_sk_document_url` | `VARCHAR(255)` | YES | `NULL` | Tautan URL Berkas SK Resmi |
| `discount_reason` | `TEXT` | YES | `NULL` | Alasan Pemberian Diskon Kasuistik |
| `approval_tier` | `ENUM('unit','yayasan')` | YES | `NULL` | Tingkat Kewenangan Otorisasi Approval Diskon |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pengesah Diskon |
| `approved_at` | `TIMESTAMP` | YES | `NULL` | Waktu Pengesahan Diskon |
| `rejection_reason` | `TEXT` | YES | `NULL` | Alasan Penolakan Diskon |
| `billing_phase` | `ENUM('registration_fee','enrollment_fee')` | NO | `'registration_fee'` | Fase Penagihan (Formulir vs Uang Pangkal) |
| `installment_number` | `SMALLINT UNSIGNED` | YES | `NULL` | Urutan Termin Cicilan (misal: 1) |
| `installment_total` | `SMALLINT UNSIGNED` | YES | `NULL` | Total Termin Paket Cicilan (misal: 3) |
| `parent_bill_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> ppdb_registration_bills(id) CASCADE` (Self-Reference Paket Cicilan) |
| `is_installment_parent`| `TINYINT(1)` | NO | `0` | Flag Induk Paket Cicilan (Kecualikan dari running balance untuk cegah double-count) |
| `scholarship_quota_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> ppdb_scholarship_quotas(id)` |
| `refund_status` | `ENUM('none','requested','approved','rejected','processed')` | NO | `'none'` | Status Alur Pengembalian Dana / Refund |
| `refund_amount` | `DECIMAL(18,2)` | NO | `0.00` | Nominal Bersih Refund yang Dicairkan |
| `refund_bank_account_number` | `VARCHAR(50)` | YES | `NULL` | No. Rekening Bank Wali Penerima Refund |
| `refund_bank_account_holder` | `VARCHAR(150)` | YES | `NULL` | Nama Pemilik Rekening Bank Wali |
| `refund_reason` | `TEXT` | YES | `NULL` | Alasan Pengunduran Diri Calon Murid |
| `refund_approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | User Yayasan Penyetuju Refund |
| `refund_processed_at` | `TIMESTAMP` | YES | `NULL` | Waktu Pencairan Kas Refund |
| `status` | `ENUM('draft','pending_approval','unpaid','partially_paid','paid','cancelled','refunded')` | NO | `'draft'` | Status Siklus Finansial Tagihan |
| `linked_student_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Siswa Definitif (Diisi saat Placement Hook PSB) |
| `notes` | `TEXT` | YES | `NULL` | Catatan |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Indexes:** `idx_ppdb_bills_academic_year`, `idx_ppdb_bills_phase`, `idx_ppdb_bills_parent`, `idx_ppdb_bills_refund_status`, `idx_ppdb_bills_unit_reg_fee`


#### 40. `ppdb_registration_payments` (Pembayaran Biaya Pendaftaran PPDB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `ppdb_registration_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> ppdb_registration_bills(id) CASCADE` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id)` Rekening Kas/Bank |
| `receipt_number` | `VARCHAR(50)` | NO | - | Nomor Kwitansi Unik (`KWT-PPDB-...`) |
| `amount_paid` | `DECIMAL(18,2)` | NO | - | Nominal yang Dibayarkan |
| `payment_date` | `DATE` | NO | - | Tanggal Pembayaran |
| `payment_method` | `ENUM('cash','bank_transfer','payment_gateway')` | NO | `'cash'` | Metode Bayar |
| `notes` | `TEXT` | YES | `NULL` | Catatan Kasir |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User Kasir |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `receipt_number (UNIQUE)`

#### 41. `ppdb_registration_bill_proofs` (Unggahan Bukti Transfer Pendaftaran PPDB Publik)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `ppdb_registration_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> ppdb_registration_bills(id) CASCADE` |
| `proof_file_url` | `VARCHAR(255)` | NO | - | URL Berkas Foto / Dokumen Struk Transfer |
| `transfer_amount` | `DECIMAL(18,2)` | NO | - | Nominal yang Ditransfer |
| `transfer_date` | `DATE` | NO | - | Tanggal Transfer |
| `bank_name` | `VARCHAR(100)` | YES | `NULL` | Nama Bank Pengirim / Channel |
| `sender_account_name` | `VARCHAR(150)` | YES | `NULL` | Nama Pemilik Rekening Pengirim |
| `target_cash_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> cash_accounts(id)` Rekening Kas/Bank Tujuan |
| `status` | `ENUM('pending','verified','rejected')` | NO | `'pending'` | Status Verifikasi Bukti |
| `verified_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Bendahara yang Memverifikasi |
| `verified_at` | `TIMESTAMP` | YES | `NULL` | Waktu Verifikasi |
| `rejection_reason` | `TEXT` | YES | `NULL` | Alasan Penolakan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Indexes:** `idx_ppdb_proofs_bill (ppdb_registration_bill_id)`, `idx_ppdb_proofs_status (status)`, `idx_ppdb_proofs_target_cash (target_cash_account_id)`

#### 42. `inter_year_fund_loans` (Pinjaman & Realokasi Saldo Kantong Antar Tahun Ajaran)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `from_academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran Sumber Dana yang Dipinjam |
| `to_academic_year_id` | `BIGINT UNSIGNED` | NO | - | Tahun Ajaran Pemakai/Peminjam Dana |
| `fund_type` | `VARCHAR(50)` | NO | `'fee_type'` | Tipe Kantong Sumber |
| `fund_ref_id` | `BIGINT UNSIGNED` | NO | `0` | Ref ID Pos Dana Sumber (`fee_types.id`) |
| `to_fund_type` | `VARCHAR(50)` | NO | `'fee_type'` | Tipe Kantong Penerima |
| `to_fund_ref_id` | `BIGINT UNSIGNED` | NO | `0` | Ref ID Pos Dana Penerima |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Pinjaman Awal |
| `purpose` | `TEXT` | NO | - | Alasan & Tujuan Penggunaan Dana |
| `status` | `ENUM('outstanding','partially_repaid','repaid')` | NO | `'outstanding'` | Status Pelunasan Pinjaman |
| `outstanding_amount` | `DECIMAL(18,2)` | NO | - | Sisa Pinjaman yang Belum Dikembalikan |
| `borrowed_by` | `BIGINT UNSIGNED` | YES | `NULL` | User Pembuat Pinjaman |
| `borrowed_at` | `DATE` | NO | - | Tanggal Peminjaman |
| `expected_repayment_note` | `VARCHAR(255)` | YES | `NULL` | Catatan Estimasi Pengembalian |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Indexes:** `idx_iyfl_unit (school_unit_id)`, `idx_iyfl_status (status)`, `idx_iyfl_from_ay (from_academic_year_id)`, `idx_iyfl_to_ay (to_academic_year_id)`

#### 43. `inter_year_fund_loan_repayments` (Riwayat Pengembalian Pinjaman Antar Tahun Ajaran)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `inter_year_fund_loan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> inter_year_fund_loans(id) CASCADE` |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Pengembalian Dana |
| `repaid_at` | `DATE` | NO | - | Tanggal Pengembalian |
| `repaid_by` | `BIGINT UNSIGNED` | YES | `NULL` | User yang Mencatat Pengembalian |
| `notes` | `TEXT` | YES | `NULL` | Catatan Pengembalian |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `idx_iyflr_loan (inter_year_fund_loan_id)`

#### 44. `ppdb_bill_revisions` (Audit Trail & Riwayat Revisi Tagihan PPDB Pasca-Terbit)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `ppdb_registration_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> ppdb_registration_bills(id) CASCADE` |
| `revision_number` | `INT UNSIGNED` | NO | - | Urutan Nomor Revisi (1, 2, 3...) |
| `previous_amount` | `DECIMAL(18,2)` | NO | - | Nominal Net Sebelum Direvisi |
| `new_amount` | `DECIMAL(18,2)` | NO | - | Nominal Net Setelah Direvisi |
| `previous_discount_amount`| `DECIMAL(18,2)` | NO | `0.00` | Diskon Sebelum Revisi |
| `new_discount_amount` | `DECIMAL(18,2)` | NO | `0.00` | Diskon Sesudah Revisi |
| `discount_sk_number` | `VARCHAR(100)` | YES | `NULL` | Nomor SK Acuan Revisi |
| `discount_sk_date` | `DATE` | YES | `NULL` | Tanggal SK Acuan Revisi |
| `discount_sk_document_url`| `VARCHAR(255)` | YES | `NULL` | URL Dokumen SK |
| `discount_reason` | `TEXT` | YES | `NULL` | Alasan Diskon Baru |
| `revision_reason` | `TEXT` | NO | - | Alasan Wajib Revisi Operasional |
| `adjustment_journal_entry_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> journal_entries(id) SET NULL` |
| `revised_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pelaku Revisi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Indexes:** `idx_ppdb_revisions_bill (ppdb_registration_bill_id)`, `uq_ppdb_revisions_bill_num (ppdb_registration_bill_id, revision_number)`

#### 45. `ppdb_refund_policy_rules` (Konfigurasi Dinamis Aturan Pengembalian Dana PPDB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `fee_component` | `ENUM('registration_fee','enrollment_fee')` | NO | `'enrollment_fee'` | Komponen Biaya yang Diatur |
| `is_refundable` | `TINYINT(1)` | NO | `1` | Flag Apakah Bisa Di-refund |
| `cutoff_date` | `DATE` | YES | `NULL` | Batas Tanggal Pengunduran Diri |
| `deduction_percentage` | `DECIMAL(5,2)` | NO | `0.00` | Persentase Potongan Biaya Administrasi (%) |
| `description` | `VARCHAR(255)` | YES | `NULL` | Deskripsi Aturan Yayasan |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif Aturan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Indexes:** `idx_ppdb_refund_rules_component (fee_component)`, `idx_ppdb_refund_rules_active (is_active)`

#### 46. `ppdb_scholarship_quotas` (Konfigurasi Dinamis Alokasi Kuota Beasiswa PPDB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | Target Tahun Masuk Santri Penerima |
| `quota_category` | `VARCHAR(100)` | NO | - | Kategori Beasiswa (misal: Tahfidz, Dhuafa, Anak Guru) |
| `max_quota` | `INT UNSIGNED` | NO | `0` | Batas Maksimal Kuota Santri |
| `used_quota` | `INT UNSIGNED` | NO | `0` | Jumlah Kuota yang Telah Diterbitkan Tagihannya |
| `description` | `VARCHAR(255)` | YES | `NULL` | Keterangan Syarat / SK Yayasan |
| `is_active` | `TINYINT(1)` | NO | `1` | Status Aktif Kuota |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Indexes:** `idx_ppdb_quotas_ay (academic_year_id)`, `idx_ppdb_quotas_category (quota_category)`

---

## 3. Inventarisasi Endpoint REST API (175 Endpoint)


Prefix Global: `/api/v1/keuangan`

### 3.1 Submodul: Master Data (`/api/v1/keuangan/master-data` / `/api/v1/keuangan/master`) — 48 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/cash-accounts` | `keuangan.master.cash_accounts.manage` | `controller.listCashAccounts` |
| `POST` | `/cash-accounts` | `keuangan.master.cash_accounts.manage` | `controller.createCashAccount` |
| `PUT` | `/cash-accounts/:id` | `keuangan.master.cash_accounts.manage` | `controller.updateCashAccount` |
| `DELETE` | `/cash-accounts/:id` | `keuangan.master.cash_accounts.manage` | `controller.deleteCashAccount` |
| `PATCH` | `/cash-accounts/:id/status` | `keuangan.master.cash_accounts.manage` | `controller.toggleCashAccountStatus` |
| `GET` | `/cash-accounts/:id/audit-logs` | `keuangan.master.cash_accounts.manage` | `controller.getCashAccountAuditLogs` |
| `GET` | `/cash-accounts/opening-balances` | `keuangan.master.cash_accounts.manage` | `controller.listCashAccountOpeningBalances` |
| `POST` | `/cash-accounts/opening-balances` | `keuangan.master.cash_accounts.manage` | `controller.createCashAccountOpeningBalance` |
| `GET` | `/chart-of-accounts` | `keuangan.master.coa.manage` | `controller.listAccounts` |
| `POST` | `/chart-of-accounts` | `keuangan.master.coa.manage` | `controller.createAccount` |
| `PUT` | `/chart-of-accounts/:id` | `keuangan.master.coa.manage` | `controller.updateAccount` |
| `DELETE` | `/chart-of-accounts/:id` | `keuangan.master.coa.manage` | `controller.deleteAccount` |
| `PATCH` | `/chart-of-accounts/:id/status` | `keuangan.master.coa.manage` | `controller.toggleAccountStatus` |
| `GET` | `/chart-of-accounts/:id/audit-logs` | `keuangan.master.coa.manage` | `controller.getAccountAuditLogs` |
| `GET` | `/transaction-account-mappings` | `keuangan.master.coa.manage` | `controller.listTransactionAccountMappings` |
| `POST` | `/transaction-account-mappings` | `keuangan.master.coa.manage` | `controller.createTransactionAccountMapping` |
| `PUT` | `/transaction-account-mappings/:id` | `keuangan.master.coa.manage` | `controller.updateTransactionAccountMapping` |
| `DELETE` | `/transaction-account-mappings/:id` | `keuangan.master.coa.manage` | `controller.deleteTransactionAccountMapping` |
| `PATCH` | `/transaction-account-mappings/:id/status` | `keuangan.master.coa.manage` | `controller.toggleTransactionAccountMappingStatus` |
| `GET` | `/transaction-rules` | `keuangan.master.coa.manage` | `controller.listTransactionRules` |
| `PUT` | `/transaction-rules/:id` | `keuangan.master.coa.manage` | `controller.updateTransactionRule` |
| `DELETE` | `/transaction-rules/:id` | `keuangan.master.coa.manage` | `controller.deleteTransactionRule` |
| `GET` | `/fee-groups` | `keuangan.master.fees.manage` | `controller.listFeeGroups` |
| `POST` | `/fee-groups` | `keuangan.master.fees.manage` | `controller.createFeeGroup` |
| `PUT` | `/fee-groups/:id` | `keuangan.master.fees.manage` | `controller.updateFeeGroup` |
| `DELETE` | `/fee-groups/:id` | `keuangan.master.fees.manage` | `controller.deleteFeeGroup` |
| `GET` | `/fee-types` | `keuangan.master.fees.manage` | `controller.listFeeTypes` |
| `POST` | `/fee-types` | `keuangan.master.fees.manage` | `controller.createFeeType` |
| `PUT` | `/fee-types/:id` | `keuangan.master.fees.manage` | `controller.updateFeeType` |
| `DELETE` | `/fee-types/:id` | `keuangan.master.fees.manage` | `controller.deleteFeeType` |
| `PATCH` | `/fee-types/:id/status` | `keuangan.master.fees.manage` | `controller.toggleFeeTypeStatus` |
| `GET` | `/fee-reference-amounts` | `keuangan.master.fees.manage` | `controller.listFeeReferenceAmounts` |
| `POST` | `/fee-reference-amounts` | `keuangan.master.fees.manage` | `controller.createFeeReferenceAmount` |
| `PUT` | `/fee-reference-amounts/:id` | `keuangan.master.fees.manage` | `controller.updateFeeReferenceAmount` |
| `DELETE` | `/fee-reference-amounts/:id` | `keuangan.master.fees.manage` | `controller.deleteFeeReferenceAmount` |
| `GET` | `/transaction-categories` | `keuangan.master.categories.manage` | `controller.listTransactionCategories` |
| `POST` | `/transaction-categories` | `keuangan.master.categories.manage` | `controller.createTransactionCategory` |
| `PUT` | `/transaction-categories/:id` | `keuangan.master.categories.manage` | `controller.updateTransactionCategory` |
| `DELETE` | `/transaction-categories/:id` | `keuangan.master.categories.manage` | `controller.deleteTransactionCategory` |
| `GET` | `/budget-programs` | `keuangan.master.categories.manage` | `controller.listBudgetPrograms` |
| `POST` | `/budget-programs` | `keuangan.master.categories.manage` | `controller.createBudgetProgram` |
| `PUT` | `/budget-programs/:id` | `keuangan.master.categories.manage` | `controller.updateBudgetProgram` |
| `DELETE` | `/budget-programs/:id` | `keuangan.master.categories.manage` | `controller.deleteBudgetProgram` |
| `GET` | `/student-fee-adjustments` | `keuangan.master.fee_adjustments.submit` | `controller.listStudentFeeAdjustments` |
| `POST` | `/student-fee-adjustments` | `keuangan.master.fee_adjustments.submit` | `controller.createStudentFeeAdjustment` |
| `PATCH` | `/student-fee-adjustments/:id/submit` | `keuangan.master.fee_adjustments.submit` | `controller.submitStudentFeeAdjustment` |
| `PATCH` | `/student-fee-adjustments/:id/approve` | `keuangan.master.fee_adjustments.approve` | `controller.approveStudentFeeAdjustment` |
| `PATCH` | `/student-fee-adjustments/:id/reject` | `keuangan.master.fee_adjustments.approve` | `controller.rejectStudentFeeAdjustment` |

### 3.2 Submodul: Skema Biaya Pendidikan (`/api/v1/keuangan`) — 8 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/fee-schemes` | `keuangan.master.fees.manage` | `feeSchemesController.listFeeSchemes` |
| `GET` | `/fee-schemes/:id` | `keuangan.master.fees.manage` | `feeSchemesController.getFeeSchemeById` |
| `POST` | `/fee-schemes` | `keuangan.master.fees.manage` | `feeSchemesController.createFeeScheme` |
| `PUT` | `/fee-schemes/:id` | `keuangan.master.fees.manage` | `feeSchemesController.updateFeeScheme` |
| `PATCH` | `/fee-schemes/:id/status` | `keuangan.master.fees.manage` | `feeSchemesController.toggleFeeSchemeStatus` |
| `GET` | `/student-fee-assignments` | `keuangan.master.fee_adjustments.submit` | `feeSchemesController.listStudentAssignments` |
| `POST` | `/student-fee-assignments` | `keuangan.master.fee_adjustments.submit` | `feeSchemesController.assignSchemeToStudent` |
| `POST` | `/student-fee-assignments/bulk` | `keuangan.master.fee_adjustments.submit` | `feeSchemesController.bulkAssignSchemeToStudents` |

### 3.3 Submodul: RAPBS & Standar Biaya Katalog (`/api/v1/keuangan`) — 17 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/budget-plans` | `keuangan.budget.view` | `controller.listBudgetPlans` |
| `POST` | `/budget-plans` | `keuangan.budget.manage` | `controller.createBudgetPlan` |
| `GET` | `/budget-plans/:id` | `keuangan.budget.view` | `controller.getBudgetPlanById` |
| `PUT` | `/budget-plans/:id` | `keuangan.budget.manage` | `controller.updateBudgetPlan` |
| `PATCH` | `/budget-plans/:id/publish` | `keuangan.budget.publish` | `controller.publishBudgetPlan` |
| `POST` | `/budget-plans/:id/new-version` | `keuangan.budget.manage` | `controller.createNewVersion` |
| `GET` | `/budget-plans/:id/realization` | `keuangan.budget.view` | `controller.getBudgetRealization` |
| `POST` | `/budget-plans/:id/generate-income-from-fees` | `keuangan.budget.manage` | `controller.generateIncomeFromFees` |
| `POST` | `/budget-plans/:id/income-items` | `keuangan.budget.manage` | `controller.addIncomeItem` |
| `PUT` | `/budget-plans/:id/income-items/:itemId` | `keuangan.budget.manage` | `controller.updateIncomeItem` |
| `DELETE` | `/budget-plans/:id/income-items/:itemId` | `keuangan.budget.manage` | `controller.deleteIncomeItem` |
| `POST` | `/budget-plans/:id/expense-items` | `keuangan.budget.manage` | `controller.addExpenseItem` |
| `PUT` | `/budget-plans/:id/expense-items/:itemId` | `keuangan.budget.manage` | `controller.updateExpenseItem` |
| `DELETE` | `/budget-plans/:id/expense-items/:itemId` | `keuangan.budget.manage` | `controller.deleteExpenseItem` |
| `GET` | `/catalog-items` | `keuangan.master.categories.manage` | `controller.listCatalogItems` |
| `POST` | `/catalog-items` | `keuangan.master.categories.manage` | `controller.createCatalogItem` |
| `PUT` | `/catalog-items/:id` | `keuangan.master.categories.manage` | `controller.updateCatalogItem` |
| `PATCH` | `/catalog-items/:id/status` | `keuangan.master.categories.manage` | `controller.toggleCatalogItemStatus` |
| `GET` | `/catalog-items/:id/price-history` | `keuangan.master.categories.manage` | `controller.getCatalogItemPriceHistory` |

### 3.4 Submodul: Tagihan Siswa (`/api/v1/keuangan`) — 11 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `POST` | `/student-bills/generate/preview` | `keuangan.bills.generate` | `controller.previewBillGeneration` |
| `POST` | `/student-bills/generate` | `keuangan.bills.generate` | `controller.generateBills` |
| `GET` | `/student-bills` | `keuangan.bills.view` | `controller.listBills` |
| `GET` | `/student-bills/:id` | `keuangan.bills.view` | `controller.getBillById` |
| `PATCH` | `/student-bills/:id/draft` | `keuangan.bills.generate` | `controller.updateDraftBill` |
| `PATCH` | `/student-bills/:id/publish` | `keuangan.bills.generate` | `controller.publishDraftBill` |
| `POST` | `/student-bills/publish-all` | `keuangan.bills.generate` | `controller.publishAllDraftBills` |
| `PATCH` | `/student-bills/:id/cancel` | `keuangan.bills.cancel` | `controller.cancelBill` |
| `PATCH` | `/student-bills/:id/write-off` | `keuangan.bills.write_off` | `controller.writeOffBill` |
| `POST` | `/student-bills/:id/reminders` | `keuangan.bills.view` | `controller.sendBillReminder` |
| `POST` | `/student-bills/reminders/run` | `keuangan.bills.view` | `controller.runReminders` |

### 3.5 Submodul: Pembayaran & Bukti Transfer (`/api/v1/keuangan`) — 18 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `POST` | `/bill-payments` | `keuangan.payments.record` | `controller.recordBillPayment` |
| `GET` | `/bill-payments/:id/history` | `keuangan.payments.correct` | `controller.getPaymentHistory` |
| `PATCH` | `/bill-payments/:id` | `keuangan.payments.correct` | `controller.correctPayment` |
| `GET` | `/bill-payments/:id/receipt` | `keuangan.payments.record` | `controller.getReceipt` |
| `GET` | `/bill-payments/:id/receipt.pdf` | `keuangan.payments.record` | `controller.getReceiptPdf` |
| `POST` | `/bill-payments/:id/refund` | `keuangan.payments.refund` | `controller.refundPayment` |
| `GET` | `/bill-payment-proofs` | `keuangan.payments.record` | `controller.listPaymentProofs` |
| `GET` | `/bill-payment-proofs/:id/allocations` | `keuangan.payments.record` | `controller.getPaymentProofAllocations` |
| `POST` | `/bill-payment-proofs/:id/allocations` | `keuangan.payments.record` | `controller.savePaymentProofAllocations` |
| `PATCH` | `/bill-payment-proofs/:id/verify` | `keuangan.payments.record` | `controller.verifyPaymentProof` |
| `PATCH` | `/bill-payment-proofs/:id/reject` | `keuangan.payments.record` | `controller.rejectPaymentProof` |
| `GET` | `/payment-reconciliations` | `keuangan.payments.reconcile` | `controller.listReconciliations` |
| `POST` | `/payment-reconciliations/:id/match` | `keuangan.payments.reconcile` | `controller.matchReconciliation` |
| `POST` | `/payment-reconciliations/:id/flag-discrepancy` | `keuangan.payments.reconcile` | `controller.flagDiscrepancy` |
| `POST` | `/internal/payment-reconciliations/ingest` | `requireApiKey` | `controller.ingestReconciliationInternal` |
| `POST` | `/payment-gateway/checkout` | `keuangan.payments.record` | `controller.checkoutGateway` |
| `POST` | `/payment-gateway/callback` | `verifyJwt` | `controller.handleGatewayCallback` |
| `GET` | `/payment-gateway/transactions` | `keuangan.payments.record` | `controller.listGatewayTransactions` |

### 3.6 Submodul: Pengeluaran Kas Operasional (`/api/v1/keuangan`) — 5 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/expenses` | `keuangan.expenses.manage` | `controller.listExpenses` |
| `GET` | `/expenses/:id` | `keuangan.expenses.manage` | `controller.getExpenseById` |
| `POST` | `/expenses` | `keuangan.expenses.manage` | `controller.createExpense` |
| `PUT` | `/expenses/:id` | `keuangan.expenses.manage` | `controller.updateExpense` |
| `DELETE` | `/expenses/:id` | `keuangan.expenses.manage` | `controller.deleteExpense` |

### 3.7 Submodul: Penerimaan Lain-lain (`/api/v1/keuangan`) — 5 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/other-incomes` | `keuangan.income.manage` | `controller.listOtherIncomes` |
| `GET` | `/other-incomes/:id` | `keuangan.income.manage` | `controller.getOtherIncomeById` |
| `POST` | `/other-incomes` | `keuangan.income.manage` | `controller.createOtherIncome` |
| `PUT` | `/other-incomes/:id` | `keuangan.income.manage` | `controller.updateOtherIncome` |
| `DELETE` | `/other-incomes/:id` | `keuangan.income.manage` | `controller.deleteOtherIncome` |

### 3.8 Submodul: Transfer Kas Antar Rekening (`/api/v1/keuangan`) — 2 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/cash-transfers` | `keuangan.master.cash_accounts.manage` | `controller.listTransfers` |
| `POST` | `/cash-transfers` | `keuangan.master.cash_accounts.manage` | `controller.createTransfer` |

### 3.9 Submodul: Penggajian & Pencairan Payroll (`/api/v1/keuangan`) — 4 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `POST` | `/internal/payroll-disbursements/ingest` | `requireApiKey` | `controller.ingestPayrollInternal` |
| `GET` | `/payroll-disbursements` | `keuangan.payroll.disburse` | `controller.listPayrollDisbursements` |
| `POST` | `/payroll-disbursements/:id/disburse` | `keuangan.payroll.disburse` | `controller.disbursePayroll` |
| `POST` | `/payroll-disbursements/:id/reject` | `keuangan.payroll.disburse` | `controller.rejectPayroll` |

### 3.10 Submodul: Pembukuan, Tabungan & Saldo Sumber Dana (`/api/v1/keuangan`) — 17 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/journal-entries` | `keuangan.bookkeeping.view` | `controller.listJournalEntries` |
| `GET` | `/journal-entries/:id` | `keuangan.bookkeeping.view` | `controller.getJournalEntryById` |
| `POST` | `/journal-entries/manual` | `keuangan.bookkeeping.manual_entry` | `controller.createManualJournalEntry` |
| `GET` | `/savings-accounts` | `keuangan.savings.manage` | `controller.listSavingsAccounts` |
| `GET` | `/savings-accounts/:id` | `keuangan.savings.manage` | `controller.getSavingsAccountById` |
| `POST` | `/savings-accounts/:id/deposit` | `keuangan.savings.manage` | `controller.depositSavings` |
| `POST` | `/savings-accounts/:id/withdraw` | `keuangan.savings.manage` | `controller.withdrawSavings` |
| `GET` | `/fiscal-year-closings` | `keuangan.bookkeeping.close_year` | `controller.listFiscalYearClosings` |
| `POST` | `/fiscal-year-closings` | `keuangan.bookkeeping.close_year` | `controller.closeFiscalYear` |
| `GET` | `/fund-balances` | `keuangan.reports.view` | `controller.listFundBalances` |
| `GET` | `/fund-balances/:id/mutations` | `keuangan.reports.view` | `controller.listFundBalanceMutations` |
| `GET` | `/fund-balances/inter-year-loans` | `keuangan.bookkeeping.view`, `keuangan.fund_balances.manage_loan` | `controller.listInterYearLoans` |
| `POST` | `/fund-balances/inter-year-loans` | `keuangan.fund_balances.manage_loan` | `controller.createInterYearLoan` |
| `GET` | `/fund-balances/inter-year-loans/:id` | `keuangan.bookkeeping.view`, `keuangan.fund_balances.manage_loan` | `controller.getInterYearLoanById` |
| `POST` | `/fund-balances/inter-year-loans/:id/repay` | `keuangan.fund_balances.manage_loan` | `controller.repayInterYearLoan` |
| `GET` | `/fund-balances/academic-year-loans-summary` | `keuangan.bookkeeping.view`, `keuangan.budget.view` | `controller.getAcademicYearLoansSummary` |
| `GET` | `/audit-logs` | `keuangan.security.audit_logs.view` | `controller.listAuditLogs` |

### 3.11 Submodul: Laporan Keuangan Standar Akuntansi (`/api/v1/keuangan`) — 9 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/reports/budget-realization` | `keuangan.reports.view` | `controller.getBudgetRealization` |
| `GET` | `/reports/general-ledger` | `keuangan.reports.view` | `controller.getGeneralLedger` |
| `GET` | `/reports/trial-balance` | `keuangan.reports.view` | `controller.getTrialBalance` |
| `GET` | `/reports/income-statement` | `keuangan.reports.view` | `controller.getIncomeStatement` |
| `GET` | `/reports/cash-flow` | `keuangan.reports.view` | `controller.getCashFlow` |
| `GET` | `/reports/balance-sheet` | `keuangan.reports.view` | `controller.getBalanceSheet` |
| `GET` | `/reports/student-ledger` | `keuangan.reports.view` | `controller.getClassStudentLedger` |
| `GET` | `/reports/student-ledger/:student_id` | `keuangan.reports.view` | `controller.getStudentLedger` |
| `GET` | `/reports/student-ledger/:student_id/pdf` | `keuangan.reports.view` | `controller.getStudentLedgerPdf` |

### 3.12 Submodul: Dashboard Agregat (`/api/v1/keuangan`) — 1 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/dashboard` | `keuangan.reports.view` | `controller.getDashboardData` |

### 3.13 Submodul: Parent-Facing Self Service (`/api/v1/keuangan`) — 5 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/parent-facing/bills` | `keuangan.parent.self_service` | `controller.listBills` |
| `GET` | `/parent-facing/bills/:id` | `keuangan.parent.self_service` | `controller.getBillDetail` |
| `GET` | `/parent-facing/payments` | `keuangan.parent.self_service` | `controller.listPayments` |
| `GET` | `/parent-facing/savings` | `keuangan.parent.self_service` | `controller.getSavings` |
| `POST` | `/parent-facing/bills/:id/transfer-proof` | `keuangan.parent.self_service` | `controller.submitTransferProof` |

### 3.14 Submodul: Migrasi Data Historis (`/api/v1/keuangan`) — 5 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/legacy-migration/cutover-date` | `keuangan.bills.view` | `controller.getCutoverDate` |
| `POST` | `/legacy-migration/cutover-date` | `keuangan.bills.generate` | `controller.setCutoverDate` |
| `GET` | `/legacy-migration/bills` | `keuangan.bills.view` | `controller.listLegacyBills` |
| `POST` | `/legacy-migration/bills` | `keuangan.bills.generate` | `controller.createLegacyBill` |
| `POST` | `/legacy-migration/bills/:id/legacy-payments` | `keuangan.payments.record` | `controller.addLegacyPayment` |

### 3.15 Submodul: Penagihan & Pembayaran PPDB (`/api/v1/keuangan`) — 30 Endpoint
| Method | Endpoint Path | Izin Akses / Permission | Handler Controller |
|---|---|---|---|
| `GET` | `/ppdb-billing/registration-bills` | `keuangan.ppdb_billing.manage` | `controller.listRegistrationBills` |
| `GET` | `/ppdb-billing/candidates` | `keuangan.ppdb_billing.manage` | `controller.getRegistrantCandidates` |
| `POST` | `/ppdb-billing/registration-bills` | `keuangan.ppdb_billing.manage` | `controller.createRegistrationBill` |
| `POST` | `/ppdb-billing/registration-bills/publish` | `keuangan.ppdb_billing.manage` | `controller.publishRegistrationBills` |
| `POST` | `/ppdb-billing/registration-bills/:id/approve-discount` | `keuangan.ppdb_billing.manage` | `controller.approveDiscount` |
| `POST` | `/ppdb-billing/registration-bills/:id/reject-discount` | `keuangan.ppdb_billing.manage` | `controller.rejectDiscount` |
| `POST` | `/ppdb-billing/registration-bills/:id/revise` | `keuangan.ppdb_billing.manage` | `controller.reviseRegistrationBill` |
| `GET` | `/ppdb-billing/registration-bills/:id/revisions` | `keuangan.ppdb_billing.manage` | `controller.getRegistrationBillRevisions` |
| `POST` | `/ppdb-billing/registration-bills/:id/installments` | `keuangan.ppdb_billing.manage` | `controller.createInstallmentPlan` |
| `POST` | `/ppdb-billing/registration-bills/:id/pay` | `keuangan.ppdb_billing.manage` | `controller.recordRegistrationPayment` |
| `POST` | `/ppdb-billing/registration-bills/:id/cancel` | `keuangan.ppdb_billing.manage` | `controller.cancelRegistrationBill` |
| `POST` | `/ppdb-billing/registration-bills/:id/refund-request` | `keuangan.ppdb_billing.manage` | `controller.requestRefund` |
| `PATCH` | `/ppdb-billing/registration-bills/:id/refund-request/approve` | `keuangan.ppdb_billing.manage` | `controller.approveRefund` |
| `PATCH` | `/ppdb-billing/registration-bills/:id/refund-request/reject` | `keuangan.ppdb_billing.manage` | `controller.rejectRefund` |
| `PATCH` | `/ppdb-billing/registration-bills/:id/refund-request/process` | `keuangan.ppdb_billing.manage` | `controller.processRefund` |
| `GET` | `/ppdb-billing/refund-policy-rules` | `keuangan.ppdb_billing.manage` | `controller.listRefundRules` |
| `POST` | `/ppdb-billing/refund-policy-rules` | `keuangan.ppdb_billing.manage` | `controller.createRefundRule` |
| `PUT` | `/ppdb-billing/refund-policy-rules/:id` | `keuangan.ppdb_billing.manage` | `controller.updateRefundRule` |
| `DELETE` | `/ppdb-billing/refund-policy-rules/:id` | `keuangan.ppdb_billing.manage` | `controller.deleteRefundRule` |
| `GET` | `/ppdb-billing/scholarship-quotas` | `keuangan.ppdb_billing.manage` | `controller.listScholarshipQuotas` |
| `POST` | `/ppdb-billing/scholarship-quotas` | `keuangan.ppdb_billing.manage` | `controller.createScholarshipQuota` |
| `PUT` | `/ppdb-billing/scholarship-quotas/:id` | `keuangan.ppdb_billing.manage` | `controller.updateScholarshipQuota` |
| `DELETE` | `/ppdb-billing/scholarship-quotas/:id` | `keuangan.ppdb_billing.manage` | `controller.deleteScholarshipQuota` |
| `GET` | `/ppdb-billing/payments/:payment_id/receipt` | `keuangan.ppdb_billing.manage` | `controller.getReceiptPdf` |
| `GET` | `/ppdb-billing/proofs` | `keuangan.ppdb_billing.manage` | `controller.listProofs` |
| `PATCH` | `/ppdb-billing/proofs/:id/verify` | `keuangan.ppdb_billing.manage` | `controller.verifyProof` |
| `PATCH` | `/ppdb-billing/proofs/:id/reject` | `keuangan.ppdb_billing.manage` | `controller.rejectProof` |
| `POST` | `/public/ppdb-billing/registration-bills/:id/upload-proof` | Publik (No JWT) | `controller.uploadPublicProof` |
| `GET` | `/public/ppdb-billing/registration-bills/:id/status` | Publik (No JWT) | `controller.getPublicStatus` |
| `GET` | `/public/ppdb-billing/bank-accounts` | Publik (No JWT) | `controller.getPublicBankAccounts` |
| `POST` | `/internal/ppdb-billing/registration-bills` | `internal` / Service | `controller.createBillInternal` |
| `POST` | `/internal/ppdb-billing/registration-bills/link-student` | `internal` / Service | `controller.linkStudent` |

---

## 4. UI Routes & Komponen Halaman Frontend (`apps/core-portal/`) — 17 Halaman

| Route Path | File Komponen (.jsx) | Struktur Tab / Fitur Utama |
|---|---|---|
| `/keuangan/dashboard` | `Dashboard.jsx` | Single view: Rekap saldo kas, grafik arus kas, piutang tagihan, realisasi anggaran RAPBS, banner alert draf tagihan & approval diskon siap disahkan. |
| `/keuangan/master-data` | `MasterData.jsx` | **6 Tab**: `cash_accounts` (Kas & Bank), `coa` (COA 7 Kelompok), `transaction_rules` (17 Aturan Transaksi), `fee_types` (Jenis Biaya & Akun Pendapatan), `categories` (Kategori Operasional & Program), `fee_adjustments` (Dispensasi & Keringanan). |
| `/keuangan/fee-schemes` | `FeeSchemes.jsx` | Single view: Kelola template skema biaya sekolah, rincian nominal per pos biaya, filter target angkatan/tingkat kelas/rombel. |
| `/keuangan/fee-assignments` | `StudentFeeAssignments.jsx` | Single view: Penugasan skema biaya per siswa, penetapan nominal custom, bulk assign, footer total akumulasi sticky. |
| `/keuangan/budget` | `BudgetPlans.jsx` | **2 Tab**: `rapbs` (Matriks 12 Bulan & Ringkas Tahunan, Belanja Itemized & Belanja Lump Sum per Kegiatan, sticky header/footer, Cash Flow Forecast bulanan, banner validasi silang pinjaman antar TA), `catalog` (Standar Biaya Katalog, Plafon Harga & Riwayat Harga). |
| `/keuangan/bills` | `StudentBills.jsx` | **3 Tab**: `draft` (Draf Tagihan Belum Terbit & One-Click Confirm), `pending_approval` (Menunggu Persetujuan Diskon Kasuistik Berjenjang), `published` (Tagihan Terbit & Pembayaran). Modal Draf Manual Ad-hoc (`keuangan.bills.create_manual`), Modal Revisi Pasca-Terbit Safeguard Nominal Terbayar (`paid_amount` Lock), Modal Riwayat Revisi Tagihan (`student_bill_revisions`), Tombol Auto-Generate Bulanan Pola Hibrida. |
| `/portal-orangtua/tagihan` / `/keuangan/portal-wali` | `ParentBills.jsx` | Single view (Parent-Facing): Ringkasan tagihan & tabungan santri, status lunas/sebagian/belum lunas, rincian beasiswa & SK diskon, modal detail riwayat kwitansi pembayaran, form upload konfirmasi transfer bank & mutasi. |
| `/keuangan/ppdb-billing` | `RegistrationBilling.jsx` | **3 Tab**: `bills` (Daftar Tagihan & Piutang PPDB: Draf, Approval Diskon SK Berjenjang, Terbit Massal Jurnal `ppdb_bill_issued`, Kasir Pembayaran, Revisi Safeguard Lock `paid_amount`, Riwayat Revisi, Pecah Termin Cicilan Uang Pangkal, Pengajuan/Approval/Pencairan Refund), `proofs` (Antrean Verifikasi Bukti Transfer Calon Murid FIFO, Struk, Kas Masuk, Tolak Bukti), `policies` (Pengaturan Kebijakan Refund & Kuota Beasiswa Dinamis Yayasan). |
| `/keuangan/payments` | `Payments.jsx` | **2 Tab**: `proofs` (Antrean Verifikasi Bukti Transfer FIFO & Multi-Tagihan Split Allocations), `pos` (Kasir Pembayaran Langsung Tunai/Bank & Kwitansi). |
| `/keuangan/student-payment-card` | `StudentPaymentCard.jsx` | **2 Tab**: `individual` (Buku Pembantu Piutang Siswa Terpadu dengan Tagihan & Kwitansi PPDB Berkesinambungan, Riwayat Tagihan Siswa Aktif & Cicilan PPDB, Cetak Slip), `class_recap` (Rekapitulasi Tunggakan per Kelas/Rombel). |

| `/keuangan/expenses` | `Expenses.jsx` | Single view: Pencatatan pengeluaran kas operasional, pemilihan item belanja RAPBS, pemilihan sumber dana pos biaya, validasi sisa pagu. |
| `/keuangan/other-incomes` | `OtherIncomes.jsx` | Single view: Pencatatan pendapatan BOS, donasi yayasan, sewa aset, dan penerimaan non-siswa. |
| `/keuangan/fund-balances` | `FundBalances.jsx` | **2 Tab**: `balances` (Saldo Kantong Dana per Pos & per Tahun Ajaran, Riwayat Mutasi Saldo), `loans` (Pinjaman & Realokasi Antar Tahun Ajaran, Progress Pelunasan, Warning &gt;90 Hari, Catat Pinjaman & Pengembalian). |
| `/keuangan/payroll` | `Payroll.jsx` | Single view: Verifikasi draf gaji terkunci dari Kepegawaian, snapshot rincian komponen gaji, pencairan via kas, alur kembalikan ke HRD. |
| `/keuangan/bookkeeping` | `Bookkeeping.jsx` | Single view: Jurnal umum akuntansi, entri jurnal koreksi manual, rekening tabungan santri, tutup buku tahunan & audit logs. |
| `/keuangan/reports` | `Reports.jsx` | Single view: Buku besar, neraca saldo, laba rugi / aktivitas, arus kas, neraca / posisi keuangan, realisasi RAPBS, ekspor PDF. |
| `/keuangan/legacy-migration` | `LegacyMigration.jsx` | Single view: Pengaturan tanggal cutover, input tagihan & pembayaran historis masa lalu tanpa pengaruh ke kas/jurnal baru. |
| `/keuangan/login` | `Login.jsx` | Single view: Form autentikasi kasir, staf tata usaha keuangan, dan bendahara sekolah. |

---

## 5. Workflows & State Machines Terverifikasi

1. **Aturan Transaksi Otomatis (16 Default Rules Terkunci):**
   - Transaksi sistem (`is_system = 1`) terproteksi dari penghapusan.
   - Jurnal dibuat otomatis dan seimbang (Debit = Kredit) untuk 16 skenario bisnis: Penerbitan Tagihan, Pembayaran Siswa, Diskon, Penghapusan Piutang, Pengembalian/Refund, Penerimaan Lain, Pengeluaran RAPBS, Pencairan Payroll, Setor/Tarik Tabungan, Transfer Kas, Saldo Awal, Entri Manual, dan Tutup Buku.
2. **Skema Biaya Pendidikan & Penagihan Bertahap:**
   - Pembuatan Skema Biaya $\rightarrow$ Penugasan Siswa (`student_fee_scheme_assignments`) $\rightarrow$ Generate Tagihan Draft $\rightarrow$ Edit Draft & Diskon $\rightarrow$ Terbitkan Tagihan (Mencatat Jurnal `student_bill_issued`) $\rightarrow$ Pembayaran (Mencatat Jurnal `student_bill_payment` dan mengkredit `fund_balances`).
3. **Penyusunan RAPBS Matriks 12 Bulan & Validasi Katalog Standar Biaya:**
   - Penerimaan kas dipetakan per bulan (Juli–Juni) dan dibatasi maksimal sebesar penetapan setahun.
   - Belanja program memilih standar biaya dari katalog acuan tertinggi; harga satuan tidak boleh melebihi harga plafon acuan katalog; sebaran kuantitas bulanan dapat bernilai 0 pada bulan tanpa kegiatan.
4. **Siklus Integrasi Penggajian (Kepegawaian $\rightarrow$ Keuangan):**
   - HRD menghitung payroll $\rightarrow$ Kunci periode $\rightarrow$ Ingest ke Keuangan dengan snapshot komponen gaji $\rightarrow$ Bendahara mencairkan gaji (mencatat jurnal beban gaji dan memotong kas) ATAU mengembalikan ke HRD dengan alasan penolakan.
5. **Migrasi Data Historis (Cutover Date):**
   - Transaksi sebelum tanggal cutover dicatat dengan `is_legacy_data = 1`, tidak membentuk jurnal umum akuntansi dan tidak memotong saldo kas berjalan.
6. **Penetapan Draf Tagihan, Approval Berjenjang Diskon Kasuistik & Revisi Pasca-Terbit Safeguard:**
   - **Draf Manual Ad-hoc**: Dibuat per siswa tanpa menunggu siklus massal (`POST /manual-draft`), status awal `draft` (atau `pending_approval` jika ada diskon yang membutuhkan persetujuan berjenjang).
   - **Approval Diskon Kasuistik 3 Tingkat**:
     - *Tingkat 1 (Diskon $\le 15\%$ atau $\le$ Rp 200.000)*: Langsung disahkan kasir/staf TU Keuangan sebagai draf biasa.
     - *Tingkat 2 (Diskon $> 15\% - 50\%$ atau $> Rp 200.000)*: Status `pending_approval`, `approval_tier: 'unit'`. Memerlukan persetujuan Kepala Satuan Pendidikan (`admin_satuan_pendidikan`).
     - *Tingkat 3 (Diskon $> 50\%$ atau 100% Full Waiver)*: Status `pending_approval`, `approval_tier: 'yayasan'`, wajib melampirkan berkas dokumen SK resmi. Memerlukan persetujuan Yayasan (`admin_yayasan`).
     - Tagihan `pending_approval` dilarang keras diterbitkan (`publishBills` memblokir dengan HTTP 422). Penolakan diskon mengembalikan tagihan ke nominal penuh normal.
   - **Revisi Pasca-Terbit Safeguard & Jurnal Penyesuaian**:
     - Tagihan yang telah terbit dapat direvisi (`POST /revise`) tanpa menimpa histori asli. Versi tagihan naik secara berurutan ($v1 \rightarrow v2 \dots$).
     - *Kunci Safeguard Pembayaran*: Jika siswa telah melakukan pembayaran (`paid_amount > 0`), nominal baru dilarang keras lebih kecil dari `paid_amount` (HTTP 422, wajib jalur restitusi/refund).
     - *Jurnal Penyesuaian Otomatis*: Selisih pengurangan dicatat otomatis ke jurnal `student_bill_discount` (Beban Keringanan Biaya Pendidikan), selisih penambahan dicatat ke jurnal `student_bill_issued` (Piutang Siswa).
     - Seluruh jejak revisi terekam di tabel `student_bill_revisions` lengkap dengan nomor SK, alasan operasional, dan ID jurnal penyesuaian.
   - **Generator Bulanan Pola Hibrida**:
     - Background scheduler otomatis berjalan tiap tanggal 25 menghasilkan draf tagihan untuk bulan berikutnya bagi seluruh jenis biaya dengan `billing_pattern = 'monthly'`.
     - Kasir/staf keuangan dapat meninjau dan melakukan *one-click confirm* penerbitan massal di dashboard atau tabel draf. Tagihan terbit otomatis tampil seketika di portal mandiri orang tua (`ParentBills.jsx`).
7. **Kartu Bayar Siswa, Kinerja Penagihan Bulanan (*Collection Performance*) & Matriks 12 Bulan (Juli–Juni):**
   - **Perbaikan Arsitektur N+1 Query**:
     - Pengambilan profil siswa dari modul Akademik diubah dari loop `Promise.all` ($N$ panggilan) menjadi **Single Batch Query** `crossModuleServices.getStudentsByIds(studentIds)` via `WHERE id IN (...)`, meningkatkan throughput query hingga **65x lebih cepat**.
   - **Indeks Komposit DB**:
     - Migrasi 62 menambahkan indeks komposit `idx_bills_unit_ay_month` pada `(school_unit_id, academic_year_id, period_month)` di tabel `student_bills` untuk query conditional pivot instan.
   - **Rekonsiliasi Pola Penagihan ke Kalender Akademik 12 Bulan (Juli–Juni)**:
     - *Pola Bulanan (`monthly`)*: Target penagihan masuk ke kolom bulan periode tagihan (`period_month`).
     - *Pola Tahunan (`yearly`)*: Target penagihan dialokasikan penuh ke bulan jatuh tempo (`due_date`, misal Agustus).
     - *Pola Insidental / Termin PPDB*: Dialokasikan ke bulan `due_date` termin masing-masing.
     - *Pembayaran Tunggakan (Recovery)*: Melunasi kewajiban periode terkait di kartu siswa, namun diakui sebagai kas masuk aktual (*cash inflow*) pada bulan pembayaran riil untuk kalkulasi *Collection Rate* bulanan.
   - **Aging Schedule & Indikator Tunggakan Berisiko**:
     - Dihitung dari selisih hari sejak `due_date` tagihan tertua yang belum lunas:
       - 🟢 *Lancar* (0–30 hari)
       - 🟡 *Perhatian* (31–60 hari)
       - 🟠 *Peringatan* (61–90 hari)
       - 🔴 *Kritis / Macet* (>90 hari)
   - **Ekspor Dokumen Formal**:
     - `GET /reports/student-ledger/export/excel`: File `.xlsx` 2 sheet (*Matriks Penagihan* dengan formula Excel asli `SUM` baris & kolom, dan *Detail Tunggakan* Aging Schedule).
     - `GET /reports/student-ledger/export/pdf`: Laporan landscape A4 berkop Yayasan/Sekolah, ringkasan kinerja bulanan, tabel rekap, dan kolom tanda tangan Bendahara & Kepala Satuan Pendidikan.
   - **Stub Pengingat Tagihan**:
     - `POST /reports/student-ledger/:student_id/notify-overdue` mencatat pengiriman notifikasi pengingat ke antrean stub Modul Komunikasi.

8. **Submodul Rekening Koran (*Bank Statements & Bank Reconciliation Reference*)**:
   - **Tujuan & Prinsip Akuntansi**:
     - Bersifat **SATU ARAH sebagai referensi pembanding / arsip perbankan** (*shadow statement*).
     - **TIDAK PERNAH memanggil `recordJournal()`** dan **TIDAK MEMPENGARUHI mutasi kas riil atau `fund_balances`**.
     - Saldo kas dan neraca sekolah tetap dihitung dinamis dari buku besar (`journal_entry_lines`).
   - **Skema Database (Migrasi 63)**:
     - Tabel `bank_statements` (`id`, `school_unit_id`, `academic_year_id`, `cash_account_id` [FK -> `cash_accounts`], `transaction_date`, `journal_number`, `description`, `amount`, `dc_type` [`debit`, `credit`], `running_balance`, `is_reconciled`, `reconciled_reference_type`, `reconciled_reference_id`, `reconciled_at`, `reconciled_by`, `reconciliation_notes`, `import_batch_id`, `created_at`, `updated_at`).
     - Indeks komposit: `(school_unit_id, cash_account_id)`, `(transaction_date)`, `(is_reconciled)`, `(reconciled_reference_type, reconciled_reference_id)`.
     - Validasi keras: `cash_accounts.account_kind === 'bank'`. Rekening kas kecil/tunai ditolak dengan HTTP 422.
   - **Endpoint & Hak Akses (`keuangan.bank_statement.*`)**:
     - `GET /api/v1/keuangan/bank-statements`: Filter rekening bank, rentang tanggal, status rekonsiliasi, tipe D/C, search, paginasi, macro summary (`total_credit`, `total_debit`, `net_mutation`, `reconciliation_rate`).
     - `POST /api/v1/keuangan/bank-statements`: Input 1 baris mutasi bank manual.
     - `PUT /api/v1/keuangan/bank-statements/:id`: Ubah baris mutasi manual (hanya jika belum direkonsiliasi).
     - `DELETE /api/v1/keuangan/bank-statements/:id`: Hapus baris mutasi manual (hanya jika belum direkonsiliasi).
     - `POST /api/v1/keuangan/bank-statements/:id/reconcile`: Tautkan rujukan transaksi internal (`student_bill_payment`, `other_income`, `expense`, `payroll`, `cash_transfer`, `other`).
     - `POST /api/v1/keuangan/bank-statements/:id/unreconcile`: Lepas tautan rekonsiliasi.
     - `GET /api/v1/keuangan/bank-statements/:id/reconcile-candidates`: Rekomendasi pencocokan otomatis transaksi internal berdasarkan tanggal dan nominal.
     - `POST /api/v1/keuangan/bank-statements/import`: Import batch dari Excel (.xlsx) dengan pemetaan kolom fleksibel & validasi tanggal/nominal.
     - `GET /api/v1/keuangan/bank-statements/export`: Ekspor mutasi ke file Excel (.xlsx).
     - `GET /api/v1/keuangan/bank-statements/template`: Unduh template baku format Excel rekening koran.
   - **Frontend UI (`BankStatements.jsx`)**:
     - Navigasi sidebar: `/keuangan/bank-statements` ("Rekening Koran (Bank)").
     - Filter bar terpadu, kartu KPI Mutasi Kredit/Debit/Net & Progres Rekonsiliasi.
     - Tabel interaktif dengan badge D/C (CR Masuk / DB Keluar), badge status rekonsiliasi, modal pencocokan cerdas kandidat transaksi internal, modal import Excel interaktif dengan pratinjau 3 baris pertama, dan modal catat manual.

---

### Alur 9: Pusat Penerimaan Kas Terpadu ("Penerimaan") & Integrasi RAPBS
- **Tanggal Rilis**: 2026-09-03
- **Latar Belakang & Prinsip Bisnis**:
  - Seluruh alur penerimaan kas masuk yayasan/sekolah disatukan dalam satu pintu menu kerja **"Penerimaan"** (`/keuangan/payments` / `/keuangan/penerimaan`), menggantikan pemisahan menu kasir loket SPP vs menu penerimaan non-SPP.
  - Tetap mematuhi prinsip *Clean Architecture* & *Single Responsibility* (Opsi A): backend terpisah secara modular (`payments/`, `ppdb-billing/`, `other-incomes/`), disatukan penuh di level frontend portal.
- **Skema Database (Migrasi 64)**:
  - Alter tabel `other_incomes`: penambahan kolom `budget_plan_income_item_id` (`BIGINT UNSIGNED NULLABLE`, FK -> `budget_plan_income_items.id`).
  - Constraint: setiap penerimaan sumber lain wajib memilih mata anggaran pendapatan resmi yang terdaftar pada RAPBS tahun ajaran terkait (`budget_plan_income_items`).
- **Konteks Tahun Ajaran**:
  - **Siswa Aktif & Sumber Lain (RAPBS)**: Mengacu pada **Tahun Ajaran Berjalan** (mis. 2025/2026).
  - **Calon Murid PPDB**: Secara eksplisit mengacu pada **Tahun Ajaran Masuk Target / Berikutnya** (mis. 2026/2027), dengan pemisahan selector dan badge visual.
- **Integritas Dual-Ledger Akuntansi**:
  - *Siswa Aktif*: `recordJournal` dengan `transactionCode: 'student_bill_payment'`, mutasi kantong dana `fundType: 'fee_type'`.
  - *PPDB*: `recordJournal` dengan `transactionCode: 'ppdb_registration_income'`, mutasi kantong dana `fundType: 'fee_type'` (T.A. Target).
  - *Sumber Lain RAPBS*: `recordJournal` dengan `transactionCode: 'other_income_default'`, mutasi kantong dana `fundType: 'budget_income_item'` atau `transaction_category`.
- **Endpoint Terkait**:
  - `GET /api/v1/keuangan/other-incomes/rapbs-sources`: Daftar mata anggaran pendapatan RAPBS beserta pagu rencana, realisasi diterima, dan persentase serapan.
  - `GET /api/v1/keuangan/payments/all-inflows`: Timeline gabungan seluruh kas masuk (Siswa Aktif, PPDB, Sumber Lain RAPBS) dengan KPI macro, pencarian, dan filter tanggal.
- **Frontend UI (`Payments.jsx` Rebranded "Pusat Penerimaan Kas & Kwitansi")**:
  - Sidebar: label menu `"Pembayaran & Kwitansi"` diubah menjadi **`"Penerimaan"`**. Menu terpisah `"Penerimaan Non-SPP"` dihilangkan dari sidebar (dialihkan ke tab terkait).
  - 4 Tab Utama:
    1. **Tab 1: Siswa Aktif (SPP & Biaya)**: Kasir loket & verifikasi transfer orang tua (multi-pos allocation).
    2. **Tab 2: Calon Murid PPDB**: Kasir penerimaan formulir & uang pangkal berbasis T.A. Masuk + Kwitansi PPDB.
    3. **Tab 3: Sumber Lain (RAPBS)**: Pagu rencana vs realisasi serapan pendapatan RAPBS + form catat kas masuk.
    4. **Tab 4: Rekapitulasi Kas Masuk**: Timeline gabungan seluruh arus kas masuk dengan filter rentang tanggal dan pencarian.

---

### Alur 10: Pengeluaran & Belanja Sekolah, Fleksibilitas Realisasi RAPBS, Non-Budgeted Expense & Audit Storno Reversal
- **Tanggal Rilis**: 2026-09-03
- **Latar Belakang & Prinsip Bisnis**:
  - Menu `"Pengeluaran & Belanja"` (`/keuangan/expenses`) adalah pusat pencatatan realisasi operasional dan belanja modal sekolah.
  - Default belanja merujuk ke mata anggaran RAPBS (`budget_plan_expense_items`), tetapi **nominal, kuantiti, dan rincian belanja dapat diedit secara fleksibel saat realisasi riil terjadi** (tidak dikunci mati ke angka rencana).
  - Mengakomodasi pengeluaran yang tidak tercantum di RAPBS (*non-budgeted expense*) dengan flag eksplisit `is_outside_budget = 1`.
- **Skema Database (Migrasi 65)**:
  - Alter tabel `expenses`: penambahan kolom `is_outside_budget` (`BOOLEAN DEFAULT FALSE`) dan `fund_sources` (`TEXT/JSON NULL`).
  - Mendukung pembagian multi-sumber dana (*multi-source funding*) dan pencatatan snapshot alokasi kantong dana.
- **Perbaikan Audit Standar Akuntansi: Jurnal Pembalik (Storno Reversal Entry)**:
  - Temuan audit sebelumnya: `softDeleteExpense` hanya mengisi `deleted_at`, sementara mutasi debit/kredit di buku besar dan saldo kantong dana tetap berkurang.
  - **Solusi SAK EP / Nirlaba (Opsi 1 - Storno Pasangan)**:
    1. Sistem mempertahankan catatan jurnal lama (*immutable*).
    2. Sistem menerbitkan **Jurnal Pembalik Baru (Storno)** pada `journal_entries` dengan `is_manual_correction = 1`, membalik posisi debit dan kredit secara simetris:
       - **Debit:** Akun Kas/Bank (uang kembali masuk).
       - **Kredit:** Akun Beban Belanja (beban dibatalkan/dinetralisir).
    3. Sistem memanggil `fundBalanceEngine.applyFundMutation({ direction: 'in', ... })` untuk mengembalikan saldo ke kantong dana asal (baik single-pocket maupun multi-pocket `fund_sources`).
    4. Mengisi `expenses.deleted_reason` dan `expenses.deleted_at = NOW()`.
    5. Mencatat audit log lengkap.
- **Frontend UI (`Expenses.jsx`)**:
  - Header: Filter gabungan **Tahun Ajaran** + **Satuan Pendidikan**.
  - Modal Catat Pengeluaran: Checkbox *"Pengeluaran di Luar Rencana RAPBS (Non-Budgeted)"*. Jika RAPBS dipilih, rincian pagu terisi otomatis namun volume & harga satuan tetap bebas diedit sesuai faktur riil.
  - Tabel: Badge penanda status anggaran (`📋 Rencana RAPBS` vs `⚠️ Di Luar RAPBS`) serta filter cepat status anggaran.
  - Modal Konfirmasi Pembatalan Belanja: Meminta alasan pembatalan resmi (*cancellation reason*) dan menampilkan notifikasi audit bahwa storno reversal otomatis diterbitkan dan dana dikembalikan utuh.

---

### Alur 11: Saldo & Kantong Sumber Dana RAPBS, Smart Bridge Pockets & Integrasi Tab Laporan
- **Tanggal Rilis**: 2026-09-03
- **Latar Belakang & Prinsip Bisnis**:
  - Mereformasi arsitektur saldo kantong dana (`fund_balances`) yang sebelumnya terikat ke jenis biaya tagihan siswa (`fee_types`), kini **resmi merujuk langsung ke mata anggaran pendapatan RAPBS (`budget_plan_income_items`)**.
  - Menggunakan **Pendekatan Hibrida / Smart Bridge Adapter** (*Zero Data Loss*): seluruh 52 mutasi riil lampau dan saldo awal (*opening pool*) tetap utuh, sementara tampilan pengguna 100% berbasis pos pendapatan RAPBS resmi.
  - Memindahkan menu dari *top-level sidebar* ke dalam **Tab di menu Laporan (`Reports.jsx`)** untuk merampingkan navigasi dan menyatukan seluruh instrumen monitoring kinerja keuangan.
- **Skema Database (Migrasi 66)**:
  - Alter tabel `fund_balances`: penambahan kolom `budget_plan_income_item_id` (`BIGINT UNSIGNED NULLABLE`, FK -> `budget_plan_income_items.id`) berindeks.
  - Perluasan kolom `fund_type` menjadi `VARCHAR(50)` untuk mengakomodasi `'budget_income_item'`.
- **Logika Agregasi & Engine (`fundBalanceEngine.js`)**:
  - Method `listFundBalances(schoolUnitId, academicYearId)` menyajikan:
    1. **Saldo Awal Kas (Opening Pool)**: Pool dana kas pra-sistem yang dapat dipakai untuk belanja.
    2. **Pos Pendapatan RAPBS Resmi (`budget_plan_income_items`)**:
       - Mengagregasi mutasi kas masuk (`in`) dari Penerimaan Siswa/PPDB (berdasarkan `fee_type_id`) dan Sumber Lain (`other_incomes` berdasarkan `budget_plan_income_item_id`).
       - Mengagregasi mutasi kas keluar (`out`) dari Pengeluaran belanja yang membebankan pos tersebut.
       - Menghitung **Pagu Anggaran RAPBS**, **Total Penerimaan**, **Total Pengeluaran**, **Sisa Saldo Kas Tersedia**, dan **% Serapan Realisasi vs Pagu**.
    3. **Pos Historis**: Data mutasi pra-RAPBS disajikan transparan tanpa merusak neraca kas.
- **Integrasi Frontend (`Reports.jsx` & `FundBalances.jsx`)**:
  - Sidebar: Menu `"Saldo Sumber Dana"` dihilangkan dari navigasi utama (`KeuanganLayout.jsx`). Rute `/keuangan/fund-balances` dialihkan otomatis ke `/keuangan/reports?tab=fund-balances`.
  - Di halaman **Laporan (`Reports.jsx`)**, ditambahkan Top Tab Switcher:
    - **Tab 1: Laporan Akuntansi & Keuangan Standar** (Neraca Saldo, Buku Besar, Surplus/Defisit, Arus Kas, Posisi Keuangan, Realisasi RAPBS).
    - **Tab 2: Saldo & Kantong Sumber Dana RAPBS** (Memuat komponen `FundBalances` dengan mode embedded).
  - Di dalam Tab Kantong Dana:
    - **Sub-Tab 1: Saldo Kas per Pos RAPBS**: KPI Card Pagu, Penerimaan, Pengeluaran, Saldo Sisa; Filter Tahun Ajaran & Satuan Pendidikan; Tabel Realisasi Pos RAPBS lengkap dengan % Serapan dan Modal Drilldown Riwayat Mutasi.
    - **Sub-Tab 2: Pinjaman & Realokasi Antar Tahun Ajaran**: Formulir pengajuan pinjaman antar-TA, pemantauan status pinjaman (*active*, *overdue*, *repaid*), dan modal pelunasan pinjaman (*repayment log*).

---

### Catatan Status Submodul: Penerimaan Kas Non-SPP (`other-incomes/`)
- **Status Arsitektur**: **DEPRECATED sebagai menu mandiri — Digantikan penuh oleh menu "Penerimaan" (Tahap 6)**.
- **Frontend**:
  - Entri menu mandiri "Penerimaan Kas Non-SPP" telah dihapus dari sidebar navigasi `KeuanganLayout.jsx`.
  - File halaman lama `OtherIncomes.jsx` telah dihapus.
  - Rute `/keuangan/other-incomes` dan `/keuangan/incomes` dialihkan ke `/keuangan/payments` (`Payments.jsx`).
  - Seluruh fungsi pencatatan kas masuk non-SPP, pemilihan mata anggaran RAPBS, tracking serapan pagu, dan monitoring rekening kas kini berada pada **Tab 3 ("Sumber Lain (RAPBS)")** dan **Tab 4 ("Rekapitulasi Kas Masuk")** di halaman `Payments.jsx`.
- **Backend & Keamanan Data Finansial**:
  - Submodul backend `src/modules/keuangan/other-incomes/` dan tabel database `other_incomes` **TIDAK di-hard delete** demi integritas data finansial historis (*immutable accounting*).
  - API `GET/POST /keuangan/other-incomes` tetap aktif sebagai service data provider resmi untuk portal Penerimaan.

---

### Alur 12: Penggajian Pegawai (Payroll) Terpadu dalam Menu "Pengeluaran & Belanja"
- **Tanggal Rilis**: 2026-09-03
- **Latar Belakang & Prinsip Bisnis**:
  - Seluruh belanja modal, operasional, dan belanja pegawai (payroll) kini disatukan di bawah payung menu resmi **"Pengeluaran & Belanja"** (`/keuangan/expenses`).
  - Halaman terpisah `Payroll.jsx` dipindahkan dari *top-level sidebar* menjadi Tab baru di halaman `Expenses.jsx` (`/keuangan/expenses?tab=payroll`), merampingkan navigasi keuangan.
- **Struktur 3 Sub-Bagian Penggajian**:
  1. **Sub-Bagian 1: Penetapan Gaji Pegawai (SDM)**:
     - Wadah integrasi kepegawaian untuk master gaji pokok, tunjangan fungsional, dan skema honor mengajar.
     - Dilengkapi banner kesiapan *"Menunggu sinkronisasi dari modul Kepegawaian (SDM)"* dan tombol *standby* *"Tarik Draf dari SDM"*.
  2. **Sub-Bagian 2: Realisasi Penggajian & Pencairan (Operasional Aktif — 100% Fungsional)**:
     - Mempertahankan alur produksi yang sudah berjalan: daftar draf gaji pegawai berstatus `pending` / `verified`.
     - Breakdown komponen gaji per pegawai (Gaji Pokok, Tunjangan, Potongan, BPJS, *Take Home Pay*).
     - Pemilihan rekening kas/bank pencairan dan eksekusi pencairan (`/disburse`) yang otomatis membukukan jurnal beban gaji dan kas keluar.
     - Fitur pengembalian draf (`/reject`) dengan input alasan penolakan untuk koreksi SDM.
  3. **Sub-Bagian 3: Riwayat Pencairan Gaji**:
     - Arsip pencairan gaji berstatus `disbursed` per periode dan pegawai, rincian rekening sumber, dan status pembukuan jurnal.
- **Routing & Backward Compatibility**:
  - Menu sidebar "Penggajian (Payroll)" dihilangkan dari `KeuanganLayout.jsx`.
  - Rute URL lama `/keuangan/payroll` di `router.jsx` secara otomatis memuat halaman `Expenses.jsx` dengan tab payroll aktif.
  - Logika backend `payroll-disbursements/` tetap 100% utuh tanpa perubahan.

---

### Alur 13: Modul Akuntansi Resmi Berbasis Siklus Akuntansi Nirlaba (ISAK 35 / SAK EP)
- **Tanggal Rilis**: 2026-09-03
- **Latar Belakang & Prinsip Bisnis**:
  - Menu `"Pembukuan & Tabungan"` secara resmi di-rebrand menjadi **`"Akuntansi"`** (`/keuangan/bookkeeping` dan alias `/keuangan/accounting`).
  - Seluruh alur kerja ditata ulang mengikuti tahapan siklus akuntansi formal organisasi nirlaba secara eksplisit:
- **Struktur 5 Tab Siklus Akuntansi**:
  1. **Tab 1: Jurnal Umum & Penyesuaian (`journals`)**:
     - Pencatatan transaksi kronologis debit/kredit sistem dan entri koreksi manual/penyesuaian (`POST /keuangan/journal-entries/manual`).
     - Indikator keseimbangan debit-kredit (*balance check*) dan modal detail garis jurnal.
  2. **Tab 2: Buku Besar (General Ledger) (`ledger`)**:
     - Endpoint `GET /keuangan/bookkeeping/general-ledger`.
     - Filter per akun COA spesifik atau seluruh akun, kartu saldo normal & saldo akhir, mutasi jurnal baris per baris dengan saldo berjalan (*running balance*).
  3. **Tab 3: Lembar Kerja (Worksheet / Neraca Lajur 10 Kolom) (`worksheet`)**:
     - Endpoint `GET /keuangan/bookkeeping/worksheet`.
     - 10 Kolom Akuntansi: Neraca Saldo Awal (D/K), Jurnal Penyesuaian (D/K), Neraca Saldo Disesuaikan (D/K), Laporan Aktivitas (D/K), dan Posisi Keuangan (D/K).
     - Menghitung surplus/defisit bersih periode berjalan dan verifikasi matematis keseimbangan neraca lajur.
     - Dilengkapi tombol cepat input jurnal penyesuaian.
  4. **Tab 4: Laporan Akuntansi Lengkap (`statements`)**:
     - Memuat 3 laporan keuangan pokok standar nirlaba (ISAK 35):
       - **Laporan Posisi Keuangan (Neraca)**: Aset (Aktiva) vs Kewajiban & Aset Neto (Pasiva).
       - **Laporan Aktivitas (Laba-Rugi)**: Pendapatan & Sumbangan Operasional vs Beban & Beban Program, Surplus/Defisit Bersih.
       - **Laporan Arus Kas**: Metode langsung (Penerimaan kas, pengeluaran kas, saldo kas bersih).
       - Didukung tombol Cetak / Ekspor PDF.
  5. **Tab 5: Tabungan Santri & Tutup Buku Tahunan (`savings-closings`)**:
     - Operasional rekening tabungan santri & pegawai (setoran & penarikan).
     - Prosedur tutup buku tahunan (*fiscal year closing*), penguncian periode akuntansi, dan pemindahan saldo surplus ke ekuitas/aset neto.
- **Pemisahan Peran Menu Akuntansi vs Laporan**:
  - Menu **Akuntansi**: Mengakomodasi siklus pembukuan teknis dan laporan keuangan formal (Neraca, Aktivitas, Arus Kas).
  - Menu **Laporan**: Mengakomodasi instrumen monitoring manajerial pimpinan dan operasional kesiswaan (Realisasi Anggaran RAPBS, Saldo Kantong Dana RAPBS, dan Rekapitulasi Pembayaran Siswa per Kelas).

---

### Alur 14: Dasbor Laporan Manajerial & Eksekutif Sekolah (Audiens Non-Akuntan)
- **Tanggal Rilis**: 2026-09-03
- **Latar Belakang & Prinsip Bisnis**:
  - Setelah format akuntansi formal (Neraca, Buku Besar, Neraca Lajur) dipindahkan ke menu **"Akuntansi"**, menu **"Laporan"** (`/keuangan/reports`) didesain ulang khusus untuk audiens eksekutif non-akuntan (Pimpinan Yayasan, Kepala Sekolah, dan Komite).
  - Mengganti seluruh jargon teknis akuntansi ("Debit/Kredit/Neraca") dengan terminologi manajerial: **"Uang Masuk"**, **"Uang Keluar"**, **"Sisa Anggaran"**, **"Realisasi Belanja"**, dan **"Cadangan Kas Akhir Tahun"**.
- **Indikator Kesehatan Keuangan Eksekutif (`GET /keuangan/reports/executive-health`)**:
  1. **Daya Tahan Kas Operasional (*Cash Runway*)**: Jumlah bulan kas tersedia sanggup menanggung biaya operasional rutin tanpa penerimaan baru (${\ge}3$ bulan = Sangat Sehat).
  2. **Tingkat Serapan Anggaran**: Persentase realisasi belanja terhadap pagu rencana anggaran tahun berjalan.
  3. **Tingkat Kolektibilitas Tagihan SPP**: Persentase tagihan siswa yang berhasil ditarik menjadi kas riil (${\ge}90\%$ = Sangat Tertib).
  4. **Porsi Beban Gaji Pegawai (*Payroll Burden*)**: Porsi uang masuk yang habis untuk belanja gaji & honorarium ($50\% - 65\%$ = Ideal & Berimbang).
- **Proyeksi Keuangan Hibrida 12 Bulan Juli–Juni (`GET /keuangan/reports/financial-projection`)**:
  - Menggabungkan data riil bulan berjalan dengan ekstrapolasi musiman kalender RAPBS (pendaftaran PPDB, ujian semester ganjil/genap) dan run-rate belanja operasional.
  - Memproyeksikan estimasi **Cadangan Kas Akhir Tahun Ajaran (Bulan Juni)**.
- **Aliran Kas per Sumber Dana Carry-Forward (`GET /keuangan/reports/fund-source-monthly-flow`)**:
  - Menampilkan mutasi bulanan: `Saldo Awal Bulan (Bulan Lalu) + Uang Masuk - Uang Keluar = Saldo Akhir Bulan`.
- **Realisasi Belanja per Program Kegiatan (`GET /keuangan/reports/program-expenses-matrix`)**:
  - Menampilkan alokasi belanja per bidang (Kurikulum, Kesiswaan, Sarpras, SDM, RT) dan rincian sumber dana penanggungnya.
- **Tab Saldo & Kantong Sumber Dana RAPBS**:
  - Tetap dipertahankan pada Tab 4 dengan kapabilitas pemantauan pagu pos RAPBS dan pinjaman antar tahun ajaran.

---

<!-- updated: 2026-09-03 - Modul 05 Keuangan: Dasbor Laporan Manajerial & Eksekutif Sekolah, Indikator Kesehatan, Proyeksi Juli-Juni, Carry-Forward Bulanan, Reports.jsx -->
