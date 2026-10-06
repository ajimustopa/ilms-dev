Status: perlu-revisi
Diperbarui: 2026-08-24

# erd-akademik.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 (prinsip arsitektur global) & `rancangan-akademik.md`
> Bagian 4–5 (ruang lingkup fitur draf & keputusan terbuka). Database: MariaDB 10.5. Query
> builder: Knex.js. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`, semua tabel punya
> `created_at`/`updated_at TIMESTAMP` (tidak ditulis ulang di tiap tabel di bawah supaya ringkas —
> anggap ada di semua tabel kecuali tabel log yang disebutkan *append-only*).
>
> **Status dokumen ini: DRAF, BELUM FINAL.** Berbeda dari `erd-coreservice.md`/`erd-kepegawaian.md`
> yang sudah final, ERD ini dibuat berdasarkan daftar fitur **draf** (29 dari 36 fitur teridentifikasi
> di `rancangan-akademik.md` §4) dan sejumlah keputusan yang **masih terbuka** di
> `rancangan-akademik.md` §5 (struktur kurikulum SKS vs klasikal, skema penilaian, granularitas
> presensi, dsb). Jangan dipakai untuk menulis migration Tahap 2 sebelum keputusan-keputusan itu
> dikonfirmasi — asumsi yang dipakai di tiap tabel di bawah ditandai eksplisit.

## 0. Asumsi yang Dipakai (Menunggu Konfirmasi `rancangan-akademik.md` §5)

Karena beberapa poin di §5 belum diputuskan, ERD ini memakai **asumsi sementara** yang paling
umum dipakai sekolah (model klasikal), supaya Tahap 1 tidak berhenti total. **Ini bukan keputusan
final** — tandai baris mana yang berubah kalau asumsi salah:

| # | Poin Terbuka | Asumsi Sementara yang Dipakai di ERD Ini | Dampak kalau Berubah |
|---|---|---|---|
| 1 | Model kurikulum | **Klasikal**: satu siswa = satu rombel per tahun ajaran (bukan SKS lintas minat) | Kalau ternyata SKS, tabel `student_class_enrollments` perlu ditambah relasi per-mapel, bukan hanya per-rombel |
| 2 | Skema penilaian & rapor | Mendukung **nilai angka** (kolom `score DECIMAL`) **dan** `description TEXT` untuk capaian pembelajaran, supaya fleksibel dipakai kedua kurikulum — kolom `kkm` di `subjects` nullable | Kalau ternyata hanya satu skema, beberapa kolom bisa disederhanakan |
| 3 | Granularitas presensi | **Per hari** (satu baris presensi per siswa per hari, dicatat wali kelas), bukan per jam pelajaran | Kalau ternyata per jam pelajaran, tabel `student_attendances` perlu kolom `teaching_assignment_id` dan jadi jauh lebih besar volumenya |
| 4 | Kerahasiaan catatan BK | Tabel `counseling_records` dipisah dari `student_disciplinary_records`, dengan kolom `visibility_level` (`bk_only` / `bk_and_homeroom` / `all_staff`) | Kalau tidak perlu level kerahasiaan, kolom ini bisa dihapus |
| 5 | Kalender akademik & presensi otomatis | `academic_calendar_events` murni referensi, **belum** otomatis menandai presensi libur (perlu logic tambahan di service layer kalau disetujui) | — |
| 6 | Event webhook siswa/ortu | Baris di tabel `webhook_events`-nya sendiri **tidak dibuat di sini** — Akademik memakai ulang mekanisme publish milik Core Service lewat pemanggilan service in-process, bukan tabel event lokal terpisah (perlu dikonfirmasi apakah ini benar, lihat Bagian 5 di bawah) | Kalau Akademik ternyata perlu antrian publish sendiri, tambah tabel `outbound_webhook_queue` |

**Penamaan:** seluruh nama tabel dan kolom memakai **Bahasa Inggris, `snake_case`**, konsisten
dengan `erd-coreservice.md` dan `erd-kepegawaian.md`. Istilah asli Indonesia dicatat sebagai
referensi di deskripsi tiap tabel, bukan jadi nama kolom.

## 1. Daftar Entitas (22 Tabel — Diperluas Dapodik)

| Modul (rancangan-akademik.md §4) | Tabel | `satuan_pendidikan_id`? |
|---|---|---|
| Data Master Siswa | `students` | **Ya** |
| Data Master Siswa | `student_addresses` (1:1) | Tidak langsung (ikut `students`) |
| Data Master Siswa | `student_physical_data` (1:1) | Tidak langsung (ikut `students`) |
| Data Master Siswa | `student_admissions` (1:1) | Tidak langsung (ikut `students`) |
| Data Master Siswa | `student_document_checklists` (1:1) | Tidak langsung (ikut `students`) |
| Data Master Siswa | `guardians` | Tidak langsung (lihat §2.2) |
| Data Master Siswa | `student_guardians` (pivot) | Tidak |
| Data Master Siswa | `student_mutations` | **Ya** |
| Kurikulum | `academic_years` | Tidak (yayasan-wide, dipakai lintas satuan) |
| Kurikulum | `semesters` | Tidak |
| Kurikulum | `grade_levels` (tingkat) | Tidak (referensi global, mis. Kelas 1–6) |
| Kurikulum | `class_groups` (rombel) | **Ya** |
| Kurikulum | `student_class_enrollments` | **Ya** |
| Kurikulum | `subjects` (mata pelajaran) | **Ya** |
| Kurikulum | `teaching_assignments` (jadwal ajar) | **Ya** |
| Kurikulum | `teaching_journals` (jurnal mengajar guru) | **Ya** (lewat `subject_schedules`) |
| Penilaian & Rapor | `student_scores` | **Ya** (lewat `class_groups`) |
| Penilaian & Rapor | `student_attitude_scores` | **Ya** |
| Penilaian & Rapor | `report_cards` | **Ya** |
| Presensi | `student_attendances` | **Ya** |
| Presensi | `student_leave_requests` | **Ya** |
| Kesiswaan | `student_disciplinary_records` | **Ya** |
| Kesiswaan | `student_achievements` | **Ya** |
| Kesiswaan | `counseling_records` | **Ya** |
| Kesiswaan | `extracurriculars` | **Ya** |
| Kesiswaan | `extracurricular_members` | Tidak langsung (ikut `extracurriculars`) |
| Kesiswaan | `academic_calendar_events` | Ya (nullable = yayasan-wide) |
| Keamanan | `activity_logs` | Ya (nullable) — *append-only* |

> Fitur "Webhook publisher perubahan data siswa/ortu" & "Provisioning akun siswa/ortu ke Core
> Service" **tidak punya tabel sendiri** di draf ini (lihat asumsi #6 di atas) — dipanggil
> langsung ke service Core Service in-process.

## 2. Detail Tabel

### 2.1 `students`
*(Fitur "CRUD data induk siswa")* Data induk siswa — pemilik tunggal data ini di seluruh sistem. Diperluas dengan atribut standar Dapodik.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | ID ke `school_units` milik Core Service — **tanpa FK fisik** |
| `nis` | VARCHAR(30) | Nomor Induk Siswa, unik per satuan pendidikan |
| `nisn` | VARCHAR(20) NULLABLE | Nomor Induk Siswa Nasional, unik global |
| `nipd` | VARCHAR(30) NULLABLE | Nomor Induk Peserta Didik (Dapodik) |
| `family_card_number` | VARCHAR(20) NULLABLE | No. Kartu Keluarga — **[SENSITIF - Perlu Masking API/Enkripsi At-Rest]** |
| `nik` | VARCHAR(20) NULLABLE | NIK Siswa — **[SENSITIF - Perlu Masking API/Enkripsi At-Rest]** |
| `full_name` | VARCHAR(150) | Nama lengkap siswa |
| `nickname` | VARCHAR(50) NULLABLE | Nama panggilan |
| `gender` | ENUM('L','P') | Jenis kelamin |
| `birth_place` | VARCHAR(100) NULLABLE | Tempat lahir |
| `birth_date` | DATE NULLABLE | Tanggal lahir |
| `birth_certificate_reg_no` | VARCHAR(50) NULLABLE | Nomor registrasi akta kelahiran |
| `order_in_family` | SMALLINT UNSIGNED NULLABLE | Anak ke- berapa dalam keluarga |
| `number_of_siblings` | SMALLINT UNSIGNED NULLABLE | Jumlah saudara kandung |
| `number_of_step_siblings` | SMALLINT UNSIGNED NULLABLE | Jumlah saudara tiri |
| `number_of_adoptive_siblings` | SMALLINT UNSIGNED NULLABLE | Jumlah saudara angkat |
| `religion` | ENUM('islam','kristen','katolik','hindu','buddha','konghucu','lainnya') NULLABLE | Agama |
| `citizenship` | VARCHAR(50) NULLABLE | Kewarganegaraan, default `'WNI'` |
| `special_needs` | VARCHAR(100) NULLABLE | Jenis kebutuhan khusus (jika ada) |
| `primary_language` | VARCHAR(50) NULLABLE | Bahasa sehari-hari di rumah |
| `hobby` | VARCHAR(100) NULLABLE | Hobi |
| `ambition` | VARCHAR(100) NULLABLE | Cita-cita |
| `address` | TEXT NULLABLE | Ringkasan alamat domisili (legacy/kompatibilitas) |
| `photo_url` | VARCHAR(255) NULLABLE | Link foto profil |
| `user_id` | BIGINT UNSIGNED NULLABLE | ID ke `users` milik Core Service setelah akun diprovisioning — **tanpa FK fisik** |
| `status` | ENUM('calon','aktif','lulus','pindah','keluar') | default `calon` |
| `enrolled_at` | DATE NULLABLE | Tanggal mulai masuk |

### 2.1A `student_addresses` (Relasi 1:1 ke `students`)
*(Fitur "Alamat & Domisili Siswa")* Dipisah ke tabel 1:1 terpisah agar tabel `students` tetap ringan pada query list `GET /students`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED UNIQUE FK → `students.id` | CASCADE on delete |
| `street_address` | TEXT NULLABLE | Alamat jalan / nama jalan & nomor rumah |
| `rt` | VARCHAR(5) NULLABLE | RT |
| `rw` | VARCHAR(5) NULLABLE | RW |
| `hamlet` | VARCHAR(100) NULLABLE | Nama Dusun / Lingkungan |
| `village` | VARCHAR(100) NULLABLE | Kelurahan / Desa |
| `district` | VARCHAR(100) NULLABLE | Kecamatan |
| `postal_code` | VARCHAR(10) NULLABLE | Kode Pos |
| `full_address` | TEXT NULLABLE | Alamat lengkap format gabungan |
| `email` | VARCHAR(150) NULLABLE | E-mail pribadi siswa |
| `gmaps_url` | VARCHAR(255) NULLABLE | Link Google Maps titik koordinat |
| `latitude` | DECIMAL(10,8) NULLABLE | Lintang |
| `longitude` | DECIMAL(11,8) NULLABLE | Bujur |
| `residence_type` | VARCHAR(50) NULLABLE | Tempat tinggal (mis. Bersama Orang Tua, Wali, Asrama, Kos, Panti Asuhan) |
| `transportation_mode` | VARCHAR(50) NULLABLE | Moda transportasi ke sekolah (mis. Jalan Kaki, Sepeda, Motor, Angkutan Umum, Antar-Jemput) |
| `travel_distance_km` | DECIMAL(5,2) NULLABLE | Jarak tempuh rumah ke sekolah dalam km |
| `travel_time_minutes` | INT UNSIGNED NULLABLE | Estimasi waktu tempuh ke sekolah dalam menit |

### 2.1B `student_physical_data` (Relasi 1:1 ke `students`)
*(Fitur "Data Fisik & Kesehatan Siswa")* Data periodik/fisik siswa.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED UNIQUE FK → `students.id` | CASCADE on delete |
| `height_cm` | DECIMAL(5,2) NULLABLE | Tinggi badan (cm) |
| `weight_kg` | DECIMAL(5,2) NULLABLE | Berat badan (kg) |
| `blood_type` | ENUM('A','B','AB','O','tidak_tahu') NULLABLE | Golongan darah |
| `medical_history` | TEXT NULLABLE | Riwayat penyakit berat yang pernah diderita |

### 2.2 `guardians`
*(Fitur "CRUD data orang tua/wali")* Data induk orang tua/wali.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `nik` | VARCHAR(20) NULLABLE | NIK Orang Tua/Wali — **[SENSITIF - Perlu Masking API/Enkripsi At-Rest]** |
| `full_name` | VARCHAR(150) | Nama lengkap orang tua / wali |
| `birth_place` | VARCHAR(100) NULLABLE | Tempat lahir |
| `birth_date` | DATE NULLABLE | Tanggal lahir |
| `education_level` | VARCHAR(50) NULLABLE | Pendidikan terakhir (SD, SMP, SMA/SMK, D3, S1, S2, S3, Tidak Bersekolah) |
| `occupation` | VARCHAR(100) NULLABLE | Pekerjaan |
| `income_range` | VARCHAR(50) NULLABLE | Rentang penghasilan bulanan — **[SENSITIF - Perlu Masking API]** |
| `special_needs` | VARCHAR(100) NULLABLE | Berkebutuhan khusus (jika ada) |
| `phone` | VARCHAR(30) NULLABLE | Nomor telepon / WhatsApp |
| `email` | VARCHAR(150) NULLABLE | Alamat e-mail |
| `address` | TEXT NULLABLE | Alamat tempat tinggal orang tua / wali |
| `user_id` | BIGINT UNSIGNED NULLABLE | ID ke `users` Core Service setelah akun Portal Orangtua diprovisioning |

### 2.3 `student_guardians` (pivot)
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `guardian_id` | BIGINT UNSIGNED FK → `guardians.id` | |
| `relationship` | ENUM('ayah','ibu','wali_lain') | Relasi dengan siswa |
| `expense_bearer` | VARCHAR(50) NULLABLE | Penanggung biaya pendidikan (mis. 'ayah', 'ibu', 'wali', 'beasiswa', 'sendiri') |
| `is_primary_contact` | BOOLEAN | default `false` |

### 2.4 `student_mutations`
*(Fitur "Riwayat mutasi siswa")* Riwayat mutasi masuk, pindah masuk, pindah keluar, dan kelulusan siswa.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `mutation_type` | ENUM('masuk','pindah_keluar','pindah_masuk','lulus','keluar') | Jenis mutasi |
| `mutation_date` | DATE | Tanggal mutasi |
| `origin_or_destination_school` | VARCHAR(150) NULLABLE | Nama sekolah asal (masuk) atau sekolah tujuan (pindah) |
| `notes` | TEXT NULLABLE | Catatan tambahan mutasi |
| `exam_participant_number` | VARCHAR(50) NULLABLE | *(Khusus Lulus)* Nomor Peserta Ujian |
| `diploma_certificate_number` | VARCHAR(50) NULLABLE | *(Khusus Lulus)* Nomor Seri Ijazah Dinas |
| `skhun_number` | VARCHAR(50) NULLABLE | *(Khusus Lulus)* Nomor Seri SKHUN Dinas |
| `next_school_name` | VARCHAR(150) NULLABLE | *(Khusus Lulus)* Sekolah lanjutan |
| `transfer_reason` | TEXT NULLABLE | *(Khusus Pindah Keluar)* Alasan pindah |
| `exit_letter_number` | VARCHAR(50) NULLABLE | *(Khusus Pindah Keluar)* Nomor Surat Keluar |
| `acceptance_letter_status` | VARCHAR(100) NULLABLE | *(Khusus Pindah Keluar)* Keterangan diterima di sekolah tujuan |
| `dapodik_mutation_letter_status` | ENUM('belum_diproses','dalam_proses','sudah_terbit','selesai') NULLABLE | *(Khusus Pindah Keluar)* Status surat mutasi Dapodik |

### 2.4A `student_admissions` (Relasi 1:1 ke `students`)
*(Fitur "Registrasi Masuk Siswa Baru/Pindahan")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED UNIQUE FK → `students.id` | CASCADE on delete |
| `initial_grade_level_id` | BIGINT UNSIGNED NULLABLE FK → `grade_levels.id` | Tingkat kelas awal saat mendaftar |
| `initial_class_group_id` | BIGINT UNSIGNED NULLABLE FK → `class_groups.id` | Rombel awal saat pendaftaran |
| `registration_type` | ENUM('siswa_baru','pindahan') NOT NULL DEFAULT 'siswa_baru' | Jenis pendaftaran |
| `admission_date` | DATE NOT NULL | Tanggal resmi masuk sekolah |
| `previous_school_name` | VARCHAR(150) NULLABLE | Nama sekolah asal sebelumnya (untuk pindahan/SD/SMP asal) |
| `previous_school_address` | TEXT NULLABLE | Alamat sekolah asal |

### 2.4B `student_document_checklists` (Relasi 1:1 ke `students`)
*(Fitur "Checklist Kelengkapan Berkas & Onboarding Siswa")* Menggunakan boolean terpisah antara status penyerahan berkas (`*_submitted`) dan validasi oleh staf tata usaha (`*_verified`).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED UNIQUE FK → `students.id` | CASCADE on delete |
| `form_submitted` / `form_verified` | BOOLEAN DEFAULT false | Formulir pendaftaran siswa |
| `birth_cert_submitted` / `birth_cert_verified` | BOOLEAN DEFAULT false | Salinan Akta Kelahiran |
| `family_card_submitted` / `family_card_verified` | BOOLEAN DEFAULT false | Salinan Kartu Keluarga |
| `father_ktp_submitted` / `father_ktp_verified` | BOOLEAN DEFAULT false | Salinan KTP Ayah |
| `mother_ktp_submitted` / `mother_ktp_verified` | BOOLEAN DEFAULT false | Salinan KTP Ibu |
| `other_docs_submitted` / `other_docs_verified` | BOOLEAN DEFAULT false | Berkas pendukung lainnya |
| `photo_2x3_submitted` / `photo_2x3_verified` | BOOLEAN DEFAULT false | Pas foto ukuran 2x3 |
| `photo_3x4_submitted` / `photo_3x4_verified` | BOOLEAN DEFAULT false | Pas foto ukuran 3x4 |
| `class_group_joined` / `class_group_joined_verified` | BOOLEAN DEFAULT false | Sudah dimasukkan ke grup kelas / rombel |
| `teacher_socialized` / `teacher_socialized_verified` | BOOLEAN DEFAULT false | Sosialisasi awal oleh wali/guru kelas |
| `learning_started` / `learning_started_verified` | BOOLEAN DEFAULT false | Sudah mulai mengikuti kegiatan belajar |
| `data_completed` / `data_verified` | BOOLEAN DEFAULT false | Kelengkapan seluruh data induk siswa |
| `notes` | TEXT NULLABLE | Catatan kelengkapan berkas |

### 2.5 `academic_years`
*(Fitur "CRUD tahun ajaran")* Yayasan-wide — dipakai bersama seluruh Satuan Pendidikan supaya
kalender akademik selaras lintas sekolah.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `name` | VARCHAR(20) | mis. `2026/2027` |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `is_active` | BOOLEAN | default `false` |

### 2.6 `semesters`
*(Fitur "CRUD semester")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `academic_year_id` | BIGINT UNSIGNED FK → `academic_years.id` | |
| `name` | ENUM('ganjil','genap') | |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `is_active` | BOOLEAN | default `false` |

### 2.7 `grade_levels`
*(Fitur "CRUD tingkat/jenjang kelas")* Referensi global (mis. Kelas 1–6 SD, VII–IX SMP).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `name` | VARCHAR(50) | mis. `Kelas 1`, `Kelas VII` |
| `order` | SMALLINT | urutan tampil |

### 2.8 `class_groups` (rombel)
*(Fitur "CRUD rombel/kelas")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `academic_year_id` | BIGINT UNSIGNED FK → `academic_years.id` | |
| `grade_level_id` | BIGINT UNSIGNED FK → `grade_levels.id` | |
| `name` | VARCHAR(50) | mis. `1A`, `VII-B` |
| `homeroom_teacher_employee_id` | BIGINT UNSIGNED NULLABLE | ID ke `employees` milik Kepegawaian — **tanpa FK fisik** |
| `capacity` | SMALLINT NULLABLE | |

### 2.9 `student_class_enrollments`
*(Fitur "Penempatan siswa ke rombel")* Asumsi model klasikal (§0 asumsi #1) — satu baris per
siswa per tahun ajaran.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `class_group_id` | BIGINT UNSIGNED FK → `class_groups.id` | |
| `academic_year_id` | BIGINT UNSIGNED FK → `academic_years.id` | |
| `status` | ENUM('aktif','naik_kelas','tinggal_kelas','pindah','lulus') | |

### 2.10 `subjects` (mata pelajaran)
*(Fitur "CRUD mata pelajaran")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `grade_level_id` | BIGINT UNSIGNED FK → `grade_levels.id` NULLABLE | |
| `name` | VARCHAR(100) | |
| `code` | VARCHAR(20) NULLABLE | |
| `kkm` | DECIMAL(5,2) NULLABLE | nullable sesuai asumsi #2 di §0 |

### 2.11 `teaching_assignments` (jadwal ajar)
*(Fitur "Penugasan guru mata pelajaran")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `teacher_employee_id` | BIGINT UNSIGNED | ID ke `employees` Kepegawaian — **tanpa FK fisik** |
| `subject_id` | BIGINT UNSIGNED FK → `subjects.id` | |
| `class_group_id` | BIGINT UNSIGNED FK → `class_groups.id` | |
| `day_of_week` | TINYINT NULLABLE | 1=Senin..7=Minggu |
| `period` | VARCHAR(20) NULLABLE | jam ke berapa |

### 2.11B `teaching_journals` (jurnal mengajar harian guru)
*(Fitur "Jurnal Mengajar & Log KBM Harian Guru")* Menyimpan catatan materi, pertemuan ke-N, dan rujukan tujuan pembelajaran yang diajarkan guru per jadwal per tanggal.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `schedule_id` | BIGINT UNSIGNED FK → `subject_schedules.id` | CASCADE on delete |
| `teaching_date` | DATE | Tanggal pelaksanaan KBM |
| `meeting_number` | INT UNSIGNED | Pertemuan tatap muka ke-N |
| `topic_material` | TEXT | Materi pokok / topik pembelajaran |
| `learning_objective_id` | BIGINT UNSIGNED NULLABLE FK → `learning_objectives.id` | SET NULL on delete. Rujukan TP |
| `general_notes` | TEXT NULLABLE | Catatan umum jalannya KBM / hambatan kelas |
| `teacher_employee_id` | BIGINT UNSIGNED | ID pegawai guru pengampu (Kepegawaian) |
| *Constraint* | `UNIQUE(schedule_id, teaching_date)` | Mencegah duplikasi jurnal pada jadwal & tanggal yang sama |

### 2.12 `student_scores`
*(Fitur "Input nilai harian/tugas", "Input nilai UTS/UAS", "Kalkulasi nilai akhir")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `subject_id` | BIGINT UNSIGNED FK → `subjects.id` | |
| `semester_id` | BIGINT UNSIGNED FK → `semesters.id` | |
| `score_type` | ENUM('harian','tugas','uts','uas','nilai_akhir') | |
| `score` | DECIMAL(5,2) NULLABLE | |
| `description` | TEXT NULLABLE | untuk capaian pembelajaran non-angka (asumsi #2) |
| `recorded_by_employee_id` | BIGINT UNSIGNED | ID guru pencatat, ke Kepegawaian |
| `recorded_at` | DATE | |

### 2.13 `student_attitude_scores`
*(Fitur "Input nilai sikap/karakter")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `semester_id` | BIGINT UNSIGNED FK → `semesters.id` | |
| `aspect` | VARCHAR(100) | mis. `spiritual`, `sosial` |
| `predicate` | VARCHAR(20) NULLABLE | mis. `SB`, `B`, `C` |
| `description` | TEXT NULLABLE | |

### 2.14 `report_cards`
*(Fitur "Generate rapor per semester", "Catatan wali kelas")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `semester_id` | BIGINT UNSIGNED FK → `semesters.id` | |
| `homeroom_note` | TEXT NULLABLE | |
| `file_url` | VARCHAR(255) NULLABLE | path PDF hasil generate |
| `generated_at` | TIMESTAMP NULLABLE | |
| `generated_by_employee_id` | BIGINT UNSIGNED NULLABLE | |

### 2.15 `student_attendances`
*(Fitur "Input presensi harian siswa", "Rekap presensi")* Asumsi granularitas per hari (§0
asumsi #3).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `class_group_id` | BIGINT UNSIGNED FK → `class_groups.id` | |
| `attendance_date` | DATE | |
| `status` | ENUM('hadir','izin','sakit','alpa') | |
| `notes` | TEXT NULLABLE | |
| `recorded_by_employee_id` | BIGINT UNSIGNED NULLABLE | |

> Unique constraint disarankan: (`student_id`, `attendance_date`) supaya tidak dobel input per
> hari — sesuai asumsi granularitas per hari.

### 2.16 `student_leave_requests`
*(Fitur "Pengajuan izin/sakit siswa")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `leave_date` | DATE | |
| `leave_type` | ENUM('izin','sakit') | |
| `reason` | TEXT NULLABLE | |
| `attachment_url` | VARCHAR(255) NULLABLE | |
| `requested_by_guardian_id` | BIGINT UNSIGNED FK → `guardians.id` NULLABLE | |
| `approval_status` | ENUM('menunggu','disetujui','ditolak') | default `menunggu` |
| `approved_by_employee_id` | BIGINT UNSIGNED NULLABLE | |

### 2.17A `incident_categories`
*(Fitur "Master Kategori Tata Tertib & Apresiasi")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | ID unit sekolah di Core Service |
| `code` | VARCHAR(50) | Kode unik per unit (mis. `TATIB-01`, `PRES-01`, `ADAB-01`) |
| `name` | VARCHAR(150) | Nama kategori / jenis tata tertib / prestasi |
| `type` | ENUM('positive', 'negative', 'neutral') | Tipe kejadian |
| `severity_level` | ENUM('low', 'medium', 'high', 'critical') | Bobot tingkat kejadian, default `'low'` |
| `default_points` | SMALLINT | Poin default insiden |
| `is_active` | BOOLEAN | Status aktif, default `true` |

### 2.17B `student_incidents`
*(Fitur "Buku Catatan Kejadian Siswa Terpadu" / Student Conduct Ledger)*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `academic_year_id` | BIGINT UNSIGNED NULLABLE | |
| `category_id` | BIGINT UNSIGNED FK → `incident_categories.id` NULLABLE | |
| `type` | ENUM('positive', 'negative', 'neutral') | |
| `title` | VARCHAR(200) | Judul kejadian / prestasi |
| `description` | TEXT | Uraian kronologi kejadian |
| `points` | SMALLINT | Bobot poin (+/-) |
| `incident_date` | DATE | Tanggal kejadian |
| `incident_time` | TIME NULLABLE | Waktu kejadian |
| `location` | VARCHAR(150) NULLABLE | Lokasi kejadian (Kelas, Asrama, Masjid, dsb) |
| `reported_by_employee_id` | BIGINT UNSIGNED NULLABLE | ID pegawai pelapor kejadian |
| `handled_by_employee_id` | BIGINT UNSIGNED NULLABLE | ID pegawai yang menangani/wali kelas |
| `handling_status` | ENUM('reported', 'in_progress', 'resolved', 'cancelled') | Default `'reported'` |
| `handling_action` | TEXT NULLABLE | Catatan tindakan pembinaan / sanksi / apresiasi |
| `resolution_date` | DATE NULLABLE | Tanggal penyelesaian kasus |
| `visibility_level` | ENUM('public_school', 'teachers_only', 'homeroom_and_bk', 'bk_only') | Level hak akses server-side, default `'teachers_only'` |
| `verified_by_employee_id` | BIGINT UNSIGNED NULLABLE | ID staf kesiswaan pemverifikasi poin |
| `verified_at` | DATETIME NULLABLE | Waktu verifikasi poin resmi |

### 2.17 `student_disciplinary_records`
*(Fitur "Pencatatan pelanggaran/poin disiplin")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `violation_type` | VARCHAR(150) | |
| `points` | SMALLINT | |
| `incident_date` | DATE | |
| `handled_by_employee_id` | BIGINT UNSIGNED NULLABLE | |
| `notes` | TEXT NULLABLE | |

### 2.18 `student_achievements`
*(Fitur "Pencatatan prestasi siswa")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `achievement_type` | VARCHAR(150) | |
| `level` | ENUM('sekolah','kecamatan','kabupaten_kota','provinsi','nasional','internasional') NULLABLE | |
| `achieved_at` | DATE | |
| `notes` | TEXT NULLABLE | |

### 2.19 `counseling_records`
*(Fitur "Bimbingan konseling")* Kolom kerahasiaan sesuai asumsi #4 di §0 — **perlu konfirmasi**.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `session_date` | DATE | |
| `service_type` | VARCHAR(100) NULLABLE | |
| `notes` | TEXT | |
| `visibility_level` | ENUM('bk_only','bk_and_homeroom','all_staff') | default `bk_only` — **asumsi, perlu konfirmasi** |
| `counselor_employee_id` | BIGINT UNSIGNED NULLABLE | |

### 2.20 `extracurriculars`
*(Fitur "Manajemen ekstrakurikuler")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED | |
| `name` | VARCHAR(100) | |
| `supervisor_employee_id` | BIGINT UNSIGNED NULLABLE | ID ke Kepegawaian |
| `schedule` | VARCHAR(150) NULLABLE | |

### 2.21 `extracurricular_members`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `extracurricular_id` | BIGINT UNSIGNED FK → `extracurriculars.id` | |
| `student_id` | BIGINT UNSIGNED FK → `students.id` | |
| `academic_year_id` | BIGINT UNSIGNED FK → `academic_years.id` | |

### 2.22 `academic_calendar_events`
*(Fitur "Kalender akademik")*

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED NULLABLE | null = berlaku yayasan-wide |
| `title` | VARCHAR(150) | |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `grade_level_id` | BIGINT UNSIGNED FK → `grade_levels.id` NULLABLE | null = semua tingkat |
| `notes` | TEXT NULLABLE | |

### 2.23 `activity_logs`
*(Fitur "Audit log aktivitas modul Akademik")* *Append-only*, tidak punya `updated_at`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `satuan_pendidikan_id` | BIGINT UNSIGNED NULLABLE | |
| `user_id` | BIGINT UNSIGNED | ID ke `users` Core Service |
| `action` | VARCHAR(100) | |
| `data_before` | JSON NULLABLE | |
| `data_after` | JSON NULLABLE | |
| `created_at` | TIMESTAMP | |

## 3. Relasi Lintas Modul (Tanpa FK Fisik)

| Kolom di Akademik | Mengacu ke Modul | Tabel Sumber | Divalidasi Lewat |
|---|---|---|---|
| `students.satuan_pendidikan_id`, dst | Core Service | `school_units` | service Core in-process |
| `students.user_id`, `guardians.user_id` | Core Service | `users` | service Core in-process, diisi setelah provisioning |
| `class_groups.homeroom_teacher_employee_id` | Kepegawaian | `employees` | service Kepegawaian in-process |
| `teaching_assignments.teacher_employee_id` | Kepegawaian | `employees` | service Kepegawaian in-process |
| `extracurriculars.supervisor_employee_id` | Kepegawaian | `employees` | service Kepegawaian in-process |
| `*.recorded_by_employee_id`, `*_by_employee_id` | Kepegawaian | `employees` | service Kepegawaian in-process |

## 4. Sisa 7 Fitur Belum Teridentifikasi

Sesuai `rancangan-akademik.md` §4, masih ada **7 fitur dari 36** yang belum masuk daftar draf —
ERD ini baru mencakup 29. Kemungkinan besar menambah tabel baru (mis. jadwal pelajaran mingguan
penuh terpisah dari `teaching_assignments`, ujian sekolah/kelulusan, dsb). **Jangan tulis
migration final sebelum ini dilengkapi**, supaya tidak ada tabel yang perlu dirombak besar setelah
data mulai diisi.

## 5. Keputusan Terbuka Tambahan (Khusus ERD)

- Apakah Akademik butuh tabel antrian webhook sendiri (`outbound_webhook_queue`) atau cukup
  memanggil service publish milik Core Service secara langsung in-process (asumsi #6 di §0)?
- Constraint unik (`student_id`, `attendance_date`) di `student_attendances` — perlu dikonfirmasi
  sebelum migration ditulis, karena berubah total kalau ternyata presensi per jam pelajaran.
- Nama-nama semua tabel di atas mengikuti asumsi model klasikal — kalau nanti dikonfirmasi perlu
  SKS/lintas minat, `student_class_enrollments` dan `student_scores`/`student_attendances` perlu
  dirombak untuk merujuk `teaching_assignments` per siswa, bukan `class_group_id` langsung.

## 6. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Draf awal, 23 tabel untuk 29 dari 36 fitur teridentifikasi. Beberapa struktur
memakai asumsi sementara (§0) yang menunggu konfirmasi `rancangan-akademik.md` §5. **Belum siap
untuk migration Tahap 2.** |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
