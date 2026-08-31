# AI-REF: Modul Website Utama & PPDB Online (`website-utama`)

> Dokumen referensi teknis modul Website Utama & PPDB untuk AI Agent. Data diambil langsung dari 24 berkas migrasi Knex aktual, router/controller backend `apps/api-backend/src/modules/website-utama/`, aplikasi SSR Next.js publik `apps/website-utama/`, dan panel CMS Admin di `apps/core-portal/src/apps/website-utama/`.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/website-utama/`
- **Path Frontend Publik (Next.js):** `apps/website-utama/`
- **Path Frontend CMS Admin (React Vite):** `apps/core-portal/src/apps/website-utama/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/website-utama/`
- **Domain Deployment Publik:** `https://aldeposibs.com` *(Next.js SSR/ISR)*
- **Domain Deployment CMS:** `https://core.aldeposibs.com/website-utama` *(Core Portal SPA)*
- **Database Engine:** MariaDB 10.5 (`aldepos_website` / `u622997391_dbwebsite`)
- **Status Implementasi:** `jalan-produksi` (CMS Landing Page, Profil Pengajar, Berita & Galeri, Agenda/Akreditasi, PPDB Multi-Step Wizard & Verifikasi Dokumen, Pembayaran Formulir Gateway/VA, Konsultasi & Tiket, Publikasi Artikel Moderasi, Tema & Sitemap/Robots SEO)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (24 Tabel)

### 2.1 Konten Halaman Depan, Berita & Galeri

#### `home_hero_settings` (Hero Section Beranda) — *Fitur #14*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | `UNIQUE` (1 Setting per Satuan Pendidikan) |
| `headline` | `VARCHAR(200)` | NO | - | Judul Utama Hero Banner |
| `subheadline` | `TEXT` | YES | `NULL` | Deskripsi Sub-Headline |
| `background_image_url`| `VARCHAR(255)` | YES | `NULL` | Gambar Latar |
| `cta_button_label` | `VARCHAR(50)` | YES | `NULL` | Label Tombol CTA (e.g. "Daftar PPDB") |
| `cta_button_url` | `VARCHAR(255)` | YES | `NULL` | Tautan Tombol CTA |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `home_highlights` (Kartu Highlight Keunggulan Beranda) — *Fitur #15*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(100)` | NO | - | e.g. "Tahfidz Bersanad", "Kurikulum Internasional" |
| `description` | `TEXT` | YES | `NULL` | - |
| `icon_name` | `VARCHAR(50)` | YES | `NULL` | e.g. "BookOpen", "Award", "Sparkles" |
| `order_index` | `SMALLINT UNSIGNED`| NO | `0` | Urutan Tampilan |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `staff_profiles` (Direktori Profil Pengajar & Guru) — *Fitur #16*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `employee_id` | `BIGINT UNSIGNED` | YES | `NULL` | Ref Pegawai (Kepegawaian) |
| `name` | `VARCHAR(150)` | NO | - | Nama Lengkap & Gelar |
| `role_title` | `VARCHAR(100)` | YES | `NULL` | Jabatan / Guru Pengampu Mapel |
| `photo_url` | `VARCHAR(255)` | YES | `NULL` | Foto Profil Pengajar |
| `bio` | `TEXT` | YES | `NULL` | Riwayat Singkat & Prestasi |
| `order_index` | `SMALLINT UNSIGNED`| NO | `0` | - |
| `is_published` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `school_life_items` (Kehidupan Sekolah & Asrama) — *Fitur #17*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(150)` | NO | - | e.g. "Kegiatan Harian Santri", "Ekstrakurikuler Memanah" |
| `category` | `VARCHAR(50)` | NO | `'asrama'` | `'akademik','asrama','ekskul','karakter'` |
| `description` | `TEXT` | YES | `NULL` | - |
| `image_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `order_index` | `SMALLINT UNSIGNED`| NO | `0` | - |
| `is_published` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `news_posts` (Berita & Pengumuman Sekolah) — *Fitur #18*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(200)` | NO | - | - |
| `slug` | `VARCHAR(220)` | NO | - | `UNIQUE` |
| `excerpt` | `TEXT` | YES | `NULL` | Ringkasan Berita |
| `content` | `TEXT` | NO | - | Konten Lengkap (HTML/RichText) |
| `cover_image_url`| `VARCHAR(255)` | YES | `NULL` | - |
| `published_at` | `TIMESTAMP` | YES | `NULL` | - |
| `author_name` | `VARCHAR(100)` | YES | `NULL` | - |
| `views_count` | `INT UNSIGNED` | NO | `0` | Jumlah Pembaca |
| `is_published` | `TINYINT(1)` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `galleries` (Album Galeri Kegiatan) — *Fitur #19*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(150)` | NO | - | e.g. "Wisuda Tahfidz Angkatan V" |
| `description` | `TEXT` | YES | `NULL` | - |
| `cover_image_url`| `VARCHAR(255)` | YES | `NULL` | - |
| `is_published` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `gallery_items` (Foto / Media Galeri)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `gallery_id` | `BIGINT UNSIGNED` | NO | - | `FK -> galleries(id) CASCADE/CASCADE` |
| `media_url` | `VARCHAR(255)` | NO | - | - |
| `media_type` | `ENUM` | NO | `'image'` | `'image','video'` |
| `caption` | `VARCHAR(200)` | YES | `NULL` | - |
| `order_index` | `SMALLINT UNSIGNED`| NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

