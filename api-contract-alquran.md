# api-contract-alquran.md

> Dokumen ini adalah spesifikasi kontrak RESTful API resmi untuk modul **Tahfidz & Al-Quran
> (Alquran)**. Menjadi acuan implementasi backend modul ini dan integrasi dengan Portal Orangtua
> serta Akademik/Kepegawaian (sebagai konsumen data referensi). Mengikuti pola
> `api-contract-coreservice.md`.

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/alquran`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/alquran`
- **Lokal Development:** `http://localhost:3000/api/v1/alquran`

---

### 1.2 Skema Autentikasi & Otorisasi

1. **Bearer Token (JWT) — untuk Pengguna (Admin Tahfidz, Musyrif, Kepala Sekolah):**
   ```http
   Authorization: Bearer <access_token>
   ```
   Token diterbitkan Core Service (`POST /api/v1/core/auth/login`), diverifikasi lokal
   (in-process) oleh `api-backend` sesuai `ARSITEKTUR-SISTEM.md` §1.1 dan §4.1.

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service:**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai oleh Portal Orangtua saat memanggil endpoint internal parent-facing (Bagian 2.6).

---

### 1.3 Standar Struktur Response JSON

Mengikuti konvensi global `ARSITEKTUR-SISTEM.md` §4.3 — sama persis dengan
`api-contract-coreservice.md` §1.3:

#### Format Response Sukses (HTTP 200, 201)
```json
{
  "success": true,
  "data": { ... } | [ ... ] | null,
  "message": "Pesan sukses operasi",
  "errors": null
}
```

#### Format Response Gagal / Validasi / Error (HTTP 4xx, 5xx)
```json
{
  "success": false,
  "data": null,
  "message": "Pesan ringkas kegagalan",
  "errors": [
    { "field": "juz", "message": "Nilai juz wajib diisi antara 1-30" }
  ]
}
```

---

### 1.4 Kode Status HTTP yang Digunakan

| Kode HTTP | Status | Keterangan Penggunaan |
|---|---|---|
| `200 OK` | Sukses | Request GET, PUT, PATCH berhasil, atau POST non-kreasi |
| `201 Created` | Berhasil Dibuat | Request POST berhasil membuat entitas/resource baru |
| `400 Bad Request` | Permintaan Tidak Valid | Format JSON salah atau parameter wajib tidak ada |
| `401 Unauthorized` | Belum Terautentikasi | Token tidak disertakan, kedaluwarsa, atau API Key salah |
| `403 Forbidden` | Tidak Memiliki Izin | Token valid tapi role/permission tidak memiliki hak akses |
| `404 Not Found` | Data Tidak Ditemukan | Resource dengan ID yang dicari tidak ditemukan |
| `409 Conflict` | Konflik Data | Mis. ujian yang sudah `completed` diminta jadwal ulang |
| `422 Unprocessable Entity` | Validasi Gagal | Format payload benar tapi melanggar aturan validasi data |
| `500 Internal Server Error` | Kesalahan Server | Terjadi error internal di server |

---

### 1.5 Definisi Aktor (Berdasarkan `roles-alquran.md`)

- `admin_tahfidz` — mengelola target, kurikulum kitab kuning, melihat laporan.
- `musyrif` — menginput & memverifikasi capaian hafalan, menjadi penguji ujian.
- `kepala_sekolah` — melihat laporan (read-only).
- `internal_service` — Portal Orangtua, via `X-API-Key`, hanya endpoint Bagian 2.6.
- Role global dari Core Service (`super_admin`, `admin_yayasan`) tetap punya akses penuh sesuai
  `roles-alquran.md` §2.

---

## 2. Daftar & Detail Endpoint per Fitur

---

### 2.1 Fitur "Target & Roadmap Hafalan per Kelas"

##### `GET /api/v1/alquran/targets`
- **Aktor:** `admin_tahfidz`, `musyrif` (read), `kepala_sekolah` (read)
- **Query params:** `school_unit_id` (wajib), `class_ref_id`, `period_label`
- **Status HTTP:** `200 OK`

##### `POST /api/v1/alquran/targets`
- **Aktor:** `admin_tahfidz`
- **Status HTTP:** `201 Created`, `422 Unprocessable Entity`

**Request Body:**
```json
{
  "school_unit_id": 1,
  "class_ref_id": 5,
  "period_label": "Semester Ganjil 2026/2027",
  "target_type": "juz",
  "target_value": 2
}
```

##### `PUT /api/v1/alquran/targets/:id`
- **Aktor:** `admin_tahfidz`
- **Status HTTP:** `200 OK`, `404 Not Found`, `422 Unprocessable Entity`

##### `DELETE /api/v1/alquran/targets/:id`
- **Aktor:** `admin_tahfidz`
- **Status HTTP:** `200 OK`, `404 Not Found`

---

### 2.2 Fitur "Input Capaian Hafalan Santri"

##### `GET /api/v1/alquran/records`
- **Aktor:** `admin_tahfidz`, `musyrif`, `kepala_sekolah`
- **Query params:** `school_unit_id` (wajib), `student_ref_id`, `class_ref_id`, `date_from`,
  `date_to`, `verification_status`
- **Status HTTP:** `200 OK`

##### `POST /api/v1/alquran/records`
- **Aktor:** `musyrif`
- **Status HTTP:** `201 Created`, `422 Unprocessable Entity`
- **Deskripsi:** Musyrif mencatat setoran hafalan santri. Status awal selalu `pending`.

