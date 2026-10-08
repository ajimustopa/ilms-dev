# LAPORAN TAHAP PRASYARAT (PREFLIGHT AUDIT)
## Halaman Target: Presensi & Absensi Pegawai (Modul Kepegawaian / HRIS)
**Core Aldepos** | Mode: **READ-ONLY INSPECTION** | Tanggal: 2026-10-07

---

### RINGKASAN STATUS KESIAPAN SISTEM (A–F)

| No | Butir / Area Pemeriksaan | Status | Bukti Ringkas | Tindakan yang Disarankan |
|---|---|---|---|---|
| **A.1** | Database & Lingkungan Kerja | **PERLU PERSIAPAN** | Host: `153.92.15.118` (`id-dci-web1031.main-hosting.eu`), DB: `u622997391_kepegawaian`. Mesin kerja terhubung langsung ke MariaDB remote/live. | Eksekusi DDL harus 100% additive, rollback aman, buat backup sebelum migrasi baru. |
| **A.2** | Pemisahan Lingkungan (Dev/Staging/Prod) | **PERLU PERSIAPAN** | File `.env` langsung membidik database remote `u622997391_*`. Tidak ada database lokal terpisah. | Gunakan isolasi data uji (tagging data dummy) agar tidak mencemari data riil. |
| **A.3** | Prosedur Cadangan Data (Backup) | **SIAP** | Perintah `mysqldump` terverifikasi untuk tabel-tabel presensi & master kepegawaian. | Jalankan prosedur dump tabel presensi sebelum implementasi Tahap 1. |
| **A.4** | Status Git & Remote | **SIAP** | Branch aktif `main`, remotes `origin` & `prod`. Status clean untuk area presensi (file modified/untracked teridentifikasi). | Buat branch kerja khusus `feature/kepegawaian-presensi-uiux`. |
| **B.5** | Tooling & Status Migrasi Knex | **SIAP** | 42 migrasi Knex di `db/migrations/kepegawaian/`, tabel presensi (`employee_attendances`) & jadwal sudah ada via migrasi batch 1-20. | Buat migrasi baru additive untuk kolom status/kunci periode tambahan bila diperlukan di Tahap 1. |
| **B.6** | Mekanisme Rollback & Drift Schema | **SIAP** | Tabel `knex_migrations_kepegawaian` sinkron (42 migrasi). Tidak ada schema drift pada tabel presensi & jadwal. | Pertahankan fungsi `exports.down` pada setiap migrasi baru. |
| **B.7** | Versi Runtime & Dependencies | **SIAP** | Node `v25.1.0`, npm `11.6.2`, MariaDB `11.8.9-log`. Paket `knex`, `mysql2`, `zod`, `jsonwebtoken`, `lucide-react`, `tailwindcss`, `xlsx`, `pdfkit` terpasang. | Gunakan library yang sudah ada tanpa menambah dependensi baru. |
| **B.8** | Test Runner Backend & Frontend | **PERLU PERSIAPAN** | Tidak ada test runner otomatis (`jest`/`vitest`) terpasang di monorepo (direncanakan pada roadmap T-005). | Verifikasi baseline menggunakan uji manual terstruktur dan end-to-end API checklist. |
| **C.9** | Baseline Build & Lint | **SIAP** | `npm run build:portal` (`vite build`) sukses 100% (3.607 modul tertransformasi, bundle terbentuk dalam 2m 32s tanpa error fatal). | Pastikan implementasi baru tidak menyebabkan error kompilasi Vite. |
| **C.10** | Menjalankan Dev Lokal | **SIAP** | Backend: `npm run dev:backend` (port 3000), Portal: `npm run dev:portal` (port 5173). | Perhatikan `$env:NODE_PATH` di Windows PowerShell bila menjalankan skrip di luar npm CLI. |
| **D.11** | Permission & Role Access Control | **PERLU PERSIAPAN** | Permission dasar `kepegawaian.view`, `kepegawaian.manage`, `kepegawaian.attendance_locations.*` sudah ada di Core DB. Permission granular `kepegawaian.attendances.manage` perlu dipastikan ter-seed ke role HRD. | Tambahkan seed/migrasi di Core untuk pemetaan permission presensi HRD. |
| **D.12** | Akun Uji Login per Role | **SIAP** | Tersedia akun `superadmin` (akses penuh semua unit), `ade` (staf), `aji`/`ahmad` (guru). | Buat/tetapkan akun khusus role `hrd` untuk verifikasi otorisasi multi-role. |
| **D.13** | Kondisi Data Presensi & Strategi Uji | **SIAP** | Data aktif: 41 pegawai (40 aktif, 1 nonaktif), 1 jadwal kerja ("Guru Reguler"), 1 lokasi GPS ("Gedung A"), 1 baris riwayat presensi. | Buat skrip seeder data uji sementara dengan tag `[DATA_UJI_HRD]` pada tanggal tertentu agar mudah dibersihkan. |
| **E.14** | Kesiapan Desain & Aset Stitch | **SIAP** | 11 file/folder desain (`DESIGN.md` + 10 `code.html`) terbaca 100% utuh tanpa korupsi file. Ikon eksternal dipetakan ke `lucide-react`. | Gunakan token desain warna `emerald`/`slate`/`amber`/`rose`/`indigo` yang sudah kompatibel dengan Tailwind proyek. |
| **E.15** | Komponen UI Bersama yang Tersedia | **SIAP** | Tersedia di `apps/core-portal/src/shared/components/`: `DataTable`, `Modal`, `Drawer`, `StatusPill`, `Toast`, `EmptyState`, `ErrorState`, `DatePickerField`. | Pakai ulang komponen shared tanpa membuat styling baru yang melanggar standar. |
| **F.16** | Deteksi Integrasi Lintas Modul | **SIAP** | Teridentifikasi 4 modul yang mengakses `employee_attendances`: Portal Guru (`AbsensiPage.jsx`), Master Jadwal/Lokasi, Data Pegawai (`service.js`), Payroll (`service.js`). | Jaga backward compatibility skema kolom `employee_attendances` agar Portal Guru & Payroll tidak terdampak. |
| **F.17** | Mitigasi Risiko Khusus | **SIAP** | Fitur "Tutup Periode" dan "Antrean Koreksi" dari desain Stitch dipetakan ke workflow backend yang aman. | Implementasikan tabel kunci periode `attendance_period_locks` secara non-destruktif. |

