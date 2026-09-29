Status: perlu-revisi
Diperbarui: 2026-08-31

# api-contract-manajemen.md

> Dokumen ini adalah spesifikasi kontrak RESTful API resmi untuk **modul Manajemen**. Mengikuti
> pola `api-contract-coreservice.md` — acuan format sudah final di Core Service, dokumen ini
> **mengikuti**, bukan menentukan format baru.
>
> **Status: DRAF.** Sejumlah endpoint (ditandai ⚠️) bergantung pada Keputusan Terbuka di
> `rancangan-manajemen.md` §5 / `erd-manajemen.md` §0 — bentuk request/response-nya bisa berubah
> begitu keputusan itu final.

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/manajemen`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/manajemen`
- **Lokal Development:** `http://localhost:3000/api/v1/manajemen`

### 1.2 Skema Autentikasi & Otorisasi

Sesuai `ARSITEKTUR-SISTEM.md` §4.3 dan pola Core Service:

1. **Bearer Token (JWT) — untuk Pengguna:**
   ```http
   Authorization: Bearer <access_token>
   ```
   Token diterbitkan Core Service, diverifikasi lokal (in-process) oleh modul Manajemen — tidak
   ada endpoint login sendiri di modul ini.

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service:**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai Kepegawaian untuk memanggil endpoint internal `/internal/employee-performance-evaluations`
   (lihat Fitur #194, Keputusan Terbuka #1 `erd-manajemen.md` §0).

### 1.3 Standar Struktur Response JSON

Sama persis dengan Core Service — `{ success, data, message, errors }`. Lihat
`api-contract-coreservice.md` §1.3 untuk contoh lengkap, tidak diulang di sini.

### 1.4 Kode Status HTTP

Sama persis dengan Core Service (`200/201/400/401/403/404/409/422/429/500`) — lihat
`api-contract-coreservice.md` §1.4.

### 1.5 Definisi Aktor (Berdasarkan `roles-manajemen.md`)

- `kepala_sekolah` — pemilik keputusan strategis (RIPS, RKS, approval tertinggi)
- `tim_mutu` — pengelola KPI, Evadir, akreditasi, dashboard mutu
- `kepala_unit` — pemilik Program Kerja unit/bidang miliknya
- `atasan_hrd` — penilai evaluasi kinerja mendalam (bisa atasan langsung atau HRD)
- `pengawas` — pelaksana supervisi akademik/manajerial
- `pic_kegiatan` — penanggung jawab proyek/task
- `pegawai_umum` — semua pegawai (self-service task tracking, lihat progress)
- `internal_service` — kredensial mesin untuk Kepegawaian (fitur #194)

Detail matriks hak akses lengkap ada di `roles-manajemen.md`.

---

## 2. Daftar & Detail Endpoint per Fitur

---

### KATEGORI: PERENCANAAN

#### Fitur #190: RIPS (Rencana Induk Pengembangan Sekolah)

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/institution-development-plans` | `kepala_sekolah`, `tim_mutu` | Daftar RIPS per `school_unit_id` |
| `GET` | `/institution-development-plans/:id` | `kepala_sekolah`, `tim_mutu` | Detail satu RIPS |
| `POST` | `/institution-development-plans` | `kepala_sekolah` | Buat RIPS baru (status awal `draft`) |
| `PUT` | `/institution-development-plans/:id` | `kepala_sekolah` | Ubah RIPS (hanya saat status `draft`) |
| `PATCH` | `/institution-development-plans/:id/approve` | `kepala_sekolah` | Ubah status jadi `active` |
| `PATCH` | `/institution-development-plans/:id/archive` | `kepala_sekolah` | Ubah status jadi `archived` |

**Contoh `POST /institution-development-plans`:**
```json
{
  "school_unit_id": 1,
  "title": "RIPS SD Contoh 1 2026-2030",
  "period_start_year": 2026,
  "period_end_year": 2030,
  "vision": "Menjadi sekolah unggulan berbasis karakter",
  "mission": "Meningkatkan mutu akademik dan non-akademik secara berkelanjutan"
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "data": { "id": 1, "status": "draft", "created_by": 12, "created_at": "2026-08-18T09:00:00Z" },
  "message": "RIPS berhasil dibuat",
  "errors": null
}
```

#### Fitur #191: RKS (Rencana Kerja Sekolah) tahunan

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/school-work-plans` | `kepala_sekolah` | Daftar RKS, filter `school_unit_id`, `academic_year_id` |
| `GET` | `/school-work-plans/:id` | `kepala_sekolah` | Detail RKS + daftar Program Kerja turunannya |
| `POST` | `/school-work-plans` | `kepala_sekolah` | Buat RKS baru, opsional `institution_development_plan_id` |
| `PUT` | `/school-work-plans/:id` | `kepala_sekolah` | Ubah RKS (hanya `draft`/`submitted`) |
| `PATCH` | `/school-work-plans/:id/submit` | `kepala_sekolah` | `draft` → `submitted` |
| `PATCH` | `/school-work-plans/:id/approve` | `kepala_sekolah` | `submitted` → `approved` |

#### Fitur #192: Program Kerja per unit/bidang

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/work-plan-programs` | `kepala_sekolah`, `kepala_unit` | Daftar, filter `school_unit_id`, `school_work_plan_id`, `pic_employee_id`, `status` |
| `GET` | `/work-plan-programs/:id` | `kepala_sekolah`, `kepala_unit` | Detail |
| `POST` | `/work-plan-programs` | `kepala_unit` | Buat Program Kerja unit baru |
| `PUT` | `/work-plan-programs/:id` | `kepala_unit` (pemilik), `kepala_sekolah` | Ubah |
| `PATCH` | `/work-plan-programs/:id/status` | `kepala_unit` (pemilik), `kepala_sekolah` | Ubah `status` (`planned`/`ongoing`/`done`/`cancelled`) |
| `DELETE` | `/work-plan-programs/:id` | `kepala_sekolah` | Hapus (hanya status `planned`) |

---

### KATEGORI: MUTU

#### Fitur #193: Dashboard KPI & Indikator Mutu

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/quality-indicators` | `kepala_sekolah`, `tim_mutu` | Daftar definisi indikator |
| `POST` | `/quality-indicators` | `tim_mutu` | Buat indikator baru |
| `PUT` | `/quality-indicators/:id` | `tim_mutu` | Ubah definisi indikator |
| `GET` | `/quality-indicators/:id/achievements` | `kepala_sekolah`, `tim_mutu` | Riwayat capaian per periode |
| `POST` | `/quality-indicators/:id/achievements` | `tim_mutu` | ⚠️ Input capaian manual per periode (lihat Keputusan Terbuka #2) |
| `GET` | `/quality-indicators/dashboard` | `kepala_sekolah`, `tim_mutu` | Ringkasan semua indikator vs target, filter `school_unit_id`, `period` |

#### Fitur #194: Evaluasi Kinerja pegawai (mendalam)

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/employee-performance-evaluations` | `atasan_hrd` | Daftar, filter `employee_id`, `school_unit_id`, `period`, `status` |
| `GET` | `/employee-performance-evaluations/:id` | `atasan_hrd`, pegawai ybs (self-view) | Detail + kriteria |
| `POST` | `/employee-performance-evaluations` | `atasan_hrd` | Buat evaluasi baru, opsional `base_performance_review_id` dari Kepegawaian |
| `PUT` | `/employee-performance-evaluations/:id` | `atasan_hrd` | Ubah (hanya `draft`) |
| `POST` | `/employee-performance-evaluations/:id/criteria` | `atasan_hrd` | Tambah kriteria penilaian |
| `PATCH` | `/employee-performance-evaluations/:id/submit` | `atasan_hrd` | `draft` → `submitted`, hitung `total_score` |
| `PATCH` | `/employee-performance-evaluations/:id/approve` | `kepala_sekolah` | `submitted` → `approved` |
| `GET` | `/internal/employee-performance-evaluations` | `internal_service` (Kepegawaian) | ⚠️ Endpoint `X-API-Key` untuk Kepegawaian menarik hasil evaluasi final (lihat Keputusan Terbuka #1) |

#### Fitur #195: Evadir (Evaluasi Diri Sekolah)

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/self-evaluations` | `kepala_sekolah`, `tim_mutu` | Daftar, filter `school_unit_id`, `period_year` |
| `POST` | `/self-evaluations` | `tim_mutu` | ⚠️ Input skor per komponen standar (manual, lihat Keputusan Terbuka #3) |
| `PUT` | `/self-evaluations/:id` | `tim_mutu` | Ubah (hanya `draft`) |
| `PATCH` | `/self-evaluations/:id/submit` | `tim_mutu` | `draft` → `submitted` |

#### Fitur #196: Laporan akreditasi & instrumen mutu

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/accreditation-reports` | `tim_mutu` | Daftar laporan per `school_unit_id`, `accreditation_year` |
| `POST` | `/accreditation-reports` | `tim_mutu` | Buat laporan/standar baru |
| `GET` | `/accreditation-reports/:id/evidences` | `tim_mutu` | Daftar bukti per standar |
| `POST` | `/accreditation-reports/:id/evidences` | `tim_mutu` | Upload bukti + skor |
| `GET` | `/accreditation-reports/:id/generate` | `tim_mutu` | Generate ringkasan laporan (agregasi skor semua bukti) |

#### Fitur #201: Dashboard agregat lintas aplikasi

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/dashboard/cross-app` | `kepala_sekolah`, Yayasan | ⚠️ Ambil snapshot terbaru, filter `school_unit_id`, `date` (lihat Keputusan Terbuka #2 & #6) |
| `POST` | `/internal/dashboard/cross-app/snapshot` | `internal_service` | ⚠️ Trigger job pembuatan snapshot baru (dipanggil scheduler, bukan user) |

#### Fitur #202: Manajemen risiko/isu sekolah

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/school-risks` | `kepala_sekolah` | Daftar, filter `school_unit_id`, `status`, `category` |
| `POST` | `/school-risks` | `kepala_sekolah` | Catat risiko/isu baru |
| `PUT` | `/school-risks/:id` | `kepala_sekolah` | Ubah detail risiko |
| `PATCH` | `/school-risks/:id/status` | `kepala_sekolah` | Ubah `status` (`identified`→`mitigating`→`resolved`/`closed`) |

---

### KATEGORI: SUPERVISI

#### Fitur #197: Supervisi akademik & manajerial

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/supervision-schedules` | `kepala_sekolah`, `pengawas` | Daftar jadwal, filter `supervised_employee_id`, `supervision_type`, `status` |
| `POST` | `/supervision-schedules` | `pengawas` | Jadwalkan supervisi baru |
| `PATCH` | `/supervision-schedules/:id/status` | `pengawas` | Ubah status (`scheduled`/`done`/`cancelled`) |
| `POST` | `/supervision-schedules/:id/results` | `pengawas` | Input hasil (per aspek, skor, temuan, rekomendasi) |
| `GET` | `/supervision-schedules/:id/results` | `kepala_sekolah`, `pengawas`, pegawai ybs (self-view) | Lihat hasil |

---

### KATEGORI: MANAJEMEN PROYEK

#### Fitur #198: Pelacakan tugas (task tracking)

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/tasks` | `pegawai_umum` | Daftar task milik sendiri atau (untuk `pic_kegiatan`/`kepala_sekolah`) semua task di unit/proyeknya |
| `GET` | `/tasks/:id` | `pegawai_umum` (assignee), pembuat, `pic_kegiatan` | Detail + komentar |
| `POST` | `/tasks` | `pegawai_umum`, `pic_kegiatan` | Buat task baru, opsional `project_id` atau `reference_type`/`reference_id` |
| `PUT` | `/tasks/:id` | pembuat, `pic_kegiatan` | Ubah detail task |
| `PATCH` | `/tasks/:id/status` | assignee, pembuat | Ubah `status` |
| `POST` | `/tasks/:id/comments` | assignee, pembuat, `pic_kegiatan` | Tambah komentar |

#### Fitur #199: Manajemen proyek/kegiatan sekolah

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/projects` | `pic_kegiatan`, `kepala_sekolah` | Daftar proyek, filter `school_unit_id`, `status` |
| `GET` | `/projects/:id` | `pic_kegiatan`, anggota proyek, `kepala_sekolah` | Detail + anggota + task terkait |
| `POST` | `/projects` | `pic_kegiatan` | Buat proyek baru |
| `PUT` | `/projects/:id` | `pic_kegiatan` (pemilik) | Ubah detail |
| `PATCH` | `/projects/:id/status` | `pic_kegiatan` (pemilik) | Ubah status |
| `POST` | `/projects/:id/members` | `pic_kegiatan` (pemilik) | Tambah anggota |
| `DELETE` | `/projects/:id/members/:employee_id` | `pic_kegiatan` (pemilik) | Keluarkan anggota |

#### Fitur #200: Approval workflow (persetujuan berjenjang)

| Method | Path | Aktor | Deskripsi |
|---|---|---|---|
| `GET` | `/approval-workflows` | `kepala_sekolah` | Daftar definisi workflow |
| `POST` | `/approval-workflows` | `kepala_sekolah` | Buat workflow + jenjang (`approval_steps`) |
| `GET` | `/approval-requests` | atasan (sesuai jenjang aktif), pengaju | Daftar pengajuan, filter `status`, `reference_type` |
| `POST` | `/approval-requests` | siapa saja sesuai `applies_to` workflow | ⚠️ Ajukan approval (lihat Keputusan Terbuka #5, `reference_type`/`reference_id` generik) |
| `PATCH` | `/approval-requests/:id/action` | approver jenjang aktif (`current_step`) | Setujui/tolak/kembalikan — mencatat ke `approval_actions`, maju/mundur `current_step` |
| `GET` | `/approval-requests/:id/actions` | pengaju, approver terkait, `kepala_sekolah` | Riwayat aksi lengkap |

**Contoh `PATCH /approval-requests/:id/action`:**
```json
{
  "action": "approved",
  "notes": "Anggaran sesuai plafon, disetujui lanjut ke tahap berikutnya"
}
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": { "id": 5, "status": "pending", "current_step": 2 },
  "message": "Persetujuan tahap 1 dicatat, menunggu tahap 2",
  "errors": null
}
```

---

## 3. Endpoint Internal (`X-API-Key`) — Ringkasan

| Method | Path | Dipanggil oleh | Keterangan |
|---|---|---|---|
| `GET` | `/internal/employee-performance-evaluations` | Kepegawaian | ⚠️ Bergantung Keputusan Terbuka #1 — bisa berubah jadi Manajemen yang publish event, bukan Kepegawaian yang pull |
| `POST` | `/internal/dashboard/cross-app/snapshot` | Scheduler internal `api-backend` | Trigger job agregasi harian/mingguan |

---

## 4. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-28 | **Migrasi Fondasi Rombak Besar:** Drop tabel perencanaan & mutu lama (`institution_development_plans`, `school_work_plans`, `quality_indicators`, dll). Fondasi baru siap untuk endpoints RIPS, RKJP, RKJM, RKT, BSC, dan EVADIR baru serta penerbitan `document_publications`. |
| 2026-08-18 | Dokumen dibuat, mengikuti pola `api-contract-coreservice.md`. Endpoint bertanda ⚠️ menunggu Keputusan Terbuka di `rancangan-manajemen.md` §5 — jangan diimplementasikan sebagai final sampai dikonfirmasi. |

*(Tambahkan baris baru di atas setiap ada perubahan kontrak — jangan hapus riwayat lama.)*
