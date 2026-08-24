# panduan-pengembangan-kepegawaian.md

> **WAJIB DIBACA setiap mulai sesi baru terkait Kepegawaian** — bersama `rancangan-kepegawaian.md`,
> `erd-kepegawaian.md`, `api-contract-kepegawaian.md`, `roles-kepegawaian.md`. Modul ini
> dibangun **langsung di struktur monorepo yang sudah ada** (tidak ada kode lama yang perlu
> dipindah — beda dari Core Service yang butuh migrasi, lihat `panduan-pengembangan-core-service.md`
> Bagian 5 untuk pola acuan ini). Database Kepegawaian **belum ada sama sekali** — dibuat dari nol
> di Tahap 2.
>
> Setiap bagian di bawah punya **prompt Antigravity siap pakai** (untuk didelegasikan ke agen
> coding) dan **query SQL siap pakai** (untuk dijalankan langsung, terutama pembuatan database).
> Jalankan berurutan, uji tiap tahap sebelum lanjut ke tahap berikutnya.

---

## 0. Aturan Kerja — Lokal Dulu, Jangan Push

Sama seperti seluruh proyek (`ARSITEKTUR-SISTEM.md` Bagian 4.7,
`panduan-pengembangan-core-service.md` Bagian 0):

- [ ] Kerja & uji **di lokal** sampai benar-benar berfungsi. `git add`/`git commit` boleh sesering
      perlu, **`git push` ditunda** sampai Anda beri instruksi eksplisit.
- [ ] Buat branch lokal baru dulu, mis. `feat/kepegawaian-tahap-2-database`, sebelum mulai
      menulis kode setiap tahap — supaya gampang mundur kalau perlu.
- [ ] Backend & frontend diuji jalan lokal (`npm run dev` per folder `apps/`) sebelum dianggap
      "tahap selesai".
- [ ] Database lokal **baru**, terpisah dari `core_local` — dibuat di Tahap 2 di bawah, bukan
      Remote MySQL ke Hostinger.

---

## 1. Ringkasan Tahapan

| Tahap | Isi | Status |
|---|---|---|
| 1. Perencanaan | `rancangan-`, `erd-`, `api-contract-`, `roles-kepegawaian.md` | ✅ Selesai (dokumen ini seri dengan keempatnya) |
| 2. Database | Buat `kepegawaian_local`, migration & seed Knex | ⬜ Belum dimulai |
| 3. Backend | `apps/api-backend/src/modules/kepegawaian/`, mount `/api/v1/kepegawaian/...` | ⬜ Belum dimulai |
| 4. Frontend | `apps/core-portal/src/apps/kepegawaian/`, `Login.jsx`, kartu di `Launcher.jsx` | ⬜ Belum dimulai |
| 5. Integrasi | Provisioning akun ke Core, verifikasi endpoint internal untuk modul lain | ⬜ Belum dimulai |
| 6. Verifikasi lokal | Checklist manual end-to-end | ⬜ Belum dimulai |
| 7. Deployment | Push & deploy setelah disetujui developer | ⬜ Belum dimulai |

---

## 2. Tahap 2: Database

### 2.1 Buat Database Lokal `kepegawaian_local`

Jalankan langsung di MySQL/MariaDB lokal Anda (mis. lewat `mysql -u root -p` atau phpMyAdmin):

```sql
CREATE DATABASE IF NOT EXISTS kepegawaian_local
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'kepegawaian_local'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_LOKAL_ANDA';
GRANT ALL PRIVILEGES ON kepegawaian_local.* TO 'kepegawaian_local'@'localhost';
FLUSH PRIVILEGES;
```

> Ganti `GANTI_PASSWORD_LOKAL_ANDA` dengan password lokal Anda sendiri — pola penamaan
> user/database (`kepegawaian_local`) mengikuti persis konvensi `core_local` yang sudah dipakai
> Core Service (lihat `.env.example` Core: `CORE_DB_NAME=core_local`).

### 2.2 Catatan Teknis Penting — `knexfile.js` Saat Ini Hardcode Khusus Core