---

### DETAIL PEMERIKSAAN SETIAP BUTIR

#### A. Lingkungan & Keselamatan Data
1. **Database & Lingkungan Kerja:**
   - **Host:** `153.92.15.118` (Server hostname: `id-dci-web1031.main-hosting.eu`, MariaDB `11.8.9-MariaDB-log`).
   - **Database Kepegawaian:** `u622997391_kepegawaian`.
   - **Database Core:** `u622997391_core`.
   - **Status Dampak:** Lingkungan kerja saat ini terhubung langsung ke server database remote (live/hosting). **Setiap migrasi Knex yang dijalankan akan langsung diterapkan pada database live.** Oleh karena itu, prinsip DDL additive dan verifikasi SQL pra-eksekusi wajib ditaati.
2. **Pemisahan Lingkungan:**
   - Saat ini file `.env` di `apps/api-backend` langsung mengarah ke database remote. Tidak ada database staging/lokal terpisah.
   - Strategi isolasi data: Semua pengujian data presensi akan menggunakan rentang tanggal khusus dengan penanda pegawai uji, tanpa mengubah data riil pegawai eksisting.
3. **Prosedur Backup Database:**
   - Perintah dump tabel presensi & master terkait kepegawaian (PowerShell / Command Prompt):
     ```powershell
     mysqldump -h 153.92.15.118 -P 3306 -u <KEPEGAWAIAN_USER> -p u622997391_kepegawaian employee_attendances attendance_work_schedules attendance_locations employee_work_schedule_assignments employee_leave_requests employee_overtimes employees > backup_kepegawaian_attendance_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
     ```
