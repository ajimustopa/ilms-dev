# panduan-pengembangan-manajemen.md

> Checklist tahap pengembangan modul **Manajemen** dengan prompt Antigravity & query MySQL/MariaDB
> siap pakai per tahap. Mengikuti pola "13 Panduan Modul Berikutnya" dari
> `panduan-pengembangan-core-service.md` — **berbeda dari Core Service**, modul ini dibangun
> **langsung** di struktur monorepo yang sudah ada (`corealdeps.zip`), **tidak ada Tahap Migrasi**
> karena kodenya memang belum ada sama sekali.
>
> **Status database saat ini: belum ada.** Database `manajemen_local` di MariaDB lokal Anda
> belum dibuat — Tahap 2 di bawah dimulai dari nol.

---

## Tahap 0: Aturan Kerja (WAJIB dibaca sebelum mulai)

Sesuai `ARSITEKTUR-SISTEM.md` §4.7:
- Kerja & uji **lokal dulu** (`npm run dev` per folder `apps/`) sampai benar-benar berfungsi.
- Commit lokal boleh sesering perlu (`git add` / `git commit`).
- **`git push` ke `origin` ditunda sampai Anda memberi instruksi eksplisit** — Antigravity/Claude
  tidak boleh push sendiri di tahap manapun di bawah ini.
- Branch fitur: `feat/manajemen-<nama-fitur>` kalau nanti mau PR terpisah per fitur.

---

## Tahap 1: Perencanaan — ✅ Sudah Selesai (Sesi Ini)

Dokumen berikut sudah dibuat dan jadi acuan tahap-tahap berikutnya:
- `rancangan-manajemen.md`
- `erd-manajemen.md`
- `api-contract-manajemen.md`
- `roles-manajemen.md`

**Sebelum lanjut ke Tahap 2**, review dulu bagian **Keputusan Terbuka** di `rancangan-manajemen.md`
§5 dan `erd-manajemen.md` §0 — kalau ada yang mau diubah, minta revisi dokumen dulu sebelum
migration dijalankan ke database sungguhan (migration yang sudah jalan lebih sulit diubah
daripada mengubah dokumen).

---

## Tahap 2: Database

### 2.1 Buat Database & User MariaDB Lokal

Jalankan di MySQL/MariaDB client lokal Anda (mis. `mysql -u root -p`):

```sql
CREATE DATABASE IF NOT EXISTS manajemen_local
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'manajemen_local'@'127.0.0.1' IDENTIFIED BY 'GANTI_PASSWORD_LOKAL_ANDA';
GRANT ALL PRIVILEGES ON manajemen_local.* TO 'manajemen_local'@'127.0.0.1';
FLUSH PRIVILEGES;
```

> Pola nama sama seperti modul lain di `.env.example` yang sudah ada (`kepegawaian_local`,
> `akademik_local`, dst) — konsisten supaya `knexfile.js` (multi-module via `--module`) langsung
> jalan tanpa perubahan tambahan.

### 2.2 Tambahkan Environment Variable

Tambahkan ke `apps/api-backend/.env` (dan `.env.example` untuk dokumentasi tim):

```env
MANAJEMEN_DB_HOST=127.0.0.1
MANAJEMEN_DB_PORT=3306
MANAJEMEN_DB_USER=manajemen_local
MANAJEMEN_DB_PASSWORD=GANTI_PASSWORD_LOKAL_ANDA
MANAJEMEN_DB_NAME=manajemen_local
```

### 2.3 Prompt Antigravity — Tambah Dukungan Modul `manajemen` ke `knexfile.js`

```
Saya ingin menambahkan dukungan modul baru bernama "manajemen" ke apps/api-backend/knexfile.js.
Ikuti pola case yang sudah ada persis (contoh: case 'kepegawaian') — tambahkan case baru
'manajemen' di dalam fungsi getDbConfig() dengan:
- host/port/user/password/database dari env var berprefix MANAJEMEN_ (fallback ke DB_HOST dkk)
- migrationsDir: './db/migrations/manajemen'
- migrationsTable: 'knex_migrations_manajemen'
- seedsDir: './db/seeds/manajemen'
- disableTransactions: true
Jangan ubah case modul lain yang sudah ada. Setelah itu, buat juga file
apps/api-backend/knexfile.manajemen.js yang isinya sama persis polanya dengan
apps/api-backend/knexfile.kepegawaian.js, tapi untuk env var MANAJEMEN_* dan folder
db/migrations/manajemen serta db/seeds/manajemen.
```

