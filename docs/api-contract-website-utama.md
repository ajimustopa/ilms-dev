Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-website-utama.md

> Kontrak endpoint REST API resmi untuk **Website Utama**. Mengikuti pola
> `api-contract-coreservice.md`. Berbeda dari modul internal lain: Website Utama punya **dua
> kelompok endpoint terpisah** (lihat `rancangan-website-utama.md` §2.1) — **publik** (dipanggil
> situs Next.js `aldeposibs.com`, tanpa auth) dan **admin** (dipanggil CMS di `core-portal`,
> pakai JWT sama seperti modul lain).

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/website-utama`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/website-utama`
- **Lokal Development:** `http://localhost:3000/api/v1/website-utama`

Dua sub-prefix di bawah base URL di atas:
- `/public/...` — tanpa autentikasi, rate-limit lebih ketat (lihat §1.2)
- `/admin/...` — wajib `Authorization: Bearer <jwt>`, sesuai role di `roles-website-utama.md`

### 1.2 Skema Autentikasi & Otorisasi

1. **Endpoint `/public/...`**: tanpa autentikasi. Dilindungi rate limiting per-IP (via fitur Core
   Service "Rate limiting & API gateway") untuk mencegah spam submit (PPDB, tiket konsultasi).
2. **Endpoint `/admin/...`**: `Authorization: Bearer <access_token>` — JWT terbitan Core Service,
   sama seperti modul internal lain. Verifikasi dilakukan in-process karena satu proses
   `api-backend` (import langsung `CORE_JWT_SECRET`).
3. Endpoint yang memanggil Akademik (mis. kirim data PPDB untuk verifikasi) memakai
   `X-API-Key` internal Website Utama → Akademik, sesuai pola service-to-service Core Service.

### 1.3 Standar Struktur Response JSON

Sama seperti seluruh sistem (`ARSITEKTUR-SISTEM.md` §4.3):

```json
{ "success": true, "data": { ... } | [ ... ] | null, "message": "...", "errors": null }
```
```json
{ "success": false, "data": null, "message": "...", "errors": [ { "field": "...", "message": "..." } ] }
```

### 1.4 Kode Status HTTP

Sama seperti `api-contract-coreservice.md` §1.4 (200/201/400/401/403/404/409/422/429/500).

---

## 2. Endpoint Publik (`/public/...`) — Tanpa Auth

### 2.1 Konten Publik

| Method | Endpoint | Fitur | Keterangan |
|---|---|---|---|
| GET | `/public/home` | #14 Beranda | Hero + highlights + statistik live (agregat dari Core/Akademik/Kepegawaian) |
| GET | `/public/school-profile` | #15 Profil sekolah | Proxy ke Core Service `school_units` |
| GET | `/public/staff-profiles` | #16 | Filter `?school_unit_id=` |
| GET | `/public/school-life?category=` | #17 | `category` = facility/extracurricular/school_rule/achievement |
| GET | `/public/news` | #18 | Query: `page`, `limit`, `category`, `search` — **HANYA status `published` dan `target_audience = 'public'` (terisolasi dari konten internal)** |
| GET | `/public/news/:slug` | #18 | Detail berita publik (hanya `target_audience = 'public'`) |
| GET | `/public/galleries` | #19 | List album |
| GET | `/public/galleries/:id` | #19 | Detail album + item |
| GET | `/public/faqs` | #20 | Filter `?category=` |
| GET | `/public/testimonials` | #21 | Hanya `is_visible = true` |
| GET | `/public/events` | #22 | Filter `?month=&year=`, hanya `published` |
| GET | `/public/contact` | #23 | Proxy ke Core Service (alamat, telepon, koordinat) |
| GET | `/public/accreditations` | #24 | List akreditasi & prestasi |

### 2.2 PPDB

