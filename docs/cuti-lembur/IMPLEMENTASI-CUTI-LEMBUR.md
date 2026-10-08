# Dokumentasi Teknis & Panduan Implementasi: Manajemen Cuti, Izin & Lembur
**Sistem Manajemen Sekolah Terintegrasi Yayasan Aldepos (Core Aldepos)**  
**Modul:** Kepegawaian (HRIS)  
**Status:** Implementasi Lengkap (Tahap 0 - 17 Selesai)  
**Terakhir Diperbarui:** 2026-10-08  

---

## 1. Arsitektur Modul

Modul Cuti, Izin & Lembur dirancang mengikuti prinsip modular monolith dengan basis database terpisah (*single database per module*), tanpa relasi database atau join lintas modul ke Core atau Akademik.

```
+-----------------------------------------------------------------------------------+
|                              Portal Guru & Pegawai                                |
| (Ajukan Cuti/Izin, Riwayat Cuti, Ajukan/Klaim Lembur, Unduh Lampiran Surat Tugas)  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ (REST API / JWT Auth)
+-----------------------------------------------------------------------------------+
|                        Core Portal - HRD / Kepala Sekolah                         |
| (Manajemen Cuti & Lembur: Rekapitulasi, Kalender Matriks, Persetujuan Multi-Step, |
|       Kebijakan Saldo & Ledger, Hari Libur & Cuti Bersama, Ekspor Laporan)        |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                 API Backend (apps/api-backend/src/modules/kepegawaian)             |
|                                                                                   |
|  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                 |
|  │  leaveService    │  │  overtimeService │  │leaveLedgerService│                 |
|  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                 |
|           │                     │                     │                           |
|           ▼                     ▼                     ▼                           |
|  ┌──────────────────────────────────────────────────────────────┐                 |
|  │                 Pure Engines (Node:test verifiable)          │                 |
|  │  - durationCalculator.js       - approvalEngine.js           │                 |
|  │  - entitlementCalculator.js    - overtimeEngine.js           │                 |
|  │  - calendarReportEngine.js     - payrollFeedEngine.js        │                 |
|  │  - attendanceLeaveMapper.js    - dateHelper.js               │                 |
|  └──────────────────────────────────────────────────────────────┘                 |
+───────────────────────────────────────────────────────────────────────────────────+
                                         │ (Knex Parameterized Queries)
                                         ▼
+-----------------------------------------------------------------------------------+
|                         MariaDB (Database: kepegawaian_dev)                       |
| (leave_types, holidays, leave_balance_policies, leave_balance_periods,            |
|  employee_leave_balances, leave_ledger_entries, employee_leave_requests,          |
|  approval_steps, approval_delegations, employee_overtimes,                        |
|  overtime_rate_policies, overtime_multiplier_tiers, leave_audit_logs)            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Struktur Tabel Database & Skema

1. **`leave_types`**: Master jenis cuti dan izin (kategori: `annual`, `sick`, `permit`, `special`, `unpaid`, `official`, `other`). Menampung kuota default, jenis hari hitung (`work_days` / `calendar_days`), potongan saldo (`deducts_balance`), aturan lampiran, dan persentase penggajian (`payroll_pay_percent`).
2. **`holidays`**: Master hari libur nasional, cuti bersama, dan libur khusus yayasan/sekolah. Mendukung sinkronisasi ke kalender akademik dan flag pemotongan cuti tahunan (`deducts_annual_leave`).
3. **`leave_balance_policies` & `leave_balance_periods`**: Konfigurasi saldo cuti tahunan (prorasi, carry over, batas minus, rollover) dan periode aktif per tahun ajaran/kalender.
4. **`employee_leave_balances`**: Tabel cache saldo pegawai (`granted`, `carry_in`, `adjusted`, `used`, `reserved`, `expired`, `available`).
5. **`leave_ledger_entries`**: Buku besar mutasi saldo append-only (`grant`, `reserve`, `commit`, `release`, `refund`, `adjust`, `carry_in`, `expire`, `joint_leave_debit`).
6. **`employee_leave_requests`**: Data pengajuan permohonan cuti/izin pegawai.
7. **`approval_steps`**: Jejak langkah approval multi-level (Atasan Langsung, Kepala Sekolah / Pimpinan Unit, HRD Final) dengan dukungan delegasi dan bypass berizin.
8. **`approval_delegations`**: Pendelegasian wewenang persetujuan cuti antar pegawai dengan masa berlaku eksplisit.
9. **`employee_overtimes`**: Pengajuan dan penugasan lembur (sumber: `requested` mandiri vs `assigned` HRD / SPK).
10. **`overtime_rate_policies` & `overtime_multiplier_tiers`**: Aturan perhitungan lembur (flat rate vs formula Depnaker 1/173, batas harian/mingguan/bulanan, tier pengali hari kerja, akhir pekan, dan hari libur nasional).
11. **`leave_audit_logs`**: Catatan jejak audit komprehensif untuk setiap aksi pengajuan, approval, penolakan, pembatalan, dan penyesuaian saldo.

---

## 3. Matriks Hak Akses & Permission

| Permission Key | Deskripsi | Target Pengguna |
|---|---|---|
| `kepegawaian.leave_requests.read` | Melihat data permohonan cuti dan matriks kalender | HRD, Kepala Sekolah |
| `kepegawaian.leave_requests.manage` | Memproses permohonan, setuju/tolak massal, kelola master | HRD, Admin Kepegawaian |
| `kepegawaian.leave_requests.override` | Melakukan bypass approval atau klasifikasi ulang permohonan | Super Admin / Kadiv HRD |
| `kepegawaian.leave_balances.read` | Melihat daftar saldo dan mutasi ledger pegawai | HRD, Pimpinan Unit |
| `kepegawaian.leave_balances.manage` | Penyesuaian saldo manual, alokasi massal, penutupan periode | HRD Pusat |
| `kepegawaian.holidays.manage` | Tambah/ubah/hapus hari libur & cuti bersama | HRD, Admin Kalender |
| `kepegawaian.leave_types.manage` | Konfigurasi master jenis cuti & ambang batas ketidakhadiran | HRD Pusat |
| `kepegawaian.overtimes.manage` | Penugasan, persetujuan, dan rekonsiliasi lembur | HRD, Supervisor |
| `kepegawaian.overtime_settings.manage` | Konfigurasi tarif & pengali lembur yayasan/unit | HRD Pusat, Keuangan |
| `kepegawaian.leave_reports.read` | Mengakses ringkasan laporan, tren analitik, dan feed payroll | HRD, Akuntansi/Payroll |

---

## 4. Daftar Endpoint API Lengkap

### A. Master & Pengaturan
- `GET /api/kepegawaian/leave-types` — Daftar jenis cuti aktif & filterable.
- `POST /api/kepegawaian/leave-types` — Buat jenis cuti baru.
- `PUT /api/kepegawaian/leave-types/:id` — Perbarui jenis cuti.
- `PATCH /api/kepegawaian/leave-types/:id/active` — Aktif/nonaktifkan jenis cuti.
- `GET /api/kepegawaian/leave-settings` — Pengaturan global modul cuti.
- `PUT /api/kepegawaian/leave-settings` — Simpan pengaturan global cuti.
- `GET /api/kepegawaian/absence-thresholds` — Pengaturan batas alpa/sakit per semester.
- `PUT /api/kepegawaian/absence-thresholds` — Simpan batas alpa/sakit.

### B. Hari Libur (Holidays)
- `GET /api/kepegawaian/holidays` — Daftar hari libur terdaftar.
- `GET /api/kepegawaian/holidays/effective` — Hari libur efektif pada rentang tanggal tertentu.
- `POST /api/kepegawaian/holidays` — Buat hari libur baru.
- `PUT /api/kepegawaian/holidays/:id` — Ubah hari libur.
- `DELETE /api/kepegawaian/holidays/:id` — Hapus hari libur.
- `POST /api/kepegawaian/holidays/import` — Impor daftar hari libur dari format JSON/SKB.
- `POST /api/kepegawaian/holidays/:id/apply-joint-leave-deduction` — Terapkan pemotongan cuti bersama massal ke saldo pegawai aktif.

### C. Saldo Cuti & Ledger
- `GET /api/kepegawaian/leave-balances/my` — Saldo cuti pegawai login.
- `GET /api/kepegawaian/leave-balances` — Rekap saldo seluruh pegawai (filter unit & periode).
- `GET /api/kepegawaian/leave-balances/:employeeId/ledger` — Riwayat buku besar mutasi saldo pegawai.
- `POST /api/kepegawaian/leave-balances/adjust` — Penyesuaian saldo manual (+/-) oleh HRD.
- `POST /api/kepegawaian/leave-balances/bulk-assign` — Hitung & tetapkan hak cuti tahunan awal periode.
- `POST /api/kepegawaian/leave-balances/periods/:id/close` — Tutup periode dan jalankan carry-over sisa cuti.
- `POST /api/kepegawaian/leave-balances/periods/:id/reconcile` — Rekonsiliasi integritas ledger terhadap tabel cache saldo.

### D. Pengajuan Permohonan Cuti & Izin
- `POST /api/kepegawaian/leave-requests/preview-duration` — Hitung durasi hari kerja & breakdown kalender secara real-time.
- `POST /api/kepegawaian/leave-requests/preview` — Validasi lengkap permohonan sebelum submit (cek kuota, tumpang tindih, dokumen).
- `POST /api/kepegawaian/leave-requests` — Submit pengajuan cuti (oleh pegawai atau atas nama oleh HR).
- `GET /api/kepegawaian/leave-requests/my` — Riwayat pengajuan cuti pegawai yang login.
- `GET /api/kepegawaian/leave-requests/inbox` — Daftar persetujuan yang menunggu tindakan dari user login.
- `GET /api/kepegawaian/leave-requests/needs-review` — Daftar pengajuan yang memerlukan review HRD.
- `GET /api/kepegawaian/leave-requests` — Daftar seluruh pengajuan cuti.
- `GET /api/kepegawaian/leave-requests/:id` — Detail pengajuan cuti & riwayat step approval.
- `PATCH /api/kepegawaian/leave-requests/:id/approve` — Setujui pengajuan cuti.
- `PATCH /api/kepegawaian/leave-requests/:id/reject` — Tolak pengajuan cuti.
- `PATCH /api/kepegawaian/leave-requests/:id/request-revision` — Minta revisi pengajuan ke pemohon.
- `PATCH /api/kepegawaian/leave-requests/:id/resubmit` — Kirim ulang pengajuan yang telah direvisi.
- `PATCH /api/kepegawaian/leave-requests/:id/cancel` — Batalkan pengajuan cuti (otomatis melepaskan reserved/mengembalikan saldo committed).
- `POST /api/kepegawaian/leave-requests/bulk-approve` — Persetujuan massal pengajuan cuti.
- `POST /api/kepegawaian/leave-requests/bulk-reject` — Penolakan massal pengajuan cuti.

### E. Lembur (Overtime)
- `GET /api/kepegawaian/overtimes/my` — Riwayat lembur pegawai login.
- `GET /api/kepegawaian/overtimes` — Daftar pengajuan & penugasan lembur.
- `POST /api/kepegawaian/overtimes/preview` — Pratinjau estimasi upah & breakdown pengali jam lembur.
- `POST /api/kepegawaian/overtimes` — Submit pengajuan klaim lembur / penugasan lembur.
- `POST /api/kepegawaian/overtimes/bulk` — Penugasan lembur massal (SPK).
- `PATCH /api/kepegawaian/overtimes/:id/approve` — Setujui lembur.
- `PATCH /api/kepegawaian/overtimes/:id/reject` — Tolak lembur.
- `PATCH /api/kepegawaian/overtimes/:id/cancel` — Batalkan lembur.
- `PATCH /api/kepegawaian/overtimes/:id/reconcile` — Rekonsiliasi jam riil lembur vs presensi aktual.
- `POST /api/kepegawaian/overtimes/bulk-approve` — Persetujuan massal lembur.

### F. Matriks Kalender, Laporan & Payroll Feed
- `GET /api/kepegawaian/leave-requests/calendar-matrix` — Matriks kalender cuti seluruh staf per bulan.
- `GET /api/kepegawaian/leave-requests/reports/summary` — Statistik KPI cuti & lembur.
- `GET /api/kepegawaian/leave-requests/reports/by-type` — Distribusi cuti per jenis & kategori.
- `GET /api/kepegawaian/leave-requests/reports/trend` — Tren pengajuan cuti bulanan.
- `GET /api/kepegawaian/leave-requests/reports/top` — Top pegawai dengan cuti terbanyak.
- `GET /api/kepegawaian/leave-requests/reports/recap` — Rekapitulasi per pegawai untuk periode tertentu.
- `GET /api/kepegawaian/leave-requests/reports/export` — Ekspor data laporan (CSV/Excel).
- `GET /api/kepegawaian/payroll-feed` — Feed data cuti & lembur deterministik dengan snapshot hash untuk modul Penggajian (Payroll).

---

## 5. Panduan Operasional HRD

### Cara Menambah Jenis Cuti Baru
1. Buka halaman **Manajemen Cuti & Lembur** > Tab **Pengaturan & Master** > Sub-tab **Jenis Cuti**.
2. Klik tombol **Tambah Jenis Cuti**.
3. Isi informasi:
   - **Nama Cuti** (misal: *Cuti Khusus Pernikahan Anak*).
   - **Kode** (snake_case, misal: `cuti_nikah_anak`).
   - **Kategori**: Pilih salah satu dari `annual`, `sick`, `permit`, `special`, `unpaid`, `official`, `other`.
   - **Kuota Hari Default**: Masukkan angka hari kerja/kalender.
   - **Jenis Hari**: Pilih *Hari Kerja* (work_days) atau *Hari Kalender* (calendar_days).
   - **Potong Saldo Tahunan**: Centang jika memotong saldo hak cuti tahunan pegawai.
   - **Persentase Penggajian**: Masukkan 100 untuk cuti berbayar penuh, 0 untuk cuti di luar tanggungan (unpaid), atau biarkan kosong bila bergantung pada kebijakan kasuistik.
4. Klik **Simpan**.

### Cara Menutup Periode Saldo & Menjalankan Rollover (Carry-Over)
1. Buka Tab **Saldo & Ledger** > Klik tombol **Tutup Periode**.
2. Sistem akan menampilkan dialog simulasi (*Dry-Run*) yang menghitung:
   - Sisa saldo cuti tiap pegawai pada periode berjalan.
   - Jumlah hari yang memenuhi syarat carry-over ke periode baru (berdasarkan batas maksimum kebijakan, misal maks 6 hari).
   - Tanggal kedaluwarsa hak carry-over (misal 6 bulan sejak periode baru dibuka).
3. Tinjau angka simulasi. Jika sesuai, klik **Konfirmasi Tutup Periode & Rollover**.
4. Database akan membuat record periode baru (`open`), menutup periode lama (`closed`), dan mencatat mutasi `carry_in` ke buku besar ledger secara otomatis.

---

## 6. Verifikasi Integritas Data & Rekonsiliasi Ledger

Sistem menyediakan mekanisme verifikasi invarian buku besar (*append-only ledger*):
$$\text{available} = \text{granted} + \text{carry\_in} + \text{adjusted} - \text{used} - \text{reserved} - \text{expired}$$

Untuk memeriksa atau memulihkan konsistensi data secara berkala:
- Jalankan pemeriksaan melalui UI: Tab **Saldo & Ledger** > Klik tombol **Rekonsiliasi Saldo**.
- Atau jalankan via script backend:
  ```bash
  node -e "const svc = require('./src/modules/kepegawaian/leave/leaveLedgerService'); svc.getActivePeriod(1).then(p => svc.reconcileBalances(p.id, { dry_run: false })).then(console.log);"
  ```
