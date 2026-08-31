# AI-REF: Modul Keuangan & Akuntansi (`keuangan`)

> Dokumen referensi teknis modul Keuangan untuk AI Agent. Data diambil langsung dari 28 berkas migrasi Knex aktual, router/controller backend, dan router frontend portal.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/keuangan/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/keuangan/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/keuangan/`
- **Database Engine:** MariaDB 10.5 (`aldepos_keuangan` / `u622997391_dbkeuangan`)
- **Status Implementasi:** `jalan-produksi` (Master Data COA/Kas/Tarif, RAPBS & Revisi Versi, Tagihan SPP Massal, Kasir POS & Payment Gateway, Pengeluaran & Penerimaan Lain, Pencairan Payroll, Jurnal Otomatis/Manual, Tabungan, Tutup Buku, Laporan Keuangan Standar Akuntansi)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (28 Tabel)

### 2.1 Master Data Keuangan, Akun Kas & Bagan Akun (COA)

#### `cash_accounts` (Rekening Kas & Bank)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `account_code` | `VARCHAR(50)` | NO | - | e.g. "KAS-UTAMA", "BANK-BSI-01" |
| `account_name` | `VARCHAR(150)` | NO | - | - |
| `account_type` | `ENUM` | NO | - | `'cash','bank'` |
| `bank_name` | `VARCHAR(100)` | YES | `NULL` | - |
| `account_number`| `VARCHAR(50)` | YES | `NULL` | - |
| `account_holder`| `VARCHAR(150)` | YES | `NULL` | - |
| `balance` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Berjalan |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_cash_account_code (school_unit_id, account_code)`

#### `chart_of_accounts` (Bagan Akun Standar / COA)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `account_code` | `VARCHAR(50)` | NO | - | e.g. "1-1100", "4-1000", "5-2100" |
| `account_name` | `VARCHAR(150)` | NO | - | - |
| `account_type` | `ENUM` | NO | - | `'asset','liability','equity','revenue','expense'` |
| `normal_balance`| `ENUM` | NO | - | `'debit','credit'` |
| `parent_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> chart_of_accounts(id) RESTRICT/CASCADE` |
| `is_system` | `TINYINT(1)` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_coa_code (school_unit_id, account_code)`

#### `cash_account_opening_balances` (Saldo Awal Rekening Kas)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id) CASCADE/CASCADE` |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | Tahun Ajaran |
| `opening_balance` | `DECIMAL(18,2)` | NO | `0.00` | - |
| `as_of_date` | `DATE` | NO | - | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_account_opening_balance (cash_account_id, academic_year_id)`

#### `transaction_account_mappings` (Pemetaan Otomasi Jurnal Akuntansi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `transaction_type` | `VARCHAR(100)` | NO | - | `student_bill_payment`, `other_income`, `expense`, `payroll_disbursement` |
| `debit_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> chart_of_accounts(id) RESTRICT/CASCADE` |
| `credit_account_id`| `BIGINT UNSIGNED` | NO | - | `FK -> chart_of_accounts(id) RESTRICT/CASCADE` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_tam (school_unit_id, transaction_type)`

---

### 2.2 Kelompok Pos Biaya, Tarif & Dispensasi Siswa

#### `fee_groups` (Kelompok Biaya Sekolah)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `code` | `VARCHAR(50)` | NO | - | e.g. "SPP", "DAFTAR_ULANG" |
| `name` | `VARCHAR(150)` | NO | - | - |
| `description` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_fee_groups_code (school_unit_id, code)`

#### `fee_types` (Jenis Biaya & Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `fee_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_groups(id) RESTRICT/CASCADE` |
| `code` | `VARCHAR(50)` | NO | - | e.g. "SPP_BULANAN", "UANG_GEDUNG" |
| `name` | `VARCHAR(150)` | NO | - | - |
| `billing_cycle` | `ENUM` | NO | - | `'monthly','yearly','one_time'` |
| `is_mandatory` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_fee_types_code (fee_group_id, code)`

#### `fee_reference_amounts` (Matriks Nominal Tarif Biaya per Angkatan/Jenjang)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id) CASCADE/CASCADE` |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | - |
| `cohort_id` | `BIGINT UNSIGNED` | YES | `NULL` | Angkatan Siswa |
| `grade_level_id` | `BIGINT UNSIGNED` | YES | `NULL` | Tingkat Kelas |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Standar Biaya |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_fra (fee_type_id, academic_year_id, cohort_id, grade_level_id)`

#### `student_fee_adjustments` (Dispensasi, Beasiswa & Keringanan Biaya)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa dari Akademik |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id) RESTRICT/CASCADE` |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | - |
| `adjustment_type` | `ENUM` | NO | - | `'scholarship','waiver','discount','custom_amount'` |
| `value_type` | `ENUM` | NO | - | `'percentage','fixed'` |
| `value` | `DECIMAL(18,2)` | NO | - | Persentase diskon / nominal potongan |
| `reason` | `TEXT` | NO | - | Alasan dispensasi |
| `status` | `ENUM` | NO | `'draft'` | `'draft','submitted','approved','rejected'` |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `approved_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.3 Rencana Anggaran (RAPBS) & Program Kerja

#### `transaction_categories` (Kategori Pengeluaran & Penerimaan Lain)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `type` | `ENUM` | NO | - | `'income','expense'` |
| `code` | `VARCHAR(50)` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | e.g. "BOS", "Donasi", "ATK & Cetak", "Konsumsi" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_trans_cat_code (school_unit_id, code)`

