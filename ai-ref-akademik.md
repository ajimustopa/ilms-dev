# AI-REF: Modul Akademik (`akademik`)

> Dokumen referensi teknis modul Akademik untuk AI Agent. Data diambil langsung dari 40 file migrasi Knex aktual, router/controller backend, dan router frontend portal.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/akademik/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/akademik/` & `apps/core-portal/src/apps/guru/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/akademik/`
- **Database Engine:** MariaDB 10.5 (`aldepos_akademik` / `u622997391_dbakademik`)
- **Status Implementasi:** `jalan-produksi` (Data Master Siswa Dapodik Lengkap, Kurikulum Merdeka TP, Timetable 2-Phase Engine & Presets, PSB / Penerimaan Murid Baru, Penilaian & e-Rapor, Kesiswaan, Portal Guru)
- **Commit Terakhir Modul:** `193b926` (2026-08-31)

---

## 2. ERD & Skema Database Aktual (55 Tabel)

### 2.1 Master Struktur Akademik & Jenjang

#### `academic_years` (Tahun Ajaran)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(50)` | NO | - | e.g. "2025/2026" |
| `start_date` | `DATE` | NO | - | - |
| `end_date` | `DATE` | NO | - | - |
| `is_active` | `TINYINT(1)` | NO | `0 (false)` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_academic_years_satuan (satuan_pendidikan_id)`, `idx_academic_years_is_active (is_active)`

#### `semesters` (Semester)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `name` | `VARCHAR(50)` | NO | - | e.g. "Semester Ganjil", "Semester Genap" |
| `is_active` | `TINYINT(1)` | NO | `0 (false)` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_semesters_satuan (satuan_pendidikan_id)`, `idx_semesters_academic_year (academic_year_id)`

#### `cohorts` (Angkatan Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `year` | `VARCHAR(10)` | NO | - | e.g. "2024" |
| `name` | `VARCHAR(50)` | NO | - | e.g. "Angkatan 12 (Garuda)" |
| `description` | `TEXT` | YES | `NULL` | - |
| `is_active` | `TINYINT(1)` | NO | `1 (true)` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_cohorts_satuan (satuan_pendidikan_id)`, `idx_cohorts_year (year)`

#### `grade_levels` (Tingkat / Jenjang Kelas)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(50)` | NO | - | e.g. "Kelas 7", "Kelas 10" |
| `level_order` | `TINYINT UNSIGNED` | NO | - | Urutan tingkatan (1, 2, 3, dst) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_grade_levels_satuan (satuan_pendidikan_id)`

#### `class_groups` (Rombongan Belajar / Rombel)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `grade_level_id` | `BIGINT UNSIGNED` | NO | - | `FK -> grade_levels(id) RESTRICT/CASCADE` |
| `name` | `VARCHAR(100)` | NO | - | e.g. "VII-A", "X-IPA-1" |
| `homeroom_teacher_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai dari Kepegawaian |
| `capacity` | `SMALLINT UNSIGNED` | NO | `30` | - |
| `curriculum_type` | `VARCHAR(50)` | YES | `NULL` | e.g. "Kurikulum Merdeka", "K13" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_class_groups_satuan (satuan_pendidikan_id)`, `idx_class_groups_academic_year (academic_year_id)`, `idx_class_groups_grade (grade_level_id)`

---

### 2.2 Data Induk Siswa & Kelengkapan Dapodik

#### `students` (Profil Utama Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `cohort_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> cohorts(id) RESTRICT/CASCADE` |
| `nis` | `VARCHAR(50)` | YES | `NULL` | - |
| `nisn` | `VARCHAR(20)` | YES | `NULL` | `UNIQUE` |
| `full_name` | `VARCHAR(150)` | NO | - | - |
| `nickname` | `VARCHAR(50)` | YES | `NULL` | - |
| `gender` | `ENUM` | NO | - | `'L','P'` |
| `birth_place` | `VARCHAR(100)` | YES | `NULL` | - |
| `birth_date` | `DATE` | YES | `NULL` | - |
| `nik` | `VARCHAR(20)` | YES | `NULL` | `UNIQUE` |
| `no_kk` | `VARCHAR(20)` | YES | `NULL` | - |
| `religion` | `VARCHAR(50)` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'calon'` | `'calon','aktif','lulus','pindah','keluar'` |
| `data_entry_mode` | `ENUM` | NO | `'lengkap'` | `'lengkap','ringkas_riwayat'` |
| `entry_academic_year_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `entry_date` | `DATE` | YES | `NULL` | - |
| `entry_type` | `VARCHAR(50)` | YES | `NULL` | `'peserta_didik_baru','pindahan'` |
| `photo_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `no_kks` | `VARCHAR(50)` | YES | `NULL` | - |
| `penerima_kps` | `TINYINT(1)` | NO | `0` | - |
| `no_kps` | `VARCHAR(50)` | YES | `NULL` | - |
| `penerima_kip` | `TINYINT(1)` | NO | `0` | - |
| `no_kip` | `VARCHAR(50)` | YES | `NULL` | - |
| `nama_tertera_di_kip` | `VARCHAR(150)` | YES | `NULL` | - |
| `alasan_menolak_kip` | `VARCHAR(150)` | YES | `NULL` | - |
| `no_registrasi_akta_lahir`| `VARCHAR(100)`| YES | `NULL` | - |
| `lintang` | `DECIMAL(10,8)`| YES | `NULL` | Koordinat geografis |
| `bujur` | `DECIMAL(11,8)`| YES | `NULL` | Koordinat geografis |
| `dusun` | `VARCHAR(100)` | YES | `NULL` | - |
| `rt` | `VARCHAR(5)` | YES | `NULL` | - |
| `rw` | `VARCHAR(5)` | YES | `NULL` | - |
| `kebutuhan_khusus` | `VARCHAR(100)` | YES | `NULL` | - |
| `sekolah_asal` | `VARCHAR(150)` | YES | `NULL` | - |
| `anak_ke_berapa` | `TINYINT UNSIGNED`| YES | `NULL` | - |
| `jumlah_saudara_kandung`| `TINYINT UNSIGNED`| YES| `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_students_satuan (satuan_pendidikan_id)`, `idx_students_cohort (cohort_id)`, `idx_students_status (status)`

#### `student_addresses` (Alamat & Domisili Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` (`UNIQUE`) |
| `street_address` | `TEXT` | YES | `NULL` | - |
| `village` | `VARCHAR(100)` | YES | `NULL` | Kelurahan/Desa |
| `district` | `VARCHAR(100)` | YES | `NULL` | Kecamatan |
| `city` | `VARCHAR(100)` | YES | `NULL` | Kota/Kabupaten |
| `province` | `VARCHAR(100)` | YES | `NULL` | Provinsi |
| `postal_code` | `VARCHAR(10)` | YES | `NULL` | - |
| `residence_type` | `VARCHAR(50)` | YES | `NULL` | Bersama orang tua, asrama, kos |
| `transportation_mode`| `VARCHAR(50)` | YES | `NULL` | Jalan kaki, motor, angkutan |
| `phone_number` | `VARCHAR(30)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_physical_data` (Data Fisik & Kesehatan Awal)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` (`UNIQUE`) |
| `height_cm` | `DECIMAL(5,2)` | YES | `NULL` | - |
| `weight_kg` | `DECIMAL(5,2)` | YES | `NULL` | - |
| `head_circumference_cm`| `DECIMAL(5,2)`| YES | `NULL` | - |
| `blood_type` | `VARCHAR(5)` | YES | `NULL` | A, B, AB, O |
| `distance_to_school_km`| `DECIMAL(6,2)`| YES | `NULL` | - |
| `travel_time_minutes` | `INT UNSIGNED` | YES | `NULL` | - |
| `special_needs` | `VARCHAR(100)` | YES | `NULL` | - |
| `medical_notes` | `TEXT` | YES | `NULL` | Riwayat penyakit |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_periodic_physical_records` (Catatan Riwayat Fisik Berkala)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `recorded_date` | `DATE` | NO | - | Tanggal ukur |
| `height_cm` | `DECIMAL(5,2)` | YES | `NULL` | - |
| `weight_kg` | `DECIMAL(5,2)` | YES | `NULL` | - |
| `head_circumference_cm`| `DECIMAL(5,2)`| YES | `NULL` | - |
| `semester_period`| `VARCHAR(50)` | YES | `NULL` | e.g. "Semester Ganjil 2025" |
| `recorded_by` | `VARCHAR(100)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_sppr_student_date (student_id, recorded_date)`

#### `student_admissions` (Data Riwayat Pendaftaran / Onboarding)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` (`UNIQUE`) |
| `registration_number` | `VARCHAR(50)` | YES | `NULL` | Nomor registrasi PPDB |
| `previous_school_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `previous_school_npsn` | `VARCHAR(20)` | YES | `NULL` | - |
| `diploma_number` | `VARCHAR(50)` | YES | `NULL` | No. Ijazah asal |
| `un_exam_number` | `VARCHAR(50)` | YES | `NULL` | No. Peserta Ujian |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_document_checklists` (Checklist Berkas Dokumen)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `document_code` | `VARCHAR(50)` | NO | - | `kk`, `akta_lahir`, `ijazah`, `kip`, `pas_foto` |
| `document_name` | `VARCHAR(150)` | NO | - | - |
| `is_submitted` | `TINYINT(1)` | NO | `0` | - |
| `file_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `file_path` | `VARCHAR(255)` | YES | `NULL` | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `verified_by` | `VARCHAR(100)` | YES | `NULL` | - |
| `verified_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_doc (student_id, document_code)`

#### `student_report_card_recap_checklists` (Rekap Rapor DIK/DIN Masuk)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `grade_name` | `VARCHAR(50)` | NO | - | "Kelas 7", "Kelas 8", "Kelas 9" |
| `semester` | `VARCHAR(50)` | NO | - | "Semester 1", "Semester 2" |
| `dik_status` | `TINYINT(1)` | NO | `0` | Status Nilai Pesantren/Yayasan |
| `file_url_dik` | `VARCHAR(255)` | YES | `NULL` | - |
| `din_status` | `TINYINT(1)` | NO | `0` | Status Nilai Dinas Pendidikan |
| `file_url_din` | `VARCHAR(255)` | YES | `NULL` | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_report_card_recap (student_id, grade_name, semester)`

---

### 2.3 Orang Tua / Wali, Mutasi & Penempatan Kelas

