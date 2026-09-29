Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-kepegawaian.md

> Dokumen ini adalah spesifikasi kontrak RESTful API resmi untuk **Kepegawaian**. Menjadi acuan
> tunggal untuk implementasi backend Kepegawaian dan integrasi modul lain (Akademik, Sarpras,
> Perpustakaan, Keuangan, Komunikasi & Notifikasi, Tahfidz & Al-Quran, Pengelolaan) yang
> mengonsumsi data pegawai. Ditulis mengikuti pola `api-contract-coreservice.md`.

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/kepegawaian`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/kepegawaian`
- **Lokal Development:** `http://localhost:3000/api/v1/kepegawaian`

---

### 1.2 Skema Autentikasi & Otorisasi

Kepegawaian **tidak menerbitkan token sendiri** — seluruh autentikasi tetap lewat Core Service
(`POST /api/v1/core/auth/login`). Dua metode dipakai di sini:

1. **Bearer Token (JWT) — untuk Pengguna (Admin, HRD, Atasan, Pegawai):**
   ```http
   Authorization: Bearer <access_token>
   ```
   Token yang sama yang diterbitkan Core Service. Backend Kepegawaian memverifikasi signature
   memakai `CORE_JWT_SECRET` yang di-*import* langsung dalam proses `api-backend` yang sama
   (lihat `ARSITEKTUR-SISTEM.md` Bagian 4.1), tidak memanggil Core lewat jaringan.

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service (modul lain):**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai modul lain (Akademik, Sarpras, Perpustakaan, Komunikasi & Notifikasi, Tahfidz &
   Al-Quran, Pengelolaan, Keuangan) saat memanggil endpoint di bawah prefix `/internal/...`.
   API Key didaftarkan & dikelola lewat fitur "Rate Limiting & API Gateway" milik Core Service
   (`api_clients` — lihat `erd-coreservice.md` §2.16).

---

### 1.3 Standar Struktur Response JSON

Sama persis dengan `ARSITEKTUR-SISTEM.md` Bagian 4.3 dan `api-contract-coreservice.md` §1.3:

**Sukses (`200`, `201`):**
```json
{ "success": true, "data": { }, "message": "Pesan sukses operasi", "errors": null }
```

**Gagal (`4xx`, `5xx`):**
```json
{
  "success": false,
  "data": null,
  "message": "Pesan ringkas kegagalan",
  "errors": [ { "field": "employee_number", "message": "Nomor pegawai sudah dipakai" } ]
}
```

---

### 1.4 Kode Status HTTP

Sama seperti `api-contract-coreservice.md` §1.4 — `200`, `201`, `400`, `401`, `403`, `404`,
`409`, `422`, `429`, `500`.

---

### 1.5 Definisi Aktor (Berdasarkan `roles-kepegawaian.md`)

- `admin_yayasan` / `super_admin` — role global dari Core, akses penuh (lihat `roles-coreservice.md`)
- `hrd` — pengelola operasional data kepegawaian
- `atasan` — pegawai dengan bawahan (approve cuti/lembur, input penilaian kinerja bawahan)
- `pegawai` — self-service (lihat data sendiri, ajukan cuti/lembur)
- `internal_service` — modul lain lewat API Key

---

## 2. Daftar & Detail Endpoint per Modul

---

### MODUL 1: DATA PEGAWAI

#### 1.0 Fitur: Master Status Kepegawaian Fleksibel

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employment-statuses` | `pengguna_terautentikasi` | `200` | Daftar master status kepegawaian (opsional query: `is_active`, `category`, `search`) |
| `GET /employment-statuses/:id` | `pengguna_terautentikasi` | `200`, `404` | Detail satu status kepegawaian |
| `POST /employment-statuses` | `admin_yayasan`, `hrd` | `201`, `409`, `422` | Tambah status kepegawaian baru (`code`, `name`, `category`, `description`, `sort_order`, `is_active`) |
| `PUT /employment-statuses/:id` | `admin_yayasan`, `hrd` | `200`, `404`, `409` | Ubah status kepegawaian (cascade update kode ke pegawai jika kode diubah) |
| `DELETE /employment-statuses/:id` | `admin_yayasan`, `hrd` | `200`, `404`, `409` | Hapus status (dicegah jika masih digunakan oleh pegawai aktif) |

---

#### 1.1 Fitur: CRUD Data Pegawai (Master)

##### `GET /api/v1/kepegawaian/employees`
- **Aktor:** `admin_yayasan`, `hrd` (lintas sekolah/🏢 sesuai penugasan)
- **Status HTTP:** `200 OK`
- **Query params:** `school_unit_id`, `employment_status`, `account_status`, `search`, `page`, `per_page`
- **Deskripsi:** Daftar pegawai dengan filter & pencarian. Field NIK disamarkan (masked) untuk aktor non-admin.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "school_unit_id": 1,
        "employee_number": "PEG-0001",
        "nik": "3201************0001",
        "full_name": "Ahmad Fauzi",
        "mother_name": "Siti Aminah",
        "citizenship": "Indonesia",
        "employment_status": "gtt",
        "account_status": "active",
        "current_position": { "id": 3, "name": "Guru Kelas" }
      }
    ],
    "pagination": { "page": 1, "per_page": 20, "total": 1 }
  },
  "message": "Daftar pegawai berhasil diambil",
  "errors": null
}
```

