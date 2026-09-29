Status: perlu-revisi
Diperbarui: 2026-08-24

# erd-kepegawaian.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 (prinsip arsitektur global) & `rancangan-kepegawaian.md`
> Bagian 4–5 (ruang lingkup 16 fitur & keputusan terbuka).
> Database: MariaDB 10.5. Query builder: Knex.js. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`,
> semua tabel punya `created_at`/`updated_at TIMESTAMP` (tidak ditulis ulang di tiap tabel di
> bawah supaya ringkas — anggap ada di semua tabel, tidak ada tabel log murni di modul ini jadi
> tidak ada pengecualian *append-only*).
> Penamaan: **Bahasa Inggris, `snake_case`**, mengikuti pola final `erd-coreservice.md`.

## 0. Keputusan Desain Teknis (Bukan Keputusan Bisnis — Lihat `rancangan-kepegawaian.md` §5 untuk yang Masih Terbuka)

| # | Topik | Keputusan | Alasan |
|---|---|---|---|
| 1 | Referensi ke `users` Core Service | Tidak ada FK fisik. Core `users.ref_type='staff'`, `users.ref_id = employees.id` — arah rujukan dari Core ke sini, bukan sebaliknya | Sesuai pola `ref_type`+`ref_id` yang sudah final di `erd-coreservice.md` §2.1, dan prinsip "tidak ada FK fisik lintas database" |
| 2 | Pegawai bertugas di lebih dari satu Satuan Pendidikan | `employees.school_unit_id` = sekolah pangkalan/induk (wajib, NOT NULL). Penugasan tambahan di sekolah lain dicatat di tabel pivot terpisah `employee_school_assignments` | Memenuhi prinsip arsitektur global poin 2 (setiap tabel spesifik-sekolah wajib `school_unit_id`) sekaligus mengakomodasi kasus pegawai lintas sekolah tanpa memaksa `employees` jadi multi-value pada kolom tunggal |
| 3 | DUK Pangkat & Usia/Jumlah Anak (fitur tanpa CRUD mandiri) | **Tidak dibuat tabel fisik.** DUK Pangkat dihasilkan on-the-fly dari `employees` + `employee_position_history`. Usia dihitung dari `birth_date`. Jumlah anak dihitung dari `COUNT(*)` pada `employee_family_members` WHERE `relation='child'` | Fitur ini murni tampilan turunan, bukan data mandiri — menghindari duplikasi sumber kebenaran data |
| 4 | Komponen gaji & potongan payroll | Disimpan sebagai kolom `JSON` generik (`salary_components`, `deductions`) di `payroll_items`. Konvensi key resmi `salary_components`: `{"gapok": 0, "tunjangan_jabatan": 0, "tunjangan_kehadiran": 0, "tunjangan_konsumsi": 0, "tunjangan_istri": 0, "tunjangan_anak": 0}` | Struktur JSON menghindari migration ulang begitu ada penyesuaian tunjangan; net_salary otomatis mencerminkan total kalkulasi |
| 5 | Statistik kepegawaian & endpoint data pegawai (fitur #15, #16) | Tidak ada tabel — keduanya query/laporan atas tabel yang sudah ada | Sama seperti pola Core Service untuk fitur "Dokumentasi API" yang juga tidak punya tabel sendiri |
| 6 | NIP Yayasan vs NIP Resmi | "NIP Yayasan" dikonfirmasi sama dengan `employees.employee_number` (nomor pegawai internal yayasan). Kolom `employees.nip` khusus untuk NIP resmi PNS | Menghindari duplikasi kolom yang menyimpan hal yang sama |
| 7 | Alamat KTP vs Domisili | Dibuat tabel 1:N `employee_addresses` (`ktp`, `domisili`). Kolom legacy `employees.address` **tetap dipertahankan** sebagai ringkasan domisili untuk backward compatibility | Mendukung fleksibilitas alamat terstruktur tanpa memecah integrasi yang membutuhkan string alamat ringkas |
| 8 | SK Pengangkatan / SPK / Penugasan | Disatukan dalam `employee_position_history` dengan penambahan kolom `document_type`, `document_number`, `validity_years`, dan `evaluation_note` | Struktur data ketiganya serupa; menghindari pembuatan 3 tabel anak yang tumpang tindih |
| 9 | Bidang Keahlian vs Karya Tulis | Bidang keahlian masuk ke `employee_education_trainings` (`record_type='skill'`), sedangkan karya tulis dibuat tabel terpisah `employee_publications` | Bidang keahlian sekeluarga dengan diklat/sertifikasi, sedangkan karya tulis memiliki atribut spesifik penerbit/tahun/URL |

---

## 1. Daftar Entitas (22 Tabel)

| Modul (`rancangan-kepegawaian.md` §4) | Tabel | `school_unit_id`? |
|---|---|---|
| Data Pegawai | `employment_statuses` (Master) | Tidak langsung (Master Yayasan) |
| Data Pegawai | `employees` | **Ya** (sekolah pangkalan) |
| Data Pegawai | `employee_addresses` (1:N) | Tidak langsung (ikut `employees`) |
| Data Pegawai | `employee_school_assignments` | **Ya** |
| Data Pegawai | `employee_education_trainings` | Tidak langsung (ikut `employees`) |
| Data Pegawai | `employee_family_members` | Tidak langsung |
| Data Pegawai | `employee_publications` | Tidak langsung |
| Data Pegawai | `employee_work_experiences` | Tidak langsung |
| Data Pegawai | `employee_warning_letters` | Tidak langsung |
| Data Pegawai | `employee_organization_activities` | Tidak langsung |
| Data Pegawai | `employee_document_checklists` | Tidak langsung |
| Data Pegawai | `employee_bank_accounts` | Tidak langsung (1:1, data sensitif) |
| Data Pegawai | `employee_retirement_plans` | Tidak langsung |
| Data Pegawai | `recruitment_candidates` | Ya (nullable — posisi ditempatkan di sekolah mana, bisa belum ditentukan) |
| Organisasi | `job_positions` | **Ya** |
| Organisasi | `employee_position_history` | Tidak langsung (ikut `employees`) |
| Organisasi | `employee_mutations` | Tidak langsung |
| Kehadiran | `employee_attendances` | **Ya** |
| Kehadiran | `employee_leave_requests` | **Ya** |
| Kehadiran | `employee_overtimes` | **Ya** |
| Penggajian | `payroll_periods` | Ya (nullable = periode payroll yayasan-wide) |
| Penggajian | `payroll_items` | Tidak langsung (ikut `payroll_periods`) |
| Kinerja | `performance_reviews` | **Ya** |
| Asesmen | `psychotest_types` | Tidak langsung |
| Asesmen | `psychotest_dimensions` | Tidak langsung (ikut `psychotest_types`) |
| Asesmen | `psychotest_questions` | Tidak langsung (ikut `psychotest_types`) |
| Asesmen | `psychotest_type_profiles` | Tidak langsung (ikut `psychotest_types`) |
| Asesmen | `psychotest_sessions` | **Ya** (nullable = sesi yayasan-wide) |
| Asesmen | `psychotest_answers` | Tidak langsung (ikut `psychotest_sessions`) |
| Asesmen | `psychotest_results` | Tidak langsung (ikut `psychotest_sessions`) |

> Fitur "DUK Pangkat", "Statistik kepegawaian", dan "Endpoint data pegawai untuk aplikasi lain"
> tidak punya tabel sendiri — lihat Bagian 0.

## 2. Detail Tabel

### 2.0 `employment_statuses`
*(Fitur "Master Status Kepegawaian Fleksibel & Kustomisasi Admin")*
Master data jenis status kepegawaian (PNS, PPPK, GTY, GTT, PTY, PTT, Kontrak, Magang, dll) yang dapat
ditambah dan dikonfigurasi secara dinamis oleh Administrator.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| code | VARCHAR(50) | UNIQUE, NOT NULL — kode unik (mis. `pns`, `gtt`, `gty`, `kontrak`) |
| name | VARCHAR(100) | NOT NULL — nama lengkap status (mis. `Guru Tetap Yayasan (GTY)`) |
| category | VARCHAR(50) | NULLABLE, DEFAULT 'umum' — `guru`, `tendik`, `umum` |
| description | TEXT | NULLABLE |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| sort_order | INT UNSIGNED | NOT NULL, DEFAULT 0 |

### 2.1 `employees`
*(Fitur "CRUD data pegawai (master)")*
Data induk pegawai. Sumber tunggal data pegawai untuk seluruh sistem — modul lain wajib
mengambil lewat service-layer Kepegawaian, tidak boleh menyalin manual.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — sekolah pangkalan/induk, referensi ke Core Service (bukan FK fisik) |
| employee_number | VARCHAR(50) | UNIQUE, NOT NULL — nomor pegawai internal yayasan (NIP Yayasan) |
| nik | VARCHAR(20) | NULLABLE, UNIQUE — NIK KTP **[SENSITIF - Perlu Masking API]** |
| nip | VARCHAR(30) | NULLABLE — NIP resmi (khusus PNS) |
| nuptk | VARCHAR(30) | NULLABLE, UNIQUE |
| full_name | VARCHAR(150) | NOT NULL |
| academic_title | VARCHAR(100) | NULLABLE — gelar akademik |
| mother_name | VARCHAR(150) | NULLABLE — nama ibu kandung |
| citizenship | VARCHAR(50) | NULLABLE, DEFAULT 'Indonesia' — kewarganegaraan |
| birth_place | VARCHAR(100) | NULLABLE |
| birth_date | DATE | NULLABLE |
| gender | ENUM('male','female') | NOT NULL |
| religion | VARCHAR(50) | NULLABLE |
| marital_status | ENUM('single','married','divorced','widowed') | NULLABLE |
| address | TEXT | NULLABLE — ringkasan alamat domisili (legacy/kompatibilitas) |
| phone_number | VARCHAR(30) | NULLABLE |
| email | VARCHAR(150) | NULLABLE |
| photo_url | VARCHAR(255) | NULLABLE |
| current_position_id | BIGINT UNSIGNED | NULLABLE — FK → `job_positions.id` (jabatan aktif) |
| current_rank | VARCHAR(100) | NULLABLE — golongan aktif |
| employment_status | VARCHAR(50) | NOT NULL — mengacu ke `employment_statuses.code` |
| account_status | ENUM('active','inactive','resigned','retired') | NOT NULL, DEFAULT 'active' |

*Tidak ada `password`/kredensial apa pun di sini* — akun login (`users.ref_type='staff'`,
`ref_id=employees.id`) sepenuhnya domain Core Service.

### 2.1A `employee_addresses` (1:N ke `employees`)
*(Fitur "Alamat KTP & Domisili Pegawai")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| address_type | ENUM('ktp','domisili') | NOT NULL |
| street | TEXT | NULLABLE — jalan / no rumah |
| rt | VARCHAR(5) | NULLABLE |
| rw | VARCHAR(5) | NULLABLE |
| hamlet | VARCHAR(100) | NULLABLE — dusun/lingkungan |
| village | VARCHAR(100) | NULLABLE — desa/kelurahan |
| district | VARCHAR(100) | NULLABLE — kecamatan |
| city | VARCHAR(100) | NULLABLE — kabupaten/kota |
| province | VARCHAR(100) | NULLABLE — provinsi |
| postal_code | VARCHAR(10) | NULLABLE — kode pos |

`UNIQUE (employee_id, address_type)`.

### 2.2 `employee_school_assignments`
*(Pendukung §0 Keputusan #2 — pegawai bertugas di lebih dari satu Satuan Pendidikan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| position_id | BIGINT UNSIGNED | NULLABLE — FK → `job_positions.id`, jabatan di sekolah ini (bisa beda dari `current_position_id`) |
| is_primary | BOOLEAN | NOT NULL, DEFAULT FALSE |

`UNIQUE (employee_id, school_unit_id)`.

### 2.3 `employee_education_trainings`
*(Fitur "Data pegawai detail — pendidikan, sertifikasi, diklat, dan keahlian")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| record_type | ENUM('education','training','certification','skill') | NOT NULL |
| education_level | VARCHAR(50) | NULLABLE — jenjang pendidikan (khusus `record_type='education'`) |
| major | VARCHAR(100) | NULLABLE — jurusan (khusus `record_type='education'`) |
| institution_name | VARCHAR(150) | NULLABLE |
| graduation_year | YEAR | NULLABLE |
| training_name | VARCHAR(150) | NULLABLE — nama diklat/sertifikasi/keahlian |
| organizer | VARCHAR(150) | NULLABLE — penyelenggara |
| event_start_date | DATE | NULLABLE — waktu mulai diklat |
| event_end_date | DATE | NULLABLE — waktu selesai diklat |
| proficiency_level | VARCHAR(50) | NULLABLE — tingkat keahlian (khusus `record_type='skill'`) |
| certificate_number | VARCHAR(100) | NULLABLE — nomor sertifikat |
| certificate_file_url | VARCHAR(255) | NULLABLE |

### 2.4 `employee_family_members`
*(Fitur "Data keluarga pegawai")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| relation | ENUM('spouse','child') | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| birth_place | VARCHAR(100) | NULLABLE |
| birth_date | DATE | NULLABLE |
| marriage_date | DATE | NULLABLE — khusus `relation='spouse'` |
| occupation | VARCHAR(100) | NULLABLE — khusus `relation='spouse'` |

### 2.4A `employee_publications`
*(Fitur "Riwayat Karya Tulis & Publikasi Pegawai")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| title | VARCHAR(255) | NOT NULL — judul karya tulis |
| publication_year | YEAR | NULLABLE |
| publisher_or_media | VARCHAR(150) | NULLABLE — penerbit / jurnal / media |
| publication_url | VARCHAR(255) | NULLABLE — tautan online |
| notes | TEXT | NULLABLE |

### 2.4B `employee_work_experiences`
*(Fitur "Riwayat Pengalaman Kerja Eksternal")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| organization_name | VARCHAR(150) | NOT NULL — instansi / perusahaan luar |
| role_title | VARCHAR(150) | NOT NULL — jabatan / peran |
| start_date | DATE | NULLABLE |
| end_date | DATE | NULLABLE — NULL = masih berjalan |

### 2.4C `employee_warning_letters`
*(Fitur "Riwayat Surat Peringatan (SP)")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| warning_date | DATE | NOT NULL |
| letter_number | VARCHAR(100) | NOT NULL — no surat (SP 1, SP 2, SP 3) |
| description | TEXT | NULLABLE — uraian pelanggaran |
| issued_by | BIGINT UNSIGNED | NULLABLE — FK → `employees.id` (penerbit SP) |

### 2.4D `employee_organization_activities`
*(Fitur "Kegiatan Organisasi / Kemasyarakatan")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| organization_name | VARCHAR(150) | NOT NULL — nama organisasi |
| position | VARCHAR(100) | NULLABLE — jabatan / peran |
| year | YEAR | NULLABLE — tahun aktif |

### 2.4E `employee_document_checklists`
*(Fitur "Kelengkapan Berkas Pegawai")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| document_name | VARCHAR(100) | NOT NULL — mis. KTP, KK, Ijazah SD, SK |
| status | ENUM('available','not_available') | NOT NULL, DEFAULT 'not_available' |

`UNIQUE (employee_id, document_name)`.

### 2.4F `employee_bank_accounts`
*(Fitur "Data Rekening Bank Pegawai" — Data Sensitif Finansial)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL, UNIQUE |
| bank_name | VARCHAR(100) | NOT NULL — nama bank (BCA, BSI, dll) |
| account_number | VARCHAR(50) | NOT NULL — nomor rekening |
| account_holder_name | VARCHAR(150) | NOT NULL — nama pemilik buku tabungan |

### 2.5 `employee_retirement_plans`
*(Fitur "Data pensiun")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL, UNIQUE |
| retirement_date | DATE | NOT NULL |
| retirement_type | VARCHAR(100) | NOT NULL — jenis pensiun |

### 2.6 `recruitment_candidates`
*(Fitur "Rekrutmen & onboarding pegawai baru")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — penempatan rencana, bisa belum ditentukan di tahap awal seleksi |
| candidate_name | VARCHAR(150) | NOT NULL |
| applied_position | VARCHAR(150) | NOT NULL — posisi yang dilamar |
| selection_stage | ENUM('applied','screening','interview','accepted','rejected') | NOT NULL, DEFAULT 'applied' |
| activated_employee_id | BIGINT UNSIGNED | NULLABLE — FK → `employees.id`, terisi begitu kandidat diaktifkan jadi pegawai |

### 2.7 `job_positions`
*(Fitur "Manajemen jabatan & struktur organisasi")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(150) | NOT NULL — nama jabatan |
| level | INT UNSIGNED | NULLABLE — tingkat hierarki (1 = tertinggi di sekolah itu) |
| parent_position_id | BIGINT UNSIGNED | NULLABLE — FK → `job_positions.id` (atasan langsung) |

`employees.current_position_id` dan `employee_school_assignments.position_id` mengacu ke tabel
ini.

### 2.8 `employee_position_history`
*(Fitur "Riwayat jabatan, golongan, SK pengangkatan, SPK & penugasan")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| position_id | BIGINT UNSIGNED | NULLABLE — FK → `job_positions.id` |
| rank | VARCHAR(100) | NULLABLE — golongan pada periode ini |
| document_type | ENUM('pengangkatan','spk','penugasan','jabatan_internal') | NOT NULL, DEFAULT 'jabatan_internal' |
| document_number | VARCHAR(100) | NULLABLE — No. SK / SPK / Surat Tugas |
| validity_years | SMALLINT | NULLABLE — masa berlaku (tahun) |
| evaluation_note | TEXT | NULLABLE — catatan penilaian (khusus penugasan) |
| effective_date | DATE | NOT NULL — TMT |
| end_date | DATE | NULLABLE — TST (NULL = masih berlaku) |

Jadi basis perhitungan **DUK Pangkat** (Bagian 0 Keputusan #3) bersama `employees`.

### 2.9 `employee_mutations`
*(Fitur "Riwayat mutasi/promosi")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| mutation_type | ENUM('promotion','transfer','demotion') | NOT NULL |
| old_position_id | BIGINT UNSIGNED | NULLABLE — FK → `job_positions.id` |
| new_position_id | BIGINT UNSIGNED | NULLABLE — FK → `job_positions.id` |
| mutation_date | DATE | NOT NULL |
| notes | TEXT | NULLABLE |

### 2.10 `employee_attendances`
*(Fitur "Presensi/absensi pegawai")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| attendance_date | DATE | NOT NULL |
| check_in_time | TIME | NULLABLE |
| check_out_time | TIME | NULLABLE |
| status | ENUM('present','sick','permitted','absent') | NOT NULL |

`UNIQUE (employee_id, attendance_date)`.

### 2.11 `employee_leave_requests`
*(Fitur "Cuti & izin")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| leave_type | VARCHAR(100) | NOT NULL — jenis cuti |
| start_date | DATE | NOT NULL |
| end_date | DATE | NOT NULL |
| reason | TEXT | NULLABLE |
| status | ENUM('pending','approved','rejected') | NOT NULL, DEFAULT 'pending' |
| approved_by | BIGINT UNSIGNED | NULLABLE — FK → `employees.id` (atasan yang memproses) |
| approved_at | TIMESTAMP | NULLABLE |

### 2.12 `employee_overtimes`
*(Fitur "Lembur")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| overtime_date | DATE | NOT NULL |
| hours | DECIMAL(4,2) | NOT NULL |
| notes | TEXT | NULLABLE |
| status | ENUM('pending','approved','rejected') | NOT NULL, DEFAULT 'pending' |
| approved_by | BIGINT UNSIGNED | NULLABLE — FK → `employees.id` |
| approved_at | TIMESTAMP | NULLABLE |

### 2.13 `payroll_periods`
*(Fitur "Perhitungan gaji (payroll)")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — NULL berarti periode payroll berlaku yayasan-wide |
| period_month | TINYINT UNSIGNED | NOT NULL |
| period_year | SMALLINT UNSIGNED | NOT NULL |
| status | ENUM('draft','calculated','verified','sent_to_finance') | NOT NULL, DEFAULT 'draft' |

`UNIQUE (school_unit_id, period_month, period_year)`.

### 2.14 `payroll_items`
*(Fitur "Perhitungan gaji (payroll)" — rincian per pegawai)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| payroll_period_id | BIGINT UNSIGNED | FK → `payroll_periods.id`, NOT NULL |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| salary_components | JSON | NOT NULL — rincian komponen gaji (lihat Bagian 0 Keputusan #4) |
| deductions | JSON | NULLABLE — rincian potongan |
| net_salary | DECIMAL(14,2) | NOT NULL — gaji bersih |
| verified_by | BIGINT UNSIGNED | NULLABLE — FK → `employees.id` (HRD yang verifikasi) |
| verified_at | TIMESTAMP | NULLABLE |

`UNIQUE (payroll_period_id, employee_id)`. Dikonsumsi Keuangan (Fase 4) untuk disbursement —
lihat `rancangan-kepegawaian.md` Bagian 6.

### 2.15 `performance_reviews`
*(Fitur "Penilaian kinerja dasar (harian/bulanan)")*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| reviewer_id | BIGINT UNSIGNED | FK → `employees.id`, NOT NULL — atasan/HRD penilai |
| period | VARCHAR(20) | NOT NULL — mis. `2026-08` atau `2026-Q3`, skema final menyusul (lihat Keputusan Terbuka) |
| score | DECIMAL(5,2) | NULLABLE — **skala belum final**, lihat `rancangan-kepegawaian.md` §5 |
| notes | TEXT | NULLABLE |

Dikonsumsi Pengelolaan (Fase 7) sebagai input evaluasi kinerja mendalam.

### 2.16 `psychotest_types`
*(Fitur "Tes Psikologi (MBTI & Kepribadian)" — Master Tipe Instrumen)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| code | VARCHAR(50) | UNIQUE, NOT NULL — mis. `mbti`, `big_five` |
| name | VARCHAR(150) | NOT NULL — mis. `MBTI Personality Indicator` |
| description | TEXT | NULLABLE |
| duration_minutes | INT UNSIGNED | NOT NULL DEFAULT 30 |
| scoring_method | ENUM('dichotomy_4axis', 'trait_average', 'custom') | NOT NULL DEFAULT 'dichotomy_4axis' |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at / updated_at | TIMESTAMP | Standar |

### 2.17 `psychotest_dimensions`
*(Fitur "Tes Psikologi" — Sumbu/Dimensi Psikologi)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| test_type_id | BIGINT UNSIGNED | FK → `psychotest_types.id`, NOT NULL |
| code | VARCHAR(50) | NOT NULL — mis. `EI`, `SN`, `TF`, `JP`, `O`, `C`, `E`, `A`, `N` |
| name | VARCHAR(150) | NOT NULL |
| positive_pole | VARCHAR(50) | NULLABLE — mis. `E`, `S`, `T`, `J` |
| negative_pole | VARCHAR(50) | NULLABLE — mis. `I`, `N`, `F`, `P` |
| description | TEXT | NULLABLE |
| order_num | INT UNSIGNED | NOT NULL DEFAULT 0 |

### 2.18 `psychotest_questions`
*(Fitur "Tes Psikologi" — Bank Butir Soal)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| test_type_id | BIGINT UNSIGNED | FK → `psychotest_types.id`, NOT NULL |
| dimension_id | BIGINT UNSIGNED | FK → `psychotest_dimensions.id`, NOT NULL |
| question_code | VARCHAR(50) | NOT NULL — mis. `MBTI-01`, `B5-01` |
| question_text | TEXT | NOT NULL |
| question_type | ENUM('forced_choice', 'likert_5', 'likert_7', 'multiple_choice') | NOT NULL DEFAULT 'forced_choice' |
| option_a_text | TEXT | NULLABLE (untuk forced_choice) |
| option_a_pole | VARCHAR(50) | NULLABLE (mis. `E`) |
| option_b_text | TEXT | NULLABLE |
| option_b_pole | VARCHAR(50) | NULLABLE (mis. `I`) |
| scoring_direction | ENUM('normal', 'reverse') | NOT NULL DEFAULT 'normal' |
| order_num | INT UNSIGNED | NOT NULL DEFAULT 0 |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |

### 2.19 `psychotest_type_profiles`
*(Fitur "Tes Psikologi" — Profil Interpretasi HRD)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| test_type_id | BIGINT UNSIGNED | FK → `psychotest_types.id`, NOT NULL |
| profile_code | VARCHAR(50) | NOT NULL — mis. `INTJ`, `ENFP`, `O_HIGH`, `SUMMARY` |
| profile_name | VARCHAR(150) | NOT NULL — mis. `The Mastermind` |
| description | TEXT | NULLABLE |
| strengths | TEXT | NULLABLE |
| development_areas | TEXT | NULLABLE |
| hrd_recommendations | TEXT | NULLABLE |
| suitable_roles | TEXT | NULLABLE |

### 2.20 `psychotest_sessions`
*(Fitur "Tes Psikologi" — Sesi Asesmen Peserta)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| session_code | VARCHAR(100) | UNIQUE, NOT NULL — token akses publik |
| test_type_id | BIGINT UNSIGNED | FK → `psychotest_types.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NULLABLE |
| candidate_id | BIGINT UNSIGNED | NULLABLE — FK → `recruitment_candidates.id` |
| employee_id | BIGINT UNSIGNED | NULLABLE — FK → `employees.id` |
| participant_name | VARCHAR(150) | NOT NULL |
| participant_email | VARCHAR(150) | NULLABLE |
| status | ENUM('scheduled', 'in_progress', 'completed', 'expired') | NOT NULL DEFAULT 'scheduled' |
| started_at / completed_at | TIMESTAMP | NULLABLE |
| expires_at | TIMESTAMP | NULLABLE |
| assessor_name / assessor_evaluation / hrd_recommendation | TEXT/VARCHAR | NULLABLE |