#### `guardians` (Data Orang Tua / Wali)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `full_name` | `VARCHAR(150)` | NO | - | - |
| `relationship` | `ENUM` | NO | - | `'father','mother','guardian'` |
| `nik` | `VARCHAR(20)` | YES | `NULL` | - |
| `birth_year` | `YEAR` | YES | `NULL` | - |
| `education` | `VARCHAR(50)` | YES | `NULL` | SD, SMP, SMA, S1, S2 |
| `occupation` | `VARCHAR(100)` | YES | `NULL` | PNS, Wiraswasta, Buruh |
| `monthly_income` | `VARCHAR(50)` | YES | `NULL` | Interval penghasilan |
| `phone_number` | `VARCHAR(30)` | YES | `NULL` | - |
| `email` | `VARCHAR(150)` | YES | `NULL` | - |
| `street_address` | `TEXT` | YES | `NULL` | - |
| `special_needs` | `VARCHAR(100)` | YES | `NULL` | - |
| `is_alive` | `TINYINT(1)` | NO | `1 (true)` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_guardians` (Pivot Siswa - Wali)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `guardian_id` | `BIGINT UNSIGNED` | NO | - | `FK -> guardians(id) CASCADE/CASCADE` |
| `relationship_type`| `VARCHAR(50)` | NO | - | `'ayah_kandung','ibu_kandung','wali'` |
| `is_primary_contact`| `TINYINT(1)` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_guardians (student_id, guardian_id)`

#### `student_mutations` (Riwayat Mutasi & Kelulusan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `mutation_type` | `ENUM` | NO | - | `'masuk','keluar','lulus','drop_out'` |
| `mutation_date` | `DATE` | NO | - | - |
| `previous_school`| `VARCHAR(150)` | YES | `NULL` | - |
| `destination_school`| `VARCHAR(150)`| YES | `NULL` | - |
| `reason` | `TEXT` | YES | `NULL` | - |
| `decree_number` | `VARCHAR(100)` | YES | `NULL` | No. SK Mutasi/Kelulusan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_class_enrollments` (Penempatan Rombel Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `roll_number` | `SMALLINT UNSIGNED`| YES | `NULL` | Nomor urut absen |
| `status` | `ENUM` | NO | `'aktif'` | `'aktif','naik_kelas','tinggal_kelas','pindah','lulus'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_enrollment (student_id, academic_year_id)`

#### `student_class_history` (Riwayat Kronologis Rombel Siswa, Append-Only)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id)` |
| `academic_year_id`| `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id)` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id)` |
| `grade_level_id` | `BIGINT UNSIGNED` | NO | - | `FK -> grade_levels(id)` |
| `enrollment_type`| `ENUM` | NO | `'manual'` | `'psb_placement','promotion','transfer','manual'` |
| `decision` | `VARCHAR(100)` | YES | `NULL` | mis. "Naik ke Kelas 8A", "Tinggal di Kelas 7" |
| `recorded_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | Waktu Pencatatan Audit Trail |
| `recorded_by` | `VARCHAR(100)` | YES | `NULL` | Nama Petugas / Admin |
- **Index:** `idx_sch_student (student_id)`, `idx_sch_acad_class (academic_year_id, class_group_id)`, `idx_sch_grade (grade_level_id)`

---

### 2.4 Kurikulum, Mata Pelajaran & Penugasan Guru

#### `subjects` (Mata Pelajaran)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `code` | `VARCHAR(50)` | NO | - | e.g. "MTK-01", "PAI-01" |
| `name` | `VARCHAR(150)` | NO | - | - |
| `category` | `VARCHAR(50)` | NO | `'umum'` | `'umum','keagamaan','muatan_lokal'` |
| `group_type` | `VARCHAR(50)` | NO | `'wajib'`| `'wajib','pilihan'` |
| `credit_hours` | `SMALLINT UNSIGNED`| NO | `2` | Jam pelajaran / JP |
| `kkm` | `DECIMAL(5,2)` | NO | `75.00` | Nilai KKM default |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_subjects_satuan (satuan_pendidikan_id)`, `uq_subject_code (satuan_pendidikan_id, code)`

#### `subject_grade_kkms` (KKM / KKTP per Jenjang & Tahun Ajaran)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `grade_level_id` | `BIGINT UNSIGNED` | NO | - | - |
| `subject_id` | `BIGINT UNSIGNED` | NO | - | - |
| `class_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | Khusus rombel tertentu |
| `kkm` | `DECIMAL(5,2)` | NO | `75.00` | - |
| `threshold_c` | `DECIMAL(5,2)` | YES | `75.00` | Batas Bawah Cukup |
| `threshold_b` | `DECIMAL(5,2)` | YES | `83.00` | Batas Bawah Baik |
| `threshold_a` | `DECIMAL(5,2)` | YES | `92.00` | Batas Bawah Sangat Baik |
| `description` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uniq_subject_year_grade_kkm (satuan_pendidikan_id, academic_year_id, grade_level_id, subject_id)`

#### `subject_teacher_assignments` (Penugasan Guru Mapel / Ekskul ke Rombel)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `assignment_type` | `VARCHAR(20)` | NO | `'mapel'` | `'mapel','ekskul'` |
| `subject_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> subjects(id) RESTRICT/CASCADE` |
| `extracurricular_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> extracurriculars(id) RESTRICT/CASCADE` |
| `teacher_employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai dari Kepegawaian |
| `class_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `is_primary` | `TINYINT(1)` | NO | `1` | Guru utama / pendamping |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_sta_satuan (satuan_pendidikan_id)`, `idx_sta_teacher (teacher_employee_id)`, `idx_sta_class_group (class_group_id)`

#### `subject_teacher_assignment_logs` (Audit Log Penugasan Guru)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `assignment_type` | `VARCHAR(20)` | NO | - | `'mapel','ekskul'` |
| `subject_or_extra_name`| `VARCHAR(150)` | YES | `NULL` | - |
| `class_group_name` | `VARCHAR(100)` | YES | `NULL` | - |
| `teacher_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `action` | `VARCHAR(50)` | NO | - | `'penugasan_baru','pencabutan_tugas'` |
| `created_by` | `VARCHAR(100)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `teaching_assignments` (Jadwal Ajar Legacy)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `subject_id` | `BIGINT UNSIGNED` | NO | - | `FK -> subjects(id) RESTRICT/CASCADE` |
| `teacher_employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai dari Kepegawaian |
| `semester_id` | `BIGINT UNSIGNED` | NO | - | `FK -> semesters(id) RESTRICT/CASCADE` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_teaching_assignment (class_group_id, subject_id, semester_id)`

---

### 2.5 Timetable Engine, Presets & Jadwal Pelajaran

#### `subject_schedule_presets` (Skenario / Preset Jadwal)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `name` | `VARCHAR(150)` | NO | - | e.g. "Jadwal Reguler", "Jadwal Ramadhan" |
| `code` | `VARCHAR(50)` | YES | `NULL` | - |
| `description` | `TEXT` | YES | `NULL` | - |
| `is_active` | `TINYINT(1)` | NO | `0` | - |
| `effective_start_date`| `DATE` | YES | `NULL` | - |
| `effective_end_date` | `DATE` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `subject_schedules` (Jadwal Pelajaran Fisik / Slot Ajar)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `preset_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> subject_schedule_presets(id) SET NULL` |
| `schedule_type` | `VARCHAR(20)` | NO | `'mapel'` | `'mapel','ekskul'` |
| `subject_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> subjects(id) RESTRICT/CASCADE` |
| `extracurricular_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> extracurriculars(id) RESTRICT/CASCADE` |
| `teacher_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai dari Kepegawaian |
| `day_of_week` | `TINYINT` | NO | `1` | 1 = Senin ... 7 = Minggu |
| `start_time` | `VARCHAR(10)` | NO | - | e.g. "07:30" |
| `end_time` | `VARCHAR(10)` | NO | - | e.g. "09:00" |
| `period_label` | `VARCHAR(50)` | YES | `NULL` | e.g. "Jam Ke 1-2" |
| `room_name` | `VARCHAR(100)` | YES | `NULL` | e.g. "Lab Komputer 1" |
| `is_combined_class` | `TINYINT(1)` | NO | `0` | Kelas gabungan lintas rombel |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_ss_satuan (satuan_pendidikan_id)`, `idx_ss_day (day_of_week)`, `idx_ss_teacher (teacher_employee_id)`, `idx_ss_preset (preset_id)`

#### `subject_schedule_class_groups` (Pivot Jadwal - Rombel)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `schedule_id` | `BIGINT UNSIGNED` | NO | - | `FK -> subject_schedules(id) CASCADE/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) CASCADE/CASCADE` |
- **Index:** `uq_schedule_class_group (schedule_id, class_group_id)`

#### `subject_schedule_logs` (Audit Log Mutasi Jadwal)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | - |
| `preset_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `preset_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `schedule_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `action` | `VARCHAR(50)` | NO | - | `'tambah_jadwal','ubah_jadwal','hapus_jadwal',dst` |
| `schedule_type` | `VARCHAR(20)` | YES | `NULL` | `'mapel','ekskul'` |
| `subject_or_extra_name`| `VARCHAR(150)` | YES | `NULL` | - |
| `teacher_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `class_group_names` | `VARCHAR(255)` | YES | `NULL` | - |
| `day_name` | `VARCHAR(50)` | YES | `NULL` | - |
| `time_range` | `VARCHAR(50)` | YES | `NULL` | - |
| `reason` | `TEXT` | NO | - | Alasan perubahan wajib diisi |
| `changes_summary` | `TEXT` | YES | `NULL` | - |
| `created_by` | `VARCHAR(100)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

### 2.6 Penilaian, Capaian TP & e-Rapor

#### `learning_objectives` (Tujuan Pembelajaran Kurikulum Merdeka)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) RESTRICT/CASCADE` |
| `semester_id` | `BIGINT UNSIGNED` | NO | - | `FK -> semesters(id) RESTRICT/CASCADE` |
| `grade_level_id` | `BIGINT UNSIGNED` | NO | - | `FK -> grade_levels(id) RESTRICT/CASCADE` |
| `subject_id` | `BIGINT UNSIGNED` | NO | - | `FK -> subjects(id) RESTRICT/CASCADE` |
| `code` | `VARCHAR(50)` | NO | - | e.g. "TP 1", "TP 2" |
| `description` | `TEXT` | NO | - | Deskripsi capaian kompetensi |
| `passing_score` | `DECIMAL(5,2)` | YES | `75.00` | - |
| `order_number` | `INT` | NO | `1` | Urutan TP |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_lo_satuan_sub (satuan_pendidikan_id, academic_year_id, semester_id, grade_level_id, subject_id)`

#### `student_tp_scores` (Nilai Capaian TP Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `learning_objective_id`| `BIGINT UNSIGNED` | NO | - | `FK -> learning_objectives(id) CASCADE/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) CASCADE/CASCADE` |
| `score` | `DECIMAL(5,2)` | NO | - | - |
| `is_achieved` | `TINYINT(1)` | NO | `1` | Status ketuntasan TP |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_tp_score (student_id, learning_objective_id)`

#### `student_scores` (Nilai Formatif / Sumatif / Rapor Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `subject_id` | `BIGINT UNSIGNED` | NO | - | `FK -> subjects(id) RESTRICT/CASCADE` |
| `semester_id` | `BIGINT UNSIGNED` | NO | - | `FK -> semesters(id) RESTRICT/CASCADE` |
| `assessment_type` | `VARCHAR(50)` | NO | - | `'tugas','formatif','sumatif','uts','uas','sts','sas'` |
| `score` | `DECIMAL(5,2)` | NO | - | Nilai angka (0-100) |
| `max_score` | `DECIMAL(5,2)` | NO | `100.00` | - |
| `weight` | `DECIMAL(5,2)` | NO | `1.00` | Bobot nilai |
| `notes` | `TEXT` | YES | `NULL` | - |
| `teacher_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `assessment_session_id`| `BIGINT UNSIGNED`| YES | `NULL` | - |
| `assessment_date` | `DATE` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_scores_student_subject (student_id, subject_id, semester_id)`