##### `GET /api/v1/kepegawaian/employees/:id`
- **Aktor:** `admin_yayasan`, `hrd` (🏢), `pegawai` (👤 — hanya data sendiri)
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Detail satu pegawai, termasuk `current_position`, `current_rank`, serta data turunan usia (`age` dihitung on-the-fly dari `birth_date`).

##### `POST /api/v1/kepegawaian/employees`
- **Aktor:** `admin_yayasan`, `hrd`
- **Status HTTP:** `201 Created`, `422 Unprocessable Entity`, `409 Conflict`
- **Deskripsi:** Tambah pegawai baru secara langsung (di luar alur rekrutmen §1.6). Setelah
  tersimpan, backend memicu provisioning akun `staff` ke Core Service
  (`POST /api/v1/core/internal/users`, `ref_type='staff'`, `ref_id=<employees.id>`).

**Request Body:**
```json
{
  "school_unit_id": 1,
  "employee_number": "PEG-0003",
  "nik": "3201012345670001",
  "full_name": "Budi Santoso",
  "mother_name": "Siti Rahma",
  "citizenship": "Indonesia",
  "gender": "male",
  "birth_place": "Bogor",
  "birth_date": "1990-05-12",
  "religion": "Islam",
  "marital_status": "married",
  "employment_status": "ptt",
  "phone_number": "08123456789",
  "email": "budi@example.com"
}
```

##### `PUT /api/v1/kepegawaian/employees/:id`
- **Aktor:** `admin_yayasan`, `hrd` (🏢)
- **Status HTTP:** `200 OK`, `404 Not Found`, `422 Unprocessable Entity`
- **Deskripsi:** Ubah data induk pegawai.

##### `PATCH /api/v1/kepegawaian/employees/:id/status`
- **Aktor:** `admin_yayasan`, `hrd` (🏢)
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Ubah `account_status` (`active`/`inactive`/`resigned`/`retired`). Perubahan ke
  `resigned`/`retired` memicu webhook `employee.status_changed` ke subscriber (mis. Core untuk
  menonaktifkan akun, Komunikasi untuk update direktori).

---

#### 1.1A Fitur: Alamat KTP & Domisili Pegawai

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/addresses` | `hrd`, `pegawai` (👤) | `200` | Daftar alamat pegawai (KTP & Domisili) |
| `POST /employees/:id/addresses` | `hrd`, `pegawai` (👤) | `201`, `409`, `422` | Tambah/set alamat (`address_type`: `ktp`/`domisili`) |
| `PUT /addresses/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Ubah rincian alamat |
| `DELETE /addresses/:id` | `hrd` | `200`, `404` | Hapus alamat |

---

#### 1.2 Fitur: Data Pegawai Detail (Pendidikan, Sertifikasi, Diklat, Keahlian)

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/education-trainings` | `hrd`, `pegawai` (👤) | `200` | Riwayat pendidikan/diklat/sertifikasi/keahlian |
| `POST /employees/:id/education-trainings` | `hrd`, `pegawai` (👤) | `201`, `422` | Tambah entri (`record_type`: `education`/`training`/`certification`/`skill`, `major`, `event_start_date`, `proficiency_level`, `certificate_number`) |
| `PUT /education-trainings/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Ubah entri |
| `DELETE /education-trainings/:id` | `hrd` | `200`, `404` | Hapus entri |

