# LAPORAN TAHAP 7: JATAH, SALDO, DAN LEDGER (BACKEND)
Core Aldepos · Modul Kepegawaian (HRIS) · Halaman "Manajemen Cuti, Izin & Lembur"

Tanggal: 2026-10-07
Status: Selesai (100% Test Passed)
Branch: `feature/kepegawaian-cuti-lembur`

---

## (a) Berkas Dibuat / Diubah

1. **Fungsi Murni Kalkulator Hak, Carry Over, Alokasi Bucket & Rekonstruksi Ledger**:
   - `apps/api-backend/src/modules/kepegawaian/leave/entitlementCalculator.js` (Diperbarui):
     - `computeEntitlement({ joinDate, employmentStatus, policy, rules, period })` (B1–B3, B1c, UNKNOWN_JOIN_DATE)
     - `computeCarryOver({ remainingCurrentBalance, policy, newPeriodStartDate })` (B4)
     - `allocateDaysToBuckets({ days, carryRemaining, carryExpiresOn })` (B5)
     - `rebuildBalanceFromLedger(entries)` & verifikasi invarian §5.4
   - `apps/api-backend/src/modules/kepegawaian/leave/entitlementCalculator.test.js` (Diperbarui: 11/11 tests passing)

2. **Backend Service & Ledger Engine (Append-Only)**:
   - `apps/api-backend/src/modules/kepegawaian/leave/leaveLedgerService.js` (Diperbarui):
     - Operasi mutasi transaksi Knex (`SELECT ... FOR UPDATE`): `grant`, `carry_in`, `reserve`, `commit`, `reserveAndCommit`, `release`, `refund` (B7), `joint_leave_debit`, `expire`, `adjust`.
     - `ensureEntitlement` (lazy initialization idempoten)
     - `checkAndExpireCarryOver` (lazy expiry saat baca)
     - `applyJointLeaveDeduction` (pemotongan cuti bersama dengan pengecekan jadwal kerja, pencegahan double deduction, dan lock guard)
     - `bulkAssignEntitlements` (bulk assign hak cuti per satuan)
     - `closePeriod` (tutup periode dengan mode dry-run default & apply)
     - `reconcileBalances` (rekonsiliasi saldo dari ledger vs cache table)
     - `isAttendancePeriodLocked` (pengecekan kunci presensi pada periode aktif)

3. **Controller & Routing Backend**:
   - `apps/api-backend/src/modules/kepegawaian/leave/controller.js` (Diperbarui):
     - `getBalances`, `getMyBalance`, `getLedger`, `adjustBalance`, `bulkAssignBalances`, `closePeriod`, `reconcilePeriod`, `applyJointLeaveDeduction`, `getBalancePolicies`
   - `apps/api-backend/src/modules/kepegawaian/leave/routes.js` (Diperbarui):
     - Mendaftarkan rute SPEC §11.3 & §11.1

4. **CLI / Perintah Manual (NPM Scripts)**:
   - `apps/api-backend/src/modules/kepegawaian/leave/scripts/close_period.js` (Dibuat)
   - `apps/api-backend/src/modules/kepegawaian/leave/scripts/reconcile_balances.js` (Dibuat)
   - `apps/api-backend/package.json` & `package.json` root (Diperbarui)

5. **Automated Test Suite**:
   - `apps/api-backend/src/modules/kepegawaian/leave/tahap7_ledger_integration.test.js` (Dibuat: 10/10 tests passing)
   - `apps/api-backend/src/modules/kepegawaian/leave/scripts/run_all_leave_tests.js` (Diperbarui: 10/10 suites passing)

---

## (b) Migrasi / Database yang Dijalankan

- Target Database: `kepegawaian_dev` pada `127.0.0.1:3306` (Dev lokal)
- Migrasi Knex:
  - M-D: `20261008000004_leave_balance_policies_rules_periods.js` (`leave_balance_policies`, `leave_entitlement_rules`, `leave_balance_periods`)
  - M-E: `20261008000005_leave_balances_and_ledger.js` (`employee_leave_balances`, `leave_ledger_entries`)
- Seed Konfigurasi USULAN-TERKUNCI:
  - `annual_default` policy (period_start_month=7, proration cutoff 15, carry max 6, expiry 3 bulan)
  - Entitlement rules: GTY 12 hari, PTY 12 hari
  - Periode aktif: `2026/2027` (2026-07-01 s/d 2027-06-30)

---

## (c) Endpoint Baru & Berubah

