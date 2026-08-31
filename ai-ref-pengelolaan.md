# AI-REF: Modul Pengelolaan & Manajemen Eksekutif (`manajemen`)

> Dokumen referensi teknis modul Manajemen & Pengelolaan Eksekutif untuk AI Agent. Data diambil langsung dari 37 berkas migrasi Knex aktual, router/controller backend `apps/api-backend/src/modules/manajemen/`, dan router frontend portal `apps/core-portal/src/apps/manajemen/`.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/manajemen/` *(folder kode backend & subfolder bernama `manajemen`)*
- **Path Frontend Portal:** `apps/core-portal/src/apps/manajemen/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/manajemen/`
- **Database Engine:** MariaDB 10.5 (`aldepos_manajemen` / `u622997391_dbmanajemen` / `manajemen_local`)
- **Status Implementasi:** `jalan-produksi` *(Arsitektur perencanaan RIPS, RKJP/RKJM, RKT, EVADIR, BSC, Repositori Dokumen SK, & Gantt Chart SVAR UI aktif)*
- **Commit Terakhir Modul:** `193b926` (2026-08-31)

---

## 2. ERD & Skema Database Fondasi & Eksisting Pasca-Rombak

### 2.1 Tabel Fondasi Bersama Baru (6 Tabel)

#### `rips_program_categories` (Master Kategori Program RIPS)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(100)` | NO | - | Nama Kategori (cth: Pengembangan Program, Penyusunan Dokumen, Pengadaan Sarpras, Kegiatan Siswa, Forum/Rapat, Sosialisasi) |
| `color` | `VARCHAR(50)` | NO | `'#3B82F6'` | Warna Teks / Badge (HEX / Tailwind) |
| `bg_color` | `VARCHAR(50)` | NO | `'#EFF6FF'` | Warna Background Kartu / Tag |
| `border_color` | `VARCHAR(50)` | NO | `'#BFDBFE'` | Warna Garis Border |
| `description` | `TEXT` | YES | `NULL` | Deskripsi Kategori |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `is_active` | `BOOLEAN` | NO | `1 (true)` | Status Aktif |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `rips_domains` (Master Bidang RIPS Custom)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(200)` | NO | - | Nama Bidang (e.g. Kurikulum, Keasramaan, Sarpras) |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `rips_subdomains` (Master Sub-Bidang RIPS Custom)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `domain_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_domains(id) CASCADE` |
| `name` | `VARCHAR(200)` | NO | - | Nama Sub-bidang |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `bsc_aspects` (Master Aspek Balanced Scorecard)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(150)` | NO | - | Finansial, Pelanggan & Stakeholder, Proses Bisnis Internal, Pembelajaran & Pertumbuhan |
| `description` | `TEXT` | YES | `NULL` | Penjelasan Aspek |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `committee_position_types` (Master Jenis Jabatan Kepanitiaan)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(100)` | NO | - | Penanggung Jawab, Ketua, Wakil Ketua, Sekretaris, Bendahara, Koordinator, Anggota |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `document_publications` (Penerbitan Dokumen & Versioning Generik)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `document_type` | `ENUM` | NO | - | `'rips','rkjp','rkjm','rkt','evadir'` |
| `source_id` | `BIGINT UNSIGNED` | NO | - | ID Baris Dokumen Sumber Sesuai `document_type` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = Tingkat Yayasan |
| `version_number` | `INT UNSIGNED` | NO | - | Nomor Versi (1, 2, dst) |
| `document_number` | `VARCHAR(100)` | YES | `NULL` | Nomor SK / Dokumen Resmi |
| `title` | `VARCHAR(255)` | NO | - | Judul Dokumen Penerbitan |
| `sk_signer_name` | `VARCHAR(150)` | YES | `NULL` | Nama Pejabat Pengesah SK |
| `sk_signer_position` | `VARCHAR(150)` | YES | `NULL` | Jabatan Pengesah SK |
| `snapshot_json` | `JSON` | YES | `NULL` | Freeze Seluruh Data Terkait Saat Diterbitkan |
| `change_summary` | `TEXT` | YES | `NULL` | Ringkasan Perubahan dari Versi Sebelumnya |
| `file_url` | `VARCHAR(255)` | YES | `NULL` | File Lampiran / URL |
| `status` | `ENUM` | NO | `'draft_revision'` | `'draft_revision','published','archived'` |
| `effective_date` | `DATE` | YES | `NULL` | Tanggal Berlaku Efektif |
| `published_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Penerbit |
| `published_at` | `TIMESTAMP` | YES | `NULL` | Waktu Penerbitan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
*Unique constraint: (`document_type`, `source_id`, `version_number`)*

### 2.2 Tabel Fitur Profil Lembaga (5 Tabel)