---

#### 1.3 Fitur: Riwayat Jabatan, Golongan, SK Pengangkatan, SPK & Penugasan

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/position-history` | `hrd`, `pegawai` (👤) | `200` | Riwayat jabatan, SK pengangkatan, SPK, dan penugasan |
| `POST /employees/:id/position-history` | `hrd` | `201`, `422` | Tambah riwayat (`document_type`: `pengangkatan`/`spk`/`penugasan`/`jabatan_internal`, `document_number`, `validity_years`, `evaluation_note`) |

---

#### 1.4 Fitur: Data Keluarga Pegawai

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/family-members` | `hrd`, `pegawai` (👤) | `200` | Daftar pasangan & anak (termasuk `birth_place`, `marriage_date`, `occupation`) |
| `POST /employees/:id/family-members` | `hrd`, `pegawai` (👤) | `201`, `422` | Tambah anggota keluarga |
| `PUT /family-members/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Ubah data |
| `DELETE /family-members/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Hapus data |

---

#### 1.4A Fitur: Riwayat Karya Tulis & Publikasi

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/publications` | `hrd`, `pegawai` (👤) | `200` | Daftar karya tulis & publikasi ilmiah |
| `POST /employees/:id/publications` | `hrd`, `pegawai` (👤) | `201`, `422` | Tambah karya tulis (`title`, `publication_year`, `publisher_or_media`, `publication_url`, `notes`) |
| `PUT /publications/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Ubah karya tulis |
| `DELETE /publications/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Hapus karya tulis |

---

#### 1.4B Fitur: Riwayat Pengalaman Kerja Eksternal

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/work-experiences` | `hrd`, `pegawai` (👤) | `200` | Daftar riwayat kerja di luar yayasan |
| `POST /employees/:id/work-experiences` | `hrd`, `pegawai` (👤) | `201`, `422` | Tambah pengalaman kerja (`organization_name`, `role_title`, `start_date`, `end_date`) |
| `PUT /work-experiences/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Ubah pengalaman kerja |
| `DELETE /work-experiences/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Hapus pengalaman kerja |

---

#### 1.4C Fitur: Riwayat Surat Peringatan (SP)

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/warning-letters` | `hrd`, `atasan` (🔗), `pegawai` (👤 - lihat saja) | `200` | Daftar surat peringatan yang pernah diterima pegawai |
| `POST /employees/:id/warning-letters` | `hrd` | `201`, `422` | Terbitkan surat peringatan (`warning_date`, `letter_number`, `description`, `issued_by`) |
| `PUT /warning-letters/:id` | `hrd` | `200`, `404` | Ubah data SP |
| `DELETE /warning-letters/:id` | `hrd` | `200`, `404` | Hapus data SP |

---

#### 1.4D Fitur: Kegiatan Organisasi & Kemasyarakatan

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/organization-activities` | `hrd`, `pegawai` (👤) | `200` | Riwayat keaktifan organisasi sosial / profesi |
| `POST /employees/:id/organization-activities` | `hrd`, `pegawai` (👤) | `201`, `422` | Tambah kegiatan organisasi (`organization_name`, `position`, `year`) |
| `PUT /organization-activities/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Ubah data kegiatan |
| `DELETE /organization-activities/:id` | `hrd`, `pegawai` (👤) | `200`, `404` | Hapus data kegiatan |

---

#### 1.4E Fitur: Kelengkapan Berkas Pegawai

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/document-checklists` | `hrd`, `pegawai` (👤 - lihat saja) | `200` | Status ketersediaan berkas wajib pegawai |
| `POST /employees/:id/document-checklists` | `hrd` | `201`, `422` | Set status berkas (`document_name`, `status`: `available`/`not_available`) |
| `PUT /document-checklists/:id` | `hrd` | `200`, `404` | Ubah status berkas |
| `DELETE /document-checklists/:id` | `hrd` | `200`, `404` | Hapus item checklist berkas |

---

#### 1.4F Fitur: Data Rekening Bank Pegawai (Sensitif Finansial)

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/bank-account` | `hrd`, `pegawai` (👤 - lihat saja) | `200`, `404` | Data nomor rekening bank pegawai |
| `PUT /employees/:id/bank-account` | `hrd` | `200`, `201` | Set/ubah data rekening bank (`bank_name`, `account_number`, `account_holder_name`) |

---

#### 1.5 Fitur: Data Pensiun

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/retirement-plan` | `hrd`, `pegawai` (👤) | `200`, `404` | Lihat rencana pensiun |
| `PUT /employees/:id/retirement-plan` | `hrd` | `200`, `201` | Buat/ubah rencana pensiun (upsert, karena `UNIQUE(employee_id)`) |

