Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-keuangan.md

> Kontrak RESTful API resmi untuk modul **Keuangan**. Acuan tunggal untuk implementasi backend
> Keuangan (`apps/api-backend/src/modules/keuangan/`) dan integrasi modul lain (Portal Orangtua,
> Sarpras, Kantin, Komunikasi & Notifikasi, Pengelolaan, Website Utama) yang mengonsumsi data
> Keuangan. Mengikuti pola `api-contract-coreservice.md` — response envelope, kode status, dan
> skema auth **sama persis**, tidak didesain ulang.
>
> **Status: DRAFT.** Beberapa endpoint bergantung pada Keputusan Terbuka di `rancangan-keuangan.md`
> §5 (ditandai `⚠`), khususnya endpoint payment gateway (provider belum ditentukan) dan approval
> beasiswa/keringanan (alur belum final).

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/keuangan`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/keuangan`
- **Lokal Development:** `http://localhost:3000/api/v1/keuangan`

### 1.2 Skema Autentikasi & Otorisasi

Sama seperti Core Service (`api-contract-coreservice.md` §1.2), Keuangan **tidak menerbitkan**
token sendiri — hanya memverifikasi JWT yang diterbitkan Core Service:

1. **Bearer Token (JWT) — untuk Pengguna:**
   ```http
   Authorization: Bearer <access_token>
   ```
   Payload token (`school_units[].permissions`) sudah memuat kode izin `keuangan.*` yang relevan
   untuk user tersebut per Satuan Pendidikan — lihat `roles-keuangan.md` §4.2 untuk daftar
   lengkap kode izin.

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service:**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai modul lain (Portal Orangtua, Sarpras, Kantin, Komunikasi & Notifikasi, Pengelolaan)
   saat memanggil endpoint internal Keuangan (mis. baca saldo tagihan siswa untuk dashboard
   Portal Orangtua), dan dipakai Kepegawaian saat mengirim data payroll final untuk pencairan.

