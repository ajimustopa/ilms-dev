# erd-keuangan.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 (prinsip arsitektur global) & `rancangan-keuangan.md`
> Bagian 4–5 (ruang lingkup 35 fitur & keputusan terbuka).
> Database: MariaDB 10.5 (`keuangan`), terpisah dari `core`, `akademik`, `kepegawaian`. Query
> builder: Knex.js. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`, semua tabel punya
> `created_at`/`updated_at TIMESTAMP` (tidak ditulis ulang di tiap tabel di bawah supaya ringkas —
> anggap ada di semua tabel kecuali tabel log yang disebutkan *append-only*).
>
> **Status: DRAFT — menunggu 7 poin Keputusan Terbuka di `rancangan-keuangan.md` §5 diputuskan
> developer.** Kolom yang bergantung pada keputusan terbuka ditandai `⚠` dengan catatan di bawah
> tabel terkait. Jangan dipakai sebagai acuan migration final sebelum semua tanda `⚠` beres.

## 0. Referensi Lintas Database (Tanpa FK Fisik)

Sesuai prinsip global, kolom-kolom berikut **bukan** foreign key fisik — hanya ID biasa yang
divalidasi lewat pemanggilan service-layer modul pemiliknya:

| Kolom | Merujuk ke | Modul Pemilik |
|---|---|---|
| `school_unit_id` | `school_units.id` | Core Service |
| `academic_year_id` ⚠ | tahun ajaran | Akademik (lihat Keputusan Terbuka #1 — bisa berubah jadi konsep "tahun buku" lokal Keuangan) |
| `student_id` | data induk siswa | Akademik |
| `grade_level_id` | tingkat | Akademik |
| `class_id` | rombel/kelas | Akademik |
| `employee_id` | data induk pegawai | Kepegawaian |
| `created_by` / `processed_by` / `approved_by` | `users.id` | Core Service |

## 1. Daftar Entitas (28 Tabel)

| Modul (`rancangan-keuangan.md` §4) | Tabel | `school_unit_id`? |
|---|---|---|
| Data Master | `cash_accounts` | Ya |
| Data Master | `cash_account_opening_balances` | Ya (lewat `cash_accounts`) |
| Data Master | `chart_of_accounts` | Ya |
| Data Master | `transaction_account_mappings` | Ya |
| Data Master | `fee_types` | Ya |
| Data Master | `fee_groups` | Ya |
| Data Master | `fee_reference_amounts` | Ya |
| Data Master | `transaction_categories` | Ya |
| Data Master | `budget_programs` | Ya |
| Data Master | `catalog_items` | Ya |
| Data Master | `student_fee_adjustments` | Ya |
| Anggaran (RAPBS) | `budget_plans` | Ya |
| Anggaran (RAPBS) | `budget_plan_income_items` | Ya (lewat `budget_plans`) |
| Anggaran (RAPBS) | `budget_plan_expense_items` | Ya (lewat `budget_plans`) |
| Tagihan | `student_bills` | Ya |
| Tagihan | `bill_reminder_logs` | Ya (lewat `student_bills`) |
| Pembayaran | `bill_payments` | Ya (lewat `student_bills`) |
| Pembayaran | `payment_gateway_transactions` | Ya (lewat `bill_payments`) |
| Pembayaran | `payment_reconciliations` | Ya |
| Penerimaan Lain | `other_incomes` | Ya |
| Pengeluaran | `expenses` | Ya |
| Penggajian | `payroll_disbursements` | Ya |
| Pembukuan | `journal_entries` | Ya |
| Pembukuan | `journal_entry_lines` | Tidak langsung (ikut `journal_entries`) |
| Pembukuan | `savings_accounts` | Ya |
| Pembukuan | `savings_transactions` | Tidak langsung (ikut `savings_accounts`) |
| Pembukuan | `fiscal_year_closings` | Ya |
| Pembukuan + Keamanan | `finance_audit_logs` *(append-only)* | Ya (nullable) |

> Fitur Laporan (#30–33) dan Dashboard (#34) tidak punya tabel sendiri — hasil query agregat dari
> tabel-tabel di atas (`journal_entry_lines`, `budget_plan_*_items`, `student_bills`, `expenses`,
> dst). Fitur Integrasi (#35 "Endpoint parent-facing") juga tidak punya tabel — murni endpoint
> baca dari `student_bills`/`bill_payments` yang sudah ada.

## 2. Detail Tabel

### 2.1 `cash_accounts`
*(Fitur #1 — CRUD Jenis Kas)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| account_kind | ENUM('cash','bank') | NOT NULL |
| bank_account_number | VARCHAR(50) | NULLABLE |
| bank_name | VARCHAR(100) | NULLABLE |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

Saldo berjalan **tidak** disimpan sebagai kolom statis — dihitung dari
`cash_account_opening_balances` + mutasi `journal_entry_lines` per akun COA yang dipetakan ke kas
ini (lihat §2.4), supaya tidak ada dua sumber kebenaran saldo.

### 2.2 `cash_account_opening_balances`
*(Fitur #2 — Saldo awal kas per tahun ajaran)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| cash_account_id | BIGINT UNSIGNED | FK → `cash_accounts.id`, NOT NULL |
| academic_year_id | BIGINT UNSIGNED | NOT NULL ⚠ (lihat §0) |
| opening_balance | DECIMAL(18,2) | NOT NULL |

`UNIQUE (cash_account_id, academic_year_id)`.

### 2.3 `chart_of_accounts`
*(Fitur #3 — COA hierarkis)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| account_code | VARCHAR(30) | NOT NULL |
| account_name | VARCHAR(150) | NOT NULL |
| account_group | ENUM('asset','liability','equity','revenue','expense') | NOT NULL |
| parent_account_id | BIGINT UNSIGNED | NULLABLE — FK → `chart_of_accounts.id` (self-reference) |
| level | TINYINT UNSIGNED | NOT NULL |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

`UNIQUE (school_unit_id, account_code)`.

### 2.4 `transaction_account_mappings`
*(Fitur #4 — Mapping akun transaksi)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| transaction_code | VARCHAR(50) | NOT NULL — mis. `student_bill_payment`, `expense`, `payroll_disbursement` |
| transaction_label | VARCHAR(150) | NOT NULL |
| debit_account_id | BIGINT UNSIGNED | FK → `chart_of_accounts.id`, NOT NULL |
| credit_account_id | BIGINT UNSIGNED | FK → `chart_of_accounts.id`, NOT NULL |

`UNIQUE (school_unit_id, transaction_code)`. Dipakai mesin jurnal otomatis (§2.23) untuk
menentukan pasangan debit/kredit tanpa hardcode di kode aplikasi.

### 2.5 `fee_types`
*(Fitur #5 — Jenis Biaya Pendidikan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| fee_group_id | BIGINT UNSIGNED | NULLABLE — FK → `fee_groups.id` |
| name | VARCHAR(150) | NOT NULL |
| billing_pattern | ENUM('monthly','yearly','incidental') | NOT NULL |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

### 2.6 `fee_groups`
*(Fitur #6 — bagian "Kelompok Biaya")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(100) | NOT NULL |

### 2.7 `fee_reference_amounts`
*(Fitur #6 — bagian "Nominal Biaya Acuan")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| fee_type_id | BIGINT UNSIGNED | FK → `fee_types.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| grade_level_id | BIGINT UNSIGNED | NOT NULL (referensi Akademik, lihat §0) |
| reference_amount | DECIMAL(18,2) | NOT NULL |