---

#### 1.6 Fitur: Rekrutmen & Onboarding Pegawai Baru

##### `GET /api/v1/kepegawaian/recruitment-candidates`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`
- **Query params:** `selection_stage`, `school_unit_id`

##### `POST /api/v1/kepegawaian/recruitment-candidates`
- **Aktor:** `hrd`
- **Status HTTP:** `201 Created`

##### `PATCH /api/v1/kepegawaian/recruitment-candidates/:id/stage`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`
- **Request Body:** `{ "selection_stage": "interview" }`

##### `POST /api/v1/kepegawaian/recruitment-candidates/:id/activate`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`, `409 Conflict` (kalau sudah pernah diaktifkan)
- **Deskripsi:** Titik masuk resmi kandidat → pegawai. Membuat baris baru di `employees`,
  mengisi `recruitment_candidates.activated_employee_id`, lalu memicu provisioning akun `staff`
  ke Core Service — **inilah** implementasi nyata dari ketergantungan dua arah
  Kepegawaian↔Core Service yang dicatat di `rancangan-kepegawaian.md` §6.

**Request Body:**
```json
{
  "employee_number": "PEG-0004",
  "employment_status": "gtt",
  "current_position_id": 3,
  "birth_date": "1995-03-10",
  "gender": "female"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "employee_id": 5,
    "core_account_provisioned": true,
    "core_username": "budi.santoso"
  },
  "message": "Kandidat berhasil diaktifkan sebagai pegawai dan akun Core Service dibuat",
  "errors": null
}
```

---

### MODUL 2: ORGANISASI

#### 2.1 Fitur: DUK Pangkat

##### `GET /api/v1/kepegawaian/duk-pangkat`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`
- **Query params:** `school_unit_id` (wajib)
- **Deskripsi:** **Tidak ada tabel fisik** (lihat `erd-kepegawaian.md` §0 Keputusan #3) — dihitung
  saat request dari `employees` + `employee_position_history`, diurutkan golongan lalu TMT.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    { "urutan": 1, "employee_id": 1, "full_name": "Ahmad Fauzi", "golongan": "III/a", "tmt": "2020-07-01" }
  ],
  "message": "DUK Pangkat berhasil dibuat",
  "errors": null
}
```

#### 2.2 Fitur: Manajemen Jabatan & Struktur Organisasi

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /job-positions` | `hrd`, `admin_yayasan` | `200` | Daftar jabatan (filter `school_unit_id`) |
| `GET /job-positions/tree` | `hrd`, `admin_yayasan` | `200` | Struktur pohon (nested, dari `parent_position_id`) |
| `POST /job-positions` | `hrd`, `admin_yayasan` | `201`, `422` | Tambah jabatan |
| `PUT /job-positions/:id` | `hrd`, `admin_yayasan` | `200`, `404` | Ubah jabatan |
| `DELETE /job-positions/:id` | `admin_yayasan` | `200`, `409` (kalau masih dipakai `employees.current_position_id`) | Hapus jabatan |

#### 2.3 Fitur: Riwayat Mutasi/Promosi

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /employees/:id/mutations` | `hrd`, `pegawai` (👤) | `200` | Riwayat mutasi/promosi satu pegawai |
| `POST /employees/:id/mutations` | `hrd` | `201`, `422` | Catat mutasi baru — juga menambah baris di `employee_position_history` dan update `employees.current_position_id` |

---

### MODUL 3: KEHADIRAN

#### 3.1 Fitur: Presensi/Absensi Pegawai

##### `GET /api/v1/kepegawaian/attendances`
- **Aktor:** `hrd` (🏢), `pegawai` (👤)
- **Status HTTP:** `200 OK`
- **Query params:** `employee_id`, `school_unit_id`, `date_from`, `date_to`

##### `POST /api/v1/kepegawaian/attendances/check-in`
- **Aktor:** `pegawai` (👤), `hrd` (untuk input manual)
- **Status HTTP:** `201 Created`, `409 Conflict` (sudah check-in hari itu)

##### `PATCH /api/v1/kepegawaian/attendances/:id/check-out`
- **Aktor:** `pegawai` (👤), `hrd`
- **Status HTTP:** `200 OK`, `404 Not Found`

##### `PATCH /api/v1/kepegawaian/attendances/:id`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Koreksi manual oleh HRD (mis. status jadi `sick`/`permitted`).

#### 3.2 Fitur: Cuti & Izin

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /leave-requests` | `hrd` (🏢), `atasan` (bawahannya), `pegawai` (👤) | `200` | Daftar pengajuan cuti/izin |
| `POST /leave-requests` | `pegawai` (👤) | `201`, `422` | Ajukan cuti/izin |
| `PATCH /leave-requests/:id/approve` | `atasan`, `hrd` | `200`, `404`, `409` (sudah diproses) | Setujui |
| `PATCH /leave-requests/:id/reject` | `atasan`, `hrd` | `200`, `404`, `409` | Tolak (wajib `reason`) |