3. **Payment Gateway Callback Signature (`X-Gateway-Signature`)** ⚠ — header verifikasi callback
   dari penyedia payment gateway, formatnya mengikuti dokumentasi provider yang dipilih (belum
   final, lihat `rancangan-keuangan.md` §5 Keputusan Terbuka #4).

### 1.3 Standar Struktur Response JSON

Identik dengan `api-contract-coreservice.md` §1.3 — `{ success, data, message, errors }` untuk
semua response, tanpa pengecualian.

### 1.4 Kode Status HTTP yang Digunakan

Sama seperti `api-contract-coreservice.md` §1.4 (`200`, `201`, `400`, `401`, `403`, `404`, `409`,
`422`, `429`, `500`). Tambahan khusus Keuangan:

| Kode HTTP | Status | Keterangan Penggunaan Khusus Keuangan |
|---|---|---|
| `409 Conflict` | Konflik | Mis. mencoba membayar tagihan yang sudah `status = paid`, atau membuat versi RAPBS baru saat versi sebelumnya masih `draft` |
| `422 Unprocessable Entity` | Validasi Gagal | Mis. jurnal tidak balance (total debit ≠ total kredit), tutup buku diajukan padahal masih ada tagihan `unpaid` |

### 1.5 Definisi Aktor

Mengikuti `account_type` & role dari Core Service (`api-contract-coreservice.md` §1.5), aktor
yang relevan di Keuangan:
- `admin_keuangan` — role kustom yang di-assign lewat `user_school_roles` Core Service, punya
  akses penuh sesuai matriks di `roles-keuangan.md`
- `kepala_sekolah` — akses baca RAPBS, laporan, dashboard (tidak bisa transaksi harian)
- `orangtua` / `siswa` — akses baca terbatas (tagihan & pembayaran miliknya sendiri, tabungan
  miliknya sendiri) lewat endpoint `/parent-facing` (fitur #35)
- `pegawai` — akses baca tabungan miliknya sendiri
- `internal_service` — 13 modul satelit lewat `X-API-Key`

---

## 2. Daftar & Detail Endpoint per Modul

### MODUL 1: DATA MASTER

#### 1.1 Fitur #1: CRUD Jenis Kas
- `GET /cash-accounts` — daftar & filter (`school_unit_id`, `is_active`)
- `GET /cash-accounts/:id`
- `POST /cash-accounts` — body: `name, account_kind, bank_account_number?, bank_name?`
- `PUT /cash-accounts/:id`
- `PATCH /cash-accounts/:id/status` — nonaktifkan (body: `is_active`)
- `GET /cash-accounts/:id/balance` — saldo berjalan terhitung (opening balance + mutasi jurnal)

#### 1.2 Fitur #2: Saldo Awal Kas per Tahun Ajaran
- `GET /cash-account-opening-balances?academic_year_id=`
- `POST /cash-account-opening-balances` — body: `cash_account_id, academic_year_id, opening_balance`
- `PUT /cash-account-opening-balances/:id`

#### 1.3 Fitur #3: Chart of Account (COA)
- `GET /chart-of-accounts` — mendukung `?tree=true` untuk struktur berjenjang
- `GET /chart-of-accounts/:id`
- `POST /chart-of-accounts` — body: `account_code, account_name, account_group, parent_account_id?`
- `PUT /chart-of-accounts/:id`
- `PATCH /chart-of-accounts/:id/status`

#### 1.4 Fitur #4: Mapping Akun Transaksi
- `GET /transaction-account-mappings`
- `POST /transaction-account-mappings` — body: `transaction_code, transaction_label, debit_account_id, credit_account_id`
- `PUT /transaction-account-mappings/:id`

#### 1.5 Fitur #5: Jenis Biaya Pendidikan
- `GET /fee-types`
- `POST /fee-types` — body: `name, billing_pattern, fee_group_id?`
- `PUT /fee-types/:id`
- `PATCH /fee-types/:id/status`

#### 1.6 Fitur #6: Kelompok Biaya & Nominal Biaya Acuan
- `GET /fee-groups` · `POST /fee-groups` · `PUT /fee-groups/:id`
- `GET /fee-reference-amounts?fee_type_id=&grade_level_id=`
- `POST /fee-reference-amounts` — body: `fee_type_id, grade_level_id, reference_amount`
- `PUT /fee-reference-amounts/:id`

#### 1.7 Fitur #7: Jenis Pengeluaran & Jenis Pemasukan Khusus
- `GET /transaction-categories?category_kind=expense|special_income`
- `POST /transaction-categories` — body: `category_kind, name, related_account_id?`
- `PUT /transaction-categories/:id`

#### 1.8 Fitur #8: Program Kegiatan & Katalog Item
- `GET /budget-programs?academic_year_id=`
- `POST /budget-programs` — body: `name, academic_year_id, rks_reference_id?`
- `PUT /budget-programs/:id`
- `GET /catalog-items` · `POST /catalog-items` · `PUT /catalog-items/:id`

#### 1.9 Fitur #9: Penetapan Biaya Individual & Beasiswa/Keringanan ⚠
> Alur approval final menunggu Keputusan Terbuka #2.

- `GET /student-fee-adjustments?student_id=&status=`
- `POST /student-fee-adjustments` — body: `student_id, fee_type_id, adjustment_kind, override_amount? | waiver_type & (waiver_percentage | waiver_amount), reason`
- `PATCH /student-fee-adjustments/:id/submit`
- `PATCH /student-fee-adjustments/:id/approve` — body: `approved_by` (dari token)
- `PATCH /student-fee-adjustments/:id/reject` — body: `rejection_reason`

**Response Sukses `POST /student-fee-adjustments` (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "student_id": 240,
    "fee_type_id": 1,
    "adjustment_kind": "waiver",
    "waiver_type": "beasiswa_prestasi",
    "waiver_percentage": 50.00,
    "status": "draft"
  },
  "message": "Pengajuan keringanan biaya berhasil dibuat",
  "errors": null
}
```

---

### MODUL 2: ANGGARAN (RAPBS)

#### 2.1 Fitur #10: Penyusunan RAPBS
- `GET /budget-plans?academic_year_id=&status=`
- `GET /budget-plans/:id` — termasuk daftar `income_items` & `expense_items`
- `POST /budget-plans` — buat draft baru (body: `academic_year_id`)
- `POST /budget-plans/:id/new-version` — duplikasi jadi versi baru dari versi published (body: `revision_reason`)
- `POST /budget-plans/:id/income-items` · `PUT /budget-plans/:id/income-items/:item_id` · `DELETE .../income-items/:item_id`
- `POST /budget-plans/:id/expense-items` · `PUT .../expense-items/:item_id` · `DELETE .../expense-items/:item_id`

#### 2.2 Fitur #11: Publish/Terbit & Revisi RAPBS
- `PATCH /budget-plans/:id/publish` — ubah status `draft` → `published`, set `published_at`
- Revisi dilakukan lewat `POST /budget-plans/:id/new-version` di atas (fitur #10), bukan endpoint terpisah

**Response Sukses `PATCH /budget-plans/:id/publish` (`200 OK`):**
```json
{
  "success": true,
  "data": { "id": 3, "status": "published", "published_at": "2026-08-17T02:00:00Z" },
  "message": "RAPBS berhasil diterbitkan",
  "errors": null
}
```

#### 2.3 Fitur #12: Realisasi vs Rencana Anggaran (Real-Time)
- `GET /budget-plans/:id/realization` — agregat per `budget_program_id`, response:
```json
{
  "success": true,
  "data": {
    "budget_plan_id": 3,
    "programs": [
      {
        "budget_program_id": 5,
        "program_name": "Renovasi Perpustakaan",
        "planned_amount": 50000000,
        "realized_amount": 32000000,
        "absorption_percentage": 64.0,
        "is_over_budget": false
      }
    ]
  },
  "message": null,
  "errors": null
}
```

---

### MODUL 3: TAGIHAN

#### 3.1 Fitur #13: Generate Tagihan Massal
- `POST /student-bills/generate` — body: `fee_type_id, period_month?, period_year, target ('all'|'class'|'individual'), class_id?, student_ids?`
- `POST /student-bills/generate/preview` — simulasi tanpa simpan, mengembalikan daftar siswa & nominal yang akan ditagih

#### 3.2 Fitur #14: Daftar & Filter Tagihan
- `GET /student-bills?status=&student_id=&class_id=&fee_type_id=&period_year=&period_month=`
- `GET /student-bills/:id`

#### 3.3 Fitur #15: Batalkan Tagihan
- `PATCH /student-bills/:id/cancel` — body: `cancel_reason` (ditolak jika sudah ada pembayaran)

#### 3.4 Fitur #16: Reminder Tagihan Otomatis
- `POST /student-bills/reminders/run` — dipicu scheduler/cron, mengirim lewat modul Komunikasi & Notifikasi untuk semua tagihan mendekati/lewat jatuh tempo
- `GET /student-bills/:id/reminder-logs`

---

### MODUL 4: PEMBAYARAN

#### 4.1 Fitur #17: Catat Pembayaran Tagihan
- `POST /bill-payments` — body: `student_bill_id, cash_account_id, paid_at, amount, payment_method, notes?`

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 981,
    "student_bill_id": 4021,
    "amount": 350000.00,
    "payment_method": "cash",
    "bill_status_after": "paid"
  },
  "message": "Pembayaran berhasil dicatat",
  "errors": null
}
```
Endpoint ini otomatis: (1) meng-update `student_bills.status`, (2) memicu pembuatan
`journal_entries` + `journal_entry_lines` lewat `transaction_account_mappings` (fitur #26).

#### 4.2 Fitur #18: Edit/Koreksi Pembayaran
- `GET /bill-payments/:id/history`
- `PATCH /bill-payments/:id` — body: `amount?, paid_at?, correction_reason` (wajib diisi), menyimpan `previous_data` dan membuat jurnal koreksi

#### 4.3 Fitur #19: Cetak Kwitansi Pembayaran
- `GET /bill-payments/:id/receipt` — response `data.amount_in_words` berisi terbilang Bahasa
  Indonesia, `data.receipt_number` di-generate otomatis saat pertama kali diakses jika belum ada
- `GET /bill-payments/:id/receipt.pdf` — unduh PDF langsung

#### 4.4 Fitur #20: Integrasi Payment Gateway ⚠
> Provider belum ditentukan (lihat Keputusan Terbuka #4) — skema payload di bawah bersifat generik
> dan perlu disesuaikan begitu provider dipilih.

- `POST /payment-gateway/checkout` — body: `student_bill_id, channel?`, response berisi URL/kode
  pembayaran dari provider
- `POST /payment-gateway/callback` — endpoint publik dipanggil provider, diverifikasi lewat
  `X-Gateway-Signature`
- `GET /payment-gateway/transactions?status=`

#### 4.5 Fitur #21: Rekonsiliasi Pembayaran PPDB & Kantin
- `GET /payment-reconciliations?source_module=website_ppdb|kantin&status=`
- `POST /payment-reconciliations/:id/match` — body: `bill_payment_id?` (tandai cocok)
- `POST /payment-reconciliations/:id/flag-discrepancy` — body: `notes`
- `POST /internal/payment-reconciliations/ingest` *(dipanggil Website Utama/Kantin via `X-API-Key`)* — body: `source_module, source_reference, amount`

---

### MODUL 5: PENERIMAAN LAIN

#### 5.1 Fitur #22: CRUD Penerimaan Non-SPP
- `GET /other-incomes?academic_year_id=&transaction_category_id=`
- `POST /other-incomes` — body: `transaction_category_id, cash_account_id, amount, received_at, notes?` — otomatis membuat jurnal
- `PUT /other-incomes/:id` · `DELETE /other-incomes/:id`

---

### MODUL 6: PENGELUARAN

#### 6.1 Fitur #23: Pencatatan Realisasi Pengeluaran
- `POST /expenses` — body: `item_name, unit?, unit_price, quantity, vendor?, expense_date, proof_number?, budget_plan_expense_item_id?, notes?` (`total_amount` dihitung server-side)

#### 6.2 Fitur #24: Edit & Hapus Pengeluaran
- `PUT /expenses/:id` — body sama seperti create, plus wajib field alasan perubahan
- `DELETE /expenses/:id` — body: `deleted_reason` (soft delete, bukan hard delete)

---

### MODUL 7: PENGGAJIAN

#### 7.1 Fitur #25: Penggajian Pegawai (Disbursement)
- `POST /internal/payroll-disbursements/ingest` *(dipanggil Kepegawaian via `X-API-Key`)* — body: `employee_id, period_month, period_year, amount`
- `GET /payroll-disbursements?period_year=&period_month=&status=`
- `POST /payroll-disbursements/:id/disburse` — body: `cash_account_id` → set `status = disbursed`, `disbursed_at`, buat jurnal

---

### MODUL 8: PEMBUKUAN

#### 8.1 Fitur #26: Jurnal Otomatis
- `GET /journal-entries?source_type=&date_from=&date_to=`
- `GET /journal-entries/:id` — termasuk `lines[]`
- `POST /journal-entries/manual` — body: `journal_date, description, lines: [{chart_of_account_id, entry_side, amount}, ...]` (ditolak `422` kalau `SUM(debit) != SUM(credit)`)

#### 8.2 Fitur #27: Tabungan Siswa & Pegawai
- `GET /savings-accounts?owner_type=&owner_id=`
- `POST /savings-accounts` — body: `owner_type, owner_id`
- `POST /savings-accounts/:id/deposit` — body: `amount`
- `POST /savings-accounts/:id/withdraw` — body: `amount` (ditolak `422` kalau melebihi saldo)
- `GET /savings-accounts/:id/transactions`

#### 8.3 Fitur #28: Tutup Buku Tahunan
- `GET /fiscal-year-closings?academic_year_id=`
- `POST /fiscal-year-closings` — body: `academic_year_id` (ditolak `422` kalau masih ada `student_bills.status = unpaid` atau `budget_plans.status = draft` yang belum diselesaikan — aturan pasti perlu dikonfirmasi developer saat implementasi)
- `PATCH /fiscal-year-closings/:id/reopen` — hanya `super_admin`/`admin_yayasan`

#### 8.4 Fitur #29: Audit Trail Transaksi Keuangan
- `GET /finance-audit-logs?entity_type=&user_id=&date_from=&date_to=`
- Dicatat otomatis oleh backend di setiap operasi tulis (create/update/delete) pada tabel
  transaksi — bukan endpoint yang dipanggil manual dari frontend

---

### MODUL 9: LAPORAN

#### 9.1 Fitur #30: Laporan Realisasi RAPBS
- `GET /reports/budget-realization?budget_plan_id=&format=json|pdf|xlsx`

#### 9.2 Fitur #31: Buku Besar & Neraca Saldo
- `GET /reports/general-ledger?account_code=&period_from=&period_to=&format=`
- `GET /reports/trial-balance?period=&format=`

#### 9.3 Fitur #32: Surplus/Defisit & Arus Kas
- `GET /reports/income-statement?period=&format=`
- `GET /reports/cash-flow?period=&format=`

#### 9.4 Fitur #33: Neraca (Posisi Keuangan)
- `GET /reports/balance-sheet?period=&format=`

---

### MODUL 10: DASHBOARD

#### 10.1 Fitur #34: Dashboard Keuangan
- `GET /dashboard?school_unit_id=&academic_year_id=`

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "cash_balances": [
      { "cash_account_id": 1, "name": "Kas Tunai", "balance": 12500000 },
      { "cash_account_id": 2, "name": "Bank BCA", "balance": 340000000 }
    ],
    "bill_status_summary": { "unpaid": 42, "partially_paid": 5, "paid": 310 },
    "monthly_income_chart": [ { "month": "2026-06", "amount": 210000000 } ],
    "monthly_expense_chart": [ { "month": "2026-06", "amount": 95000000 } ],
    "budget_realization_percentage": 58.4,
    "over_budget_alerts": [ { "budget_program_id": 5, "absorption_percentage": 104.2 } ]
  },
  "message": null,
  "errors": null
}
```

---

### MODUL 11: INTEGRASI

#### 11.1 Fitur #35: Endpoint Parent-Facing (Tagihan & Pembayaran)
> Dikonsumsi oleh Portal Orangtua. Autentikasi tetap Bearer JWT milik akun orangtua/siswa, backend
> memfilter otomatis berdasarkan `ref_id` (siswa terkait) dari payload token — orangtua **tidak**
> bisa mengakses data siswa lain lewat parameter query.

- `GET /parent-facing/bills?student_id=` — daftar tagihan anak
- `GET /parent-facing/bills/:id`
- `GET /parent-facing/payments?student_id=` — riwayat pembayaran anak
- `GET /parent-facing/savings?student_id=` — saldo & riwayat tabungan anak (fitur #27)

---

## 3. Webhook

### 3.1 Event yang Dipublish Keuangan

Format payload standar mengikuti `ARSITEKTUR-SISTEM.md` §4.3: `{ event_type, timestamp, data, satuan_pendidikan_id }`.

| `event_type` | Dipicu Saat | Dikonsumsi Oleh |
|---|---|---|
| `keuangan.bill.paid` | Tagihan lunas (fitur #17) | Portal Orangtua, Komunikasi & Notifikasi |
| `keuangan.budget_plan.published` | RAPBS diterbitkan (fitur #11) | Pengelolaan |
| `keuangan.payroll.disbursed` | Gaji pegawai dicairkan (fitur #25) | Komunikasi & Notifikasi |

### 3.2 Event yang Di-subscribe Keuangan

- `core.school_unit.updated` (Core Service) — sinkronisasi status aktif satuan pendidikan
- `akademik.student.enrolled` / `akademik.student.transferred` (Akademik) — trigger evaluasi
  ulang tagihan siswa (mis. siswa pindah kelas → nominal acuan biaya bisa berubah)
- `kepegawaian.payroll.finalized` (Kepegawaian) — alternatif event-driven untuk fitur #25, selain
  endpoint `POST /internal/payroll-disbursements/ingest` yang dipanggil langsung

## 4. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Draft awal kontrak API Keuangan, 35 fitur dipetakan ke endpoint. Endpoint payment gateway (§4.4) dan approval keringanan biaya (§1.9) ditandai `⚠` menunggu Keputusan Terbuka `rancangan-keuangan.md` §5. |

*(Tambahkan baris baru di atas setiap ada perubahan kontrak — jangan hapus riwayat lama.)*