### 2.4 Prompt Antigravity — Buat File Migration Knex (22 Tabel)

```
Baca dulu file erd-manajemen.md di root proyek ini — itu berisi skema final 22 tabel untuk
modul Manajemen (Bagian 2 detail tabel, Bagian 4 referensi SQL mentah untuk urutan dependency).

Buat 22 file migration Knex.js di folder apps/api-backend/db/migrations/manajemen/, satu tabel
satu file, dengan penamaan `<timestamp>_create_<nama_tabel>_table.js` (timestamp berurutan mulai
20260818100001, ikuti urutan tabel di erd-manajemen.md Bagian 1 supaya dependency FK internal
antar tabel terpenuhi — tabel yang di-reference harus dibuat lebih dulu).

Ikuti persis gaya penulisan migration yang sudah ada di
apps/api-backend/db/migrations/kepegawaian/*.js (pakai table.bigIncrements('id').unsigned().primary(),
table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()), dst — termasuk komentar
header "Migration: ... / Modul Manajemen - Fitur: ..." di tiap file).

Untuk kolom yang mereferensikan modul lain (school_unit_id, employee_id, dst — lihat
erd-manajemen.md Bagian 3 "Ringkasan Referensi Lintas Modul"), JANGAN tambahkan
.references().inTable() karena itu FK lintas database yang dilarang di ARSITEKTUR-SISTEM.md
Bagian 3 poin 1 — cukup kolom biasa dengan index kalau sering difilter.

Untuk kolom yang mereferensikan tabel LAIN DI DALAM modul Manajemen sendiri (FK internal, mis.
work_plan_programs.school_work_plan_id -> school_work_plans.id), boleh pakai
.references().inTable() seperti biasa.

Setelah semua file migration dibuat, jangan langsung dijalankan — tunjukkan dulu daftar 22 file
yang dibuat untuk saya review.
```

### 2.5 Jalankan Migration ke Database Lokal

Setelah Anda review hasil Antigravity dan setuju, jalankan dari folder `apps/api-backend/`:

```bash
npx knex migrate:latest --module manajemen
```

Verifikasi tabel sudah terbentuk:

```sql
USE manajemen_local;
SHOW TABLES;
-- Harus menampilkan 22 tabel sesuai erd-manajemen.md Bagian 1
```

### 2.6 Prompt Antigravity — Buat Seed Data Dummy

```
Buat file seed Knex.js di apps/api-backend/db/seeds/manajemen/01_dummy_data.js, isinya mengikuti
persis data dummy di erd-manajemen.md Bagian 5 (Seed Data Dummy) — sesuaikan school_unit_id dan
employee_id dengan ID yang sudah ada di database core_local dan kepegawaian_local lokal saya
(saya akan cek dulu ID yang benar sebelum Anda hardcode).
```

Cek dulu ID yang tersedia sebelum minta Antigravity hardcode:

```sql
-- Di database core_local
SELECT id, name FROM school_units LIMIT 5;

-- Di database kepegawaian_local
SELECT id, full_name FROM employees LIMIT 5;
```

Jalankan seed:

```bash
npx knex seed:run --module manajemen
```

---

## Tahap 3: Backend

### 3.1 Prompt Antigravity — Bangun Modul Backend