#### 3.3 Fitur: Lembur

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /overtimes` | `hrd` (🏢), `atasan`, `pegawai` (👤) | `200` | Daftar pengajuan lembur |
| `POST /overtimes` | `pegawai` (👤) | `201`, `422` | Catat lembur |
| `PATCH /overtimes/:id/approve` | `atasan`, `hrd` | `200`, `404`, `409` | Setujui |
| `PATCH /overtimes/:id/reject` | `atasan`, `hrd` | `200`, `404`, `409` | Tolak |

---

### MODUL 4: PENGGAJIAN

#### 4.1 Fitur: Perhitungan Gaji (Payroll)

> **Catatan:** rumus komponen gaji & potongan otomatis belum final (lihat
> `rancangan-kepegawaian.md` §5) — endpoint `calculate` di bawah membuat kerangka `payroll_items`
> per pegawai aktif di periode itu, isi `salary_components`/`deductions` tetap disunting manual
> oleh HRD sampai rumus dikonfirmasi.

##### `POST /api/v1/kepegawaian/payroll/periods`
- **Aktor:** `hrd`
- **Status HTTP:** `201 Created`, `409 Conflict` (periode sudah ada)
- **Request Body:** `{ "school_unit_id": 1, "period_month": 8, "period_year": 2026 }`

##### `POST /api/v1/kepegawaian/payroll/periods/:id/calculate`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`, `409 Conflict` (status bukan `draft`)
- **Deskripsi:** Membuat/mengisi ulang `payroll_items` untuk seluruh pegawai aktif di sekolah
  terkait berdasarkan `employee_attendances`, `employee_leave_requests`,
  `employee_overtimes` periode itu. Status periode berubah jadi `calculated`.

##### `GET /api/v1/kepegawaian/payroll/periods/:id/items`
- **Aktor:** `hrd`, `pegawai` (👤 — hanya baris miliknya)
- **Status HTTP:** `200 OK`

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "employee_id": 1,
      "salary_components": { "gaji_pokok": 4500000, "tunjangan_jabatan": 500000 },
      "deductions": { "potongan_alpa": 0 },
      "net_salary": 5000000,
      "verified_by": null
    }
  ],
  "message": "Rincian payroll berhasil diambil",
  "errors": null
}
```

##### `PATCH /api/v1/kepegawaian/payroll/items/:id`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Koreksi manual `salary_components`/`deductions` sebelum verifikasi final.

##### `PATCH /api/v1/kepegawaian/payroll/items/:id/verify`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`, `404 Not Found`

##### `PATCH /api/v1/kepegawaian/payroll/periods/:id/status`
- **Aktor:** `hrd`
- **Status HTTP:** `200 OK`, `409 Conflict`
- **Request Body:** `{ "status": "sent_to_finance" }`
- **Deskripsi:** Menandai periode siap dicairkan Keuangan. **Saat ini murni perubahan status
  manual** — belum ada webhook sungguhan ke Keuangan karena modul itu belum ada (lihat
  `rancangan-kepegawaian.md` §6). Endpoint `GET .../items` di atas yang nanti dipanggil Keuangan
  begitu modul itu dibangun.

---

### MODUL 5: KINERJA

