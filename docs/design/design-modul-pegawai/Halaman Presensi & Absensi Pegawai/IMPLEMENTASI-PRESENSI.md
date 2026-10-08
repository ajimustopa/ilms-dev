# DOKUMENTASI IMPLEMENTASI: FITUR PRESENSI & ABSENSI PEGAWAI (HRIS)
**Core Aldepos — Modul Kepegawaian**  
*Status: Selesai (Tahap 1 – Tahap 10)* | *Terverifikasi: 2026-10-07*

---

## 1. Arsitektur & Gambaran Umum

Fitur Presensi & Absensi Pegawai merupakan modul operasional HRD dan self-service staf pada ekosistem Core Aldepos. Sistem dirancang dengan prinsip:
- **Multi-Satuan Pendidikan Terisolasi**: Hak akses data dikunci pada unit sekolah masing-masing (`satuan_pendidikan_id`), dengan privilege lintas-satuan khusus untuk peran `super_admin` dan `admin_yayasan`.
- **Anti-IDOR & Zero Trust**: Identitas staf pada presensi mandiri (check-in, check-out, pengajuan izin, klarifikasi) diverifikasi ketat dari klaim JWT (`ref_id`), mencegah manipulasi atau spoofing data pegawai lain.
- **Audit Trail Permanen**: Seluruh mutasi presensi manual, approval koreksi, tindak lanjut anomali, dan penguncian periode tercatat di tabel `attendance_audit_logs`.
- **Proteksi Periode Terkunci Terpusat**: Seluruh endpoint penulisan data menolak perubahan pada tanggal yang periodenya telah dikunci atau diserahkan ke modul Penggajian (Payroll).

---

## 2. Inventaris Kontrak API Backend

| No | Method | Endpoint | Permission / Role | Deskripsi |
|---|---|---|---|---|
| 1 | `GET` | `/kepegawaian/attendances/dashboard-summary` | `authenticate` | Mengembalikan 7 metrik ringkasan KPI kehadiran harian real-time |
| 2 | `GET` | `/kepegawaian/attendances` | `authenticate` | Mengambil daftar log presensi dengan filter tanggal, status, anomali, dan unit |
| 3 | `GET` | `/kepegawaian/attendances/:id/detail` | `authenticate` | Mengambil detail telemetri presensi, koordinat GPS, jadwal, dan riwayat audit |
| 4 | `POST` | `/kepegawaian/attendances/check-in` | `authenticate` | Presensi masuk mandiri via GPS dengan validasi radius & keterlambatan |
| 5 | `PATCH` | `/kepegawaian/attendances/:id/check-out` | `authenticate` | Presensi keluar (pulang) mandiri dengan validasi GPS & pulang cepat |
| 6 | `GET` | `/kepegawaian/attendances/absent-candidates` | `kepegawaian.attendances.read` | Mengambil daftar pegawai aktif yang belum melakukan presensi hari ini |
| 7 | `POST` | `/kepegawaian/attendances/quick-mark` | `kepegawaian.attendances.manage` | Quick action HRD menandai hadir/izin/sakit/dinas luar/alpa massal |
| 8 | `GET` | `/kepegawaian/attendances/anomalies` | `kepegawaian.attendances.read` | Mendeteksi dan memfilter anomali presensi (luar radius, jam ganjil, dll) |
| 9 | `POST/PATCH` | `/kepegawaian/attendances/anomalies/:id/resolve` | `kepegawaian.attendances.manage` | Menyelesaikan temuan anomali presensi dengan audit log |
| 10 | `GET` | `/kepegawaian/attendances/clarifications` | `authenticate` | Mengambil antrean permohonan koreksi / klarifikasi lupa absen |
| 11 | `GET` | `/kepegawaian/attendances/clarifications/:id` | `authenticate` | Mengambil detail formulir dan bukti lampiran klarifikasi |
| 12 | `POST` | `/kepegawaian/attendances/clarifications` | `authenticate` | Pengajuan klarifikasi lupa absen mandiri oleh guru/staf |
| 13 | `PATCH` | `/kepegawaian/attendances/clarifications/:id/review` | `kepegawaian.attendances.manage` | Verifikasi (setujui/tolak) pengajuan koreksi oleh HRD |
| 14 | `GET` | `/kepegawaian/attendances/monthly-summary` | `kepegawaian.attendances.read` | Mengambil rekapitulasi kehadiran bulanan pegawai (H/T/I/S/C/DL/A) |
| 15 | `GET` | `/kepegawaian/attendances/monthly-matrix` | `kepegawaian.attendances.read` | Matriks status harian tanggal 1–31 untuk seluruh pegawai |
| 16 | `GET` | `/kepegawaian/attendances/monthly-trends` | `kepegawaian.attendances.read` | Tren grafik persentase kehadiran harian 1 bulan penuh |
| 17 | `GET` | `/kepegawaian/attendances/export-excel` | `kepegawaian.attendances.read` | Export file Excel XLSX rekapitulasi KPI bulanan dan matriks 1–31 |
| 18 | `GET` | `/kepegawaian/attendances/export-pdf` | `kepegawaian.attendances.read` | Export dokumen PDF resmi laporan presensi berstandar kop surat yayasan |
| 19 | `POST` | `/kepegawaian/attendances/manual-entry` | `kepegawaian.attendances.manage` | Input presensi manual 1 pegawai oleh HRD |
| 20 | `POST` | `/kepegawaian/attendances/bulk-manual-entry` | `kepegawaian.attendances.manage` | Input presensi manual massal multi-pegawai |
| 21 | `GET` | `/kepegawaian/attendances/period-readiness` | `kepegawaian.attendances.read` | Mengambil kesiapan audit 4 kategori dan persentase readiness |
| 22 | `GET` | `/kepegawaian/attendances/period-lock-status` | `kepegawaian.attendances.read` | Status penguncian dan siklus penutupan periode presensi |
| 23 | `POST` | `/kepegawaian/attendances/lock-period` | `kepegawaian.attendances.manage` | Mengunci periode presensi dan membekukan mutasi data |
| 24 | `POST` | `/kepegawaian/attendances/unlock-period` | `super_admin` / `admin_yayasan` | Membuka kunci periode terkunci dengan alasan wajib ($\ge 5$ karakter) |
| 25 | `POST` | `/kepegawaian/attendances/submit-to-payroll` | `kepegawaian.attendances.manage` | Menyerahkan snapshot rekapitulasi kehadiran ke modul Penggajian |