| Method | Path | Permission / Akses | Keterangan |
|---|---|---|---|
| `GET` | `/leave-balance-policies` | `leave_balances.manage` / `read` | Daftar kebijakan jatah cuti & aturan entitas |
| `GET` | `/leave-balances` | `leave_balances.read` / `manage` | Daftar ringkasan saldo pegawai (JWT scoped) |
| `GET` | `/leave-balances/my` | Authenticate + Aktor Pegawai | Saldo pegawai yang login saja (403 untuk siswa) |
| `GET` | `/leave-balances/:employeeId/ledger` | `leave_balances.read` | Riwayat transaksi buku besar mutasi cuti |
| `POST` | `/leave-balances/adjust` | `leave_balances.manage` | Penyesuaian saldo manual oleh HRD (alasan wajib) |
| `POST` | `/leave-balances/bulk-assign` | `leave_balances.manage` | Hitung massal hak awal periode untuk seluruh pegawai |
| `POST` | `/leave-balances/periods/:id/close` | `leave_balances.manage` | Tutup periode dan carry over (`dry_run=true` default) |
| `POST` | `/leave-balances/periods/:id/reconcile` | `leave_balances.manage` | Rekonsiliasi cache vs ledger (`dry_run=true` default) |
| `POST` | `/holidays/:id/apply-joint-leave-deduction` | `holidays.manage` + `leave_balances.manage` | Eksekusi debit cuti bersama (idempoten) |

---

## (d) Langkah Uji Manual

1. **Jalankan Perintah Manual Tutup Periode (Dry-Run)**:
   ```bash
   npm run leave:close-period
   ```
   *Hasil*: Menampilkan pratinjau kalkulasi carry over periode 2026/2027 ke 2027/2028 dengan batas 6 hari dan kedaluwarsa 2027-09-30 tanpa mengubah database.

2. **Jalankan Rekonsiliasi Saldo (Dry-Run)**:
   ```bash
   npm run leave:reconcile
   ```
   *Hasil*: Memeriksa 12 saldo pegawai terhadap seluruh mutasi `leave_ledger_entries` dan melaporkan `0 discrepancies found`.

3. **Cek Saldo Mandiri Pegawai**:
   ```bash
   curl -H "Authorization: Bearer <GURU_TOKEN>" http://localhost:3000/api/v1/kepegawaian/leave-balances/my
   ```
   *Hasil*: `{ success: true, data: { employee_id: 3, granted: 12, available: 12, ... } }`.

4. **Cek IDOR Proteksi Siswa**:
   ```bash
   curl -H "Authorization: Bearer <SISWA_TOKEN>" http://localhost:3000/api/v1/kepegawaian/leave-balances/my
   ```
   *Hasil*: Status 403 `{ success: false, errors: [{ code: 'ACTOR_NOT_EMPLOYEE' }] }`.

---

## (e) Hasil Pengujian (Automated Tests)

Perintah: `node apps/api-backend/src/modules/kepegawaian/leave/scripts/run_all_leave_tests.js`
Total Test Suites: **10 / 10 Lulus (100%)**

- `tahap1_foundation.test.js`: ✅ PASS
- `tahap1_integration.test.js`: ✅ PASS
- `tahap2_holidays_foundation.test.js`: ✅ PASS
- `tahap2_holidays_integration.test.js`: ✅ PASS
- `tahap4_master_types_foundation.test.js`: ✅ PASS
- `tahap4_master_types_integration.test.js`: ✅ PASS
- `durationCalculator.test.js`: ✅ PASS (21 kasus T1–T21)
- `tahap6_duration_integration.test.js`: ✅ PASS
- `entitlementCalculator.test.js`: ✅ PASS (11 kasus B1–B5, Invarian Ledger)
- `tahap7_ledger_integration.test.js`: ✅ PASS (10 subtests: B1–B10, Concurrency Lock, Joint Leave Debit, Expiry, Idempotency, Reconcile)

---

## (f) Deviasi Desain

- Tidak ada (Tahap 7 berfokus 100% pada backend engine, ledger, dan API; UI Saldo Cuti akan diimplementasikan pada Tahap 8).

---

## (g) KEPUTUSAN OTOMATIS & Temuan di Luar Lingkup

### KEPUTUSAN OTOMATIS:
1. **Pencegahan Cross-Database Join pada Ledger**:
   - *Masalah*: Query awal pada `getLedgerEntries` mencoba `leftJoin` ke tabel `users` untuk mengambil nama pembuat transaksi. Namun, tabel `users` berada di database `core_dev`, sedangkan ledger di `kepegawaian_dev`.
   - *Pilihan*: Menghapus cross-DB join SQL sesuai aturan AGENTS.md §1 dan mengambil ID user / metadata secara in-process.
   - *Alasan*: Menjaga arsitektur multi-database terisolasi dan mencegah error SQL MariaDB.
   - *Cara Membalik*: Jika nama pembuat transaksi diperlukan di UI, resolusi dilakukan di service layer dengan query batch ke `coreDb('users')`.

2. **Normalisasi Objek Tanggal pada Guard Lock Presensi**:
   - *Masalah*: Driver `mysql2` pada Knex dapat mengembalikan kolom bertipe `DATE` sebagai objek `Date` JavaScript atau string.
   - *Pilihan*: Membuat helper `isAttendancePeriodLocked` yang menormalisasi input tanggal (baik `Date` maupun `string YYYY-MM-DD`).
   - *Alasan*: Mencegah `TypeError: dateStr.split is not a function` pada lingkungan atau driver yang berbeda.

### Temuan di Luar Lingkup:
- UI Halaman Saldo Cuti & Penyesuaian HRD akan dikerjakan pada Tahap 8.
- Pengajuan Cuti (Leave Requests Flow & Approval Steps) akan dikerjakan pada Tahap 9.