#### `budget_programs` (Program Kerja RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `code` | `VARCHAR(50)` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Pengembangan Kurikulum", "Pemeliharaan Sarpras" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `catalog_items` (Katalog Standar Harga Barang/Jasa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(200)` | NO | - | - |
| `unit` | `VARCHAR(30)` | NO | - | e.g. "Rim", "Paket", "Unit", "Bulan" |
| `standard_unit_price`| `DECIMAL(18,2)`| NO | - | Estimasi Harga Satuan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `budget_plans` (Header RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | - |
| `version` | `SMALLINT UNSIGNED`| NO | `1` | Versi Anggaran (Revisi 1, 2, dst) |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published'` |
| `total_income_projected` | `DECIMAL(18,2)`| NO | `0.00` | Total Target Pendapatan |
| `total_expense_projected`| `DECIMAL(18,2)`| NO | `0.00` | Total Alokasi Belanja |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_budget_plans_version (school_unit_id, academic_year_id, version)`

#### `budget_plan_income_items` (Rincian Target Pendapatan RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `budget_plan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> budget_plans(id) CASCADE/CASCADE` |
| `fee_type_id` | `BIGINT UNSIGNED` | YES | `NULL` | Pos Biaya Siswa |
| `transaction_category_id`| `BIGINT UNSIGNED`| YES| `NULL` | Pos Penerimaan Non-Siswa |
| `amount` | `DECIMAL(18,2)` | NO | - | Target Pendapatan |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `budget_plan_expense_items` (Rincian Alokasi Belanja RAPBS)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `budget_plan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> budget_plans(id) CASCADE/CASCADE` |
| `budget_program_id`| `BIGINT UNSIGNED` | NO | - | `FK -> budget_programs(id) RESTRICT/CASCADE` |
| `transaction_category_id`| `BIGINT UNSIGNED`| NO | - | `FK -> transaction_categories(id) RESTRICT/CASCADE` |
| `item_name` | `VARCHAR(200)` | NO | - | - |
| `unit` | `VARCHAR(30)` | NO | - | - |
| `unit_price` | `DECIMAL(18,2)` | NO | - | - |
| `quantity` | `DECIMAL(10,2)` | NO | - | - |
| `total_amount` | `DECIMAL(18,2)` | NO | - | Total Alokasi Belanja |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.4 Tagihan Siswa, Pembayaran Kasir & Payment Gateway

#### `student_bills` (Tagihan Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa dari Akademik |
| `fee_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> fee_types(id) RESTRICT/CASCADE` |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | - |
| `billing_period` | `VARCHAR(20)` | YES | `NULL` | e.g. "2026-08" (Khusus SPP) |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal Tagihan Kotor |
| `discount_amount` | `DECIMAL(18,2)` | NO | `0.00` | Potongan Dispensasi/Beasiswa |
| `final_amount` | `DECIMAL(18,2)` | NO | - | Nominal Bersih yang Wajib Dibayar |
| `paid_amount` | `DECIMAL(18,2)` | NO | `0.00` | Total yang Telah Terbayar |
| `due_date` | `DATE` | NO | - | Tanggal Jatuh Tempo |
| `status` | `ENUM` | NO | `'unpaid'` | `'unpaid','partially_paid','paid','cancelled'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_bills_period (student_id, fee_type_id, academic_year_id, billing_period)`

#### `bill_reminder_logs` (Log Pengingat Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id) CASCADE/CASCADE` |
| `channel` | `ENUM` | NO | - | `'whatsapp','email','sms'` |
| `sent_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `bill_payments` (Transaksi Pembayaran Tagihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `receipt_number` | `VARCHAR(50)` | NO | - | `UNIQUE` (No. Kwitansi Resmi) |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id) RESTRICT/CASCADE` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id) RESTRICT/CASCADE` |
| `amount_paid` | `DECIMAL(18,2)` | NO | - | Nominal Bayar |
| `payment_method` | `ENUM` | NO | - | `'cash','bank_transfer','payment_gateway'` |
| `payment_date` | `DATE` | NO | - | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `recorded_by` | `BIGINT UNSIGNED` | NO | - | User ID Kasir |
| `previous_data` | `JSON` | YES | `NULL` | Audit Trail Koreksi Bayar |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `payment_gateway_transactions` (Transaksi Payment Gateway / Virtual Account - Nonaktif Sementara)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id) RESTRICT/CASCADE` |
| `gateway_provider`| `VARCHAR(50)` | NO | - | e.g. "Xendit", "Midtrans" |
| `transaction_id` | `VARCHAR(100)` | NO | - | ID Transaksi Provider |
| `va_number` | `VARCHAR(50)` | YES | `NULL` | Nomor Virtual Account / QRIS |
| `amount` | `DECIMAL(18,2)` | NO | - | - |
| `status` | `ENUM` | NO | `'pending'` | `'pending','settled','expired','failed'` |