#### `legal_document_types` (Master Tipe Dokumen Legalitas)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(150)` | NO | - | Akta Notaris, SK Kemenkumham, NPWP, Izin Operasional, NPSN, Piagam Akreditasi, Sertifikat |
| `requires_expiry` | `TINYINT(1)` | NO | `0` | 1 jika memiliki batas masa berlaku |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `institution_legal_documents` (Dokumen Legalitas Yayasan & Sekolah)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `owner_type` | `ENUM` | NO | - | `'foundation','school_unit'` |
| `owner_id` | `BIGINT UNSIGNED` | NO | - | ID Yayasan / Satuan Pendidikan (Core Service) |
| `legal_document_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> legal_document_types(id)` |
| `document_number` | `VARCHAR(100)` | YES | `NULL` | Nomor Surat / SK |
| `issuing_authority` | `VARCHAR(150)` | YES | `NULL` | Instansi Penerbit |
| `issued_date` | `DATE` | YES | `NULL` | Tanggal Terbit |
| `expiry_date` | `DATE` | YES | `NULL` | Tanggal Kadaluarsa |
| `file_url` | `VARCHAR(255)` | YES | `NULL` | URL File Scan / PDF |
| `status` | `ENUM` | NO | `'berlaku'` | `'berlaku','kadaluarsa','dalam_proses'` |
| `notes` | `TEXT` | YES | `NULL` | Catatan Tambahan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `institution_letterheads` (Master Template Kop Surat)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `owner_type` | `ENUM` | NO | - | `'foundation','school_unit'` |
| `owner_id` | `BIGINT UNSIGNED` | NO | - | ID Yayasan / Satuan Pendidikan |
| `name` | `VARCHAR(150)` | NO | - | Nama Template Kop Surat |
| `logo_file_url` | `VARCHAR(255)` | YES | `NULL` | Logo URL |
| `header_html` | `TEXT` | YES | `NULL` | Template HTML Header Kop Surat Siap Pakai |
| `is_default` | `TINYINT(1)` | NO | `0` | 1 jika dijadikan kop surat default |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `institution_stamps` (Master Cap Stempel Resmi)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `owner_type` | `ENUM` | NO | - | `'foundation','school_unit'` |
| `owner_id` | `BIGINT UNSIGNED` | NO | - | ID Yayasan / Satuan Pendidikan |
| `name` | `VARCHAR(150)` | NO | - | Nama Cap Stempel |
| `stamp_type` | `ENUM` | NO | `'digital'` | `'basah','digital'` |
| `image_file_url` | `VARCHAR(255)` | NO | - | File Stempel Transparan |
| `is_default` | `TINYINT(1)` | NO | `0` | 1 jika dijadikan stempel default |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `institution_signatures` (Specimen Tanda Tangan Pejabat)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `owner_type` | `ENUM` | NO | - | `'foundation','school_unit'` |
| `owner_id` | `BIGINT UNSIGNED` | NO | - | ID Yayasan / Satuan Pendidikan |
| `employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai (Kepegawaian) |
| `position_title` | `VARCHAR(150)` | NO | - | Jabatan Tercetak (e.g. "Kepala Sekolah", "Ketua Yayasan") |
| `signature_image_url` | `VARCHAR(255)` | YES | `NULL` | File Tanda Tangan Digital Transparan |
| `is_default` | `TINYINT(1)` | NO | `0` | 1 jika tanda tangan default |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

### 2.3 Tabel Fitur RIPS Terintegrasi (4 Tabel)

#### `rips_documents` (Header Dokumen Induk RIPS)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = RIPS Tingkat Yayasan |
| `name` | `VARCHAR(200)` | NO | - | Nama Dokumen RIPS |
| `vision` | `TEXT` | YES | `NULL` | Visi Strategis Lembaga |
| `mission` | `JSON` | YES | `NULL` | Daftar Misi Lembaga |
| `objectives` | `JSON` | YES | `NULL` | Daftar Tujuan Strategis RIPS |
| `description` | `TEXT` | YES | `NULL` | Deskripsi Dokumen |
| `sk_number` | `VARCHAR(100)` | YES | `NULL` | Nomor SK Pengesahan |
| `sk_date` | `DATE` | YES | `NULL` | Tanggal SK Pengesahan |
| `sk_signer_name` | `VARCHAR(150)` | YES | `NULL` | Nama Pejabat Pengesah SK |
| `sk_signer_position` | `VARCHAR(150)` | YES | `NULL` | Jabatan Pejabat Pengesah SK |
| `sk_file_url` | `VARCHAR(255)` | YES | `NULL` | File Lampiran SK |
| `ratified_at` | `TIMESTAMP` | YES | `NULL` | Tanggal & Waktu Pengesahan Resmi |
| `ratified_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pengesah |
| `current_version` | `INT UNSIGNED` | NO | `1` | Nomor Versi Berjalan |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published'` |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `rips_goals` (Sasaran Strategis RIPS)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `rips_document_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_documents(id) CASCADE` |
| `domain_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_domains(id)` |
| `subdomain_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> rips_subdomains(id)` |
| `bsc_aspect_id` | `BIGINT UNSIGNED` | NO | - | `FK -> bsc_aspects(id)` |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "SAS-001") |
| `title` | `VARCHAR(255)` | NO | - | Nama Sasaran |
| `indicator_name` | `VARCHAR(255)` | NO | - | Indikator Kunci Sasaran |
| `indicator_unit` | `VARCHAR(100)` | NO | - | Satuan Indikator (e.g. "% santri", "guru", "dokumen") |
| `baseline_percent` | `DECIMAL(6,2)` | YES | `NULL` | Capaian Awal (%) |
| `target_percent` | `DECIMAL(6,2)` | YES | `NULL` | Target Sasaran (%) |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `status` | `ENUM` | NO | `'draft'` | `'draft','active','achieved','delayed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `rips_programs` (Program & Upaya Strategis)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `rips_document_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_documents(id) CASCADE` |
| `category_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> rips_program_categories(id) SET NULL` |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "PRG-001") |
| `name` | `VARCHAR(255)` | NO | - | Nama Program |
| `description` | `TEXT` | YES | `NULL` | Uraian Ringkas Program |
| `is_flagship` | `TINYINT(1)` | NO | `0` | 1 = Program Unggulan |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `status` | `ENUM` | NO | `'draft'` | `'draft','active','completed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `rips_program_goal_links` (Relasi Many-to-Many Program ke Sasaran)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `rips_program_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_programs(id) CASCADE` |
| `rips_goal_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_goals(id) CASCADE` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
### 2.4 Tabel Fitur RKJP (8 Tahun) & RKJM (4 Tahun) (2 Tabel)

#### `annual_program_targets` (Data Induk Target Tahunan Lintas RKJP/RKJM/RKT)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `rips_program_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_programs(id) CASCADE` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Satuan Pendidikan (NULL = Yayasan) |
| `academic_year` | `VARCHAR(20)` | NO | - | Format: "2026/2027", "2027/2028" |
| `target_percent` | `DECIMAL(6,2)` | YES | `NULL` | Target Persen (NULL = Program tidak berjalan di thn ini) |
| `notes` | `TEXT` | YES | `NULL` | Catatan Implementasi / Tahapan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
*Unique constraint: (`rips_program_id`, `school_unit_id`, `academic_year`)*

#### `long_term_work_plans` (Header Dokumen RKJP & RKJM)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Satuan Pendidikan (NULL = Rencana Yayasan/Pusat) |
| `plan_type` | `ENUM` | NO | - | `'rkjp','rkjm'` |
| `parent_rkjp_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> long_term_work_plans(id) CASCADE` (untuk RKJM) |
| `title` | `VARCHAR(200)` | NO | - | Judul Dokumen Perencanaan |
| `start_year` | `SMALLINT UNSIGNED` | NO | - | Tahun Awal (e.g. 2026) |
| `end_year` | `SMALLINT UNSIGNED` | NO | - | Tahun Akhir (e.g. 2033 untuk RKJP, 2029 untuk RKJM 1) |
| `sequence_order` | `TINYINT UNSIGNED` | YES | `NULL` | 1 atau 2 untuk urutan RKJM dalam RKJP |
| `current_version` | `INT UNSIGNED` | NO | `1` | Nomor Versi |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published','archived'` |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

### 2.5 Tabel Fitur Rencana Kerja Tahunan (RKT) & Kepanitiaan (4 Tabel)

#### `annual_work_plans` (Header Dokumen RKT)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Satuan Pendidikan (NULL = RKT Tingkat Yayasan) |
| `academic_year` | `VARCHAR(20)` | NO | - | Format: "2026/2027" |
| `title` | `VARCHAR(200)` | NO | - | Judul Dokumen RKT |
| `parent_rkjm_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> long_term_work_plans(id) SET NULL` |
| `current_version` | `INT UNSIGNED` | NO | `1` | Nomor Versi |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published','archived'` |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
*Unique constraint: (`school_unit_id`, `academic_year`)*

