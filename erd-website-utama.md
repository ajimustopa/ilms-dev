# erd-website-utama.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 & 4.4 (prinsip arsitektur global, konvensi penamaan)
> & `rancangan-website-utama.md` Bagian 4–6 (ruang lingkup 22 fitur & keputusan terbuka/BUKAN
> tanggung jawab). Pola penerapan konvensi mengikuti `erd-coreservice.md`.
> Database: MariaDB 10.5, InnoDB, `utf8mb4`. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`,
> semua tabel punya `created_at`/`updated_at TIMESTAMP` (tidak ditulis ulang di tiap tabel di
> bawah supaya ringkas — anggap ada di semua tabel kecuali tabel log yang disebutkan
> *append-only*). Kolom `satuan_pendidikan_id` (nama fisik: `school_unit_id`) ditambahkan di
> semua tabel yang datanya spesifik per sekolah, sesuai `ARSITEKTUR-SISTEM.md` §3 poin 2.
>
> **Status: draf awal** — Bagian 0 di bawah mencatat asumsi yang dipakai untuk poin-poin yang
> masih "Keputusan Terbuka" di `rancangan-website-utama.md` §5. Kalau developer memutuskan lain,
> tabel terkait perlu direvisi sebelum migration Tahap 2 dijalankan.

## 0. Asumsi Sementara atas Keputusan Terbuka (`rancangan-website-utama.md` §5)

| # | Poin Terbuka | Asumsi Sementara di ERD Ini | Yang Perlu Dikonfirmasi |
|---|---|---|---|
| 1 | Payment gateway PPDB | Kolom `payment_gateway_ref` & `payment_gateway_name` dibuat generik VARCHAR nullable, tanpa tabel/enum khusus gateway tertentu | Nama penyedia gateway final, apakah butuh tabel log callback terpisah |
| 2 | Dokumen wajib PPDB per jalur | Tabel `ppdb_registrant_documents` dibuat generik (`document_type` VARCHAR bebas, bukan ENUM tetap) supaya fleksibel sebelum daftar dokumen final | Daftar `document_type` yang valid per jalur pendaftaran |
| 3 | Akses penulis artikel (guru/siswa) | Kolom `author_user_id` mengacu ke `users.id` Core Service (bukan FK fisik) — asumsi mereka tetap login lewat akun Core yang sudah ada | Apakah butuh tabel penetapan akses submodul artikel terpisah |
| 4 | Granularitas role CMS | Tabel `cms_access_grants` dibuat generik dengan kolom `role_code` VARCHAR (bukan ENUM tetap) | Daftar role CMS final untuk `roles-website-utama.md` |
| 5 | Retensi/arsip PPDB | Tidak ada tabel arsip terpisah — asumsi data disimpan permanen dengan kolom `school_year` sebagai filter | Kebijakan retensi final |

## 1. Daftar Entitas (24 Tabel)

| Modul (rancangan-website-utama.md §4) | Tabel | `school_unit_id`? |
|---|---|---|
| Konten Publik | `home_hero_settings` | **Ya** (singleton per sekolah) |
| Konten Publik | `home_highlights` | **Ya** |
| Konten Publik | `staff_profiles` | **Ya** |
| Konten Publik | `school_life_items` | **Ya** |
| Konten Publik | `news_posts` | **Ya** |
| Konten Publik | `galleries` | **Ya** |
| Konten Publik | `gallery_items` | Tidak langsung (ikut `galleries`) |
| Konten Publik | `faqs` | **Ya** |
| Konten Publik | `testimonials` | **Ya** |
| Konten Publik | `events` | **Ya** |
| Konten Publik | `accreditations` | **Ya** |
| Pendaftaran | `ppdb_registrants` | **Ya** |
| Pendaftaran | `ppdb_registrant_documents` | Tidak langsung (ikut `ppdb_registrants`) |
| Pendaftaran | `ppdb_selection_schedules` | **Ya** |
| Pendaftaran | `ppdb_payments` | Tidak langsung (ikut `ppdb_registrants`) |
| Pendaftaran | `ppdb_status_logs` (log, *append-only*) | Tidak langsung (ikut `ppdb_registrants`) |
| Konsultasi | `consultation_tickets` | **Ya** |
| Konsultasi | `consultation_ticket_replies` | Tidak langsung (ikut `consultation_tickets`) |
| Konsultasi | `consultation_bookings` | **Ya** |
| Publikasi | `articles` | **Ya** |
| Publikasi | `article_comments` | Tidak langsung (ikut `articles`) |
| CMS Admin | `theme_settings` | **Ya** (singleton per sekolah) |
| CMS Admin | `cms_access_grants` | **Ya** |
| CMS Admin | `site_settings` | Ya (nullable = default lintas sekolah) |

> Fitur "Profil sekolah" (#15) dan "Kontak & lokasi sekolah" (#23) **tidak punya tabel** —
> datanya diambil langsung dari `school_units` milik Core Service lewat panggilan HTTP ke
> `api.aldeposibs.com/api/v1/core/...` (lihat Bagian 6 `rancangan-website-utama.md`), bukan
> disalin ke database Website Utama.
> Fitur "Beranda" (#14) bagian statistik (jumlah siswa/guru/lulusan) juga **tidak disimpan** —
> diambil live dari Core/Akademik/Kepegawaian saat halaman dimuat.

## 2. Detail Tabel

### 2.1 `home_hero_settings`
*(Fitur #14 — Beranda, bagian hero)*
Singleton per Satuan Pendidikan — satu baris aktif per `school_unit_id`.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL — ref `school_units.id` (Core, bukan FK fisik) |
| school_name_display | VARCHAR(150) | NULLABLE — override nama tampilan (kalau kosong pakai nama dari Core) |
| headline | VARCHAR(255) | NOT NULL |
| subheadline | VARCHAR(255) | NULLABLE |
| keywords | VARCHAR(255) | NULLABLE |
| cta_button_label | VARCHAR(100) | NULLABLE |
| cta_button_url | VARCHAR(255) | NULLABLE |

`UNIQUE (school_unit_id)`.

### 2.2 `home_highlights`
*(Fitur #14 — Beranda, bagian keunggulan)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| title | VARCHAR(150) | NOT NULL |
| icon | VARCHAR(100) | NULLABLE |
| description | TEXT | NULLABLE |
| detail_link_url | VARCHAR(255) | NULLABLE |
| display_order | SMALLINT UNSIGNED | NOT NULL, DEFAULT 0 |

### 2.3 `staff_profiles`
*(Fitur #16 — Struktur organisasi & profil pengajar)*
Salinan tampilan, mengacu ke data induk pegawai di Kepegawaian.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| employee_ref_id | BIGINT UNSIGNED | NULLABLE — ID di database Kepegawaian (bukan FK fisik), kosong kalau input manual (mis. pengurus yayasan) |
| full_name | VARCHAR(150) | NOT NULL |
| position | VARCHAR(150) | NOT NULL |
| photo_url | VARCHAR(255) | NULLABLE |
| short_bio | TEXT | NULLABLE |
| display_order | SMALLINT UNSIGNED | NOT NULL, DEFAULT 0 |

### 2.4 `school_life_items`
*(Fitur #17 — Kehidupan sekolah: fasilitas, ekskul, tata tertib, prestasi)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| category | ENUM('facility','extracurricular','school_rule','achievement') | NOT NULL |
| title | VARCHAR(150) | NOT NULL |
| description | TEXT | NULLABLE |
| photo_url | VARCHAR(255) | NULLABLE |
| sarpras_ref_id | BIGINT UNSIGNED | NULLABLE — ID fasilitas di database Sarpras (bukan FK fisik), khusus `category='facility'` |
| status | ENUM('draft','published') | NOT NULL, DEFAULT 'draft' |

### 2.5 `news_posts`
*(Fitur #18 — Berita & pengumuman)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| title | VARCHAR(200) | NOT NULL |
| slug | VARCHAR(220) | NOT NULL, UNIQUE |
| content | LONGTEXT | NOT NULL |
| category | VARCHAR(100) | NULLABLE |
| cover_image_url | VARCHAR(255) | NULLABLE |
| status | ENUM('draft','published','archived') | NOT NULL, DEFAULT 'draft' |
| published_at | TIMESTAMP | NULLABLE |
| created_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core (bukan FK fisik) |

### 2.6 `galleries`
*(Fitur #19 — Galeri foto & kegiatan, album)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| album_name | VARCHAR(150) | NOT NULL |
| event_date | DATE | NULLABLE |
| description | TEXT | NULLABLE |

### 2.7 `gallery_items`
*(Fitur #19, item per album)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| gallery_id | BIGINT UNSIGNED | FK → `galleries.id`, NOT NULL |
| media_type | ENUM('photo','video') | NOT NULL |
| media_url | VARCHAR(255) | NOT NULL |
| display_order | SMALLINT UNSIGNED | NOT NULL, DEFAULT 0 |

### 2.8 `faqs`
*(Fitur #20)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| question | VARCHAR(255) | NOT NULL |
| answer | TEXT | NOT NULL |
| category | VARCHAR(100) | NULLABLE |
| display_order | SMALLINT UNSIGNED | NOT NULL, DEFAULT 0 |

### 2.9 `testimonials`
*(Fitur #21)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| role_type | ENUM('alumni','parent','student') | NOT NULL |
| content | TEXT | NOT NULL |
| photo_url | VARCHAR(255) | NULLABLE |
| is_visible | BOOLEAN | NOT NULL, DEFAULT FALSE |

### 2.10 `events`
*(Fitur #22 — Agenda & kegiatan sekolah)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| event_name | VARCHAR(200) | NOT NULL |
| event_date | DATE | NOT NULL |
| location | VARCHAR(255) | NULLABLE |
| description | TEXT | NULLABLE |
| poster_url | VARCHAR(255) | NULLABLE |
| status | ENUM('draft','published') | NOT NULL, DEFAULT 'draft' |

### 2.11 `accreditations`
*(Fitur #24 — Informasi akreditasi & prestasi)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| accreditation_type | VARCHAR(150) | NOT NULL |
| score | VARCHAR(20) | NULLABLE |
| year | YEAR | NOT NULL |
| certificate_url | VARCHAR(255) | NULLABLE |

### 2.12 `ppdb_registrants`
*(Fitur #25 — PPDB online; juga induk untuk Fitur #27, #28)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| school_year | VARCHAR(20) | NOT NULL — mis. `2027/2028` |
| registration_path | VARCHAR(100) | NOT NULL — jalur pendaftaran (lihat Bagian 0 #2) |
| candidate_full_name | VARCHAR(150) | NOT NULL |
| candidate_birth_place | VARCHAR(100) | NULLABLE |
| candidate_birth_date | DATE | NULLABLE |
| candidate_gender | ENUM('L','P') | NULLABLE |
| candidate_address | TEXT | NULLABLE |
| father_name | VARCHAR(150) | NULLABLE |
| mother_name | VARCHAR(150) | NULLABLE |
| parent_contact | VARCHAR(50) | NULLABLE |
| status | ENUM('draft','submitted','verifying','accepted','rejected') | NOT NULL, DEFAULT 'draft' |
| academic_ref_id | BIGINT UNSIGNED | NULLABLE — ID pendaftar di database Akademik setelah dikirim untuk verifikasi (bukan FK fisik) |

### 2.13 `ppdb_registrant_documents`
*(Fitur #25, dokumen upload — generik, lihat Bagian 0 #2)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| registrant_id | BIGINT UNSIGNED | FK → `ppdb_registrants.id`, NOT NULL |
| document_type | VARCHAR(100) | NOT NULL — mis. `kartu_keluarga`, `akta_lahir` (daftar valid: lihat Bagian 0 #2) |
| file_url | VARCHAR(255) | NOT NULL |
| uploaded_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.14 `ppdb_selection_schedules`
*(Fitur #26 — Jadwal seleksi PPDB)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| wave_name | VARCHAR(100) | NOT NULL — nama gelombang |
| test_date | DATE | NOT NULL |
| location_or_link | VARCHAR(255) | NULLABLE |
| test_type | VARCHAR(100) | NULLABLE |

### 2.15 `ppdb_payments`
*(Fitur #27 — Pembayaran biaya pendaftaran)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| registrant_id | BIGINT UNSIGNED | FK → `ppdb_registrants.id`, NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL |
| payment_status | ENUM('pending','paid','failed','expired') | NOT NULL, DEFAULT 'pending' |
| payment_gateway_name | VARCHAR(50) | NULLABLE — lihat Bagian 0 #1 |
| payment_gateway_ref | VARCHAR(150) | NULLABLE |
| paid_at | TIMESTAMP | NULLABLE |

### 2.16 `ppdb_status_logs`
*(Fitur #28 — Tracking status pendaftaran, log riwayat, *append-only*)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| registrant_id | BIGINT UNSIGNED | FK → `ppdb_registrants.id`, NOT NULL |
| status | VARCHAR(50) | NOT NULL |
| note | TEXT | NULLABLE |
| changed_by | BIGINT UNSIGNED | NULLABLE — ref `users.id` Core (kosong kalau perubahan otomatis dari webhook Akademik) |
| occurred_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*(Tidak punya `updated_at` — append-only.)*

### 2.17 `consultation_tickets`
*(Fitur #29 — Form konsultasi publik)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| contact | VARCHAR(100) | NOT NULL |
| subject | VARCHAR(200) | NOT NULL |
| content | TEXT | NOT NULL |
| status | ENUM('open','closed') | NOT NULL, DEFAULT 'open' |
| assigned_to | BIGINT UNSIGNED | NULLABLE — ref `users.id` Core |

### 2.18 `consultation_ticket_replies`
*(Fitur #29, balasan tiket)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| ticket_id | BIGINT UNSIGNED | FK → `consultation_tickets.id`, NOT NULL |
| replied_by | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core |
| content | TEXT | NOT NULL |

### 2.19 `consultation_bookings`
*(Fitur #30 — Booking konsultasi virtual)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| contact | VARCHAR(100) | NOT NULL |
| scheduled_at | TIMESTAMP | NOT NULL |
| meeting_link | VARCHAR(255) | NULLABLE |
| status | ENUM('booked','confirmed','rescheduled','cancelled','done') | NOT NULL, DEFAULT 'booked' |

### 2.20 `articles`
*(Fitur #31 — Artikel & berita oleh guru/siswa)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| title | VARCHAR(200) | NOT NULL |
| slug | VARCHAR(220) | NOT NULL, UNIQUE |
| content | LONGTEXT | NOT NULL |
| category | VARCHAR(100) | NULLABLE |
| status | ENUM('draft','in_review','published') | NOT NULL, DEFAULT 'draft' |
| author_user_id | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core, lihat Bagian 0 #3 |
| views_count | INT UNSIGNED | NOT NULL, DEFAULT 0 |

### 2.21 `article_comments`
*(Fitur #32 — Moderasi komentar artikel)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| article_id | BIGINT UNSIGNED | FK → `articles.id`, NOT NULL |
| commenter_name | VARCHAR(150) | NOT NULL |
| content | TEXT | NOT NULL |
| status | ENUM('pending','approved','rejected') | NOT NULL, DEFAULT 'pending' |

### 2.22 `theme_settings`
*(Fitur #33 — Theme builder, singleton per sekolah)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL, UNIQUE |
| color_preset | VARCHAR(50) | NULLABLE |
| typography_preset | VARCHAR(50) | NULLABLE |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

### 2.23 `cms_access_grants`
*(Fitur #34 — Manajemen user CMS; akun tetap dari Core, ini penetapan akses ke CMS Website
Utama, lihat Bagian 0 #4)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NOT NULL |
| user_id | BIGINT UNSIGNED | NOT NULL — ref `users.id` Core (bukan FK fisik) |
| role_code | VARCHAR(50) | NOT NULL — lihat Bagian 0 #4 & `roles-website-utama.md` |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |

`UNIQUE (school_unit_id, user_id)`.

### 2.24 `site_settings`
*(Fitur #35 — Pengaturan situs & SEO)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| school_unit_id | BIGINT UNSIGNED | NULLABLE — kosong = default lintas sekolah |
| setting_key | VARCHAR(150) | NOT NULL |
| setting_value | TEXT | NULLABLE |
| description | VARCHAR(255) | NULLABLE |

`UNIQUE (school_unit_id, setting_key)`.

## 3. SQL Migration Lengkap (Referensi untuk Knex)

> Ditulis sebagai raw SQL untuk dipakai sebagai acuan isi migration Knex per tabel (lihat
> `panduan-pengembangan-website-utama.md` Tahap 2). Urutan tabel memperhatikan dependency FK
> lokal (`galleries`→`gallery_items`, `ppdb_registrants`→3 tabel anak, `consultation_tickets`→
> `consultation_ticket_replies`, `articles`→`article_comments`).

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. home_hero_settings
CREATE TABLE home_hero_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  school_name_display VARCHAR(150) NULL,
  headline VARCHAR(255) NOT NULL,
  subheadline VARCHAR(255) NULL,
  keywords VARCHAR(255) NULL,
  cta_button_label VARCHAR(100) NULL,
  cta_button_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hero_school (school_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. home_highlights
CREATE TABLE home_highlights (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  icon VARCHAR(100) NULL,
  description TEXT NULL,
  detail_link_url VARCHAR(255) NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. staff_profiles
CREATE TABLE staff_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  employee_ref_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(150) NOT NULL,
  position VARCHAR(150) NOT NULL,
  photo_url VARCHAR(255) NULL,
  short_bio TEXT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. school_life_items
CREATE TABLE school_life_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  category ENUM('facility','extracurricular','school_rule','achievement') NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  photo_url VARCHAR(255) NULL,
  sarpras_ref_id BIGINT UNSIGNED NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. news_posts
CREATE TABLE news_posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  content LONGTEXT NOT NULL,
  category VARCHAR(100) NULL,
  cover_image_url VARCHAR(255) NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. galleries
CREATE TABLE galleries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  album_name VARCHAR(150) NOT NULL,
  event_date DATE NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. gallery_items
CREATE TABLE gallery_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gallery_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('photo','video') NOT NULL,
  media_url VARCHAR(255) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_items_gallery FOREIGN KEY (gallery_id) REFERENCES galleries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. faqs
CREATE TABLE faqs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. testimonials
CREATE TABLE testimonials (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  role_type ENUM('alumni','parent','student') NOT NULL,
  content TEXT NOT NULL,
  photo_url VARCHAR(255) NULL,
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. events
CREATE TABLE events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  event_name VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  location VARCHAR(255) NULL,
  description TEXT NULL,
  poster_url VARCHAR(255) NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. accreditations
CREATE TABLE accreditations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  accreditation_type VARCHAR(150) NOT NULL,
  score VARCHAR(20) NULL,
  year YEAR NOT NULL,
  certificate_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. ppdb_registrants
CREATE TABLE ppdb_registrants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  registration_path VARCHAR(100) NOT NULL,
  candidate_full_name VARCHAR(150) NOT NULL,
  candidate_birth_place VARCHAR(100) NULL,
  candidate_birth_date DATE NULL,
  candidate_gender ENUM('L','P') NULL,
  candidate_address TEXT NULL,
  father_name VARCHAR(150) NULL,
  mother_name VARCHAR(150) NULL,
  parent_contact VARCHAR(50) NULL,
  status ENUM('draft','submitted','verifying','accepted','rejected') NOT NULL DEFAULT 'draft',
  academic_ref_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. ppdb_registrant_documents
CREATE TABLE ppdb_registrant_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registrant_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ppdb_docs_registrant FOREIGN KEY (registrant_id) REFERENCES ppdb_registrants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. ppdb_selection_schedules
CREATE TABLE ppdb_selection_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  wave_name VARCHAR(100) NOT NULL,
  test_date DATE NOT NULL,
  location_or_link VARCHAR(255) NULL,
  test_type VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. ppdb_payments
CREATE TABLE ppdb_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registrant_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_status ENUM('pending','paid','failed','expired') NOT NULL DEFAULT 'pending',
  payment_gateway_name VARCHAR(50) NULL,
  payment_gateway_ref VARCHAR(150) NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ppdb_payments_registrant FOREIGN KEY (registrant_id) REFERENCES ppdb_registrants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. ppdb_status_logs (append-only, no updated_at)
CREATE TABLE ppdb_status_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registrant_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(50) NOT NULL,
  note TEXT NULL,
  changed_by BIGINT UNSIGNED NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ppdb_status_logs_registrant FOREIGN KEY (registrant_id) REFERENCES ppdb_registrants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. consultation_tickets
CREATE TABLE consultation_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(100) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  assigned_to BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. consultation_ticket_replies
CREATE TABLE consultation_ticket_replies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  replied_by BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_replies_ticket FOREIGN KEY (ticket_id) REFERENCES consultation_tickets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. consultation_bookings
CREATE TABLE consultation_bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(100) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  meeting_link VARCHAR(255) NULL,
  status ENUM('booked','confirmed','rescheduled','cancelled','done') NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. articles
CREATE TABLE articles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  content LONGTEXT NOT NULL,
  category VARCHAR(100) NULL,
  status ENUM('draft','in_review','published') NOT NULL DEFAULT 'draft',
  author_user_id BIGINT UNSIGNED NOT NULL,
  views_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. article_comments
CREATE TABLE article_comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  article_id BIGINT UNSIGNED NOT NULL,
  commenter_name VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_article_comments_article FOREIGN KEY (article_id) REFERENCES articles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. theme_settings
CREATE TABLE theme_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL UNIQUE,
  color_preset VARCHAR(50) NULL,
  typography_preset VARCHAR(50) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. cms_access_grants
CREATE TABLE cms_access_grants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cms_access (school_unit_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. site_settings
CREATE TABLE site_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_unit_id BIGINT UNSIGNED NULL,
  setting_key VARCHAR(150) NOT NULL,
  setting_value TEXT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_site_settings (school_unit_id, setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. Seed Data Dummy (untuk pengujian lokal)

```sql
-- Asumsi school_unit_id = 1 (SD Contoh 1) & 2 (SMP Contoh 1) sudah ada di Core (database beda,
-- ID ini hanya referensi angka, tidak divalidasi FK fisik).