Sebelum menulis migration, ada satu hal yang **wajib ditangani lebih dulu**: file
`apps/api-backend/knexfile.js` dan `apps/api-backend/src/config/db/core.js` yang sudah ada saat
ini **hanya mengarah ke satu direktori migrations/seeds (`./db/migrations/core`,
`./db/migrations/seeds/core`) dan satu koneksi (`CORE_*`)**. Menambah folder
`db/migrations/kepegawaian/` saja **tidak cukup** — Knex CLI perlu tahu koneksi & direktori
migration mana yang dipakai untuk modul Kepegawaian.

**Pendekatan yang dipakai (per modul punya knexfile sendiri, pola paling sederhana & tidak
mengubah `knexfile.js` Core yang sudah jalan):** buat `apps/api-backend/knexfile.kepegawaian.js`
terpisah, dan `apps/api-backend/src/config/db/kepegawaian.js` mengikuti pola persis
`src/config/db/core.js` tapi baca prefix `KEPEGAWAIAN_*`.

#### Prompt Antigravity — Setup Config Database Multi-Modul

```
Saya sedang menambah modul Kepegawaian ke monorepo yang sudah ada modul Core Service. Saat ini
apps/api-backend/knexfile.js dan apps/api-backend/src/config/db/core.js hardcode khusus modul
"core" (satu direktori migrations/seeds, satu koneksi). Saya butuh pola yang bisa dipakai
berulang untuk modul lain juga, mulai dari Kepegawaian sekarang.

Tolong:
1. Baca apps/api-backend/knexfile.js dan apps/api-backend/src/config/db/core.js yang sudah ada
   sebagai referensi pola — JANGAN diubah isinya, biarkan tetap seperti sekarang untuk Core.
2. Buat apps/api-backend/knexfile.kepegawaian.js — salinan pola knexfile.js Core tapi:
   - baca env var CORE_DB_HOST dst diganti prefix KEPEGAWAIAN_ (KEPEGAWAIAN_DB_HOST,
     KEPEGAWAIAN_DB_USER, KEPEGAWAIAN_DB_PASSWORD, KEPEGAWAIAN_DB_NAME, KEPEGAWAIAN_DB_PORT)
   - migrations.directory: './db/migrations/kepegawaian'
   - migrations.tableName: 'knex_migrations_kepegawaian'
   - seeds.directory: './db/seeds/kepegawaian'
3. Buat apps/api-backend/src/config/db/kepegawaian.js — salinan pola src/config/db/core.js tapi
   require('../../../knexfile.kepegawaian') alih-alih '../../../knexfile', dan environment
   variable KEPEGAWAIAN_NODE_ENV alih-alih CORE_NODE_ENV.
4. Tambahkan ke apps/api-backend/.env.example (JANGAN ubah .env asli, itu bukan file yang
   di-commit): KEPEGAWAIAN_PORT tidak perlu (satu proses backend sama), tapi tambahkan
   KEPEGAWAIAN_DB_HOST=127.0.0.1, KEPEGAWAIAN_DB_PORT=3306, KEPEGAWAIAN_DB_USER=kepegawaian_local,
   KEPEGAWAIAN_DB_PASSWORD=GANTI_PASSWORD_LOKAL_ANDA, KEPEGAWAIAN_DB_NAME=kepegawaian_local.
5. Tambahkan script baru di package.json root (di sebelah migrate:core/seed:core yang sudah ada):
   "migrate:kepegawaian": "npm --workspace=apps/api-backend exec -- knex --knexfile knexfile.kepegawaian.js migrate:latest"
   "seed:kepegawaian": "npm --workspace=apps/api-backend exec -- knex --knexfile knexfile.kepegawaian.js seed:run"
6. Jangan jalankan migration/seed dulu — saya akan minta terpisah setelah file migration-nya
   ditulis. Jangan sentuh apapun yang berkaitan dengan modul Core Service atau Akademik yang
   sudah ada.
```

Setelah langkah ini selesai, isi `apps/api-backend/.env` Anda (bukan `.env.example`) dengan
kredensial nyata dari Bagian 2.1 di atas.

### 2.3 Buat File Migration Knex (14 Tabel)

#### Prompt Antigravity — Tulis Migration

