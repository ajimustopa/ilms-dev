# api-contract-perpustakaan.md

> Kontrak endpoint REST API resmi untuk modul **Perpustakaan**. Mengikuti pola
> `api-contract-coreservice.md`. Menjadi acuan implementasi backend
> `apps/api-backend/src/modules/perpustakaan/` dan konsumsi oleh Portal Orangtua (fitur #171) &
> Pengelolaan (dashboard agregat, fitur #176).

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/perpustakaan`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/perpustakaan`
- **Lokal Development:** `http://localhost:3000/api/v1/perpustakaan`

### 1.2 Skema Autentikasi & Otorisasi

1. **Bearer Token (JWT) — untuk Pengguna (Pustakawan, Anggota, Admin):**
   ```http
   Authorization: Bearer <access_token>
   ```
   Token diterbitkan Core Service (`POST /api/v1/core/auth/login`), diverifikasi in-process oleh
   modul Perpustakaan (import `CORE_JWT_SECRET`, tidak perlu request jaringan ke Core).

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service:**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai modul **Portal Orangtua** memanggil endpoint parent-facing (fitur #171), dan modul
   **Pengelolaan** memanggil endpoint statistik agregat (fitur #176).

3. **Endpoint Publik (tanpa auth)** — khusus OPAC (fitur #169), bisa diakses tanpa login sesuai
   sifatnya sebagai katalog publik. Endpoint pencarian yang menampilkan data lebih detail/pribadi
   (mis. status reservasi milik anggota) tetap wajib JWT.

### 1.3 Standar Struktur Response JSON

Sama persis dengan Core Service (`ARSITEKTUR-SISTEM.md` §4.3):

**Sukses:**
```json
{ "success": true, "data": { }, "message": "Pesan sukses", "errors": null }
```

**Gagal:**
```json
{ "success": false, "data": null, "message": "Pesan ringkas kegagalan", "errors": [{ "field": "...", "message": "..." }] }
```

### 1.4 Kode Status HTTP

Sama seperti `api-contract-coreservice.md` §1.4 (`200`, `201`, `400`, `401`, `403`, `404`, `409`,
`422`, `429`, `500`).

### 1.5 Definisi Aktor

- `pustakawan` — staf pengelola perpustakaan (akun `account_type='staff'` di Core Service dengan
  role `pustakawan`)
- `anggota` — siswa/pegawai yang terdaftar sebagai anggota perpustakaan (self-service terbatas)
- `admin` — `admin_satuan_pendidikan`/`admin_yayasan`/`super_admin` dari Core Service, akses
  pengawasan lintas fitur
- `public` — tanpa login, hanya OPAC pencarian dasar
- `internal_service` — Portal Orangtua & Pengelolaan lewat API Key

---

## 2. Daftar & Detail Endpoint per Modul

### MODUL 1: KATALOG

#### 1.1 Fitur #163/#172: Katalog Buku & Bahan Pustaka

##### `GET /api/v1/perpustakaan/books`
- **Aktor:** `pustakawan`, `admin`
- **Query params:** `search`, `category_id`, `material_type`, `status`, `page`, `per_page`
- **Status:** `200 OK`
- **Deskripsi:** Daftar seluruh koleksi (buku & non-buku) milik Satuan Pendidikan aktif.

##### `POST /api/v1/perpustakaan/books`
- **Aktor:** `pustakawan`
- **Status:** `201 Created`, `422 Unprocessable Entity`
- **Deskripsi:** Tambah judul koleksi baru.

**Request Body:**
```json
{
  "material_type": "book",
  "title": "Laskar Pelangi",
  "author": "Andrea Hirata",
  "publisher": "Bentang Pustaka",
  "publish_year": 2005,
  "isbn": "9789793062792",
  "category_id": 1,
  "shelf_location": "A1-01",
  "total_copies": 3,
  "source_type": "purchase"
}
```

##### `PUT /api/v1/perpustakaan/books/:id`
- **Aktor:** `pustakawan` — Edit data judul koleksi.

##### `DELETE /api/v1/perpustakaan/books/:id`
- **Aktor:** `pustakawan` — Hapus/nonaktifkan (soft delete lewat `status='inactive'` disarankan
  kalau sudah punya riwayat peminjaman).

##### `GET /api/v1/perpustakaan/books/:id/copies`
- **Aktor:** `pustakawan`, `admin` — Daftar eksemplar fisik satu judul beserta status sirkulasi.

##### `POST /api/v1/perpustakaan/books/:id/copies`
- **Aktor:** `pustakawan` — Tambah eksemplar fisik baru untuk judul tersebut.

---

#### 1.2 Fitur #164: Referensi & Kategori Buku

##### `GET /api/v1/perpustakaan/categories`
- **Aktor:** `pustakawan`, `admin`, `public` (untuk filter OPAC)

##### `POST /api/v1/perpustakaan/categories`
- **Aktor:** `pustakawan` — Status: `201 Created`

##### `PUT /api/v1/perpustakaan/categories/:id`
- **Aktor:** `pustakawan`

##### `DELETE /api/v1/perpustakaan/categories/:id`
- **Aktor:** `pustakawan` — `409 Conflict` kalau masih dipakai koleksi aktif.

---

### MODUL 2: ANGGOTA

#### 2.1 Fitur #165: Data Anggota Perpustakaan

##### `GET /api/v1/perpustakaan/members`
- **Aktor:** `pustakawan`, `admin`

##### `POST /api/v1/perpustakaan/members`
- **Aktor:** `pustakawan`
- **Status:** `201 Created`, `404 Not Found` (kalau `ref_id` tidak ditemukan di
  Akademik/Kepegawaian), `409 Conflict` (sudah jadi anggota)
- **Deskripsi:** Daftarkan siswa/pegawai sebagai anggota. Backend memvalidasi `ref_id` in-process
  ke database Akademik (`ref_type='student'`) atau Kepegawaian (`ref_type='employee'`).

**Request Body:**
```json
{
  "ref_type": "student",
  "ref_id": 45,
  "member_card_number": "ANG-0001",
  "max_loan_limit": 3
}
```

##### `PATCH /api/v1/perpustakaan/members/:id/status`
- **Aktor:** `pustakawan` — Aktif/nonaktifkan keanggotaan.

##### `GET /api/v1/perpustakaan/members/:id`
- **Aktor:** `pustakawan`, `admin`, `anggota` (👤 hanya data diri sendiri)

---

#### 2.2 Fitur #174: Riwayat Peminjaman Anggota

##### `GET /api/v1/perpustakaan/members/:id/loan-history`
- **Aktor:** `pustakawan`, `admin`, `anggota` (👤 hanya diri sendiri)
- **Query params:** `status`, `date_from`, `date_to`, `page`, `per_page`

---

### MODUL 3: SIRKULASI

#### 3.1 Fitur #166: Peminjaman Buku

##### `POST /api/v1/perpustakaan/loans`
- **Aktor:** `pustakawan`
- **Status:** `201 Created`, `409 Conflict` (eksemplar tidak tersedia / anggota melebihi
  `max_loan_limit` / kartu anggota kedaluwarsa)

**Request Body:**
```json
{ "book_copy_id": 3, "member_id": 12, "due_at": "2026-08-25T00:00:00Z" }
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "book_copy_id": 3,
    "member_id": 12,
    "loan_status": "borrowed",
    "borrowed_at": "2026-08-18T09:00:00Z",
    "due_at": "2026-08-25T00:00:00Z"
  },
  "message": "Peminjaman berhasil dicatat",
  "errors": null
}
```

##### `PATCH /api/v1/perpustakaan/loans/:id/extend`
- **Aktor:** `pustakawan`, `anggota` (self-service perpanjang) — Status: `200 OK`,
  `409 Conflict` (ada reservasi menunggu untuk judul ini)

---

#### 3.2 Fitur #167: Pengembalian & Denda

##### `PATCH /api/v1/perpustakaan/loans/:id/return`
- **Aktor:** `pustakawan`
- **Status:** `200 OK`
- **Deskripsi:** Catat pengembalian; backend menghitung `fine_amount` otomatis kalau
  `returned_at > due_at` (aturan tarif final — lihat keputusan terbuka `rancangan-perpustakaan.md`
  §5).

##### `PATCH /api/v1/perpustakaan/loans/:id/pay-fine`
- **Aktor:** `pustakawan` — Tandai `fine_payment_status='paid'`.

---

#### 3.3 Fitur #168: Reservasi/Booking Buku

##### `POST /api/v1/perpustakaan/reservations`
- **Aktor:** `anggota`, `pustakawan` — Status: `201 Created`

##### `GET /api/v1/perpustakaan/reservations`
- **Aktor:** `pustakawan`, `admin`

##### `PATCH /api/v1/perpustakaan/reservations/:id/cancel`
- **Aktor:** `anggota` (👤 milik sendiri), `pustakawan`

---

#### 3.4 Fitur #173: Buku Hilang/Rusak

##### `POST /api/v1/perpustakaan/lost-damaged-reports`
- **Aktor:** `pustakawan` — Status: `201 Created`

**Request Body:**
```json
{
  "book_copy_id": 3,
  "loan_id": 101,
  "condition_status": "lost",
  "description": "Dilaporkan hilang saat pengembalian",
  "replacement_fee": 75000
}
```

##### `PATCH /api/v1/perpustakaan/lost-damaged-reports/:id/resolve`
- **Aktor:** `pustakawan` — Tandai selesai ditangani.

---

### MODUL 4: NOTIFIKASI

#### 4.1 Fitur #175: Pengingat Jatuh Tempo & Denda

##### `GET /api/v1/perpustakaan/loan-reminders`
- **Aktor:** `pustakawan`, `admin`

##### `POST /api/v1/perpustakaan/loan-reminders/run`
- **Aktor:** `pustakawan`, `internal_service` (dipicu job terjadwal)
- **Deskripsi:** Buat batch pengingat untuk pinjaman mendekati/lewat jatuh tempo. Pengiriman
  sungguhan didelegasikan ke modul Komunikasi & Notifikasi (lihat keputusan terbuka
  `rancangan-perpustakaan.md` §5) — endpoint ini hanya mencatat permintaan.

---

### MODUL 5: OPAC

#### 5.1 Fitur #169: OPAC (Online Public Access Catalog)

##### `GET /api/v1/perpustakaan/opac/search`
- **Aktor:** `public`, `anggota`
- **Query params:** `q` (kata kunci judul/pengarang), `category_id`, `material_type`,
  `available_only`
- **Status:** `200 OK`
- **Deskripsi:** Pencarian katalog publik, hanya menampilkan koleksi `status='active'`. Tidak
  memerlukan token.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Laskar Pelangi",
      "author": "Andrea Hirata",
      "material_type": "book",
      "category": "Fiksi",
      "available_copies": 2,
      "total_copies": 3
    }
  ],
  "message": "Pencarian berhasil",
  "errors": null
}
```

##### `GET /api/v1/perpustakaan/opac/books/:id`
- **Aktor:** `public`, `anggota` — Detail satu judul + status ketersediaan tiap eksemplar.

---

### MODUL 6: LAPORAN

#### 6.1 Fitur #170: Laporan Sirkulasi & Buku Terpopuler

##### `GET /api/v1/perpustakaan/reports/circulation`
- **Aktor:** `pustakawan`, `admin`
- **Query params:** `date_from`, `date_to`, `satuan_pendidikan_id`

##### `GET /api/v1/perpustakaan/reports/popular-books`
- **Aktor:** `pustakawan`, `admin`
- **Query params:** `date_from`, `date_to`, `limit`

---

#### 6.2 Fitur #176: Statistik Pemanfaatan Perpustakaan

##### `GET /api/v1/perpustakaan/reports/utilization`
- **Aktor:** `pustakawan`, `admin`, `internal_service` (Pengelolaan, dashboard agregat)
- **Deskripsi:** *Tunduk pada keputusan terbuka soal mekanisme pencatatan kunjungan* — kalau
  `library_visit_logs` tidak jadi dipakai, `jumlah_kunjungan` di response akan `null`/tidak
  disediakan sampai ada sumber data lain yang disepakati.

---

### MODUL 7: INTEGRASI

#### 7.1 Fitur #171: Endpoint Parent-Facing (Riwayat Baca Anak)

##### `GET /api/v1/perpustakaan/parent-facing/students/:student_ref_id/loan-history`
- **Tipe:** Endpoint Internal Service
- **Aktor:** `internal_service` (Portal Orangtua, via `X-API-Key`)
- **Status:** `200 OK`, `401 Unauthorized` (API Key salah), `404 Not Found` (siswa belum jadi
  anggota perpustakaan)
- **Deskripsi:** Riwayat peminjaman seorang siswa berdasarkan `ref_id` di Akademik. Dipanggil
  in-process (satu proses `api-backend`), tapi kontrak tetap didokumentasikan seolah HTTP sesuai
  `ARSITEKTUR-SISTEM.md` §1.1.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "student_ref_id": 45,
    "member_card_number": "ANG-0001",
    "loan_history": [
      { "book_title": "Laskar Pelangi", "borrowed_at": "2026-08-18T09:00:00Z", "returned_at": null, "loan_status": "borrowed" }
    ]
  },
  "message": "Riwayat baca berhasil diambil",
  "errors": null
}
```

---

## 3. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Kontrak API draft pertama, 14 fitur, mengikuti pola `api-contract-coreservice.md`. Endpoint fitur #175 (pengingat) dan #176 (statistik pemanfaatan) masih tunduk pada keputusan terbuka di `rancangan-perpustakaan.md` §5. |

*(Tambahkan baris baru di atas setiap ada perubahan kontrak — jangan hapus riwayat lama.)*
