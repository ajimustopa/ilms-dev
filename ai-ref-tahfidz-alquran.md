# AI-REF: Modul Tahfidz & Al-Qur'an (`alquran`)

> Dokumen referensi teknis modul Tahfidz & Al-Qur'an untuk AI Agent. Data diambil langsung dari 4 berkas migrasi Knex aktual, router/controller backend `apps/api-backend/src/modules/alquran/`, dan router frontend portal `apps/core-portal/src/apps/alquran/`.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/alquran/` *(folder backend & subfolder bernama `alquran`)*
- **Path Frontend Portal:** `apps/core-portal/src/apps/alquran/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/alquran/`
- **Database Engine:** MariaDB 10.5 (`aldepos_alquran` / `u622997391_dbalquran`)
- **Status Implementasi:** `jalan-produksi` (Target Hafalan per Rombel/Periode, Mutaba'ah & Setoran Harian Juz/Halaman, Verifikasi Asatidz & Tajwid Score, Ujian Munaqasyah, Kajian Kitab Kuning, Laporan Prestasi Hafalan Santri, Parent Integration)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (4 Tabel)

### 2.1 Target, Setoran Harian & Munaqasyah

#### `hafalan_targets` (Target Capaian Hafalan per Rombel / Periode) — *Fitur #184*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `class_ref_id` | `BIGINT UNSIGNED` | NO | - | ID Rombel Kelas (Akademik `class_groups.id`) |
| `academic_period_ref_id`| `BIGINT UNSIGNED`| YES | `NULL` | ID Semester / Tahun Ajaran (Akademik) |
| `period_label` | `VARCHAR(100)` | YES | `NULL` | e.g. "Semester Ganjil 2026/2027" |
| `target_type` | `ENUM` | NO | - | `'juz','halaman'` |
| `target_value` | `INT UNSIGNED` | NO | - | Jumlah Target (e.g. 2 Juz atau 40 Halaman) |
| `notes` | `TEXT` | YES | `NULL` | Keterangan / Standar Mutu Target |
| `created_by_ref_id` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Asatidz Pembuat (Core Service) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_hafalan_targets_class (class_ref_id)`, `idx_hafalan_targets_school (school_unit_id)`

#### `hafalan_records` (Catatan Setoran Hafalan & Mutaba'ah Harian) — *Fitur #185*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `student_ref_id` | `BIGINT UNSIGNED` | NO | - | ID Santri / Siswa (Akademik `students.id`) |
| `juz` | `TINYINT UNSIGNED` | NO | - | Juz 1 - 30 |
| `page_start` | `SMALLINT UNSIGNED`| YES | `NULL` | Halaman Awal Setoran |
| `page_end` | `SMALLINT UNSIGNED`| YES | `NULL` | Halaman Akhir Setoran |
| `record_date` | `DATE` | NO | - | Tanggal Setoran / Mutaba'ah |
| `tajwid_score` | `DECIMAL(5,2)` | YES | `NULL` | Nilai Tajwid & Makhraj (0 - 100) |
| `verification_status`| `ENUM` | NO | `'pending'` | `'pending','verified','rejected'` |
| `recorded_by_teacher_ref_id`| `BIGINT UNSIGNED`| NO | - | ID Asatidz Pencatat (Kepegawaian `employees.id`) |
| `verified_by_teacher_ref_id`| `BIGINT UNSIGNED`| YES | `NULL` | ID Asatidz Pembina / Verifikator |
| `verified_at` | `TIMESTAMP` | YES | `NULL` | Waktu Verifikasi |
| `notes` | `TEXT` | YES | `NULL` | Catatan Tajwid & Kelancaran |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_hafalan_records_student_date (student_ref_id, record_date)`, `idx_hafalan_records_school (school_unit_id)`

#### `munaqasyah_exams` (Ujian Sertifikasi Munaqasyah Tahfidz) — *Fitur #186*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `student_ref_id` | `BIGINT UNSIGNED` | NO | - | ID Santri (Akademik `students.id`) |
| `juz_examined` | `TINYINT UNSIGNED` | NO | - | Juz yang Diujikan |
| `exam_date` | `DATE` | NO | - | Tanggal Ujian Sidang Munaqasyah |
| `examiner_teacher_ref_id`| `BIGINT UNSIGNED`| NO | - | ID Asatidz Penguji Munaqasyah (Kepegawaian) |
| `score` | `DECIMAL(5,2)` | YES | `NULL` | Nilai Hasil Sidang Munaqasyah (0 - 100) |
| `status` | `ENUM` | NO | `'scheduled'` | `'scheduled','completed','cancelled'` |
| `notes` | `TEXT` | YES | `NULL` | Catatan Dewan Penguji & Predikat Syahadah |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_munaqasyah_exams_student_date (student_ref_id, exam_date)`, `idx_munaqasyah_exams_school (school_unit_id)`

#### `kitab_kuning` (Kajian Kitab Kuning & Literatur Islam) — *Fitur #187*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `book_name` | `VARCHAR(150)` | NO | - | e.g. "Safinatun Najah", "Aqidatul Awam", "Jurumiyyah" |
| `author` | `VARCHAR(150)` | YES | `NULL` | Pengarang / Muallif |
| `level` | `VARCHAR(50)` | YES | `NULL` | Tingkat (e.g. "Ula", "Wustha", "Ulya") |
| `teacher_ref_id`| `BIGINT UNSIGNED` | YES | `NULL` | Asatidz Pengampu Kajian (Kepegawaian) |
| `status_active` | `TINYINT(1)` | NO | `1` | Status Kurikulum Kajian Aktif |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_kitab_kuning_school (school_unit_id)`

---

## 3. Kontrak API Ringkas (`/api/v1/alquran`)

### 3.1 Target & Mutaba'ah Setoran Hafalan
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/targets` | `alquran.targets.view` | Query: `?class_ref_id=&academic_period_ref_id=` | `{ targets: array }` |
| `POST` | `/targets` | `alquran.targets.manage` | `{ class_ref_id: number, target_type: 'juz'\|'halaman', target_value: number, period_label?: string, notes?: string }` | `{ id: number }` |
| `PUT` | `/targets/:id` | `alquran.targets.manage` | `{ target_type: string, target_value: number, notes?: string }` | `{ id: number, updated: boolean }` |
| `DELETE`| `/targets/:id` | `alquran.targets.manage` | - | `{ id: number, deleted: boolean }` |
| `GET` | `/records` | `alquran.records.view` | Query: `?student_ref_id=&juz=&verification_status=&date=` | `{ records: array }` |
| `POST` | `/records` | `alquran.records.create` | `{ student_ref_id: number, juz: number, page_start?: number, page_end?: number, record_date: string, tajwid_score?: number, recorded_by_teacher_ref_id: number, notes?: string }` | `{ id: number, verification_status: 'pending' }` |
| `PATCH`| `/records/:id/verify` | `alquran.records.verify` | `{ verification_status: 'verified'\|'rejected', verified_by_teacher_ref_id: number, notes?: string }` | `{ id: number, verification_status: string }` |

### 3.2 Ujian Munaqasyah & Kajian Kitab Kuning
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/exams` | `alquran.exams.view` | Query: `?student_ref_id=&status=&exam_date=` | `{ exams: array }` |
| `POST` | `/exams` | `alquran.exams.schedule` | `{ student_ref_id: number, juz_examined: number, exam_date: string, examiner_teacher_ref_id: number, notes?: string }` | `{ id: number, status: 'scheduled' }` |
| `PATCH`| `/exams/:id/result` | `alquran.exams.record_result`| `{ score: number, status: 'completed'\|'cancelled', notes?: string }` | `{ id: number, score: number, status: string }` |
| `GET` | `/books` | `alquran.books.view` | Query: `?level=&status_active=` | `{ books: array }` |
| `POST` | `/books` | `alquran.books.manage` | `{ book_name: string, author?: string, level?: string, teacher_ref_id?: number }` | `{ id: number }` |
| `PUT` | `/books/:id` | `alquran.books.manage` | `{ book_name: string, author?: string, level?: string, teacher_ref_id?: number, status_active?: boolean }` | `{ id: number, updated: boolean }` |
| `DELETE`| `/books/:id` | `alquran.books.manage` | - | `{ id: number, deleted: boolean }` |

### 3.3 Laporan & Parent Integration
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/reports/students/:student_ref_id` | `alquran.reports.view` | - | `{ student_id: number, total_juz_memorized: number, records_summary: array, munaqasyah_passed: array }` |
| `GET` | `/reports/classes/:class_ref_id` | `alquran.reports.view` | Query: `?period_label=` | `{ class_id: number, target: object, students_progress: array }` |
| `GET` | `/reports/classes/:class_ref_id/export`| `alquran.reports.export`| Query: `?format=pdf\|excel` | File stream / PDF rekap hafalan |
| `GET` | `/internal/students/:student_ref_id/achievements`| `X-API-Key` (Portal Orangtua) | - | `{ student_id: number, current_juz: number, verified_pages: number, recent_records: array, exam_history: array }` |

---

## 4. Workflows & State Machines

- **Alur Setoran Mutaba'ah Harian:** Santri membaca setoran ke Asatidz pembina $\rightarrow$ Asatidz menginput data setoran (juz, halaman, skor tajwid) $\rightarrow$ status `pending` $\rightarrow$ Verifikasi oleh Kepala Asrama / Koordinator Tahfidz $\rightarrow$ `verified` (akumulasi total halaman bertambah di dashboard santri) ATAU `rejected` (santri mengulang setoran).
- **Alur Sidang Ujian Munaqasyah:** Santri menyelesaikan setoran 1 juz penuh $\rightarrow$ Asatidz mendaftarkan jadwal sidang munaqasyah $\rightarrow$ status `scheduled` $\rightarrow$ Pelaksanaan ujian dihadapan dewan penguji $\rightarrow$ Penguji mengisi form penilaian dan kelayakan syahadah $\rightarrow$ status `completed` (dinyatakan berhak menerima sertifikat kelulusan juz).
- **Parent Live Monitoring:** Orang tua membuka Portal Orangtua $\rightarrow$ sistem meng-query `/internal/students/:student_ref_id/achievements` $\rightarrow$ orang tua melihat grafik mutaba'ah harian, catatan makhraj dari asatidz, dan riwayat munaqasyah santri.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/alquran/login` | `src/apps/alquran/pages/Login.jsx` | Login asatidz, pembina tahfidz & penguji munaqasyah |
| `/alquran/dashboard` | `src/apps/alquran/pages/Dashboard.jsx` | Statistik capaian hafalan santri per jenjang, progress juz & alert santri stagnan |
| `/alquran/targets` *(alias: `/alquran/target`)* | `src/apps/alquran/pages/TargetHafalan.jsx` | Penyusunan target minimal capaian hafalan per rombel dan per semester |
| `/alquran/records` *(alias: `/alquran/capaian`)* | `src/apps/alquran/pages/CapaianHafalan.jsx` | Form mutaba'ah harian, verifikasi setoran asatidz, input halaman & skor tajwid |
| `/alquran/exams` *(alias: `/alquran/munaqasyah`)* | `src/apps/alquran/pages/UjianMunaqasyah.jsx` | Penjadwalan sidang munaqasyah, plotting asatidz penguji & input nilai sertifikasi |
| `/alquran/books` *(alias: `/alquran/kitab`)* | `src/apps/alquran/pages/KitabKuning.jsx` | Kurikulum literatur kajian kitab kuning, muallif & penugasan asatidz pengampu |
| `/alquran/reports` *(alias: `/alquran/laporan`)* | `src/apps/alquran/pages/LaporanHafalan.jsx` | Rekapitulasi perkembangan hafalan santri, ekspor PDF rapor tahfidz per kelas |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi token JWT SSO, profil Satuan Pendidikan & profil Yayasan.
  - `akademik`: Data siswa & santri aktif (`student_ref_id`) dan master rombel kelas (`class_ref_id`).
  - `kepegawaian`: Data asatidz pembina & penguji munaqasyah (`teacher_ref_id`).
- **Modul yang Memanggil Tahfidz & Al-Quran (Consumers):**
  - `portal-orangtua`: Mengakses progress capaian hafalan santri, mutaba'ah harian, dan hasil munaqasyah (`GET /api/v1/alquran/internal/students/:student_ref_id/achievements`).
  - `manajemen`: Agregat laporan ketercapaian target hafalan lulusan santri untuk indikator mutu yayasan (KPI Tahfidz).
  - `akademik`: Integrasi nilai tahfidz ke dalam lampiran e-rapor santri pesantren.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Audio Recording Submission:** Pencatatan hafalan saat ini berbasis tatap muka langsung (input skor asatidz); fitur upload rekaman audio murattal santri masuk dalam roadmap masa depan.
2. **Auto E-Syahadah Generator:** Pembuatan sertifikat kelulusan munaqasyah juz saat ini dicetak melalui template manual; generator PDF e-syahadah otomatis bertanda tangan digital sedang disiapkan.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
