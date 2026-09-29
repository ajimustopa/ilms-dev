Status: perlu-revisi
Diperbarui: 2026-08-24

# erd-perpustakaan.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 3 (prinsip arsitektur global) & `rancangan-perpustakaan.md`
> Bagian 4–5 (ruang lingkup 14 fitur & keputusan terbuka).
> Database: MariaDB 10.5. Query builder: Knex.js. PK default `id BIGINT UNSIGNED AUTO_INCREMENT`,
> semua tabel punya `created_at`/`updated_at TIMESTAMP` (tidak ditulis ulang di tiap tabel di
> bawah supaya ringkas — anggap ada di semua tabel kecuali tabel log yang disebutkan
> *append-only*).
> **Status: draft — 5 poin di `rancangan-perpustakaan.md` §5 masih terbuka.** Tabel yang
> tergantung poin terbuka ditandai eksplisit di bawah; jangan jalankan migration produksi sampai
> poin-poin itu dikonfirmasi (migration di lokal untuk pengembangan tetap boleh jalan sesuai
> `panduan-pengembangan-perpustakaan.md`).
>
> **Tidak ada FK fisik lintas database** ke Core Service/Akademik/Kepegawaian (prinsip arsitektur
> global §3 poin 1) — kolom `ref_id`/`*_id` yang menunjuk ke modul lain adalah ID biasa, divalidasi
> lewat pemanggilan in-process ke instance Knex modul pemiliknya (lihat
> `rancangan-perpustakaan.md` §2).

## 0. Keputusan Desain Tambahan (di Luar 5 Poin Terbuka)

