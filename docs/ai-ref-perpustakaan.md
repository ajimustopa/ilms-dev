Status: perlu-revisi
Diperbarui: 2026-08-31

# AI-REF: Modul Perpustakaan & Literasi (`perpustakaan`)

> Dokumen referensi teknis modul Perpustakaan untuk AI Agent. Data diambil langsung dari 8 berkas migrasi Knex aktual, router/controller backend, dan router frontend portal. Mencakup 14 fitur sistem (9 fitur PRD asli #163–#171 + 5 fitur perluasan #172–#176).

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/perpustakaan/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/perpustakaan/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/perpustakaan/`
- **Database Engine:** MariaDB 10.5 (`aldepos_perpustakaan` / `u622997391_dbperpustakaan`)
- **Status Implementasi:** `jalan-produksi` (Katalog Buku & Bahan Pustaka Non-Buku, Eksemplar Barcode, Master Anggota Siswa/Guru, Sirkulasi Pinjam/Kembali/Perpanjangan & Denda, Reservasi Koleksi, Buku Hilang/Rusak, Pengingat Jatuh Tempo, OPAC Publik, Laporan Pemanfaatan)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (8 Tabel)

### 2.1 Klasifikasi Kategori & Katalog Koleksi Pustaka

#### `book_categories` (Kategori Klasifikasi Koleksi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `category_name` | `VARCHAR(150)` | NO | - | `UNIQUE` (e.g. "Karya Umum", "Agama Islam", "Sains & Matematika") |
| `category_code` | `VARCHAR(30)` | YES | `NULL` | Kode Klasifikasi DDC (e.g. "2X0", "500") |
| `description` | `TEXT` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `books` (Katalog Buku & Bahan Pustaka Non-Buku) — *Fitur #163 & #172*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `material_type` | `ENUM` | NO | `'book'` | `'book','journal','ebook','magazine','cd','other'` (Fitur #172) |
| `title` | `VARCHAR(255)` | NO | - | Judul Buku / Bahan Pustaka |
| `author` | `VARCHAR(255)` | YES | `NULL` | Penulis / Penyusun |
| `publisher` | `VARCHAR(150)` | YES | `NULL` | Penerbit |
| `publish_year` | `SMALLINT UNSIGNED`| YES | `NULL` | Tahun Terbit |
| `isbn` | `VARCHAR(30)` | YES | `NULL` | ISBN / ISSN |
| `category_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> book_categories(id) SET NULL/CASCADE` |
| `shelf_location` | `VARCHAR(50)` | YES | `NULL` | Lokasi Rak Standar (e.g. "RAK-A-01") |
| `cover_image_url`| `VARCHAR(255)` | YES | `NULL` | URL Foto Sampul |
| `total_copies` | `INT UNSIGNED` | NO | `0` | Jumlah Eksemplar Terdaftar |
| `source_type` | `ENUM` | YES | `NULL` | `'purchase','donation','other'` |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_books_title (title)`, `idx_books_school_type (satuan_pendidikan_id, material_type)`

#### `book_copies` (Eksemplar Fisik Koleksi) — *Fitur #164*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `book_id` | `BIGINT UNSIGNED` | NO | - | `FK -> books(id) CASCADE/CASCADE` |
| `copy_code` | `VARCHAR(50)` | YES | `NULL` | `UNIQUE` (Barcode / No. Eksemplar e.g. "B-0012-01") |
| `condition_status`| `ENUM` | NO | `'good'` | `'good','damaged','lost'` |
| `circulation_status`| `ENUM` | NO | `'available'` | `'available','borrowed','reserved','under_repair'` |
| `shelf_location` | `VARCHAR(50)` | YES | `NULL` | Lokasi Rak Spesifik |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_copies_book_status (book_id, circulation_status)`

---

### 2.2 Keanggotaan & Sirkulasi Peminjaman

#### `library_members` (Master Anggota Perpustakaan) — *Fitur #165*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `ref_type` | `ENUM` | NO | - | `'student','employee'` |
| `ref_id` | `BIGINT UNSIGNED` | NO | - | ID Siswa (Akademik) / Pegawai (Kepegawaian) |
| `member_card_number` | `VARCHAR(50)` | YES | `NULL` | `UNIQUE` (No. Kartu Anggota Perpustakaan) |
| `card_valid_until` | `DATE` | YES | `NULL` | Masa Berlaku Kartu |
| `max_loan_limit` | `SMALLINT UNSIGNED`| NO | `3` | Batas Maksimal Buku yang Dipinjam Bersamaan |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `registered_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Petugas Pustakawan (Core Service) |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_member_ref (ref_type, ref_id, satuan_pendidikan_id)`

#### `book_loans` (Transaksi Peminjaman & Pengembalian) — *Fitur #166, #167, #168, #174*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `book_copy_id` | `BIGINT UNSIGNED` | NO | - | `FK -> book_copies(id) CASCADE/CASCADE` |
| `member_id` | `BIGINT UNSIGNED` | NO | - | `FK -> library_members(id) CASCADE/CASCADE` |
| `loan_status` | `ENUM` | NO | `'borrowed'` | `'borrowed','returned','overdue','lost'` |
| `borrowed_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `due_at` | `DATETIME` | NO | - | Batas Tanggal Jatuh Tempo |
| `returned_at` | `TIMESTAMP` | YES | `NULL` | Tanggal Realisasi Pengembalian |
| `extended_count`| `SMALLINT UNSIGNED`| NO | `0` | Jumlah Kali Perpanjangan |
| `fine_amount` | `DECIMAL(12,2)` | NO | `0.00` | Akumulasi Denda Keterlambatan (Rp) |
| `fine_payment_status`| `ENUM` | NO | `'none'` | `'none','unpaid','paid','waived'` |
| `borrowed_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Petugas Peminjaman |
| `returned_to` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Petugas Pengembalian |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_loans_member_status (member_id, loan_status)`, `idx_loans_school_due (satuan_pendidikan_id, due_at)`

---

### 2.3 Reservasi, Buku Hilang/Rusak & Pengingat

#### `book_reservations` (Antrean Booking Koleksi) — *Fitur #170*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `satuan_pendidikan_id` | `BIGINT UNSIGNED` | NO | - | - |
| `book_id` | `BIGINT UNSIGNED` | NO | - | `FK -> books(id) CASCADE/CASCADE` |
| `member_id` | `BIGINT UNSIGNED` | NO | - | `FK -> library_members(id) CASCADE/CASCADE` |
| `reservation_status` | `ENUM` | NO | `'waiting'` | `'waiting','ready_to_pickup','fulfilled','cancelled','expired'` |
| `reserved_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `notified_at` | `TIMESTAMP` | YES | `NULL` | Waktu Notifikasi Buku Tersedia |
| `expires_at` | `TIMESTAMP` | YES | `NULL` | Batas Waktu Pengambilan |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `lost_damaged_reports` (Laporan Buku Hilang / Rusak) — *Fitur #173 (Perluasan)*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `book_copy_id` | `BIGINT UNSIGNED` | NO | - | `FK -> book_copies(id) CASCADE/CASCADE` |
| `loan_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> book_loans(id) SET NULL/CASCADE` |
| `condition_status` | `ENUM` | NO | - | `'lost','damaged'` |
| `description` | `TEXT` | YES | `NULL` | Uraian Kronologi Kerusakan/Kehilangan |
| `replacement_fee` | `DECIMAL(12,2)` | YES | `NULL` | Biaya Ganti Rugi Fisik / Denda Penggantian |
| `fee_payment_status`| `ENUM` | NO | `'none'` | `'none','unpaid','paid','waived'` |
| `reported_by` | `BIGINT UNSIGNED` | YES | `NULL` | User ID Pelapor / Pustakawan |
| `resolution_status` | `ENUM` | NO | `'open'` | `'open','resolved'` |
| `resolved_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

#### `loan_reminders` (Log Notifikasi Pengingat Jatuh Tempo) — *Fitur #175 (Perluasan)*
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `loan_id` | `BIGINT UNSIGNED` | NO | - | `FK -> book_loans(id) CASCADE/CASCADE` |
| `member_id` | `BIGINT UNSIGNED` | NO | - | `FK -> library_members(id) CASCADE/CASCADE` |
| `reminder_type` | `ENUM` | NO | - | `'due_soon','overdue','fine_unpaid'` |
| `channel` | `VARCHAR(50)` | YES | `NULL` | `'whatsapp','email','push_notification'` |
| `status` | `ENUM` | NO | `'queued'` | `'queued','sent','failed'` |
| `sent_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |

---

## 3. Kontrak API Ringkas (`/api/v1/perpustakaan`)

### 3.1 Katalog & Eksemplar Koleksi (Buku & Non-Buku)
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/categories` | `perpustakaan.categories.view` | - | `{ categories: array }` |
| `POST` | `/categories` | `perpustakaan.categories.manage` | `{ category_name: string, category_code?: string, description?: string }` | `{ id: number, category_name: string }` |
| `GET` | `/books` | `perpustakaan.books.view` | Query: `?category_id=&material_type=&search=&page=&limit=` | `{ books: array, pagination: object }` |
| `POST` | `/books` | `perpustakaan.books.manage` | `{ title: string, material_type?: string, author?: string, publisher?: string, publish_year?: number, isbn?: string, category_id?: number, shelf_location?: string, cover_image_url?: string }` | `{ id: number, title: string }` |
| `GET` | `/books/:id` | `perpustakaan.books.view` | - | `{ book: object, copies: array }` |
| `PUT` | `/books/:id` | `perpustakaan.books.manage` | `{ title: string, author?: string, publisher?: string, shelf_location?: string }` | `{ id: number, updated: boolean }` |
| `POST` | `/books/:id/copies` | `perpustakaan.books.manage` | `{ copy_code?: string, shelf_location?: string, count?: number }` | `{ added_copies: number }` |

### 3.2 Keanggotaan & Sirkulasi
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/members` | `perpustakaan.members.view` | Query: `?ref_type=&status=&search=&page=&limit=` | `{ members: array, pagination: object }` |
| `POST` | `/members` | `perpustakaan.members.register` | `{ ref_type: 'student'\|'employee', ref_id: number, member_card_number?: string, card_valid_until?: string, max_loan_limit?: number }` | `{ id: number, member_card_number: string }` |
| `GET` | `/members/:id` | `perpustakaan.members.view` | - | `{ member: object, active_loans: array, loan_history: array }` |
| `GET` | `/members/:id/loan-history`| `perpustakaan.members.view` | Query: `?page=&limit=` | `{ loans: array, pagination: object }` *(Fitur #174)* |
| `GET` | `/loans` | `perpustakaan.loans.view` | Query: `?status=&member_id=&due_date=` | `{ loans: array }` |
| `POST` | `/loans` | `perpustakaan.loans.create` | `{ member_id: number, copy_code_or_id: string\|number, due_at?: string }` | `{ id: number, due_at: string }` |
| `PATCH`| `/loans/:id/extend` | `perpustakaan.loans.extend` | `{ additional_days?: number }` | `{ id: number, new_due_at: string, extended_count: number }` |
| `PATCH`| `/loans/:id/return` | `perpustakaan.loans.return` | `{ condition_status?: 'good'\|'damaged'\|'lost', fine_amount?: number }` | `{ id: number, returned_at: string, fine_amount: number }` |
| `PATCH`| `/loans/:id/pay-fine`| `perpustakaan.loans.pay_fine` | `{ fine_payment_status: 'paid'\|'waived' }` | `{ id: number, fine_payment_status: string }` |

### 3.3 Reservasi, Buku Hilang & Reminders
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/reservations` | `perpustakaan.reservations.view`| Query: `?status=&book_id=` | `{ reservations: array }` |
| `POST` | `/reservations` | `perpustakaan.reservations.create`| `{ member_id: number, book_id: number }` | `{ id: number, reservation_status: 'waiting' }` |
| `PATCH`| `/reservations/:id/cancel`| `perpustakaan.reservations.manage`| - | `{ id: number, status: 'cancelled' }` |
| `GET` | `/lost-damaged-reports`| `perpustakaan.lost_damaged.view`| Query: `?resolution_status=` | `{ reports: array }` *(Fitur #173)* |
| `POST` | `/lost-damaged-reports`| `perpustakaan.lost_damaged.report`| `{ book_copy_id: number, loan_id?: number, condition_status: 'lost'\|'damaged', description: string, replacement_fee?: number }` | `{ id: number }` |
| `PATCH`| `/lost-damaged-reports/:id/resolve`| `perpustakaan.lost_damaged.resolve`| `{ resolution_notes?: string }` | `{ id: number, resolution_status: 'resolved' }` |
| `POST` | `/loan-reminders/run` | `perpustakaan.reminders.run` | - | `{ processed_count: number, dispatched_reminders: array }` *(Fitur #175)* |
| `GET` | `/reports/circulation` | `perpustakaan.reports.view` | Query: `?start_date=&end_date=` | `{ total_borrowed: number, total_returned: number, total_overdue: number }` |
| `GET` | `/reports/popular-books`| `perpustakaan.reports.view` | Query: `?limit=` | `{ popular_books: array }` *(Fitur #176)* |
| `GET` | `/reports/utilization` | `perpustakaan.reports.view` | - | `{ monthly_trends: array, top_borrowers: array }` *(Fitur #176)* |

### 3.4 OPAC Publik & Parent-Facing
| Method | Endpoint Path | Izin Akses | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `GET` | `/opac/search` | Publik (Tanpa Auth) | Query: `?q=&category_id=&material_type=&page=&limit=` | `{ results: array, total: number }` *(Fitur #169)* |
| `GET` | `/opac/books/:id` | Publik (Tanpa Auth) | - | `{ book: object, available_copies: number, shelf_location: string }` |
| `GET` | `/parent-facing/students/:student_ref_id/loan-history`| `X-API-Key` (Portal Orangtua) | Query: `?page=&limit=` | `{ active_loans: array, returned_loans: array, unpaid_fines: number }` |

---

## 4. Workflows & State Machines

- **Sirkulasi Peminjaman Buku:** Member scan kartu anggota $\rightarrow$ scan barcode eksemplar buku $\rightarrow$ sistem memvalidasi: (1) status member aktif, (2) batas kuota peminjaman (`max_loan_limit`), (3) ketiadaan tunggakan denda $\rightarrow$ status eksemplar menjadi `borrowed` $\rightarrow$ catat batas tanggal jatuh tempo (`due_at`).
- **Pengembalian & Denda Keterlambatan:** Pustakawan scan barcode eksemplar $\rightarrow$ jika melewati `due_at`, sistem menghitung tarif denda per hari $\rightarrow$ eksemplar kembali `available` $\rightarrow$ status peminjaman menjadi `returned`.
- **Alur Reservasi Koleksi:** Santri/Guru memesan buku yang sedang dipinjam $\rightarrow$ status `waiting` $\rightarrow$ saat buku dikembalikan ke perpustakaan, sistem mengalihkan status menjadi `ready_to_pickup` dan mengirim notifikasi $\rightarrow$ peminjam mengambil buku $\rightarrow$ `fulfilled` (atau `expired` jika melewati batas waktu).
- **Pengingat Jatuh Tempo Otomatis:** Job background `/loan-reminders/run` memindai peminjaman mendekati jatuh tempo (H-1) dan peminjaman lewat batas $\rightarrow$ mengantrekan reminder ke tabel `loan_reminders` $\rightarrow$ kirim notifikasi WhatsApp/Email ke santri/orang tua.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/perpustakaan/login` | `src/apps/perpustakaan/pages/Login.jsx` | Login form staf & kepala perpustakaan |
| `/perpustakaan/dashboard` | `src/apps/perpustakaan/pages/Dashboard.jsx` | Statistik buku, sirkulasi harian, grafik peminjaman & alert keterlambatan |
| `/perpustakaan/catalog` *(alias: `/perpustakaan/katalog`)* | `src/apps/perpustakaan/pages/Katalog.jsx` | Manajemen katalog buku, bahan pustaka non-buku, kategori & cetak barcode eksemplar |
| `/perpustakaan/circulation` *(alias: `/perpustakaan/sirkulasi`)* | `src/apps/perpustakaan/pages/Sirkulasi.jsx` | Meja sirkulasi: scan barcode pinjam/kembali, perpanjangan, hitung denda & buku hilang |
| `/perpustakaan/members` *(alias: `/perpustakaan/anggota`)* | `src/apps/perpustakaan/pages/Anggota.jsx` | Pendaftaran anggota santri/guru, cetak kartu anggota & riwayat peminjaman |
| `/perpustakaan/reservations` *(alias: `/perpustakaan/reservasi`)* | `src/apps/perpustakaan/pages/Reservasi.jsx` | Monitoring antrean reservasi buku & notifikasi pengambilan |
| `/perpustakaan/opac` | `src/apps/perpustakaan/pages/Opac.jsx` | Katalog pencarian publik (OPAC) untuk santri, guru & umum |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `core`: Validasi token JWT SSO, data Satuan Pendidikan & profil Yayasan, audit log.
  - `akademik`: Data siswa & santri aktif untuk registrasi keanggotaan perpustakaan (`ref_type: 'student'`).
  - `kepegawaian`: Data guru & staf untuk registrasi keanggotaan perpustakaan (`ref_type: 'employee'`).
- **Modul yang Memanggil Perpustakaan (Consumers):**
  - `portal-orangtua`: Endpoint parent-facing (`/api/v1/perpustakaan/parent-facing/students/:student_ref_id/loan-history`) untuk monitoring buku pinjaman & denda santri.
  - `manajemen`: Agregat laporan tingkat literasi santri, buku terpopuler, dan utilisasi perpustakaan sekolah.

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **Digital Library / E-Reader Viewer:** Katalog saat ini telah mendukung klasifikasi e-book & URL dokumen pustaka digital; viewer flipbook / PDF reader interaktif in-app masuk dalam roadmap lanjutan.
2. **RFID Gate / Self-Service Kiosk:** Sirkulasi saat ini mengandalkan barcode scanner 1D/2D; integrasi self-service checkout kiosk RFID gate masuk dalam roadmap otomasi fisik perpustakaan.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 -->