#### `student_attitude_scores` (Nilai Karakter / Profil Pelajar Pancasila)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `semester_id` | `BIGINT UNSIGNED` | NO | - | `FK -> semesters(id) RESTRICT/CASCADE` |
| `dimension` | `VARCHAR(100)` | NO | - | e.g. "Beriman & Bertakwa", "Mandiri", "Gotong Royong" |
| `predicate` | `ENUM` | NO | - | `'Sangat Baik','Baik','Cukup','Kurang'` |
| `description` | `TEXT` | YES | `NULL` | Catatan narasi karakter |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_attitude (student_id, semester_id, dimension)`

#### `report_cards` (Rapor Siswa Final)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `semester_id` | `BIGINT UNSIGNED` | NO | - | `FK -> semesters(id) RESTRICT/CASCADE` |
| `homeroom_notes` | `TEXT` | YES | `NULL` | Catatan Wali Kelas |
| `principal_notes` | `TEXT` | YES | `NULL` | Catatan Kepala Sekolah |
| `decision` | `VARCHAR(100)` | YES | `NULL` | "Naik ke Kelas 8", "Lulus" |
| `attendance_sick` | `SMALLINT UNSIGNED`| NO | `0` | - |
| `attendance_permission`| `SMALLINT UNSIGNED`| NO | `0` | - |
| `attendance_unexcused`| `SMALLINT UNSIGNED`| NO | `0` | - |
| `data_source` | `ENUM` | NO | `'generated'` | `'generated','manual_input','bulk_import'` |
| `is_legacy` | `TINYINT(1)` | NO | `0` | Rapor dari riwayat tahun lampau |
| `is_published` | `TINYINT(1)` | NO | `0` | - |
| `published_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_report_card (student_id, semester_id)`

#### `report_card_subject_scores` (Nilai Akhir Rapor per Mapel / Rekap Hasil Cetak)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `report_card_id` | `BIGINT UNSIGNED` | NO | - | `FK -> report_cards(id) CASCADE/CASCADE` |
| `subject_id` | `BIGINT UNSIGNED` | NO | - | `FK -> subjects(id) RESTRICT/CASCADE` |
| `score` | `DECIMAL(5,2)` | NO | - | Nilai akhir angka rapor |
| `max_score` | `DECIMAL(5,2)` | NO | `100.00` | Batas nilai maksimal |
| `predikat` | `VARCHAR(5)` | YES | `NULL` | Huruf predikat (mis. "A", "B", "C") |
| `kkm_snapshot` | `DECIMAL(5,2)` | YES | `NULL` | Snapshot KKM / KKTP mapel saat rapor terbit |
| `notes` | `TEXT` | YES | `NULL` | Catatan capaian kompetensi / deskripsi mapel |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_rcss_report_card_subject (report_card_id, subject_id)`, `idx_rcss_subject (subject_id)`

---

### 2.7 Presensi Siswa & Kesiswaan

#### `student_attendances` (Presensi Harian / Jam Pelajaran Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | `FK -> class_groups(id) RESTRICT/CASCADE` |
| `date` | `DATE` | NO | - | - |
| `status` | `ENUM` | NO | - | `'present','sick','permitted','absent'` |
| `check_in_time` | `TIME` | YES | `NULL` | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_student_daily_attendance (student_id, date)`

#### `student_leave_requests` (Pengajuan Izin / Sakit)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `start_date` | `DATE` | NO | - | - |
| `end_date` | `DATE` | NO | - | - |
| `leave_type` | `ENUM` | NO | - | `'sick','permitted'` |
| `reason` | `TEXT` | NO | - | - |
| `attachment_url` | `VARCHAR(255)` | YES | `NULL` | Surat dokter / surat ortu |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected'` |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai/Guru |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_disciplinary_records` (Catatan Pelanggaran & Poin Disiplin)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `date` | `DATE` | NO | - | - |
| `violation` | `VARCHAR(200)` | NO | - | Jenis pelanggaran |
| `category` | `VARCHAR(50)` | NO | `'ringan'` | `'ringan','sedang','berat'` |
| `points` | `SMALLINT UNSIGNED`| NO | `0` | Poin pelanggaran |
| `action_taken` | `TEXT` | YES | `NULL` | Sanksi/Tindakan |
| `reported_by` | `BIGINT UNSIGNED` | NO | - | ID Pegawai/Guru |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `student_achievements` (Catatan Prestasi Siswa)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `date` | `DATE` | NO | - | - |
| `title` | `VARCHAR(200)` | NO | - | Judul prestasi |
| `category` | `VARCHAR(50)` | NO | `'akademik'`| `'akademik','non_akademik'` |
| `level` | `VARCHAR(50)` | NO | `'sekolah'` | `'sekolah','kecamatan','kabupaten','provinsi','nasional','internasional'` |
| `rank` | `VARCHAR(50)` | YES | `NULL` | e.g. "Juara 1", "Medali Emas" |
| `certificate_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `counseling_records` (Catatan Bimbingan Konseling / BK)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) RESTRICT/CASCADE` |
| `counselor_employee_id`| `BIGINT UNSIGNED`| NO | - | ID Guru BK dari Kepegawaian |
| `date` | `DATE` | NO | - | - |
| `topic` | `VARCHAR(200)` | NO | - | - |
| `notes` | `TEXT` | NO | - | Catatan sesi konseling |
| `follow_up_action`| `TEXT` | YES | `NULL` | Rencana tindak lanjut |
| `is_confidential` | `TINYINT(1)` | NO | `1` | Status kerahasiaan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `extracurriculars` (Master Ekstrakurikuler)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(100)` | NO | - | e.g. "Pramuka", "PMR", "Robotik" |
| `coach_employee_id`| `BIGINT UNSIGNED` | YES | `NULL` | ID Pembina dari Kepegawaian |
| `schedule_info` | `VARCHAR(150)` | YES | `NULL` | Hari & jam latihan |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `extracurricular_members` (Anggota Siswa Ekskul)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `extracurricular_id` | `BIGINT UNSIGNED` | NO | - | `FK -> extracurriculars(id) CASCADE/CASCADE` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | `FK -> students(id) CASCADE/CASCADE` |
| `academic_year_id` | `BIGINT UNSIGNED` | NO | - | `FK -> academic_years(id) CASCADE/CASCADE` |
| `joined_date` | `DATE` | YES | `NULL` | - |
| `score` | `VARCHAR(5)` | YES | `NULL` | Predikat nilai ekskul (A, B, C) |
| `notes` | `TEXT` | YES | `NULL` | Catatan pembina |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_extracurricular_member (extracurricular_id, student_id, academic_year_id)`

#### `calendar_document_versions` (Dokumen Kaldik Berversi per Tahun Ajaran & Konteks)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `context_type` | `ENUM` | NO | `'satuan'` | `'satuan','yayasan'` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL jika kaldik gabungan yayasan |
| `academic_year_label` | `VARCHAR(20)` | NO | - | Label tahun ajaran (mis. "2026/2027") |
| `version_number` | `INT` | NO | `1` | Nomor versi revisi kaldik |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published'` |
| `published_at` | `TIMESTAMP` | YES | `NULL` | Waktu pengesahan/penerbitan |
| `published_by` | `VARCHAR(100)` | YES | `NULL` | Petugas pengesah kaldik |
| `decree_number` | `VARCHAR(100)` | YES | `NULL` | Nomor SK Pengesahan Kaldik |
| `file_url` | `VARCHAR(255)` | YES | `NULL` | URL berkas PDF resmi kaldik |
| `notes` | `TEXT` | YES | `NULL` | Catatan pengesahan / revisi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_cdv_context_year (context_type, satuan_pendidikan_id, academic_year_label)`, `idx_cdv_status (status)`

#### `calendar_event_categories` (Master Kategori Kegiatan & Kode Warna)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | Unit spesifik atau NULL jika global |
| `name` | `VARCHAR(100)` | NO | - | Nama Kategori Kegiatan |
| `color_hex` | `VARCHAR(10)` | NO | - | Kode warna HEX (mis. `#10B981`) |
| `is_active` | `TINYINT(1)` | NO | `1` | Status aktif |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_cec_satuan (satuan_pendidikan_id)`

#### `academic_calendar_events` (Agenda Kegiatan Kalender Pendidikan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `calendar_document_version_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> calendar_document_versions(id)` |
| `category_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> calendar_event_categories(id)` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | Unit spesifik atau NULL jika yayasan |
| `title` | `VARCHAR(150)` | NO | - | Judul / Nama Kegiatan |
| `start_date` | `DATE` | NO | - | Tanggal Mulai Kegiatan |
| `end_date` | `DATE` | NO | - | Tanggal Selesai Kegiatan |
| `grade_level_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> grade_levels(id)` |
| `rkt_activity_id`| `BIGINT UNSIGNED` | YES | `NULL` | Referensi lepas ke `manajemen.work_plan_activities.id` |
| `rkt_program_name_snapshot` | `VARCHAR(150)` | YES | `NULL` | Cache nama program RKT |
| `notes` | `TEXT` | YES | `NULL` | Catatan teknis kegiatan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_ace_version`, `idx_ace_category`, `idx_ace_rkt`, `idx_calendar_start_date`, `idx_calendar_end_date`

#### `activity_logs` (Audit Log Modul Akademik)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `user_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `action` | `VARCHAR(100)` | NO | - | - |
| `module` | `VARCHAR(100)` | NO | - | - |
| `ip_address` | `VARCHAR(45)` | YES | `NULL` | - |
| `data_before` | `JSON` | YES | `NULL` | - |
| `data_after` | `JSON` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

### 2.8 PSB - Penerimaan Murid Baru (10 Tabel)

#### `psb_processes` (Proses / Periode PSB Induk)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(200)` | NO | - | Nama Proses (mis. "PSB TP 2026/2027") |
| `description` | `TEXT` | YES | `NULL` | Deskripsi / Penjelasan Pelaksanaan |
| `target_academic_year` | `VARCHAR(20)` | NO | - | Tahun Ajaran Tujuan (mis. "2026/2027") |
| `context_type` | `ENUM` | NO | `'satuan'` | `'satuan','yayasan'` |
| `status` | `ENUM` | NO | `'draft'` | `'draft','open','closed'` |
| `start_date` | `DATE` | YES | `NULL` | Tanggal Mulai Periode |
| `end_date` | `DATE` | YES | `NULL` | Tanggal Akhir Periode |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_proc_acad_year (target_academic_year, status)`

#### `psb_process_units` (Pivot Unit Satuan Pendidikan & Kuota PSB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_process_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_processes(id) CASCADE` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `code_prefix` | `VARCHAR(20)` | NO | `'PSB'` | Prefiks No. Registrasi (mis. "SMA", "SMP") |
| `target_registrants` | `INT UNSIGNED` | YES | `0` | Target Jumlah Pendaftar |
| `quota_male` | `SMALLINT UNSIGNED` | YES | `0` | Kuota Ikhwan / Laki-laki |
| `quota_female` | `SMALLINT UNSIGNED` | YES | `0` | Kuota Akhwat / Perempuan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Constraint:** `UNIQUE (psb_process_id, satuan_pendidikan_id)`, **Index:** `idx_psb_unit_satuan (satuan_pendidikan_id)`