```
Baca api-contract-manajemen.md (kontrak endpoint lengkap) dan erd-manajemen.md (skema tabel) di
root proyek ini. Bangun backend modul Manajemen di apps/api-backend/src/modules/manajemen/,
dengan struktur folder per kategori fitur (ikuti pola apps/api-backend/src/modules/kepegawaian/,
yang punya subfolder per kategori seperti employees/, organization/, performance/, dst — masing-
masing subfolder isinya controller.js, routes.js, service.js):

- planning/        -> Fitur #190-192 (RIPS, RKS, Program Kerja)
- quality/          -> Fitur #193, #195, #196, #201, #202 (KPI, Evadir, Akreditasi, Dashboard Agregat, Risiko)
- performance/      -> Fitur #194 (Evaluasi Kinerja mendalam)
- supervision/      -> Fitur #197 (Supervisi)
- projects/         -> Fitur #198-200 (Task, Proyek, Approval Workflow)

Koneksi database pakai Knex instance baru di apps/api-backend/src/config/db/manajemen.js, ikuti
pola persis apps/api-backend/src/config/db/kepegawaian.js (ganti semua prefix KEPEGAWAIAN_ jadi
MANAJEMEN_ dan path knexfile.kepegawaian jadi knexfile.manajemen).

Untuk endpoint yang butuh data dari modul lain (mis. validasi employee_id ada di Kepegawaian,
atau assignee di tasks), panggil service-layer modul itu secara in-process (import langsung
fungsi service dari apps/api-backend/src/modules/kepegawaian/employees/service.js dkk) — JANGAN
query langsung ke tabel kepegawaian_local dari kode Manajemen, sesuai ARSITEKTUR-SISTEM.md
Bagian 1.1.

Untuk otorisasi, pakai middleware yang sudah ada di apps/api-backend/src/middlewares/auth.js
(verifyJwt, requirePermission, requireApiKey) — jangan bikin middleware auth baru. Kode izin yang
dicek mengikuti daftar di roles-manajemen.md Bagian 4 (prefix manajemen.*).

Setelah semua modul selesai, buat router utama apps/api-backend/src/modules/manajemen/routes.js
yang menggabungkan kelima kategori di atas, lalu tunjukkan perubahan yang perlu saya buat di
apps/api-backend/src/app.js untuk mount router ini ke prefix /api/v1/manajemen — JANGAN edit
app.js otomatis dulu, tunjukkan dulu diff-nya untuk saya review karena file itu dipakai bersama
semua modul lain.
```

### 3.2 Mount ke `app.js` (Setelah Direview)

Pola yang perlu ditambahkan (ikuti persis pola blok Kepegawaian/Akademik yang sudah ada):

```javascript
// Module Routes for Manajemen Service
const manajemenV1Router = require('./modules/manajemen/routes');

// ==========================================
// N. Manajemen Service Router (/api/v1/manajemen)
// ==========================================
app.use('/api/v1/manajemen', manajemenV1Router);
```

### 3.3 Uji Backend Secara Lokal

```bash
cd apps/api-backend
npm run dev
```

Uji cepat salah satu endpoint (sesuaikan token JWT hasil login lokal ke Core Service):

```bash
curl -X GET "http://localhost:3000/api/v1/manajemen/institution-development-plans?school_unit_id=1" \
  -H "Authorization: Bearer <access_token_lokal_anda>"
```

Respons yang diharapkan mengikuti amplop standar `{ success, data, message, errors }` sesuai
`api-contract-manajemen.md` §1.3.

---

## Tahap 4: Frontend

### 4.1 Prompt Antigravity — Bangun Halaman Frontend

```
Baca api-contract-manajemen.md dan roles-manajemen.md di root proyek ini. Bangun frontend modul
Manajemen di apps/core-portal/src/apps/manajemen/pages/, React (Vite), Tailwind CSS.

Buat halaman Login.jsx sendiri untuk modul ini (route /manajemen/login) — ikuti pola login
modul lain yang sudah ada di apps/core-portal/src/apps/kepegawaian/pages/Login.jsx kalau ada,
kalau belum ada contoh, ikuti pola AuthContext & api service yang sudah ada di
apps/core-portal/src/shared/. Karena SSO sudah otomatis satu SPA satu sesi JWT
(ARSITEKTUR-SISTEM.md Bagian 1.1), kalau user sudah login dari modul lain, langsung redirect ke
dashboard Manajemen tanpa perlu isi form lagi.

Pakai ulang apps/core-portal/src/shared/ yang sudah ada (Layout, ProtectedRoute, AuthContext, api
service dengan interceptor Bearer token) — JANGAN bikin ulang logic auth/interceptor sendiri.

Halaman yang perlu dibuat minimal, satu halaman per kategori fitur:
- Dashboard.jsx (ringkasan RIPS/RKS aktif, KPI utama, risiko terbuka, task pribadi)
- Planning/ (RIPS, RKS, Program Kerja)
- Quality/ (KPI, Evadir, Akreditasi, Risiko)
- Performance/ (Evaluasi Kinerja mendalam)
- Supervision/ (Supervisi)
- Projects/ (Task, Proyek, Approval Workflow)

Tampilkan/sembunyikan menu sesuai permission user yang login (cek dari JWT payload permissions,
ikuti pola roles-manajemen.md Bagian 4 kode izin manajemen.*).
```

