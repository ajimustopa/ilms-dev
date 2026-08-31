# AI-REF: Modul SDM & Kepegawaian (`kepegawaian`)

> Dokumen referensi teknis modul Kepegawaian untuk AI Agent. Data diambil langsung dari 29 file migrasi Knex aktual, router/controller backend, dan router frontend portal.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/kepegawaian/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/kepegawaian/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/kepegawaian/`
- **Database Engine:** MariaDB 10.5 (`aldepos_kepegawaian` / `u622997391_dbkepegawaian`)
- **Status Implementasi:** `jalan-produksi` (Data Master Pegawai 1:N Lengkap, Status Fleksibel, Rekrutmen & Multi-Stage, Tes Psikologi MBTI/Big Five OCEAN, DUK Pangkat, Presensi GPS, Payroll & Kinerja)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (33 Tabel)

### 2.1 Master Pegawai, Status & Penugasan Satuan Pendidikan

#### `employees` (Master Pegawai & Guru)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | Unit Utama (NULL = Tingkat Yayasan) |
| `nip` | `VARCHAR(50)` | YES | `NULL` | `UNIQUE` |
| `nik` | `VARCHAR(20)` | YES | `NULL` | `UNIQUE` |
| `nuptk` | `VARCHAR(30)` | YES | `NULL` | `UNIQUE` (Khusus Pendidik) |
| `full_name` | `VARCHAR(150)` | NO | - | - |
| `gender` | `ENUM` | NO | - | `'L','P'` |
| `birth_place` | `VARCHAR(100)` | YES | `NULL` | - |
| `birth_date` | `DATE` | YES | `NULL` | - |
| `phone_number` | `VARCHAR(30)` | YES | `NULL` | - |
| `email` | `VARCHAR(150)` | YES | `NULL` | `UNIQUE` |
| `employment_status_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> employment_statuses(id) SET NULL` |
| `current_position_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> job_positions(id) SET NULL` |
| `rank_grade` | `VARCHAR(50)` | YES | `NULL` | Golongan / Ruang (e.g. "III/a") |
| `join_date` | `DATE` | NO | - | Tanggal Mulai Bekerja |
| `base_salary` | `DECIMAL(15,2)` | NO | `0.00` | Gaji Pokok |
| `photo_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `account_status` | `ENUM` | NO | `'active'` | `'active','non-active','terminated','retired'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_employees_satuan (satuan_pendidikan_id)`, `idx_employees_status (account_status)`, `idx_employees_position (current_position_id)`

#### `employment_statuses` (Master Status Kepegawaian Fleksibel)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. `GTY`, `GTT`, `PTY`, `PTT`, `KONTRAK`) |
| `name` | `VARCHAR(100)` | NO | - | e.g. "Guru Tetap Yayasan" |
| `category` | `VARCHAR(50)` | YES | `'umum'` | `'guru','tendik','umum'` |
| `description` | `TEXT` | YES | `NULL` | - |
| `is_active` | `TINYINT(1)` | NO | `1 (true)` | - |
| `sort_order` | `INT UNSIGNED` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_emp_statuses_active_sort (is_active, sort_order)`

#### `job_positions` (Master Formasi & Struktur Jabatan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | NULL = Jabatan Yayasan |
| `name` | `VARCHAR(100)` | NO | - | e.g. "Kepala Sekolah", "Waka Kurikulum" |
| `level` | `TINYINT UNSIGNED` | NO | `1` | Level hierarki struktur |
| `parent_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> job_positions(id) SET NULL` |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_job_positions_satuan (satuan_pendidikan_id)`, `idx_job_positions_parent (parent_id)`

#### `employee_school_assignments` (Penempatan Multi-Unit Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `is_primary_unit` | `TINYINT(1)` | NO | `0` | Unit Homebase Utama |
| `assigned_at` | `DATE` | NO | - | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_employee_school_assignment (employee_id, school_unit_id)`

#### `employee_account_status_logs` (Audit Log Mutasi Status Akun Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `previous_status` | `VARCHAR(30)` | NO | - | - |
| `new_status` | `VARCHAR(30)` | NO | - | - |
| `effective_date` | `DATE` | YES | `NULL` | - |
| `reason` | `TEXT` | NO | - | Alasan perubahan status wajib |
| `changed_by_user_id`| `BIGINT UNSIGNED` | YES | `NULL` | User Core Service |
| `changed_by_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

### 2.2 Relasi Biodata Lengkap Pegawai (1:N Sub-Entities)