#### `psb_groups` (Master Kelompok / Gelombang Calon Murid)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_process_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_processes(id) CASCADE` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | Satuan spesifik atau NULL jika lintas satuan |
| `name` | `VARCHAR(150)` | NO | - | Nama Gelombang (mis. "Gelombang 1", "Jalur Prestasi") |
| `description` | `TEXT` | YES | `NULL` | Keterangan Jalur/Gelombang |
| `quota` | `SMALLINT UNSIGNED` | YES | `NULL` | Batas Kuota Gelombang |
| `start_date` | `DATE` | YES | `NULL` | Tanggal Buka Gelombang |
| `end_date` | `DATE` | YES | `NULL` | Tanggal Tutup Gelombang |
| `is_active` | `BOOLEAN` | NO | `1 (true)` | Status Aktif Gelombang |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_grp_proc (psb_process_id, satuan_pendidikan_id)`

#### `psb_registrants` (Pendataan Calon Murid PSB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_process_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_processes(id) RESTRICT` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | ID Satuan Pendidikan |
| `psb_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> psb_groups(id) SET NULL` |
| `registration_number` | `VARCHAR(50)` | NO | - | `UNIQUE` Auto-generate (`{code_prefix}-{5digit}`) |
| `nisn` | `VARCHAR(20)` | YES | `NULL` | NISN Asal |
| `full_name` | `VARCHAR(150)` | NO | - | Nama Lengkap Calon Murid |
| `address` | `TEXT` | YES | `NULL` | Alamat Lengkap Domisili |
| `previous_school_name` | `VARCHAR(150)` | YES | `NULL` | Nama Sekolah Asal |
| `father_name` | `VARCHAR(150)` | YES | `NULL` | Nama Ayah |
| `mother_name` | `VARCHAR(150)` | YES | `NULL` | Nama Ibu |
| `parent_contact` | `VARCHAR(50)` | YES | `NULL` | No. HP / WhatsApp Orang Tua |
| `entry_type` | `ENUM` | NO | `'reguler'` | `'reguler','pindahan'` |
| `requested_grade_level_id`| `BIGINT UNSIGNED` | YES | `NULL` | `FK -> grade_levels(id) SET NULL` (Tingkat tujuan) |
| `fee_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | Referensi ke `keuangan.fee_groups.id` (Tanpa FK fisik) |
| `fee_group_name_snapshot` | `VARCHAR(100)` | YES | `NULL` | Nama Kelompok Biaya Saat Penetapan |
| `user_account_id` | `BIGINT UNSIGNED` | YES | `NULL` | Referensi ke `core.users.id` (Akun portal calon murid) |
| `status` | `ENUM` | NO | `'registered'`| `'registered','testing','test_passed','test_failed','placed','rejected','withdrawn'` |
| `source` | `ENUM` | NO | `'admin_input'`| `'public_website','admin_input'` |
| `website_registrant_ref_id`| `BIGINT UNSIGNED` | YES | `NULL` | Referensi ke `website_utama.ppdb_registrants.id` |
| `placed_class_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> class_groups(id) SET NULL` (Rombel definitif) |
| `placed_student_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> students(id) SET NULL` (Setelah jadi siswa aktif) |
| `placed_nipd` | `VARCHAR(30)` | YES | `NULL` | NIPD/NIS yang Diberikan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_reg_proc_satuan (psb_process_id, satuan_pendidikan_id, status)`, `idx_psb_reg_number (registration_number)`, `idx_psb_reg_nisn (nisn)`

#### `psb_registrant_documents` (Berkas Lampiran Calon Murid)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_registrant_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_registrants(id) CASCADE` |
| `document_type` | `VARCHAR(50)` | NO | - | `'kk','akta_lahir','ijazah','rapor','kartu_keluarga','pas_foto'` |
| `document_name` | `VARCHAR(150)` | NO | - | Nama File / Dokumen |
| `file_url` | `VARCHAR(255)` | NO | - | URL / Path Dokumen |
| `is_submitted` | `BOOLEAN` | NO | `0 (false)` | Status Sudah Diunggah |
| `verified_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Petugas Verifikator |
| `verified_at` | `TIMESTAMP` | YES | `NULL` | Waktu Verifikasi Berkas |
| `notes` | `TEXT` | YES | `NULL` | Catatan Validasi Petugas |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_doc_reg (psb_registrant_id, document_type)`

#### `psb_tests` (Master Formulir / Paket Tes PSB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_process_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_processes(id) CASCADE` |
| `name` | `VARCHAR(150)` | NO | - | Nama Tes (mis. "Tes Potensi Akademik", "Wawancara Santri") |
| `description` | `TEXT` | YES | `NULL` | Uraian Petunjuk & Silabus Tes |
| `duration_minutes` | `INT UNSIGNED` | YES | `NULL` | Durasi Waktu Pengerjaan (Menit) |
| `passing_score` | `DECIMAL(5,2)` | YES | `NULL` | Nilai Ambang Batas Kelulusan (Passing Grade) |
| `is_active` | `BOOLEAN` | NO | `1 (true)` | Status Aktif Paket Tes |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_test_proc (psb_process_id, is_active)`

#### `psb_test_questions` (Bank Soal Tes PSB)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_test_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_tests(id) CASCADE` |
| `question_type` | `ENUM` | NO | - | `'multiple_choice','fill_in_blank','essay'` |
| `question_text` | `TEXT` | NO | - | Butir Pertanyaan / Soal |
| `options` | `JSON` | YES | `NULL` | Pilihan Jawaban (A, B, C, D) untuk Pilihan Ganda |
| `correct_answer` | `TEXT` | YES | `NULL` | Kunci Jawaban Benar |
| `score_weight` | `DECIMAL(5,2)` | NO | `1.00` | Bobot Poin Soal |
| `order_number` | `INT` | NO | `1` | Nomor Urut Soal |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_q_test (psb_test_id, order_number)`

#### `psb_test_sessions` (Penugasan Sesi Tes Calon Murid)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_test_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_tests(id) CASCADE` |
| `psb_registrant_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_registrants(id) CASCADE` |
| `scheduled_at` | `DATETIME` | YES | `NULL` | Jadwal Pelaksanaan Ujian |
| `status` | `ENUM` | NO | `'scheduled'` | `'scheduled','in_progress','submitted','graded'` |
| `started_at` | `DATETIME` | YES | `NULL` | Waktu Mulai Pengerjaan |
| `submitted_at` | `DATETIME` | YES | `NULL` | Waktu Selesai Pengerjaan |
| `total_score` | `DECIMAL(6,2)` | YES | `NULL` | Nilai Akhir Hasil Ujian |
| `is_passed` | `BOOLEAN` | YES | `NULL` | 1 = Lulus Ambang Batas, 0 = Tidak Lulus |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Constraint:** `UNIQUE (psb_test_id, psb_registrant_id)`, **Index:** `idx_psb_sess_reg (psb_registrant_id, status)`

#### `psb_test_answers` (Lembar Jawaban Calon Murid)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_test_session_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_test_sessions(id) CASCADE` |
| `psb_test_question_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_test_questions(id) CASCADE` |
| `answer_text` | `TEXT` | YES | `NULL` | Jawaban Calon Murid |
| `is_correct` | `BOOLEAN` | YES | `NULL` | 1 jika benar (otomatis untuk PG) |
| `score_awarded` | `DECIMAL(5,2)` | YES | `NULL` | Nilai Poin yang Diperoleh |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_psb_ans_sess_q (psb_test_session_id, psb_test_question_id)`

#### `psb_placement_logs` (Riwayat Penempatan Kelas & Penetapan NIPD, Append-Only)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `psb_registrant_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psb_registrants(id) CASCADE` |
| `academic_year_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> academic_years(id) SET NULL` |
| `class_group_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> class_groups(id) SET NULL` |
| `nipd` | `VARCHAR(30)` | YES | `NULL` | NIPD Siswa Ditetapkan |
| `placed_by` | `VARCHAR(100)` | YES | `NULL` | Nama/Username Petugas Penempatan |
| `placed_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | Waktu Penempatan Definitif |
| `notes` | `TEXT` | YES | `NULL` | Catatan Penempatan |
- **Index:** `idx_psb_place_reg (psb_registrant_id)`, `idx_psb_place_class (class_group_id)`

### 2.9 Presensi Pelajaran & Kegiatan (2 Tabel)