#### 5.1 Fitur: Penilaian Kinerja Dasar (Harian/Bulanan)

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /performance-reviews` | `hrd` (🏢), `atasan` (bawahannya), `pegawai` (👤) | `200` | Daftar penilaian, filter `employee_id`/`period` |
| `POST /performance-reviews` | `atasan`, `hrd` | `201`, `422` | Input penilaian baru — **skala `score` belum final**, lihat `rancangan-kepegawaian.md` §5 |
| `PUT /performance-reviews/:id` | `atasan` (penilai asli), `hrd` | `200`, `404` | Ubah penilaian |

#### 5.2 Fitur: Statistik Kepegawaian

##### `GET /api/v1/kepegawaian/statistics`
- **Aktor:** `hrd`, `admin_yayasan`
- **Status HTTP:** `200 OK`
- **Query params:** `school_unit_id`, `dimension` (`rank`/`gender`/`marital_status`/`age_group`)
- **Deskripsi:** Tidak ada tabel sendiri — agregasi `COUNT`/`GROUP BY` atas `employees`.

---

### MODUL 6: INTEGRASI

#### 6.1 Fitur: Endpoint Data Pegawai untuk Aplikasi Lain

> Seluruh endpoint di bawah memakai `X-API-Key`, dipanggil modul lain (Akademik, Sarpras,
> Perpustakaan, Komunikasi & Notifikasi, Tahfidz & Al-Quran, Pengelolaan) lewat pemanggilan
> service-layer in-process (satu proses `api-backend`, sesuai `ARSITEKTUR-SISTEM.md` Bagian 1.1).

##### `GET /api/v1/kepegawaian/internal/employees`
- **Aktor:** `internal_service`
- **Status HTTP:** `200 OK`, `401 Unauthorized`
- **Query params:** `school_unit_id`, `employment_status`, `ids` (comma-separated, untuk batch lookup)
- **Deskripsi:** Data ringkas pegawai untuk ditampilkan di modul lain (mis. daftar pengajar di
  Akademik, keanggotaan Perpustakaan).

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "employee_number": "PEG-0001", "full_name": "Ahmad Fauzi", "school_unit_id": 1, "current_position": "Guru Kelas" }
  ],
  "message": "Data pegawai berhasil diambil",
  "errors": null
}
```

##### `GET /api/v1/kepegawaian/internal/employees/:id`
- **Aktor:** `internal_service`
- **Status HTTP:** `200 OK`, `404 Not Found`

##### `GET /api/v1/kepegawaian/internal/job-positions/tree`
- **Aktor:** `internal_service`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Dipakai Sarpras untuk alur approval peminjaman berjenjang berdasar struktur
  jabatan (lihat PRD baris No. 141).

---

### MODUL 7: ASESMEN PSIKOLOGI (MBTI & KEPRIBADIAN)

#### 7.1 Kelompok 1: Bank Soal & Master (Admin & HRD)
*Memerlukan JWT Bearer Token & Permission `psychotest_bank.manage`*

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /psychotest/types` | `hrd`, `admin` | `200` | List instrumen tes psikologi |
| `POST /psychotest/types` | `hrd`, `admin` | `201`, `422` | Buat instrumen tes baru |
| `GET /psychotest/dimensions` | `hrd`, `admin` | `200` | List sumbu/dimensi (filter `test_type_id`) |
| `POST /psychotest/dimensions` | `hrd`, `admin` | `201`, `422` | Tambah dimensi tes |
| `GET /psychotest/questions` | `hrd`, `admin` | `200` | List bank soal (filter `test_type_id`, `dimension_id`) |
| `POST /psychotest/questions` | `hrd`, `admin` | `201`, `422` | Tambah butir pertanyaan |
| `PUT /psychotest/questions/:id` | `hrd`, `admin` | `200`, `404` | Perbarui butir pertanyaan |
| `DELETE /psychotest/questions/:id` | `hrd`, `admin` | `200`, `400` | Hapus butir pertanyaan |
| `GET /psychotest/profiles` | `hrd`, `admin` | `200` | List profil interpretasi HRD |
| `POST /psychotest/profiles` | `hrd`, `admin` | `201`, `422` | Tambah/ubah profil interpretasi |

#### 7.2 Kelompok 2: Sesi & Laporan Asesmen (HRD)
*Memerlukan JWT Bearer Token & Permission `psychotest_sessions.manage`*

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /psychotest/sessions` | `hrd`, `admin` | `200` | List sesi asesmen (filter `status`, `test_type_id`) |
| `POST /psychotest/sessions` | `hrd`, `admin` | `201`, `422` | Buat/jadwalkan sesi asesmen (pelamar/pegawai) |
| `GET /psychotest/sessions/:id` | `hrd`, `admin` | `200`, `404` | Detail sesi asesmen |
| `DELETE /psychotest/sessions/:id` | `hrd`, `admin` | `200`, `404` | Hapus sesi asesmen |
| `GET /psychotest/sessions/:id/result` | `hrd`, `admin` | `200`, `404` | Laporan hasil kuantitatif & kualitatif lengkap |
| `POST /psychotest/sessions/:id/evaluate` | `hrd`, `asesor` | `200`, `422` | Simpan catatan observasi & evaluasi asesor |