#### `work_plan_activities` (Langkah Kegiatan & Tugas Operasional)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `annual_work_plan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> annual_work_plans(id) CASCADE` |
| `rips_program_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_programs(id) CASCADE` |
| `parent_activity_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> work_plan_activities(id) CASCADE` (Sub-langkah) |
| `title` | `VARCHAR(255)` | NO | - | Uraian Langkah Kegiatan |
| `tag` | `ENUM` | NO | `'lainnya'` | `'dokumen','rapat','pengadaan','koordinasi','sosialisasi','kegiatan_utama','dokumentasi','lainnya'` |
| `activity_date` | `DATE` | YES | `NULL` | Tanggal Pelaksanaan |
| `start_date` | `DATE` | YES | `NULL` | Tanggal Mulai (untuk Gantt Timeline) |
| `end_date` | `DATE` | YES | `NULL` | Tanggal Selesai (untuk Gantt Timeline) |
| `assignee_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai PIC Utama (Kepegawaian) |
| `assignee_employee_ids`| `JSON` | YES | `NULL` | Array ID Pegawai Tim Pelaksana (Multiple Assignees) |
| `document_link` | `VARCHAR(255)` | YES | `NULL` | Tautan Dokumen / Bukti |
| `status` | `ENUM` | NO | `'planned'` | `'planned','in_progress','completed','cancelled'` |
| `progress_percent` | `TINYINT UNSIGNED` | NO | `0` | Progres 0 - 100 (%) |
| `notes` | `TEXT` | YES | `NULL` | Catatan Tambahan |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `program_committees` (Kepanitiaan Program Per Tahun Ajaran)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `annual_work_plan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> annual_work_plans(id) CASCADE` |
| `rips_program_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_programs(id) CASCADE` |
| `sk_number` | `VARCHAR(100)` | YES | `NULL` | Nomor SK Penetapan Panitia |
| `sk_date` | `DATE` | YES | `NULL` | Tanggal Penetapan SK |
| `sk_file_url` | `VARCHAR(255)` | YES | `NULL` | File SK Panitia |
| `status` | `ENUM` | NO | `'draft'` | `'draft','disahkan'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
*Unique constraint: (`annual_work_plan_id`, `rips_program_id`)*

#### `program_committee_members` (Anggota Susunan Kepanitiaan)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `program_committee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> program_committees(id) CASCADE` |
| `committee_position_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> committee_position_types(id)` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai (Kepegawaian) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `program_discussions` (Ruang Diskusi & Koordinasi Program)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `rips_program_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_programs(id) CASCADE` |
| `author_user_id` | `BIGINT UNSIGNED` | NO | - | ID User Pengirim Pesan |
| `message` | `TEXT` | NO | - | Isi Pesan Koordinasi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

### 2.6 Tabel Fitur Evaluasi Diri (EVADIR) (2 Tabel)

#### `evadir_reports` (Header Laporan EVADIR)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Satuan Pendidikan (NULL = Yayasan) |
| `rips_document_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_documents(id) CASCADE` |
| `period_label` | `VARCHAR(100)` | NO | - | mis. "Semester 1 2026/2027" |
| `evaluation_date` | `DATE` | NO | - | Tanggal Pelaksanaan Evaluasi |
| `status` | `ENUM` | NO | `'draft'` | `'draft','published'` |
| `current_version` | `INT UNSIGNED` | NO | `1` | Nomor Versi Dokumen |
| `created_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `evadir_goal_results` (Detail Capaian Per Sasaran RIPS & BSC)
| Kolom | Tipe Data | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `evadir_report_id` | `BIGINT UNSIGNED` | NO | - | `FK -> evadir_reports(id) CASCADE` |
| `rips_goal_id` | `BIGINT UNSIGNED` | NO | - | `FK -> rips_goals(id) CASCADE` |
| `input_mode` | `ENUM` | NO | `'percent'` | `'percent','unit_ratio'` |
| `achieved_percent` | `DECIMAL(6,2)` | YES | `NULL` | Persentase Capaian Nyata (Otomatis/Manual) |
| `achieved_numerator` | `DECIMAL(10,2)` | YES | `NULL` | Pembilang Rasio (mis. 50 santri) |
| `achieved_denominator` | `DECIMAL(10,2)` | YES | `NULL` | Penyebut Rasio (mis. 97 santri) |
| `analysis_notes` | `TEXT` | YES | `NULL` | Catatan Temuan & Analisis Penyebab |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
*Unique constraint: (`evadir_report_id`, `rips_goal_id`)*

### 2.7 Tabel Eksisting yang Dipertahankan Tanpa Perubahan
- `tasks` *(Di-ALTER: ditambah `document_link`, `notes`, dan `work_plan_activity_id`)*
- `projects`, `project_members`, `task_comments`, `task_checklists` (Manajemen Proyek Generik)
- `evaluation_follow_ups` (Rencana Tindak Lanjut / RTL)
- `accreditation_reports`, `accreditation_evidences` (Akreditasi)
- `school_risks` (Manajemen Risiko)
- `employee_performance_evaluations`, `employee_performance_evaluation_criteria` (Evaluasi Kinerja 360)
- `supervision_schedules`, `supervision_results` (Supervisi)
- `planning_agendas`, `user_notifications` (Agenda Kalender & Pengingat)
- `cross_app_dashboard_snapshots` (Dashboard Agregat Lintas Aplikasi)
- `approval_workflows`, `approval_steps`, `approval_requests`, `approval_actions` (Approval Workflow)

### 2.8 Tabel yang Dihapus Total (Legacy yang di-drop)
- `institution_development_plans`
- `strategic_goals`
- `school_work_plans`
- `work_plan_programs`
- `work_plan_activities` (akan dibuat ulang dengan skema baru)
- `quality_indicators`
- `quality_indicator_achievements`
- `quality_goals`
- `self_evaluations` (digantikan EVADIR baru)

#### `strategic_goals` (Sasaran Strategis & Trajectory Target 5 Tahunan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `institution_plan_id`| `BIGINT UNSIGNED`| NO | - | `FK -> institution_development_plans(id) CASCADE/CASCADE` |
| `pillar_name` | `VARCHAR(150)` | NO | - | e.g. "Keunggulan Akademik & Bahasa", "Kemandirian Finansial" |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "SG-01") |
| `title` | `VARCHAR(255)` | NO | - | - |
| `description` | `TEXT` | YES | `NULL` | - |
| `target_indicator` | `VARCHAR(255)` | YES | `NULL` | Indikator Kunci |
| `baseline_value` | `VARCHAR(100)` | YES | `NULL` | Capaian Awal |
| `target_value` | `VARCHAR(100)` | YES | `NULL` | Target Akhir Renstra |
| `trajectory_targets`| `JSON` | YES | `NULL` | Target Bertahap (Tahunan / 5 Tahunan) |
| `order_index` | `INT` | NO | `0` | Urutan Tampilan |
| `status` | `ENUM` | NO | `'draft'` | `'draft','active','achieved','delayed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `school_work_plans` (Rencana Kerja Menengah RKJM / RKT Tahunan) — *Fitur #191*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `plan_type` | `VARCHAR(30)` | NO | `'rkt'` | `'rkjm'` (4-5 Tahun), `'rkt'` (Tahunan), `'renop'` |
| `title` | `VARCHAR(200)` | NO | - | e.g. "Rencana Kerja Tahunan TA 2026/2027" |
| `academic_year` | `VARCHAR(20)` | NO | - | e.g. "2026/2027" |
| `start_year` | `SMALLINT UNSIGNED`| YES | `NULL` | Khusus RKJM |
| `end_year` | `SMALLINT UNSIGNED`| YES | `NULL` | - |
| `strategic_goal_id` | `BIGINT UNSIGNED`| YES | `NULL` | `FK -> strategic_goals(id) SET NULL` |
| `budget_estimate` | `DECIMAL(15,2)` | YES | `NULL` | Estimasi Total Anggaran |
| `status` | `ENUM` | NO | `'draft'` | `'draft','submitted','approved','active','closed'` |
| `created_by` | `BIGINT UNSIGNED` | NO | - | User ID Pembuat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `work_plan_programs` (Program Kerja Tahunan & Prioritas Unggulan) — *Fitur #192*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_work_plan_id`| `BIGINT UNSIGNED`| NO | - | `FK -> school_work_plans(id) CASCADE/CASCADE` |
| `code` | `VARCHAR(50)` | NO | - | e.g. "PRG-2026-01" |
| `name` | `VARCHAR(200)` | NO | - | e.g. "Digitalisasi Pembelajaran Smart Classroom" |
| `category` | `VARCHAR(100)` | NO | - | e.g. "Kurikulum", "Kesiswaan", "Sarpras", "SDM" |
| `priority` | `ENUM` | NO | `'medium'` | `'high','medium','low'` |
| `is_flagship` | `TINYINT(1)` | NO | `0` | Program Unggulan Sekolah |
| `pic_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai Penanggung Jawab (Kepegawaian) |
| `allocated_budget` | `DECIMAL(15,2)` | YES | `NULL` | Alokasi Anggaran Belanja (Rp) |
| `status` | `ENUM` | NO | `'planned'` | `'planned','in_progress','completed','evaluated'` |
| `progress_percent`| `TINYINT UNSIGNED`| NO | `0` | 0 - 100 % |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `work_plan_activities` (Rincian Aktivitas Kegiatan RKT / Renop)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `work_plan_program_id`| `BIGINT UNSIGNED`| NO | - | `FK -> work_plan_programs(id) CASCADE/CASCADE` |
| `parent_activity_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> work_plan_activities(id) CASCADE/CASCADE` (Sub-Aktivitas) |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(255)` | NO | - | e.g. "Pelatihan Kurikulum Cambridge untuk Guru IPA" |
| `target_output` | `TEXT` | YES | `NULL` | Output Terukur |
| `start_date` | `DATE` | YES | `NULL` | - |
| `end_date` | `DATE` | YES | `NULL` | - |
| `pic_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai PIC Lapangan |
| `budget_estimate` | `DECIMAL(15,2)` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'planned'` | `'planned','in_progress','completed','cancelled'` |
| `progress_percent`| `TINYINT UNSIGNED`| NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.2 Penjaminan Mutu, 8 SNP & Monev (KPI, Evadir, Akreditasi, Risiko)

