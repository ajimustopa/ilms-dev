Status: perlu-revisi
Diperbarui: 2026-08-24

# erd-alquran.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 (prinsip arsitektur global) & `rancangan-alquran.md`
> Bagian 4–5 (ruang lingkup 6 fitur & keputusan terbuka).
> Database: MariaDB 10.5, storage engine InnoDB, charset `utf8mb4`. Query builder: Knex.js.
> PK default `id BIGINT UNSIGNED AUTO_INCREMENT`, semua tabel punya `created_at`/`updated_at
> TIMESTAMP` (tidak ditulis ulang di tiap tabel di bawah supaya ringkas — anggap ada di semua
> tabel).
>
> **Status: DRAF** — bergantung pada 6 keputusan terbuka di `rancangan-alquran.md` §5 yang belum
> dikonfirmasi developer. Tabel & tipe kolom di bawah adalah usulan awal berdasarkan pola
> `erd-coreservice.md`, **bukan final**. Jangan jalankan migration dari draf ini sebelum Bagian 0
> di bawah disetujui.

## 0. Poin Terbuka yang Perlu Dikonfirmasi Sebelum ERD Ini Final

Mengikuti pola `erd-coreservice.md` §0 (yang mencatat keputusan final atas poin terbuka di
`rancangan-coreservice.md` §5) — untuk modul ini, poin terbuka **belum** diputuskan, jadi ditulis
sebagai asumsi kerja sementara:

| # | Poin Terbuka (`rancangan-alquran.md` §5) | Asumsi Kerja Sementara di ERD Ini | Perlu Dikonfirmasi |
|---|---|---|---|
| 1 | Referensi ke siswa/kelas Akademik | Kolom ID polos tanpa FK fisik: `student_ref_id`, `class_ref_id` | Apakah cukup 1 kolom ID, atau perlu kolom tambahan |
| 2 | Granularitas periode target | Kombinasi `academic_period_ref_id` (nullable) + `period_label` (teks bebas) | Mana yang jadi sumber kebenaran kalau keduanya diisi |
| 3 | Skala nilai tajwid/ujian | `DECIMAL(5,2)` (asumsi skala numerik 0–100) | Skala final (numerik/predikat/lainnya) |
| 4 | Capaian vs Ujian — satu alur atau dua | **Dua tabel terpisah** (`hafalan_records` utk capaian harian, `munaqasyah_exams` utk ujian berkala) | Apakah asumsi pemisahan ini benar |
| 5 | Status kepegawaian Musyrif/penguji | Kolom ID polos `teacher_ref_id` merujuk pegawai di Kepegawaian, tanpa atribut "musyrif" khusus | Apakah perlu flag/role musyrif terpisah |
| 6 | Tabel untuk fitur Laporan | **Tidak ada tabel baru** — laporan hasil agregasi query dari `hafalan_targets` & `hafalan_records` | Apakah perlu tabel log/riwayat export |

**Penamaan:** seluruh nama tabel dan kolom memakai **Bahasa Inggris, `snake_case`**, konsisten
dengan `ARSITEKTUR-SISTEM.md` §4.4 dan pola `erd-coreservice.md`. Istilah asli Indonesia dari PRD
(`santri`, `juz`, `nilai_tajwid`, `munaqasyah`, dst) dicatat sebagai referensi arti di kolom
"Asal PRD"/deskripsi tiap tabel, bukan jadi nama kolom.

## 1. Daftar Entitas (4 Tabel)

| Modul (`rancangan-alquran.md` §4) | Tabel | `school_unit_id`? |
|---|---|---|
| Target | `hafalan_targets` | **Ya** |
| Capaian | `hafalan_records` | **Ya** |
| Ujian | `munaqasyah_exams` | **Ya** |
| Kurikulum | `kitab_kuning` | **Ya** |

> Fitur "Laporan" dan "Integrasi" tidak punya tabel sendiri (lihat Bagian 0 poin 6) — Laporan
> adalah agregasi query dari `hafalan_targets` & `hafalan_records`; Integrasi adalah endpoint API
> yang membaca data dari `hafalan_records` (lihat `api-contract-alquran.md`).

## 2. Detail Tabel