Selain 5 keputusan terbuka di `rancangan-perpustakaan.md` §5 (yang **wajib** dikonfirmasi
developer), ada satu keputusan desain teknis yang diambil mengikuti preseden Core Service (ERD
Core Service §0 menggabungkan fitur #5 & #13 jadi satu tabel `activity_logs`):

| # | Keputusan | Alasan |
|---|---|---|
| A | Fitur #163 "Katalog buku" dan #172 "Manajemen bahan pustaka non-buku" **digabung** jadi satu tabel `books` dengan kolom `material_type` sebagai pembeda | Kedua fitur sama-sama "kelola satu item koleksi perpustakaan" — field yang dibutuhkan (judul, penulis/pembuat, kategori, stok, lokasi) hampir identik, menggabungkan menghindari duplikasi skema dan membuat pencarian OPAC (fitur #169) tidak perlu query dua tabel |
| B | Fitur #166 "Peminjaman buku" dan #167 "Pengembalian & denda" **digabung** jadi satu tabel `book_loans` yang menyimpan seluruh siklus (pinjam → kembali → denda) dalam satu baris, dibedakan lewat kolom `loan_status` | Satu transaksi peminjaman punya satu siklus hidup; memisah jadi dua tabel butuh join setiap kali menampilkan status pinjaman, dan riwayat peminjaman anggota (fitur #174) jadi lebih sederhana dari satu tabel |
| C | Setiap eksemplar fisik buku dilacak di tabel terpisah `book_copies` (bukan cuma kolom `stock` di `books`) | Diperlukan supaya `book_loans` bisa menunjuk ke eksemplar spesifik (kondisi, lokasi rak per eksemplar bisa beda), dan fitur #173 (buku hilang/rusak) butuh melacak eksemplar mana yang bermasalah, bukan cuma judul bukunya |

## 1. Daftar Entitas (10 Tabel)

| Modul (rancangan-perpustakaan.md §4) | Tabel | `satuan_pendidikan_id`? |
|---|---|---|
| Katalog | `book_categories` | Tidak (referensi global per Yayasan) |
| Katalog | `books` | **Ya** — lihat keputusan terbuka §5 poin 1 |
| Katalog | `book_copies` | Tidak langsung (ikut `books`) |
| Anggota | `library_members` | **Ya** |
| Sirkulasi | `book_loans` | **Ya** |
| Sirkulasi | `book_reservations` | **Ya** |
| Sirkulasi | `lost_damaged_reports` | Tidak langsung (ikut `book_copies` → `books`) |
| Notifikasi | `loan_reminders` (append-only) | Tidak langsung (ikut `book_loans`) |
| Laporan | `library_visit_logs` **(tentatif — lihat keputusan terbuka §5 poin 3)** | **Ya** |
| Integrasi | *(fitur #171 tidak punya tabel sendiri — query lintas `library_members` + `book_loans`)* | — |

## 2. Detail Tabel

### 2.1 `book_categories`
*(Fitur #164 — Referensi & kategori buku)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| category_name | VARCHAR(150) | NOT NULL, UNIQUE |
| category_code | VARCHAR(30) | NULLABLE — mis. kode klasifikasi (DDC) kalau dipakai |
| description | TEXT | NULLABLE |

### 2.2 `books`
*(Fitur #163 "Katalog buku" + #172 "Bahan pustaka non-buku" — Keputusan Desain A)*
Katalog utama seluruh koleksi (buku maupun non-buku).

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| satuan_pendidikan_id | BIGINT UNSIGNED | NOT NULL — **wajib per prinsip global §3 poin 2, tunduk pada keputusan terbuka §5 poin 1** soal apakah boleh koleksi bersama Yayasan (kalau ya, kolom ini jadi NULLABLE = koleksi bersama) |
| material_type | ENUM('book','journal','ebook','magazine','cd','other') | NOT NULL, DEFAULT 'book' |
| title | VARCHAR(255) | NOT NULL |
| author | VARCHAR(255) | NULLABLE — pengarang/pembuat |
| publisher | VARCHAR(150) | NULLABLE |
| publish_year | SMALLINT UNSIGNED | NULLABLE |
| isbn | VARCHAR(30) | NULLABLE — hanya relevan untuk `material_type='book'` |
| category_id | BIGINT UNSIGNED | FK → `book_categories.id`, NULLABLE |
| shelf_location | VARCHAR(50) | NULLABLE |
| cover_image_url | VARCHAR(255) | NULLABLE |
| total_copies | INT UNSIGNED | NOT NULL, DEFAULT 0 — jumlah eksemplar; sinkron dengan hitung baris `book_copies` |
| source_type | ENUM('purchase','donation','other') | NULLABLE — sumber perolehan |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' — nonaktifkan tanpa hapus data histori peminjaman |

`INDEX (title)`, `INDEX (satuan_pendidikan_id, material_type)` — dipakai OPAC (fitur #169) untuk
pencarian & filter.

### 2.3 `book_copies`
*(Pendukung Fitur #163, #166, #167, #173 — Keputusan Desain C)*
Eksemplar fisik per judul.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| book_id | BIGINT UNSIGNED | FK → `books.id`, NOT NULL |
| copy_code | VARCHAR(50) | NULLABLE, UNIQUE — nomor inventaris/barcode eksemplar |
| condition_status | ENUM('good','damaged','lost') | NOT NULL, DEFAULT 'good' |
| circulation_status | ENUM('available','borrowed','reserved','under_repair') | NOT NULL, DEFAULT 'available' |
| shelf_location | VARCHAR(50) | NULLABLE — override lokasi rak `books.shelf_location` kalau eksemplar ini disimpan beda tempat |

`INDEX (book_id, circulation_status)` — dipakai cek ketersediaan cepat.

### 2.4 `library_members`
*(Fitur #165 — Data anggota perpustakaan)*
Representasi lokal anggota, menunjuk balik ke `students`/`employees` tanpa FK fisik.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| satuan_pendidikan_id | BIGINT UNSIGNED | NOT NULL |
| ref_type | ENUM('student','employee') | NOT NULL |
| ref_id | BIGINT UNSIGNED | NOT NULL — ID di database Akademik (`students.id`) atau Kepegawaian (`employees.id`), bukan FK fisik |
| member_card_number | VARCHAR(50) | NULLABLE, UNIQUE |
| card_valid_until | DATE | NULLABLE |
| max_loan_limit | SMALLINT UNSIGNED | NOT NULL, DEFAULT 3 |
| status | ENUM('active','inactive') | NOT NULL, DEFAULT 'active' |
| registered_by | BIGINT UNSIGNED | NULLABLE — `users.id` (Core Service) Pustakawan yang mendaftarkan |

`UNIQUE (ref_type, ref_id, satuan_pendidikan_id)` — satu siswa/pegawai di satu Satuan Pendidikan
tidak boleh punya kartu anggota dobel.

### 2.5 `book_loans`
*(Fitur #166 "Peminjaman" + #167 "Pengembalian & denda" — Keputusan Desain B)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| satuan_pendidikan_id | BIGINT UNSIGNED | NOT NULL |
| book_copy_id | BIGINT UNSIGNED | FK → `book_copies.id`, NOT NULL |
| member_id | BIGINT UNSIGNED | FK → `library_members.id`, NOT NULL |
| loan_status | ENUM('borrowed','returned','overdue','lost') | NOT NULL, DEFAULT 'borrowed' |
| borrowed_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| due_at | TIMESTAMP | NOT NULL |
| returned_at | TIMESTAMP | NULLABLE |
| extended_count | SMALLINT UNSIGNED | NOT NULL, DEFAULT 0 — jumlah kali diperpanjang |
| fine_amount | DECIMAL(12,2) | NOT NULL, DEFAULT 0 — *tarif dihitung manual/aturan sederhana, lihat keputusan terbuka §5 poin terkait denda* |
| fine_payment_status | ENUM('none','unpaid','paid','waived') | NOT NULL, DEFAULT 'none' |
| borrowed_by | BIGINT UNSIGNED | NULLABLE — `users.id` (Core Service) Pustakawan yang memproses pinjam |
| returned_to | BIGINT UNSIGNED | NULLABLE — `users.id` Pustakawan yang memproses kembali |

`INDEX (member_id, loan_status)`, `INDEX (satuan_pendidikan_id, due_at)` — dipakai job pengingat
jatuh tempo (fitur #175) dan riwayat anggota (fitur #174).

### 2.6 `book_reservations`
*(Fitur #168 — Reservasi/booking buku)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| satuan_pendidikan_id | BIGINT UNSIGNED | NOT NULL |
| book_id | BIGINT UNSIGNED | FK → `books.id`, NOT NULL — reservasi di level judul, eksemplar ditentukan saat buku tersedia |
| member_id | BIGINT UNSIGNED | FK → `library_members.id`, NOT NULL |
| reservation_status | ENUM('waiting','ready_to_pickup','fulfilled','cancelled','expired') | NOT NULL, DEFAULT 'waiting' |
| reserved_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| notified_at | TIMESTAMP | NULLABLE — kapan anggota diberi tahu bukunya siap diambil |
| expires_at | TIMESTAMP | NULLABLE — batas waktu pengambilan setelah `ready_to_pickup` |

### 2.7 `lost_damaged_reports`
*(Fitur #173 — Buku hilang/rusak)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| book_copy_id | BIGINT UNSIGNED | FK → `book_copies.id`, NOT NULL |
| loan_id | BIGINT UNSIGNED | NULLABLE — FK → `book_loans.id`, terisi kalau dilaporkan saat masih dipinjam |
| condition_status | ENUM('lost','damaged') | NOT NULL |
| description | TEXT | NULLABLE |
| replacement_fee | DECIMAL(12,2) | NULLABLE |
| fee_payment_status | ENUM('none','unpaid','paid','waived') | NOT NULL, DEFAULT 'none' |
| reported_by | BIGINT UNSIGNED | NULLABLE — `users.id` Pustakawan pelapor |
| resolution_status | ENUM('open','resolved') | NOT NULL, DEFAULT 'open' |
| resolved_at | TIMESTAMP | NULLABLE |

### 2.8 `loan_reminders`
*(Fitur #175 — Pengingat jatuh tempo & denda; **append-only**, tidak ada `updated_at`)*

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| loan_id | BIGINT UNSIGNED | FK → `book_loans.id`, NOT NULL |
| member_id | BIGINT UNSIGNED | FK → `library_members.id`, NOT NULL |
| reminder_type | ENUM('due_soon','overdue','fine_unpaid') | NOT NULL |
| channel | VARCHAR(50) | NULLABLE — mis. `whatsapp`/`email`, diisi setelah modul Komunikasi & Notifikasi ada |
| status | ENUM('queued','sent','failed') | NOT NULL, DEFAULT 'queued' |
| sent_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2.9 `library_visit_logs` *(TENTATIF — lihat `rancangan-perpustakaan.md` §5 poin 3)*
*(Fitur #176 — Statistik pemanfaatan)*
Draf sementara; jangan implementasikan di backend sebelum mekanisme pencatatan kunjungan
dikonfirmasi developer. Kalau diputuskan tidak perlu, fitur #176 cukup pakai agregasi
`book_loans`.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| satuan_pendidikan_id | BIGINT UNSIGNED | NOT NULL |
| member_id | BIGINT UNSIGNED | NULLABLE — kosong kalau pengunjung tidak teridentifikasi |
| visit_purpose | VARCHAR(100) | NULLABLE |
| visited_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

## 3. Skrip SQL — Migration Awal (Lokal)

> Skrip ini untuk **database lokal `perpustakaan_local`** (lihat
> `panduan-pengembangan-perpustakaan.md` Tahap 2 untuk langkah pembuatan database & user).
> Tabel `library_visit_logs` (§2.9) **tidak disertakan** dalam skrip ini sampai keputusan terbuka
> dikonfirmasi — tambahkan migration terpisah nanti kalau jadi dipakai.

```sql
SET FOREIGN_KEY_CHECKS = 0;

-- 1. book_categories
CREATE TABLE book_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(150) NOT NULL UNIQUE,
  category_code VARCHAR(30) NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. books
CREATE TABLE books (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satuan_pendidikan_id BIGINT UNSIGNED NOT NULL,
  material_type ENUM('book','journal','ebook','magazine','cd','other') NOT NULL DEFAULT 'book',
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NULL,
  publisher VARCHAR(150) NULL,
  publish_year SMALLINT UNSIGNED NULL,
  isbn VARCHAR(30) NULL,
  category_id BIGINT UNSIGNED NULL,
  shelf_location VARCHAR(50) NULL,
  cover_image_url VARCHAR(255) NULL,
  total_copies INT UNSIGNED NOT NULL DEFAULT 0,
  source_type ENUM('purchase','donation','other') NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_books_title (title),
  INDEX idx_books_school_type (satuan_pendidikan_id, material_type),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES book_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. book_copies
CREATE TABLE book_copies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT UNSIGNED NOT NULL,
  copy_code VARCHAR(50) NULL UNIQUE,
  condition_status ENUM('good','damaged','lost') NOT NULL DEFAULT 'good',
  circulation_status ENUM('available','borrowed','reserved','under_repair') NOT NULL DEFAULT 'available',
  shelf_location VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_copies_book_status (book_id, circulation_status),
  CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. library_members
CREATE TABLE library_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satuan_pendidikan_id BIGINT UNSIGNED NOT NULL,
  ref_type ENUM('student','employee') NOT NULL,
  ref_id BIGINT UNSIGNED NOT NULL,
  member_card_number VARCHAR(50) NULL UNIQUE,
  card_valid_until DATE NULL,
  max_loan_limit SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  registered_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member_ref (ref_type, ref_id, satuan_pendidikan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. book_loans
CREATE TABLE book_loans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satuan_pendidikan_id BIGINT UNSIGNED NOT NULL,
  book_copy_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  loan_status ENUM('borrowed','returned','overdue','lost') NOT NULL DEFAULT 'borrowed',
  borrowed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at TIMESTAMP NOT NULL,
  returned_at TIMESTAMP NULL,
  extended_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  fine_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  fine_payment_status ENUM('none','unpaid','paid','waived') NOT NULL DEFAULT 'none',
  borrowed_by BIGINT UNSIGNED NULL,
  returned_to BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_loans_member_status (member_id, loan_status),
  INDEX idx_loans_school_due (satuan_pendidikan_id, due_at),
  CONSTRAINT fk_loans_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies(id),
  CONSTRAINT fk_loans_member FOREIGN KEY (member_id) REFERENCES library_members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. book_reservations
CREATE TABLE book_reservations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  satuan_pendidikan_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  reservation_status ENUM('waiting','ready_to_pickup','fulfilled','cancelled','expired') NOT NULL DEFAULT 'waiting',
  reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES books(id),
  CONSTRAINT fk_reservations_member FOREIGN KEY (member_id) REFERENCES library_members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. lost_damaged_reports
CREATE TABLE lost_damaged_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_copy_id BIGINT UNSIGNED NOT NULL,
  loan_id BIGINT UNSIGNED NULL,
  condition_status ENUM('lost','damaged') NOT NULL,
  description TEXT NULL,
  replacement_fee DECIMAL(12,2) NULL,
  fee_payment_status ENUM('none','unpaid','paid','waived') NOT NULL DEFAULT 'none',
  reported_by BIGINT UNSIGNED NULL,
  resolution_status ENUM('open','resolved') NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ldr_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies(id),
  CONSTRAINT fk_ldr_loan FOREIGN KEY (loan_id) REFERENCES book_loans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. loan_reminders (append-only)
CREATE TABLE loan_reminders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  reminder_type ENUM('due_soon','overdue','fine_unpaid') NOT NULL,
  channel VARCHAR(50) NULL,
  status ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminders_loan FOREIGN KEY (loan_id) REFERENCES book_loans(id),
  CONSTRAINT fk_reminders_member FOREIGN KEY (member_id) REFERENCES library_members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. Seed Data Dummy (Lokal)

```sql
INSERT INTO book_categories (category_name, category_code, description) VALUES
  ('Fiksi', 'FIC', 'Novel dan cerita fiksi'),
  ('Pelajaran', 'PEL', 'Buku pendamping mata pelajaran'),
  ('Referensi', 'REF', 'Ensiklopedia, kamus, dan buku referensi');

-- satuan_pendidikan_id = 1 mengikuti seed dummy Core Service (school_units id 1 & 2)
INSERT INTO books (satuan_pendidikan_id, material_type, title, author, publisher, publish_year, isbn, category_id, shelf_location, total_copies, source_type, status) VALUES
  (1, 'book', 'Laskar Pelangi', 'Andrea Hirata', 'Bentang Pustaka', 2005, '9789793062792', 1, 'A1-01', 3, 'purchase', 'active'),
  (1, 'book', 'Matematika Kelas 6', 'Tim Penulis', 'Erlangga', 2022, '9786020000000', 2, 'B2-04', 5, 'purchase', 'active');

INSERT INTO book_copies (book_id, copy_code, condition_status, circulation_status, shelf_location) VALUES
  (1, 'LP-001', 'good', 'available', 'A1-01'),
  (1, 'LP-002', 'good', 'available', 'A1-01'),
  (1, 'LP-003', 'good', 'available', 'A1-01'),
  (2, 'MTK6-001', 'good', 'available', 'B2-04');

-- ref_id merujuk ke id dummy di database Akademik/Kepegawaian (isi sesuai seed modul masing-masing)
INSERT INTO library_members (satuan_pendidikan_id, ref_type, ref_id, member_card_number, max_loan_limit, status) VALUES
  (1, 'student', 1, 'ANG-0001', 3, 'active'),
  (1, 'employee', 1, 'ANG-0002', 5, 'active');
```

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | ERD draft pertama dibuat: 9 tabel inti + 1 tabel tentatif (`library_visit_logs`). Keputusan desain A/B/C (penggabungan tabel) dicatat di Bagian 0. Menunggu konfirmasi 5 poin keputusan terbuka di `rancangan-perpustakaan.md` §5 sebelum dianggap final. |

*(Tambahkan baris baru di atas setiap ada perubahan skema — jangan hapus riwayat lama.)*