```
Tolong buat file migration Knex.js untuk modul Kepegawaian di
apps/api-backend/db/migrations/kepegawaian/, satu file per tabel, urut sesuai dependency FK
(tabel yang direferensikan lebih dulu dari tabel yang mereferensikan), dengan format nama file
knex standar (timestamp_create_<nama_tabel>_table.js), meniru gaya penulisan migration Core
Service yang sudah ada di apps/api-backend/db/migrations/core/ (baca dulu 2-3 contohnya sebagai
referensi gaya, jangan disalin isinya).

Skema lengkap 14 tabel ada di erd-kepegawaian.md Bagian 2 dan DDL SQL referensi lengkap ada di
Bagian 3.1 dokumen yang sama (jadikan itu SATU-SATUNYA sumber kebenaran skema — jangan
menambah/mengurangi kolom di luar yang tertulis di sana). Urutan tabel:
1. employees (tanpa FK dulu ke job_positions, tambahkan FK current_position_id lewat migration
   terpisah SETELAH job_positions ada, sama seperti pola ALTER TABLE di erd-kepegawaian.md §3.1)
2. job_positions
3. (migration ALTER TABLE employees ADD FOREIGN KEY current_position_id)
4. employee_school_assignments
5. employee_education_trainings
6. employee_family_members
7. employee_retirement_plans
8. recruitment_candidates
9. employee_position_history
10. employee_mutations
11. employee_attendances
12. employee_leave_requests
13. employee_overtimes
14. payroll_periods
15. payroll_items
16. performance_reviews

Semua tabel pakai id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at/updated_at TIMESTAMP
(kecuali disebutkan lain di erd-kepegawaian.md), charset utf8mb4, engine InnoDB — ikuti opsi Knex
table.bigIncrements/table.timestamps yang setara, sesuai gaya migration Core Service yang sudah
ada. Setelah selesai, tampilkan daftar file yang dibuat, jangan jalankan migration dulu.
```

### 2.4 Buat File Seed Dummy

#### Prompt Antigravity — Tulis Seed

```
Tolong buat file seed Knex.js untuk modul Kepegawaian di
apps/api-backend/db/seeds/kepegawaian/001_initial_seed.js, meniru gaya
apps/api-backend/db/seeds/core/001_initial_seed.js yang sudah ada (baca dulu sebagai referensi
gaya penulisan, urutan delete-before-insert per tabel FK-safe, dsb).

Isi datanya persis seperti contoh SQL di erd-kepegawaian.md Bagian 3.2 (job_positions,
employees, employee_position_history dummy) — terjemahkan ke syntax Knex seed (insert()).
Catatan: employees di seed ini TIDAK membuat akun login apapun (tidak ada tabel password di
database Kepegawaian) — kalau nanti perlu login sebagai pegawai dummy untuk testing, itu
dilakukan lewat provisioning manual ke database core_local terpisah, bukan bagian dari seed ini.
```

### 2.5 Jalankan Migration & Seed

```bash
cd apps/api-backend
npm run migrate:kepegawaian   # dari root, atau: npx knex --knexfile knexfile.kepegawaian.js migrate:latest
npm run seed:kepegawaian      # dari root, atau: npx knex --knexfile knexfile.kepegawaian.js seed:run
```

Verifikasi manual lewat query:

```sql
USE kepegawaian_local;
SHOW TABLES;
SELECT COUNT(*) AS total_tabel FROM information_schema.tables
  WHERE table_schema = 'kepegawaian_local';   -- harus 14
SELECT id, employee_number, full_name, employment_status FROM employees;
SELECT id, name, level, parent_position_id FROM job_positions;
```

- [ ] `SHOW TABLES` menampilkan 14 tabel sesuai `erd-kepegawaian.md` §1.
- [ ] Seed dummy 2 pegawai & 4 jabatan berhasil masuk.

---

## 3. Tahap 3: Backend

### 3.1 Prompt Antigravity — Bangun Modul Backend