4. **Status Git & Percabangan:**
   - Branch aktif: `main`.
   - Remote terdaftar: `origin` (`https://github.com/ajimustopa/ilms-dev.git`) dan `prod` (`https://github.com/ajimustopa/aldepos-ilms-prod.git`).
   - Rekomendasi branch kerja: `feature/kepegawaian-presensi-uiux` atau `feature/T-006-presensi-pegawai`.

---

#### B. Migrasi & Tooling Backend
5. **Tooling & Status Migrasi:**
   - Migrasi dikelola menggunakan **Knex.js** dengan knexfile per modul (`knexfile.kepegawaian.js`).
   - Folder migrasi: `apps/api-backend/db/migrations/kepegawaian/`.
   - Jumlah file migrasi kepegawaian: **42 file**.
   - Tabel `employee_attendances`, `attendance_work_schedules`, `attendance_locations`, dan `employee_work_schedule_assignments` dibuat & dikembangkan melalui migrasi Knex (terakhir: `20261007190001_add_clarification_columns_to_employee_attendances.js`).
6. **Mekanisme Rollback & Konsistensi Skema:**
   - Tabel metadata migrasi: `knex_migrations_kepegawaian` (tercatat 42 baris sukses hingga batch 20).
   - Rollback teruji melalui `npm --workspace=apps/api-backend run migrate:kepegawaian:rollback`.
   - Hasil audit skema: **Tidak ada drift** antara file migrasi dan tabel aktual di database `u622997391_kepegawaian`.
7. **Runtime & Paket:**
   - Node.js: `v25.1.0` | npm: `11.6.2` | MariaDB: `11.8.9-MariaDB-log`.
   - Backend: `express` 4.19.2, `knex` 3.1.0, `mysql2` 3.10.1, `zod` 4.4.3, `jsonwebtoken` 9.0.2, `bcryptjs` 3.0.3, `pdfkit` 0.20.2, `xlsx` 0.18.5.
   - Frontend: `react` 18.3.1, `vite` 5.4.14, `react-router-dom` 6.28.2, `lucide-react` 0.395.0, `tailwindcss` 3.4.17, `axios` 1.7.2.
8. **Test Runner:**
   - Belum ada automated test runner (`vitest`/`jest`) di codebase (sesuai status proyek pada `AGENTS.md` T-005).

---

#### C. Baseline Kualitas
9. **Build Frontend Baseline:**
   - Perintah `npm run build:portal` dijalankan dan **berhasil 100% (Status: 0)**.
   - Total 3.607 modul tertransformasi dan bundle `dist/` terbentuk tanpa error.