INSERT INTO home_hero_settings (school_unit_id, headline, subheadline, cta_button_label, cta_button_url)
VALUES (1, 'Selamat Datang di SD Contoh 1', 'Membentuk generasi unggul & berakhlak', 'Daftar Sekarang', '/ppdb');

INSERT INTO home_highlights (school_unit_id, title, description, display_order)
VALUES (1, 'Kurikulum Terpadu', 'Perpaduan kurikulum nasional & keagamaan', 1),
       (1, 'Guru Berpengalaman', 'Diampu oleh tenaga pendidik profesional', 2);

INSERT INTO news_posts (school_unit_id, title, slug, content, status, published_at, created_by)
VALUES (1, 'Penerimaan Siswa Baru Dibuka', 'ppdb-dibuka-2027', 'Isi berita contoh...', 'published', NOW(), 1);

INSERT INTO ppdb_selection_schedules (school_unit_id, wave_name, test_date, location_or_link, test_type)
VALUES (1, 'Gelombang 1', '2027-01-15', 'Aula Sekolah', 'Wawancara');

INSERT INTO ppdb_registrants (school_unit_id, school_year, registration_path, candidate_full_name, status)
VALUES (1, '2027/2028', 'reguler', 'Contoh Nama Calon Siswa', 'submitted');

INSERT INTO site_settings (school_unit_id, setting_key, setting_value, description)
VALUES (NULL, 'meta_title_default', 'Sekolah Contoh - PPDB Online', 'Judul meta default seluruh halaman'),
       (1, 'meta_description', 'SD Contoh 1 - sekolah unggulan berbasis karakter', 'Deskripsi SEO beranda');
```