### 4.2 Tambahkan Kartu di Launcher

```
Tambahkan satu kartu baru untuk modul Manajemen di apps/core-portal/src/Launcher.jsx (atau file
launcher yang setara kalau namanya beda), ikuti pola kartu modul lain yang sudah ada — icon,
nama "Manajemen", link ke /manajemen/login (atau /manajemen jika sudah ada sesi aktif).
```

### 4.3 Uji Frontend Secara Lokal

```bash
cd apps/core-portal
npm run dev
```

Buka `http://localhost:5173` (atau port yang tertera), klik kartu Manajemen, login, verifikasi
tiap halaman memuat data dari backend lokal Tahap 3.

---

## Tahap 5: Integrasi

- [ ] Uji alur RKS → Program Kerja: buat RKS, buat Program Kerja turunannya, pastikan
      `school_work_plan_id` tersambung benar.
- [ ] Uji alur Task → Proyek: buat proyek, tambah anggota, buat task terkait `project_id`.
- [ ] Uji alur Approval: buat `approval_workflow` + `approval_steps`, ajukan `approval_request`,
      lakukan aksi approve/reject, pastikan `current_step` berjalan sesuai jenjang.
- [ ] Uji integrasi service-layer ke Kepegawaian: pastikan endpoint yang butuh
      `employee_id`/`job_position_id` benar-benar memanggil service Kepegawaian in-process
      (bukan hardcode), dengan employee sungguhan dari `kepegawaian_local`.
- [ ] Uji integrasi service-layer ke Akademik: pastikan `class_group_id` pada fitur Supervisi
      tervalidasi ke data sungguhan `akademik_local`.
- [ ] Kalau Keputusan Terbuka #1 (`erd-manajemen.md` §0) sudah dijawab developer: uji endpoint
      `/internal/employee-performance-evaluations` dipanggil dari sisi Kepegawaian dengan
      `X-API-Key`.

## Tahap 6: Verifikasi Lokal Menyeluruh

- [ ] Jalankan `npm run dev` di ketiga folder (`api-backend`, `core-portal`) bersamaan, uji semua
      13 fitur dari UI, bukan cuma `curl`.
- [ ] Cek log error di terminal `api-backend` selama pengujian — pastikan tidak ada query yang
      diam-diam mencoba JOIN lintas database (pelanggaran `ARSITEKTUR-SISTEM.md` §3 poin 1).
- [ ] Review ulang seluruh endpoint bertanda ⚠️ di `api-contract-manajemen.md` — pastikan
      perilakunya sesuai keputusan final, bukan asumsi sementara.
- [ ] `git add` & `git commit` lokal per tahap yang sudah selesai & teruji (jangan satu commit
      raksasa di akhir).

## Tahap 7: Deployment (Setelah Anda Setujui Push)

- [ ] Update `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — isi tabel, endpoint, enum
      yang sudah jadi & teruji untuk modul Manajemen (isi bertahap, jangan tunggu semua fitur
      selesai).
- [ ] Tambahkan kredensial `MANAJEMEN_DB_*` ke database MariaDB Hostinger production, ikuti pola
      penamaan `ARSITEKTUR-SISTEM.md` §4.6 (`<kode_hosting>_dbmanajemen`).
- [ ] Jalankan migration ke database production (`npx knex migrate:latest --module manajemen
      --env production`) — **hanya setelah** Anda konfirmasi siap rilis.
- [ ] `git push` ke `origin` **hanya setelah instruksi eksplisit Anda** (Tahap 0).
- [ ] GitHub Actions workflow `deploy-api-backend.yml`/`deploy-core-portal.yml` otomatis jalan
      begitu push ke `main` menyentuh folder `apps/api-backend`/`apps/core-portal` (path filter
      sudah ada, tidak perlu workflow baru khusus modul Manajemen).
- [ ] Update sheet "Tracker Kontrol" di `Controlling_Sistem_Manajemen_Sekolah.xlsx` — tandai
      modul Manajemen mulai/selesai per tahapan.

---

## Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Database `manajemen_local` belum ada — Tahap 2 dimulai dari nol. |

*(Tambahkan baris baru di atas setiap tahap besar selesai — jangan hapus riwayat lama.)*