```
Tolong bangun backend modul Kepegawaian di apps/api-backend/src/modules/kepegawaian/, mengikuti
struktur & gaya kode modul Core Service yang sudah ada di apps/api-backend/src/modules/core/
(baca dulu 2-3 submodul di sana, mis. modules/core/users/ dan modules/core/school-units/, sebagai
referensi pola controller/routes/service — JANGAN copy isinya, itu logic Core, bukan Kepegawaian).

Kontrak endpoint lengkap ADA DI api-contract-kepegawaian.md — jadikan itu SATU-SATUNYA sumber
kebenaran untuk path, method, request/response, dan status HTTP. Struktur folder per submodul
(satu folder per Modul di api-contract-kepegawaian.md §2):
- modules/kepegawaian/employees/ (Modul 1 fitur 1.1, 1.6 aktivasi)
- modules/kepegawaian/employee-details/ (Modul 1 fitur 1.2-1.5: pendidikan, keluarga, pensiun)
- modules/kepegawaian/recruitment/ (Modul 1 fitur 1.6 selain aktivasi)
- modules/kepegawaian/organization/ (Modul 2: job-positions, duk-pangkat, mutations)
- modules/kepegawaian/attendance/ (Modul 3: attendances, leave-requests, overtimes)
- modules/kepegawaian/payroll/ (Modul 4)
- modules/kepegawaian/performance/ (Modul 5: performance-reviews, statistics)
- modules/kepegawaian/internal/ (Modul 6: endpoint X-API-Key untuk modul lain)

Setiap submodul: controller.js, routes.js, service.js (pola sama seperti Core). Koneksi database
pakai db instance dari apps/api-backend/src/config/db/kepegawaian.js (BUKAN core.js — itu
database Core Service, database Kepegawaian terpisah, lihat ARSITEKTUR-SISTEM.md Bagian 3 poin
1: tidak ada JOIN/FK fisik lintas database).

Untuk endpoint yang butuh data dari Core Service (mis. validasi school_unit_id, atau provisioning
akun staff di POST /employees dan POST /recruitment-candidates/:id/activate — lihat
api-contract-kepegawaian.md §1.1 dan §1.6), panggil service Core Service SECARA IN-PROCESS
(import langsung fungsi service dari apps/api-backend/src/modules/core/users/service.js), BUKAN
lewat HTTP — sesuai ARSITEKTUR-SISTEM.md Bagian 1.1 (satu proses backend, pemanggilan
service-layer in-process).

Middleware auth pakai yang sudah ada di apps/api-backend/src/middlewares/ (verifyJwt.js,
requirePermission.js) — JANGAN buat middleware auth baru, modul Kepegawaian tidak menerbitkan
token sendiri (lihat rancangan-kepegawaian.md Bagian 2). Kode permission yang dicek memakai
daftar di roles-kepegawaian.md Bagian 4 (kepegawaian.employees.view, dst).

Setelah semua submodul jadi, tolong JANGAN mount ke app.js dulu — saya akan minta itu di langkah
terpisah setelah saya review kodenya.
```

### 3.2 Prompt Antigravity — Mount Router

```
Tolong mount seluruh router modul Kepegawaian ke apps/api-backend/src/app.js, dengan prefix
/api/v1/kepegawaian/... SEJAK AWAL (bukan /api/v1/... dulu baru diprefix belakangan seperti pola
lama Core Service — lihat panduan-pengembangan-core-service.md Bagian 4.2 sebagai peringatan apa
yang harus dihindari).

Ikuti pola app.js yang sudah ada untuk coreV1Router (satu express.Router() per modul, di-mount
sekali ke app di paling bawah). Buat kepegawaianV1Router mencakup seluruh path di
api-contract-kepegawaian.md §2, termasuk prefix /internal/... untuk endpoint X-API-Key (Modul 6).
JANGAN ubah apapun terkait coreV1Router atau router modul Akademik yang sudah ada di app.js.
```

### 3.3 Verifikasi Backend Lokal

```bash
cd apps/api-backend
npm run dev
```

```bash
curl http://localhost:3000/api/v1/kepegawaian/employees \
  -H "Authorization: Bearer <access_token_dari_login_core>"
```

- [ ] `GET /api/v1/kepegawaian/employees` mengembalikan 2 pegawai dummy dari seed.
- [ ] `GET /api/v1/kepegawaian/job-positions/tree` mengembalikan struktur 4 jabatan dummy.
- [ ] Endpoint tanpa token mengembalikan `401 Unauthorized` sesuai `api-contract-kepegawaian.md`.

---

## 4. Tahap 4: Frontend

### 4.1 Prompt Antigravity — Bangun Halaman Frontend