#### `faqs` (Tanya Jawab FAQ) — *Fitur #20*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `question` | `TEXT` | NO | - | Pertanyaan Umum |
| `answer` | `TEXT` | NO | - | Jawaban |
| `category` | `VARCHAR(50)` | YES | `'umum'` | `'umum','ppdb','asrama','biaya'` |
| `order_index` | `SMALLINT UNSIGNED`| NO | `0` | - |
| `is_published` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `testimonials` (Testimoni Alumni & Wali Santri) — *Fitur #21*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | Nama Pemberi Testimoni |
| `role_label` | `VARCHAR(100)` | YES | `NULL` | e.g. "Alumni 2024 / Mahasiswa ITB" |
| `photo_url` | `VARCHAR(255)` | YES | `NULL` | - |
| `quote` | `TEXT` | NO | - | Kutipan Kesan & Pesan |
| `is_featured` | `TINYINT(1)` | NO | `0` | Tampil di Highlight Beranda |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `events` (Agenda Kegiatan & Kalender Terbuka) — *Fitur #22*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(200)` | NO | - | - |
| `description` | `TEXT` | YES | `NULL` | - |
| `event_date` | `DATE` | NO | - | Tanggal Pelaksanaan |
| `start_time` | `TIME` | YES | `NULL` | - |
| `end_time` | `TIME` | YES | `NULL` | - |
| `location` | `VARCHAR(150)` | YES | `NULL` | - |
| `is_published` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `accreditations` (Informasi Akreditasi Lembaga) — *Fitur #24*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `accreditation_body`| `VARCHAR(100)` | NO | `'BAN-S/M'` | e.g. "BAN-S/M", "Kemenag" |
| `grade` | `VARCHAR(10)` | NO | `'A'` | 'A', 'Unggul', 'B' |
| `certificate_number`| `VARCHAR(100)` | YES | `NULL` | Nomor SK Akreditasi |
| `valid_until` | `DATE` | YES | `NULL` | - |
| `certificate_file_url`| `VARCHAR(255)`| YES| `NULL` | PDF Sertifikat |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

---

### 2.2 PPDB Online & Pembayaran Formulir