#### `employee_addresses` (Alamat KTP & Domisili)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `address_type` | `ENUM` | NO | - | `'ktp','domisili'` |
| `street` | `TEXT` | YES | `NULL` | - |
| `rt` | `VARCHAR(5)` | YES | `NULL` | - |
| `rw` | `VARCHAR(5)` | YES | `NULL` | - |
| `hamlet` | `VARCHAR(100)` | YES | `NULL` | Dusun |
| `village` | `VARCHAR(100)` | YES | `NULL` | Kelurahan/Desa |
| `district` | `VARCHAR(100)` | YES | `NULL` | Kecamatan |
| `city` | `VARCHAR(100)` | YES | `NULL` | Kota/Kabupaten |
| `province` | `VARCHAR(100)` | YES | `NULL` | Provinsi |
| `postal_code` | `VARCHAR(10)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_employee_addresses_emp_type (employee_id, address_type)`

#### `employee_education_trainings` (Riwayat Pendidikan & Pelatihan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `record_type` | `ENUM` | NO | - | `'formal_education','training'` |
| `institution_name`| `VARCHAR(150)` | NO | - | Nama Sekolah / Kampus / Lembaga |
| `degree_or_title`| `VARCHAR(100)` | YES | `NULL` | e.g. "S.Pd", "M.Kom", "Sertifikat Vokasi" |
| `major` | `VARCHAR(100)` | YES | `NULL` | Jurusan / Program Studi |
| `graduation_year`| `YEAR` | YES | `NULL` | - |
| `certificate_number`| `VARCHAR(100)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_family_members` (Anggota Keluarga / Tanggungan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `name` | `VARCHAR(150)` | NO | - | - |
| `relationship` | `ENUM` | NO | - | `'spouse','child','parent'` |
| `birth_date` | `DATE` | YES | `NULL` | - |
| `is_covered_insurance`| `TINYINT(1)` | NO | `0` | Tanggungan BPJS / Asuransi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_bank_accounts` (Rekening Bank Payroll)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `bank_id` | `VARCHAR(50)` | YES | `NULL` | Kode Bank / Provider |
| `bank_name` | `VARCHAR(100)` | NO | - | e.g. "BSI", "BCA", "Mandiri" |
| `account_number`| `VARCHAR(50)` | NO | - | - |
| `account_holder_name`| `VARCHAR(150)`| NO | - | Nama Rekening Sesuai Buku Tabungan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_publications` (Karya Ilmiah & Publikasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `title` | `VARCHAR(255)` | NO | - | Judul Karya / Jurnal / Buku |
| `publication_year`| `INT UNSIGNED` | YES | `NULL` | - |
| `publisher_or_media`| `VARCHAR(150)`| YES | `NULL` | Penerbit / Media Massa |
| `publication_url` | `VARCHAR(255)` | YES | `NULL` | Link jurnal / repositori |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_work_experiences` (Riwayat Pengalaman Kerja)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `organization_name`| `VARCHAR(150)`| NO | - | Nama Perusahaan / Sekolah Sebelumnya |
| `role_title` | `VARCHAR(150)` | NO | - | Posisi / Jabatan |
| `start_date` | `DATE` | YES | `NULL` | - |
| `end_date` | `DATE` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_organization_activities` (Riwayat Organisasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `organization_name`| `VARCHAR(150)`| NO | - | e.g. "PGRI", "MGMP Matematika", "Pramuka" |
| `position` | `VARCHAR(100)` | YES | `NULL` | Jabatan dalam organisasi |
| `year` | `INT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_warning_letters` (Surat Peringatan / SP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `warning_date` | `DATE` | NO | - | - |
| `letter_number` | `VARCHAR(100)` | NO | - | Nomor Surat Keputusan SP |
| `description` | `TEXT` | YES | `NULL` | Uraian pelanggaran |
| `issued_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai / Pimpinan Penerbit SP |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_document_checklists` (Checklist Dokumen Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `document_name` | `VARCHAR(100)` | NO | - | e.g. "KTP", "Ijazah S1", "SK Pengangkatan", "NPWP" |
| `status` | `ENUM` | NO | `'not_available'` | `'available','not_available'` |
| `file_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_employee_doc_checklists_emp_doc (employee_id, document_name)`

#### `employee_retirement_plans` (Perencanaan Pensiun / DPLK)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` (`UNIQUE`) |
| `target_retirement_date`| `DATE` | NO | - | - |
| `dplk_account_number` | `VARCHAR(50)` | YES | `NULL` | No. Polis / Akun DPLK |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.3 Riwayat Kepangkatan, Mutasi & Struktur Organisasi

#### `employee_position_history` (Riwayat Jabatan & Golongan DUK)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `position_id` | `BIGINT UNSIGNED` | NO | - | `FK -> job_positions(id) RESTRICT/CASCADE` |
| `rank_grade` | `VARCHAR(50)` | YES | `NULL` | - |
| `start_date` | `DATE` | NO | - | - |
| `end_date` | `DATE` | YES | `NULL` | - |
| `sk_number` | `VARCHAR(100)` | YES | `NULL` | Nomor Surat Keputusan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_mutations` (Riwayat Mutasi Antar-Satuan Pendidikan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `from_school_unit_id`| `BIGINT UNSIGNED`| YES | `NULL` | - |
| `to_school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `mutation_date` | `DATE` | NO | - | - |
| `reason` | `TEXT` | YES | `NULL` | - |
| `sk_number` | `VARCHAR(100)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.4 Kehadiran (Presensi GPS, Cuti & Lembur)

#### `employee_attendances` (Presensi Harian Pegawai & GPS Radius)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | Unit Lokasi Absen |
| `date` | `DATE` | NO | - | - |
| `check_in` | `DATETIME` | YES | `NULL` | - |
| `check_out` | `DATETIME` | YES | `NULL` | - |
| `status` | `ENUM` | NO | - | `'present','sick','leave','absent'` |
| `notes` | `TEXT` | YES | `NULL` | Alasan koreksi presensi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_employee_daily_attendance (employee_id, date)`

#### `employee_leave_requests` (Pengajuan Cuti & Izin)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `start_date` | `DATE` | NO | - | - |
| `end_date` | `DATE` | NO | - | - |
| `leave_type` | `ENUM` | NO | - | `'annual','sick','maternity','unpaid'` |
| `reason` | `TEXT` | NO | - | - |
| `attachment_url` | `VARCHAR(255)` | YES | `NULL` | Surat dokter / lampiran |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected'` |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | ID Pegawai Atasan/HRD |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `employee_overtimes` (Pengajuan Lembur Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `overtime_date` | `DATE` | NO | - | - |
| `start_time` | `TIME` | NO | - | - |
| `end_time` | `TIME` | NO | - | - |
| `duration_hours` | `DECIMAL(4,2)` | NO | - | Jam kerja lembur |
| `reason` | `TEXT` | NO | - | Uraian pekerjaan lembur |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected'` |
| `approved_by` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.5 Penggajian & Penilaian Kinerja

#### `payroll_periods` (Periode Penggajian)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(100)` | NO | - | e.g. "Gaji Agustus 2026" |
| `start_date` | `DATE` | NO | - | Cut-off mulai |
| `end_date` | `DATE` | NO | - | Cut-off selesai |
| `payment_date` | `DATE` | NO | - | Tanggal pencairan |
| `status` | `ENUM` | NO | `'draft'` | `'draft','calculating','verified','locked'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `payroll_items` (Slip Gaji Rincian Komponen Pegawai)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `payroll_period_id` | `BIGINT UNSIGNED` | NO | - | `FK -> payroll_periods(id) CASCADE/CASCADE` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) RESTRICT/CASCADE` |
| `base_salary` | `DECIMAL(15,2)` | NO | - | - |
| `allowances` | `DECIMAL(15,2)` | NO | `0.00` | Tunjangan |
| `deductions` | `DECIMAL(15,2)` | NO | `0.00` | Potongan (Kasbon/PPh/BPJS) |
| `net_salary` | `DECIMAL(15,2)` | NO | - | Gaji Bersih Diterima |
| `status` | `ENUM` | NO | `'draft'` | `'draft','verified'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_payroll_period_employee (payroll_period_id, employee_id)`

#### `performance_reviews` (Penilaian Kinerja / SKP)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `employee_id` | `BIGINT UNSIGNED` | NO | - | `FK -> employees(id) CASCADE/CASCADE` |
| `reviewer_employee_id`| `BIGINT UNSIGNED`| NO | - | `FK -> employees(id) RESTRICT/CASCADE` |
| `period_year` | `YEAR` | NO | - | - |
| `period_semester` | `TINYINT UNSIGNED`| NO | - | 1 / 2 |
| `score` | `DECIMAL(5,2)` | NO | - | Skor Akhir (0-100) |
| `grade` | `VARCHAR(10)` | NO | - | 'A', 'B', 'C', 'D' |
| `notes` | `TEXT` | YES | `NULL` | Rekomendasi & Evaluasi |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.6 Modul Rekrutmen & Multi-Stage Evaluation

#### `recruitment_positions` (Lowongan Formasi Kerja)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `position_id` | `BIGINT UNSIGNED` | NO | - | `FK -> job_positions(id) RESTRICT/CASCADE` |
| `title` | `VARCHAR(150)` | NO | - | e.g. "Guru Bahasa Inggris SMA" |
| `quota` | `SMALLINT UNSIGNED`| NO | `1` | Kuota penerimaan |
| `status` | `ENUM` | NO | `'open'` | `'open','closed'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `recruitment_candidates` (Data Pelamar / Kandidat)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `recruitment_position_id`| `BIGINT UNSIGNED`| NO | - | `FK -> recruitment_positions(id) CASCADE/CASCADE` |
| `full_name` | `VARCHAR(150)` | NO | - | - |
| `nik` | `VARCHAR(20)` | YES | `NULL` | - |
| `email` | `VARCHAR(150)` | NO | - | - |
| `phone_number` | `VARCHAR(30)` | NO | - | - |
| `cv_url` | `VARCHAR(255)` | YES | `NULL` | File berkas CV |
| `current_stage` | `ENUM` | NO | `'administrasi'` | `'administrasi','tes_psikotes','wawancara','microteaching','penawaran','diterima','ditolak'` |
| `interview_score` | `DECIMAL(5,2)` | YES | `NULL` | - |
| `microteaching_score`| `DECIMAL(5,2)` | YES | `NULL` | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `recruitment_interview_scores` (Nilai Interview & Microteaching)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `candidate_id` | `BIGINT UNSIGNED` | NO | - | `FK -> recruitment_candidates(id) CASCADE/CASCADE` |
| `evaluator_employee_id`| `BIGINT UNSIGNED`| NO | - | Pewawancara / Penguji |
| `stage_type` | `ENUM` | NO | - | `'interview','microteaching'` |
| `score` | `DECIMAL(5,2)` | NO | - | - |
| `notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

### 2.7 Instrumen Tes Psikologi (MBTI & Big Five OCEAN)

#### `psychotest_types` (Master Tipe Instrumen Tes)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `code` | `VARCHAR(50)` | NO | - | `UNIQUE` (`MBTI`, `BIG_FIVE_OCEAN`) |
| `name` | `VARCHAR(100)` | NO | - | "Myers-Briggs Type Indicator", "Big Five Personality" |
| `description` | `TEXT` | YES | `NULL` | - |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `psychotest_dimensions` (Skala & Dimensi Psikotes)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `test_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_types(id) CASCADE/CASCADE` |
| `dimension_code` | `VARCHAR(10)` | NO | - | `E`, `I`, `S`, `N`, `T`, `F`, `J`, `P`, `O`, `C`, `A`, `N` |
| `dimension_name` | `VARCHAR(100)` | NO | - | "Extraversion", "Introversion", dst |
| `pole_direction` | `ENUM` | YES | `NULL` | `'positive','negative'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `psychotest_questions` (Bank Soal Psikotes)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `test_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_types(id) CASCADE/CASCADE` |
| `dimension_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> psychotest_dimensions(id) SET NULL` |
| `question_number`| `SMALLINT UNSIGNED`| NO | - | - |
| `question_text` | `TEXT` | NO | - | Pernyataan butir soal |
| `option_a_text` | `VARCHAR(255)` | YES | `NULL` | Khusus opsi dikotomi MBTI |
| `option_a_value` | `VARCHAR(50)` | YES | `NULL` | - |
| `option_b_text` | `VARCHAR(255)` | YES | `NULL` | - |
| `option_b_value` | `VARCHAR(50)` | YES | `NULL` | - |
| `is_reversed` | `TINYINT(1)` | NO | `0` | Nilai skor terbalik |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `psychotest_type_profiles` (Profil Interpretasi Tipe Kepribadian)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `test_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_types(id) CASCADE/CASCADE` |
| `profile_code` | `VARCHAR(20)` | NO | - | e.g. `INTJ`, `ENFP`, `ESTJ` |
| `profile_name` | `VARCHAR(100)` | NO | - | e.g. "The Architect", "The Champion" |
| `strengths` | `TEXT` | YES | `NULL` | Kelebihan |
| `weaknesses` | `TEXT` | YES | `NULL` | Kekurangan |
| `suitable_roles`| `TEXT` | YES | `NULL` | Formasi jabatan yang cocok |
| `description` | `TEXT` | YES | `NULL` | Interpretasi psikologis |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `psychotest_sessions` (Sesi Pelaksanaan Ujian Psikotes)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `test_type_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_types(id) RESTRICT/CASCADE` |
| `target_type` | `ENUM` | NO | - | `'candidate','employee'` |
| `candidate_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> recruitment_candidates(id) CASCADE/CASCADE` |
| `employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> employees(id) CASCADE/CASCADE` |
| `token` | `VARCHAR(100)` | NO | - | `UNIQUE` (Akses pengerjaan publik) |
| `status` | `ENUM` | NO | `'scheduled'` | `'scheduled','in_progress','completed','evaluated'` |
| `started_at` | `DATETIME` | YES | `NULL` | - |
| `completed_at` | `DATETIME` | YES | `NULL` | - |
| `expires_at` | `DATETIME` | NO | - | Batas waktu sesi token |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `psychotest_answers` (Rekaman Jawaban Ujian)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `session_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_sessions(id) CASCADE/CASCADE` |
| `question_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_questions(id) CASCADE/CASCADE` |
| `answer_choice` | `VARCHAR(10)` | YES | `NULL` | - |
| `score_value` | `SMALLINT` | NO | - | Bobot nilai terhitung |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `uq_session_question (session_id, question_id)`

#### `psychotest_results` (Hasil Skor & Profil Kepribadian)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `session_id` | `BIGINT UNSIGNED` | NO | - | `FK -> psychotest_sessions(id) CASCADE/CASCADE` (`UNIQUE`) |
| `test_type_id` | `BIGINT UNSIGNED` | NO | - | - |
| `candidate_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `result_code` | `VARCHAR(50)` | NO | - | e.g. `INTJ` atau rekap OCEAN |
| `scores_breakdown`| `JSON` | NO | - | Rincian skor per dimensi |
| `recommendation` | `TEXT` | YES | `NULL` | Rekomendasi HRD |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

## 3. Kontrak API Ringkas (`/api/v1/kepegawaian`)

### 3.1 Data Induk Pegawai & Status
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/employees` | `kepegawaian.employees.view` | Query: `?status=&employment_status_id=&school_unit_id=&search=&page=&limit=` | `{ employees: array, pagination: object }` |
| `POST` | `/employees` | `kepegawaian.employees.manage` | `{ full_name: string, gender: string, join_date: string, base_salary?: number, employment_status_id?: number, current_position_id?: number, satuan_pendidikan_id?: number, ...subEntities }` | `{ id: number, full_name: string, nip: string }` |
| `GET` | `/employees/:id` | `authenticate` | - | `{ employee: object, addresses: array, educations: array, families: array, bank_accounts: array, documents: array }` |
| `PUT` | `/employees/:id` | `kepegawaian.employees.manage` | `{ full_name: string, phone_number?: string, base_salary?: number, ...bioFields }` | `{ id: number, updated: boolean }` |
| `PATCH` | `/employees/:id/status` | `kepegawaian.employees.manage` | `{ account_status: 'active'\|'non-active'\|'terminated'\|'retired', reason: string, effective_date?: string }` | `{ id: number, account_status: string }` |
| `GET` | `/employees/:id/status-history`| `kepegawaian.employees.view` | - | `{ history: array }` |
| `PUT` | `/employees/me/profile` | `authenticate` | `{ phone_number?: string, email?: string, addresses?: array }` | `{ success: boolean }` |
| `GET` | `/employment-statuses` | `authenticate` | - | `{ statuses: array }` |
| `POST` | `/employment-statuses` | `kepegawaian.employees.manage` | `{ code: string, name: string, category: string, description?: string, sort_order?: number }` | `{ id: number }` |

### 3.2 Sub-Entitas Pegawai (Pendidikan, Keluarga, Rekening Bank)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/employees/:id/educations` | `authenticate` | - | `{ educations: array }` |
| `POST` | `/employees/:id/educations` | `kepegawaian.employee_details.manage` | `{ record_type: string, institution_name: string, degree_or_title?: string, graduation_year?: number }` | `{ id: number }` |
| `GET` | `/employees/:id/families` | `authenticate` | - | `{ families: array }` |
| `POST` | `/employees/:id/families` | `kepegawaian.employee_details.manage` | `{ name: string, relationship: string, birth_date?: string, is_covered_insurance?: boolean }` | `{ id: number }` |
| `GET` | `/employees/:id/bank-accounts`| `authenticate` | - | `{ bank_accounts: array }` |
| `POST` | `/employees/:id/bank-accounts`| `kepegawaian.employee_bank_accounts.manage` | `{ bank_name: string, account_number: string, account_holder_name: string, bank_id?: string }` | `{ id: number }` |
| `GET` | `/employees/:id/document-checklists`| `authenticate` | - | `{ documents: array }` |
| `PUT` | `/employees/:id/document-checklists`| `kepegawaian.employee_details.manage` | `{ items: array<{ document_name: string, status: string, file_url?: string, notes?: string }> }` | `{ success: boolean }` |

### 3.3 Struktur Organisasi, Mutasi & DUK Pangkat
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/duk-pangkat` | `kepegawaian.statistics.view` | Query: `?school_unit_id=` | `{ duk: array }` |
| `GET` | `/job-positions/tree` | `authenticate` | Query: `?school_unit_id=` | `{ tree: array }` |
| `GET` | `/job-positions` | `authenticate` | - | `{ positions: array }` |
| `POST` | `/job-positions` | `kepegawaian.job_positions.manage` | `{ name: string, level: number, parent_id?: number, satuan_pendidikan_id?: number }` | `{ id: number }` |
| `GET` | `/employees/:id/mutations` | `authenticate` | - | `{ mutations: array }` |
| `POST` | `/employees/:id/mutations` | `kepegawaian.job_positions.manage` | `{ to_school_unit_id: number, mutation_date: string, reason?: string, sk_number?: string }` | `{ id: number }` |

### 3.4 Presensi, Cuti & Lembur
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/attendances` | `authenticate` | Query: `?employee_id=&start_date=&end_date=` | `{ attendances: array }` |
| `POST` | `/attendances/check-in` | `authenticate` | `{ latitude?: number, longitude?: number, selfie_url?: string }` | `{ id: number, check_in: string }` |
| `PATCH` | `/attendances/:id/check-out` | `authenticate` | `{ latitude?: number, longitude?: number }` | `{ id: number, check_out: string }` |
| `GET` | `/leave-requests` | `authenticate` | Query: `?employee_id=&status=` | `{ leave_requests: array }` |
| `POST` | `/leave-requests` | `authenticate` | `{ start_date: string, end_date: string, leave_type: string, reason: string, attachment_url?: string }` | `{ id: number }` |
| `PATCH` | `/leave-requests/:id/approve`| `kepegawaian.leave_requests.manage` | - | `{ id: number, status: 'approved' }` |
| `GET` | `/overtimes` | `authenticate` | Query: `?employee_id=&status=` | `{ overtimes: array }` |
| `POST` | `/overtimes` | `authenticate` | `{ overtime_date: string, start_time: string, end_time: string, duration_hours: number, reason: string }` | `{ id: number }` |
| `PATCH` | `/overtimes/:id/approve` | `kepegawaian.overtimes.manage` | - | `{ id: number, status: 'approved' }` |

### 3.5 Penggajian & Penilaian Kinerja
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `POST` | `/payroll/periods` | `kepegawaian.payroll.manage` | `{ name: string, start_date: string, end_date: string, payment_date: string, satuan_pendidikan_id: number }` | `{ id: number }` |
| `POST` | `/payroll/periods/:id/calculate`| `kepegawaian.payroll.manage`| - | `{ processed_count: number }` |
| `GET` | `/payroll/periods/:id/items` | `authenticate` | - | `{ items: array<{ employee_name, base_salary, allowances, deductions, net_salary, status }> }` |
| `PATCH` | `/payroll/items/:id/verify` | `kepegawaian.payroll.manage` | - | `{ id: number, status: 'verified' }` |
| `GET` | `/performance-reviews` | `authenticate` | Query: `?year=&employee_id=` | `{ reviews: array }` |
| `POST` | `/performance-reviews` | `kepegawaian.performance_reviews.manage` | `{ employee_id: number, period_year: number, period_semester: number, score: number, grade: string, notes?: string }` | `{ id: number }` |
| `GET` | `/statistics` | `kepegawaian.statistics.view` | - | `{ gender_stats: object, status_stats: object, rank_stats: object }` |

### 3.6 Rekrutmen & Tes Psikologi (MBTI & Big Five OCEAN)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/recruitment-candidates` | `kepegawaian.recruitment.manage` | Query: `?stage=&position_id=` | `{ candidates: array }` |
| `POST` | `/recruitment-candidates` | `kepegawaian.recruitment.manage` | `{ full_name: string, email: string, phone_number: string, recruitment_position_id: number, cv_url?: string }` | `{ id: number }` |
| `PATCH` | `/recruitment-candidates/:id/stage`| `kepegawaian.recruitment.manage` | `{ stage: string }` | `{ id: number, current_stage: string }` |
| `POST` | `/recruitment-candidates/:id/activate`| `kepegawaian.recruitment.manage` | `{ base_salary: number, employment_status_id: number, current_position_id: number, satuan_pendidikan_id: number }` | `{ employee_id: number, core_user_id: number }` |
| `GET` | `/psychotest/public/:token/questions`| Publik (Token Ujian) | - | `{ session: object, test_type: object, questions: array }` |
| `POST` | `/psychotest/public/:token/submit` | Publik (Token Ujian) | `{ answers: array<{ question_id: number, answer_choice?: string, score_value: number }> }` | `{ session_id: number, result_code: string, recommendation: string }` |
| `GET` | `/psychotest/sessions` | `kepegawaian.psychotest_sessions.manage` | Query: `?target_type=&status=` | `{ sessions: array }` |
| `POST` | `/psychotest/sessions` | `kepegawaian.psychotest_sessions.manage` | `{ test_type_id: number, target_type: 'candidate'\|'employee', candidate_id?: number, employee_id?: number, expires_at: string }` | `{ id: number, token: string, test_url: string }` |
| `GET` | `/psychotest/sessions/:id` | `kepegawaian.psychotest_sessions.manage` | - | `{ session: object, result: object, answers: array }` |
| `GET` | `/psychotest/reports/summary`| `kepegawaian.psychotest_sessions.manage` | - | `{ type_distribution: object, total_tested: number }` |

### 3.7 Endpoint Internal (Service-to-Service via `X-API-Key`)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/internal/employees` | `X-API-Key` | Query: `?satuan_pendidikan_id=&account_status=active` | `{ employees: array<{ id, full_name, nip, current_position_id, position_name, phone_number, email }> }` |
| `GET` | `/internal/employees/:id` | `X-API-Key` | - | `{ id, full_name, nip, bank_accounts: array, current_position: object }` |
| `GET` | `/internal/job-positions/tree`| `X-API-Key` | - | `{ tree: array }` |

---

## 4. Workflows & State Machines

- **Recruitment Multi-Stage Pipeline:** `administrasi -> tes_psikotes (generate token) -> wawancara -> microteaching -> penawaran -> diterima` -> `activate` *(otomatis membuat entri di `employees` dan user login di `core.users`)* OR `ditolak`.
- **Psychotest Session Execution:** `scheduled -> in_progress (dibuka peserta) -> completed (submit) -> evaluated (skor terhitung otomatis)`.
- **Employee Status Lifecycle:** `active <-> non-active / terminated / retired` *(mencatat alasan audit di `employee_account_status_logs`)*.
- **Leave / Overtime Approval:** `pending -> approved` *(cuti disetujui otomatis sinkron ke kalkulasi kehadiran)* OR `pending -> rejected`.
- **Payroll Disbursement Lifecycle:** `draft -> calculating (hitung tunjangan/potongan) -> verified (HRD lock) -> disbursement/pembukuan di Keuangan`.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/kepegawaian/login` | `src/apps/kepegawaian/pages/Login.jsx` | Login form staf HRD & kepegawaian |
| `/kepegawaian/dashboard` | `src/apps/kepegawaian/pages/Dashboard.jsx` | Statistik pegawai, permohonan cuti pending & DUK singkat |
| `/kepegawaian/employees` *(alias: `/kepegawaian/pegawai`)* | `src/apps/kepegawaian/pages/DataPegawai.jsx` | Master data pegawai, filter unit/status/golongan, wizard input pegawai |
| `/kepegawaian/employees/:id` *(alias: `/kepegawaian/pegawai/:id`)* | `src/apps/kepegawaian/pages/DetailPegawai.jsx` | Profil 360° pegawai: biodata, keluarga, riwayat karir, rekening bank & berkas |
| `/kepegawaian/employment-statuses` | `src/apps/kepegawaian/pages/MasterStatusKepegawaian.jsx` | Master status kepegawaian dinamis (GTY, PTY, GTT, Honorer) |
| `/kepegawaian/organization` *(alias: `/kepegawaian/organisasi`)* | `src/apps/kepegawaian/pages/StrukturOrganisasi.jsx` | Diagram pohon jabatan organisasi & DUK Pangkat |
| `/kepegawaian/attendance` *(alias: `/kepegawaian/presensi`)* | `src/apps/kepegawaian/pages/Presensi.jsx` | Monitoring presensi GPS pegawai & rekap ketidakhadiran |
| `/kepegawaian/leaves-overtimes` | `src/apps/kepegawaian/pages/CutiLembur.jsx` | Panel approval pengajuan cuti, izin & verifikasi lembur |
| `/kepegawaian/payroll` | `src/apps/kepegawaian/pages/Payroll.jsx` | Pembuatan periode cut-off penggajian & verifikasi slip gaji |
| `/kepegawaian/performance` *(alias: `/kepegawaian/kinerja`)* | `src/apps/kepegawaian/pages/PenilaianKinerja.jsx` | Evaluasi SKP tahunan & grafik statistik SDM |
| `/kepegawaian/recruitment` *(alias: `/kepegawaian/rekrutmen`)* | `src/apps/kepegawaian/pages/Rekrutmen.jsx` | Pipeline rekrutmen pelamar, interview, microteaching & aktivasi pegawai |
| `/kepegawaian/psikotes/bank-soal` | `src/apps/kepegawaian/pages/psikotes/BankSoal.jsx` | Pengelolaan bank instrumen MBTI & Big Five OCEAN |
| `/kepegawaian/psikotes/sesi` | `src/apps/kepegawaian/pages/psikotes/DaftarSesi.jsx` | Generate token ujian psikotes kandidat & jadwal sesi |
| `/kepegawaian/psikotes/laporan/:id`| `src/apps/kepegawaian/pages/psikotes/LaporanHasil.jsx` | Laporan interpretasi radar kepribadian & rekomendasi HRD |
| `/kepegawaian/psikotes/saya` | `src/apps/kepegawaian/pages/psikotes/IsiTesKaryawan.jsx` | Portal self-service tes psikologi pegawai internal |
| `/kepegawaian/psikotes/isi/:token` | `src/apps/kepegawaian/pages/psikotes/IsiTesPublik.jsx` | Halaman pengerjaan tes psikotes pelamar umum (tanpa login) |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi JWT SSO lokal, penarikan data Satuan Pendidikan & Yayasan, pembuatan akun pengguna login otomatis saat pelamar diaktivasi (`POST /api/v1/core/internal/users`), pengiriman audit log ke Core (`POST /api/v1/core/internal/activity-logs`).
- **Modul yang Memanggil Kepegawaian (Consumers):**
  - `akademik`: Data guru pengajar, wali kelas, guru BK, pembina ekskul (`GET /api/v1/kepegawaian/internal/employees`).
  - `keuangan`: Mengambil data master gaji pokok, rekening bank, dan daftar slip gaji periode untuk realisasi pembayaran payroll.
  - `sarpras`: Penanggung jawab ruangan/fasilitas dan peminjam aset inventaris sekolah.
  - `dapur`: Data staf juru masak & pengawas logistik makanan.
  - `perpustakaan`: Data pustakawan & pendaftaran kartu anggota guru perpustakaan.
  - `alquran`: Data ustadz pembina setoran hafalan & penguji munaqasyah.
  - `manajemen`: Agregat statistik SDM, DUK Pangkat, dan evaluasi kinerja untuk monitoring mutu yayasan.
  - `website-utama`: Menampilkan direktori profil guru & pimpinan sekolah di website publik.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Perluasan Skema dari Dokumen Awal (`erd-kepegawaian.md`):** Dokumen rancangan awal merancang 16 tabel. Implementasi aktual Knex berkembang menjadi **33 tabel** dengan penambahan modul evaluasi psikotes online (MBTI & Big Five OCEAN), master status kepegawaian dinamis (`employment_statuses`), relasi 1:N lengkap (publikasi ilmiah, pengalaman kerja, organisasi, surat peringatan, multi-rekening bank), dan log mutasi status akun.
2. **Face Recognition Anti-Spoofing:** Presensi selfie saat ini mengandalkan geolocation koordinat GPS radius sekolah dan upload foto, modul computer vision face-matching otomatis masih bersifat opsional/future roadmap.
3. **Sinkronisasi Otomatis Slip Gaji ke Modul Keuangan:** Penguncian periode payroll (`locked`) saat ini memerlukan trigger approval manual di Keuangan untuk pencairan kas/jurnal akuntansi disbursement.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