---

## 3. Skema Basis Data & Migrasi

### Tabel `employee_attendances`
- **PK**: `id BIGINT UNSIGNED AUTO_INCREMENT`
- **Kolom Utama**: `employee_id`, `school_unit_id`, `attendance_date`, `check_in_time`, `check_out_time`, `status`, `sub_status`, `entry_type`, `is_late`, `late_minutes`, `is_early_departure`, `early_departure_minutes`, `is_within_radius`, `check_in_latitude`, `check_in_longitude`, `check_in_distance_meters`, `check_in_accuracy_meters`, `is_clarification_needed`, `clarification_status`, `is_anomaly`, `anomaly_resolved`.
- **Indeks Komposit**:
  - `uq_attendance_employee_date` (`employee_id`, `attendance_date`)
  - `idx_att_school_unit_date` (`school_unit_id`, `attendance_date`)
  - `idx_att_date` (`attendance_date`)
  - `idx_att_school_unit_clarification` (`school_unit_id`, `clarification_status`)
  - `idx_att_school_unit_anomaly` (`school_unit_id`, `is_anomaly`, `anomaly_resolved`)

### Tabel `attendance_period_locks`
- **PK**: `id BIGINT UNSIGNED AUTO_INCREMENT`
- **Kolom Utama**: `school_unit_id`, `period_month`, `period_year`, `status` (`'open'`, `'review'`, `'locked'`, `'submitted_to_payroll'`), `locked_by`, `locked_at`, `unlocked_by`, `unlocked_at`, `unlock_reason`, `summary_snapshot` (JSON), `submitted_to_payroll_at`, `submitted_to_payroll_by`, `notes`.
- **Indeks**: `idx_period_locks_year_month_unit` (`period_year`, `period_month`, `school_unit_id`).

### Tabel `attendance_audit_logs`
- **PK**: `id BIGINT UNSIGNED AUTO_INCREMENT`
- **Kolom Utama**: `attendance_id` (NULLABLE), `action`, `performed_by`, `old_values` (JSON), `new_values` (JSON), `reason`, `ip_address`, `created_at`.

---

## 4. Aturan Bisnis & Logika Sistem

### A. Hierarki 3 Metode Penetapan Jadwal Kerja
1. **Prioritas 1 — Custom Day Schedules Pegawai**: Konfigurasi jam masuk/pulang per hari spesifik dari `employee_work_schedule_assignments.custom_day_schedules`.
2. **Prioritas 2 — Penugasan Shift / Pola Kerja Massal**: Jam kerja dari template `attendance_work_schedules` yang ditugaskan kepada pegawai.
3. **Prioritas 3 — Master Jam Kerja Satuan Pendidikan**: Fallback jadwal default aktif milik unit sekolah.