```
Tolong bangun frontend modul Kepegawaian di apps/core-portal/src/apps/kepegawaian/pages/,
mengikuti struktur & gaya halaman Core Service yang sudah ada di
apps/core-portal/src/apps/core/pages/ (baca 2-3 halaman di sana sebagai referensi, mis.
ManajemenUser dan SatuanPendidikan — JANGAN copy logic-nya, itu punya Core).

PAKAI ULANG apps/core-portal/src/shared/ yang sudah ada (Layout, ProtectedRoute, AuthContext,
services/api.js dengan axios interceptor + auto-refresh token) — JANGAN bikin ulang logic
auth/interceptor, itu sudah jalan dan dipakai bersama semua modul (ARSITEKTUR-SISTEM.md Bagian
4.2, panduan-pengembangan-core-service.md Bagian 4.3).

Buat halaman berikut, satu route per halaman di bawah /kepegawaian/... :
- Login.jsx (login khusus modul ini, route /kepegawaian/login — pola sama seperti /core/login:
  form username/password, panggil POST /api/v1/core/auth/login lewat shared api service, simpan
  token lewat AuthContext yang sama, redirect ke /kepegawaian/dashboard)
- Dashboard.jsx (ringkasan jumlah pegawai, pengajuan cuti/lembur pending)
- DataPegawai.jsx (list + form tambah/edit, konsumsi GET/POST/PUT /employees)
- DetailPegawai.jsx (tab pendidikan/diklat, keluarga, pensiun, riwayat jabatan — konsumsi
  endpoint di api-contract-kepegawaian.md Modul 1 fitur 1.2-1.5)
- Rekrutmen.jsx (kandidat + aksi aktivasi)
- StrukturOrganisasi.jsx (tree view job-positions, DUK Pangkat)
- Presensi.jsx (list presensi, koreksi manual)
- CutiLembur.jsx (list + approve/reject)
- Payroll.jsx (list periode, generate, rincian per pegawai, verifikasi)
- PenilaianKinerja.jsx (list + form input penilaian)

Kontrak endpoint lengkap ada di api-contract-kepegawaian.md — jadikan itu sumber kebenaran
request/response tiap halaman. Styling pakai Tailwind CSS sesuai ARSITEKTUR-SISTEM.md Bagian
4.2. JANGAN sentuh apapun di apps/core-portal/src/apps/core/ atau apps/core-portal/src/shared/
selain memakainya (import), tidak mengubah isinya.
```

### 4.2 Prompt Antigravity — Tambah Kartu di Launcher

```
Tolong tambahkan satu kartu baru untuk modul Kepegawaian di
apps/core-portal/src/pages/Launcher.jsx, mengikuti pola kartu Core Service yang sudah ada di
file yang sama (nama, ikon, deskripsi singkat, link ke /kepegawaian/login). Kartu ini PUBLIK
(tidak butuh login untuk dilihat), sesuai ARSITEKTUR-SISTEM.md Bagian 1.1 dan
panduan-pengembangan-core-service.md Bagian 4.3 — hanya menambah entri baru, jangan ubah logic
Launcher yang sudah ada.
```

### 4.3 Verifikasi Frontend Lokal

```bash
cd apps/core-portal
npm run dev
```

- [ ] Buka `http://localhost:5173/` → kartu "Kepegawaian" tampil di Launcher tanpa login.
- [ ] Klik kartu → masuk `/kepegawaian/login`, isi akun pegawai dummy (dari Tahap 5.1 di bawah,
      setelah provisioning akun ke Core) → berhasil masuk ke `/kepegawaian/dashboard`.
- [ ] Kalau sudah login lewat modul lain (mis. Core), klik kartu Kepegawaian langsung masuk tanpa
      diminta login ulang (SSO, satu token di satu SPA).

---

## 5. Tahap 5: Integrasi

### 5.1 Provisioning Akun Dummy ke Core Service

Karena `employees` seed (Tahap 2.4) belum punya akun login, buat manual dulu untuk keperluan
testing — lewat endpoint provisioning Core Service yang sudah ada
(`api-contract-coreservice.md`), **bukan** insert langsung ke tabel `users` Core:

