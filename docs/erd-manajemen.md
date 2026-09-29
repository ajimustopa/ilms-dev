Status: perlu-revisi
Diperbarui: 2026-08-31

# erd-manajemen.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 (prinsip arsitektur global) & `rancangan-manajemen.md`
> Bagian 4–5 (ruang lingkup 13 fitur & keputusan terbuka).
> Database: MariaDB 10.5. Query builder: Knex.js. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`,
> semua tabel punya `created_at`/`updated_at TIMESTAMP` (tidak ditulis ulang di tiap tabel di
> bawah supaya ringkas — anggap ada di semua tabel kecuali tabel log yang disebutkan
> *append-only*).
>
> **Status: DRAF — belum final.** ERD ini dibangun dari kolom yang *diusulkan* di
> `rancangan-manajemen.md` §4 (banyak fitur tidak punya kolom asli dari PRD), dan beberapa
> keputusan arsitektur (§5 `rancangan-manajemen.md`) masih terbuka. **Jangan dianggap final
> sampai keputusan terbuka itu dijawab developer** — terutama Bagian 0 poin 2, 3, 4 di bawah,
> yang mempengaruhi bentuk tabel secara langsung.

## 0. Keputusan yang Masih Terbuka & Asumsi Sementara ERD Ini

Berbeda dari `erd-coreservice.md` yang dibuat setelah semua keputusan terbuka final, ERD ini
**masih mengandung asumsi sementara** supaya pengembangan bisa mulai — tandai dan konfirmasi
sebelum migration Tahap 2 dijalankan ke database sungguhan:

| # | Poin Terbuka (`rancangan-manajemen.md` §5) | Asumsi Sementara di ERD Ini | Yang Berubah Kalau Asumsi Salah |
|---|---|---|---|
| 1 | Arah konsumsi balik ke Kepegawaian (fitur #194) | Kepegawaian **query langsung** ke service-layer `employee-performance-evaluations` milik Manajemen (in-process) — tidak ada tabel event/webhook tambahan di Manajemen | Kalau ternyata perlu event terpisah, tambah tabel `performance_evaluation_events` (mirip `webhook_events` Core) |
| 2 | Sumber data KPI & Dashboard Agregat (#193, #201) | **Snapshot berkala** — tabel `quality_indicator_achievements` diisi manual/terjadwal per periode, `cross_app_dashboard_snapshots` diisi job (bukan query real-time on-the-fly) | Kalau ternyata real-time, `cross_app_dashboard_snapshots` bisa dihapus dan diganti view/agregasi langsung di service-layer |
| 3 | Sumber data Evadir & Akreditasi (#195, #196) | **Input manual** oleh Tim Mutu (upload bukti + skor per komponen/standar), tidak ada tarikan otomatis dari Akademik/Sarpras/Kepegawaian | Kalau perlu integrasi otomatis, tambah kolom `source_module` + `source_reference_id` di `accreditation_evidences` |
| 4 | Granularitas approval workflow (#200) | Workflow didefinisikan **manual per jenis pengajuan** (`approval_workflows` + `approval_steps` menunjuk `approver_job_position_id`), bukan otomatis dari hierarki `job_positions.level` | Kalau berbasis hierarki otomatis, `approval_steps.approver_job_position_id` bisa diganti logika baca `job_positions.level` langsung tanpa tabel step manual |
| 5 | Target polymorphic approval/task/project | Dipakai kolom generik `reference_type` + `reference_id` (pola sama seperti `ref_type`/`ref_id` di `users` Core Service) pada `approval_requests` dan `tasks` | Kalau approval dibatasi objek internal saja, kolom ini bisa diganti FK internal langsung ke `projects`/`work_plan_programs` |
| 6 | Cakupan dashboard agregat (#201) | Tabel `cross_app_dashboard_snapshots` dibuat generik (`metrics JSON`) supaya gampang menambah sumber modul baru tanpa migration baru | — |

**Penamaan:** seluruh nama tabel dan kolom di ERD ini memakai **Bahasa Inggris, `snake_case`**,
konsisten dengan `erd-coreservice.md`. Istilah asli Indonesia dari PRD dicatat sebagai referensi
di kolom "Asal PRD" tiap tabel.

## 1. Daftar Entitas Fondasi & Eksisting Pasca-Rombak

### 1.1 Tabel Fondasi Bersama Baru (5 Tabel)
| Kategori | Tabel | `school_unit_id`? | Keterangan |
|---|---|---|---|
| Master Domain RIPS | `rips_domains` | Tidak (Yayasan) | Bidang master custom RIPS (`id, name, order_index, timestamps`) |
| Master Domain RIPS | `rips_subdomains` | Tidak (Yayasan) | Sub-bidang master custom (`id, domain_id FK, name, order_index, timestamps`) |
| Master Balanced Scorecard | `bsc_aspects` | Tidak (Yayasan) | Aspek BSC (`Finansial`, `Pelanggan & Stakeholder`, `Proses Bisnis Internal`, `Pembelajaran & Pertumbuhan`) |
| Master Kepanitiaan | `committee_position_types` | Tidak (Yayasan) | Jenis jabatan kepanitiaan (`Penanggung Jawab`, `Ketua`, `Wakil Ketua`, `Sekretaris`, `Bendahara`, `Koordinator`, `Anggota`) |
| Penerbitan & Versioning | `document_publications` | Ya (Nullable = Yayasan) | Versioning generik penerbitan dokumen (`rips`, `rkjp`, `rkjm`, `rkt`, `evadir`) dengan snapshot JSON & SK |

### 1.2 Tabel yang DIHAPUS (Legacy yang di-drop total)
1. `institution_development_plans`
2. `strategic_goals`
3. `school_work_plans`
4. `work_plan_programs`
5. `work_plan_activities` (akan dibuat ulang dengan skema baru)
6. `quality_indicators`
7. `quality_indicator_achievements`
8. `quality_goals`
9. `self_evaluations` (digantikan EVADIR baru)

### 1.3 Tabel Eksisting yang DIPERTAHANKAN
- `evaluation_follow_ups` (RTL) — source_type: `evadir`, `kpi`, `program`, `activity`, `risk`, dll.
- `accreditation_reports`, `accreditation_evidences`
- `school_risks`
- `employee_performance_evaluations`, `employee_performance_evaluation_criteria`
- `supervision_schedules`, `supervision_results`
- `planning_agendas`, `user_notifications`
- `cross_app_dashboard_snapshots`
- `approval_workflows`, `approval_steps`, `approval_requests`, `approval_actions`
- `projects`, `project_members`, `tasks`, `task_comments`, `task_checklists`

## 2. Detail Tabel

### 2.1 `institution_development_plans`
*(Fitur #190 — RIPS)* — Asal PRD: RIPS (Rencana Induk Pengembangan Sekolah)

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi ke `school_units.id` milik **Core Service**, bukan FK fisik |
| title | VARCHAR(200) | NOT NULL |
| period_start_year | SMALLINT UNSIGNED | NOT NULL |
| period_end_year | SMALLINT UNSIGNED | NOT NULL |
| vision | TEXT | NULLABLE |
| mission | TEXT | NULLABLE |
| document_url | VARCHAR(255) | NULLABLE — dokumen RIPS lengkap (PDF, dsb) |
| status | ENUM('draft','active','archived') | NOT NULL, DEFAULT 'draft' |
| created_by | BIGINT UNSIGNED | NOT NULL — referensi `users.id` **Core Service** |
| approved_by | BIGINT UNSIGNED | NULLABLE — referensi `users.id` **Core Service** |
| approved_at | TIMESTAMP | NULLABLE |

### 2.2 `school_work_plans`
*(Fitur #191 — RKS tahunan)* — Asal PRD: RKS, dasar penyusunan RKAS

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| institution_development_plan_id | BIGINT UNSIGNED | NULLABLE — referensi internal ke `institution_development_plans.id` (RKS turunan RIPS mana) |
| academic_year_id | BIGINT UNSIGNED | NULLABLE — referensi `academic_years.id` milik **Akademik**, bukan FK fisik |
| title | VARCHAR(200) | NOT NULL |
| program_focus | TEXT | NULLABLE |
| budget_ceiling_reference | VARCHAR(100) | NULLABLE — nomor/referensi dokumen plafon anggaran di **Keuangan** (RKAS), bukan angka nominal (lihat `rancangan-manajemen.md` §6 — anggaran domain Keuangan) |
| status | ENUM('draft','submitted','approved','archived') | NOT NULL, DEFAULT 'draft' |
| created_by | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| approved_by | BIGINT UNSIGNED | NULLABLE — referensi **Core Service** |
| approved_at | TIMESTAMP | NULLABLE |

### 2.3 `work_plan_programs`
*(Fitur #192 — Program Kerja per unit/bidang)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_work_plan_id | BIGINT UNSIGNED | NULLABLE — referensi internal ke `school_work_plans.id` (program ini bagian dari RKS mana, boleh kosong kalau program kerja unit berdiri sendiri) |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| unit_name | VARCHAR(150) | NOT NULL — nama unit/bidang (mis. "Kurikulum", "Kesiswaan") |
| pic_employee_id | BIGINT UNSIGNED | NOT NULL — Kepala Unit, referensi `employees.id` milik **Kepegawaian** |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NULLABLE |
| target | TEXT | NULLABLE |
| budget_estimate_reference | VARCHAR(100) | NULLABLE — referensi dokumen anggaran di **Keuangan**, bukan nominal |
| status | ENUM('planned','ongoing','done','cancelled') | NOT NULL, DEFAULT 'planned' |
| start_date | DATE | NULLABLE |
| end_date | DATE | NULLABLE |

### 2.4 `quality_indicators`
*(Pendukung Fitur #193 — Dashboard KPI & Indikator Mutu)*
Definisi indikator — mirip `roles`/`permissions` Core Service, sifatnya master data ringan.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — NULL berarti indikator berlaku yayasan-wide, referensi **Core Service** |
| code | VARCHAR(50) | NOT NULL, UNIQUE |
| name | VARCHAR(200) | NOT NULL |
| category | ENUM('akademik','keuangan','kepegawaian','sarpras','lainnya') | NOT NULL |
| unit_of_measure | VARCHAR(50) | NULLABLE — mis. "%", "orang", "poin" |
| target_value | DECIMAL(12,2) | NULLABLE |
| data_source_module | VARCHAR(50) | NULLABLE — nama modul sumber data (mis. `akademik`), dokumentasi saja, bukan FK |

### 2.5 `quality_indicator_achievements`
*(Fitur #193)* — Keputusan Terbuka #2: snapshot per periode, bukan real-time.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| quality_indicator_id | BIGINT UNSIGNED | FK internal → `quality_indicators.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| period | VARCHAR(20) | NOT NULL — mis. `2026-Q2`, `2026-08` |
| actual_value | DECIMAL(12,2) | NOT NULL |
| recorded_by | BIGINT UNSIGNED | NOT NULL — referensi `users.id` **Core Service** |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