#### `bill_payment_proofs` (Bukti Transfer Pembayaran Siswa - Manual Verification)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `student_bill_id` | `BIGINT UNSIGNED` | NO | - | `FK -> student_bills(id) CASCADE/CASCADE` |
| `submitted_by_ref_id` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Wali Pengunggah |
| `proof_file_url` | `VARCHAR(255)` | NO | - | URL / Path Gambar Bukti Transfer |
| `amount` | `DECIMAL(18,2)` | NO | - | Nominal yang Ditransfer |
| `transfer_date` | `DATE` | NO | - | Tanggal Transfer Bank |
| `bank_name` | `VARCHAR(100)` | YES | `NULL` | Bank Pengirim / Tujuan |
| `sender_account_name` | `VARCHAR(150)` | YES | `NULL` | Nama Pemilik Rekening Pengirim |
| `notes` | `TEXT` | YES | `NULL` | Catatan Tambahan Wali |
| `status` | `ENUM` | NO | `'pending'` | `'pending','verified','rejected'` |
| `verified_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Bendahara yang Verifikasi/Tolak |
| `verified_at` | `TIMESTAMP` | YES | `NULL` | Waktu Verifikasi/Penolakan |
| `rejection_reason` | `TEXT` | YES | `NULL` | Alasan Penolakan Bukti |
| `bill_payment_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> bill_payments(id) SET NULL/CASCADE` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
| `paid_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `payment_reconciliations` (Rekonsiliasi Mutasi Bank)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id) RESTRICT/CASCADE` |
| `bank_statement_date`| `DATE` | NO | - | Tanggal Mutasi Rekening Koran |
| `amount` | `DECIMAL(18,2)` | NO | - | - |
| `reference_number`| `VARCHAR(100)` | YES | `NULL` | No. Referensi Bank |
| `matched_payment_id`| `BIGINT UNSIGNED`| YES| `NULL` | `FK -> bill_payments(id) SET NULL` |
| `status` | `ENUM` | NO | `'unmatched'` | `'unmatched','matched','discrepancy'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.5 Realisasi Pengeluaran, Penerimaan Lain & Pencairan Payroll

#### `other_incomes` (Penerimaan Kas Non-Tagihan Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | - |
| `transaction_category_id`| `BIGINT UNSIGNED`| NO | - | `FK -> transaction_categories(id) RESTRICT/CASCADE` |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id) RESTRICT/CASCADE` |
| `amount` | `DECIMAL(18,2)` | NO | - | - |
| `source_name` | `VARCHAR(150)` | NO | - | e.g. "Dana BOS Tahap 1", "Donatur H. Ahmad" |
| `proof_number` | `VARCHAR(100)` | YES | `NULL` | No. Bukti Setor |
| `received_at` | `DATE` | NO | - | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `expenses` (Pengeluaran Operasional & Belanja)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `budget_plan_expense_item_id`| `BIGINT UNSIGNED`| YES| `NULL` | `FK -> budget_plan_expense_items(id) SET NULL` |
| `item_name` | `VARCHAR(200)` | NO | - | - |
| `unit` | `VARCHAR(30)` | YES | `NULL` | - |
| `unit_price` | `DECIMAL(18,2)` | NO | - | - |
| `quantity` | `DECIMAL(10,2)` | NO | - | - |
| `total_amount` | `DECIMAL(18,2)` | NO | - | - |
| `vendor` | `VARCHAR(150)` | YES | `NULL` | Toko / Rekanan Penyedia |
| `expense_date` | `DATE` | NO | - | - |
| `proof_number` | `VARCHAR(100)` | YES | `NULL` | No. Nota / Kwitansi Beli |
| `notes` | `TEXT` | YES | `NULL` | - |
| `previous_data` | `JSON` | YES | `NULL` | Audit Trail Koreksi Belanja |
| `deleted_reason` | `TEXT` | YES | `NULL` | Alasan pembatalan/void |
| `deleted_at` | `TIMESTAMP` | YES | `NULL` | Soft Delete |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `payroll_disbursements` (Pencairan Gaji Pegawai dari Kepegawaian)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai dari Kepegawaian |
| `period_month` | `INT UNSIGNED` | NO | - | 1 - 12 |
| `period_year` | `INT UNSIGNED` | NO | - | e.g. 2026 |
| `amount` | `DECIMAL(18,2)` | NO | - | Total Gaji Bersih Terbayar |
| `cash_account_id` | `BIGINT UNSIGNED` | NO | - | `FK -> cash_accounts(id) RESTRICT/CASCADE` |
| `disbursed_at` | `TIMESTAMP` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'pending'` | `'pending','disbursed','failed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_payroll (employee_id, period_year, period_month)`

