# LAPORAN INFORMASI FAKTUAL — MODUL MANAJEMEN CUTI, IZIN & LEMBUR
**Core Aldepos — Modul Kepegawaian / HRIS**  
*Mode Pemeriksaan: READ-ONLY (Fakta Aktual Sistem, Database, API, dan Desain Stitch)*  
*Tanggal Audit: 2026-10-07* | *Basis Data Aktif: `u622997391_kepegawaian`, `u622997391_core`, `u622997391_akademik`*

---

## DAFTAR ISI
- [BAGIAN A — Pemetaan Desain → Data (12 Layar Stitch & Kesenjangan Sistem)](#bagian-a--pemetaan-desain--data)
- [BAGIAN B — Inventaris API yang Sudah Ada](#bagian-b--inventaris-api-yang-sudah-ada)
- [BAGIAN C — Database Kepegawaian yang Sudah Ada](#bagian-c--database-kepegawaian-yang-sudah-ada)
- [BAGIAN D — Keterkaitan dengan Modul dan Database Lain](#bagian-d--keterkaitan-dengan-modul-dan-database-lain)
- [BAGIAN E — Infrastruktur Pendukung](#bagian-e--infrastruktur-pendukung)
- [BAGIAN F — Kondisi Halaman Saat Ini (`CutiLembur.jsx` & Portal Guru)](#bagian-f--kondisi-halaman-saat-ini)
- [BAGIAN G — Data Aktual (Agregat)](#bagian-g--data-aktual-agregat)
- [BAGIAN H — Status Pekerjaan Presensi yang Sedang Berjalan](#bagian-h--status-pekerjaan-presensi-yang-sedang-berjalan)
- [BAGIAN I — Keamanan dan Hak Akses](#bagian-i--keamanan-dan-hak-akses)
- [BAGIAN J — Ringkasan, Urutan Ketergantungan, Risiko & Pertanyaan Kebijakan](#bagian-j--ringkasan-dan-rekomendasi-singkat)

---

## BAGIAN A — Pemetaan Desain → Data

Pemetaan dilakukan terhadap 12 subfolder pada `docs/design/design-modul-pegawai/Halaman Manajemen Cuti, Izin & Lembur/`. Acuan visual dan interaktif didasarkan pada `DESIGN.md` dan `code.html`.

### 1. `aldepos_hris_precision` (Design System Tokens & Foundation)
- **Elemen Desain:** Token warna functional zoning (`#0B1220` Midnight, `#006948` / `#059669` Emerald Primary, `#4B41E1` / `#4F46E5` Indigo Accent), font Inter tabular figures (`tnum`), border radius `8px` (`rounded-lg`), elevation flat outline 1px `#E2E8F0`.
- **Status Sistem:** **SUDAH ADA**. Telah diimplementasikan pada `apps/core-portal/src/index.css` dan `tailwind.config.js`.

---

### 2. `manajemen_cuti_izin_lembur` (App Shell & Workspace Tabs)
*File acuan: `manajemen_cuti_izin_lembur/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Header Halaman & Deskripsi | Teks statis judul & deskripsi halaman | Statis Frontend | **SUDAH ADA** |
| Tombol Reload (`#btn-refresh`) | Trigger fetch ulang data tab aktif | Event handler frontend | **SUDAH ADA** di `CutiLembur.jsx:60-86` |
| Tombol "+ Ajukan Cuti / Izin" | Membuka modal formulir pengajuan cuti | State `isLeaveModalOpen` | **SUDAH ADA** |
| Tab 1: "Pengajuan Cuti & Izin" + Badge Count | Total pengajuan cuti/izin aktif/pending | `employee_leave_requests` | **SEBAGIAN** (saat ini hitung total array `leaves.length`, belum ada counter filter pending khusus) |
| Tab 2: "Penugasan Lembur" + Badge Count | Total surat tugas lembur aktif | `employee_overtimes` | **SEBAGIAN** (hitung `overtimes.length`) |
| Empty State View (Cuti & Lembur) | Deteksi list kosong dengan icon `event_busy` & `more_time` | Array length === 0 | **SUDAH ADA** |

---

### 3. `manajemen_cuti_izin_lembur_data_table` (Tabel Utama Permohonan Cuti & Izin)
*File acuan: `manajemen_cuti_izin_lembur_data_table/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Segment Filter Periode (Bulan ini, Bulan depan, Semester ini, Reset) | Rentang `start_date` dan `end_date` per semester/bulan | **BELUM ADA** di backend `listLeaveRequests` | Backend saat ini hanya memfilter exact query match tanpa rentang tanggal (`attendance/service.js:1126-1139`) |
| Filter Unit Satuan Pendidikan | `school_unit_id` pegawai pemohon | `employee_leave_requests.school_unit_id` | **SUDAH ADA** (`attendance/service.js:1130`) |
| Filter Status (Semua, Menunggu, Disetujui, Ditolak) | Nilai kolom `status` enum | `employee_leave_requests.status` | **SUDAH ADA** (`pending`, `approved`, `rejected`) |
| Search Bar Pegawai / Alasan | Pencarian substring nama pegawai / alasan | **BELUM ADA** di backend `listLeaveRequests` | Belum ada filter `q` / `search` di Knex service |
| Tombol Bulk Action ("Setujui Terpilih", "Tolak Terpilih") | Array `leave_ids[]` untuk approval massal | **BELUM ADA** | Backend hanya memiliki single patch `:id/approve` |
| Kolom Pegawai (Foto, Nama, NIP, Unit) | `employees.full_name`, `employee_number`, `photo_url` | `employees` (join) | **SEBAGIAN** (`photo_url` belum di-select) |
| Kolom Jenis Cuti (Pill Warna) | `leave_type` (`cuti_tahunan`, `sakit`, dll) | `employee_leave_requests.leave_type` | **SUDAH ADA** |
| Kolom Periode & Durasi Hari Kerja | `start_date`, `end_date`, hitung hari kerja efektif | `employee_leave_requests.start_date/end_date` | **SEBAGIAN** (belum ada kolom durasi hari tersimpan; hitung on-the-fly) |
| Kolom Lampiran (Icon / Preview) | `attachment_url`, `attachment_name`, `mime_type` | `employee_leave_requests.attachment_*` | **SUDAH ADA** di skema DB (`20261006140004`) |
| Kolom Sisa Jatah Cuti | Saldo cuti tahunan tersisa saat pengajuan | **BELUM ADA** | Tidak ada tabel saldo cuti atau kalkulasi saldo di backend |
| Kolom Status Approval Multi-level | Tracking paraf Atasan Langsung & Kepala Sekolah | **BELUM ADA** | DB hanya punya 1 approver (`approved_by`) |
| Tombol Aksi Row (Lihat Detail, Setujui, Tolak) | Single row approval & drawer opener | Endpoint `/approve`, `/reject` | **SUDAH ADA** di backend |

---

### 4. `manajemen_cuti_izin_lembur_kalender_ketidakhadiran` (Kalender Visual Ketidakhadiran)
*File acuan: `manajemen_cuti_izin_lembur_kalender_ketidakhadiran/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| View Mode Switcher (Bulan vs Daftar) | Render kalender grid 7x5 vs list view | **BELUM ADA** di frontend | Belum ada komponen kalender grid di shared |
| Filter Kategori Ketidakhadiran (Semua, Cuti, Sakit, Izin, Dinas Luar, Lembur) | Agregasi harian per jenis status | **BELUM ADA** endpoint agregasi kalender | Backend belum memiliki endpoint `/attendances/calendar-matrix` |
| Badge Event Pegawai pada Grid Tanggal | Mapping `leave_requests` (approved) + `overtimes` per tanggal | **BELUM ADA** | Belum ada service penyatu event cuti/lembur per tanggal |
| Banner Ambang Rawan Personel ("3 Guru PJOK cuti bersamaan") | Algoritma deteksi bentrok $\ge N$ staf per unit/jabatan pada hari sama | **BELUM ADA** | Logika bisnis deteksi bentrok belum dibuat |
| Tombol "Kirim Notifikasi Inval / Pengganti" | Notifikasi internal ke guru pengganti jadwal KBM | **BELUM ADA** | Modul komunikasi/inval belum tersedia |
| Ekspor Kalender (.ics / .xlsx) | Generator iCalendar format / file Excel | **BELUM ADA** | Service export kalender belum ada |

---

### 5. `manajemen_cuti_izin_lembur_saldo_cuti` (Master Kuota & Buku Besar Saldo Cuti)
*File acuan: `manajemen_cuti_izin_lembur_saldo_cuti/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Tabel Master Kuota Pegawai (Jatah Pokok, Carry Over, Terpakai, Sisa Aktif) | Kuota tahunan, sisa tahun lalu, akumulasi terpakai | **BELUM ADA** | Tidak ada tabel `employee_leave_balances` / `leave_quotas` di database |
| Kolom Masa Kerja & Status Kepegawaian | `employees.created_at` / `hire_date`, `employment_status` | `employees` | **SEBAGIAN** (`employment_status` ada, `hire_date` eksplisit belum ada di DB) |
| Tombol "+ Atur Jatah Massal" | Modal penetapan kuota tahunan per unit/status pegawai | **BELUM ADA** | Endpoint & skema penetapan kuota belum ada |
| Sub-Tabel Buku Besar Mutasi Saldo (Debit/Kredit/Saldo Akhir) | Ledger riwayat penambahan, pemakaian cuti, expired, penyesuaian HRD | **BELUM ADA** | Belum ada tabel `leave_balance_mutations` / `leave_ledger` |
| Aksi "Koreksi Saldo Manual" | Form penyesuaian kuota (+/- hari) dengan alasan wajib | **BELUM ADA** | Service penyesuaian saldo belum ada |
| Cetak Rekap Buku Besar Pegawai | Generator PDF slip mutasi cuti pegawai | **BELUM ADA** | Template PDF ledger belum dibuat |

---

### 6. `manajemen_cuti_izin_lembur_penugasan_lembur` (Tabel Surat Perintah Lembur)
*File acuan: `manajemen_cuti_izin_lembur_penugasan_lembur/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Tabel Lembur (Pegawai, Tanggal, Jam Rencana, Jam Realisasi, Durasi, Estimasi Upah) | `employee_overtimes` + komparasi presensi aktual + formula tarif upah | **SEBAGIAN** di DB | Tabel `employee_overtimes` ada kolom `start_time`, `end_time`, `actual_start_time`, `actual_end_time`, `hours` |
| Kolom Jam Realisasi dari Presensi Mesin/GPS | Sinkronisasi waktu tap masuk/keluar lembur dari `employee_attendances` | **BELUM ADA** | Belum ada scheduler/logika sinkronisasi tap presensi ke `actual_start_time` lembur |
| Kolom Estimasi Upah Lembur | Formula perhitungan: `durasi * tarif_per_jam * pengali_hari` | **BELUM ADA** | Tidak ada kolom tarif upah lembur atau master tarif lembur |
| Label Hari Operasional (Hari Kerja vs Akhir Pekan vs Libur Nasional) | Pengecekan jenis hari kalender untuk menentukan pengali tarif (1.5x / 2x) | **BELUM ADA** | Logika kalender tarif belum ada |
| Aksi Bulk Approval Lembur | Mass approve/reject surat tugas lembur | **BELUM ADA** | Backend hanya ada single update status |

---

### 7. `manajemen_cuti_izin_lembur_laporan` (Statistik, Analisis & Rekapitulasi)
*File acuan: `manajemen_cuti_izin_lembur_laporan/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Chart 1: Donut "Pengajuan per Jenis Cuti & Izin" | Agregasi count group by `leave_type` | **BELUM ADA** | Belum ada endpoint statistik cuti & library chart frontend |
| Chart 2: Bar "Tren Ketidakhadiran per Bulan" | Agregasi count per bulan sepanjang tahun berjalan | **BELUM ADA** | Belum ada endpoint tren tahunan |
| Chart 3: "Pegawai dengan Cuti Terbanyak" | Top 5 pegawai by total hari cuti | **BELUM ADA** | Query agregasi top leave belum ada |
| Chart 4: "Komposisi Status Persetujuan" | Persentase pending, approved, rejected | **BELUM ADA** | Query komposisi status belum ada |
| Tabel Rekapitulasi Ketidakhadiran per Pegawai | Pivot table: Cuti Tahunan, Khusus, Sakit, Izin, DL, Total Hari, Jam Lembur, Sisa Cuti | **BELUM ADA** | Belum ada service rekapitulasi komprehensif cuti+lembur |
| Ekspor Excel (.xlsx) & PDF Laporan | Unduhan file laporan rekapitulasi | **BELUM ADA** untuk cuti | (Sudah ada di presensi bulanan `attendance/service.js:2000`, tapi belum untuk cuti/lembur) |

---

### 8. `manajemen_cuti_detail_pengajuan_drawer` (Drawer Detail Permohonan)
*File acuan: `manajemen_cuti_detail_pengajuan_drawer/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Header Drawer: Status Pill, ID Permohonan, Tanggal Submit | `employee_leave_requests.id`, `created_at`, `status` | `employee_leave_requests` | **SUDAH ADA** |
| Profil Pemohon: Nama, Gelar, NIP, Jabatan, Unit Kerja | Data relasi pegawai & jabatan | `employees` + `job_positions` | **SUDAH ADA** |
| Kartu Ringkasan Periode & Jenis Izin | `leave_type`, `start_date`, `end_date`, total hari kerja | `employee_leave_requests` | **SUDAH ADA** |
| Widget Sisa Kuota Cuti Pemohon | Saldo sebelum vs sisa setelah pengajuan ini disetujui | **BELUM ADA** | Belum ada ledger kuota |
| Deteksi Rekan Kerja Cuti pada Tanggal Sama | Query pegawai satu unit yang memiliki cuti approved di rentang tanggal sama | **BELUM ADA** | Logika query bentrok rekan kerja belum ada |
| Pratinjau & Download Berkas Surat/Dokter | `attachment_url`, viewer modal | `attendance/service.js:1187` (`getLeaveAttachment`) | **SUDAH ADA** |
| Timeline Persetujuan Bertingkat (Atasan $\rightarrow$ Kepala Sekolah $\rightarrow$ HRD) | Riwayat multi-step approval, timestamp, nama approver, catatan | **BELUM ADA** | DB hanya memiliki 1 kolom `approved_by` & `approved_at` |
| Formulir Catatan Review & Tombol Tindakan (Tolak, Minta Revisi, Setujui) | Input catatan review, status transisi | **SEBAGIAN** (Setujui & Tolak ada, "Minta Revisi" belum didukung enum DB) |

---

### 9. `manajemen_cuti_modal_ajukan_cuti_izin` (Modal Pengajuan HRD)
*File acuan: `manajemen_cuti_modal_ajukan_cuti_izin/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Selector Pegawai Pemohon | Dropdown daftar pegawai aktif per unit | `employees` | **SUDAH ADA** di `CutiLembur.jsx:88` |
| Tabs Kategori (Cuti Tahunan, Cuti Khusus, Izin & Sakit) | Pengelompokan jenis cuti berdasarkan kategori regulasi | **BELUM ADA** | Belum ada pengelompokan kategori di DB |
| Sub-pilihan Cuti Khusus (Melahirkan, Menikah, Duka, Haji/Umrah, Istri Melahirkan) | Master jenis cuti khusus dinamis | **SEBAGIAN** | DB hanya string bebas / enum statis di kode |
| Opsi Setengah Hari (Pagi 07.00–12.00 vs Siang 12.00–16.00) | Flag half day & multiplier 0.5 hari kerja | **BELUM ADA** | DB tidak memiliki kolom `is_half_day` / `half_day_type` |
| Upload Dokumen Pendukung | File upload base64/multipart | `attendance/service.js:1091` | **SUDAH ADA** |
| Checkbox "Setujui Langsung (Bypass Approval)" | Opsi HRD langsung approve tanpa pending | **BELUM ADA** | Service selalu create dengan `status: 'pending'` |

---

### 10. `manajemen_cuti_modal_tugaskan_lembur` (Modal Form Penugasan Lembur HRD)
*File acuan: `manajemen_cuti_modal_tugaskan_lembur/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Multi-Select Pegawai yang Ditugaskan | Penugasan lembur sekaligus ke beberapa pegawai | **BELUM ADA** | Backend hanya menerima 1 `employee_id` per record |
| Tanggal & Waktu Lembur (Jam Mulai s/d Jam Selesai) | `overtime_date`, `start_time`, `end_time`, durasi | `employee_overtimes` | **SUDAH ADA** |
| Selector Jenis Hari (Hari Kerja, Akhir Pekan, Libur Nasional) | Pengali tarif & dasar hukum penugasan | **BELUM ADA** | DB tidak menyimpan jenis hari operasional lembur |
| Uraian Tugas & No. Surat Tugas / SPK | Keterangan pekerjaan lembur | `employee_overtimes.task_description` | **SEBAGIAN** (No. SPK belum ada kolomnya) |
| Checkbox "Wajib Presensi Fingerprint / GPS" | Flag validasi presensi aktual vs surat tugas | **BELUM ADA** | DB tidak memiliki kolom `requires_actual_attendance` |

---

### 11. `pengaturan_cuti_izin_lembur_jenis_cuti` (Master Konfigurasi Jenis Cuti)
*File acuan: `pengaturan_cuti_izin_lembur_jenis_cuti/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Tabel Master Jenis Cuti & Kebijakan | Nama, kategori, batas maks hari, potong jatah (ya/tidak), dampak payroll, wajib lampiran, gender, status pegawai | **BELUM ADA** | Tidak ada tabel master `leave_types` / `leave_policies` di database |
| Pengaturan Dampak Penggajian (Dibayar Penuh / 50% Gaji / Unpaid Leave) | Flag integrasi payroll per jenis cuti | **BELUM ADA** | Belum ada skema & integrasi payroll |
| Metode Hitung Hari (Hari Kerja vs Hari Kalender) | Algoritma komputasi durasi per jenis cuti | **BELUM ADA** | Saat ini hanya ada helper hardcoded `calculateWorkDays` |
| Filter Gender & Status Pegawai yang Berhak | Aturan validasi hak cuti (mis. Melahirkan hanya Perempuan) | **BELUM ADA** | Validasi backend belum memeriksa gender/status |

---

### 12. `pengaturan_cuti_izin_lembur_hari_libur_kalender` (Master Hari Libur & Kalender Kerja)
*File acuan: `pengaturan_cuti_izin_lembur_hari_libur_kalender/code.html`*

| Elemen UI / Filter / Aksi | Data & Perhitungan yang Dibutuhkan | Sumber Data Saat Ini | Catatan & Bukti |
|---|---|---|---|
| Tabel Hari Libur Berlapis (Libur Nasional, Cuti Bersama, Libur Semester/Sekolah, Agenda Yayasan) | Tanggal, nama libur, jenis libur, flag potong cuti bersama, cakupan unit | **BELUM ADA** di DB Kepegawaian | Di DB Akademik ada `academic_calendar_events`, tapi belum terintegrasi ke Kepegawaian |
| Opsi "Potong Kuota Cuti Tahunan" pada Cuti Bersama | Pengurangan otomatis kuota cuti tahunan pegawai saat ada cuti bersama | **BELUM ADA** | Belum ada mekanisme potong cuti otomatis |
| Tombol "Impor Libur SKB 3 Menteri" & "Salin dari Tahun Lalu" | Preset import hari libur nasional tahunan | **BELUM ADA** | Belum ada service import libur nasional |
| Cakupan Unit Sekolah (Semua Unit vs Unit Tertentu) | Multi-tenancy libur per `satuan_pendidikan_id` | **BELUM ADA** | Belum ada tabel libur di modul Kepegawaian |

---

### DAFTAR KESENJANGAN DESAIN vs SISTEM

Semua hal yang diminta desain Stitch tetapi belum didukung data/API saat ini dikelompokkan sebagai berikut:

#### (i) Perlu Tabel / Kolom Baru di Database Kepegawaian
1. **Tabel Master Jenis Cuti (`leave_types` / `leave_policies`)**: Menyimpan konfigurasi nama, kategori (`annual`, `special`, `permit`, `sick`), batas maks hari, `is_deduct_annual_quota`, `payroll_impact` (`full_paid`, `half_paid`, `unpaid`), `requires_attachment`, `gender_restriction`, `eligible_employment_statuses` (JSON), `count_mode` (`work_days` vs `calendar_days`), `approval_levels_count`.
2. **Tabel Saldo & Ledger Cuti (`employee_leave_balances` & `employee_leave_balance_mutations`)**: Menyimpan kuota pokok, carry over, periode tahun berjalan, saldo akhir, serta ledger mutasi (+/-) transaksi cuti.
3. **Tabel Master Hari Libur Kepegawaian (`holiday_calendars`)**: Menyimpan hari libur nasional, cuti bersama (flag potong cuti), libur semester, dan cakupan `school_unit_id`.
4. **Kolom Baru pada `employee_leave_requests`**:
   - `duration_days DECIMAL(4,1)` (mendukung setengah hari 0.5)
   - `is_half_day TINYINT(1)` & `half_day_type ENUM('first_day_morning', 'last_day_afternoon', 'full_half_day')`
   - `approval_status ENUM('pending', 'approved_by_supervisor', 'approved', 'rejected', 'revision_requested', 'cancelled')`
   - `supervisor_id`, `supervisor_approved_at`, `supervisor_notes`
   - `headmaster_id`, `headmaster_approved_at`, `headmaster_notes`
   - `leave_type_id BIGINT UNSIGNED` (FK ke master `leave_types`)
5. **Kolom Baru pada `employee_overtimes`**:
   - `spk_number VARCHAR(100)` (Nomor Surat Perintah Kerja Lembur)
   - `day_type ENUM('workday', 'weekend', 'holiday')`
   - `hourly_rate DECIMAL(12,2)` & `wage_multiplier DECIMAL(3,1)` & `estimated_wage DECIMAL(14,2)`
   - `requires_actual_attendance TINYINT(1) DEFAULT 1`

#### (ii) Perlu Endpoint Baru di Backend (`apps/api-backend`)
1. `GET /kepegawaian/leave-types` & `POST/PUT/DELETE /kepegawaian/leave-types/:id` (Master Konfigurasi Jenis Cuti)
2. `GET /kepegawaian/leave-balances` & `GET /kepegawaian/leave-balances/:employeeId/ledger` (Master Kuota & Buku Besar Saldo Cuti)
3. `POST /kepegawaian/leave-balances/adjust` & `POST /kepegawaian/leave-balances/bulk-assign` (Penyesuaian Saldo & Penugasan Kuota Massal)
4. `GET /kepegawaian/holidays` & `POST/PUT/DELETE /kepegawaian/holidays/:id` & `POST /kepegawaian/holidays/import-national` (Master Kalender Libur)
5. `GET /kepegawaian/leave-requests/calendar-matrix` (Data Kalender Visual Ketidakhadiran & Deteksi Bentrok)
6. `GET /kepegawaian/leave-requests/reports` & `GET /kepegawaian/leave-requests/export-excel` & `.../export-pdf` (Statistik, Tren & Laporan)
7. `PATCH /kepegawaian/leave-requests/:id/request-revision` & `PATCH /kepegawaian/leave-requests/:id/cancel` (Alur Revisi & Pembatalan)
8. `POST /kepegawaian/overtimes/bulk` & `PATCH /kepegawaian/overtimes/bulk-approve` (Penugasan & Approval Lembur Massal)

#### (iii) Perlu Logika Bisnis Baru
1. **Perhitungan Hari Kerja vs Hari Kalender**: Mengintegrasikan `calendarService` dengan master jadwal kerja, hari libur nasional, dan cuti bersama.
2. **Pengurangan & Pengembalian Saldo Otomatis**: Memotong saldo saat cuti disetujui, mengembalikan saldo saat cuti dibatalkan/ditolak.
3. **Deteksi Bentrok Personel**: Mendeteksi jika $> X\%$ atau $\ge N$ staf pada unit/jabatan yang sama mengambil cuti pada tanggal yang beririsan.
4. **Approval Bertingkat**: Logika approval Atasan Langsung $\rightarrow$ Kepala Sekolah $\rightarrow$ HRD/Yayasan.
5. **Kalkulasi Upah Lembur Sesuai Aturan Ketenagakerjaan/Yayasan**: Pengali jam lembur (1.5x jam pertama, 2x jam berikutnya pada hari kerja; 2x/3x pada hari libur).

#### (iv) Perlu Integrasi Modul Lain
1. **Integrasi ke Presensi**: Saat cuti berstatus `approved`, otomatis membuat/mengunci baris kehadiran di `employee_attendances` dengan `status = 'permitted'` dan `sub_status = 'cuti'`.
2. **Integrasi ke Payroll**: Mengirim data cuti tanpa gaji (`unpaid leave`) dan upah lembur yang telah disetujui ke kalkulator penggajian `payroll_items`.
3. **Integrasi ke Akademik**: Membaca kalender akademik (`academic_calendar_events`) secara in-process untuk menyelaraskan libur sekolah.

---

## BAGIAN B — Inventaris API yang Sudah Ada

### 1. Endpoint Leave Requests & Overtimes di Modul Kepegawaian Backend
*File: `apps/api-backend/src/modules/kepegawaian/attendance/routes.js:53-67`, `controller.js:80-240`, `service.js:1116-1500`*

| Method & Path | Permission / Middleware | Validasi Input (Payload/Query) | Query / Filter yang Didukung | Struktur Respons Sukses | Kode Error | Pemanggil & Baris |
|---|---|---|---|---|---|---|
| `GET /kepegawaian/leave-requests` | `authenticate` | Query object biasa | `employee_id`, `school_unit_id`, `status`, `leave_type` | `{ success: true, data: [leave_item], message, errors: null }` | 500 | `CutiLembur.jsx:65` |
| `GET /kepegawaian/leave-requests/my` | `authenticate` | Otomatis ambil `user.ref_id` | `status`, `leave_type`, `year` | `{ success: true, data: [leave_item], message, errors: null }` | 500 | `apps/guru/attendanceService.js:50` (`AbsensiPage.jsx:504`) |
| `GET /kepegawaian/leave-requests/:id/attachment` | `authenticate` + Owner/HRD check | `:id` numeric | `download=true`, `raw=true` | `{ success: true, data: { id, attachment_url, attachment_name, mime_type, size, exists_on_disk }, message, errors: null }` (atau binary file download) | 403, 404, 500 | `apps/guru/attendanceService.js:64` |
| `POST /kepegawaian/leave-requests` | `authenticate` | Wajib: `employee_id` (auto jika guru), `leave_type`, `start_date`, `end_date`. Opsional: `reason`, `attachment`, `attachment_name` | Body JSON | `{ success: true, data: created_leave, message: 'Pengajuan cuti/izin berhasil dikirim', errors: null }` | 404 (emp not found), 422 (tipe tidak valid), 500 | `apps/guru/attendanceService.js:57`, `CutiLembur.jsx:107` |
| `PATCH /kepegawaian/leave-requests/:id/approve` | `authenticate`, `requirePermission('kepegawaian.leave_requests.manage')` | `:id` param | Tidak ada | `{ success: true, data: updated_leave, message: 'Pengajuan cuti/izin berhasil disetujui', errors: null }` | 404, 409 (bukan pending), 500 | `CutiLembur.jsx:125` |
| `PATCH /kepegawaian/leave-requests/:id/reject` | `authenticate`, `requirePermission('kepegawaian.leave_requests.manage')` | Wajib: `rejection_reason` / `reason` | Body JSON | `{ success: true, data: updated_leave, message: 'Pengajuan cuti/izin berhasil ditolak', errors: null }` | 404, 409, 422 (alasan kosong), 500 | `CutiLembur.jsx:183` |
| `GET /kepegawaian/overtimes` | `authenticate` | Query object biasa | `employee_id`, `school_unit_id`, `status`, `date_from`, `date_to` | `{ success: true, data: [overtime_item], message, errors: null }` | 500 | `CutiLembur.jsx:79` |
| `GET /kepegawaian/overtimes/my` | `authenticate` | Otomatis ambil `user.ref_id` | `status`, `date_from`, `date_to` | `{ success: true, data: [overtime_item], message, errors: null }` | 500 | `apps/guru/attendanceService.js:71` (`AbsensiPage.jsx:650`) |
| `POST /kepegawaian/overtimes` | `authenticate` | Wajib: `employee_id`, `overtime_date`. Opsional: `start_time`, `end_time`, `hours`, `task_description`, `notes`, `attachment_url` | Body JSON | `{ success: true, data: created_overtime, message: 'Pengajuan lembur berhasil dicatat', errors: null }` | 404, 422, 500 | `apps/guru/attendanceService.js:78`, `CutiLembur.jsx:142` |
| `PATCH /kepegawaian/overtimes/:id/approve` | `authenticate`, `requirePermission('kepegawaian.overtimes.manage')` | `:id` param | Tidak ada | `{ success: true, data: updated_overtime, message: 'Pengajuan lembur berhasil disetujui', errors: null }` | 404, 409, 500 | `CutiLembur.jsx:159` |
| `PATCH /kepegawaian/overtimes/:id/reject` | `authenticate`, `requirePermission('kepegawaian.overtimes.manage')` | Opsional: `rejection_reason` / `notes` | Body JSON | `{ success: true, data: updated_overtime, message: 'Pengajuan lembur ditolak', errors: null }` | 404, 409, 500 | `CutiLembur.jsx:187` |

---

### 2. Endpoint Portal Guru Terkait Cuti & Lembur
*File acuan: `apps/core-portal/src/apps/guru/services/attendanceService.js` & `apps/core-portal/src/apps/guru/pages/AbsensiPage.jsx`*
- **Pengajuan Izin/Cuti Guru:** Mengirim payload `{ leave_type: formLeaveType, start_date, end_date, reason, attachment: base64, attachment_name }` ke `POST /kepegawaian/leave-requests`.
- **Perilaku Saldo di Klien:** Saldo kuota cuti dihitung secara hardcoded di frontend: `const totalQuota = 12;` (`AbsensiPage.jsx:522`). Frontend menghitung pemakaian cuti dengan memfilter `req.status === 'approved' && req.leave_type === 'cuti_tahunan'`.
- **Validasi Klien:** File lampiran dibatasi max 5 MB, tipe MIME: PDF, JPG, PNG, WebP (`AbsensiPage.jsx:59-60`).

---

### 3. Endpoint Pegawai untuk Dropdown & Filter
*File: `apps/api-backend/src/modules/kepegawaian/employees/`*
- `GET /kepegawaian/employees`: Mendukung filter `school_unit_id`, `employment_status`, `account_status`, `search` (nama/NIP/NIK), `page`, `per_page`.
- Digunakan oleh `CutiLembur.jsx:90` untuk mengisi dropdown pegawai pemohon.

---

### 4. Endpoint Jabatan & Satuan Pendidikan
- Satuan Pendidikan: `GET /core/school-units` (dari Core API)
- Jabatan: `GET /kepegawaian/job-positions` (mengembalikan hierarki `id`, `name`, `level`, `parent_position_id`, `school_unit_id`).

---

### 5. Status Endpoint Kalender, Libur, Saldo, Ringkasan/Laporan, dan Ekspor Cuti/Lembur
- **Endpoint Kalender Ketidakhadiran:** **BELUM ADA**
- **Endpoint Master Hari Libur Kepegawaian:** **BELUM ADA**
- **Endpoint Master Saldo Cuti & Ledger:** **BELUM ADA**
- **Endpoint Rekap / Statistik Cuti & Lembur:** **BELUM ADA**
- **Endpoint Ekspor XLSX / PDF Cuti & Lembur:** **BELUM ADA**

---

### 6. Ketidakkonsistensi Kontrak & Bug yang Ditemukan
- **Bug Mismatch `leave_type` di `CutiLembur.jsx`:**
  - Pada `CutiLembur.jsx:36`, state default adalah `leave_type: 'Cuti Tahunan'` (Title Case dengan spasi).
  - Pada backend `attendance/service.js:9-17`, `VALID_LEAVE_TYPES` adalah `['sakit', 'izin_pribadi', 'cuti_tahunan', 'cuti_melahirkan', 'cuti_khusus', 'dinas_luar', 'lainnya']`.
  - Fungsi `createLeaveRequest` melakukan `.trim().toLowerCase()` menghasilkan `'cuti tahunan'` (spasi, bukan underscore).
  - Akibatnya, pengajuan cuti melalui modal HRD di `CutiLembur.jsx` akan **selalu gagal dengan error 422: `Jenis izin 'Cuti Tahunan' tidak valid`**.
  - Sebaliknya, Portal Guru (`AbsensiPage.jsx:62-69`) sudah menggunakan snake_case yang benar (`cuti_tahunan`, `izin_pribadi`, `sakit`, dll).

---

## BAGIAN C — Database Kepegawaian yang Sudah Ada

Hasil eksekusi query `SHOW CREATE TABLE` dan `SHOW TABLES` pada basis data aktif (`u622997391_kepegawaian`, `u622997391_core`, `u622997391_akademik`):

### 1. DDL Aktual & Jumlah Baris Tabel Utama

```sql
-- 1. employee_leave_requests (Jumlah Baris: 0)
CREATE TABLE `employee_leave_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `school_unit_id` bigint(20) unsigned NOT NULL,
  `leave_type` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text DEFAULT NULL,
  `attachment_url` varchar(255) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_mime_type` varchar(100) DEFAULT NULL,
  `attachment_size_bytes` bigint(20) unsigned DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `employee_leave_requests_employee_id_foreign` (`employee_id`),
  KEY `employee_leave_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `employee_leave_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_leave_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. employee_overtimes (Jumlah Baris: 0)
CREATE TABLE `employee_overtimes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `school_unit_id` bigint(20) unsigned NOT NULL,
  `overtime_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `actual_start_time` time DEFAULT NULL,
  `actual_end_time` time DEFAULT NULL,
  `hours` decimal(4,2) NOT NULL,
  `task_description` text DEFAULT NULL,
  `attachment_url` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `employee_overtimes_employee_id_foreign` (`employee_id`),
  KEY `employee_overtimes_approved_by_foreign` (`approved_by`),
  CONSTRAINT `employee_overtimes_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_overtimes_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. employees (Jumlah Baris: 41)
CREATE TABLE `employees` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `school_unit_id` bigint(20) unsigned NOT NULL,
  `employee_number` varchar(50) NOT NULL,
  `nik` varchar(20) DEFAULT NULL,
  `nip` varchar(30) DEFAULT NULL,
  `nuptk` varchar(30) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `academic_title` varchar(100) DEFAULT NULL,
  `mother_name` varchar(150) DEFAULT NULL,
  `citizenship` varchar(50) DEFAULT 'Indonesia',
  `birth_place` varchar(100) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('male','female') NOT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `marital_status` enum('single','married','divorced','widowed') DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `current_position_id` bigint(20) unsigned DEFAULT NULL,
  `current_rank` varchar(100) DEFAULT NULL,
  `employment_status` varchar(50) NOT NULL,
  `account_status` enum('active','inactive','resigned','retired') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_employee_number_unique` (`employee_number`),
  UNIQUE KEY `employees_nuptk_unique` (`nuptk`),
  UNIQUE KEY `employees_nik_unique` (`nik`),
  KEY `idx_employees_school_unit` (`school_unit_id`),
  KEY `fk_employees_position` (`current_position_id`),
  CONSTRAINT `fk_employees_position` FOREIGN KEY (`current_position_id`) REFERENCES `job_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. job_positions (Jumlah Baris: 7)
CREATE TABLE `job_positions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `school_unit_id` bigint(20) unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `level` int(10) unsigned DEFAULT NULL,
  `parent_position_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_positions_parent_position_id_foreign` (`parent_position_id`),
  CONSTRAINT `job_positions_parent_position_id_foreign` FOREIGN KEY (`parent_position_id`) REFERENCES `job_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. employee_position_history (Jumlah Baris: 2)
CREATE TABLE `employee_position_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `position_id` bigint(20) unsigned DEFAULT NULL,
  `rank` varchar(100) DEFAULT NULL,
  `document_type` enum('pengangkatan','spk','penugasan','jabatan_internal') NOT NULL DEFAULT 'jabatan_internal',
  `document_number` varchar(100) DEFAULT NULL,
  `validity_years` smallint(6) DEFAULT NULL,
  `evaluation_note` text DEFAULT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `employee_position_history_position_id_foreign` (`position_id`),
  KEY `idx_eph_employee_date` (`employee_id`,`effective_date`),
  CONSTRAINT `employee_position_history_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `employee_position_history_position_id_foreign` FOREIGN KEY (`position_id`) REFERENCES `job_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. employee_attendances (Jumlah Baris: 1)
CREATE TABLE `employee_attendances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `school_unit_id` bigint(20) unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `check_in_time` time DEFAULT NULL,
  `check_in_latitude` decimal(10,8) DEFAULT NULL,
  `check_in_longitude` decimal(11,8) DEFAULT NULL,
  `check_in_distance_meters` decimal(10,2) DEFAULT NULL,
  `check_in_accuracy_meters` decimal(10,2) DEFAULT NULL,
  `check_in_device_info` text DEFAULT NULL,
  `check_in_notes` text DEFAULT NULL,
  `is_within_radius` tinyint(1) NOT NULL DEFAULT 1,
  `is_late` tinyint(1) NOT NULL DEFAULT 0,
  `late_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `check_out_time` time DEFAULT NULL,
  `check_out_latitude` decimal(10,8) DEFAULT NULL,
  `check_out_longitude` decimal(11,8) DEFAULT NULL,
  `check_out_distance_meters` decimal(10,2) DEFAULT NULL,
  `check_out_accuracy_meters` decimal(10,2) DEFAULT NULL,
  `check_out_device_info` text DEFAULT NULL,
  `check_out_notes` text DEFAULT NULL,
  `is_early_departure` tinyint(1) NOT NULL DEFAULT 0,
  `early_departure_minutes` int(10) unsigned NOT NULL DEFAULT 0,
  `matched_location_id` bigint(20) unsigned DEFAULT NULL,
  `matched_schedule_id` bigint(20) unsigned DEFAULT NULL,
  `status` enum('present','sick','permitted','absent') NOT NULL,
  `sub_status` varchar(50) DEFAULT NULL,
  `entry_type` varchar(32) DEFAULT 'realtime_gps',
  `anomaly_flags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`anomaly_flags`)),
  `is_anomaly` tinyint(1) DEFAULT 0,
  `anomaly_resolved` tinyint(1) DEFAULT 0,
  `anomaly_resolved_by` bigint(20) unsigned DEFAULT NULL,
  `anomaly_resolved_at` timestamp NULL DEFAULT NULL,
  `anomaly_resolution_notes` text DEFAULT NULL,
  `is_clarification_needed` tinyint(1) DEFAULT 0,
  `clarification_status` varchar(32) DEFAULT 'none',
  `clarification_type` varchar(50) DEFAULT NULL,
  `proposed_check_in_time` time DEFAULT NULL,
  `proposed_check_out_time` time DEFAULT NULL,
  `proposed_status` varchar(32) DEFAULT NULL,
  `proposed_sub_status` varchar(50) DEFAULT NULL,
  `proposed_changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`proposed_changes`)),
  `clarification_reason` text DEFAULT NULL,
  `clarification_attachment_url` text DEFAULT NULL,
  `clarification_submitted_at` timestamp NULL DEFAULT NULL,
  `clarification_reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `clarification_reviewed_at` timestamp NULL DEFAULT NULL,
  `clarification_review_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_employee_date` (`employee_id`,`attendance_date`),
  KEY `idx_att_school_unit_date` (`school_unit_id`,`attendance_date`),
  KEY `idx_att_date` (`attendance_date`),
  KEY `idx_att_school_unit_clarification` (`school_unit_id`,`clarification_status`),
  KEY `idx_att_school_unit_anomaly` (`school_unit_id`,`is_anomaly`,`anomaly_resolved`),
  CONSTRAINT `employee_attendances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. attendance_work_schedules (Jumlah Baris: 1)
-- 8. employee_work_schedule_assignments (Jumlah Baris: 41)
-- 9. attendance_locations (Jumlah Baris: 1)
-- 10. payroll_periods (Jumlah Baris: 3)
-- 11. payroll_items (Jumlah Baris: 80)
-- 12. payroll_audit_logs (Jumlah Baris: 94)
-- 13. attendance_period_locks (Jumlah Baris: 1)
-- 14. attendance_audit_logs (Jumlah Baris: 7)
-- 15. employee_mutations (Jumlah Baris: 0)
```

---

### 2. Pencarian Tabel Terkait Cuti, Lembur, Kalender, Saldo, Notifikasi
- **Database Kepegawaian (`u622997391_kepegawaian`):**
  - `employee_leave_requests`: Pengajuan cuti & izin pegawai (Status: Ada)
  - `employee_overtimes`: Penugasan lembur (Status: Ada)
  - `attendance_period_locks`: Penguncian periode absensi (Status: Ada)
  - `attendance_audit_logs`: Audit trail absensi (Status: Ada)
  - `payroll_audit_logs`: Audit trail payroll (Status: Ada)
  - *Tabel Master Cuti, Saldo, Ledger, Master Libur:* **BELUM ADA**
- **Database Core (`u622997391_core`):**
  - `permissions`: Master izin sistem (Status: Ada)
  - `system_settings`: Pengaturan konfigurasi key-value (Status: Ada)
- **Database Akademik (`u622997391_akademik`):**
  - `academic_calendar_events`: Event kalender pendidikan & libur sekolah (Status: Ada, 0 baris)
  - `calendar_document_versions`: Dokumen kalender akademik (Status: Ada, 0 baris)
  - `student_leave_requests`: Izin santri/siswa (Status: Ada, modul akademik)

---

### 3. Migrasi Knex Terbaru di Modul Kepegawaian
10 migrasi terakhir pada `db/migrations/kepegawaian/`:
1. `20261007230001_add_performance_indexes_to_attendances.js` (Batch 25)
2. `20261007223001_make_attendance_audit_logs_attendance_id_nullable.js` (Batch 24)
3. `20261007220001_expand_attendance_period_locks_lifecycle.js` (Batch 23)
4. `20261007210001_add_proposed_changes_to_employee_attendances.js` (Batch 22)
5. `20261007200001_create_attendance_period_locks_and_audit_logs.js` (Batch 21)
6. `20261007190001_add_clarification_columns_to_employee_attendances.js` (Batch 20)
7. `20261007180001_add_custom_day_schedules_to_attendance_work_schedules.js` (Batch 19)
8. `20261007170001_add_is_default_to_attendance_locations_and_location_to_assignments.js` (Batch 18)
9. `20261007160001_add_custom_day_schedules_to_schedule_assignments.js` (Batch 17)
10. `20261007150001_add_days_of_week_to_attendance_work_schedules.js` (Batch 16)
*(Catatan: Migrasi `20261006140004_add_attachment_and_leave_types_to_employee_leave_requests.js` menambahkan kolom attachment pada `employee_leave_requests` pada Batch 14).*

---

### 4. Index & Foreign Key Constraints pada Cuti & Lembur
- `employee_leave_requests`:
  - PK: `id`
  - FK `employee_id` $\rightarrow$ `employees.id` (RESTRICT)
  - FK `approved_by` $\rightarrow$ `employees.id` (RESTRICT)
  - Kolom `status`: `ENUM('pending', 'approved', 'rejected')` (Constraint enum ketat; status baru seperti `'cancelled'` atau `'revision_requested'` memerlukan `ALTER TABLE`).
  - Kolom `leave_type`: `VARCHAR(100)` (Fleksibel, bisa menerima string jenis cuti apa pun).
- `employee_overtimes`:
  - PK: `id`
  - FK `employee_id` $\rightarrow$ `employees.id` (RESTRICT)
  - FK `approved_by` $\rightarrow$ `employees.id` (RESTRICT)
  - Kolom `status`: `ENUM('pending', 'approved', 'rejected')`.

---

### 5. Kelengkapan Kolom untuk Perhitungan Jatah Cuti & Approval
Berdasarkan query statistik agregat 41 pegawai aktif:
- `gender`: **100% terisi** (31 Laki-laki, 10 Perempuan). Memenuhi syarat untuk aturan cuti melahirkan / khitan anak.
- `marital_status`: **100% terisi** (28 Menikah, 13 Lajang). Memenuhi syarat untuk aturan cuti menikah / istri melahirkan.
- `employment_status`: **100% terisi** (19 GTY, 10 PTY, 7 PNS, 5 Pelatih Ekskul). Memenuhi syarat untuk aturan hak cuti tahunan (mis. hanya GTY & PTY).
- `school_unit_id`: **100% terisi** (seluruh 41 pegawai terdaftar pada `school_unit_id: 1` - SMP Aldepos).
- `hire_date` / Tanggal Pengangkatan: **BELUM ADA kolom langsung di tabel `employees`**. Tanggal efektif pengangkatan tersimpan di `employee_position_history.effective_date` (namun baru 1 pegawai yang memiliki riwayat di tabel ini, tanggal: `2024-07-01`). Fallback tanggal masuk dapat menggunakan `employees.created_at`.
- `current_position_id`: Terisi 7 dari 41 pegawai (17.1%). Sisanya bernilai `NULL`.

---

### 6. Struktur Hierarki Jabatan & Pengenalan "Kepala Sekolah"
Tabel `job_positions` (seluruhnya `school_unit_id = 1`):
1. ID 1: **Kepala Sekolah** (`level: 1`, `parent_position_id: NULL`)
2. ID 2: **Wakil Kepala Sekolah** (`level: 2`, `parent_position_id: 1`)
3. ID 3: **Guru Kelas** (`level: 3`, `parent_position_id: 2`)
4. ID 4: **Staf Tata Usaha** (`level: 2`, `parent_position_id: 1`)
5. ID 5: **Kepala Kerumahtanggaan** (`level: 2`, `parent_position_id: 1`)
6. ID 6: **Pelatih / Pembina Ekstrakurikuler** (`level: 3`, `parent_position_id: 2`)
7. ID 7: **Guru Tamu / Instruktur Ahli** (`level: 3`, `parent_position_id: 2`)

**Cara Mengenali Approver Kepala Sekolah:**
Kepala Sekolah per satuan pendidikan dapat dikenali secara andal melalui:
`SELECT e.id FROM employees e JOIN job_positions jp ON e.current_position_id = jp.id WHERE jp.school_unit_id = ? AND (jp.level = 1 OR jp.name LIKE '%Kepala Sekolah%') AND e.account_status = 'active' LIMIT 1`.

---

## BAGIAN D — Keterkaitan dengan Modul dan Database Lain

Sesuai aturan arsitektur monorepo Core Aldepos pada `AGENTS.md` (Aturan 1: *Satu database per modul, dilarang JOIN lintas database*), seluruh integrasi lintas modul wajib dilakukan via in-process service call.

### 1. Presensi (`apps/api-backend/src/modules/kepegawaian/attendance/`)
- **Kondisi Saat Ini:**
  - `calendarService.getEffectiveWorkDays` (`calendarService.js:135-139`) sudah membaca `employee_leave_requests` berstatus `'approved'` untuk menandai tanggal cuti pegawai (`is_on_approved_leave: true`).
  - Sinkronisasi balik: Saat cuti disetujui, backend **BELUM** secara otomatis menginsert/mengupdate baris ke `employee_attendances`.
- **Risiko Perubahan:** Jika status cuti berubah di luar `'approved'`, fungsi `getEffectiveWorkDays` tidak akan mengenali cuti tersebut dan menganggap pegawai alpa jika tidak ada check-in.

---

### 2. Penggajian / Payroll (`apps/api-backend/src/modules/kepegawaian/payroll/service.js`)
- **Kondisi Saat Ini:**
  - Pada `payroll/service.js:138-150`, komponen gaji (`salaryComponents`) dan potongan (`deductions`) saat ini di-generate dengan nilai default hardcoded (`gaji_pokok`, `tunjangan_jabatan`, `potongan_alpa: 0`, `bpjs: 50000`).
  - Belum ada pembacaan riwayat cuti tanpa gaji (`unpaid leave`) atau jam lembur yang disetujui ke `payroll_items`.
- **Titik Sambung Aman di Masa Depan:**
  - Fungsi `calculatePeriod` di `payroll/service.js:119` adalah titik sambung utama: membaca rekapitulasi dari `attendance_period_locks.summary_snapshot` atau service call ke `attendanceService.getMonthlySummary` untuk menghitung total lembur (insentif) dan total izin/cuti tanpa gaji (potongan).

---

### 3. Portal Guru (`apps/core-portal/src/apps/guru/`)
- **Titik Sambung:**
  - `attendanceService.js:49-79` memanggil endpoint `/kepegawaian/leave-requests/my`, `POST /kepegawaian/leave-requests`, dan `/kepegawaian/overtimes/my`.
  - `AbsensiPage.jsx:501-640` membaca daftar izin dan mengirim form cuti.
- **Risiko Regresi:** Kontrak request/response endpoint `/leave-requests` dan `leave_type` snake_case (`cuti_tahunan`, `sakit`, dll) TIDAK BOLEH diubah agar Portal Guru tidak mengalami runtime error.

---

### 4. Data Pegawai, Dashboard Kepegawaian & Kinerja
- `apps/api-backend/src/modules/kepegawaian/employees/service.js`: Membaca relasi pegawai.
- Dashboard Kepegawaian (`apps/core-portal/src/apps/kepegawaian/pages/Dashboard.jsx`): Menampilkan statistik headcount pegawai.

---

### 5. Modul Akademik (Kalender Akademik)
- **Tabel:** `academic_calendar_events` di database `u622997391_akademik` (kolom: `id`, `school_unit_id`, `academic_year_id`, `title`, `start_date`, `end_date`, `is_holiday`, `holiday_type`).
- **Pola Service Lintas Modul:** Modul Kepegawaian memanggil service Akademik secara in-process:
  `const academicCalendarService = require('../../akademik/calendar/service');`
  Fungsi ini mengeksekusi query Knex pada instance db Akademik dan mengembalikan array event ke memori Kepegawaian tanpa query raw SQL `JOIN` lintas database.

---

### 6. Core (Users, Roles, Permissions)
- **Tabel `users` (`u622997391_core`):** Kolom `ref_type` (`'staff'`) dan `ref_id` (`employees.id`) menghubungkan akun login user ke pegawai.
- **Permission Terdaftar untuk Cuti & Lembur:**
  - `kepegawaian.leave_requests.manage` (ID 122)
  - `kepegawaian.overtimes.manage` (ID 123)
  - `kepegawaian.attendances.manage` (ID 120)
  - `kepegawaian.attendances.read` (ID 121)
- **Role Pemilik Permission:**
  - `super_admin`, `admin_yayasan`, `hrd`, `admin_satuan_pendidikan` memiliki permission `kepegawaian.leave_requests.manage` dan `kepegawaian.overtimes.manage`.
  - `guru` dan `staf` memiliki permission `kepegawaian.view` dan membuat pengajuan sendiri via endpoint `/leave-requests` (self-service).

---

## BAGIAN E — Infrastruktur Pendukung

### 1. Notifikasi
- **In-App / Email / WhatsApp / Push:** **BELUM ADA** infrastruktur notifikasi aktif untuk cuti & lembur.
- Variabel lingkungan terkait yang disiapkan (nama saja): `SMTP_HOST`, `SMTP_USER`, `WA_GATEWAY_URL`.

### 2. Upload Berkas Lampiran
- **Konfigurasi Backend:** `attendance/service.js:1080-1111` (`_saveLeaveAttachment`).
- **Mekanisme:** Mendukung base64 buffer write dan multipart URL.
- **Direktori Penyimpanan:** `apps/api-backend/public/uploads/leave-attachments/`.
- **Proteksi Akses:** Endpoint `GET /kepegawaian/leave-requests/:id/attachment` memverifikasi otorisasi: hanya pemilik izin (`user.ref_id === employee_id`) atau user berizin `kepegawaian.leave_requests.manage` / role HRD yang diizinkan mengunduh berkas (`service.js:1207-1219`).
- **Lembur:** Kolom `attachment_url` sudah ada di tabel `employee_overtimes`, namun belum memiliki helper upload khusus.

### 3. Ekspor (Excel & PDF)
- Backend menggunakan **`xlsx`** (v0.18.5) dan **`pdfkit`** (v0.20.2) seperti yang diimplementasikan pada `attendance/service.js:2000-2200` (`exportMonthlyExcel` & `exportMonthlyPdf`).
- Pola ini dapat digunakan langsung untuk mengekspor rekapitulasi Cuti dan Lembur.

### 4. Frontend Libraries & Shared Components
- **Library Terpasang (`core-portal`):** `react` 18.3.1, `lucide-react` 0.395.0, `date-fns` 3.6.0, `xlsx` 0.18.5, `react-day-picker` 10.0.1.
- **Library Chart / Kalender:** **BELUM ADA** `recharts`, `chart.js`, atau `fullcalendar`. Grafik diimplementasikan menggunakan visualisasi CSS bar/SVG native atau token Tailwind.
- **Komponen Bersama di `apps/core-portal/src/shared/components/`:**
  - `DataTable.jsx`: Table dengan sorting, custom cell render, selection checkbox, pagination.
  - `Modal.jsx`: Dialog modal responsive dengan backdrop blur.
  - `Drawer.jsx`: Off-canvas sliding drawer kanan untuk detail record.
  - `FilterBar.jsx`: Toolbar pencarian dan filter dropdown.
  - `DatePickerField.jsx`: Input pemilih tanggal tunggal/rentang.
  - `StatusPill.jsx` / `StatusBadge.jsx`: Badge status dengan varian warna (success, danger, warning, neutral).
  - `Toast.jsx`: Notifikasi toast interaktif (success, error, info).
  - `LoadingSkeleton.jsx` & `EmptyState.jsx`.

### 5. Registrasi Halaman & Routing
- `router.jsx:218-225`: Rute `/kepegawaian/leaves-overtimes` dan `/kepegawaian/cuti-lembur` memuat lazy component `CutiLembur.jsx`.
- `KepegawaianLayout.jsx:96-99`: Menu item "Cuti & Lembur" terdaftar pada sidebar navigasi kepegawaian.

### 6. Pengaturan Modul
- Pola pengaturan modul di Kepegawaian menggunakan tabel `attendance_work_schedules` dan `attendance_locations` dengan route terpisah di `PengaturanAbsensi.jsx`.
- Pola yang sama akan digunakan untuk master jenis cuti dan kalender libur.

### 7. Job Terjadwal / Cron
- **Mekanisme Cron Backend:** **BELUM ADA** library cron runner (`node-cron` / agenda) di backend. Reset kuota tahunan dan expired saldo cuti saat ini perlu dieksekusi via endpoint trigger atau script CLI.

---

## BAGIAN F — Kondisi Halaman Saat Ini

### 1. Struktur `CutiLembur.jsx` Saat Ini
- **Komponen Utama:** Single-page view dengan 2 Tab (`'leaves'` dan `'overtimes'`).
- **Fitur Berfungsi:**
  - Fetch list cuti & lembur dengan filter `school_unit_id`.
  - Tombol persetujuan (Approve) cuti dan lembur.
  - Modal penolakan (Reject) dengan input alasan penolakan.
  - Modal input pengajuan cuti dan lembur oleh HRD (atas nama pegawai).
- **Fitur Placeholder / Belum Ada di Halaman HRD:**
  - Belum ada tab Saldo Cuti (Buku Besar Kuota).
  - Belum ada tab Kalender Ketidakhadiran.
  - Belum ada tab Laporan & Grafik Analitik.
  - Belum ada Drawer Detail Pengajuan.
  - Belum ada Filter Periode (Bulan ini / Semester) dan Bulk Action.

### 2. Alur Pengajuan: Pegawai (Portal Guru) vs HRD
- **Pegawai (Portal Guru):** Mengajukan mandiri via `AbsensiPage.jsx` $\rightarrow$ `POST /kepegawaian/leave-requests` $\rightarrow$ `employee_id` otomatis terkunci ke `user.ref_id` $\rightarrow$ Status awal `pending`.
- **HRD:** Mengajukan atas nama pegawai via `CutiLembur.jsx` $\rightarrow$ Memilih pegawai dari dropdown.
- **Pembatalan:** Pegawai **belum memiliki fitur membatalkan** pengajuannya sendiri jika masih `pending`.
- **Audit Approval:** Approval/Penolakan mencatat `approved_by` (ID approver) dan `approved_at` (`NOW()`), serta `rejection_reason` jika ditolak.

### 3. Penanganan Zona Waktu & Format Tanggal
- Kolom database: `start_date`, `end_date`, `overtime_date` bertipe `DATE` (format `YYYY-MM-DD`).
- Kolom audit: `approved_at`, `created_at` bertipe `TIMESTAMP`.
- Waktu kerja: Format WIB (UTC+7). Penggunaan string slicing `YYYY-MM-DD` pada input date HTML mencegah pergeseran tanggal akibat timezone offset JavaScript.

---

## BAGIAN G — Data Aktual (Agregat)

Berdasarkan inspeksi langsung pada database aktif:

1. **Jumlah Baris Data:**
   - `employees`: **41 orang** (40 aktif, 1 non-aktif; seluruhnya unit `school_unit_id: 1` - SMP Aldepos).
   - `employee_leave_requests`: **0 baris** (bersih, belum ada data uji tersimpan).
   - `employee_overtimes`: **0 baris** (bersih).
   - `employee_attendances`: **1 baris** (data uji presensi).
   - `payroll_periods`: **3 periode** (Januari, Februari, Maret 2026).
   - `payroll_items`: **80 slip gaji**.
2. **Demografi Pegawai untuk Aturan Cuti:**
   - Jenis Kelamin: 31 Laki-laki (75.6%), 10 Perempuan (24.4%) — Kelengkapan 100%.
   - Status Pernikahan: 28 Menikah (68.3%), 13 Lajang (31.7%) — Kelengkapan 100%.
   - Status Kepegawaian: 19 GTY (46.3%), 10 PTY (24.4%), 7 PNS (17.1%), 5 Pelatih Ekskul (12.2%) — Kelengkapan 100%.
   - Tanggal Pengangkatan (`hire_date`): Baru 1 pegawai terdata di `employee_position_history`.
3. **Satuan Pendidikan & Kepala Sekolah:**
   - Satuan Pendidikan aktif: **SMP Aldepos Boarding School** (`id: 1`).
   - Kepala Sekolah terdata di `job_positions` (ID 1, Level 1).
4. **Kalender Akademik (`academic_calendar_events`):**
   - 0 baris event di database Akademik saat ini.

---

## BAGIAN H — Status Pekerjaan Presensi yang Sedang Berjalan

Pekerjaan Halaman Presensi & Absensi Pegawai (Tahap 1–10) telah selesai dan terdokumentasi pada `IMPLEMENTASI-PRESENSI.md`:
1. **Branch Aktif:** `main` (pekerjaan presensi telah selesai dan diverifikasi pada 2026-10-07).
2. **Komponen Backend yang Sudah Ada & Siap Dipakai Cuti:**
   - `calendarService.js` (`apps/api-backend/src/modules/kepegawaian/attendance/calendarService.js`):
     - `resolveEmployeeSchedule(employeeId, schoolUnitId, dateStr)`: Resolusi jam kerja harian pegawai.
     - `getEffectiveWorkDays(employeeId, schoolUnitId, startDate, endDate)`: Perhitungan hari kerja efektif pegawai dengan deteksi approved leave.
   - `attendance_period_locks`: Tabel kunci periode presensi dengan 4 status lifecycle (`open` $\rightarrow$ `review` $\rightarrow$ `locked` $\rightarrow$ `submitted_to_payroll`).
   - `attendance_audit_logs`: Audit trail untuk seluruh mutasi presensi & absensi.
3. **Migrasi Terkait:** Migrasi batch 11–25 telah dieksekusi dengan aman pada DB Kepegawaian. Tidak ada konflik nama atau penomoran migrasi.
4. **Dampak Keputusan Presensi terhadap Cuti:**
   - Status cuti pada presensi direpresentasikan sebagai `status = 'permitted'` dengan `sub_status = 'cuti'`.
   - Hak akses approval presensi dan cuti telah diselaraskan dengan permission `kepegawaian.leave_requests.manage` dan `kepegawaian.overtimes.manage`.

---

## BAGIAN I — Keamanan dan Hak Akses

### 1. Proteksi Anti-IDOR pada Pengajuan Mandiri
- **Pemeriksaan Kode (`attendance/service.js:1257-1262`):**
  ```javascript
  // Proteksi IDOR: Jika staff/guru self-service, wajib memakai ref_id miliknya sendiri
  if (user && (user.ref_type === 'staff' || user.ref_type === 'teacher') && !isHRDOrAdmin) {
    employee_id = user.ref_id;
  }
  ```
  User biasa (guru/staf) **tidak dapat memanipulasi `employee_id`** untuk membuat pengajuan atas nama orang lain.
- **Proteksi Lampiran (`service.js:1207-1219`):** Endpoint attachment memverifikasi bahwa pengunduh adalah pemilik dokumen (`user.ref_id === leave.employee_id`) atau HRD/Admin Yayasan.

### 2. Penegakan Filter Satuan Pendidikan di Backend
- **Pemeriksaan Kode (`attendance/service.js:23-47`):** Helper `_resolveEffectiveSchoolUnit` mengunci user non-privileged ke `school_unit_id` yang tertera pada klaim JWT mereka, mengabaikan manipulasi query string.

### 3. Hak Akses Approval & Pencegahan Transisi Ilegal
- **Pemeriksaan Kode (`attendance/service.js:1324-1328` & `1350-1354`):**
  - Hanya user berizin `kepegawaian.leave_requests.manage` atau `kepegawaian.overtimes.manage` yang dapat memanggil route approve/reject (`routes.js:57-58, 66-67`).
  - Backend memvalidasi `if (leave.status !== 'pending') throw new Error('sudah diproses', 409)` sehingga status yang sudah disetujui/ditolak tidak dapat di-overwrite tanpa audit khusus.

### 4. Perlindungan Periode Terkunci
- Seluruh mutasi data absensi diverifikasi terhadap `attendance_period_locks`. Jika periode bulan tersebut berstatus `'locked'` atau `'submitted_to_payroll'`, operasi tulis akan ditolak dengan error 409 Conflict.

---

## BAGIAN J — Ringkasan dan Rekomendasi Singkat

### 1. Ringkasan Kesiapan Sistem
1. Fondasi skema database dasar (`employee_leave_requests`, `employee_overtimes`, `employees`, `job_positions`) telah tersedia dan sinkron tanpa schema drift.
2. Endpoint dasar pengajuan dan approval cuti/lembur telah berjalan di backend dan Portal Guru (`AbsensiPage.jsx`), dengan proteksi anti-IDOR dan otorisasi JWT.
3. Desain Stitch (12 subfolder) menuntut fitur enterprise yang substansial: Master Konfigurasi Jenis Cuti, Master Saldo & Ledger Mutasi Cuti, Kalender Visual Ketidakhadiran, Perhitungan Upah Lembur, Deteksi Bentrok, dan Laporan/Grafik.
4. Terdapat satu bug kontrak kritis pada halaman lama `CutiLembur.jsx` (penggunaan `'Cuti Tahunan'` spasi alih-alih snake_case `'cuti_tahunan'`) yang menyebabkan pengajuan via modal HRD selalu gagal 422.
5. `calendarService` yang dibangun pada pekerjaan Presensi siap dipakai sebagai engine komputasi hari kerja efektif untuk modul Cuti.

---

### 2. Urutan Ketergantungan Implementasi (Dependency Chain)

```
[1. Master Hari Libur & Kalender] ──► [2. Engine Hari Kerja Efektif]
                                                 │
                                                 ▼
[3. Master Jenis Cuti & Kebijakan] ──► [4. Master Saldo & Ledger Cuti]
                                                 │
                                                 ▼
[5. Alur Pengajuan, Deteksi Bentrok & Approval Bertingkat (Cuti & Lembur)]
                                                 │
                                                 ▼
[6. Sinkronisasi Otomatis ke Presensi (employee_attendances)]
                                                 │
                                                 ▼
[7. Laporan, Kalender Visual Ketidakhadiran & Ekspor XLSX/PDF]
                                                 │
                                                 ▼
[8. Integrasi Data ke Modul Penggajian (Payroll)]
```

---

### 3. Daftar Risiko Utama (Diurutkan Berdasarkan Keparahan)

| No | Risiko | Tingkat Keparahan | Mitigasi |
|---|---|---|---|
| 1 | **Regresi Kontrak API Portal Guru** | **KRITIS** | Jangan mengubah endpoint `/leave-requests/my` dan pastikan enum `VALID_LEAVE_TYPES` tetap mendukung seluruh jenis cuti yang sudah dipakai guru di `AbsensiPage.jsx`. |
| 2 | **Inkonsistensi Saldo Cuti Tanpa Ledger** | **TINGGI** | Wajib menggunakan tabel mutasi (`employee_leave_balance_mutations`) dengan transaksi DB Knex (`trx`) saat cuti diajukan, disetujui, atau dibatalkan. |
| 3 | **Ketiadaan Data `hire_date` Pegawai** | **SEDANG** | Buat fallback yang jelas: jika `employee_position_history.effective_date` belum ada, gunakan `employees.created_at` untuk menghitung masa kerja dan hak cuti tahunan. |
| 4 | **Perhitungan Hari Lembur Tanpa Master Tarif** | **SEDANG** | Buat master konfigurasi tarif lembur per jam di DB sebelum menampilkan estimasi upah pada tabel penugasan lembur. |

---

### 5. Daftar Pertanyaan Kebijakan Yayasan (Perlu Konfirmasi Pemilik Proyek)

Berikut adalah nilai-nilai default yang diasumsikan pada placeholder desain Stitch (`code.html`) yang membutuhkan keputusan resmi kebijakan Yayasan Aldepos:

1. **Jatah Cuti Tahunan:** Apakah jatah cuti pokok seluruh pegawai tetap/GTY adalah **12 hari per tahun** (seperti pada desain), atau bervariasi berdasarkan masa kerja/status kepegawaian?
2. **Masa Berlaku & Carry Over:** Apakah sisa cuti tahun lalu boleh di-carry over ke tahun berikutnya? Jika ya, berapa maksimal hari (mis. max 6 hari) dan kapan batas kedaluwarsanya (mis. 31 Maret / 30 Juni)?
3. **Periode Siklus Cuti:** Apakah perhitungan cuti tahunan mengikuti **Tahun Kalender (Januari–Desember)** atau **Tahun Ajaran Pendidikan (Juli–Juni)**?
4. **Cuti Bersama Memotong Cuti Tahunan:** Apakah cuti bersama Idulfitri/Pemerintah otomatis mengurangi kuota cuti tahunan pegawai sekolah?
5. **Batas Maksimal Cuti Khusus:** Berapa hari jatah yang diberikan untuk masing-masing cuti khusus yayasan:
   - Cuti Melahirkan (placeholder desain: 90 hari / 3 bulan kalender)
   - Cuti Suami (Istri Melahirkan) (placeholder: 2 hari kerja)
   - Cuti Menikah Pegawai (placeholder: 3 hari kerja)
   - Cuti Menikahkan Anak (placeholder: 2 hari kerja)
   - Cuti Duka / Kematian Keluarga Inti (placeholder: 2 hari kerja)
   - Cuti Khitanan / Baptis Anak (placeholder: 2 hari kerja)
   - Cuti Ibadah Haji / Umrah (placeholder: 40 hari / 14 hari)
6. **Kebijakan Penggajian (Payroll Impact):**
   - Apakah izin sakit (dengan surat dokter) dibayar 100% gaji pokok?
   - Apakah izin pribadi memotong tunjangan kehadiran harian atau gaji pokok?
   - Kategori cuti apa saja yang berstatus *Unpaid Leave* (potong gaji proporsional)?
7. **Standar Tarif & Pengali Lembur:** Berapa tarif dasar lembur per jam yayasan (mis. nominal flat Rp 25.000/jam atau formula ketenagakerjaan `1/173 x Gaji Pokok`), dan apakah hari libur menggunakan pengali 2.0x?
8. **Hierarki Approval:** Apakah seluruh pengajuan cuti guru wajib disetujui Kepala Sekolah terlebih dahulu sebelum difinalisasi oleh HRD, atau cukup 1 level persetujuan HRD?

---

*Laporan ini disusun secara otomatis berdasarkan audit READ-ONLY terhadap kode sumber, database aktif, dan spesifikasi desain Stitch.*