### 2.1 `hafalan_targets`
*(Fitur "Target & roadmap hafalan per kelas")*
Penetapan target hafalan (juz/halaman) per kelas/jenjang dan periode. **Tidak diinput manual
lintas database** — `class_ref_id` merujuk ke tabel rombel/kelas milik Akademik, divalidasi lewat
pemanggilan service-layer Akademik (in-process, sesuai `ARSITEKTUR-SISTEM.md` §1.1), bukan FK
fisik.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — merujuk `school_units.id` di Core Service, tanpa FK fisik |
| class_ref_id | BIGINT UNSIGNED | NOT NULL — merujuk data kelas/rombel di Akademik, tanpa FK fisik |
| academic_period_ref_id | BIGINT UNSIGNED | NULLABLE — merujuk tahun ajaran/semester di Akademik, tanpa FK fisik *(lihat Bagian 0 poin 2)* |
| period_label | VARCHAR(100) | NULLABLE — label periode bebas teks (fallback selama `academic_period_ref_id` belum final), asal PRD: `periode` |
| target_type | ENUM('juz','halaman') | NOT NULL — asal PRD: `target_juz/halaman` |
| target_value | INT UNSIGNED | NOT NULL — jumlah juz atau halaman target |
| notes | TEXT | NULLABLE |
| created_by_ref_id | BIGINT UNSIGNED | NULLABLE — `user_id` Core Service yang membuat/mengubah |

### 2.2 `hafalan_records`
*(Fitur "Input capaian hafalan santri")*
Pencatatan progres setoran hafalan tiap santri, diinput Musyrif dan diverifikasi.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| student_ref_id | BIGINT UNSIGNED | NOT NULL — merujuk data siswa/santri di Akademik, tanpa FK fisik. Asal PRD: `id_siswa` |
| juz | TINYINT UNSIGNED | NOT NULL |
| page_start | SMALLINT UNSIGNED | NULLABLE — asal PRD: `halaman` |
| page_end | SMALLINT UNSIGNED | NULLABLE |
| record_date | DATE | NOT NULL — asal PRD: `tanggal` |
| tajwid_score | DECIMAL(5,2) | NULLABLE — asal PRD: `nilai_tajwid` *(skala belum final, lihat Bagian 0 poin 3)* |
| verification_status | ENUM('pending','verified','rejected') | NOT NULL, DEFAULT 'pending' |
| recorded_by_teacher_ref_id | BIGINT UNSIGNED | NOT NULL — Musyrif yang input, merujuk pegawai di Kepegawaian |
| verified_by_teacher_ref_id | BIGINT UNSIGNED | NULLABLE — merujuk pegawai di Kepegawaian |
| verified_at | TIMESTAMP | NULLABLE |
| notes | TEXT | NULLABLE |

`INDEX (student_ref_id, record_date)` — untuk query riwayat capaian per santri dan laporan.

### 2.3 `munaqasyah_exams`
*(Fitur "Ujian/setoran hafalan (munaqasyah)")*
Ujian hafalan berkala untuk validasi capaian santri.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| student_ref_id | BIGINT UNSIGNED | NOT NULL — asal PRD: `id_siswa` |
| juz_examined | TINYINT UNSIGNED | NOT NULL — asal PRD: `juz_diuji` |
| exam_date | DATE | NOT NULL |
| examiner_teacher_ref_id | BIGINT UNSIGNED | NOT NULL — asal PRD: `penguji`, merujuk pegawai di Kepegawaian |
| score | DECIMAL(5,2) | NULLABLE — asal PRD: `nilai` *(skala belum final, lihat Bagian 0 poin 3)*, diisi saat status `completed` |
| status | ENUM('scheduled','completed','cancelled') | NOT NULL, DEFAULT 'scheduled' |
| notes | TEXT | NULLABLE |

`INDEX (student_ref_id, exam_date)`.

### 2.4 `kitab_kuning`
*(Fitur "Manajemen kitab kuning yang diajarkan")*
Daftar kitab yang diajarkan beserta pengampunya.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| book_name | VARCHAR(150) | NOT NULL — asal PRD: `nama_kitab` |
| author | VARCHAR(150) | NULLABLE — asal PRD: `pengarang` |
| level | VARCHAR(50) | NULLABLE — asal PRD: `tingkat` |
| teacher_ref_id | BIGINT UNSIGNED | NULLABLE — asal PRD: `pengajar_id`, merujuk pegawai di Kepegawaian |
| status_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

## 3. Skrip SQL Siap Pakai