#### `lesson_attendances` (Presensi Siswa Per Jam Pelajaran / Sesi KBM)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa |
| `class_group_id` | `BIGINT UNSIGNED` | NO | - | ID Rombongan Belajar |
| `subject_schedule_id`| `BIGINT UNSIGNED`| NO | - | ID Jadwal Mapel (`subject_schedules.id`) |
| `date` | `DATE` | NO | - | Tanggal Sesi KBM |
| `status` | `ENUM` | NO | `'present'` | `'present','sick','permitted','absent','late'` |
| `check_in_time` | `TIME` | YES | `NULL` | Waktu Hadir Santri |
| `recorded_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai/Guru Pengajar |
| `input_method` | `ENUM` | NO | `'manual'` | `'manual','rfid'` *(Placeholder integrasi RFID)* |
| `device_ref` | `VARCHAR(100)` | YES | `NULL` | Identifier Reader RFID *(Placeholder)* |
| `notes` | `TEXT` | YES | `NULL` | Catatan Keaktifan / Keterangan KBM |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Constraint:** `UNIQUE (student_id, subject_schedule_id, date)`, **Index:** `idx_lesson_att_class_date`, `idx_lesson_att_schedule_date`

#### `activity_attendances` (Presensi Siswa Pada Kegiatan Ekstrakurikuler & Acara Sekolah)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `student_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa |
| `activity_type` | `ENUM` | NO | `'ekskul'` | `'ekskul','acara_sekolah','lainnya'` |
| `activity_ref_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Master Referensi (mis. `extracurriculars.id` jika ekskul) |
| `activity_name` | `VARCHAR(150)` | NO | - | Nama Kegiatan Bebas (mis. "Pramuka", "Tabligh Akbar") |
| `date` | `DATE` | NO | - | Tanggal Kegiatan |
| `status` | `ENUM` | NO | `'present'` | `'present','absent','excused'` |
| `recorded_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Petugas/Pembina Pencatat |
| `input_method` | `ENUM` | NO | `'manual'` | `'manual','rfid'` *(Placeholder)* |
| `device_ref` | `VARCHAR(100)` | YES | `NULL` | Identifier Reader RFID *(Placeholder)* |
| `notes` | `TEXT` | YES | `NULL` | Catatan Partisipasi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_activity_att_student_date`, `idx_activity_att_ref_date`

---

## 3. Kontrak API Ringkas (`/api/v1/akademik`)

### 3.1 Data Master Siswa & Dokumen
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/students` | `akademik.students.read` | Query: `?status=&class_group_id=&satuan_pendidikan_id=&cohort_id=&search=&page=&limit=` | `{ students: array, pagination: object }` |
| `POST` | `/students` | `akademik.students.create` | `{ full_name: string, nis?: string, nisn?: string, gender: string, birth_place?: string, birth_date?: string, cohort_id?: number, class_group_id?: number, ...dapodikFields }` | `{ id: number, full_name: string, nisn: string }` |
| `GET` | `/students/:id` | `akademik.students.read` | - | `{ student: object, addresses: object, physical: object, guardians: array, documents: array, report_recaps: array }` |
| `PUT` | `/students/:id` | `akademik.students.update` | `{ full_name: string, nisn?: string, status?: string, ...dapodikFields }` | `{ id: number, updated: boolean }` |
| `DELETE`| `/students/:id` | `akademik.students.delete` | - | `null` |
| `POST` | `/students/:id/periodic-physical` | `akademik.students.update` | `{ recorded_date: string, height_cm?: number, weight_kg?: number, head_circumference_cm?: number, semester_period?: string }` | `{ id: number }` |
| `DELETE`| `/students/:id/periodic-physical/:recordId`| `akademik.students.update`| - | `null` |
| `PUT` | `/students/:id/report-card-recaps`| `akademik.students.update` | `{ recaps: array<{ grade_name: string, semester: string, dik_status: boolean, din_status: boolean, file_url_dik?: string, file_url_din?: string }> }` | `{ success: boolean }` |
| `PUT` | `/students/:id/document-checklist` | `akademik.students.update` | `{ checklists: array<{ document_code: string, is_submitted: boolean, file_url?: string, notes?: string }> }` | `{ success: boolean }` |
| `POST` | `/students/:id/guardians` | `akademik.students.update` | `{ full_name: string, relationship_type: string, phone_number?: string, nik?: string, occupation?: string, monthly_income?: string, is_primary_contact?: boolean }` | `{ guardian_id: number }` |
| `DELETE`| `/students/:id/guardians/:guardianId` | `akademik.students.update` | - | `null` |
| `GET` | `/student-mutations` | `akademik.students.read` | Query: `?student_id=&type=&page=&limit=` | `{ mutations: array }` |
| `POST` | `/student-mutations` | `akademik.students.update` | `{ student_id: number, mutation_type: string, mutation_date: string, destination_school?: string, reason?: string, decree_number?: string }` | `{ id: number }` |
| `POST` | `/students/quick-add-legacy` | `akademik.students.create` | `{ full_name: string, nis?: string, nisn?: string, gender: string, birth_date?: string, cohort_id?: number, graduation_year?: string, status?: string, class_group_id?: number, satuan_pendidikan_id?: number }` | `{ data: object (student), warning?: string, message: string }` |
| `GET` | `/students/search-quick` | `akademik.students.read` | Query: `?q=&satuan_pendidikan_id=&limit=` | `{ data: array<{ id, full_name, nis, nisn, gender, birth_date, status, data_entry_mode, cohort_name, current_class_name }> }` |
| `POST` | `/students/promote` | `akademik.students.update` | `{ student_ids?: number[], students?: array<{ student_id: number, target_class_group_id: number, decision?: string }>, target_academic_year_id: number, target_class_group_id?: number }` | `{ message: string, count: number }` |
| `POST` | `/students/graduate` | `akademik.students.update` | `{ student_ids: number[], academic_year_id: number, graduation_date: string, decree_number: string, notes?: string }` | `{ message: string, count: number, graduation_date: string, decree_number: string }` |
| `GET` | `/students/:id/graduation-certificate-data` | `akademik.students.read` | - | `{ student: object, graduation_info: object, last_report_card: object, scores: array, guardians: array }` |
| `GET` | `/students/:id/class-history` | `akademik.students.read` | - | `{ history: array<{ id, student_id, academic_year_name, class_group_name, grade_level_name, enrollment_type, decision, recorded_at, recorded_by }> }` |

### 3.2 Struktur Kurikulum & Rombel
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/academic-years` | `authenticate` | - | `{ academic_years: array }` |
| `POST` | `/academic-years` | `akademik.academic_years.manage` | `{ name: string, start_date: string, end_date: string }` | `{ id: number }` |
| `PUT` | `/academic-years/:id/activate` | `akademik.academic_years.manage` | - | `{ id: number, is_active: boolean }` |
| `GET` | `/semesters` | `authenticate` | Query: `?academic_year_id=` | `{ semesters: array }` |
| `POST` | `/semesters` | `akademik.academic_years.manage` | `{ name: string, academic_year_id?: number }` | `{ id: number }` |
| `PUT` | `/semesters/:id/activate` | `akademik.academic_years.manage` | - | `{ id: number, is_active: boolean }` |
| `GET` | `/cohorts` | `authenticate` | - | `{ cohorts: array }` |
| `POST` | `/cohorts` | `akademik.class_groups.manage` | `{ year: string, name: string, description?: string }` | `{ id: number }` |
| `GET` | `/grade-levels` | `authenticate` | - | `{ grade_levels: array }` |
| `POST` | `/grade-levels` | `akademik.class_groups.manage` | `{ name: string, level_order: number }` | `{ id: number }` |
| `GET` | `/class-groups` | `authenticate` | Query: `?academic_year_id=&grade_level_id=` | `{ class_groups: array }` |
| `POST` | `/class-groups` | `akademik.class_groups.manage` | `{ name: string, academic_year_id: number, grade_level_id: number, homeroom_teacher_id?: number, capacity?: number }` | `{ id: number }` |
| `GET` | `/unassigned-students` | `authenticate` | Query: `?cohort_id=&search=` | `{ students: array }` |
| `GET` | `/class-groups/:id/members` | `authenticate` | - | `{ members: array }` |
| `POST` | `/class-groups/:id/members` | `akademik.class_groups.manage` | `{ student_ids: number[] }` | `{ added_count: number }` |
| `DELETE`| `/enrollments/:enrollmentId` | `akademik.class_groups.manage` | - | `null` |
| `PUT` | `/enrollments/:enrollmentId/transfer` | `akademik.class_groups.manage` | `{ target_class_group_id: number }` | `{ success: boolean }` |
| `GET` | `/subjects` | `authenticate` | - | `{ subjects: array }` |
| `POST` | `/subjects` | `akademik.subjects.manage` | `{ code: string, name: string, category: string, credit_hours: number, kkm: number }` | `{ id: number }` |
| `GET` | `/subject-grade-kkms` | `authenticate` | Query: `?academic_year_id=&grade_level_id=` | `{ kkms: array }` |
| `POST` | `/subject-grade-kkms` | `akademik.subjects.manage` | `{ items: array<{ academic_year_id: number, grade_level_id: number, subject_id: number, kkm: number, threshold_c?: number, threshold_b?: number, threshold_a?: number }> }` | `{ success: boolean }` |
| `GET` | `/teaching-duties` | `authenticate` | Query: `?class_group_id=&teacher_employee_id=` | `{ duties: array }` |
| `POST` | `/teaching-duties` | `akademik.class_groups.manage` | `{ assignment_type: string, subject_id?: number, extracurricular_id?: number, teacher_employee_id: number, class_group_id?: number, is_primary?: boolean }` | `{ id: number }` |
| `DELETE`| `/teaching-duties/:id` | `akademik.class_groups.manage` | - | `null` |

### 3.3 Jadwal Pelajaran & Timetable Presets
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/schedule-presets` | `authenticate` | - | `{ presets: array }` |
| `POST` | `/schedule-presets` | `akademik.class_groups.manage` | `{ name: string, code?: string, description?: string, effective_start_date?: string, effective_end_date?: string }` | `{ id: number }` |
| `PUT` | `/schedule-presets/:id/activate`| `akademik.class_groups.manage` | - | `{ id: number, is_active: boolean }` |
| `GET` | `/schedules` | `authenticate` | Query: `?preset_id=&class_group_id=&teacher_employee_id=&day_of_week=` | `{ schedules: array }` |
| `POST` | `/schedules` | `akademik.class_groups.manage` | `{ preset_id?: number, schedule_type: string, subject_id?: number, teacher_employee_id?: number, class_group_ids: number[], day_of_week: number, start_time: string, end_time: string, room_name?: string, reason: string }` | `{ id: number }` |
| `PUT` | `/schedules/:id` | `akademik.class_groups.manage` | `{ day_of_week: number, start_time: string, end_time: string, room_name?: string, reason: string }` | `{ id: number, updated: boolean }` |
| `DELETE`| `/schedules/:id` | `akademik.class_groups.manage` | Query/Body: `{ reason: string }` | `null` |
| `GET` | `/schedules/logs` | `authenticate` | Query: `?page=&limit=` | `{ logs: array }` |