#### 7.3 Kelompok 3: Self-Service Pegawai (Terautentikasi)
*Memerlukan JWT Bearer Token*

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /psychotest/my-tests` | `pegawai` (👤) | `200` | Daftar penugasan tes psikologi milik sendiri |
| `GET /psychotest/my-tests/:session_id/take` | `pegawai` (👤) | `200`, `403` | Ambil lembar soal untuk dikerjakan |
| `POST /psychotest/my-tests/:session_id/answer` | `pegawai` (👤) | `200`, `403` | Simpan/auto-save jawaban butir soal |
| `POST /psychotest/my-tests/:session_id/submit` | `pegawai` (👤) | `200`, `403` | Kirim & selesaikan tes (pemicu skoring otomatis) |
| `GET /psychotest/my-tests/:session_id/result` | `pegawai` (👤) | `200`, `403` | Hasil tes sendiri (jika flag diizinkan) |

#### 7.4 Kelompok 4: Publik Berbasis Token (Kandidat Rekrutmen - Tanpa Login)
*Diakses tanpa JWT, divalidasi via `publicTokenMiddleware`*

| Method & Path | Aktor | Status HTTP | Deskripsi |
|---|---|---|---|
| `GET /psychotest/public/:token` | `pelamar`, `publik` | `200`, `404`, `410` | Validasi token & status sesi |
| `GET /psychotest/public/:token/questions` | `pelamar`, `publik` | `200`, `400`, `404` | Ambil lembar butir pertanyaan |
| `POST /psychotest/public/:token/answers` | `pelamar`, `publik` | `200`, `400` | Simpan/auto-save jawaban butir soal |
| `POST /psychotest/public/:token/submit` | `pelamar`, `publik` | `200`, `400` | Kirim jawaban & kalkulasi skoring server |
| `GET /psychotest/public/:token/result` | `pelamar`, `publik` | `200`, `400` | Ringkasan penyelesaian tes publik |

---

## 3. Webhook yang Dipublikasikan Kepegawaian

Mengikuti format global `ARSITEKTUR-SISTEM.md` Bagian 4.3
(`{ event_type, timestamp, data, satuan_pendidikan_id }`), didaftarkan lewat fitur "Webhook
subscriber management" milik Core Service:

| `event_type` | Dipicu Saat | Konsumen Potensial |
|---|---|---|
| `employee.created` | Pegawai baru diaktifkan (§1.6) | Core Service (provisioning akun — dipanggil langsung, bukan lewat webhook, lihat §1.6), Komunikasi & Notifikasi |
| `employee.status_changed` | `account_status` berubah (§1.1) | Core Service (nonaktifkan akun), Komunikasi & Notifikasi |
| `employee.position_changed` | Riwayat jabatan baru / mutasi (§2.3) | Sarpras (approval berjenjang), Pengelolaan |
| `psychotest.completed` | Sesi psikotes peserta selesai dikerjakan & dinilai | Modul Rekrutmen, Pengelolaan |

## 4. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-19 | Penambahan spesifikasi kontrak Modul 7: Asesmen Psikologi (MBTI & Big Five) mencakup 4 kelompok endpoint: Bank Soal & Master Admin, Sesi & Laporan HRD, Self-Service Pegawai, serta Endpoint Publik Berbasis Token. |
| 2026-08-17 | Dokumen dibuat mengikuti pola `api-contract-coreservice.md`, mencakup seluruh 16 fitur (14 tabel + 2 fitur tanpa tabel). Endpoint payroll ditandai bergantung pada Keputusan Terbuka §5 `rancangan-kepegawaian.md` (rumus komponen gaji belum final). |
