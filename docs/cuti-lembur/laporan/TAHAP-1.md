# LAPORAN IMPLEMENTASI — MODUL CUTI, IZIN & LEMBUR (TAHAP 1)

Status: Selesai | Branch: `feature/kepegawaian-cuti-lembur` | Tanggal: 2026-10-07

---

## (a) File Dibuat & Diubah

### Backend (`apps/api-backend`)
- **Migrasi Knex Database Kepegawaian (`db/migrations/kepegawaian/`):**
  - `20261008000001_leave_foundation_and_audit.js`: Kolom baru pada `employees` (`join_date`, `employment_status`, `supervisor_id`, `schedule_variant`), tabel `leave_audit_logs`, dan `leave_module_settings`.
  - `20261008000002_holidays_and_targets.js`: Tabel `holidays` dan `holiday_schedule_targets` (kalender libur per unit/sasaran).
  - `20261008000003_leave_types_profiles_approvers_delegations.js`: 18 master jenis cuti/izin (`leave_types`), 3 profil alur persetujuan (`approval_profiles`), `unit_approvers`, dan `delegations`.
  - `20261008000004_leave_balance_policies_rules_periods.js`: `leave_balance_policies`, `leave_entitlement_rules`, dan `leave_balance_periods` (2026/2027 & 2027/2028).
  - `20261008000005_leave_balances_and_ledger.js`: Cache kuota `employee_leave_balances` dan buku besar mutasi `leave_ledger_entries` (append-only ledger).
  - `20261008000006_expand_leave_requests_and_approval_steps.js`: Ekspansi kolom `employee_leave_requests` dan pembuatan tabel `approval_steps`.
  - `20261008000007_expand_overtimes_and_policies.js`: `overtime_rate_policies`, `overtime_multiplier_tiers`, dan ekspansi `employee_overtimes`.
  - `20261008000008_absence_thresholds.js`: Tabel `absence_thresholds` untuk penanganan alpa beruntun.
  - `20261008000009_add_leave_request_id_to_employee_attendances.js`: Foreign key reference `leave_request_id` di `employee_attendances`.
- **Migrasi Database Core (`db/migrations/core/`):**
  - `20261008000001_seed_leave_and_overtime_permissions.js`: Seed permissions `kepegawaian.leave.*`, `kepegawaian.overtime.*`, `kepegawaian.holiday.*`, dan mapping role HRD/Admin/Kepala Sekolah/Guru.
- **Pure Engine (Pure Functions tanpa dependensi DB/Jam Global):**
  - `src/modules/kepegawaian/leave/dateHelper.js`: Helper tanggal WIB `todayWIB()`, normalisasi string `YYYY-MM-DD` dan format date.
  - `src/modules/kepegawaian/leave/durationCalculator.js`: Kalkulator durasi pengajuan cuti (hari kerja vs hari kalender, pemotongan libur unit, setengah hari AM/PM, flexitime).
  - `src/modules/kepegawaian/leave/durationCalculator.test.js`: 22 test suite (T1–T21) `node:test`.
  - `src/modules/kepegawaian/leave/entitlementCalculator.js`: Mesin perhitungan hak kuota awal, prorata bulanan cut-off tanggal 15, dan rollover/carry-forward kadaluarsa.
  - `src/modules/kepegawaian/leave/entitlementCalculator.test.js`: 8 test suite (B1–B10) `node:test`.