| Method | Endpoint | Fitur | Keterangan |
|---|---|---|---|
| POST | `/public/ppdb/registrants` | #25 | Submit/simpan draft pendaftar (multi-step, `status` awal `draft`) |
| PUT | `/public/ppdb/registrants/:id` | #25 | Update draft sebelum submit |
| POST | `/public/ppdb/registrants/:id/documents` | #25 | Upload dokumen (multipart), lihat `erd-website-utama.md` §0 poin 2 |
| POST | `/public/ppdb/registrants/:id/submit` | #25 | Submit final → status `submitted`, trigger kirim ke Akademik (mock dulu, lihat §7) |
| GET | `/public/ppdb/schedules` | #26 | Jadwal seleksi per gelombang |
| POST | `/public/ppdb/registrants/:id/payment` | #27 | Inisiasi pembayaran → return referensi gateway (implementasi nunggu keputusan gateway) |
| GET | `/public/ppdb/registrants/:id/payment-status` | #27 | Cek status bayar |
| GET | `/public/ppdb/registrants/:id/status` | #28 | Tracking status berjalan (draft→diajukan→verifikasi→diterima/ditolak) |
| POST | `/webhooks/ppdb-status` | #28 | **Diterima** dari Akademik (bukan dikirim) — update status & catat `ppdb_status_logs`. Wajib header `X-Webhook-Signature` |

### 2.3 Konsultasi

| Method | Endpoint | Fitur | Keterangan |
|---|---|---|---|
| POST | `/public/consultation/tickets` | #29 | Kirim tiket konsultasi |
| GET | `/public/consultation/tickets/:id` | #29 | Cek status & balasan (butuh token/kode referensi yang dikirim balik saat submit) |
| POST | `/public/consultation/bookings` | #30 | Booking konsultasi virtual |

### 2.4 Publikasi

| Method | Endpoint | Fitur | Keterangan |
|---|---|---|---|
| GET | `/public/articles` | #31 | Hanya status `published` |
| GET | `/public/articles/:slug` | #31 | Detail + increment `views_count` |
| POST | `/public/articles/:id/comments` | #32 | Kirim komentar → status awal `pending` (moderasi admin) |

---

## 3. Endpoint Admin & Portal Guru (`/admin/...`) — Wajib JWT

### 3.1 Konten Publik & Pengumuman Guru (CRUD CMS)

| Method | Endpoint | Fitur | Keterangan |
|---|---|---|---|
| GET | `/admin/news/teacher-announcements` | #18 | Pengumuman internal guru & yayasan (`target_audience IN ('teachers', 'all_internal', 'public')`) dengan paginasi & pencarian untuk Portal Guru |
| GET | `/admin/news/teacher-announcements/:id` | #18 | Detail pengumuman internal guru |
| GET, PUT | `/admin/home/hero` | #14 | |
| GET, POST, PUT, DELETE | `/admin/home/highlights` / `/:id` | #14 | |
| GET, POST, PUT, DELETE | `/admin/staff-profiles` / `/:id` | #16 | |
| GET, POST, PUT, DELETE | `/admin/school-life` / `/:id` | #17 | |
| GET, POST, PUT, DELETE, PATCH | `/admin/news` / `/:id` / `/:id/publish` / `/:id/archive` | #18 | Manajemen Berita & Pengumuman CMS (dukung `target_audience: public, all_internal, teachers, students`) |
| GET, POST, PUT, DELETE | `/admin/galleries` / `/:id` | #19 |
| POST, DELETE | `/admin/galleries/:id/items` / `/items/:itemId` | #19 |
| GET, POST, PUT, DELETE | `/admin/faqs` / `/:id` | #20 |
| GET, POST, PUT, PATCH | `/admin/testimonials` / `/:id` / `/:id/toggle-visibility` | #21 |
| GET, POST, PUT, DELETE, PATCH | `/admin/events` / `/:id` / `/:id/publish` | #22 |
| GET, POST, PUT, DELETE | `/admin/accreditations` / `/:id` | #24 |

### 3.2 Pendaftaran (Admin)

| Method | Endpoint | Fitur |
|---|---|---|
| GET | `/admin/ppdb/registrants` | #25 — list + filter status/gelombang/tahun ajaran |
| GET | `/admin/ppdb/registrants/:id` | #25 — detail + dokumen |
| GET, POST, PUT, DELETE | `/admin/ppdb/schedules` / `/:id` | #26 |
| GET | `/admin/ppdb/payments` | #27 — rekap pembayaran |
| PATCH | `/admin/ppdb/payments/:id/verify` | #27 — verifikasi manual (jalan pintas sebelum gateway final, lihat `rancangan-website-utama.md` §5) |
| PATCH | `/admin/ppdb/registrants/:id/status` | #28 — update status manual + catat log |
| GET | `/admin/ppdb/registrants/:id/status-logs` | #28 — riwayat status |
| GET | `/admin/ppdb/statistics` | Statistik pendaftar (dashboard ringan, bukan fitur terpisah) |