**Request Body:**
```json
{
  "school_unit_id": 1,
  "student_ref_id": 101,
  "juz": 3,
  "page_start": 1,
  "page_end": 8,
  "record_date": "2026-08-17",
  "tajwid_score": 87.5,
  "notes": "Perlu perbaikan makhraj huruf ص"
}
```

##### `PATCH /api/v1/alquran/records/:id/verify`
- **Aktor:** `admin_tahfidz`, `musyrif` (selain yang menginput)
- **Status HTTP:** `200 OK`, `404 Not Found`, `409 Conflict`
- **Deskripsi:** Mengubah `verification_status` jadi `verified` atau `rejected`.

**Request Body:**
```json
{ "verification_status": "verified", "notes": "Sudah lancar" }
```

---

### 2.3 Fitur "Ujian/Setoran Hafalan (Munaqasyah)"

##### `GET /api/v1/alquran/exams`
- **Aktor:** `admin_tahfidz`, `musyrif`
- **Query params:** `school_unit_id` (wajib), `student_ref_id`, `status`

##### `POST /api/v1/alquran/exams`
- **Aktor:** `admin_tahfidz`, `musyrif`
- **Status HTTP:** `201 Created`
- **Deskripsi:** Menjadwalkan ujian. Status awal `scheduled`.

**Request Body:**
```json
{
  "school_unit_id": 1,
  "student_ref_id": 101,
  "juz_examined": 3,
  "exam_date": "2026-09-05",
  "examiner_teacher_ref_id": 12
}
```

##### `PATCH /api/v1/alquran/exams/:id/result`
- **Aktor:** `musyrif` (sebagai penguji), `admin_tahfidz`
- **Status HTTP:** `200 OK`, `409 Conflict` (kalau status sudah `completed`/`cancelled`)
- **Deskripsi:** Menginput hasil ujian, mengubah status jadi `completed`.

**Request Body:**
```json
{ "score": 90.0, "status": "completed", "notes": "Lancar, tajwid baik" }
```

---

### 2.4 Fitur "Manajemen Kitab Kuning"

##### `GET /api/v1/alquran/books`
- **Aktor:** semua aktor internal (read)

##### `POST /api/v1/alquran/books`
- **Aktor:** `admin_tahfidz`
- **Status HTTP:** `201 Created`

**Request Body:**
```json
{
  "school_unit_id": 1,
  "book_name": "Safinatun Najah",
  "author": "Syekh Salim bin Sumair",
  "level": "Pemula",
  "teacher_ref_id": 12
}
```

##### `PUT /api/v1/alquran/books/:id`
- **Aktor:** `admin_tahfidz`

##### `DELETE /api/v1/alquran/books/:id`
- **Aktor:** `admin_tahfidz`
- **Deskripsi:** Soft-delete lewat `status_active = false`, bukan hapus baris fisik.

---

### 2.5 Fitur "Laporan Capaian Hafalan per Santri/Kelas"

##### `GET /api/v1/alquran/reports/students/:student_ref_id`
- **Aktor:** `admin_tahfidz`, `kepala_sekolah`
- **Deskripsi:** Agregasi capaian & ujian satu santri terhadap target kelasnya. Tidak ada tabel
  tersendiri — hasil query gabungan `hafalan_targets`, `hafalan_records`, `munaqasyah_exams`
  (lihat `erd-alquran.md` §1 catatan).

##### `GET /api/v1/alquran/reports/classes/:class_ref_id`
- **Aktor:** `admin_tahfidz`, `kepala_sekolah`
- **Query params:** `period_label`
- **Deskripsi:** Agregasi capaian seluruh santri dalam satu kelas dibanding target kelas.

##### `GET /api/v1/alquran/reports/classes/:class_ref_id/export`
- **Aktor:** `admin_tahfidz`, `kepala_sekolah`
- **Query params:** `format` (`pdf`/`xlsx`, belum final — lihat catatan)
- **Status HTTP:** `200 OK`, `501 Not Implemented` (kalau format belum diimplementasi)
- **Catatan:** format export & kebutuhan tabel log riwayat export belum diputuskan (lihat
  `rancangan-alquran.md` §5 poin terakhir) — endpoint ini dicatat sebagai kontrak awal, boleh
  ditunda implementasinya sampai keputusan itu final.

---

### 2.6 Fitur "Endpoint Parent-Facing (Integrasi Portal Orangtua)"

##### `GET /api/v1/alquran/internal/students/:student_ref_id/achievements`
- **Tipe:** Endpoint Internal (Service-to-Service)
- **Aktor:** `internal_service` (Portal Orangtua), via `X-API-Key`
- **Status HTTP:** `200 OK`, `401 Unauthorized`, `404 Not Found`
- **Deskripsi:** Mengembalikan ringkasan capaian hafalan satu santri untuk ditampilkan di
  dashboard anak pada Portal Orangtua.

**Response:**
```json
{
  "success": true,
  "data": {
    "student_ref_id": 101,
    "latest_records": [
      { "juz": 3, "page_start": 1, "page_end": 8, "record_date": "2026-08-17", "verification_status": "verified" }
    ],
    "upcoming_exams": [
      { "juz_examined": 3, "exam_date": "2026-09-05", "status": "scheduled" }
    ],
    "target_progress": { "target_type": "juz", "target_value": 2, "achieved_juz": 1 }
  },
  "message": "Data capaian hafalan berhasil diambil",
  "errors": null
}
```

---

## 3. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Kontrak API draf awal dibuat untuk 6 fitur modul Alquran. Endpoint export laporan (2.5) & poin skala nilai masih menunggu keputusan terbuka di `rancangan-alquran.md` §5. |

*(Tambahkan baris baru di atas setiap ada perubahan endpoint — jangan hapus riwayat lama.)*