### 3.4 Kurikulum Merdeka (Tujuan Pembelajaran) & Penilaian
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/learning-objectives` | `authenticate` | Query: `?subject_id=&grade_level_id=&semester_id=` | `{ learning_objectives: array }` |
| `POST` | `/learning-objectives/bulk` | `akademik.subjects.manage` | `{ subject_id: number, grade_level_id: number, semester_id: number, objectives: array<{ code: string, description: string, passing_score?: number }> }` | `{ created_count: number }` |
| `GET` | `/tp-scores` | `akademik.scores.read` | Query: `?class_group_id=&learning_objective_id=` | `{ scores: array }` |
| `POST` | `/tp-scores/bulk` | `akademik.scores.create` | `{ class_group_id: number, learning_objective_id: number, items: array<{ student_id: number, score: number, is_achieved: boolean, notes?: string }> }` | `{ saved_count: number }` |
| `GET` | `/scores` | `akademik.scores.read` | Query: `?class_group_id=&subject_id=&semester_id=&assessment_type=` | `{ scores: array }` |
| `POST` | `/scores/bulk` | `akademik.scores.create` | `{ class_group_id: number, subject_id: number, semester_id: number, assessment_type: string, items: array<{ student_id: number, score: number, notes?: string }> }` | `{ saved_count: number }` |
| `GET` | `/scores/recap-matrix` | `akademik.scores.read` | Query: `?class_group_id=&subject_id=&semester_id=` | `{ matrix: array, assessment_types: array }` |
| `GET` | `/scores/leger` | `akademik.scores.read` | Query: `?class_group_id=&semester_id=` | `{ leger: array, subjects: array }` |
| `GET` | `/attitude-scores` | `akademik.scores.read` | Query: `?class_group_id=&semester_id=` | `{ attitude_scores: array }` |
| `POST` | `/attitude-scores` | `akademik.scores.create` | `{ student_id: number, class_group_id: number, semester_id: number, dimension: string, predicate: string, description?: string }` | `{ id: number }` |
| `GET` | `/extracurricular-scores` | `akademik.scores.read` | Query: `?extracurricular_id=&academic_year_id=` | `{ scores: array }` |
| `POST` | `/extracurricular-scores/bulk` | `akademik.scores.create` | `{ extracurricular_id: number, academic_year_id: number, items: array<{ student_id: number, score: string, notes?: string }> }` | `{ saved_count: number }` |

### 3.5 Rapor & Presensi
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/report-cards` | `akademik.report_cards.read` | Query: `?class_group_id=&semester_id=&data_source=&is_legacy=` | `{ data: array }` |
| `POST` | `/report-cards/generate` | `akademik.report_cards.generate` | `{ class_group_id?: number, student_id?: number, semester_id: number, homeroom_note?: string }` | `{ total_generated: number, semester_id: number, items: array }` |
| `GET` | `/report-cards/:id` | `akademik.report_cards.read` | - | `{ report_card: object, subject_scores: array, scores: array, tp_scores: array, attitudes: array, attendance_summary: array }` |
| `POST` | `/report-cards/legacy-entry` | `akademik.report_cards.generate` | `{ student_id: number, semester_id: number, homeroom_notes?: string, decision?: string, subject_scores: array<{ subject_id: number, score: number, max_score?: number, predikat?: string, kkm_snapshot?: number, notes?: string }> }` | `{ data: object, message: string }` |
| `GET` | `/report-cards/import-template` | `authenticate` | Query: `?class_group_id=&semester_id=&satuan_pendidikan_id=` | `Binary Buffer (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)` |
| `POST` | `/report-cards/import` | `akademik.report_cards.generate` | `{ class_group_id?: number, semester_id: number, auto_create_missing_students?: boolean, rows: array }` | `{ total_rows: number, success_count: number, created_students_count: number, matched_students_count: number, errors: array }` |
| `GET` | `/students/:id/report-card-history` | `akademik.report_cards.read` | - | `{ student: object, total_report_cards: number, report_cards: array }` |
| `PUT` | `/report-cards/:id/note` | `akademik.report_cards.generate` | `{ homeroom_note: string }` | `{ id: number, homeroom_note: string }` |
| `GET` | `/attendances` | `akademik.attendances.read` | Query: `?class_group_id=&date=` | `{ attendances: array }` |
| `POST` | `/attendances/bulk` | `akademik.attendances.create` | `{ class_group_id: number, date: string, attendances: array<{ student_id: number, status: string, notes?: string }> }` | `{ saved_count: number }` |
| `GET` | `/attendances/summary` | `akademik.attendances.read` | Query: `?class_group_id=&start_date=&end_date=` | `{ summary: array }` |
| `GET` | `/lesson-attendances` | `akademik.attendances.read` | Query: `?class_group_id=&subject_schedule_id=&date=&start_date=&end_date=&student_id=` | `{ data: array }` |
| `POST` | `/lesson-attendances/bulk` | `akademik.attendances.create` | `{ subject_schedule_id: number, class_group_id: number, date: string, attendances: array<{ student_id: number, status: string, notes?: string, input_method?: string, device_ref?: string }> }` | `{ data: object, message: string }` |
| `GET` | `/lesson-attendances/summary` | `akademik.attendances.read` | Query: `?class_group_id=&subject_schedule_id=&date=&start_date=&end_date=` | `{ data: object (present, sick, permitted, absent, late, rate) }` |
| `GET` | `/activity-attendances` | `akademik.attendances.read` | Query: `?activity_type=&activity_ref_id=&date=&start_date=&end_date=&student_id=` | `{ data: array }` |
| `POST` | `/activity-attendances/bulk` | `akademik.attendances.create` | `{ activity_type: string, activity_ref_id?: number, activity_name: string, date: string, attendances: array<{ student_id: number, status: string, notes?: string, input_method?: string, device_ref?: string }> }` | `{ data: object, message: string }` |
| `GET` | `/activity-attendances/summary` | `akademik.attendances.read` | Query: `?activity_type=&activity_ref_id=&date=&start_date=&end_date=` | `{ data: object (present, absent, excused, rate) }` |
| `GET` | `/leave-requests` | `authenticate` | Query: `?student_id=&status=` | `{ leave_requests: array }` |
| `POST` | `/leave-requests` | `authenticate` | `{ student_id: number, start_date: string, end_date: string, leave_type: string, reason: string, attachment_url?: string }` | `{ id: number }` |
| `PUT` | `/leave-requests/:id/approve` | `akademik.attendances.create` | `{ status: 'approved'\|'rejected' }` | `{ id: number, status: string }` |

### 3.6 Kesiswaan
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/disciplinary-records` | `akademik.disciplinary.read` | Query: `?student_id=` | `{ records: array }` |
| `POST` | `/disciplinary-records` | `akademik.disciplinary.create` | `{ student_id: number, date: string, violation: string, category: string, points: number, action_taken?: string, reported_by: number }` | `{ id: number }` |
| `GET` | `/achievements` | `akademik.students.read` | Query: `?student_id=` | `{ achievements: array }` |
| `POST` | `/achievements` | `akademik.students.update` | `{ student_id: number, date: string, title: string, category: string, level: string, rank?: string, certificate_url?: string }` | `{ id: number }` |
| `GET` | `/counseling-records` | `akademik.counseling.read` | Query: `?student_id=` | `{ records: array }` |
| `POST` | `/counseling-records` | `akademik.counseling.create` | `{ student_id: number, counselor_employee_id: number, date: string, topic: string, notes: string, follow_up_action?: string }` | `{ id: number }` |
| `GET` | `/extracurriculars` | `authenticate` | - | `{ extracurriculars: array }` |
| `POST` | `/extracurriculars` | `akademik.class_groups.manage` | `{ name: string, coach_employee_id?: number, schedule_info?: string }` | `{ id: number }` |
| `GET` | `/calendar-document-versions` | `authenticate` | Query: `?context_type=&satuan_pendidikan_id=&academic_year_label=` | `{ data: array }` |
| `POST` | `/calendar-document-versions` | `akademik.academic_years.manage` | `{ context_type: string, satuan_pendidikan_id?: number, academic_year_label: string, notes?: string }` | `{ data: object }` |
| `PUT` | `/calendar-document-versions/:id/publish` | `akademik.academic_years.manage` | `{ decree_number?: string, file_url?: string, notes?: string }` | `{ data: object }` |
| `GET` | `/calendar-event-categories` | `authenticate` | Query: `?satuan_pendidikan_id=` | `{ data: array }` |
| `POST` | `/calendar-event-categories` | `akademik.academic_years.manage` | `{ name: string, color_hex: string, satuan_pendidikan_id?: number }` | `{ data: object }` |
| `PUT` | `/calendar-event-categories/:id` | `akademik.academic_years.manage` | `{ name?: string, color_hex?: string, is_active?: boolean }` | `{ data: object }` |
| `DELETE`| `/calendar-event-categories/:id` | `akademik.academic_years.manage` | - | `{ success: boolean }` |
| `GET` | `/calendar-events/rkt-programs` | `authenticate` | Query: `?academic_year=&school_unit_id=&context=` | `{ data: array<{ id, activity_code, activity_name, program_name, display_label, status }> }` |
| `GET` | `/calendar-events` | `authenticate` | Query: `?calendar_document_version_id=&category_id=&satuan_pendidikan_id=&start_date=&end_date=` | `{ data: array }` |
| `POST` | `/calendar-events` | `akademik.academic_years.manage` | `{ calendar_document_version_id: number, category_id: number, title: string, start_date: string, end_date: string, grade_level_id?: number, rkt_activity_id?: number, rkt_program_name_snapshot?: string, notes?: string }` | `{ data: object }` |
| `PUT` | `/calendar-events/:id` | `akademik.academic_years.manage` | `{ title?: string, start_date?: string, end_date?: string, category_id?: number, rkt_activity_id?: number, notes?: string }` | `{ data: object }` |
| `DELETE`| `/calendar-events/:id` | `akademik.academic_years.manage` | - | `{ success: boolean }` |

### 3.7 PSB - Penerimaan Murid Baru
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/psb-processes` | `akademik.psb.read` | Query: `?search=&target_academic_year=&context_type=&status=` | `{ data: array, message: string }` |
| `POST` | `/psb-processes` | `akademik.psb.manage` | `{ name: string, target_academic_year: string, context_type?: string, status?: string, start_date?: string, end_date?: string, units?: array }` | `{ data: object, message: string }` |
| `GET` | `/psb-processes/:id` | `akademik.psb.read` | - | `{ data: object (with units, groups, tests) }` |
| `PUT` | `/psb-processes/:id` | `akademik.psb.manage` | `{ name?: string, target_academic_year?: string, status?: string, ... }` | `{ data: object }` |
| `DELETE`| `/psb-processes/:id` | `akademik.psb.manage` | - | `{ data: { id: number, deleted: boolean } }` |
| `GET` | `/psb-processes/:id/units` | `akademik.psb.read` | - | `{ data: array }` |
| `PUT` | `/psb-processes/:id/units` | `akademik.psb.manage` | `{ units: array<{ satuan_pendidikan_id: number, code_prefix: string, target_registrants: number, quota_male: number, quota_female: number }> }` | `{ data: array }` |
| `GET` | `/psb-processes/:id/dashboard` | `akademik.psb.read` | - | `{ data: { total_registrants: number, status_breakdown: object, units_stats: array, groups_stats: array } }` |
| `GET` | `/psb-groups` | `akademik.psb.read` | Query: `?psb_process_id=&satuan_pendidikan_id=&is_active=` | `{ data: array }` |
| `POST` | `/psb-groups` | `akademik.psb.manage` | `{ psb_process_id: number, name: string, quota?: number, start_date?: string, end_date?: string, is_active?: boolean }` | `{ data: object }` |
| `GET` | `/psb-groups/:id` | `akademik.psb.read` | - | `{ data: object }` |
| `PUT` | `/psb-groups/:id` | `akademik.psb.manage` | `{ name?: string, quota?: number, is_active?: boolean, ... }` | `{ data: object }` |
| `DELETE`| `/psb-groups/:id` | `akademik.psb.manage` | - | `{ data: { id: number, deleted: boolean } }` |
| `GET` | `/psb-registrants` | `akademik.psb.read` | Query: `?psb_process_id=&satuan_pendidikan_id=&psb_group_id=&status=&entry_type=&search=&page=&limit=` | `{ data: array, pagination: object }` |
| `POST` | `/psb-registrants` | `akademik.psb.manage` | `{ psb_process_id: number, satuan_pendidikan_id: number, full_name: string, nisn?: string, father_name?: string, mother_name?: string, parent_contact?: string, entry_type?: string, ... }` | `{ data: object }` |
| `GET` | `/psb-registrants/:id` | `akademik.psb.read` | - | `{ data: object (with documents, test_sessions, placement_logs) }` |
| `PUT` | `/psb-registrants/:id` | `akademik.psb.manage` | `{ full_name?: string, psb_group_id?: number, fee_group_id?: number, status?: string, ... }` | `{ data: object }` |
| `DELETE`| `/psb-registrants/:id` | `akademik.psb.manage` | - | `{ data: { id: number, deleted: boolean } }` |
| `POST` | `/psb-registrants/:id/create-account` | `akademik.psb.manage` | - | `{ data: { psb_registrant_id: number, user_account_id: number, username: string, password: string } }` |
| `POST` | `/psb-registrants/:id/place` | `akademik.psb.manage` | `{ class_group_id: number, academic_year_id: number, nipd?: string, notes?: string }` | `{ data: { psb_registrant_id: number, student_id: number, class_group_id: number, placed_nipd: string } }` |
| `GET` | `/psb-registrants/:id/documents` | `akademik.psb.read` | - | `{ data: array }` |
| `POST` | `/psb-registrants/:id/documents` | `akademik.psb.manage` | `{ document_type: string, document_name: string, file_url: string, notes?: string }` | `{ data: object }` |
| `PUT` | `/psb-registrants/:id/documents/:docId/verify` | `akademik.psb.manage` | `{ notes?: string }` | `{ data: object }` |
| `DELETE`| `/psb-registrants/:id/documents/:docId` | `akademik.psb.manage` | - | `{ data: { id: number, deleted: boolean } }` |
| `GET` | `/psb-tests` | `akademik.psb.read` | Query: `?psb_process_id=&is_active=` | `{ data: array }` |
| `POST` | `/psb-tests` | `akademik.psb.manage` | `{ psb_process_id: number, name: string, duration_minutes?: number, passing_score?: number, is_active?: boolean }` | `{ data: object }` |
| `GET` | `/psb-tests/:id` | `akademik.psb.read` | - | `{ data: object (with questions) }` |
| `PUT` | `/psb-tests/:id` | `akademik.psb.manage` | `{ name?: string, duration_minutes?: number, passing_score?: number, is_active?: boolean }` | `{ data: object }` |
| `DELETE`| `/psb-tests/:id` | `akademik.psb.manage` | - | `{ data: { id: number, deleted: boolean } }` |
| `POST` | `/psb-tests/:id/questions` | `akademik.psb.manage` | `{ question_type: string, question_text: string, options?: array, correct_answer?: string, score_weight?: number, order_number?: number }` | `{ data: object }` |
| `PUT` | `/psb-test-questions/:questionId` | `akademik.psb.manage` | `{ question_type?: string, question_text?: string, options?: array, correct_answer?: string, score_weight?: number }` | `{ data: object }` |
| `DELETE`| `/psb-test-questions/:questionId` | `akademik.psb.manage` | - | `{ data: { id: number, deleted: boolean } }` |
| `GET` | `/psb-test-sessions` | `akademik.psb.read` | Query: `?psb_test_id=&psb_registrant_id=&status=` | `{ data: array }` |
| `POST` | `/psb-test-sessions` | `akademik.psb.manage` | `{ psb_test_id: number, psb_registrant_id: number, scheduled_at?: string }` | `{ data: object }` |
| `GET` | `/psb-test-sessions/:id` | `akademik.psb.read` | - | `{ data: object (with questions & answers) }` |
| `POST` | `/psb-test-sessions/:id/submit` | `akademik.psb.manage` | `{ answers: array<{ question_id: number, answer_text: string }> }` | `{ data: { session_id: number, status: string, total_score: number, is_passed: boolean } }` |
| `PUT` | `/psb-test-sessions/:id/grade` | `akademik.psb.manage` | `{ answers: array<{ answer_id: number, score_awarded: number }> }` | `{ data: { session_id: number, status: string, total_score: number, is_passed: boolean } }` |