#### `quality_indicators` (Kamus Standar Mutu Pendidikan & 8 SNP) — *Fitur #193*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = Standar Mutu Yayasan |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "SNP-1.1", "KPI-AKAD-01") |
| `standard_name` | `VARCHAR(150)` | NO | - | e.g. "Standar Kompetensi Lulusan", "Standar Pendidik" |
| `indicator_name` | `VARCHAR(255)` | NO | - | Deskripsi Tolok Ukur Mutu |
| `target_unit` | `VARCHAR(50)` | NO | - | e.g. "%", "Skor", "Siswa", "Guru" |
| `target_value` | `DECIMAL(10,2)` | NO | - | Nilai Target Standar |
| `data_source` | `VARCHAR(100)` | YES | `NULL` | Sumber Data (e.g. "akademik.students", "kepegawaian") |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `quality_indicator_achievements` (Capaian KPI Mutu Periodik) — *Fitur #194*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `quality_indicator_id`| `BIGINT UNSIGNED`| NO | - | `FK -> quality_indicators(id) CASCADE/CASCADE` |
| `period_year` | `VARCHAR(20)` | NO | - | e.g. "2026/2027" |
| `period_semester` | `TINYINT UNSIGNED`| NO | `1` | 1 / 2 |
| `achieved_value` | `DECIMAL(10,2)` | NO | - | Realisasi Capaian |
| `achievement_rate`| `DECIMAL(5,2)` | NO | - | Persentase Ketercapaian (`achieved / target * 100`) |
| `analysis_notes` | `TEXT` | YES | `NULL` | Analisis Deviasi & Kendala |
| `is_verified` | `TINYINT(1)` | NO | `0` | Verifikasi Auditor Internal |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `quality_goals` (Sasaran Mutu Terukur)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `strategic_goal_id` | `BIGINT UNSIGNED`| YES | `NULL` | `FK -> strategic_goals(id) SET NULL` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` |
| `name` | `VARCHAR(255)` | NO | - | - |
| `quality_standard`| `VARCHAR(150)` | YES | `NULL` | - |
| `period` | `VARCHAR(50)` | NO | `'2026/2027'` | - |
| `target_value` | `DECIMAL(12,2)` | YES | `NULL` | - |
| `actual_value` | `DECIMAL(12,2)` | YES | `NULL` | - |
| `achievement_percentage`| `DECIMAL(6,2)`| YES| `NULL` | - |
| `pic_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'pending'` | `'achieved','pending','critical'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `self_evaluations` (Evaluasi Diri Sekolah / EDS) — *Fitur #195*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year` | `VARCHAR(20)` | NO | - | - |
| `evaluation_date` | `DATE` | NO | - | - |
| `summary_strengths`| `TEXT` | YES | `NULL` | Kekuatan Sekolah |
| `summary_weaknesses`| `TEXT` | YES | `NULL` | Kelemahan / Peluang Perbaikan |
| `recommendations`| `TEXT` | YES | `NULL` | Rekomendasi Tindak Lanjut |
| `status` | `ENUM` | NO | `'draft'` | `'draft','submitted','reviewed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `evaluation_follow_ups` (Rencana Tindak Lanjut / RTL Monev)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `source_type` | `ENUM` | NO | `'general'` | `'kpi','program','activity','quality_goal','supervision','evadir','risk','general'` |
| `issue` | `TEXT` | NO | - | Masalah / Temuan Deviasi |
| `action_plan` | `TEXT` | NO | - | Rencana Aksi Perbaikan |
| `pic_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai PIC |
| `deadline` | `DATE` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'draft'` | `'draft','in_progress','completed','verified','delayed'` |
| `progress_percent`| `INT` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `accreditation_reports` (Kesiapan Akreditasi Sekolah) — *Fitur #196*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `accreditation_body`| `VARCHAR(100)` | NO | `'BAN-S/M'` | e.g. "BAN-S/M", "Cambridge", "Al-Azhar" |
| `target_grade` | `VARCHAR(10)` | NO | `'A'` | 'A', 'Unggul', 'B' |
| `target_score` | `DECIMAL(5,2)` | YES | `NULL` | Target Nilai (e.g. 95.00) |
| `predicted_score`| `DECIMAL(5,2)` | YES | `NULL` | Skor Simulasi Sistem |
| `status` | `ENUM` | NO | `'preparation'` | `'preparation','submitted','visitation','completed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `accreditation_evidences` (Bukti Fisik & Dokumen Akreditasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `accreditation_report_id`| `BIGINT UNSIGNED`| NO | - | `FK -> accreditation_reports(id) CASCADE/CASCADE` |
| `standard_code` | `VARCHAR(50)` | NO | - | e.g. "BUTIR-01", "SNP-4" |
| `document_name` | `VARCHAR(200)` | NO | - | Judul Dokumen Bukti Fisik |
| `file_url` | `VARCHAR(255)` | NO | - | URL Berkas PDF/Dokumen |
| `is_verified` | `TINYINT(1)` | NO | `0` | Status Verifikasi Internal |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `school_risks` (Risk Register, Heatmap Risiko & Mitigasi) — *Fitur #202*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `risk_code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "RSK-OPS-01") |
| `category` | `ENUM` | NO | - | `'akademik','keuangan','operasional','reputasi','kepatuhan'` |
| `title` | `VARCHAR(200)` | NO | - | - |
| `description` | `TEXT` | YES | `NULL` | Uraian Risiko |
| `likelihood` | `TINYINT UNSIGNED`| NO | `1` | Peluang Terjadi (1 - 5) |
| `impact` | `TINYINT UNSIGNED`| NO | `1` | Tingkat Dampak (1 - 5) |
| `risk_score` | `TINYINT UNSIGNED`| NO | `1` | Skor Risiko (`likelihood * impact`) |
| `risk_level` | `ENUM` | NO | `'low'` | `'low','medium','high','extreme'` |
| `mitigation_plan` | `TEXT` | YES | `NULL` | Rencana Mitigasi Pencegahan |
| `pic_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai PIC Risiko |
| `status` | `ENUM` | NO | `'identified'` | `'identified','mitigating','controlled','closed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `cross_app_dashboard_snapshots` (Snapshot Agregat Lintas 13 Modul) — *Fitur #201*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = Ringkasan Yayasan-wide |
| `snapshot_date` | `DATE` | NO | - | - |
| `metrics_data` | `JSON` | NO | - | Matriks Agregat (Siswa, Gaji, SPP, Aset, Buku, dll) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `uq_snapshot_unit_date (school_unit_id, snapshot_date)`