### B. Normalisasi Status & Status Turunan
- `present` + `is_late: false` $\rightarrow$ `hadir`
- `present` + `is_late: true` $\rightarrow$ `terlambat` (dengan kalkulasi menit dari jam mulai resmi setelah melewati toleransi)
- `permitted` + `sub_status: 'dinas_luar'` $\rightarrow$ `dinas_luar`
- `permitted` + `sub_status: 'cuti'` $\rightarrow$ `cuti`
- `sick` $\rightarrow$ `sick` (Sakit)
- `permitted` $\rightarrow$ `permitted` (Izin Pribadi)
- `absent` $\rightarrow$ `absent` (Alpa / Tanpa Keterangan)
- `clarification_status: 'pending'` $\rightarrow$ `clarification_pending`

### C. Deteksi Anomali Presensi
- **Radius GPS**: Check-in/out di luar radius titik master absensi yang ditugaskan ($> r$ meter).
- **Akurasi Sinyal Rendah**: Sinyal GPS perangkat $> 250$ meter.
- **Missing Check-Out**: Presensi tap-in hadir pada hari lampau tanpa tap-out pulang.
- **Terlambat Berat**: Keterlambatan $\ge 60$ menit.
- **Konflik Cuti/Izin**: Tercatat hadir fisik saat surat cuti berstatus approved.

### D. Siklus Periode Presensi & Kunci Payroll
1. **Terbuka (`open`)**: Pencatatan harian normal berjalan.
2. **Ditinjau (`review`)**: Sistem mendeteksi adanya temuan audit yang harus diselesaikan HRD sebelum tutup buku.
3. **Terkunci (`locked`)**: Membekukan seluruh mutasi data (check-in, check-out, quick mark, manual entry, resolusi anomali). Hanya dapat dibuka oleh `super_admin`/`admin_yayasan`.
4. **Terkirim ke Payroll (`submitted_to_payroll`)**: Snapshot rekapitulasi kehadiran final terkunci permanen dan diserahkan ke modul Payroll.

---

## 5. Perbandingan UI Terhadap Desain Stitch & Deviasi yang Disengaja

| Komponen / Layar | Acuan Stitch | Status Implementasi | Catatan Deviasi yang Disengaja |
|---|---|---|---|
| App Shell & Layout | `aldepos_presensi_absensi_app_shell` | 100% Sesuai | Menggunakan header & sidebar resmi portal Core Aldepos. |
| Tab Presensi Hari Ini | `aldepos_presensi_absensi_pegawai` | 100% Sesuai | Pagination server-side Knex dan filter terintegrasi. |
| Tab Belum Presensi | `aldepos_belum_presensi_pegawai` | 100% Sesuai | Quick action modal dengan opsi sub-status dinas luar & izin. |
| Tab Perlu Ditindaklanjuti | `aldepos_presensi_perlu_ditindaklanjuti` | 100% Sesuai | Dialog resolusi anomali terhubung langsung dengan audit log. |
| Tab Antrean Koreksi | `aldepos_antrean_koreksi_presensi` | 100% Sesuai | Modal review detail komparasi data lama vs usulan data baru. |
| Tab Rekap Bulanan | `aldepos_rekap_bulanan_presensi_pegawai` | 100% Sesuai | View switcher (Rekap KPI, Matriks 1-31, Tren Grafik), Export XLSX & PDF. |
| Modal Input Presensi Manual | `aldepos_input_presensi_manual_modal` | 100% Sesuai | Dukungan tab Single Entry dan Batch Entry multi-pegawai. |
| Drawer Detail Presensi | `aldepos_detail_presensi_drawer_modal` | 100% Sesuai | Telemetri GPS Haversine, jadwal kerja, dan timeline audit trail. |
| Modal Tutup Periode | `aldepos_tutup_periode_presensi_modal_1 & _2` | 100% Sesuai | Stepper 4 tahap, 4 kartu checklist audit, aksi kunci, buka kunci, payroll. |

---

## 6. Backlog & Fitur Masa Depan (Di Luar Lingkup Saat Ini)

1. **Integrasi Dinamis Modul Penggajian (Payroll)**:
   - Menghubungkan kalkulator payroll di `apps/api-backend/src/modules/kepegawaian/payroll/service.js` secara langsung ke `attendance_period_locks.summary_snapshot` agar potongan alpa dan insentif kehadiran dihitung otomatis.
2. **Sinkronisasi Hari Libur Kalender Akademik**:
   - Menghubungkan pengecekan hari libur nasional dan cuti bersama institusi dari modul Akademik ke modul Kepegawaian.
3. **Notifikasi WhatsApp & Push Reminder**:
   - Pengiriman notifikasi otomatis kepada staf yang belum tap-in pada $H-15$ menit sebelum jam masuk kerja.
4. **Integrasi Mesin Biometric Fingerprint & Face Recognition**:
   - Webhook penerima data tap dari perangkat fisik ZKTeco / standalone biometric scanner.