---

### 2.6 Pembukuan (Jurnal), Tabungan & Tutup Buku

#### `journal_entries` (Header Jurnal Umum / Pembukuan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `journal_number` | `VARCHAR(50)` | NO | - | `UNIQUE` (No. Referensi Jurnal) |
| `journal_date` | `DATE` | NO | - | - |
| `source_type` | `ENUM` | NO | - | `'student_bill_payment','other_income','expense','payroll_disbursement','manual'` |
| `source_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Transaksi Sumber |
| `description` | `TEXT` | YES | `NULL` | Narasi Transaksi Jurnal |
| `is_manual_correction`| `TINYINT(1)` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `journal_entry_lines` (Rincian Baris Debit / Kredit Jurnal)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `journal_entry_id` | `BIGINT UNSIGNED` | NO | - | `FK -> journal_entries(id) CASCADE/CASCADE` |
| `chart_of_account_id`| `BIGINT UNSIGNED`| NO | - | `FK -> chart_of_accounts(id) RESTRICT/CASCADE` |
| `entry_side` | `ENUM` | NO | - | `'debit','credit'` |
| `amount` | `DECIMAL(18,2)` | NO | - | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `savings_accounts` (Buku Rekening Tabungan Siswa / Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `owner_type` | `ENUM` | NO | - | `'student','employee'` |
| `owner_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa / Pegawai |
| `balance` | `DECIMAL(18,2)` | NO | `0.00` | Saldo Tabungan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_savings_owner (school_unit_id, owner_type, owner_id)`

#### `savings_transactions` (Mutasi Transaksi Tabungan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `savings_account_id`| `BIGINT UNSIGNED` | NO | - | `FK -> savings_accounts(id) CASCADE/CASCADE` |
| `transaction_type`| `ENUM` | NO | - | `'deposit','withdrawal'` |
| `amount` | `DECIMAL(18,2)` | NO | - | - |
| `transacted_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `fiscal_year_closings` (Tutup Buku Tahunan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | - |
| `status` | `ENUM` | NO | `'open'` | `'open','closed'` |
| `closed_at` | `TIMESTAMP` | YES | `NULL` | - |
| `closed_by` | `BIGINT UNSIGNED` | YES | `NULL` | User Core Service |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_closing (school_unit_id, academic_year_id)`

#### `finance_audit_logs` (Audit Log Mutasi Finansial)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `user_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `action` | `VARCHAR(100)` | NO | - | e.g. "CREATE_BILL", "RECORD_PAYMENT", "CORRECT_EXPENSE" |
| `entity_type` | `VARCHAR(100)` | NO | - | - |
| `entity_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `data_before` | `JSON` | YES | `NULL` | - |
| `data_after` | `JSON` | YES | `NULL` | - |
| `occurred_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

## 3. Kontrak API Ringkas (`/api/v1/keuangan`)

### 3.1 Master Data Keuangan & Tarif Biaya
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/cash-accounts` | `keuangan.master.cash_accounts.manage` | - | `{ cash_accounts: array }` |
| `POST` | `/cash-accounts` | `keuangan.master.cash_accounts.manage` | `{ account_code: string, account_name: string, account_type: 'cash'\|'bank', bank_name?: string, account_number?: string, account_holder?: string }` | `{ id: number }` |
| `GET` | `/chart-of-accounts` | `keuangan.master.coa.manage` | - | `{ accounts: array }` |
| `POST` | `/chart-of-accounts` | `keuangan.master.coa.manage` | `{ account_code: string, account_name: string, account_type: string, normal_balance: 'debit'\|'credit', parent_id?: number }` | `{ id: number }` |
| `GET` | `/fee-types` | `keuangan.master.fee_types.manage` | - | `{ fee_types: array }` |
| `POST` | `/fee-types` | `keuangan.master.fee_types.manage` | `{ fee_group_id: number, code: string, name: string, billing_cycle: string, is_mandatory?: boolean }` | `{ id: number }` |
| `GET` | `/fee-reference-amounts`| `keuangan.master.fee_reference_amounts.manage` | Query: `?academic_year_id=&fee_type_id=` | `{ references: array }` |
| `POST` | `/fee-reference-amounts`| `keuangan.master.fee_reference_amounts.manage` | `{ fee_type_id: number, academic_year_id: number, cohort_id?: number, grade_level_id?: number, amount: number }` | `{ id: number }` |
| `GET` | `/student-fee-adjustments`| `keuangan.master.fee_adjustments.submit` | Query: `?student_id=&status=` | `{ adjustments: array }` |
| `POST` | `/student-fee-adjustments`| `keuangan.master.fee_adjustments.submit` | `{ student_id: number, fee_type_id: number, academic_year_id: number, adjustment_type: string, value_type: string, value: number, reason: string }` | `{ id: number }` |
| `PATCH`| `/student-fee-adjustments/:id/approve`| `keuangan.master.fee_adjustments.approve`| - | `{ id: number, status: 'approved' }` |

### 3.2 Anggaran RAPBS & Program Kerja
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/budget-plans` | `keuangan.budget.view` | Query: `?academic_year_id=` | `{ budget_plans: array }` |
| `POST` | `/budget-plans` | `keuangan.budget.manage` | `{ academic_year_id: number }` | `{ id: number, version: number, status: 'draft' }` |
| `GET` | `/budget-plans/:id` | `keuangan.budget.view` | - | `{ budget_plan: object, income_items: array, expense_items: array }` |
| `PATCH`| `/budget-plans/:id/publish`| `keuangan.budget.publish` | - | `{ id: number, status: 'published' }` |
| `POST` | `/budget-plans/:id/new-version`| `keuangan.budget.manage`| - | `{ id: number, version: number }` |
| `GET` | `/budget-plans/:id/realization`| `keuangan.budget.view` | - | `{ realization: object, income_summary: object, expense_summary: object }` |
| `POST` | `/budget-plans/:id/income-items`| `keuangan.budget.manage`| `{ fee_type_id?: number, transaction_category_id?: number, amount: number, notes?: string }` | `{ id: number }` |
| `POST` | `/budget-plans/:id/expense-items`| `keuangan.budget.manage`| `{ budget_program_id: number, transaction_category_id: number, item_name: string, unit: string, unit_price: number, quantity: number }` | `{ id: number }` |

### 3.3 Tagihan Siswa & Kasir Pembayaran
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `POST` | `/student-bills/generate/preview`| `keuangan.bills.generate`| `{ fee_type_id: number, academic_year_id: number, billing_period?: string, grade_level_id?: number, class_group_id?: number }` | `{ total_students: number, total_amount: number, preview_items: array }` |
| `POST` | `/student-bills/generate` | `keuangan.bills.generate` | `{ fee_type_id: number, academic_year_id: number, billing_period?: string, due_date: string, grade_level_id?: number, class_group_id?: number }` | `{ generated_count: number }` |
| `GET` | `/student-bills` | `keuangan.bills.view` | Query: `?student_id=&status=&fee_type_id=&billing_period=&page=&limit=` | `{ bills: array, pagination: object }` |
| `GET` | `/student-bills/:id` | `keuangan.bills.view` | - | `{ bill: object, payments: array, reminders: array }` |
| `PATCH`| `/student-bills/:id/cancel` | `keuangan.bills.cancel` | `{ reason: string }` | `{ id: number, status: 'cancelled' }` |
| `POST` | `/student-bills/:id/reminders` | `keuangan.bills.view` | `{ channel: 'whatsapp'\|'email'\|'sms' }` | `{ data: { id: number, student_bill_id: number, channel: string, sent_at: string } }` |
| `POST` | `/student-bills/reminders/run` | `keuangan.bills.view` | - | `{ data: { reminded_count: number } }` |
| `POST` | `/bill-payments` | `keuangan.payments.record` | `{ student_bill_id: number, cash_account_id: number, amount_paid: number, payment_method: string, payment_date: string, notes?: string }` | `{ id: number, receipt_number: string }` |
| `GET` | `/bill-payments/:id/receipt` | `keuangan.payments.record` | - | `{ receipt: object }` |
| `GET` | `/bill-payment-proofs` | `keuangan.payments.record` | Query: `?status=&school_unit_id=` | `{ data: array }` (Antrean verifikasi FIFO) |
| `PATCH`| `/bill-payment-proofs/:id/verify`| `keuangan.payments.record`| `{ cash_account_id?: number }` | `{ data: { proof: object, payment: object } }` |
| `PATCH`| `/bill-payment-proofs/:id/reject`| `keuangan.payments.record`| `{ rejection_reason: string }` | `{ data: object }` |
| `POST` | `/payment-gateway/checkout` | `keuangan.payments.record` | *Nonaktif Sementara (501) - Gunakan Bukti Transfer Manual* | `{ message: string }` |
| `POST` | `/payment-gateway/callback` | Publik (Webhook Gateway) | *Nonaktif Sementara (501) - Gunakan Bukti Transfer Manual* | `{ message: string }` |
| `GET` | `/payment-reconciliations` | `keuangan.payments.reconcile` | Query: `?status=&cash_account_id=` | `{ reconciliations: array }` |
| `POST` | `/payment-reconciliations/:id/match`| `keuangan.payments.reconcile`| `{ bill_payment_id: number }` | `{ success: boolean }` |

### 3.4 Pengeluaran Operasional, Penerimaan Lain & Payroll
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/other-incomes` | `keuangan.income.manage` | Query: `?academic_year_id=&page=&limit=` | `{ incomes: array, pagination: object }` |
| `POST` | `/other-incomes` | `keuangan.income.manage` | `{ academic_year_id: number, transaction_category_id: number, cash_account_id: number, amount: number, source_name: string, received_at: string, proof_number?: string }` | `{ id: number }` |
| `GET` | `/expenses` | `keuangan.expenses.manage` | Query: `?start_date=&end_date=&page=&limit=` | `{ expenses: array, pagination: object }` |
| `POST` | `/expenses` | `keuangan.expenses.manage` | `{ budget_plan_expense_item_id?: number, item_name: string, unit?: string, unit_price: number, quantity: number, vendor?: string, expense_date: string, proof_number?: string }` | `{ id: number }` |
| `GET` | `/payroll-disbursements` | `keuangan.payroll.disburse` | Query: `?period_month=&period_year=&status=` | `{ disbursements: array }` |
| `POST` | `/payroll-disbursements/:id/disburse`| `keuangan.payroll.disburse`| `{ cash_account_id: number }` | `{ id: number, status: 'disbursed' }` |
| `POST` | `/internal/payroll-disbursements/ingest`| `X-API-Key` (Kepegawaian)| `{ employee_id: number, period_month: number, period_year: number, amount: number }` | `{ id: number, status: 'pending' }` |

### 3.5 Pembukuan Akuntansi & Laporan Finansial
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/journal-entries` | `keuangan.bookkeeping.view` | Query: `?start_date=&end_date=&source_type=&page=&limit=` | `{ entries: array, pagination: object }` |
| `POST` | `/journal-entries/manual` | `keuangan.bookkeeping.manual_entry` | `{ journal_date: string, description: string, lines: array<{ chart_of_account_id: number, entry_side: 'debit'\|'credit', amount: number }> }` | `{ id: number, journal_number: string }` |
| `GET` | `/savings-accounts` | `keuangan.savings.manage` | Query: `?owner_type=&owner_id=` | `{ savings: array }` |
| `POST` | `/savings-accounts/:id/deposit`| `keuangan.savings.manage` | `{ amount: number, notes?: string }` | `{ new_balance: number }` |
| `POST` | `/savings-accounts/:id/withdraw`| `keuangan.savings.manage` | `{ amount: number, notes?: string }` | `{ new_balance: number }` |
| `POST` | `/fiscal-year-closings` | `keuangan.bookkeeping.close_year` | `{ academic_year_id: number }` | `{ id: number, status: 'closed' }` |
| `GET` | `/reports/budget-realization` | `keuangan.reports.view` | Query: `?academic_year_id=&budget_plan_id=` | `{ report: object }` |
| `GET` | `/reports/general-ledger` | `keuangan.reports.view` | Query: `?chart_of_account_id=&period_from=&period_to=&format=pdf\|json` | `{ ledger: array }` OR Stream PDF (`Content-Type: application/pdf`) |
| `GET` | `/reports/trial-balance` | `keuangan.reports.view` | Query: `?period=&as_of_date=&format=pdf\|json` | `{ trial_balance: array }` OR Stream PDF (`Content-Type: application/pdf`) |
| `GET` | `/reports/income-statement` | `keuangan.reports.view` | Query: `?period=&start_date=&end_date=&format=pdf\|json` | `{ income_statement: object }` OR Stream PDF (`Content-Type: application/pdf`) |
| `GET` | `/reports/cash-flow` | `keuangan.reports.view` | Query: `?period=&start_date=&end_date=&format=pdf\|json` | `{ cash_flow: object }` OR Stream PDF (`Content-Type: application/pdf`) |
| `GET` | `/reports/balance-sheet` | `keuangan.reports.view` | Query: `?period=&as_of_date=&format=pdf\|json` | `{ balance_sheet: object }` OR Stream PDF (`Content-Type: application/pdf`) |
| `GET` | `/dashboard` | `keuangan.reports.view` | - | `{ cash_balances: array, monthly_income: number, monthly_expense: number, uncollected_bills: number }` |

### 3.6 Parent-Facing (Self-Service Orang Tua)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/parent-facing/bills` | `keuangan.parent.self_service` | Query: `?student_id=&status=` | `{ bills: array }` |
| `GET` | `/parent-facing/bills/:id` | `keuangan.parent.self_service` | - | `{ bill: object, payments: array, payment_proofs: array }` |
| `POST` | `/parent-facing/bills/:id/transfer-proof` | `keuangan.parent.self_service` | `{ proof_file_url: string, amount: number, transfer_date: string, bank_name?: string, sender_account_name?: string, notes?: string }` | `{ data: object }` |
| `GET` | `/parent-facing/payments` | `keuangan.parent.self_service` | Query: `?student_id=` | `{ payments: array }` |
| `GET` | `/parent-facing/savings` | `keuangan.parent.self_service` | Query: `?student_id=` | `{ balance: number, transactions: array }` |

---

## 4. Workflows & State Machines

- **Student Billing Lifecycle:** `unpaid -> partially_paid -> paid` OR `cancelled (pembatalan/koreksi)`.
- **Bukti Transfer Manual & Verifikasi:**
  - Orang tua mengunggah bukti transfer via `POST /parent-facing/bills/:id/transfer-proof` $\rightarrow$ Status bukti: `pending`.
  - Masuk ke antrean FIFO bendahara di `GET /bill-payment-proofs`.
  - **Skenario Disetujui:** Bendahara memverifikasi via `PATCH /bill-payment-proofs/:id/verify` $\rightarrow$ Status bukti: `verified`, otomatis memanggil `recordBillPayment` (menambah baris `bill_payments`, mengupdate saldo kas/bank, mengupdate `student_bills.status` menjadi `paid`/`partially_paid`, dan membukukan jurnal umum otomatis).
  - **Skenario Ditolak:** Bendahara menolak via `PATCH /bill-payment-proofs/:id/reject` disertai alasan (`rejection_reason`) $\rightarrow$ Status bukti: `rejected`, tanpa mengubah status tagihan ataupun saldo kas.
- **RAPBS Anggaran Lifecycle:** `draft -> published` -> `new_version (revisi RAPBS resmi membuat nomor versi baru, versi lama tetap diarsip)`.
- **Student Fee Adjustment (Dispensasi):** `draft -> submitted -> approved` *(otomatis memotong tagihan bruto menjadi final)* OR `rejected`.
- **Payroll Disbursement Lifecycle:** Ingest pending payroll dari Kepegawaian (`pending`) -> Verifikasi saldo kas -> Pencairan (`disbursed`) -> Otomatis cetak baris Jurnal Umum Keuangan.
- **Payment Reconciliation:** `unmatched -> matched` *(mutasi bank cocok dengan kwitansi kasir)* OR `discrepancy (selisih lebih/kurang)`.
- **Fiscal Year Closing:** `open -> closed` *(menutup akun nominal pendapatan & beban ke saldo laba ditahan)* <-> `reopen (dengan otorisasi khusus)`.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/keuangan/login` | `src/apps/keuangan/pages/Login.jsx` | Login form kasir & bendahara sekolah |
| `/keuangan/dashboard` | `src/apps/keuangan/pages/Dashboard.jsx` | Ringkasan saldo kas, grafik arus kas, piutang SPP & realisasi anggaran |
| `/keuangan/master-data` *(alias: `/keuangan/master`)*| `src/apps/keuangan/pages/MasterData.jsx` | Kelola akun kas, COA, pos tarif SPP, kategori transaksi & dispensasi |
| `/keuangan/budget` | `src/apps/keuangan/pages/BudgetPlans.jsx` | Penyusunan draf RAPBS, versi revisi & pemantauan realisasi anggaran |
| `/keuangan/bills` | `src/apps/keuangan/pages/StudentBills.jsx` | Generator tagihan massal, preview kalkulasi, log reminder & pembatalan |
| `/keuangan/payments` | `src/apps/keuangan/pages/Payments.jsx` | Kasir POS pembayaran SPP, cetak kwitansi, payment gateway & rekonsiliasi |
| `/keuangan/expenses` | `src/apps/keuangan/pages/Expenses.jsx` | Pencatatan pengeluaran operasional sekolah & realisasi belanja RAPBS |
| `/keuangan/other-incomes` *(alias: `/keuangan/incomes`)*| `src/apps/keuangan/pages/OtherIncomes.jsx` | Pencatatan pendapatan BOS, donasi yayasan & pendapatan sewa aset |
| `/keuangan/payroll` | `src/apps/keuangan/pages/Payroll.jsx` | Verifikasi slip gaji pegawai dari Kepegawaian & pencairan rekening kas |
| `/keuangan/bookkeeping` | `src/apps/keuangan/pages/Bookkeeping.jsx` | Jurnal umum, buku tabungan santri, tutup buku tahunan & audit logs |
| `/keuangan/reports` | `src/apps/keuangan/pages/Reports.jsx` | Cetak laporan buku besar, neraca saldo, laba rugi, arus kas & neraca |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies - Live In-Process & Service-to-Service):**
  - `core`: Validasi JWT SSO, penarikan data Satuan Pendidikan & Yayasan, audit log finansial.
  - `akademik`: Mengambil data siswa aktif, kelas/rombel, wali, tingkat kelas, dan angkatan cohort (`GET /api/v1/akademik/internal/*` & `src/modules/keuangan/common/crossModuleServices.js`) secara *live* untuk penagihan SPP massal, validasi dispensasi, dan verifikasi orang tua.
  - `kepegawaian`: Mengambil data pegawai aktif, nomor induk pegawai, dan slip gaji periode untuk pencairan payroll (`GET /api/v1/kepegawaian/internal/*` & `POST /api/v1/keuangan/internal/payroll-disbursements/ingest`).
  - `website-utama`: Penerimaan pembayaran pendaftaran calon siswa baru dari PPDB online.
  - `kantin`: Penerimaan settlement kasir & hak bagi hasil yayasan dari omset penjualan kantin.
- **Modul yang Memanggil Keuangan (Consumers):**
  - `portal-orangtua`: Rincian tagihan siswa (`/api/v1/keuangan/parent-facing/bills`), riwayat pembayaran, dan saldo tabungan santri.
  - `sarpras`: Alokasi anggaran belanja pengadaan aset & biaya maintenance fasilitas.
  - `dapur`: Alokasi anggaran belanja bahan logistik makan santri.
  - `manajemen`: Agregat laporan keuangan (realisasi anggaran, laba rugi, neraca, arus kas) untuk dashboard eksekutif RIPS/RKS yayasan.

---

## 7. Status Implementasi & Catatan Desain

1. **Auto Journal Triggering Engine (100% Selesai & Terverifikasi):** Transaksi pembayaran tagihan, pengeluaran kas, pendapatan lain, dan pencairan payroll telah terhubung penuh ke `transaction_account_mappings` dan mencatat `journal_entries` + `journal_entry_lines` berimbang (debit = kredit).
2. **Integrasi Antar-Modul Live (100% Selesai & Terverifikasi):** Seluruh integrasi cross-module pada `crossModuleServices.js` menggunakan koneksi Knex nyata ke database `aldepos_akademik` (tabel `students`, `class_groups`, `academic_years`, `cohorts`, `grade_levels`, `student_guardians`), `aldepos_kepegawaian` (tabel `employees`), dan `aldepos_core` (`school_units`) dengan proteksi timeout dan fallback terstruktur.
3. **Payment Gateway Status (Dinonaktifkan by Design):** Endpoint `/payment-gateway/checkout` dan `/payment-gateway/callback` dinonaktifkan dan mengembalikan `HTTP 501 Not Implemented`. Alur pembayaran non-tunai resmi menggunakan sistem unggah bukti transfer manual (`bill_payment_proofs`), antrean verifikasi FIFO bendahara (`GET /bill-payment-proofs?status=pending`), verifikasi (`PATCH /:id/verify`), atau penolakan dengan alasan (`PATCH /:id/reject`).
4. **Reminder Tagihan Santri (100% Selesai & Terverifikasi):** Endpoint `POST /student-bills/:id/reminders` mencatat riwayat ke tabel `bill_reminder_logs` dengan output log stub pesan (WhatsApp, SMS, Email) dan dapat dilihat di riwayat detail tagihan.
5. **Kontrol Anggaran RAPBS (100% Selesai & Terverifikasi):** Pencatatan pengeluaran (`POST /expenses`) yang melebihi pagu anggaran program kegiatan menghasilkan `budget_warning` pada respons dan audit log.
6. **Ekspor Laporan Finansial PDF (100% Selesai & Terverifikasi):** Lima laporan finansial (`general-ledger`, `trial-balance`, `income-statement`, `cash-flow`, `balance-sheet`) mendukung query param `?format=pdf` yang men-stream binary PDF langsung dari backend dengan header lembaga, tabel terstruktur, dan footer dinamis penomoran halaman.
7. **Direct Bank API Integration (Roadmap):** Rekonsiliasi mutasi rekening koran (`payment_reconciliations`) saat ini beroperasi melalui ingest file mutasi bank / CSV; integrasi direct API open banking (Snap BI) masuk dalam roadmap lanjutan.

---

<!-- updated: 2026-08-31 - Modul 05 Keuangan Full Production Ready -->
