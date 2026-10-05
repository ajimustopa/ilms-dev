Status: aktif
Diperbarui: 2026-10-03

# api-contract-psb.md

> Dokumen spesifikasi kontrak RESTful API untuk **Modul PSB (Penerimaan Siswa Baru / PPDB Online)**.
> Modul ini mengelola seluruh siklus penerimaan murid baru, kuota gender (L/P) per rombel kelas, seleksi, pembayaran berintegrasi modul Keuangan, penempatan siswa ke modul Akademik, serta pengunduran diri dan refund.
> Mengikuti standar Rule #1 (Zero cross-database JOIN / FK; integrasi in-process service adapter).

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/psb`
- **Lokal Development:** `http://localhost:3000/api/v1/psb`

### 1.2 Skema Autentikasi & Otorisasi
- **Bearer Token (JWT)** pada header:
  ```http
  Authorization: Bearer <access_token>
  X-School-Unit-Id: <satuan_pendidikan_id>
  ```
- **Permission Role**:
  - `psb.view` / `ppdb.view` / `akademik.psb.read`: Melihat data PSB, pendaftar, nilai, kuota.
  - `psb.manage` / `ppdb.manage` / `akademik.psb.manage`: Membuat/mengedit program, gelombang, verifikasi berkas, tes, dan penempatan siswa.
  - `keuangan.ppdb_billing.manage`: Mengelola tagihan registrasi, uang pangkal, kasir, dan pencairan refund.

### 1.3 Standar Response JSON
```json
{
  "success": true,
  "data": {},
  "message": "Operasi berhasil",
  "errors": null
}
```

---

## 2. Ringkasan Endpoint

| No | Modul Fitur | Prefix Path | Deskripsi Utama |
|---|---|---|---|
| 1 | Program PSB & Kuota Rombel | `/programs` | CRUD Program per tahun ajaran target & kuota L/P per rombel |
| 2 | Gelombang Pendaftaran | `/waves` | Jalur & gelombang pendaftaran, biaya formulir, tautan skema keuangan |
| 3 | Kebijakan Refund | `/refund-policies` | Matriks persentase pengembalian dana berbasis cutoff hari tersisa |
| 4 | Calon Murid (Registrants) | `/registrants` | Pendaftaran santri baru, auto No. Reg, generate akun portal calon murid |
| 5 | Dokumen Digital | `/registrants/:id/documents` | Upload & verifikasi berkas persyaratan |
| 6 | Tagihan Biaya Pendaftaran | `/registrants/:id/bill` | Tagihan formulir & kasir penerimaan dengan kuitansi resmi |
| 7 | Master Tes Seleksi | `/tests` | Mata uji, bobot persentase, passing grade, rubrik soal |
| 8 | Sesi Ujian & Kartu Peserta | `/test-sessions` | Penjadwalan ruang, pengawas, generate Kartu Peserta Ujian |
| 9 | Penilaian & Skor Komposit | `/test-sessions/:id/score` | Input nilai penguji & kalkulasi otomatis skor komposit terbobot |
| 10 | Pengumuman Kelulusan | `/announcements` | Penetapan hasil kelulusan & penerbitan SKL (Surat Keterangan Lulus) |
| 11 | Uang Pangkal (Keuangan) | `/registrants/:id/enrollment-bill` | Tagihan uang pangkal mengacu skema biaya Keuangan & kasir cicilan |
| 12 | Penempatan Rombel (Akademik) | `/registrants/:id/place-class` | Penempatan santri definitif ke rombel kelas Akademik (auto NIS/NIPD) |
| 13 | Pengunduran Diri & Refund | `/withdrawals` | Pengajuan mundur, kalkulator refund cutoff, auto-release kuota rombel, kasir keluar |
| 14 | Lookups Lintas Modul | `/lookups/*` | Lookup data master dari Akademik, Keuangan, dan Core |

---

## 3. Detail Endpoint Terkait Permintaan Aktif

### 3.1 Program PSB & Integrasi Tahun Ajaran Target (Modul Akademik)

Setiap Program PSB wajib merujuk kepada **Tahun Ajaran di Modul Akademik** (`akademik.academic_years`).

#### A. `POST /programs`
Membuat program PSB baru. Field `target_academic_year` dan `target_academic_year_id` harus merujuk ke data master tahun ajaran di modul Akademik.

- **Request Body**:
```json
{
  "name": "Program PSB 2026/2027 Reguler",
  "target_academic_year": "2026/2027",
  "target_academic_year_id": 2,
  "status": "active",
  "start_date": "2026-01-10",
  "end_date": "2026-07-15",
  "class_quotas": [
    {
      "satuan_pendidikan_id": 1,
      "class_group_id": 1,
      "quota_male": 15,
      "quota_female": 15,
      "total_quota": 30
    }
  ]
}
```

- **Validasi Bisnis**:
  1. `target_academic_year` divalidasi terhadap data `academic_years.name` di modul Akademik.
  2. Jika `target_academic_year_id` disertakan, sistem memastikan ID tersebut valid di tabel `akademik.academic_years`.
  3. `class_quotas` divalidasi terhadap kapasitas rombel di `akademik.class_groups`.

- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Program PSB 2026/2027 Reguler",
    "target_academic_year": "2026/2027",
    "target_academic_year_id": 2,
    "status": "active",
    "start_date": "2026-01-10",
    "end_date": "2026-07-15",
    "class_quotas": []
  },
  "message": "Program PSB berhasil dibuat",
  "errors": null
}
```

---

### 3.2 Lookup Tahun Ajaran dari Modul Akademik

#### A. `GET /lookups/academic-years`
Mengambil data master tahun ajaran aktif dan riwayat dari modul Akademik (`akademik.academic_years`) untuk populasi dropdown pilihan di portal.

- **Query Parameters**:
  - `satuan_pendidikan_id` (opsional): filter ID satuan pendidikan (diambil dari header `X-School-Unit-Id`).
  - `is_active` (opsional): filter status aktif (`1` atau `0`).

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "satuan_pendidikan_id": 1,
      "name": "2026/2027",
      "start_date": "2026-07-15",
      "end_date": "2027-06-20",
      "is_active": 1
    },
    {
      "id": 1,
      "satuan_pendidikan_id": 1,
      "name": "2025/2026",
      "start_date": "2025-07-15",
      "end_date": "2026-06-20",
      "is_active": 0
    }
  ],
  "message": "Lookup tahun ajaran berhasil dimuat",
  "errors": null
}
```