- **Service Layer & Controller Backend:**
  - `src/modules/kepegawaian/leave/holidayService.js`: Service kalender libur nasional, libur yayasan, dan cuti bersama.
  - `src/modules/kepegawaian/leave/leaveTypeService.js`: Service master jenis cuti dan alur profil.
  - `src/modules/kepegawaian/leave/leaveLedgerService.js`: Service saldo kuota dan mutasi ledger append-only berantai.
  - `src/modules/kepegawaian/leave/leaveApprovalService.js`: Service alur persetujuan bertingkat (Atasan Langsung -> Kepala Sekolah -> HRD).
  - `src/modules/kepegawaian/leave/overtimeService.js`: Service pengajuan, persetujuan, dan rekonsiliasi lembur dengan mesin tarif berjenjang.
  - `src/modules/kepegawaian/leave/leaveService.js`: Service terintegrasi pengajuan cuti/izin/dinas, preview durasi, sinkronisasi status presensi harian (`employee_attendances`), dan payroll feed.
  - `src/modules/kepegawaian/leave/controller.js`: Request handler Express dengan validasi skema Zod.
  - `src/modules/kepegawaian/leave/routes.js`: Route definition Express dengan auth middleware dan guard permission.
  - `src/modules/kepegawaian/leave/leave.integration.test.js`: 5 integration test suite.
  - `src/app.js`: Pendaftaran route `/kepegawaian/leave`, `/kepegawaian/overtimes`, `/kepegawaian/holidays`, `/kepegawaian/leave-types`.
- **Data Uji:**
  - `src/modules/kepegawaian/leave/seeds/seed_data_uji_hrd.js`: Seed data uji berlabel `[DATA_UJI_HRD]` pada database dev.

### Frontend Portal (`apps/core-portal`)
- `src/apps/kepegawaian/pages/CutiLembur.jsx`: Komponen orkestrator utama halaman Manajemen Cuti, Izin & Lembur dengan 6 sub-tab navigasi.
- `src/apps/kepegawaian/pages/cuti-lembur/LeaveRequestsTab.jsx`: Tab pengajuan cuti & izin lengkap dengan KPI cards, FilterBar, DataTable, Action Drawer, dan Modal Approval/Reject/Cancel.
- `src/apps/kepegawaian/pages/cuti-lembur/LeaveBalancesTab.jsx`: Tab manajemen saldo & kuota pegawai dengan rincian buku besar mutasi (Ledger Drawer) dan modal Penyesuaian Kuota (Adjustment).
- `src/apps/kepegawaian/pages/cuti-lembur/OvertimeTab.jsx`: Tab lembur dengan kalkulasi estimasi upah, multi-tier multiplier, status persetujuan, dan rekonsiliasi presensi aktual.
- `src/apps/kepegawaian/pages/cuti-lembur/HolidaysTab.jsx`: Tab kalender hari libur nasional & cuti bersama dengan penargetan jadwal per satuan pendidikan.
- `src/apps/kepegawaian/pages/cuti-lembur/LeaveSettingsTab.jsx`: Tab master jenis cuti dan konfigurasi alur approval.
- `src/apps/kepegawaian/pages/cuti-lembur/LeaveReportsTab.jsx`: Tab analitik & laporan cuti/lembur dengan grafik SVG donut & bar chart native.
- `src/apps/kepegawaian/pages/cuti-lembur/CreateLeaveModal.jsx`: Modal pengajuan cuti dengan preview kalkulasi hari kerja otomatis dan pengecekan saldo seketika.
- `src/apps/kepegawaian/pages/cuti-lembur/CreateOvertimeModal.jsx`: Modal penugasan / pengajuan lembur dengan estimasi tarif.

---

## (b) Migrasi & SQL yang Dijalankan

### Target Database: `127.0.0.1:3306` (Local MariaDB)
1. **`kepegawaian_dev`**:
   - `20261008000001_leave_foundation_and_audit.js`
   - `20261008000002_holidays_and_targets.js`
   - `20261008000003_leave_types_profiles_approvers_delegations.js`
   - `20261008000004_leave_balance_policies_rules_periods.js`
   - `20261008000005_leave_balances_and_ledger.js`
   - `20261008000006_expand_leave_requests_and_approval_steps.js`
   - `20261008000007_expand_overtimes_and_policies.js`
   - `20261008000008_absence_thresholds.js`
   - `20261008000009_add_leave_request_id_to_employee_attendances.js`
2. **`core_dev`**:
   - `20261008000001_seed_leave_and_overtime_permissions.js`

---

## (c) Endpoint Baru & Berubah