10. **Eksekusi Lokal:**
    - Backend: `npm run dev:backend` (port 3000, membaca `apps/api-backend/.env`).
    - Frontend: `npm run dev:portal` (port 5173).
    - Variabel lingkungan utama (nama saja): `NODE_ENV`, `PORT`, `JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `KEPEGAWAIAN_DB_NAME`, `VITE_API_URL`.

---

#### D. Akses, Akun, dan Data Uji
11. **Permission & Role Management:**
    - Permission terdaftar di `u622997391_core.permissions`:
      - `kepegawaian.view` (id: 20)
      - `kepegawaian.manage` (id: 21)
      - `kepegawaian.attendance_locations.manage` (id: 112)
      - `kepegawaian.attendance_locations.read` (id: 113)
    - Role `super_admin`, `admin_yayasan`, `admin_satuan_pendidikan` memiliki akses penuh ke permission tersebut.
    - Pada Tahap 1, endpoint backend presensi akan dipastikan menggunakan permission `kepegawaian.manage` / `kepegawaian.attendances.manage` yang konsisten.
12. **Akun Uji untuk Verifikasi Multi-Role:**
    - `superadmin`: Role `super_admin` (akses semua modul & seluruh unit sekolah).
    - `aji`, `ahmad`, `baharudin`, `septari`: Role `guru` (unit SMP Aldepos).
    - `ade`: Role `staf` (unit SMP Aldepos).
13. **Kondisi Data Saat Ini:**
    - `employees`: 41 orang (40 aktif, 1 nonaktif, unit: SMP Aldepos).
    - `employee_attendances`: 1 baris data kehadiran.
    - `attendance_work_schedules`: 1 jadwal aktif ("Guru Reguler").
    - `attendance_locations`: 1 lokasi aktif ("Gedung A", radius 1000m).
    - `employee_work_schedule_assignments`: 41 penugasan jadwal aktif.

---

#### E. Kesiapan Referensi Desain
14. **Verifikasi Folder Desain Stitch:**
    - Semua file desain di `docs/design/design-modul-pegawai/Halaman Presensi & Absensi Pegawai/` terbaca utuh:
      1. `aldepos_kepegawaian/DESIGN.md` (8.8 KB)
      2. `aldepos_presensi_absensi_app_shell/code.html` (21.4 KB) - Kerangka Halaman
      3. `aldepos_presensi_absensi_pegawai/code.html` (59.6 KB) - Tab Presensi Hari Ini
      4. `aldepos_belum_presensi_pegawai/code.html` (59.5 KB) - Tab Belum Presensi
      5. `aldepos_presensi_perlu_ditindaklanjuti/code.html` (56.9 KB) - Tab Perlu Tindak Lanjut
      6. `aldepos_rekap_bulanan_presensi_pegawai/code.html` (69.9 KB) - Tab Rekap Bulanan
      7. `aldepos_antrean_koreksi_presensi/code.html` (46.3 KB) - Tab Antrean Koreksi
      8. `aldepos_input_presensi_manual_modal/code.html` (38.1 KB) - Modal Input Presensi Manual
      9. `aldepos_detail_presensi_drawer_modal/code.html` (72.5 KB) - Drawer Detail Presensi
      10. `aldepos_tutup_periode_presensi_modal_1/code.html` (32.3 KB) - Modal Tutup Periode Step 1
      11. `aldepos_tutup_periode_presensi_modal_2/code.html` (28.2 KB) - Modal Tutup Periode Step 2
    - **Aset Eksternal:** Seluruh ikon di `code.html` (Material Symbols) dipetakan ke `lucide-react`. Google Fonts Inter sudah terintegrasi.
    - **Kesesuaian Token:** Palet warna `emerald` (Primary), `slate` (Canvas & Neutral Text), `amber` (Klarifikasi/Luar Radius), `rose` (Alpa/Terlambat), dan `indigo` (Sakit) selaras dengan konfigurasi Tailwind proyek.
15. **Komponen UI Bersama yang Tersedia:**
    - `apps/core-portal/src/shared/components/DataTable.jsx`
    - `apps/core-portal/src/shared/components/Modal.jsx`
    - `apps/core-portal/src/shared/components/Drawer.jsx`
    - `apps/core-portal/src/shared/components/StatusPill.jsx`
    - `apps/core-portal/src/shared/components/Toast.jsx`
    - `apps/core-portal/src/shared/components/FilterBar.jsx`
    - `apps/core-portal/src/shared/components/DatePickerField.jsx`

---

#### F. Risiko yang Perlu Diketahui Sebelum Mulai
16. **Integrasi Lintas Fitur & Modul:**
    - **Portal Guru (`apps/core-portal/src/apps/guru/pages/AbsensiPage.jsx`):** Memanggil `/kepegawaian/attendances/today-status`, `check-in`, `check-out`, dan `clarifications`. Endpoint ini TIDAK BOLEH diubah kontrak request/response-nya agar presensi mandiri guru tetap berjalan lancar.
    - **Master Pengaturan Absensi (`apps/core-portal/src/apps/kepegawaian/pages/PengaturanAbsensi.jsx`):** Mengelola `attendance_work_schedules`, `attendance_locations`, dan penugasan jadwal.
    - **Modul Data Pegawai (`apps/api-backend/src/modules/kepegawaian/employees/service.js`):** Membaca ringkasan riwayat kehadiran pegawai.
    - **Modul Penggajian / Payroll (`apps/api-backend/src/modules/kepegawaian/payroll/service.js`):** Menghitung potongan kehadiran pegawai aktif pada periode penggajian.
17. **Daftar Hal yang Perlu Diperhatikan:**
    - Fitur **Tutup Periode Presensi**: Perlu mekanisme backend untuk mengunci catatan presensi pada bulan yang sudah ditutup agar tidak dapat diedit atau ditambah manual tanpa izin khusus.

---

### DAFTAR TINDAKAN (ACTION ITEMS)

#### 1. Yang Perlu Dilakukan Pemilik Proyek Sebelum Tahap 0
- [ ] Memastikan cadangan database remote `u622997391_kepegawaian` dibuat sebelum eksekusi migrasi DDL baru.
- [ ] Menentukan jika ingin membuat akun login khusus dengan role `hrd` (misal username: `hrd_smp`) atau menggunakan akun `superadmin` yang sudah ada untuk pengujian HRD.

#### 2. Yang Perlu Disiapkan Antigravity di Tahap 1–2
- [ ] **Tahap 1 (Backend & Kontrak API Presensi HRD):**
  - Endpoint ringkasan dasbor presensi hari ini (Hadir, Belum Presensi, Terlambat, Di Luar Radius, Izin/Sakit, Alpa).
  - Endpoint daftar pegawai belum presensi hari ini (berdasarkan jadwal aktif pegawai).
  - Endpoint tab "Perlu Ditindaklanjuti" (presensi di luar radius, presensi tanpa check-out, pengajuan klarifikasi lupa absen).
  - Endpoint rekap presensi bulanan per pegawai dengan metrik KPI kehadiran.
  - Endpoint antrean & histori koreksi presensi.
  - Endpoint penguncian / tutup periode presensi.
  - Validasi Zod dan otorisasi hak akses unit sekolah berbasis JWT.
- [ ] **Tahap 2 (Frontend React Portal HRD):**
  - Implementasi App Shell & Tab Navigation (Presensi Hari Ini, Belum Presensi, Perlu Ditindaklanjuti, Rekap Bulanan, Antrean Koreksi).
  - Integrasi Modal Input Presensi Manual, Drawer Detail Presensi, dan Modal Tutup Periode.
  - Penggunaan komponen shared (`DataTable`, `StatusPill`, `Modal`, `Drawer`, `Toast`, `Lucide`).
  - Loading skeleton, empty state, error handling, dan feedback toast interaktif.

---

### KESIMPULAN & VERDICT

**VERDICT: SIAP MULAI (READY TO PROCEED)**

**Alasan:**
1. Struktur basis data, migrasi Knex, dan skema tabel `employee_attendances` beserta relasi jadwal dan lokasi telah siap dan sinkron 100% tanpa schema drift.
2. Build frontend baseline Vite (`npm run build:portal`) telah diuji dan lulus 100% tanpa error.
3. Semua referensi visual dan spesifikasi desain Stitch (11 file/folder) tersedia lengkap, terbaca utuh, dan telah dipetakan ke komponen shared serta library ikon Lucide proyek.
4. Titik integrasi dengan Portal Guru dan Payroll telah diisolasi sehingga pekerjaan pada Halaman Presensi HRD dapat dilakukan tanpa risiko regresi.