### 2.21 `psychotest_answers`
*(Fitur "Tes Psikologi" — Lembar Jawaban Peserta)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| session_id | BIGINT UNSIGNED | FK → `psychotest_sessions.id`, NOT NULL |
| question_id | BIGINT UNSIGNED | FK → `psychotest_questions.id`, NOT NULL |
| selected_option | VARCHAR(50) | NOT NULL — mis. `A`, `B`, `1`, `5` |
| selected_pole | VARCHAR(50) | NULLABLE |
| score_value | DECIMAL(5,2) | NULLABLE |
| response_time_seconds | INT UNSIGNED | NULLABLE |

### 2.22 `psychotest_results`
*(Fitur "Tes Psikologi" — Hasil & Skor Matang)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| session_id | BIGINT UNSIGNED | FK → `psychotest_sessions.id`, NOT NULL, UNIQUE |
| result_code | VARCHAR(50) | NOT NULL — mis. `INTJ` |
| result_label | VARCHAR(150) | NOT NULL |
| dimension_scores | JSON | NOT NULL — skor kuantitatif per sumbu / trait |
| profile_summary | TEXT | NULLABLE |
| strengths_summary | TEXT | NULLABLE |
| development_areas | TEXT | NULLABLE |
| hrd_recommendation | TEXT | NULLABLE |
| radar_chart_data | JSON | NULLABLE |