```bash
curl -X POST http://localhost:3000/api/v1/core/internal/users \
  -H "X-API-Key: <api_key_internal_service_dari_core_local>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ahmad.fauzi",
    "full_name": "Ahmad Fauzi",
    "account_type": "teacher",
    "ref_type": "staff",
    "ref_id": 1,
    "password": "Password123!"
  }'
```

- [ ] Query `SELECT * FROM core_local.users WHERE ref_type='staff' AND ref_id=1;` menampilkan
      akun baru.
- [ ] Login lewat `/kepegawaian/login` dengan akun ini berhasil.

### 5.2 Uji Endpoint Internal untuk Modul Lain

```bash
curl http://localhost:3000/api/v1/kepegawaian/internal/employees \
  -H "X-API-Key: <api_key_internal_service>"
```

- [ ] Mengembalikan daftar pegawai tanpa perlu token JWT pengguna — memverifikasi kontrak yang
      nanti dipanggil Akademik/Sarpras/Perpustakaan/dst.

### 5.3 Uji Alur Rekrutmen → Aktivasi → Provisioning Otomatis

- [ ] `POST /recruitment-candidates` → tambah kandidat baru.
- [ ] `POST /recruitment-candidates/:id/activate` → cek `employees` bertambah satu baris DAN
      `core_local.users` otomatis bertambah satu akun (tanpa perlu langkah manual seperti §5.1).
      Ini memverifikasi ketergantungan dua arah Kepegawaian↔Core yang dicatat di
      `rancangan-kepegawaian.md` Bagian 6.

---

## 6. Tahap 6: Checklist Verifikasi Lokal Menyeluruh

- [ ] Seluruh endpoint di `api-contract-kepegawaian.md` diuji minimal sekali (bisa lewat
      Postman/curl/frontend), termasuk kasus gagal (`401`, `404`, `409`, `422`).
- [ ] Matriks role di `roles-kepegawaian.md` Bagian 3 diuji untuk minimal 2 role berbeda (mis.
      `hrd` vs `pegawai`) — pastikan `pegawai` tidak bisa akses data pegawai lain.
- [ ] Approval cuti/lembur diuji dengan akun `atasan` sungguhan (pegawai dengan bawahan di
      `job_positions`), memverifikasi validasi 🔗 relasional di `roles-kepegawaian.md` §1.1 poin 3.
- [ ] Webhook `employee.status_changed` (§3 `api-contract-kepegawaian.md`) terdaftar di
      `webhook_subscribers` Core Service kalau sudah ada subscriber untuk diuji; kalau belum,
      cukup pastikan event tercatat di `webhook_events` (Core) setiap `PATCH .../status` dipanggil.
- [ ] Data dummy dari seed (Tahap 2.4) tidak dipakai sebagai kredensial permanen — catat di
      `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` begitu tiap fitur selesai diuji
      (jangan tunggu semua 16 fitur selesai).

---

## 7. Tahap 7: Deployment

Ikuti checklist yang sama seperti Bagian 2.3–3.5 `panduan-pengembangan-core-service.md`
(kredensial Hostinger, Remote MySQL untuk `kepegawaian_local` → database production baru di
Hostinger dengan pola nama `<kode_hosting>_dbkepegawaian`, `KEPEGAWAIAN_CORS_ORIGIN`, dst),
disesuaikan nama modul. **Jangan `git push`** sampai seluruh Tahap 6 ✅ dan developer memberi
instruksi eksplisit (lihat Bagian 0).

## 8. Dokumen Lain yang Terkait

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh, konvensi teknis global.
- `rancangan-kepegawaian.md`, `erd-kepegawaian.md`, `api-contract-kepegawaian.md`,
  `roles-kepegawaian.md` — dibaca bersamaan dengan dokumen ini di tiap sesi.
- `panduan-pengembangan-core-service.md` — pola acuan (Bagian 5) dan referensi gaya kode yang
  sudah jadi untuk ditiru (bukan disalin) oleh Antigravity.

## 9. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Dokumen dibuat. Database `kepegawaian_local` belum ada — Tahap 2 dimulai dari nol, termasuk catatan teknis (§2.2) bahwa `knexfile.js`/`config/db/core.js` yang ada saat ini perlu pola baru (`knexfile.kepegawaian.js` terpisah) karena hardcode khusus modul Core. Status seluruh tahap: belum dimulai. |