### 3.3 Konsultasi (Admin)

| Method | Endpoint | Fitur |
|---|---|---|
| GET | `/admin/consultation/tickets` | #29 |
| POST | `/admin/consultation/tickets/:id/reply` | #29 |
| PATCH | `/admin/consultation/tickets/:id/assign` | #29 |
| PATCH | `/admin/consultation/tickets/:id/close` | #29 |
| GET, PATCH | `/admin/consultation/bookings` / `/:id` | #30 — konfirmasi/reschedule/cancel |

### 3.4 Publikasi (Admin)

| Method | Endpoint | Fitur |
|---|---|---|
| GET, POST, PUT, DELETE | `/admin/articles` / `/:id` | #31 |
| PATCH | `/admin/articles/:id/submit-review` | #31 |
| PATCH | `/admin/articles/:id/publish` | #31 |
| GET | `/admin/articles/:id/comments` | #32 |
| PATCH | `/admin/articles/comments/:id/moderate` | #32 — approve/reject |

### 3.5 CMS Admin

| Method | Endpoint | Fitur |
|---|---|---|
| GET, PUT | `/admin/theme` | #33 |
| GET | `/admin/theme/preview` | #33 |
| GET, POST, PATCH, DELETE | `/admin/cms-access` / `/:id` | #34 — kelola siapa (user Core) yang punya akses CMS & role_code apa |
| GET, PUT | `/admin/site-settings` | #35 — key/value + meta tag |
| GET | `/admin/site-settings/sitemap` | #35 — generate `sitemap.xml` |
| GET | `/admin/site-settings/robots` | #35 — generate `robots.txt` |

---

## 4. Detail Contoh Payload — PPDB Online (Fitur Paling Kompleks)

### `POST /public/ppdb/registrants`
```json
{
  "school_unit_id": 1,
  "school_year": "2027/2028",
  "registration_path": "reguler",
  "candidate_full_name": "Contoh Nama",
  "candidate_birth_place": "Sukabumi",
  "candidate_birth_date": "2020-05-10",
  "candidate_gender": "L",
  "father_name": "Nama Ayah",
  "mother_name": "Nama Ibu",
  "parent_contact": "081234567890"
}
```

### `POST /public/ppdb/registrants/:id/submit` — Response
```json
{
  "success": true,
  "data": { "id": 12, "status": "submitted", "tracking_code": "PPDB-2027-000012" },
  "message": "Pendaftaran berhasil dikirim, menunggu verifikasi",
  "errors": null
}
```

---

## 5. Rate Limiting Khusus Endpoint Publik

Karena endpoint `/public/...` rawan spam (submit form tanpa login), disarankan limit lebih ketat
dari default sistem — didaftarkan lewat fitur Core Service "Rate limiting & API gateway"
(`rate_limit_rules`), bukan dibuat ulang di modul ini:

| Endpoint | Limit disarankan |
|---|---|
| `POST /public/ppdb/registrants*` | 10/menit per IP |
| `POST /public/consultation/tickets` | 5/menit per IP |
| `POST /public/articles/:id/comments` | 10/menit per IP |

## 6. Skema Otentikasi Payload Webhook Masuk

`POST /webhooks/ppdb-status` (diterima dari Akademik) memakai format standar global
(`ARSITEKTUR-SISTEM.md` §4.3):
```json
{
  "event_type": "ppdb.status_changed",
  "timestamp": "2027-01-20T08:00:00Z",
  "data": { "registrant_id": 12, "academic_ref_id": 501, "status": "accepted", "note": "..." },
  "satuan_pendidikan_id": 1
}
```

## 7. Catatan Mock Sementara (Ketergantungan Dua Arah dengan Akademik)

Sesuai `rancangan-website-utama.md` §7.1: sebelum Akademik fase verifikasi PPDB selesai,
`POST /public/ppdb/registrants/:id/submit` memanggil fungsi mock lokal
(`services/akademikMock.js`) yang langsung mengembalikan `{ academic_ref_id: null, status: "verifying" }`
tanpa HTTP call sungguhan — ganti ke HTTP call asli ke
`api.aldeposibs.com/api/v1/akademik/ppdb/intake` begitu endpoint itu tersedia.