> Dijalankan setelah database `alquran_local` dibuat (lihat `panduan-pengembangan-alquran.md`
> Tahap 2). Bisa dipakai langsung sebagai isi migration Knex atau dieksekusi manual untuk
> pengecekan cepat skema saat masih draf.

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. hafalan_targets
CREATE TABLE hafalan_targets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  class_ref_id BIGINT UNSIGNED NOT NULL,
  academic_period_ref_id BIGINT UNSIGNED NULL,
  period_label VARCHAR(100) NULL,
  target_type ENUM('juz','halaman') NOT NULL,
  target_value INT UNSIGNED NOT NULL,
  notes TEXT NULL,
  created_by_ref_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hafalan_targets_class (class_ref_id),
  INDEX idx_hafalan_targets_school (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. hafalan_records
CREATE TABLE hafalan_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  student_ref_id BIGINT UNSIGNED NOT NULL,
  juz TINYINT UNSIGNED NOT NULL,
  page_start SMALLINT UNSIGNED NULL,
  page_end SMALLINT UNSIGNED NULL,
  record_date DATE NOT NULL,
  tajwid_score DECIMAL(5,2) NULL,
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  recorded_by_teacher_ref_id BIGINT UNSIGNED NOT NULL,
  verified_by_teacher_ref_id BIGINT UNSIGNED NULL,
  verified_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hafalan_records_student_date (student_ref_id, record_date),
  INDEX idx_hafalan_records_school (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. munaqasyah_exams
CREATE TABLE munaqasyah_exams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  student_ref_id BIGINT UNSIGNED NOT NULL,
  juz_examined TINYINT UNSIGNED NOT NULL,
  exam_date DATE NOT NULL,
  examiner_teacher_ref_id BIGINT UNSIGNED NOT NULL,
  score DECIMAL(5,2) NULL,
  status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_munaqasyah_exams_student_date (student_ref_id, exam_date),
  INDEX idx_munaqasyah_exams_school (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. kitab_kuning
CREATE TABLE kitab_kuning (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  book_name VARCHAR(150) NOT NULL,
  author VARCHAR(150) NULL,
  level VARCHAR(50) NULL,
  teacher_ref_id BIGINT UNSIGNED NULL,
  status_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kitab_kuning_school (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. Seed Data Dummy

> `student_ref_id`, `class_ref_id`, `teacher_ref_id`, `school_unit_id` di bawah adalah **ID
> dummy** (angka bebas 1-2) untuk pengujian lokal sebelum Akademik/Kepegawaian tersedia — lihat
> catatan ketergantungan di `rancangan-alquran.md` §2. Ganti dengan ID nyata begitu kedua modul
> itu ada.

```sql
INSERT INTO hafalan_targets (school_unit_id, class_ref_id, period_label, target_type, target_value)
VALUES (1, 1, 'Semester Ganjil 2026/2027', 'juz', 2),
       (1, 2, 'Semester Ganjil 2026/2027', 'halaman', 40);

INSERT INTO hafalan_records
  (school_unit_id, student_ref_id, juz, page_start, page_end, record_date, tajwid_score, verification_status, recorded_by_teacher_ref_id)
VALUES (1, 1, 1, 1, 5, '2026-08-10', 85.00, 'verified', 1),
       (1, 1, 1, 6, 10, '2026-08-12', 88.50, 'pending', 1);

INSERT INTO munaqasyah_exams
  (school_unit_id, student_ref_id, juz_examined, exam_date, examiner_teacher_ref_id, status)
VALUES (1, 1, 1, '2026-09-01', 2, 'scheduled');

INSERT INTO kitab_kuning (school_unit_id, book_name, author, level, teacher_ref_id)
VALUES (1, 'Safinatun Najah', 'Syekh Salim bin Sumair', 'Pemula', 1),
       (1, 'Ta''lim Muta''alim', 'Syekh Az-Zarnuji', 'Menengah', 2);
```

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | ERD draf awal dibuat: 4 tabel (`hafalan_targets`, `hafalan_records`, `munaqasyah_exams`, `kitab_kuning`). Status **draf**, menunggu konfirmasi 6 poin terbuka di Bagian 0 sebelum dianggap final dan dipakai sebagai acuan migration produksi. |

*(Tambahkan baris baru di atas setiap ada perubahan skema — jangan hapus riwayat lama. Begitu
poin di Bagian 0 dikonfirmasi, catat keputusannya di sini seperti pola `erd-coreservice.md` §0.)*