#### `ppdb_registrants` (Data Pendaftar Calon Santri Baru) — *Fitur #25*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `registration_number`| `VARCHAR(50)` | NO | - | `UNIQUE` (e.g. "REG-2027-0012") |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | Unit Sekolah yang Dituju |
| `academic_year` | `VARCHAR(20)` | NO | - | e.g. "2027/2028" |
| `full_name` | `VARCHAR(150)` | NO | - | - |
| `gender` | `ENUM` | NO | - | `'L','P'` |
| `birth_place` | `VARCHAR(100)` | YES | `NULL` | - |
| `birth_date` | `DATE` | YES | `NULL` | - |
| `guardian_name` | `VARCHAR(150)` | NO | - | Nama Ayah/Ibu/Wali |
| `guardian_phone`| `VARCHAR(30)` | NO | - | No. WhatsApp Aktif |
| `guardian_email`| `VARCHAR(150)` | YES | `NULL` | - |
| `origin_school` | `VARCHAR(150)` | YES | `NULL` | Sekolah Asal |
| `current_step` | `SMALLINT UNSIGNED`| NO | `1` | Step Wizard Pendaftaran (1-4) |
| `status` | `ENUM` | NO | `'draft'` | `'draft','submitted','verified','scheduled','passed','failed','enrolled'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `ppdb_registrant_documents` (Berkas Unggahan Pendaftar) — *Fitur #26*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `registrant_id` | `BIGINT UNSIGNED` | NO | - | `FK -> ppdb_registrants(id) CASCADE/CASCADE` |
| `document_type` | `VARCHAR(50)` | NO | - | e.g. "kartu_keluarga", "akta_kelahiran", "rapor", "ijazah" |
| `file_url` | `VARCHAR(255)` | NO | - | File Berkas Dokumen |
| `verification_status`| `ENUM` | NO | `'pending'` | `'pending','verified','rejected'` |
| `verification_notes` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `ppdb_selection_schedules` (Jadwal Seleksi & Tes Masuk) — *Fitur #27*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `academic_year` | `VARCHAR(20)` | NO | - | - |
| `test_date` | `DATE` | NO | - | Tanggal Tes Seleksi |
| `start_time` | `TIME` | NO | - | - |
| `location` | `VARCHAR(150)` | NO | - | e.g. "Gedung Utama / Online Zoom" |
| `quota` | `SMALLINT UNSIGNED`| NO | `30` | Kuota Sesi |
| `test_type` | `VARCHAR(100)` | YES | `NULL` | e.g. "Tes Akademik, Baca Al-Quran & Wawancara" |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `ppdb_payments` (Pembayaran Formulir PPDB) — *Fitur #28*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `registrant_id` | `BIGINT UNSIGNED` | NO | - | `FK -> ppdb_registrants(id) CASCADE/CASCADE` |
| `amount` | `DECIMAL(12,2)` | NO | - | Biaya Pendaftaran Formulir |
| `payment_status`| `ENUM` | NO | `'pending'` | `'pending','paid','failed','expired'` |
| `payment_gateway_name`| `VARCHAR(50)`| YES | `NULL` | e.g. "Midtrans", "Xendit", "Manual" |
| `payment_gateway_ref` | `VARCHAR(150)`| YES | `NULL` | No. Transaksi Gateway / VA |
| `paid_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `ppdb_status_logs` (Audit Log Perubahan Status Pendaftar)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `registrant_id` | `BIGINT UNSIGNED` | NO | - | `FK -> ppdb_registrants(id) CASCADE/CASCADE` |
| `status` | `VARCHAR(50)` | NO | - | Status Baru |
| `note` | `TEXT` | YES | `NULL` | Catatan Panitia PPDB |
| `changed_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Admin PPDB (Core Service) |
| `occurred_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

### 2.3 Layanan Konsultasi, Artikel Publikasi & CMS Settings