### 3.8 Integrasi Antar-Layanan (Internal X-API-Key)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/internal/students/:id` | `X-API-Key` | - | `{ id, full_name, nisn, class_group_name, status }` |
| `GET` | `/internal/students` | `X-API-Key` | Query: `?satuan_pendidikan_id=&status=active` | `{ students: array<{ id, full_name, nisn, class_group_id, class_group_name }> }` |
| `GET` | `/internal/students/:id/guardians` | `X-API-Key` | - | `{ guardians: array }` |
| `GET` | `/internal/class-groups/:id` | `X-API-Key` | - | `{ id, name, grade_level_id, academic_year_id, student_count }` |
| `GET` | `/internal/class-groups` | `X-API-Key` | Query: `?satuan_pendidikan_id=&academic_year_id=&grade_level_id=` | `{ class_groups: array<{ id, name, grade_level_id, academic_year_id, student_count }> }` |
| `GET` | `/internal/academic-years` | `X-API-Key` | Query: `?satuan_pendidikan_id=&is_active=` | `{ academic_years: array<{ id, name, start_date, end_date, is_active }> }` |
| `GET` | `/internal/cohorts` | `X-API-Key` | Query: `?satuan_pendidikan_id=&year=` | `{ cohorts: array<{ id, name, year }> }` |
| `GET` | `/internal/grade-levels` | `X-API-Key` | Query: `?satuan_pendidikan_id=` | `{ grade_levels: array<{ id, name, level_order }> }` |
| `POST` | `/internal/scores/exam-result` | `X-API-Key` (CBE) | `{ student_id: number, subject_id: number, exam_type: string, score: number }` | `{ received: boolean }` |
| `POST` | `/internal/psb/intake` | `X-API-Key` (Website Utama) | `{ school_unit_id: number, school_year: string, candidate_full_name: string, candidate_address?: string, parent_contact?: string, ... }` | `{ data: { psb_registrant_id, academic_ref_id, registration_number, username, password } }` |

---

### 4. Workflows & State Machines

- **Student Lifecycle & Audit Trail:**
  - `PSB Placement (Penempatan Baru)` -> Masuk ke `students` (status: `aktif`), buat initial admission di `student_admissions`, enroll di `student_class_enrollments`, dan catat jejak pertama di `student_class_history` (enrollment_type: `psb_placement`).
  - `Kenaikan Kelas (Promotion / Retention)` -> Dieksekusi melalui wizard `POST /students/promote`. Siswa dipindahkan ke rombel baru di tahun ajaran tujuan, status enrollment lama ditutup, dan dicatat di `student_class_history` (enrollment_type: `promotion`, decision: mis. "Naik ke Kelas 8A" atau "Tinggal di Kelas 7A").
  - `Kelulusan Akhir (Graduation / Alumni)` -> `POST /students/graduate` mengubah status `students.status` menjadi `lulus`, membuat record mutasi kelulusan di `student_mutations` (dengan nomor SK kelulusan & tanggal kelulusan), menonaktifkan enrollment rombel aktif, dan menyediakan data cetak SKL/ijazah melalui `GET /students/:id/graduation-certificate-data`.
  - `Mutasi Keluar / DO` -> `POST /student-mutations` (mutation_type: `pindah_keluar`, `keluar`, `transferred`, `dropped_out`) mengubah status siswa menjadi `pindah`/`keluar`, menonaktifkan enrollment aktif, dengan jejak historis di `student_class_history` tetap utuh (append-only).
- **Tahun Ajaran / Semester Activation:** Satu tahun ajaran & satu semester aktif per satuan pendidikan; aktivasi satu semester otomatis menonaktifkan semester lain pada unit tersebut (`is_active = 1` vs `0`).
- **Student Enrollment:** Siswa baru -> masuk antrean Unassigned (`unassigned-students`) -> di-assign ke Rombel (`student_class_enrollments`) -> kenaikan kelas / mutasi (`promote` / `transfer`).
- **Schedule Presets:** `draft (is_active: false)` <-> `active (is_active: true)` *(perubahan jadwal mencatat riwayat wajib alasan di `subject_schedule_logs`)*.
- **Leave Request:** `pending -> approved` *(otomatis membuat record di `student_attendances` sebagai `permitted`/`sick`)* OR `pending -> rejected`.
- **e-Rapor Lifecycle:** Input TP & Nilai Formatif/Sumatif -> Proses Nilai Rapor -> Generate Rapor Draft -> Input Catatan Wali Kelas -> Finalisasi & Publish Rapor.

### 4.1 Mesin Solver Jadwal Pelajaran Otomatis (Timetable Generation Engine)
Modul backend (`apps/api-backend/src/modules/akademik/timetable/engine/`) mengimplementasikan algoritma optimasi jadwal anti-bentrok 2-fase:
1. **`BlockBuilder.js`:** Mengelompokkan beban jam mengajar (`teaching_duties`) menjadi blok sesi jam berurutan (single, double, triple slots), menginisialisasi matriks grid waktu mingguan, serta menempatkan entri non-KBM (upacara, istirahat, sholat) dan jadwal yang dikunci (*locked entries*).
2. **`ConstraintChecker.js`:** Memvalidasi *Hard Constraints* secara ketat:
   - Anti guru mengajar ganda pada jam yang sama (*no teacher clash*).
   - Anti rombel belajar 2 mapel bersamaan (*no class clash*).
   - Batas maksimal jam ajar guru per hari (*max daily load*).
   - Validasi ketersediaan waktu guru (*teacher availability constraints*).
3. **`Phase1FeasibilitySolver.js` (Fase 1 - Feasibility Search):** Menggunakan teknik CSP (*Constraint Satisfaction Problem*) dengan kombinasi algoritma MRV (*Minimum Remaining Values*), LCV (*Least Constraining Value*), dan *Forward Checking* untuk menemukan slot grid yang 100% valid secara matematis.
4. **`Phase2QualityOptimizer.js` (Fase 2 - Quality Optimization):** Menerapkan algoritma *Simulated Annealing* dengan pendinginan adaptif dan mutasi swap/move blok untuk mencapai solusi dengan penalti *Soft Constraints* terendah.
5. **`Scorer.js` (Fungsi Penalti Kualitas):** Menghitung penalti soft constraints:
   - *Teacher Idle Gaps:* Penalti jeda jam kosong berlebih bagi guru di hari yang sama.
   - *Load Distribution:* Penalti distribusi beban ajar yang tidak merata antar hari kerja.
   - *Subject Separation:* Penalti mapel yang sama diajarkan berturut-turut di hari berdekatan tanpa jeda hari.
   - *Heavy Subject Timing:* Prioritas penempatan mapel berkategori eksak/berat pada jam pagi.
6. **`TimetableEngine.js`:** Façade & orchestrator utama yang menyatukan alur eksekusi, parsing data masukan, dan penyimpanan jadwal hasil optimasi ke database.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