`UNIQUE (fee_type_id, school_unit_id, grade_level_id)`.

### 2.8 `transaction_categories`
*(Fitur #7 — Jenis Pengeluaran & Jenis Pemasukan Khusus, digabung satu tabel dengan kolom
`category_kind` sebagai pembeda, sesuai deskripsi PRD yang menyebut keduanya sebagai satu
fitur)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| category_kind | ENUM('expense','special_income') | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| related_account_id | BIGINT UNSIGNED | NULLABLE — FK → `chart_of_accounts.id` |

### 2.9 `budget_programs`
*(Fitur #8 — bagian "Program Kegiatan")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| academic_year_id | BIGINT UNSIGNED | NOT NULL ⚠ (lihat §0) |
| name | VARCHAR(200) | NOT NULL |
| rks_reference_id | BIGINT UNSIGNED | NULLABLE — referensi longgar ke RKS Pengelolaan, lihat Keputusan Terbuka #3 |

### 2.10 `catalog_items`
*(Fitur #8 — bagian "Katalog Item")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| unit | VARCHAR(30) | NOT NULL — mis. `pcs`, `paket`, `jam` |
| reference_price | DECIMAL(18,2) | NOT NULL |

### 2.11 `student_fee_adjustments`
*(Fitur #9 — Penetapan biaya individual & beasiswa/keringanan, digabung satu tabel karena PRD
menyebut keduanya sebagai satu fitur dengan alur ajukan→setujui yang sama)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| student_id | BIGINT UNSIGNED | NOT NULL (referensi Akademik) |
| fee_type_id | BIGINT UNSIGNED | FK → `fee_types.id`, NOT NULL |
| adjustment_kind | ENUM('override_amount','waiver') | NOT NULL |
| override_amount | DECIMAL(18,2) | NULLABLE — dipakai kalau `adjustment_kind = override_amount` |
| waiver_type | VARCHAR(100) | NULLABLE — mis. `beasiswa_prestasi`, `keringanan_yatim` |
| waiver_percentage | DECIMAL(5,2) | NULLABLE |
| waiver_amount | DECIMAL(18,2) | NULLABLE |
| reason | TEXT | NULLABLE |
| status | ENUM('draft','submitted','approved','rejected') | NOT NULL, DEFAULT 'draft' ⚠ (alur approval — lihat Keputusan Terbuka #2) |
| approved_by | BIGINT UNSIGNED | NULLABLE (referensi Core Service `users.id`) |
| approved_at | TIMESTAMP | NULLABLE |

### 2.12 `budget_plans`
*(Fitur #10, #11 — Penyusunan RAPBS + Publish/revisi, digabung karena versi & status ada di
header yang sama)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| academic_year_id | BIGINT UNSIGNED | NOT NULL ⚠ (lihat §0) |
| version | SMALLINT UNSIGNED | NOT NULL, DEFAULT 1 |
| status | ENUM('draft','published') | NOT NULL, DEFAULT 'draft' |
| published_at | TIMESTAMP | NULLABLE |
| revision_reason | TEXT | NULLABLE — diisi saat versi baru dibuat dari versi published sebelumnya |

`UNIQUE (school_unit_id, academic_year_id, version)`.

### 2.13 `budget_plan_income_items`
*(Fitur #10 — bagian rencana pemasukan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| budget_plan_id | BIGINT UNSIGNED | FK → `budget_plans.id`, NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| planned_amount | DECIMAL(18,2) | NOT NULL |

### 2.14 `budget_plan_expense_items`
*(Fitur #10 — bagian rencana pengeluaran per program kegiatan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| budget_plan_id | BIGINT UNSIGNED | FK → `budget_plans.id`, NOT NULL |
| budget_program_id | BIGINT UNSIGNED | FK → `budget_programs.id`, NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| planned_amount | DECIMAL(18,2) | NOT NULL |

Realisasi vs rencana (fitur #12) dihitung real-time: `SUM(expenses.total)` yang
`rencana_pengeluaran_id`-nya mengarah ke baris ini, dibandingkan dengan `planned_amount` — tidak
perlu tabel snapshot terpisah.

### 2.15 `student_bills`
*(Fitur #13, #14, #15 — Generate massal, daftar & filter, batalkan, digabung satu tabel status)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| student_id | BIGINT UNSIGNED | NOT NULL (referensi Akademik) |
| fee_type_id | BIGINT UNSIGNED | FK → `fee_types.id`, NOT NULL |
| period_month | TINYINT UNSIGNED | NULLABLE — untuk pola tagih bulanan |
| period_year | SMALLINT UNSIGNED | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |
| due_date | DATE | NOT NULL |
| status | ENUM('unpaid','partially_paid','paid','cancelled') | NOT NULL, DEFAULT 'unpaid' |
| cancel_reason | TEXT | NULLABLE |
| cancelled_at | TIMESTAMP | NULLABLE |

`INDEX (student_id, status)`, `INDEX (school_unit_id, period_year, period_month)`.

### 2.16 `bill_reminder_logs`
*(Fitur #16 — Reminder tagihan otomatis, append-only)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| student_bill_id | BIGINT UNSIGNED | FK → `student_bills.id`, NOT NULL |
| channel | VARCHAR(30) | NOT NULL — mis. `email`, `whatsapp` (dikirim lewat modul Komunikasi & Notifikasi) |
| sent_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*(append-only, tidak ada `updated_at`)*

### 2.17 `bill_payments`
*(Fitur #17, #18, #19 — Catat, edit/koreksi, cetak kwitansi. Nomor kwitansi & terbilang jadi
kolom di sini, bukan tabel terpisah, karena kwitansi dicetak on-demand dari data pembayaran yang
sudah ada)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| student_bill_id | BIGINT UNSIGNED | FK → `student_bills.id`, NOT NULL |
| cash_account_id | BIGINT UNSIGNED | FK → `cash_accounts.id`, NOT NULL |
| paid_at | TIMESTAMP | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |
| payment_method | ENUM('cash','transfer','gateway') | NOT NULL |
| receipt_number | VARCHAR(50) | NULLABLE, UNIQUE ⚠ (format penomoran — lihat Keputusan Terbuka #6) |
| notes | TEXT | NULLABLE |
| previous_data | JSON | NULLABLE — snapshot sebelum koreksi (fitur #18) |
| correction_reason | TEXT | NULLABLE |

### 2.18 `payment_gateway_transactions`
*(Fitur #20 — Integrasi payment gateway)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| bill_payment_id | BIGINT UNSIGNED | NULLABLE — FK → `bill_payments.id` (diisi setelah callback sukses) |
| provider | VARCHAR(50) | NOT NULL ⚠ (provider belum ditentukan — lihat Keputusan Terbuka #4) |
| provider_reference | VARCHAR(150) | NOT NULL, UNIQUE |
| channel | VARCHAR(50) | NULLABLE — mis. `va_bca`, `qris` |
| amount | DECIMAL(18,2) | NOT NULL |
| status | ENUM('pending','success','failed','expired') | NOT NULL, DEFAULT 'pending' |
| callback_payload | JSON | NULLABLE |

### 2.19 `payment_reconciliations`
*(Fitur #21 — Rekonsiliasi pembayaran PPDB & kantin)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| source_module | ENUM('website_ppdb','kantin') | NOT NULL |
| source_reference | VARCHAR(150) | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |
| reconciled_at | TIMESTAMP | NULLABLE |
| status | ENUM('pending','matched','discrepancy') | NOT NULL, DEFAULT 'pending' |

`UNIQUE (source_module, source_reference)`. Baris `source_module = 'kantin'` disiapkan sebagai
kerangka kosong dulu sampai modul Kantin ada (lihat `rancangan-keuangan.md` §7).

### 2.20 `other_incomes`
*(Fitur #22 — CRUD penerimaan non-SPP)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| academic_year_id | BIGINT UNSIGNED | NOT NULL ⚠ (lihat §0) |
| transaction_category_id | BIGINT UNSIGNED | FK → `transaction_categories.id`, NOT NULL |
| cash_account_id | BIGINT UNSIGNED | FK → `cash_accounts.id`, NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |
| received_at | DATE | NOT NULL |
| notes | TEXT | NULLABLE |

### 2.21 `expenses`
*(Fitur #23, #24 — Pencatatan realisasi pengeluaran + edit/hapus)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| budget_plan_expense_item_id | BIGINT UNSIGNED | NULLABLE — FK → `budget_plan_expense_items.id` |
| item_name | VARCHAR(200) | NOT NULL |
| unit | VARCHAR(30) | NULLABLE |
| unit_price | DECIMAL(18,2) | NOT NULL |
| quantity | DECIMAL(10,2) | NOT NULL |
| total_amount | DECIMAL(18,2) | NOT NULL — dihitung `unit_price * quantity`, disimpan supaya tidak dihitung ulang tiap laporan |
| vendor | VARCHAR(150) | NULLABLE |
| expense_date | DATE | NOT NULL |
| proof_number | VARCHAR(100) | NULLABLE |
| notes | TEXT | NULLABLE |
| previous_data | JSON | NULLABLE — snapshot sebelum edit |
| deleted_reason | TEXT | NULLABLE |
| deleted_at | TIMESTAMP | NULLABLE — soft delete supaya riwayat tetap ada |

### 2.22 `payroll_disbursements`
*(Fitur #25 — Penggajian pegawai/disbursement)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| employee_id | BIGINT UNSIGNED | NOT NULL (referensi Kepegawaian) |
| period_month | TINYINT UNSIGNED | NOT NULL |
| period_year | SMALLINT UNSIGNED | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL — angka final dari payroll Kepegawaian, Keuangan tidak menghitung ulang |
| cash_account_id | BIGINT UNSIGNED | FK → `cash_accounts.id`, NOT NULL |
| disbursed_at | TIMESTAMP | NULLABLE |
| status | ENUM('pending','disbursed','failed') | NOT NULL, DEFAULT 'pending' |

`UNIQUE (employee_id, period_year, period_month)`.

### 2.23 `journal_entries`
*(Fitur #26 — Jurnal otomatis, header)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| journal_number | VARCHAR(50) | NOT NULL, UNIQUE ⚠ (format penomoran — lihat Keputusan Terbuka #6) |
| journal_date | DATE | NOT NULL |
| source_type | ENUM('student_bill_payment','other_income','expense','payroll_disbursement','manual') | NOT NULL |
| source_id | BIGINT UNSIGNED | NULLABLE — ID baris sumber transaksi (mis. `bill_payments.id`) |
| description | TEXT | NULLABLE |
| is_manual_correction | BOOLEAN | NOT NULL, DEFAULT FALSE |

### 2.24 `journal_entry_lines`
*(Fitur #26 — baris debit/kredit)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| journal_entry_id | BIGINT UNSIGNED | FK → `journal_entries.id`, NOT NULL |
| chart_of_account_id | BIGINT UNSIGNED | FK → `chart_of_accounts.id`, NOT NULL |
| entry_side | ENUM('debit','credit') | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |

Buku Besar & Neraca Saldo (fitur #31), Surplus/Defisit & Arus Kas (fitur #32), dan Neraca (fitur
#33) semuanya adalah query agregat `SUM(amount)` per `chart_of_account_id`/`entry_side` dari
tabel ini, difilter periode — tidak perlu tabel laporan terpisah.

### 2.25 `savings_accounts`
*(Fitur #27 — bagian akun tabungan siswa & pegawai)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| owner_type | ENUM('student','employee') | NOT NULL |
| owner_id | BIGINT UNSIGNED | NOT NULL — referensi Akademik (`student_id`) atau Kepegawaian (`employee_id`) sesuai `owner_type` |
| balance | DECIMAL(18,2) | NOT NULL, DEFAULT 0 — kolom cache, sumber kebenaran tetap `savings_transactions` |

`UNIQUE (school_unit_id, owner_type, owner_id)`.

### 2.26 `savings_transactions`
*(Fitur #27 — bagian setor/tarik)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| savings_account_id | BIGINT UNSIGNED | FK → `savings_accounts.id`, NOT NULL |
| transaction_type | ENUM('deposit','withdrawal') | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |
| transacted_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.27 `fiscal_year_closings`
*(Fitur #28 — Tutup buku tahunan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| academic_year_id | BIGINT UNSIGNED | NOT NULL ⚠ (lihat §0) |
| status | ENUM('open','closed') | NOT NULL, DEFAULT 'open' |
| closed_at | TIMESTAMP | NULLABLE |
| closed_by | BIGINT UNSIGNED | NULLABLE (referensi Core Service `users.id`) |

`UNIQUE (school_unit_id, academic_year_id)`.

### 2.28 `finance_audit_logs`
*(Fitur #29 — Audit trail transaksi keuangan, append-only. Lihat Keputusan Terbuka #7 soal
duplikasi dengan `activity_logs` Core Service)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE |
| user_id | BIGINT UNSIGNED | NULLABLE (referensi Core Service `users.id`) |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(100) | NOT NULL — mis. `bill_payment`, `expense` |
| entity_id | BIGINT UNSIGNED | NULLABLE |
| data_before | JSON | NULLABLE |
| data_after | JSON | NULLABLE |
| occurred_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*(append-only, tidak ada `updated_at`)*, `INDEX (entity_type, occurred_at)`.

## 3. Skrip SQL Siap Pakai

### 3.1 DDL — Buat Database & Seluruh Tabel

```sql
CREATE DATABASE IF NOT EXISTS keuangan_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE keuangan_local;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. cash_accounts
CREATE TABLE cash_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  account_kind ENUM('cash','bank') NOT NULL,
  bank_account_number VARCHAR(50) NULL,
  bank_name VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. chart_of_accounts
CREATE TABLE chart_of_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  account_code VARCHAR(30) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_group ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_account_id BIGINT UNSIGNED NULL,
  level TINYINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coa_code (school_unit_id, account_code),
  CONSTRAINT fk_coa_parent FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. cash_account_opening_balances
CREATE TABLE cash_account_opening_balances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cash_account_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  opening_balance DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_caob (cash_account_id, academic_year_id),
  CONSTRAINT fk_caob_cash_account FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. transaction_account_mappings
CREATE TABLE transaction_account_mappings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  transaction_code VARCHAR(50) NOT NULL,
  transaction_label VARCHAR(150) NOT NULL,
  debit_account_id BIGINT UNSIGNED NOT NULL,
  credit_account_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tam_code (school_unit_id, transaction_code),
  CONSTRAINT fk_tam_debit FOREIGN KEY (debit_account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT fk_tam_credit FOREIGN KEY (credit_account_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. fee_groups
CREATE TABLE fee_groups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. fee_types
CREATE TABLE fee_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  fee_group_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  billing_pattern ENUM('monthly','yearly','incidental') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_types_group FOREIGN KEY (fee_group_id) REFERENCES fee_groups(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. fee_reference_amounts
CREATE TABLE fee_reference_amounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_type_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  grade_level_id BIGINT UNSIGNED NOT NULL,
  reference_amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fra (fee_type_id, school_unit_id, grade_level_id),
  CONSTRAINT fk_fra_fee_type FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. transaction_categories
CREATE TABLE transaction_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  category_kind ENUM('expense','special_income') NOT NULL,
  name VARCHAR(150) NOT NULL,
  related_account_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tc_account FOREIGN KEY (related_account_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. budget_programs
CREATE TABLE budget_programs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  rks_reference_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. catalog_items
CREATE TABLE catalog_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  reference_price DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. student_fee_adjustments
CREATE TABLE student_fee_adjustments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  fee_type_id BIGINT UNSIGNED NOT NULL,
  adjustment_kind ENUM('override_amount','waiver') NOT NULL,
  override_amount DECIMAL(18,2) NULL,
  waiver_type VARCHAR(100) NULL,
  waiver_percentage DECIMAL(5,2) NULL,
  waiver_amount DECIMAL(18,2) NULL,
  reason TEXT NULL,
  status ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sfa_fee_type FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. budget_plans
CREATE TABLE budget_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  revision_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_budget_plan_version (school_unit_id, academic_year_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. budget_plan_income_items
CREATE TABLE budget_plan_income_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_plan_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  planned_amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpii_plan FOREIGN KEY (budget_plan_id) REFERENCES budget_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. budget_plan_expense_items
CREATE TABLE budget_plan_expense_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_plan_id BIGINT UNSIGNED NOT NULL,
  budget_program_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  planned_amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpei_plan FOREIGN KEY (budget_plan_id) REFERENCES budget_plans(id),
  CONSTRAINT fk_bpei_program FOREIGN KEY (budget_program_id) REFERENCES budget_programs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. student_bills
CREATE TABLE student_bills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  fee_type_id BIGINT UNSIGNED NOT NULL,
  period_month TINYINT UNSIGNED NULL,
  period_year SMALLINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('unpaid','partially_paid','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  cancel_reason TEXT NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bills_student_status (student_id, status),
  INDEX idx_bills_period (school_unit_id, period_year, period_month),
  CONSTRAINT fk_bills_fee_type FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. bill_reminder_logs
CREATE TABLE bill_reminder_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_bill_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(30) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_brl_bill FOREIGN KEY (student_bill_id) REFERENCES student_bills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. bill_payments
CREATE TABLE bill_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_bill_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NOT NULL,
  paid_at TIMESTAMP NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  payment_method ENUM('cash','transfer','gateway') NOT NULL,
  receipt_number VARCHAR(50) NULL UNIQUE,
  notes TEXT NULL,
  previous_data JSON NULL,
  correction_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bp_bill FOREIGN KEY (student_bill_id) REFERENCES student_bills(id),
  CONSTRAINT fk_bp_cash_account FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. payment_gateway_transactions
CREATE TABLE payment_gateway_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bill_payment_id BIGINT UNSIGNED NULL,
  provider VARCHAR(50) NOT NULL,
  provider_reference VARCHAR(150) NOT NULL UNIQUE,
  channel VARCHAR(50) NULL,
  amount DECIMAL(18,2) NOT NULL,
  status ENUM('pending','success','failed','expired') NOT NULL DEFAULT 'pending',
  callback_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pgt_payment FOREIGN KEY (bill_payment_id) REFERENCES bill_payments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. payment_reconciliations
CREATE TABLE payment_reconciliations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  source_module ENUM('website_ppdb','kantin') NOT NULL,
  source_reference VARCHAR(150) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  reconciled_at TIMESTAMP NULL,
  status ENUM('pending','matched','discrepancy') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reconciliation (source_module, source_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. other_incomes
CREATE TABLE other_incomes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  transaction_category_id BIGINT UNSIGNED NOT NULL,
  cash_account_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  received_at DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_oi_category FOREIGN KEY (transaction_category_id) REFERENCES transaction_categories(id),
  CONSTRAINT fk_oi_cash_account FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. expenses
CREATE TABLE expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  budget_plan_expense_item_id BIGINT UNSIGNED NULL,
  item_name VARCHAR(200) NOT NULL,
  unit VARCHAR(30) NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(18,2) NOT NULL,
  vendor VARCHAR(150) NULL,
  expense_date DATE NOT NULL,
  proof_number VARCHAR(100) NULL,
  notes TEXT NULL,
  previous_data JSON NULL,
  deleted_reason TEXT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_budget_item FOREIGN KEY (budget_plan_expense_item_id) REFERENCES budget_plan_expense_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. payroll_disbursements
CREATE TABLE payroll_disbursements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  period_month TINYINT UNSIGNED NOT NULL,
  period_year SMALLINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  cash_account_id BIGINT UNSIGNED NOT NULL,
  disbursed_at TIMESTAMP NULL,
  status ENUM('pending','disbursed','failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payroll (employee_id, period_year, period_month),
  CONSTRAINT fk_payroll_cash_account FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. journal_entries
CREATE TABLE journal_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  journal_number VARCHAR(50) NOT NULL UNIQUE,
  journal_date DATE NOT NULL,
  source_type ENUM('student_bill_payment','other_income','expense','payroll_disbursement','manual') NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  is_manual_correction BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. journal_entry_lines
CREATE TABLE journal_entry_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id BIGINT UNSIGNED NOT NULL,
  chart_of_account_id BIGINT UNSIGNED NOT NULL,
  entry_side ENUM('debit','credit') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jel_account (chart_of_account_id, entry_side),
  CONSTRAINT fk_jel_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  CONSTRAINT fk_jel_account FOREIGN KEY (chart_of_account_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. savings_accounts
CREATE TABLE savings_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  owner_type ENUM('student','employee') NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_savings_owner (school_unit_id, owner_type, owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. savings_transactions
CREATE TABLE savings_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  savings_account_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('deposit','withdrawal') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  transacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_account FOREIGN KEY (savings_account_id) REFERENCES savings_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. fiscal_year_closings
CREATE TABLE fiscal_year_closings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  closed_at TIMESTAMP NULL,
  closed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_closing (school_unit_id, academic_year_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. finance_audit_logs
CREATE TABLE finance_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  data_before JSON NULL,
  data_after JSON NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fal_entity (entity_type, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

### 3.2 Seed Data Dummy

```sql
INSERT INTO cash_accounts (school_unit_id, name, account_kind, is_active)
VALUES (1, 'Kas Tunai SD Contoh 1', 'cash', TRUE),
       (1, 'Bank BCA SD Contoh 1', 'bank', TRUE);

INSERT INTO chart_of_accounts (school_unit_id, account_code, account_name, account_group, level)
VALUES (1, '1-000', 'Aset', 'asset', 1),
       (1, '1-100', 'Kas & Bank', 'asset', 2),
       (1, '4-000', 'Pendapatan', 'revenue', 1),
       (1, '4-100', 'Pendapatan SPP', 'revenue', 2),
       (1, '6-000', 'Beban', 'expense', 1),
       (1, '6-100', 'Beban Operasional', 'expense', 2);

INSERT INTO fee_groups (school_unit_id, name)
VALUES (1, 'Biaya Rutin Bulanan'), (1, 'Biaya Awal Tahun');

INSERT INTO fee_types (school_unit_id, fee_group_id, name, billing_pattern, is_active)
VALUES (1, 1, 'SPP', 'monthly', TRUE),
       (1, 2, 'Uang Gedung / DSP', 'yearly', TRUE);

-- Catatan: academic_year_id, student_id, grade_level_id, employee_id di bawah ini memakai ID
-- dummy (1) — SESUAIKAN dengan ID nyata dari seed lokal Akademik/Kepegawaian setelah kedua
-- modul itu jalan di lokal, seed ini hanya untuk uji struktur tabel Keuangan berdiri sendiri.
INSERT INTO fee_reference_amounts (fee_type_id, school_unit_id, grade_level_id, reference_amount)
VALUES (1, 1, 1, 350000.00);

INSERT INTO student_bills (school_unit_id, student_id, fee_type_id, period_month, period_year, amount, due_date, status)
VALUES (1, 1, 1, 8, 2026, 350000.00, '2026-08-10', 'unpaid');
```

## 4. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Draft awal ERD Keuangan: 28 tabel. Kolom yang bergantung Keputusan Terbuka `rancangan-keuangan.md` §5 ditandai `⚠`. Belum final — menunggu keputusan developer atas 7 poin terbuka sebelum dipakai sebagai acuan migration produksi (aman dipakai untuk migration/testing lokal). |

*(Tambahkan baris baru di atas setiap ada perubahan skema — jangan hapus riwayat lama.)*