`UNIQUE (quality_indicator_id, school_unit_id, period)`.

### 2.6 `self_evaluations`
*(Fitur #195 — Evadir)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| period_year | SMALLINT UNSIGNED | NOT NULL |
| standard_component | VARCHAR(150) | NOT NULL — komponen standar yang dievaluasi (mis. mengacu 8 SNP) |
| score | DECIMAL(5,2) | NULLABLE |
| notes | TEXT | NULLABLE |
| status | ENUM('draft','submitted','reviewed') | NOT NULL, DEFAULT 'draft' |
| submitted_by | BIGINT UNSIGNED | NULLABLE — referensi **Core Service** |
| submitted_at | TIMESTAMP | NULLABLE |

### 2.7 `accreditation_reports`
*(Fitur #196 — Laporan akreditasi & instrumen mutu)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| accreditation_year | SMALLINT UNSIGNED | NOT NULL |
| standard_code | VARCHAR(50) | NOT NULL — kode standar/instrumen akreditasi |
| description | TEXT | NULLABLE |

### 2.8 `accreditation_evidences`
*(Fitur #196, kolom asli PRD: standar, bukti, skor)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| accreditation_report_id | BIGINT UNSIGNED | FK internal → `accreditation_reports.id`, NOT NULL |
| evidence_description | TEXT | NOT NULL — bukti |
| file_url | VARCHAR(255) | NULLABLE |
| score | DECIMAL(5,2) | NULLABLE — skor |
| verified_by | BIGINT UNSIGNED | NULLABLE — referensi **Core Service** |
| verified_at | TIMESTAMP | NULLABLE |

### 2.9 `cross_app_dashboard_snapshots`
*(Fitur #201 — Dashboard agregat lintas aplikasi)* — Keputusan Terbuka #2 & #6: snapshot
berkala, skema generik.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — NULL berarti agregat level yayasan |
| snapshot_date | DATE | NOT NULL |
| metrics | JSON | NOT NULL — struktur bebas per sumber modul, mis. `{"akademik": {...}, "kepegawaian": {...}}` |
| generated_by | VARCHAR(50) | NOT NULL, DEFAULT 'system' — `system` (job terjadwal) atau `user_id` kalau dipicu manual |

`UNIQUE (school_unit_id, snapshot_date)`.

### 2.10 `school_risks`
*(Fitur #202 — Manajemen risiko/isu sekolah)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| title | VARCHAR(200) | NOT NULL |
| category | VARCHAR(100) | NULLABLE |
| description | TEXT | NULLABLE |
| likelihood | ENUM('low','medium','high') | NULLABLE |
| impact | ENUM('low','medium','high') | NULLABLE |
| status | ENUM('identified','mitigating','resolved','closed') | NOT NULL, DEFAULT 'identified' |
| mitigation_plan | TEXT | NULLABLE |
| owner_employee_id | BIGINT UNSIGNED | NULLABLE — referensi `employees.id` **Kepegawaian** |
| identified_at | DATE | NOT NULL |
| resolved_at | DATE | NULLABLE |

### 2.11 `employee_performance_evaluations`
*(Fitur #194 — Evaluasi Kinerja pegawai mendalam)* — Keputusan Terbuka #1.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| base_performance_review_id | BIGINT UNSIGNED | NULLABLE — referensi `performance_reviews.id` milik **Kepegawaian** (penilaian dasar sebagai bahan) |
| evaluator_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** (atasan/HRD penilai) |
| period | VARCHAR(20) | NOT NULL — mis. `2026-S1` |
| total_score | DECIMAL(5,2) | NULLABLE |
| category | ENUM('sangat_baik','baik','cukup','kurang') | NULLABLE |
| status | ENUM('draft','submitted','approved') | NOT NULL, DEFAULT 'draft' |
| notes | TEXT | NULLABLE |

`UNIQUE (employee_id, period)`.

### 2.12 `employee_performance_evaluation_criteria`
*(Fitur #194)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| employee_performance_evaluation_id | BIGINT UNSIGNED | FK internal → `employee_performance_evaluations.id`, NOT NULL |
| criteria_name | VARCHAR(150) | NOT NULL |
| weight | DECIMAL(5,2) | NULLABLE — bobot kriteria (%) |
| score | DECIMAL(5,2) | NULLABLE |
| notes | TEXT | NULLABLE |

### 2.13 `supervision_schedules`
*(Fitur #197 — Supervisi akademik & manajerial)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| supervisor_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| supervised_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** (guru/pegawai yang disupervisi) |
| supervision_type | ENUM('akademik','manajerial') | NOT NULL |
| class_group_id | BIGINT UNSIGNED | NULLABLE — referensi `class_groups.id` **Akademik**, relevan untuk supervisi akademik |
| scheduled_date | DATE | NOT NULL |
| status | ENUM('scheduled','done','cancelled') | NOT NULL, DEFAULT 'scheduled' |

### 2.14 `supervision_results`
*(Fitur #197)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| supervision_schedule_id | BIGINT UNSIGNED | FK internal → `supervision_schedules.id`, NOT NULL |
| aspect | VARCHAR(150) | NOT NULL — aspek yang dinilai |
| score | DECIMAL(5,2) | NULLABLE |
| findings | TEXT | NULLABLE |
| recommendations | TEXT | NULLABLE |

### 2.15 `projects`
*(Fitur #199 — Manajemen proyek/kegiatan sekolah)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| name | VARCHAR(200) | NOT NULL |
| description | TEXT | NULLABLE |
| pic_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| budget_reference | VARCHAR(100) | NULLABLE — referensi dokumen anggaran **Keuangan**, bukan nominal |
| start_date | DATE | NULLABLE |
| end_date | DATE | NULLABLE |
| status | ENUM('planning','ongoing','completed','cancelled') | NOT NULL, DEFAULT 'planning' |

### 2.16 `project_members`
*(Fitur #199)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| project_id | BIGINT UNSIGNED | FK internal → `projects.id`, NOT NULL |
| employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| role_in_project | VARCHAR(100) | NULLABLE |

`UNIQUE (project_id, employee_id)`.

### 2.17 `tasks`
*(Fitur #198 — Pelacakan tugas)* — Keputusan Terbuka #5: kolom polymorphic generik.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| project_id | BIGINT UNSIGNED | NULLABLE — FK internal → `projects.id` (task ini bagian dari proyek mana, boleh kosong untuk task berdiri sendiri) |
| reference_type | VARCHAR(50) | NULLABLE — mis. `work_plan_program`, kosong kalau task berdiri sendiri/bagian proyek |
| reference_id | BIGINT UNSIGNED | NULLABLE — ID entitas terkait sesuai `reference_type` |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NULLABLE |
| assignee_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| created_by | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| priority | ENUM('low','medium','high') | NOT NULL, DEFAULT 'medium' |
| status | ENUM('todo','in_progress','done','cancelled') | NOT NULL, DEFAULT 'todo' |
| due_date | DATE | NULLABLE |

### 2.18 `task_comments`
*(Fitur #198, pendukung — append-only, tidak ada `updated_at`)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| task_id | BIGINT UNSIGNED | FK internal → `tasks.id`, NOT NULL |
| employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| comment | TEXT | NOT NULL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.19 `approval_workflows`
*(Fitur #200 — definisi workflow)* — Keputusan Terbuka #4: didefinisikan manual.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — NULL berarti berlaku semua satuan |
| name | VARCHAR(150) | NOT NULL |
| applies_to | VARCHAR(50) | NOT NULL — mis. `project`, `work_plan_program`, dokumentasi saja bukan FK |
| description | TEXT | NULLABLE |

### 2.20 `approval_steps`
*(Fitur #200 — jenjang persetujuan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| approval_workflow_id | BIGINT UNSIGNED | FK internal → `approval_workflows.id`, NOT NULL |
| step_order | SMALLINT UNSIGNED | NOT NULL |
| approver_job_position_id | BIGINT UNSIGNED | NULLABLE — referensi `job_positions.id` **Kepegawaian** |
| approver_employee_id | BIGINT UNSIGNED | NULLABLE — alternatif kalau approver ditunjuk spesifik per orang, bukan per jabatan |

`UNIQUE (approval_workflow_id, step_order)`.

### 2.21 `approval_requests`
*(Fitur #200)* — Keputusan Terbuka #5: kolom polymorphic generik.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| approval_workflow_id | BIGINT UNSIGNED | FK internal → `approval_workflows.id`, NOT NULL |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — referensi **Core Service** |
| reference_type | VARCHAR(50) | NOT NULL — mis. `project`, `work_plan_program` |
| reference_id | BIGINT UNSIGNED | NOT NULL — ID entitas yang diajukan (internal Manajemen atau referensi modul lain) |
| requested_by_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| current_step | SMALLINT UNSIGNED | NOT NULL, DEFAULT 1 |
| status | ENUM('pending','approved','rejected') | NOT NULL, DEFAULT 'pending' |

### 2.22 `approval_actions`
*(Fitur #200 — log aksi per step, append-only)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| approval_request_id | BIGINT UNSIGNED | FK internal → `approval_requests.id`, NOT NULL |
| approval_step_id | BIGINT UNSIGNED | FK internal → `approval_steps.id`, NOT NULL |
| approver_employee_id | BIGINT UNSIGNED | NOT NULL — referensi `employees.id` **Kepegawaian** |
| action | ENUM('approved','rejected','returned') | NOT NULL |
| notes | TEXT | NULLABLE |
| acted_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

## 3. Ringkasan Referensi Lintas Modul (Tanpa FK Fisik)

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 3 poin 1 — semua kolom di bawah adalah **ID biasa**, bukan
`FOREIGN KEY` fisik lintas database:

| Kolom | Modul Sumber | Tabel Sumber |
|---|---|---|
| `school_unit_id` (di semua tabel relevan) | Core Service | `school_units` |
| `created_by`, `approved_by`, `submitted_by`, `recorded_by`, `verified_by` | Core Service | `users` |
| `employee_id`, `pic_employee_id`, `owner_employee_id`, `assignee_employee_id`, `evaluator_employee_id`, `supervisor_employee_id`, `supervised_employee_id`, `requested_by_employee_id`, `approver_employee_id` | Kepegawaian | `employees` |
| `base_performance_review_id` | Kepegawaian | `performance_reviews` |
| `approver_job_position_id` | Kepegawaian | `job_positions` |
| `academic_year_id` | Akademik | `academic_years` |
| `class_group_id` | Akademik | `class_groups` |
| `budget_ceiling_reference`, `budget_estimate_reference`, `budget_reference` | Keuangan | (referensi teks/nomor dokumen, bukan ID — Keuangan belum di dalam cakupan sesi ini) |

## 4. SQL Migration Mentah (Referensi — Implementasi Sebenarnya via Knex.js)

> Ditulis sebagai referensi cepat baca skema; implementasi sebenarnya tetap lewat file migration
> Knex.js satu tabel satu file, mengikuti pola `apps/api-backend/db/migrations/core/*.js` yang
> sudah ada. Urutan CREATE TABLE di bawah mengikuti urutan dependency FK internal (tabel anak
> setelah tabel induk).

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. institution_development_plans
CREATE TABLE institution_development_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  period_start_year SMALLINT UNSIGNED NOT NULL,
  period_end_year SMALLINT UNSIGNED NOT NULL,
  vision TEXT NULL,
  mission TEXT NULL,
  document_url VARCHAR(255) NULL,
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. school_work_plans
CREATE TABLE school_work_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  institution_development_plan_id BIGINT UNSIGNED NULL,
  academic_year_id BIGINT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  program_focus TEXT NULL,
  budget_ceiling_reference VARCHAR(100) NULL,
  status ENUM('draft','submitted','approved','archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_swp_idp FOREIGN KEY (institution_development_plan_id) REFERENCES institution_development_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. work_plan_programs
CREATE TABLE work_plan_programs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_work_plan_id BIGINT UNSIGNED NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  unit_name VARCHAR(150) NOT NULL,
  pic_employee_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  target TEXT NULL,
  budget_estimate_reference VARCHAR(100) NULL,
  status ENUM('planned','ongoing','done','cancelled') NOT NULL DEFAULT 'planned',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wpp_swp FOREIGN KEY (school_work_plan_id) REFERENCES school_work_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. quality_indicators
CREATE TABLE quality_indicators (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category ENUM('akademik','keuangan','kepegawaian','sarpras','lainnya') NOT NULL,
  unit_of_measure VARCHAR(50) NULL,
  target_value DECIMAL(12,2) NULL,
  data_source_module VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. quality_indicator_achievements
CREATE TABLE quality_indicator_achievements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quality_indicator_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  period VARCHAR(20) NOT NULL,
  actual_value DECIMAL(12,2) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_qia (quality_indicator_id, school_unit_id, period),
  CONSTRAINT fk_qia_indicator FOREIGN KEY (quality_indicator_id) REFERENCES quality_indicators(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. self_evaluations
CREATE TABLE self_evaluations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  period_year SMALLINT UNSIGNED NOT NULL,
  standard_component VARCHAR(150) NOT NULL,
  score DECIMAL(5,2) NULL,
  notes TEXT NULL,
  status ENUM('draft','submitted','reviewed') NOT NULL DEFAULT 'draft',
  submitted_by BIGINT UNSIGNED NULL,
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. accreditation_reports
CREATE TABLE accreditation_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  accreditation_year SMALLINT UNSIGNED NOT NULL,
  standard_code VARCHAR(50) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. accreditation_evidences
CREATE TABLE accreditation_evidences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  accreditation_report_id BIGINT UNSIGNED NOT NULL,
  evidence_description TEXT NOT NULL,
  file_url VARCHAR(255) NULL,
  score DECIMAL(5,2) NULL,
  verified_by BIGINT UNSIGNED NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ae_report FOREIGN KEY (accreditation_report_id) REFERENCES accreditation_reports(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. cross_app_dashboard_snapshots
CREATE TABLE cross_app_dashboard_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  snapshot_date DATE NOT NULL,
  metrics JSON NOT NULL,
  generated_by VARCHAR(50) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cads (school_unit_id, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. school_risks
CREATE TABLE school_risks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  likelihood ENUM('low','medium','high') NULL,
  impact ENUM('low','medium','high') NULL,
  status ENUM('identified','mitigating','resolved','closed') NOT NULL DEFAULT 'identified',
  mitigation_plan TEXT NULL,
  owner_employee_id BIGINT UNSIGNED NULL,
  identified_at DATE NOT NULL,
  resolved_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. employee_performance_evaluations
CREATE TABLE employee_performance_evaluations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  base_performance_review_id BIGINT UNSIGNED NULL,
  evaluator_employee_id BIGINT UNSIGNED NOT NULL,
  period VARCHAR(20) NOT NULL,
  total_score DECIMAL(5,2) NULL,
  category ENUM('sangat_baik','baik','cukup','kurang') NULL,
  status ENUM('draft','submitted','approved') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_epe (employee_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. employee_performance_evaluation_criteria
CREATE TABLE employee_performance_evaluation_criteria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_performance_evaluation_id BIGINT UNSIGNED NOT NULL,
  criteria_name VARCHAR(150) NOT NULL,
  weight DECIMAL(5,2) NULL,
  score DECIMAL(5,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_epec_eval FOREIGN KEY (employee_performance_evaluation_id) REFERENCES employee_performance_evaluations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. supervision_schedules
CREATE TABLE supervision_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  supervisor_employee_id BIGINT UNSIGNED NOT NULL,
  supervised_employee_id BIGINT UNSIGNED NOT NULL,
  supervision_type ENUM('akademik','manajerial') NOT NULL,
  class_group_id BIGINT UNSIGNED NULL,
  scheduled_date DATE NOT NULL,
  status ENUM('scheduled','done','cancelled') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. supervision_results
CREATE TABLE supervision_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supervision_schedule_id BIGINT UNSIGNED NOT NULL,
  aspect VARCHAR(150) NOT NULL,
  score DECIMAL(5,2) NULL,
  findings TEXT NULL,
  recommendations TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sr_schedule FOREIGN KEY (supervision_schedule_id) REFERENCES supervision_schedules(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. projects
CREATE TABLE projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  pic_employee_id BIGINT UNSIGNED NOT NULL,
  budget_reference VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('planning','ongoing','completed','cancelled') NOT NULL DEFAULT 'planning',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. project_members
CREATE TABLE project_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  role_in_project VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pm (project_id, employee_id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. tasks
CREATE TABLE tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  assignee_employee_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status ENUM('todo','in_progress','done','cancelled') NOT NULL DEFAULT 'todo',
  due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. task_comments
CREATE TABLE task_comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tc_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. approval_workflows
CREATE TABLE approval_workflows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  applies_to VARCHAR(50) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. approval_steps
CREATE TABLE approval_steps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  approval_workflow_id BIGINT UNSIGNED NOT NULL,
  step_order SMALLINT UNSIGNED NOT NULL,
  approver_job_position_id BIGINT UNSIGNED NULL,
  approver_employee_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_as (approval_workflow_id, step_order),
  CONSTRAINT fk_as_workflow FOREIGN KEY (approval_workflow_id) REFERENCES approval_workflows(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. approval_requests
CREATE TABLE approval_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  approval_workflow_id BIGINT UNSIGNED NOT NULL,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id BIGINT UNSIGNED NOT NULL,
  requested_by_employee_id BIGINT UNSIGNED NOT NULL,
  current_step SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ar_workflow FOREIGN KEY (approval_workflow_id) REFERENCES approval_workflows(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. approval_actions
CREATE TABLE approval_actions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  approval_request_id BIGINT UNSIGNED NOT NULL,
  approval_step_id BIGINT UNSIGNED NOT NULL,
  approver_employee_id BIGINT UNSIGNED NOT NULL,
  action ENUM('approved','rejected','returned') NOT NULL,
  notes TEXT NULL,
  acted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aa_request FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id),
  CONSTRAINT fk_aa_step FOREIGN KEY (approval_step_id) REFERENCES approval_steps(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

## 5. Seed Data Dummy (untuk pengujian lokal)

```sql
-- Asumsi school_unit_id = 1 dan 2 sudah ada di Core Service (lihat erd-coreservice.md §2 seed),
-- dan employee_id = 1 sudah ada di Kepegawaian (silakan sesuaikan dengan ID sungguhan di database
-- lokal Anda).

INSERT INTO institution_development_plans (school_unit_id, title, period_start_year, period_end_year, status, created_by)
VALUES (1, 'RIPS SD Contoh 1 2026-2030', 2026, 2030, 'draft', 1);

INSERT INTO school_work_plans (school_unit_id, title, status, created_by)
VALUES (1, 'RKS SD Contoh 1 Tahun 2026/2027', 'draft', 1);

INSERT INTO work_plan_programs (school_unit_id, unit_name, pic_employee_id, title, status)
VALUES (1, 'Kurikulum', 1, 'Penyusunan Silabus Tahun Ajaran Baru', 'planned');

INSERT INTO quality_indicators (school_unit_id, code, name, category, unit_of_measure, target_value, data_source_module)
VALUES (1, 'KPI-AKD-01', 'Rata-rata Nilai Ujian Akhir', 'akademik', 'poin', 80.00, 'akademik');

INSERT INTO school_risks (school_unit_id, title, category, likelihood, impact, status, identified_at)
VALUES (1, 'Keterlambatan renovasi gedung', 'sarpras', 'medium', 'high', 'identified', CURDATE());

INSERT INTO employee_performance_evaluations (employee_id, school_unit_id, evaluator_employee_id, period, status)
VALUES (1, 1, 1, '2026-S1', 'draft');

INSERT INTO projects (school_unit_id, name, pic_employee_id, status)
VALUES (1, 'Persiapan Akreditasi 2026', 1, 'planning');

INSERT INTO tasks (school_unit_id, project_id, title, assignee_employee_id, created_by, status)
VALUES (1, 1, 'Kumpulkan bukti dokumen standar 1', 1, 1, 'todo');

INSERT INTO approval_workflows (school_unit_id, name, applies_to)
VALUES (1, 'Approval Program Kerja Unit', 'work_plan_program');

INSERT INTO approval_steps (approval_workflow_id, step_order, approver_employee_id)
VALUES (1, 1, 1);
```

## 6. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-28 | **Migrasi Fondasi Rombak Besar:** Drop 9 tabel perencanaan & indikator mutu lama. Pembentukan 5 tabel fondasi bersama (`rips_domains`, `rips_subdomains`, `bsc_aspects`, `committee_position_types`, `document_publications`). |
| 2026-08-18 | Dokumen dibuat — 22 tabel, **status DRAF** menunggu 6 keputusan terbuka di Bagian 0 dikonfirmasi developer sebelum dianggap final untuk migration Tahap 2. |

*(Tambahkan baris baru di atas setiap ada perubahan skema — jangan hapus riwayat lama.)*