| Method | Path | Permission Required | Keterangan |
|---|---|---|---|
| `GET` | `/kepegawaian/leave/types` | Authenticated | Daftar master jenis cuti aktif & kuota default |
| `POST` | `/kepegawaian/leave/preview-duration` | Authenticated | Preview kalkulasi hari kerja & tanggal selesai |
| `GET` | `/kepegawaian/leave/requests` | `kepegawaian.leave.read` | HRD daftar semua pengajuan cuti (filter unit/status/tanggal) |
| `POST` | `/kepegawaian/leave/requests` | `kepegawaian.leave.create` | Buat pengajuan cuti baru dengan validasi saldo & durasi |
| `GET` | `/kepegawaian/leave/requests/:id` | Authenticated | Detail pengajuan cuti beserta riwayat alur persetujuan |
| `POST` | `/kepegawaian/leave/requests/:id/approve` | `kepegawaian.leave.approve` | Setujui langkah alur persetujuan cuti |
| `POST` | `/kepegawaian/leave/requests/:id/reject` | `kepegawaian.leave.approve` | Tolak pengajuan cuti (wajib alasan penolakan) |
| `POST` | `/kepegawaian/leave/requests/:id/cancel` | Authenticated | Pembatalan pengajuan (mengembalikan saldo via ledger `cancellation`) |
| `GET` | `/kepegawaian/leave/balances` | `kepegawaian.leave.read` | Rangkuman saldo cuti semua pegawai |
| `GET` | `/kepegawaian/leave/balances/employee/:employeeId` | Authenticated | Saldo cuti spesifik pegawai & per jenis cuti |
| `GET` | `/kepegawaian/leave/ledger` | `kepegawaian.leave.read` | Buku besar mutasi saldo (append-only) |
| `POST` | `/kepegawaian/leave/adjust-balance` | `kepegawaian.leave.adjust` | Penyesuaian saldo manual oleh HRD dengan catatan audit log |
| `GET` | `/kepegawaian/overtimes` | `kepegawaian.overtime.read` | HRD daftar pengajuan & realisasi lembur |
| `POST` | `/kepegawaian/overtimes` | `kepegawaian.overtime.create` | Pengajuan lembur baru |
| `POST` | `/kepegawaian/overtimes/:id/approve` | `kepegawaian.overtime.approve` | Persetujuan lembur |
| `POST` | `/kepegawaian/overtimes/:id/reconcile` | `kepegawaian.overtime.reconcile`| Rekonsiliasi jam aktual presensi & perhitungan nominal upah |
| `GET` | `/kepegawaian/holidays` | `kepegawaian.holiday.read` | Kalender hari libur & cuti bersama |
| `POST` | `/kepegawaian/holidays` | `kepegawaian.holiday.manage` | Tambah hari libur baru & target jadwal |
| `GET` | `/kepegawaian/leave/payroll-feed` | `kepegawaian.leave.read` | Kontrak data integrasi ke modul Payroll (potongan cuti & upah lembur) |

---

## (d) Langkah Uji Manual

1. **Uji Pengajuan & Persetujuan Cuti:**
   - Buka portal menu **Kepegawaian** -> **Cuti & Lembur**.
   - Klik tombol **+ Ajukan Cuti/Izin**.
   - Pilih Pegawai (misal `Budi Santoso`), Jenis `Cuti Tahunan`, Rentang Tanggal `12 Okt 2026` s/d `14 Okt 2026` (durasi terhitung otomatis 3 hari kerja).
   - Klik **Kirim Pengajuan**. Status pengajuan akan berada pada `submitted` atau `in_review`.
   - Buka Detail Drawer, klik **Setujui** sebagai Approver. Saldo cuti terpotong 3 hari di tab **Saldo & Kuota**, dan entri presensi `employee_attendances` otomatis sinkron berstatus `leave`.
2. **Uji Penyesuaian Saldo (Balance Adjustment):**
   - Masuk ke tab **Saldo & Kuota**.
   - Klik tombol **Penyesuaian Kuota** pada baris pegawai.
   - Masukkan delta `+2.0`, pilih alasan `Kompensasi Tugas Luar Kota`.
   - Simpan -> Buka Drawer Riwayat Mutasi (Ledger) -> Terlihat entri `adjustment` kredit `+2.0` dan saldo akhir terupdate.