### 5.1 Modul Akademik Utama (`apps/core-portal/src/apps/akademik/`)
| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/akademik/login` | `src/apps/akademik/pages/Login.jsx` | Login form khusus staf akademik & kurikulum |
| `/akademik/dashboard` | `src/apps/akademik/pages/Dashboard.jsx` | Statistik siswa, rombel, kehadiran harian & shortcut |
| `/akademik/students` *(alias: `/akademik/siswa`)* | `src/apps/akademik/pages/DataSiswa.jsx` | Master data siswa, filter cohort/status/rombel, form wizard Dapodik |
| `/akademik/students/:id` *(alias: `/akademik/siswa/:id`)* | `src/apps/akademik/pages/DetailSiswa.jsx` | Profil komprehensif siswa, rekap nilai, berkas, wali, fisik & tab riwayat rombel |
| `/akademik/rombel` *(alias: `/akademik/class-groups`)* | `src/apps/akademik/pages/RombelManagement.jsx` | Kelola rombel reguler/pilihan/ekskul, plot siswa unassigned, transfer & wali kelas |
| `/akademik/kenaikan-kelulusan` *(alias: `/akademik/promotion-graduation`)* | `src/apps/akademik/pages/KenaikanKelulusan.jsx` | Wizard roll-over kenaikan kelas per rombel, opsi tinggal kelas, & pengesahan kelulusan santri |
| `/akademik/master` *(alias: `/akademik/master-data`)* | `src/apps/akademik/pages/MasterAkademik.jsx` | Tahun ajaran, semester, jenjang kelas, angkatan & kalender |
| `/akademik/curriculum` *(alias: `/akademik/kurikulum`)* | `src/apps/akademik/pages/Kurikulum.jsx` | Master mapel, KKM/KKTP, pembagian tugas ajar guru & TP |
| `/akademik/scores` *(alias: `/akademik/nilai`)* | `src/apps/akademik/pages/InputNilai.jsx` | Matriks rekap nilai, input nilai TP/formatif/sumatif, leger |
| `/akademik/extracurricular-scores` | `src/apps/akademik/pages/InputNilaiEkstrakurikuler.jsx` | Lembar input nilai predikat ekstrakurikuler siswa |
| `/akademik/report-cards` *(alias: `/akademik/rapor`)* | `src/apps/akademik/pages/Rapor.jsx` | Generator cetak buku rapor Kurikulum Merdeka & K13 |
| `/akademik/attendance` *(alias: `/akademik/presensi`)* | `src/apps/akademik/pages/Presensi.jsx` | Presensi harian kelas, presensi per jam pelajaran, presensi kegiatan & approval izin |
| `/akademik/student-affairs` *(alias: `/akademik/kesiswaan`)* | `src/apps/akademik/pages/Kesiswaan.jsx` | Poin pelanggaran, catatan prestasi, bimbingan konseling |
| `/akademik/extracurriculars` | `src/apps/akademik/pages/Ekstrakurikuler.jsx` | Master ekskul, pembina & pendaftaran anggota siswa |
| `/akademik/schedules` *(alias: `/akademik/jadwal`)* | `src/apps/akademik/pages/JadwalPelajaran.jsx` | Matriks jadwal pelajaran anti-bentrok, preset ramadhan/reguler |
| `/akademik/calendar` *(alias: `/akademik/kalender`)* | `src/apps/akademik/pages/KalenderAkademik.jsx` | Kalender agenda akademik interaktif |
| `/akademik/psb/proses` | `src/apps/akademik/pages/PSBProcess.jsx` | Kelola periode PSB, konteks satuan/yayasan, kode prefix, kuota L/P & target |
| `/akademik/psb/kelompok` | `src/apps/akademik/pages/PSBGroups.jsx` | Kelola kelompok/gelombang pendaftaran & monitoring kuota kapasitas |
| `/akademik/psb/pendataan` | `src/apps/akademik/pages/PSBRegistrants.jsx` | Tabel calon murid, filter status/gelombang, input manual, buat akun portal & plotting fee |
| `/akademik/psb/pendataan/:id` | `src/apps/akademik/pages/PSBRegistrantDetail.jsx` | Detail pendaftar, verifikasi berkas dokumen fisik, rekap skor tes & log penempatan |
| `/akademik/psb/testing` | `src/apps/akademik/pages/PSBTests.jsx` | Builder ujian seleksi (pilihan ganda, isian, essay) & penjadwalan sesi tes calon murid |
| `/akademik/psb/penempatan` | `src/apps/akademik/pages/PSBPlacement.jsx` | Antrean santri lulus tes/terdaftar untuk penempatan rombel definitif & input NIPD |
| `/akademik/riwayat-data` *(alias: `/akademik/academic-history`)* | `src/apps/akademik/pages/RiwayatAkademik.jsx` | Pusat arsip data lampau: tambah cepat alumni, kelola struktur tahun historis & matriks input/impor nilai rapor Excel |

### 5.2 Sub-Interface Portal Guru (`apps/core-portal/src/apps/guru/`)
| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/guru/login` | `src/apps/guru/pages/Login.jsx` | Login portal guru terintegrasi |
| `/guru/dashboard` | `src/apps/guru/pages/Dashboard.jsx` | Ringkasan jadwal ajar hari ini, notifikasi 5 menit, quick actions |
| `/guru/jadwal` | `src/apps/guru/pages/JadwalMengajar.jsx` | Kalender jadwal mengajar pribadi guru |
| `/guru/absensi` *(alias: `/guru/presensi`)* | `src/apps/guru/pages/AbsensiDiri.jsx` | Presensi diri GPS radius HRD & upload foto selfie |
| `/guru/absensi-kelas` | `src/apps/guru/pages/AbsensiKelas.jsx` | Form cepat presensi siswa di jam pelajaran yang sedang diajar |
| `/guru/nilai` *(alias: `/guru/penilaian`)* | `src/apps/guru/pages/InputNilai.jsx` | Form input nilai kelas & mapel yang diampu guru |
| `/guru/tujuan-pembelajaran` *(alias: `/guru/tp`)* | `src/apps/guru/pages/TujuanPembelajaran.jsx` | Penyusunan bank Tujuan Pembelajaran (TP) per mata pelajaran |
| `/guru/siswa` | `src/apps/guru/pages/InformasiSiswa.jsx` | Direktori kontak santri/wali kelas binaan |
| `/guru/pengumuman` | `src/apps/guru/pages/Pengumuman.jsx` | Papan informasi & edaran kurikulum sekolah |
| `/guru/profil` *(alias: `/guru/profile`)* | `src/apps/guru/pages/ProfilSaya.jsx` | Data kepegawaian guru, riwayat ajar & launcher PWA Android |

### 5.3 Portal Calon Santri & Murid (`apps/core-portal/src/apps/calon-murid/`)
| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/calon-murid/login` | `src/apps/calon-murid/pages/Login.jsx` | Login pendaftar calon santri PSB |
| `/calon-murid/dashboard` | `src/apps/calon-murid/pages/Dashboard.jsx` | Status tahap pendaftaran, ringkasan timeline & pengumuman kelulusan |
| `/calon-murid/data-lengkap` | `src/apps/calon-murid/pages/DataLengkap.jsx` | Formulir data pokok peserta didik standar Dapodik calon santri |
| `/calon-murid/dokumen` | `src/apps/calon-murid/pages/Dokumen.jsx` | Upload scan KK, Akta, Ijazah & pas foto |
| `/calon-murid/tes` | `src/apps/calon-murid/pages/TesSeleksi.jsx` | Daftar jadwal sesi ujian seleksi & tombol mulai ujian |
| `/calon-murid/tes/:sessionId/kerjakan` | `src/apps/calon-murid/pages/IsiTesPublik.jsx` | Lembar pengerjaan tes seleksi online dengan timer mundur |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi JWT SSO, penarikan data Satuan Pendidikan & Yayasan, sinkronisasi & pembuatan akun user siswa/wali/calon murid (`POST /api/v1/core/internal/users` & `PATCH /api/v1/core/internal/users/sync`), audit logging (`POST /api/v1/core/internal/activity-logs`).
  - `kepegawaian`: Data guru pengajar, wali kelas, guru BK, pembina ekskul (`teacher_employee_id` via `GET /api/v1/kepegawaian/internal/employees`), presensi GPS guru.
  - `sarpras`: Data master ruangan kelas & laboratorium (`GET /api/v1/sarpras/internal/rooms`) untuk pemetaan rombel dan plotting jadwal pelajaran anti-bentrok.
  - `keuangan`: Sinkronisasi master kelompok biaya pendidikan (`fee_groups`) untuk penetapan beban biaya awal calon murid PSB.
  - `manajemen`: Integrasi program & langkah kerja RKT (`GET /api/v1/manajemen/annual-work-plan/annual-work-plans/current` / `work_plan_activities`) untuk penautan kegiatan kalender pendidikan.
- **Modul yang Memanggil Akademik (Consumers):**
  - `website-utama`: Sinkronisasi otomatis data formulir pendaftaran PPDB online publik via internal intake (`POST /api/v1/akademik/internal/psb/intake`) untuk registrasi calon murid & auto-provisioning akun SSO portal pendaftar.
  - `keuangan`: Mengambil data master dan data operasional akademik via internal API (`GET /api/v1/akademik/internal/students`, `/internal/students/:id`, `/internal/students/:id/guardians`, `/internal/class-groups/:id`, `/internal/academic-years`, `/internal/cohorts`, `/internal/grade-levels`, `/internal/class-groups`) untuk generate tagihan SPP massal, verifikasi dispensasi, dan verifikasi wali murid.
  - `kantin`: Verifikasi santri aktif untuk transaksi kasir POS & pembatasan saldo/limit jajan.
  - `perpustakaan`: Data siswa & rombel untuk registrasi kartu anggota perpustakaan otomatis.
  - `alquran`: Data santri & rombel untuk penetapan target tahfidz, mutaba'ah harian, dan munaqasyah.
  - `manajemen`: Agregat statistik siswa, ketidakhadiran, distribusi nilai, dan monev kurikulum untuk dashboard RIPS/RKS.
  - `portal-orangtua`: Nilai e-rapor, presensi harian siswa, permohonan izin sakit, dan kalender akademik.
  - `cbe`: Sinkronisasi rombel, jadwal ujian, dan kirim nilai hasil ujian CBT (`POST /api/v1/akademik/internal/scores/exam-result`).

---

## 7. Gap / TODO Teridentifikasi dari PRD & Perbedaan Skema

1. **Perluasan Skema dari Dokumen Awal (`erd-akademik.md`):** Dokumen awal merancang 23 tabel. Implementasi aktual Knex berkembang menjadi **55 tabel** untuk mendukung standar data pokok pendidikan Dapodik (alamat detail, fisik periodik, kelengkapan berkas, checklist rekap rapor masuk), Kurikulum Merdeka (TP & nilai TP), modul preset jadwal pelajaran anti-bentrok & multi-teacher duty logs, modul PSB / Penerimaan Murid Baru terintegrasi (10 tabel), presensi per jam pelajaran (`lesson_attendances`) & presensi kegiatan (`activity_attendances`), audit trail riwayat kronologis rombel siswa (`student_class_history`), kalender pendidikan berversi & master warna (`calendar_document_versions` & `calendar_event_categories`), serta tabel arsip nilai akhir rapor per mapel (`report_card_subject_scores`).
2. **Kalkulasi e-Rapor & Materialisasi Nilai Akhir:** Skema penyimpanan nilai akhir per mapel hasil cetak atau impor riwayat lampau telah dimaterialisasi melalui tabel `report_card_subject_scores` dengan metadata `report_cards.data_source` & `report_cards.is_legacy`.
3. **Database-backed API Key Validation:** Endpoint internal `/api/v1/akademik/internal/*` saat ini memvalidasi keberadaan header `X-API-Key` via middleware, belum melakukan pengecekan hashing ke tabel `core.api_clients`.

---

<!-- updated: 2026-08-31 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