---

### 2.3 Supervisi, Kinerja Pegawai & Agenda

#### `employee_performance_evaluations` (Header Evaluasi Kinerja Pegawai 360) — *Fitur #197*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai yang Dinilai (Kepegawaian) |
| `evaluator_employee_id`| `BIGINT UNSIGNED`| NO | - | ID Pimpinan/Atasan Penilai |
| `period_year` | `VARCHAR(20)` | NO | - | - |
| `period_semester` | `TINYINT UNSIGNED`| NO | `1` | - |
| `total_score` | `DECIMAL(5,2)` | YES | `NULL` | Skor Akhir (0 - 100) |
| `grade` | `VARCHAR(10)` | YES | `NULL` | 'A', 'B', 'C', 'D' |
| `status` | `ENUM` | NO | `'draft'` | `'draft','submitted','approved'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_performance_evaluation_criteria` (Detail Kriteria Penilaian Kinerja)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `evaluation_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employee_performance_evaluations(id) CASCADE/CASCADE` |
| `criteria_name` | `VARCHAR(150)` | NO | - | e.g. "Kedisiplinan & Presensi", "Kompetensi Pedagogik", "Integritas" |
| `weight` | `DECIMAL(5,2)` | NO | - | Bobot Kriteria (%) |
| `score` | `DECIMAL(5,2)` | NO | - | Nilai Skor (0 - 100) |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `supervision_schedules` (Jadwal Supervisi Akademik & Manajerial) — *Fitur #198*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `teacher_employee_id`| `BIGINT UNSIGNED`| NO | - | Guru yang Disupervisi (Kepegawaian) |
| `supervisor_employee_id`| `BIGINT UNSIGNED`| NO| - | Kepala Sekolah / Pengawas |
| `subject_name` | `VARCHAR(100)` | YES | `NULL` | Mata Pelajaran |
| `class_name` | `VARCHAR(50)` | YES | `NULL` | Rombel Kelas |
| `scheduled_date`| `DATE` | NO | - | - |
| `scheduled_time`| `TIME` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'scheduled'` | `'scheduled','in_progress','completed','rescheduled'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `supervision_results` (Lembar Observasi & Hasil Supervisi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `supervision_schedule_id`| `BIGINT UNSIGNED`| NO| - | `FK -> supervision_schedules(id) CASCADE/CASCADE` (`UNIQUE`) |
| `observation_score`| `DECIMAL(5,2)`| NO | - | Skor Observasi (0 - 100) |
| `strengths` | `TEXT` | YES | `NULL` | Aspek Unggul Pengajaran |
| `improvements` | `TEXT` | YES | `NULL` | Aspek yang Perlu Ditingkatkan |
| `agreed_action_plan`| `TEXT` | YES | `NULL` | Kesepakatan Tindak Lanjut Guru & Pengawas |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `planning_agendas` (Agenda Kalender Perencanaan & Monev)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(255)` | NO | - | e.g. "Rapat Pleno Monev Triwulan I" |
| `category` | `ENUM` | NO | `'rapat'` | `'rapat','evaluasi','kegiatan_sekolah','audit_mutu','deadline','lainnya'` |
| `start_date` | `DATE` | NO | - | - |
| `end_date` | `DATE` | YES | `NULL` | - |
| `location` | `VARCHAR(255)` | YES | `NULL` | - |
| `pic_employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `status` | `ENUM` | NO | `'scheduled'` | `'scheduled','in_progress','completed','cancelled'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `user_notifications` (Notifikasi Peringatan Deadline & Overdue)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `recipient_employee_id`| `BIGINT UNSIGNED`| NO | - | ID Pegawai Penerima |
| `type` | `ENUM` | NO | `'system'` | `'deadline_today','overdue_alert','agenda_reminder','task_assignment','system'` |
| `title` | `VARCHAR(255)` | NO | - | - |
| `message` | `TEXT` | NO | - | - |
| `read_at` | `TIMESTAMP` | YES | `NULL` | Status Baca |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

### 2.4 Proyek, Task Management (Kanban) & Approval Workflow

#### `projects` (Manajemen Proyek Khusus Yayasan/Sekolah) — *Fitur #199*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "PRJ-2026-01") |
| `name` | `VARCHAR(200)` | NO | - | e.g. "Pembangunan Gedung Asrama Tahfidz 3 Lantai" |
| `start_date` | `DATE` | NO | - | - |
| `target_end_date`| `DATE` | NO | - | - |
| `budget` | `DECIMAL(15,2)` | YES | `NULL` | - |
| `leader_employee_id`| `BIGINT UNSIGNED`| NO| - | Project Manager (Kepegawaian) |
| `status` | `ENUM` | NO | `'planning'` | `'planning','active','on_hold','completed','cancelled'` |
| `progress_percent`| `TINYINT UNSIGNED`| NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `project_members` (Anggota Tim Proyek)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `project_id` | `BIGINT UNSIGNED` | NO | - | `FK -> projects(id) CASCADE/CASCADE` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | ID Pegawai Anggota |
| `role_in_project`| `VARCHAR(100)` | NO | - | e.g. "Koordinator Logistik", "Arsitek Lapangan" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `uq_project_employee (project_id, employee_id)`

#### `tasks` (Task Management & Kanban Board)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `project_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> projects(id) CASCADE/CASCADE` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(200)` | NO | - | Judul Tugas |
| `description` | `TEXT` | YES | `NULL` | - |
| `assignee_employee_id`| `BIGINT UNSIGNED`| YES| `NULL` | Pelaksana Tugas |
| `priority` | `ENUM` | NO | `'medium'` | `'low','medium','high','urgent'` |
| `status` | `ENUM` | NO | `'todo'` | `'todo','in_progress','review','done'` |
| `due_date` | `DATE` | YES | `NULL` | Batas Waktu |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `task_checklists` (Checklist Sub-Tugas Task)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `task_id` | `BIGINT UNSIGNED` | NO | - | `FK -> tasks(id) CASCADE/CASCADE` |
| `title` | `VARCHAR(255)` | NO | - | - |
| `is_completed` | `TINYINT(1)` | NO | `0` | - |
| `completed_at` | `TIMESTAMP` | YES | `NULL` | - |
| `order_index` | `INT` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `task_comments` (Komentar & Diskusi Task)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `task_id` | `BIGINT UNSIGNED` | NO | - | `FK -> tasks(id) CASCADE/CASCADE` |
| `author_user_id` | `BIGINT UNSIGNED` | NO | - | User ID Penulis (Core Service) |
| `comment` | `TEXT` | NO | - | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `approval_workflows` (Template Workflow Approval Bertingkat) — *Fitur #200*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = Berlaku Yayasan-wide |
| `document_type` | `VARCHAR(100)` | NO | - | e.g. "RKT_APPROVAL", "PROGRAM_BUDGET", "PROJECT_CHARTER" |
| `name` | `VARCHAR(150)` | NO | - | - |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_aw_doc_type (school_unit_id, document_type)`

#### `approval_steps` (Langkah / Tier Approval)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `approval_workflow_id`| `BIGINT UNSIGNED`| NO| - | `FK -> approval_workflows(id) CASCADE/CASCADE` |
| `step_order` | `TINYINT UNSIGNED`| NO | `1` | Urutan Langkah (Tier 1, Tier 2, Tier 3) |
| `approver_role` | `VARCHAR(100)` | NO | - | Role / Jabatan (e.g. "kepala_sekolah", "ketua_yayasan") |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `approval_requests` (Pengajuan Approval Permohonan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `approval_workflow_id`| `BIGINT UNSIGNED`| NO| - | `FK -> approval_workflows(id) RESTRICT/CASCADE` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `reference_type` | `VARCHAR(100)` | NO | - | Tabel Sumber (e.g. "work_plan_programs", "school_work_plans") |
| `reference_id` | `BIGINT UNSIGNED` | NO | - | ID Entitas Sumber |
| `requester_user_id`| `BIGINT UNSIGNED`| NO | - | User ID Pemohon |
| `current_step_order`| `TINYINT UNSIGNED`| NO| `1` | Posisi Tier Approval Berjalan |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected','revision_needed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `approval_actions` (Riwayat Tindakan Otorisasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `approval_request_id`| `BIGINT UNSIGNED`| NO| - | `FK -> approval_requests(id) CASCADE/CASCADE` |
| `actor_user_id` | `BIGINT UNSIGNED` | NO | - | User ID Pejabat Penyetuju |
| `step_order` | `TINYINT UNSIGNED`| NO | - | - |
| `action` | `ENUM` | NO | - | `'approve','reject','request_revision'` |
| `notes` | `TEXT` | YES | `NULL` | Catatan Otorisasi |
| `acted_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

## 3. Kontrak API Ringkas (`/api/v1/manajemen`)

### 3.1 Perencanaan Strategis & RKT
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/dashboard/executive` | `authenticate` | - | `{ strategic_summary: object, kpi_achievements: array, active_projects: array }` |
| `GET` | `/institution-development-plans`| `manajemen.planning.rips.view` | - | `{ plans: array }` |
| `POST` | `/institution-development-plans`| `manajemen.planning.rips.manage` | `{ name: string, start_year: number, end_year: number, vision?: string, mission?: array, strategic_pillars?: array }` | `{ id: number }` |
| `GET` | `/strategic-goals` | `manajemen.planning.rips.view` | Query: `?institution_plan_id=` | `{ goals: array }` |
| `POST` | `/strategic-goals` | `manajemen.planning.rips.manage` | `{ institution_plan_id: number, pillar_name: string, code: string, title: string, trajectory_targets?: object }` | `{ id: number }` |
| `GET` | `/school-work-plans` | `manajemen.planning.rks.view` | Query: `?academic_year=&plan_type=` | `{ work_plans: array }` |
| `POST` | `/school-work-plans` | `manajemen.planning.rks.manage` | `{ title: string, academic_year: string, plan_type: string, strategic_goal_id?: number }` | `{ id: number }` |
| `GET` | `/work-plan-programs` | `manajemen.planning.work_programs.view` | Query: `?work_plan_id=&priority=&status=` | `{ programs: array }` |
| `POST` | `/work-plan-programs` | `manajemen.planning.work_programs.manage_own` | `{ school_work_plan_id: number, code: string, name: string, category: string, priority?: string, allocated_budget?: number, pic_employee_id?: number }` | `{ id: number }` |
| `GET` | `/work-plan-activities`| `manajemen.planning.work_programs.view` | Query: `?program_id=` | `{ activities: array }` |
| `POST` | `/work-plan-activities`| `manajemen.planning.work_programs.manage_own` | `{ work_plan_program_id: number, name: string, start_date?: string, end_date?: string, pic_employee_id?: number }` | `{ id: number }` |

### 3.2 Penjaminan Mutu, Akreditasi & Manajemen Risiko
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/quality-indicators` | `manajemen.quality.kpi.view` | Query: `?standard_name=` | `{ indicators: array }` |
| `POST` | `/quality-indicators` | `manajemen.quality.kpi.manage` | `{ code: string, standard_name: string, indicator_name: string, target_unit: string, target_value: number }` | `{ id: number }` |
| `POST` | `/quality-indicators/:id/achievements`| `manajemen.quality.kpi.manage` | `{ period_year: string, period_semester: number, achieved_value: number, analysis_notes?: string }` | `{ id: number, achievement_rate: number }` |
| `GET` | `/self-evaluations` | `manajemen.quality.self_evaluation.view`| Query: `?academic_year=` | `{ evaluations: array }` |
| `POST` | `/self-evaluations` | `manajemen.quality.self_evaluation.manage`| `{ academic_year: string, evaluation_date: string, summary_strengths?: string, summary_weaknesses?: string }` | `{ id: number }` |
| `GET` | `/evaluation-follow-ups` | `authenticate` | Query: `?status=&source_type=` | `{ follow_ups: array }` |
| `POST` | `/evaluation-follow-ups` | `authenticate` | `{ source_type: string, issue: string, action_plan: string, pic_employee_id?: number, deadline?: string }` | `{ id: number }` |
| `GET` | `/accreditation-reports`| `manajemen.quality.accreditation.view` | - | `{ reports: array }` |
| `POST` | `/accreditation-reports`| `manajemen.quality.accreditation.manage` | `{ accreditation_body: string, target_grade: string, target_score?: number }` | `{ id: number }` |
| `POST` | `/accreditation-reports/:id/evidences`| `manajemen.quality.accreditation.manage`| `{ standard_code: string, document_name: string, file_url: string }` | `{ id: number }` |
| `GET` | `/school-risks` | `manajemen.quality.risks.view` | Query: `?category=&status=` | `{ risks: array }` |
| `GET` | `/school-risks/heatmap` | `manajemen.quality.risks.view` | - | `{ matrix: object, extreme_risks: array, high_risks: array }` |
| `POST` | `/school-risks` | `manajemen.quality.risks.manage` | `{ risk_code: string, category: string, title: string, likelihood: number, impact: number, mitigation_plan?: string }` | `{ id: number, risk_score: number, risk_level: string }` |
| `GET` | `/dashboard/cross-app` | `manajemen.quality.dashboard_cross_app.view`| Query: `?snapshot_date=` | `{ metrics: object, modules_summary: object }` |
| `POST` | `/internal/dashboard/cross-app/snapshot`| `X-API-Key` (Cron/Scheduler) | `{ snapshot_date: string, metrics_data: object }` | `{ id: number, snapshot_date: string }` |

### 3.3 Kinerja Pegawai, Supervisi & Proyek (Kanban Task)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/employee-performance-evaluations`| `manajemen.performance.evaluations.manage`| Query: `?employee_id=&period_year=` | `{ evaluations: array }` |
| `POST` | `/employee-performance-evaluations`| `manajemen.performance.evaluations.manage`| `{ employee_id: number, evaluator_employee_id: number, period_year: string, period_semester: number, criteria: array<{ criteria_name, weight, score }> }` | `{ id: number, total_score: number, grade: string }` |
| `GET` | `/internal/employee-performance-evaluations`| `X-API-Key` (Kepegawaian) | Query: `?period_year=` | `{ evaluations: array<{ employee_id, total_score, grade }> }` |
| `GET` | `/supervision-schedules`| `manajemen.supervision.schedules.manage` | Query: `?status=&date=` | `{ schedules: array }` |
| `POST` | `/supervision-schedules`| `manajemen.supervision.schedules.manage` | `{ teacher_employee_id: number, supervisor_employee_id: number, subject_name: string, class_name: string, scheduled_date: string }` | `{ id: number }` |
| `POST` | `/supervision-schedules/:id/results`| `manajemen.supervision.schedules.manage`| `{ observation_score: number, strengths?: string, improvements?: string, agreed_action_plan?: string }` | `{ id: number }` |
| `GET` | `/projects` | `manajemen.projects.manage_all` | Query: `?status=` | `{ projects: array }` |
| `POST` | `/projects` | `manajemen.projects.manage_all` | `{ code: string, name: string, start_date: string, target_end_date: string, leader_employee_id: number, budget?: number }` | `{ id: number }` |
| `GET` | `/tasks` | `authenticate` | Query: `?project_id=&status=&assignee_employee_id=` | `{ tasks: array }` |
| `POST` | `/tasks` | `manajemen.projects.tasks.manage_own` | `{ project_id?: number, title: string, description?: string, assignee_employee_id?: number, priority?: string, due_date?: string }` | `{ id: number }` |
| `PATCH`| `/tasks/:id/status` | `manajemen.projects.tasks.manage_own` | `{ status: 'todo'\|'in_progress'\|'review'\|'done'` | `{ id: number, status: string }` |
| `GET` | `/agendas` | `authenticate` | Query: `?category=&start_date=&end_date=` | `{ agendas: array }` |
| `POST` | `/agendas` | `manajemen.projects.tasks.manage_own` | `{ title: string, category: string, start_date: string, location?: string, pic_employee_id?: number }` | `{ id: number }` |
| `GET` | `/approval-requests` | `manajemen.approval.requests.view` | Query: `?status=` | `{ requests: array }` |
| `POST` | `/approval-requests/:id/action`| `manajemen.approval.requests.approve` | `{ action: 'approve'\|'reject'\|'request_revision', notes?: string }` | `{ id: number, current_status: string }` |

---

## 4. Workflows & State Machines

- **Alur Perencanaan RIPS $\rightarrow$ RKJM $\rightarrow$ RKT:** Visi & Pilar RIPS (25 th) $\rightarrow$ Sasaran Strategis & Trajectory Target Renstra (5-10 th) $\rightarrow$ Rencana Kerja Menengah RKJM (4-5 th) $\rightarrow$ Program RKT Tahunan $\rightarrow$ Rincian Kegiatan Renop $\rightarrow$ Pengajuan Approval Workflow.
- **Siklus Penjaminan Mutu & Monev (PDCA):** Penetapan Kamus Indikator Mutu 8 SNP & Target KPI $\rightarrow$ Pengisian Realisasi Capaian Periodik $\rightarrow$ Evaluasi Diri Sekolah (EDS) $\rightarrow$ Rencana Tindak Lanjut (RTL) / `evaluation_follow_ups` $\rightarrow$ Pemantauan Akreditasi.
- **Evaluasi Kinerja 360 & Supervisi:** Jadwal Supervisi Kelas $\rightarrow$ Pelaksanaan Observasi Lapangan $\rightarrow$ Kesepakatan RTL $\rightarrow$ Agregasi Skor Kinerja Guru $\rightarrow$ Service Ingest ke Modul Kepegawaian (`GET /internal/employee-performance-evaluations`).
- **Persetujuan Workflow Bertingkat (Multi-Tier Approval):** Pengajuan proposal program/anggaran $\rightarrow$ status `pending` pada Step 1 $\rightarrow$ Approval Tier 1 (Kepala Unit) $\rightarrow$ Step 2 (Direktur/Ketua Yayasan) $\rightarrow$ `approved` (otomatis aktif) ATAU `rejected` / `revision_needed`.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

### 5.1 Daftar Route & Halaman Manajemen (`src/apps/manajemen/pages/`)
| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/manajemen/login` | `src/apps/manajemen/pages/Login.jsx` | Login pimpinan yayasan, kepala sekolah & tim penjamin mutu |
| `/manajemen/dashboard` | `src/apps/manajemen/pages/Dashboard.jsx` | Executive Dashboard: KPI agregat lintas 13 modul, roadmap RIPS & alert risiko |
| `/manajemen/institution-profile` | `src/apps/manajemen/pages/InstitutionProfile.jsx` | Profil lembaga, legalitas (Akta, SK, NPSN), stempel resmi & specimen ttd |
| `/manajemen/planning` | `src/apps/manajemen/pages/Planning.jsx` | Overview perencanaan terpadu, hierarki RIPS -> RKJP/RKJM -> RKT |
| `/manajemen/planning/rips` | `src/apps/manajemen/pages/RipsPlanning.jsx` | Dokumen RIPS 25 tahun, visi misi, sasaran BSC & program unggulan |
| `/manajemen/planning/rkjp-rkjm` | `src/apps/manajemen/pages/LongTermPlanning.jsx` | Rencana jangka panjang 8 tahun (RKJP) & menengah 4 tahun (RKJM) |
| `/manajemen/planning/rkt` | `src/apps/manajemen/pages/AnnualWorkPlan.jsx` | Rencana Kerja Tahunan (RKT), langkah kegiatan, kepanitiaan SK & PIC |
| `/manajemen/evadir` | `src/apps/manajemen/pages/SelfEvaluation.jsx` | Evaluasi Diri Lembaga (EVADIR) per semester berbasis target sasaran RIPS |
| `/manajemen/bsc` | `src/apps/manajemen/pages/BalancedScorecard.jsx` | Balanced Scorecard (BSC): 4 perspektif, target vs realisasi, strategi peta |
| `/manajemen/quality` | `src/apps/manajemen/pages/Quality.jsx` | Kamus standar mutu 8 SNP, dashboard KPI, evaluasi diri EDS & akreditasi |
| `/manajemen/risks` | `src/apps/manajemen/pages/RiskManagement.jsx` | Risk Register, Heatmap matriks risiko 5x5 & status mitigasi pencegahan |
| `/manajemen/tasks` | `src/apps/manajemen/pages/TaskProjectHub.jsx` | Hub Tugas & Timeline Terpadu: Gantt Chart interaktif (`@svar-ui/react-gantt`), Kanban Board, & Task Checklist |
| `/manajemen/projects` | *(Redirect ke `/manajemen/tasks`)* | Alias integrasi proyek ke Task & Project Hub |
| `/manajemen/evaluation` | `src/apps/manajemen/pages/EvaluationMonev.jsx` | Panel monitoring & evaluasi (Monev), deviasi target & rencana tindak lanjut (RTL) |
| `/manajemen/approvals` | `src/apps/manajemen/pages/ApprovalCenter.jsx` | Pusat persetujuan permohonan dokumen, program & anggaran multi-tier |
| `/manajemen/documents` | `src/apps/manajemen/pages/DocumentRepository.jsx` | Repositori arsip SK, dokumen resmi RIPS/RKJP/RKJM/RKT & publikasi |
| `/manajemen/performance` | `src/apps/manajemen/pages/Performance.jsx` | Evaluasi kinerja pegawai 360, pembobotan kriteria & distribusi nilai |
| `/manajemen/supervision` | `src/apps/manajemen/pages/Supervision.jsx` | Jadwal supervisi akademik/manajerial, lembar observasi & tindak lanjut guru |

### 5.2 Fitur Khusus & Arsitektur Frontend Manajemen
- **Gantt Chart Interactive Engine (`src/apps/manajemen/components/gantt/`):** Menggunakan library `@svar-ui/react-gantt` dengan custom academic scale, drag-and-drop update progress/tanggal, multi-assignee badge, dan adapter `mapSvarChangeToApiPayload.js`.
- **Tema & Dark Mode (`src/apps/manajemen/theme/`):** Context `ManajemenThemeContext.jsx`, styles `manajemen-theme.css`, dan switch `ThemeToggle.jsx` mendukung mode Light/Dark eksekutif independen.

---

## 6. Dependensi Modul (Agregator Sistem)

Sebagai modul agregator eksekutif, status konsumsi data modul lain terbagi atas:

### 6.1 Dependensi Aktif (Sudah Terhubung di Kode Aktual)
- **`core`**: Autentikasi JWT SSO lokal, master Satuan Pendidikan & profil Yayasan, audit log eksekutif & otorisasi role pimpinan.
- **`kepegawaian`**: Menarik data master pegawai (`employees`) untuk penugasan PIC program/kegiatan, project leader, evaluator supervisi, dan mengirimkan hasil evaluasi kinerja tahunan via `GET /api/v1/manajemen/internal/employee-performance-evaluations`.
- **`akademik`**: Mengambil agregat statistik siswa, ketidakhadiran, distribusi nilai, dan monev kurikulum untuk pencapaian KPI mutu pendidikan & supervisi pengajaran guru.
- **`keuangan`**: Mengambil data realisasi anggaran RAPBS, laporan laba rugi, neraca, dan arus kas untuk pemantauan target finansial pada sasaran strategis RIPS/RKT.

### 6.2 Dependensi Agregat Terencana (In-Progress / Snapshot Engine `#201`)
- **`sarpras`**: Penarikan metrik kondisi aset & utilisasi ruang via snapshot.
- **`kantin`**: Penarikan metrik omset unit bisnis & bagi hasil kantin.
- **`dapur`**: Penarikan metrik kepuasan konsumsi & efisiensi biaya logistik santri.
- **`perpustakaan`**: Penarikan metrik indeks literasi, buku terpopuler, dan pemanfaatan perpustakaan.
- **`cbe`**: Penarikan metrik kelulusan ujian CBT & integritas ujian.
- **`alquran`**: Penarikan metrik ketercapaian target hafalan juz & munaqasyah santri.
- **`website-utama`**: Penarikan metrik jumlah pendaftar PPDB baru.
- **`komunikasi`**: Penarikan rekap blast pengumuman yayasan.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Automated Cross-App Ingest Cron Worker:** Endpoint snapshot agregat lintas modul (`POST /internal/dashboard/cross-app/snapshot`) telah siap dengan skema JSON fleksibel, scheduler background telah diinisialisasi pada saat server startup.
2. **AI Risk Assessment & Predictive Analytics:** Heatmap risiko saat ini mengandalkan kalkulasi matriks standar $5 \times 5$; fitur prediksi deviasi target berbasis machine learning masuk dalam roadmap masa depan.

---

<!-- updated: 2026-08-31 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