#### `consultation_tickets` (Tiket Pertanyaan / Live Consultation) — *Fitur #29*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | Nama Penanya |
| `contact` | `VARCHAR(100)` | NO | - | No. WhatsApp / Email |
| `subject` | `VARCHAR(200)` | NO | - | Topik Pertanyaan |
| `content` | `TEXT` | NO | - | Isi Pertanyaan |
| `status` | `ENUM` | NO | `'open'` | `'open','closed'` |
| `assigned_to` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Admin Customer Care |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `consultation_ticket_replies` (Balasan Tiket Konsultasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `ticket_id` | `BIGINT UNSIGNED` | NO | - | `FK -> consultation_tickets(id) CASCADE/CASCADE` |
| `replied_by` | `BIGINT UNSIGNED` | NO | - | User ID Petugas |
| `content` | `TEXT` | NO | - | Isi Balasan Jawaban |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `consultation_bookings` (Jadwal Booking Konsultasi / Visit Kampus) — *Fitur #30*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `name` | `VARCHAR(150)` | NO | - | - |
| `contact` | `VARCHAR(100)` | NO | - | - |
| `scheduled_at` | `TIMESTAMP` | NO | - | Waktu Janji Temu Visit Kampus / Online Meet |
| `meeting_link` | `VARCHAR(255)` | YES | `NULL` | Link Zoom/GMeet (Jika Online) |
| `status` | `ENUM` | NO | `'booked'` | `'booked','confirmed','rescheduled','cancelled','done'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `articles` (Artikel & Opini Guru/Santri) — *Fitur #31*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `title` | `VARCHAR(200)` | NO | - | - |
| `slug` | `VARCHAR(220)` | NO | - | `UNIQUE` |
| `content` | `LONGTEXT` | NO | - | Isi Artikel |
| `category` | `VARCHAR(100)` | YES | `NULL` | e.g. "Pendidikan Karakter", "Sains Islam" |
| `status` | `ENUM` | NO | `'draft'` | `'draft','in_review','published'` |
| `author_user_id` | `BIGINT UNSIGNED`| NO | - | User ID Penulis |
| `views_count` | `INT UNSIGNED` | NO | `0` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `article_comments` (Komentar & Moderasi Artikel) — *Fitur #32*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `article_id` | `BIGINT UNSIGNED` | NO | - | `FK -> articles(id) CASCADE/CASCADE` |
| `commenter_name` | `VARCHAR(150)`| NO | - | Nama Komentator |
| `content` | `TEXT` | NO | - | Isi Komentar |
| `status` | `ENUM` | NO | `'pending'` | `'pending','approved','rejected'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `theme_settings` (Pengaturan Tema & Tipografi) — *Fitur #33*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | `UNIQUE` |
| `color_preset` | `VARCHAR(50)` | YES | `'emerald'` | Preset Warna Utama (e.g. "emerald", "navy") |
| `typography_preset`| `VARCHAR(50)` | YES | `'inter'` | e.g. "Inter", "Outfit", "Plus Jakarta Sans" |
| `is_active` | `TINYINT(1)` | NO | `1` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `cms_access_grants` (Hak Akses Staf CMS Berbasis Unit) — *Fitur #34*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | NO | - | - |
| `user_id` | `BIGINT UNSIGNED` | NO | - | User ID (Core Service) |
| `role_code` | `VARCHAR(50)` | NO | - | e.g. `superadmin_cms`, `admin_konten`, `admin_ppdb`, `moderator_artikel` |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_cms_access (school_unit_id, user_id)`

#### `site_settings` (Konfigurasi SEO, Sitemap & Robots.txt) — *Fitur #35*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id` | `BIGINT UNSIGNED` | YES | `NULL` | - |
| `setting_key` | `VARCHAR(150)` | NO | - | e.g. "seo_meta_title", "seo_meta_description", "sitemap_xml" |
| `setting_value` | `TEXT` | YES | `NULL` | - |
| `description` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_site_settings (school_unit_id, setting_key)`

---

## 3. Kontrak API Ringkas (`/api/v1/website-utama`)

### 3.1 Endpoint Publik (Konsumsi Next.js SSR di `aldeposibs.com`)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/public/home` | Publik | Query: `?school_unit_id=1` | `{ hero: object, highlights: array, live_statistics: object }` |
| `GET` | `/public/news` | Publik | Query: `?page=&limit=&category=` | `{ news: array, pagination: object }` |
| `GET` | `/public/news/:slug` | Publik | - | `{ post: object }` |
| `GET` | `/public/staff-profiles`| Publik | Query: `?school_unit_id=` | `{ staff: array }` |
| `GET` | `/public/school-life` | Publik | Query: `?category=` | `{ items: array }` |
| `GET` | `/public/galleries` | Publik | - | `{ galleries: array }` |
| `GET` | `/public/faqs` | Publik | Query: `?category=` | `{ faqs: array }` |
| `GET` | `/public/testimonials`| Publik | - | `{ testimonials: array }` |
| `GET` | `/public/events` | Publik | - | `{ events: array }` |
| `GET` | `/public/accreditations`| Publik | - | `{ accreditations: array }` |
| `POST` | `/public/ppdb/registrants`| Publik | `{ school_unit_id: number, academic_year: string, full_name: string, gender: string, birth_place?: string, birth_date?: string, guardian_name: string, guardian_phone: string }` | `{ id: number, registration_number: string }` |
| `POST` | `/public/ppdb/registrants/:id/documents`| Publik | `{ document_type: string, file_url: string }` | `{ id: number, document_type: string }` |
| `POST` | `/public/ppdb/registrants/:id/submit`| Publik | - | `{ id: number, status: 'submitted' }` |
| `GET` | `/public/ppdb/registrants/:id/status`| Publik | - | `{ registrant: object, status: string, payment: object }` |
| `POST` | `/public/consultation/tickets`| Publik | `{ school_unit_id: number, name: string, contact: string, subject: string, content: string }` | `{ id: number, ticket_number: string }` |
| `POST` | `/public/consultation/bookings`| Publik | `{ school_unit_id: number, name: string, contact: string, scheduled_at: string }` | `{ id: number, status: 'booked' }` |
| `GET` | `/public/articles` | Publik | Query: `?page=&limit=` | `{ articles: array }` |
| `GET` | `/public/articles/:slug`| Publik | - | `{ article: object, comments: array }` |
| `POST` | `/public/articles/:id/comments`| Publik | `{ commenter_name: string, content: string }` | `{ id: number, status: 'pending' }` |

### 3.2 Endpoint CMS Admin (Konsumsi Core Portal di `core.aldeposibs.com`)
| Method | Endpoint Path | Izin / Role Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `PUT` | `/admin/hero` | `superadmin_cms`, `admin_konten` | `{ headline: string, subheadline: string, cta_button_label?: string, cta_button_url?: string }` | `{ success: boolean }` |
| `POST` | `/admin/news` | `superadmin_cms`, `admin_konten` | `{ title: string, content: string, excerpt?: string, cover_image_url?: string, is_published?: boolean }` | `{ id: number, slug: string }` |
| `GET` | `/admin/ppdb/registrants`| `superadmin_cms`, `admin_ppdb` | Query: `?status=&academic_year=&search=&page=&limit=` | `{ registrants: array, pagination: object }` |
| `PATCH`| `/admin/ppdb/registrants/:id/status`| `superadmin_cms`, `admin_ppdb`| `{ status: 'verified'\|'scheduled'\|'passed'\|'failed'\|'enrolled', note?: string }` | `{ id: number, status: string }` |
| `PATCH`| `/admin/ppdb/payments/:id/verify`| `superadmin_cms`, `admin_ppdb`| `{ payment_status: 'paid'\|'failed' }` | `{ id: number, payment_status: string }` |
| `GET` | `/admin/consultation/tickets`| `superadmin_cms`, `admin_konsultasi`| Query: `?status=` | `{ tickets: array }` |
| `POST` | `/admin/consultation/tickets/:id/reply`| `superadmin_cms`, `admin_konsultasi`| `{ content: string }` | `{ reply_id: number }` |
| `PATCH`| `/admin/articles/:id/publish`| `superadmin_cms`, `moderator_artikel`| `{ is_published: boolean }` | `{ id: number, status: string }` |
| `PATCH`| `/admin/articles/comments/:id/moderate`| `superadmin_cms`, `moderator_artikel`| `{ status: 'approved'\|'rejected' }` | `{ id: number, status: string }` |
| `PUT` | `/admin/site-settings` | `superadmin_cms` | `{ settings: object }` | `{ success: boolean }` |

### 3.3 Webhooks Ingest
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `POST` | `/webhooks/ppdb-status` | `X-Webhook-Signature` | `{ registrant_id: number, status: string, note?: string }` | `{ received: boolean }` |

---

## 4. Workflows & State Machines

- **PPDB Online Multi-Step Flow:** Calon santri mengisi form bio $\rightarrow$ upload berkas KK/Akta $\rightarrow$ pilih jalur/jadwal $\rightarrow$ submit $\rightarrow$ status `submitted` $\rightarrow$ verifikasi panitia $\rightarrow$ `verified` $\rightarrow$ ikut tes seleksi $\rightarrow$ dinyatakan `passed` (lulus) $\rightarrow$ import otomatis ke database Induk `akademik.students` saat registrasi ulang menjadi `enrolled`.
- **PPDB Payment Flow:** `pending -> paid` *(via Payment Gateway callback atau verifikasi transfer manual panitia)*.
- **Moderasi Artikel Publikasi:** Penulis draf artikel $\rightarrow$ `draft` $\rightarrow$ ajukan review $\rightarrow$ `in_review` $\rightarrow$ Moderator mengecek etika konten $\rightarrow$ `published` (tampil publik di website).
- **Konsultasi & Kunjungan:** Form visit kampus $\rightarrow$ status `booked` $\rightarrow$ Customer Service mengonfirmasi & kirim tautan Zoom / jadwal fisik $\rightarrow$ `confirmed` $\rightarrow$ visit selesai $\rightarrow$ `done`.

---

## 5. UI Routes & Struktur Frontend

### 5.1 Website Publik SSR (`apps/website-utama/app/` — Domain `aldeposibs.com`)
| Next.js Route Path | Berkas Halaman / Komponen | Fungsi & Revalidasi SEO |
|---|---|---|
| `/` | `app/page.tsx` | Landing page utama (Hero, Highlights, Statistik Live, Berita Terkini) — `revalidate = 60` |
| `/ppdb` | `app/ppdb/page.tsx` | Wizard 4-Step PPDB Online (Biodata, Dokumen, Jalur, Review & Bayar) |
| `/ppdb/status` | `app/ppdb/status/page.tsx` | Tracking mandiri status seleksi pendaftar via nomor registrasi & WA |

### 5.2 CMS Admin Portal (`apps/core-portal/src/apps/website-utama/` — Domain `core.aldeposibs.com`)
| Core Portal Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/website-utama/dashboard` | `pages/Dashboard.jsx` | Statistik pengunjung web, pendaftar PPDB baru & tiket konsultasi |
| `/website-utama/home` | `pages/KontenBeranda.jsx` | Editor Hero section, headline banner & kartu highlights beranda |
| `/website-utama/staff-profiles` | `pages/ProfilPengajar.jsx` | Kelola direktori foto & profil pengajar |
| `/website-utama/school-life` | `pages/KehidupanSekolah.jsx` | Kelola artikel kehidupan asrama & kegiatan santri |
| `/website-utama/news` | `pages/BeritaPengumuman.jsx` | CRUD berita sekolah, upload cover & publish post |
| `/website-utama/galleries` | `pages/GaleriKegiatan.jsx` | Manajemen album foto kegiatan & dokumentasi |
| `/website-utama/faqs-testimonials`| `pages/FaqTestimoni.jsx` | Kelola tanya-jawab FAQ & kutipan testimoni wali santri |
| `/website-utama/events-accreditations`| `pages/AgendaAkreditasi.jsx` | Kelola agenda kalender terbuka & sertifikat akreditasi |
| `/website-utama/ppdb` | `pages/PpdbAdmin.jsx` | Verifikasi berkas pendaftar, jadwal tes & konfirmasi pembayaran |
| `/website-utama/consultation` | `pages/KonsultasiAdmin.jsx` | Meja helpdesk tiket tanya-jawab & jadwal visit kampus |
| `/website-utama/articles` | `pages/ArtikelModerasi.jsx` | Moderasi artikel opini guru/santri & filter komentar |
| `/website-utama/settings` | `pages/PengaturanCms.jsx` | Konfigurasi tema, hak akses staf CMS & pengaturan SEO sitemap |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi token JWT SSO staf CMS, penarikan data Satuan Pendidikan & profil Yayasan.
  - `kepegawaian`: Mengambil profil pengajar & pimpinan sekolah untuk ditampilkan di direktori staf publik (`staff_profiles`).
  - `keuangan`: Menghubungkan gateway pembayaran formulir PPDB online dengan pos penerimaan pendaftaran.
- **Modul yang Memanggil Website Utama (Consumers):**
  - `akademik`: Mengimpor data pendaftar calon santri yang telah lulus seleksi PPDB (`passed` / `enrolled`) ke tabel data induk siswa `akademik.students`.
  - `manajemen`: Mengambil metrik total pengunjung, statistik konversi pendaftar PPDB, dan reputasi akreditasi untuk dashboard eksekutif.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Sub-Domain Multi-Unit Routing:** Domain publik saat ini berjalan di landing page utama `aldeposibs.com`; routing dinamis per unit jenjang (`smp.aldeposibs.com`, `sma.aldeposibs.com`) didukung via query `school_unit_id` dan rewrite middleware Next.js.
2. **Virtual Tour 360° View:** Kehidupan sekolah & galeri saat ini menampilkan foto resolusi tinggi dan video embed; rendering panorama 360° interaktif masuk dalam roadmap masa depan.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