3. **Uji Pengajuan & Rekonsiliasi Lembur:**
   - Masuk ke tab **Lembur**.
   - Klik **+ Buat Surat Lembur**, pilih pegawai, tanggal `10 Okt 2026` (Hari Libur), jam 08:00 - 13:00 (5 jam).
   - Simpan -> Klik **Setujui Lembur**.
   - Klik **Rekonsiliasi Lembur**, sesuaikan jam aktual -> Nominal upah terhitung otomatis berdasarkan tier pengali libur (2.0x dan 3.0x).
4. **Uji Kalender Libur:**
   - Masuk ke tab **Kalender Libur**.
   - Tambah Libur Khusus Yayasan tanggal `15 Okt 2026` dengan target Satuan Pendidikan SMP.
   - Ajukan cuti baru melewati tanggal 15 Okt -> Kalkulator otomatis tidak menghitung tanggal 15 Okt sebagai hari kerja.

---

## (e) Hasil Pengujian

- **Unit & Integration Test Suite (`node --test apps/api-backend/src/modules/kepegawaian/leave/*.test.js`):**
  - Total Test: **35 Test Cases**
  - Passed: **35 (100%)**
  - Failed: **0**
  - Rincian:
    - `durationCalculator.test.js`: 22 test (T1–T21) passed.
    - `entitlementCalculator.test.js`: 8 test (B1–B10) passed.
    - `leave.integration.test.js`: 5 integration test passed.
- **Frontend Portal Build (`npm run build:portal`):**
  - Status: **Berhasil (Code 0)**
  - Output Chunk: `dist/assets/CutiLembur-77Qwkj8k.js` (83.45 kB gzip: 14.13 kB).

---

## (f) Deviasi Desain

- **Visual Fidelity:** Seluruh layout, drawer, status pill, indikator kuota, dan tabel diporting dari spesifikasi visual `DESIGN.md` dan `code.html` menggunakan Tailwind CSS token yang konsisten dengan sistem Enterprise Aldepos.
- **Charts:** Menggunakan visualisasi grafik SVG/CSS native (Donut chart komposisi cuti dan horizontal bar chart tren lembur) tanpa menambah dependensi external chart library (sesuai Aturan Wajib 1).
- **Semua nilai placeholder di `code.html` telah diganti dengan data konfigurasi dinamis dari database.**

---

## (g) KEPUTUSAN OTOMATIS & Catatan

### KEPUTUSAN OTOMATIS
1. **Normalisasi Objek `Date` dari Knex MySQL:** Driver `mysql2` mengembalikan tipe `DATE` sebagai JavaScript `Date` objek UTC. Ditambahkan normalisasi otomatis di `dateHelper.js` agar selalu diparse sebagai string `YYYY-MM-DD` dalam zona waktu `Asia/Jakarta` (`todayWIB`).
2. **Schema Audit Log Reason:** Kolom alasan pada tabel `leave_audit_logs` disesuaikan menjadi `reason` sesuai konsistensi audit log presensi.
3. **Multi-tier Lembur Indonesia (Depnaker Standard):** Multiplier lembur hari kerja diimplementasikan 1.5x jam pertama dan 2.0x jam berikutnya; hari libur 2.0x 7 jam pertama dan 3.0x jam ke-8 dst, dengan tarif per jam diambil dari `hourly_rate` kebijakan.
4. **Kompatibilitas Portal Guru:** Endpoint lama `GET /kepegawaian/leave-requests` dan `POST /kepegawaian/leave-requests` tetap didukung dengan proxy cerdas ke service baru tanpa merusak kontrak sebelumnya.

### Temuan di Luar Lingkup
- Pengaturan notifikasi WhatsApp/Email ke pemohon cuti ketika disetujui/ditolak perlu dihubungkan dengan modul komunikasi saat modul tersebut dibuat.
- Penguncian periode cuti tahunan masa lampau dapat diintegrasikan dengan jadwal cron rollover otomatis di akhir periode akademik.

---
Dokumen ini dibuat otomatis sebagai bagian dari rangkaian penyelesaian implementasi Manajemen Cuti, Izin & Lembur Core Aldepos.