## 3. Skrip SQL (MariaDB 10.5)

### 3.1 DDL — Buat Semua Tabel

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. employees
CREATE TABLE employees (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  employee_number VARCHAR(50) NOT NULL UNIQUE,
  nip VARCHAR(30) NULL,
  nuptk VARCHAR(30) NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  academic_title VARCHAR(100) NULL,
  birth_place VARCHAR(100) NULL,
  birth_date DATE NULL,
  gender ENUM('male','female') NOT NULL,
  religion VARCHAR(50) NULL,
  marital_status ENUM('single','married','divorced','widowed') NULL,
  address TEXT NULL,
  phone_number VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  photo_url VARCHAR(255) NULL,
  current_position_id BIGINT UNSIGNED NULL,
  current_rank VARCHAR(100) NULL,
  employment_status ENUM('pns','gtt','ptt') NOT NULL,
  account_status ENUM('active','inactive','resigned','retired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employees_school_unit (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. job_positions
CREATE TABLE job_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  level INT UNSIGNED NULL,
  parent_position_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_positions_parent FOREIGN KEY (parent_position_id) REFERENCES job_positions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE employees
  ADD CONSTRAINT fk_employees_position FOREIGN KEY (current_position_id) REFERENCES job_positions(id);

-- 3. employee_school_assignments
CREATE TABLE employee_school_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  position_id BIGINT UNSIGNED NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_esa_employee_school (employee_id, school_unit_id),
  CONSTRAINT fk_esa_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_esa_position FOREIGN KEY (position_id) REFERENCES job_positions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. employee_education_trainings
CREATE TABLE employee_education_trainings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  record_type ENUM('education','training','certification') NOT NULL,
  education_level VARCHAR(50) NULL,
  institution_name VARCHAR(150) NULL,
  graduation_year YEAR NULL,
  training_name VARCHAR(150) NULL,
  organizer VARCHAR(150) NULL,
  certificate_file_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_eet_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. employee_family_members
CREATE TABLE employee_family_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  relation ENUM('spouse','child') NOT NULL,
  name VARCHAR(150) NOT NULL,
  birth_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_efm_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. employee_retirement_plans
CREATE TABLE employee_retirement_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL UNIQUE,
  retirement_date DATE NOT NULL,
  retirement_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_erp_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. recruitment_candidates
CREATE TABLE recruitment_candidates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  candidate_name VARCHAR(150) NOT NULL,
  applied_position VARCHAR(150) NOT NULL,
  selection_stage ENUM('applied','screening','interview','accepted','rejected') NOT NULL DEFAULT 'applied',
  activated_employee_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rc_employee FOREIGN KEY (activated_employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. employee_position_history
CREATE TABLE employee_position_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  position_id BIGINT UNSIGNED NULL,
  rank VARCHAR(100) NULL,
  effective_date DATE NOT NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_eph_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_eph_position FOREIGN KEY (position_id) REFERENCES job_positions(id),
  INDEX idx_eph_employee_date (employee_id, effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. employee_mutations
CREATE TABLE employee_mutations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  mutation_type ENUM('promotion','transfer','demotion') NOT NULL,
  old_position_id BIGINT UNSIGNED NULL,
  new_position_id BIGINT UNSIGNED NULL,
  mutation_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_em_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_em_old_position FOREIGN KEY (old_position_id) REFERENCES job_positions(id),
  CONSTRAINT fk_em_new_position FOREIGN KEY (new_position_id) REFERENCES job_positions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. employee_attendances
CREATE TABLE employee_attendances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time TIME NULL,
  check_out_time TIME NULL,
  status ENUM('present','sick','permitted','absent') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_employee_date (employee_id, attendance_date),
  CONSTRAINT fk_ea_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. employee_leave_requests
CREATE TABLE employee_leave_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  leave_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_elr_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_elr_approved_by FOREIGN KEY (approved_by) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. employee_overtimes
CREATE TABLE employee_overtimes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  overtime_date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL,
  notes TEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_eo_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_eo_approved_by FOREIGN KEY (approved_by) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. payroll_periods
CREATE TABLE payroll_periods (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  period_month TINYINT UNSIGNED NOT NULL,
  period_year SMALLINT UNSIGNED NOT NULL,
  status ENUM('draft','calculated','verified','sent_to_finance') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payroll_period (school_unit_id, period_month, period_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. payroll_items
CREATE TABLE payroll_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payroll_period_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  salary_components JSON NOT NULL,
  deductions JSON NULL,
  net_salary DECIMAL(14,2) NOT NULL,
  verified_by BIGINT UNSIGNED NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payroll_item (payroll_period_id, employee_id),
  CONSTRAINT fk_pi_period FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id),
  CONSTRAINT fk_pi_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_pi_verified_by FOREIGN KEY (verified_by) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. performance_reviews
CREATE TABLE performance_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  period VARCHAR(20) NOT NULL,
  score DECIMAL(5,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_pr_reviewer FOREIGN KEY (reviewer_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

### 3.2 Seed Data Dummy

```sql
-- Catatan: school_unit_id di bawah memakai ID dummy (1, 2) mengikuti pola seed
-- erd-coreservice.md (SD Contoh 1 = id 1, SMP Contoh 1 = id 2). Sesuaikan kalau
-- database Core lokal Anda punya ID berbeda.

INSERT INTO job_positions (school_unit_id, name, level, parent_position_id) VALUES
  (1, 'Kepala Sekolah', 1, NULL),
  (1, 'Wakil Kepala Sekolah', 2, 1),
  (1, 'Guru Kelas', 3, 2),
  (1, 'Staf Tata Usaha', 3, 2);

INSERT INTO employees
  (school_unit_id, employee_number, nip, nuptk, full_name, academic_title, birth_place,
   birth_date, gender, religion, marital_status, address, phone_number, email,
   current_position_id, current_rank, employment_status, account_status)
VALUES
  (1, 'PEG-0001', NULL, '1234567890123456', 'Ahmad Fauzi', 'S.Pd.', 'Sukabumi',
   '1990-05-12', 'male', 'Islam', 'married', 'Jl. Contoh No. 2', '081234567890',
   'ahmad.fauzi@contoh.sch.id', 3, 'III/a', 'gtt', 'active'),
  (1, 'PEG-0002', NULL, NULL, 'Siti Aminah', 'S.E.', 'Bogor',
   '1988-02-20', 'female', 'Islam', 'married', 'Jl. Contoh No. 3', '081234567891',
   'siti.aminah@contoh.sch.id', 4, NULL, 'ptt', 'active');

INSERT INTO employee_position_history (employee_id, position_id, rank, effective_date) VALUES
  (1, 3, 'III/a', '2020-07-01'),
  (2, 4, NULL, '2021-01-10');

-- Password login dummy pegawai ini dibuat lewat provisioning akun ke Core Service
-- (POST /api/v1/core/internal/users, ref_type='staff', ref_id=1 dan ref_id=2),
-- BUKAN disimpan di database Kepegawaian ini.
```
