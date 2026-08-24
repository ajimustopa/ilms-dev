# panduan-pengembangan-perpustakaan.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Perpustakaan** — bersama
> `rancangan-perpustakaan.md`, `erd-perpustakaan.md`, `api-contract-perpustakaan.md`,
> `roles-perpustakaan.md`. Mengikuti pola "Pola untuk 13 Panduan Modul Berikutnya"
> (`panduan-pengembangan-core-service.md` Bagian 5) — modul ini **tidak ada kode lama**, dibangun
> langsung di struktur monorepo yang sudah ada (dicek lewat `corealdeps.zip`: folder
> `apps/api-backend/`, `apps/core-portal/` sudah berisi Core Service, Kepegawaian, Akademik,
> Keuangan, Sarpras, Kantin, Dapur, Website Utama — Perpustakaan **belum ada sama sekali**).
>
> **Status saat ini:** Database `perpustakaan_local` **belum dibuat**. Belum ada satu baris kode
> pun di `src/modules/perpustakaan/`. Mulai dari Tahap 1.

---

## 0. Aturan Kerja — Lokal Dulu, Jangan Push

Sama seperti seluruh modul lain (`ARSITEKTUR-SISTEM.md` §4.7, `panduan-pengembangan-core-service.md`
Bagian 0):

- [ ] Kerja & uji **sepenuhnya di lokal** (`npm run dev` di `apps/api-backend` dan
      `apps/core-portal`) sampai fungsional, baru dipertimbangkan untuk di-push.
- [ ] `git add` + `git commit` boleh sesering perlu secara lokal. **Jangan `git push`** sampai
      developer memberi instruksi eksplisit.
- [ ] Kalau perlu titik aman, buat branch lokal dulu: `git checkout -b feat/perpustakaan-modul`.
- [ ] Database pakai **database lokal baru** `perpustakaan_local` (Tahap 2), bukan koneksi Remote
      MySQL ke production.

---

## Tahap 1 — Perencanaan (Dokumen)

Status: ✅ **Selesai** di sesi ini — empat dokumen sudah dibuat:
`rancangan-perpustakaan.md`, `erd-perpustakaan.md`, `api-contract-perpustakaan.md`,
`roles-perpustakaan.md`, disimpan flat di root proyek monorepo (sejajar dengan versi
`-coreservice` yang sudah ada).

**Sebelum lanjut ke Tahap 2**, developer perlu memutuskan 5 poin "Keputusan Terbuka" di
`rancangan-perpustakaan.md` §5 — minimal yang berdampak ke skema tabel (poin 1: cakupan koleksi
per Satuan Pendidikan; poin 3: mekanisme kunjungan). Migration di lokal boleh tetap jalan pakai
asumsi draf saat ini (bisa diubah lewat migration tambahan nanti), tapi jangan dianggap final
sebelum dikonfirmasi.

---

## Tahap 2 — Database (Lokal)

### 2.1 Buat Database & User Lokal

Jalankan lewat MySQL client lokal (`mysql -u root -p`), **sesuaikan password**:

```sql
CREATE DATABASE IF NOT EXISTS perpustakaan_local
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'perpustakaan_local'@'127.0.0.1' IDENTIFIED BY 'GANTI_PASSWORD_LOKAL_ANDA';
GRANT ALL PRIVILEGES ON perpustakaan_local.* TO 'perpustakaan_local'@'127.0.0.1';
FLUSH PRIVILEGES;
```

> Pola nama database/user (`perpustakaan_local`) mengikuti persis konvensi modul lain yang sudah
> ada di `corealdeps.zip` (`sarpras_local`, `kantin_local`, dst — lihat `knexfile.sarpras.js`).

### 2.2 Tambahkan Environment Variable

Tambahkan ke `apps/api-backend/.env` (dan `.env.example` untuk dokumentasi):

```env
PERPUSTAKAAN_DB_HOST=127.0.0.1
PERPUSTAKAAN_DB_PORT=3306
PERPUSTAKAAN_DB_USER=perpustakaan_local
PERPUSTAKAAN_DB_PASSWORD=GANTI_PASSWORD_LOKAL_ANDA
PERPUSTAKAAN_DB_NAME=perpustakaan_local
```

### 2.3 Prompt Antigravity — Buat `knexfile.perpustakaan.js` & Koneksi Knex

```
Buat dua file baru di apps/api-backend/, mengikuti pola PERSIS
apps/api-backend/knexfile.sarpras.js dan apps/api-backend/src/config/db/sarpras.js
(baca kedua file itu dulu sebagai referensi):

1. apps/api-backend/knexfile.perpustakaan.js
   - Ganti semua "SARPRAS" jadi "PERPUSTAKAAN", "sarpras" jadi "perpustakaan"
   - migrations.directory: db/migrations/perpustakaan
   - migrations.tableName: knex_migrations_perpustakaan
   - seeds.directory: db/seeds/perpustakaan

2. apps/api-backend/src/config/db/perpustakaan.js
   - Ganti semua "SARPRAS"/"sarpras" jadi "PERPUSTAKAAN"/"perpustakaan"
   - require('../../../knexfile.perpustakaan') sebagai fallback config

Jangan ubah file sarpras yang sudah ada — hanya jadi referensi pola.
```

### 2.4 Tambahkan Migration Files

Salin skema dari `erd-perpustakaan.md` Bagian 3 ke migration Knex satu file per tabel, di
`apps/api-backend/db/migrations/perpustakaan/`. Urutan wajib sesuai dependency FK (kategori →
buku → eksemplar → anggota → pinjaman → reservasi/laporan hilang → pengingat):

```
20260818000001_create_book_categories_table.js
20260818000002_create_books_table.js
20260818000003_create_book_copies_table.js
20260818000004_create_library_members_table.js
20260818000005_create_book_loans_table.js
20260818000006_create_book_reservations_table.js
20260818000007_create_lost_damaged_reports_table.js
20260818000008_create_loan_reminders_table.js
```

**Prompt Antigravity:**

```
Baca erd-perpustakaan.md Bagian 3 (skrip SQL migration awal) dan Bagian 2 (detail tiap tabel).
Buat 8 file migration Knex.js di apps/api-backend/db/migrations/perpustakaan/, satu file per
tabel, dengan urutan & penomoran timestamp berikut:

20260818000001_create_book_categories_table.js
20260818000002_create_books_table.js
20260818000003_create_book_copies_table.js
20260818000004_create_library_members_table.js
20260818000005_create_book_loans_table.js
20260818000006_create_book_reservations_table.js
20260818000007_create_lost_damaged_reports_table.js
20260818000008_create_loan_reminders_table.js

Ikuti gaya penulisan migration yang sudah ada di
apps/api-backend/db/migrations/sarpras/20260818100004_create_assets_table.js (baca dulu sebagai
contoh gaya knex schema builder: table.bigIncrements, table.enum, table.timestamps, index, dst).
Jangan buat migration untuk tabel library_visit_logs — itu masih tentatif, tunggu instruksi
terpisah setelah keputusan terbuka soal mekanisme kunjungan dikonfirmasi.
```

### 2.5 Tambahkan Seed File

**Prompt Antigravity:**

```
Baca erd-perpustakaan.md Bagian 4 (Seed Data Dummy). Buat file
apps/api-backend/db/seeds/perpustakaan/001_initial_seed.js berisi INSERT dummy yang sama
(3 kategori, 2 judul buku, 4 eksemplar, 2 anggota). Ikuti gaya penulisan seed yang sudah ada di
apps/api-backend/db/seeds/sarpras/001_initial_seed.js sebagai referensi (pakai knex('table').insert(),
bukan raw SQL).

Catatan: kolom ref_id di library_members merujuk ke ID dummy di database Akademik/Kepegawaian
yang TERPISAH — kalau database akademik_local/kepegawaian_local belum di-seed di lokal, pakai
ref_id = 1 sebagai placeholder dan tambahkan komentar bahwa ini perlu disesuaikan dengan ID
sungguhan begitu modul itu di-seed.
```

### 2.6 Tambah Script `package.json`

**Prompt Antigravity:**

```
Edit apps/api-backend/package.json (bagian "scripts") dan package.json root, tambahkan script
untuk modul perpustakaan mengikuti pola persis yang sudah ada untuk sarpras/kepegawaian, contoh:

Di apps/api-backend/package.json:
"migrate:perpustakaan": "knex --knexfile knexfile.perpustakaan.js migrate:latest",
"seed:perpustakaan": "knex --knexfile knexfile.perpustakaan.js seed:run"

Di package.json root:
"migrate:perpustakaan": "npm --workspace=apps/api-backend exec -- knex --knexfile knexfile.perpustakaan.js migrate:latest",
"seed:perpustakaan": "npm --workspace=apps/api-backend exec -- knex --knexfile knexfile.perpustakaan.js seed:run"
```

### 2.7 Jalankan Migration & Seed

```bash
cd apps/api-backend
npx knex --knexfile knexfile.perpustakaan.js migrate:latest
npx knex --knexfile knexfile.perpustakaan.js seed:run
```

**Verifikasi manual (query langsung ke `perpustakaan_local`):**

```sql
USE perpustakaan_local;
SHOW TABLES;
SELECT COUNT(*) FROM books;            -- harus 2
SELECT COUNT(*) FROM book_copies;      -- harus 4
SELECT COUNT(*) FROM library_members;  -- harus 2
```

- [ ] `SHOW TABLES` menampilkan 8 tabel sesuai daftar Tahap 2.4.
- [ ] Ketiga query `SELECT COUNT(*)` di atas mengembalikan angka yang diharapkan.

---

## Tahap 3 — Backend

Struktur folder mengikuti pola modul lain (`sarpras`, `kantin`): satu subfolder per kelompok
fitur, masing-masing punya `controller.js` + `routes.js` + `service.js`, plus satu `routes.js`
agregator di root modul dan satu `utils/crossModuleHelper.js` untuk panggilan in-process ke
Akademik/Kepegawaian.

```
apps/api-backend/src/modules/perpustakaan/
├── routes.js                     (agregator, di-mount ke app.js)
├── utils/
│   └── crossModuleHelper.js      (validasi ref_id ke akademik/kepegawaian, in-process)
├── catalog/          (fitur #163, #164, #172 — books, categories, copies)
├── members/           (fitur #165, #174)
├── circulation/        (fitur #166, #167, #168, #173 — loans, reservations, lost/damaged)
├── reminders/          (fitur #175)
├── opac/               (fitur #169 — publik)
├── reports/             (fitur #170, #176)
└── parent-facing/        (fitur #171 — internal service)
```

### 3.1 Prompt Antigravity — `crossModuleHelper.js`

```
Baca apps/api-backend/src/modules/sarpras/utils/crossModuleHelper.js sebagai referensi pola.
Buat apps/api-backend/src/modules/perpustakaan/utils/crossModuleHelper.js dengan dua fungsi:

- validateStudent(studentRefId): query ke instance Knex Akademik
  (require('../../../config/db/akademik')) tabel `students`, cari by id. Kalau tidak ketemu,
  lempar error statusCode 404. Kalau koneksi Akademik gagal, fallback graceful (return objek
  minimal { id, full_name: `Siswa #${id}` }) sama seperti pola sarpras.
- validateEmployee(employeeRefId): sama tapi ke instance Knex Kepegawaian
  (require('../../../config/db/kepegawaian')) tabel `employees`.

Juga tambahkan fungsi getSchoolUnitId(req) — salin persis dari crossModuleHelper.js Sarpras
(logic sama, tidak perlu diubah).
```

### 3.2 Prompt Antigravity — Modul Catalog (Fitur #163, #164, #172)

```
Baca erd-perpustakaan.md §2.1-2.3 dan api-contract-perpustakaan.md bagian "MODUL 1: KATALOG".
Buat apps/api-backend/src/modules/perpustakaan/catalog/{service.js,controller.js,routes.js}
mengikuti pola gaya kode apps/api-backend/src/modules/sarpras/assets/ (baca ketiga file itu dulu
sebagai referensi struktur: service pakai Knex query builder langsung ke db instance
apps/api-backend/src/config/db/perpustakaan.js, controller bungkus jadi response
{success,data,message,errors}, routes pasang middleware verifyJwt + requirePermission).

Endpoint yang perlu diimplementasikan (lihat detail request/response di api-contract-perpustakaan.md):
GET/POST /books, PUT/DELETE /books/:id, GET/POST /books/:id/copies,
GET/POST/PUT/DELETE /categories.

Permission code yang dipakai: perpustakaan.books.view, perpustakaan.books.manage,
perpustakaan.categories.view, perpustakaan.categories.manage (lihat roles-perpustakaan.md §4).
```

### 3.3 Prompt Antigravity — Modul Members (Fitur #165, #174)

```
Baca erd-perpustakaan.md §2.4 dan api-contract-perpustakaan.md bagian "MODUL 2: ANGGOTA".
Buat apps/api-backend/src/modules/perpustakaan/members/{service.js,controller.js,routes.js}.

Endpoint POST /members WAJIB memanggil crossModuleHelper.validateStudent() atau
.validateEmployee() (sesuai ref_type di body) SEBELUM insert ke tabel library_members — kalau
validasi gagal (404), controller mengembalikan response error sesuai format standar, jangan insert.

Endpoint lain: PATCH /members/:id/status, GET /members/:id, GET /members/:id/loan-history
(join book_loans + book_copies + books untuk ambil judul, urutkan borrowed_at DESC).

Permission: perpustakaan.members.view, perpustakaan.members.register,
perpustakaan.members.deactivate.
```

### 3.4 Prompt Antigravity — Modul Circulation (Fitur #166, #167, #168, #173)

```
Baca erd-perpustakaan.md §2.5-2.7 dan api-contract-perpustakaan.md bagian "MODUL 3: SIRKULASI".
Buat apps/api-backend/src/modules/perpustakaan/circulation/{service.js,controller.js,routes.js}.

Logic penting yang WAJIB diimplementasikan di service.js:
1. POST /loans: sebelum insert, cek book_copies.circulation_status='available' untuk
   book_copy_id yang diminta (kalau tidak, error 409). Cek juga jumlah baris book_loans aktif
   (loan_status='borrowed') milik member_id tidak melebihi library_members.max_loan_limit
   (error 409 kalau melebihi). Setelah insert sukses, update book_copies.circulation_status
   jadi 'borrowed'.
2. PATCH /loans/:id/return: update loan_status='returned', returned_at=now(). HITUNG fine_amount
   kalau now() > due_at — untuk saat ini pakai formula sederhana Rp1.000/hari keterlambatan
   sebagai PLACEHOLDER (beri komentar jelas di kode bahwa tarif ini masih tentatif, menunggu
   keputusan developer di rancangan-perpustakaan.md §5). Setelah update, kembalikan
   book_copies.circulation_status jadi 'available'.
3. POST /reservations: hanya boleh kalau semua eksemplar book_id sedang 'borrowed' (kalau masih
   ada yang 'available', arahkan user pinjam langsung, bukan reservasi — error 409 dengan pesan
   jelas).
4. POST /lost-damaged-reports: update book_copies.condition_status & circulation_status sesuai
   condition_status yang dilaporkan (lost/damaged → circulation_status='under_repair' atau tetap
   'borrowed' sampai resolution_status='resolved', diskusikan asumsi ini di komentar kode).

Permission: perpustakaan.loans.create, perpustakaan.loans.extend, perpustakaan.loans.return,
perpustakaan.loans.pay_fine, perpustakaan.reservations.create, perpustakaan.reservations.manage,
perpustakaan.lost_damaged.report, perpustakaan.lost_damaged.resolve.
```

### 3.5 Prompt Antigravity — Modul OPAC (Fitur #169, Publik)

```
Baca api-contract-perpustakaan.md bagian "MODUL 5: OPAC".
Buat apps/api-backend/src/modules/perpustakaan/opac/{service.js,controller.js,routes.js}.

PENTING: route GET /opac/search dan GET /opac/books/:id TIDAK memakai middleware verifyJwt
(publik, sesuai rancangan-perpustakaan.md §4 fitur #169 = Must, aktor Publik). Query hanya
menampilkan books.status='active'. Hitung available_copies dengan COUNT book_copies
WHERE circulation_status='available'.
```

### 3.6 Prompt Antigravity — Modul Reminders, Reports, Parent-Facing (Fitur #175, #170, #176, #171)

```
Baca api-contract-perpustakaan.md bagian "MODUL 4: NOTIFIKASI", "MODUL 6: LAPORAN",
"MODUL 7: INTEGRASI". Buat tiga folder:

apps/api-backend/src/modules/perpustakaan/reminders/{service.js,controller.js,routes.js}
apps/api-backend/src/modules/perpustakaan/reports/{service.js,controller.js,routes.js}
apps/api-backend/src/modules/perpustakaan/parent-facing/{service.js,controller.js,routes.js}

reminders: POST /loan-reminders/run mengambil semua book_loans dengan loan_status='borrowed'
dan due_at mendekati (H-1) atau lewat (overdue) dari waktu sekarang, insert baris ke
loan_reminders dengan status='queued'. JANGAN implementasikan pengiriman WA/Email sungguhan
(itu domain modul Komunikasi & Notifikasi, di luar cakupan — lihat
rancangan-perpustakaan.md §6).

reports: GET /reports/circulation (agregasi COUNT book_loans per periode), GET /reports/popular-books
(GROUP BY book_id, ORDER BY COUNT(*) DESC, JOIN books untuk judul), GET /reports/utilization
(agregasi book_loans; kalau tabel library_visit_logs belum ada, field jumlah_kunjungan di response
dikembalikan null dengan catatan "menunggu keputusan mekanisme pencatatan kunjungan").

parent-facing: GET /parent-facing/students/:student_ref_id/loan-history — route ini pakai
middleware requireApiKey (BUKAN verifyJwt), cari library_members WHERE ref_type='student' AND
ref_id=:student_ref_id, lalu ambil daftar book_loans + JOIN books untuk judul.

Permission: perpustakaan.reminders.view, perpustakaan.reminders.run, perpustakaan.reports.view.
```

### 3.7 Prompt Antigravity — Router Agregator & Mount ke `app.js`

```
Baca apps/api-backend/src/modules/sarpras/routes.js sebagai contoh pola router agregator, dan
baca bagian app.js yang me-mount sarprasV1Router (cari "sarprasV1Router" di apps/api-backend/src/app.js).

1. Buat apps/api-backend/src/modules/perpustakaan/routes.js yang mengagregasi ke-7 submodule
   router (catalog, members, circulation, reminders, opac, reports, parent-facing) — pola persis
   seperti sarpras/routes.js.

2. Edit apps/api-backend/src/app.js:
   - Tambahkan `const perpustakaanV1Router = require('./modules/perpustakaan/routes');` di
     bagian atas (dekat require sarprasV1Router).
   - Tambahkan `app.use('/api/v1/perpustakaan', perpustakaanV1Router);` di bagian bawah (dekat
     baris app.use('/api/v1/sarpras', sarprasV1Router)), dengan komentar
     "// 9. Perpustakaan Service Router (/api/v1/perpustakaan)".

Jangan ubah urutan/isi router modul lain yang sudah ada.
```

### 3.8 Verifikasi Backend Lokal

```bash
cd apps/api-backend
npm run dev
```

- [ ] `GET http://localhost:3000/api/v1/perpustakaan/opac/search?q=Laskar` (tanpa header auth)
      mengembalikan buku "Laskar Pelangi" dari seed data.
- [ ] Login dulu lewat Core Service (`POST /api/v1/core/auth/login`, akun `superadmin` dari seed
      Core lokal) untuk dapat token, lalu:
      `GET http://localhost:3000/api/v1/perpustakaan/books` dengan header
      `Authorization: Bearer <token>` mengembalikan 2 buku dummy.
- [ ] `POST /api/v1/perpustakaan/loans` dengan `book_copy_id` yang tersedia berhasil (`201`), dan
      `book_copies.circulation_status` untuk eksemplar itu berubah jadi `borrowed` (cek lewat
      query manual `SELECT circulation_status FROM book_copies WHERE id=...`).
- [ ] `POST /api/v1/perpustakaan/loans` dengan `book_copy_id` yang sama lagi (masih dipinjam)
      mengembalikan `409 Conflict`.

---

## Tahap 4 — Frontend

Struktur folder mengikuti pola modul yang sudah ada (`sarpras`, `kepegawaian`):

```
apps/core-portal/src/apps/perpustakaan/
├── components/
│   └── PerpustakaanLayout.jsx
└── pages/
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── Katalog.jsx
    ├── Anggota.jsx
    ├── Sirkulasi.jsx
    ├── Reservasi.jsx
    ├── Opac.jsx
    └── Laporan.jsx
```

### 4.1 Prompt Antigravity — Layout, Login, Routing

```
Baca apps/core-portal/src/apps/sarpras/components/SarprasLayout.jsx dan
apps/core-portal/src/apps/sarpras/pages/Login.jsx sebagai referensi pola (pakai ulang
apps/core-portal/src/shared/components/Layout.jsx, ProtectedRoute.jsx, dan
apps/core-portal/src/shared/store/AuthContext.jsx — JANGAN bikin ulang logic auth/interceptor,
itu sudah ada di apps/core-portal/src/shared/services/api.js).

Buat:
1. apps/core-portal/src/apps/perpustakaan/components/PerpustakaanLayout.jsx
2. apps/core-portal/src/apps/perpustakaan/pages/Login.jsx
   (login POST ke /api/v1/core/auth/login seperti modul lain — SSO sesuai
   panduan-pengembangan-core-service.md §4.3, satu token dipakai semua modul)
3. apps/core-portal/src/apps/perpustakaan/pages/Dashboard.jsx (ringkasan: jumlah judul, jumlah
   pinjaman aktif, jumlah reservasi menunggu — ambil dari endpoint yang sudah ada)

Daftarkan route /perpustakaan/login dan /perpustakaan/dashboard (dibungkus ProtectedRoute) di
routing utama core-portal — cari file routing yang mendaftarkan route sarpras sebagai referensi
lokasi & pola pendaftaran.
```

### 4.2 Prompt Antigravity — Halaman Katalog & OPAC

```
Baca apps/core-portal/src/apps/sarpras/pages/InventarisAset.jsx sebagai referensi pola halaman
tabel CRUD (fetch list, form tambah/edit pakai modal, delete dengan konfirmasi).

Buat apps/core-portal/src/apps/perpustakaan/pages/Katalog.jsx: tabel books (judul, pengarang,
kategori, jumlah eksemplar, status) dengan tombol tambah/edit/hapus, panggil endpoint
GET/POST/PUT/DELETE /api/v1/perpustakaan/books.

Buat apps/core-portal/src/apps/perpustakaan/pages/Opac.jsx: halaman pencarian sederhana (input
kata kunci + filter kategori), panggil GET /api/v1/perpustakaan/opac/search — TANPA perlu
ProtectedRoute karena OPAC publik, daftarkan sebagai route /perpustakaan/opac tanpa wrapper auth.
```

### 4.3 Prompt Antigravity — Halaman Anggota & Sirkulasi

```
Buat apps/core-portal/src/apps/perpustakaan/pages/Anggota.jsx (daftar anggota + form daftarkan
anggota baru dengan pilihan ref_type siswa/pegawai) dan
apps/core-portal/src/apps/perpustakaan/pages/Sirkulasi.jsx (form proses pinjam & kembali buku,
tampilkan status keterlambatan/denda kalau ada) dan
apps/core-portal/src/apps/perpustakaan/pages/Reservasi.jsx (daftar reservasi + tombol batalkan),
mengikuti pola halaman-halaman sarpras/kepegawaian yang sudah ada sebagai referensi styling
(Tailwind CSS, sesuai ARSITEKTUR-SISTEM.md §4.2).
```

### 4.4 Prompt Antigravity — Tambahkan Kartu di `Launcher.jsx`

```
Baca apps/core-portal/src/pages/Launcher.jsx. Tambahkan satu kartu baru untuk modul Perpustakaan
(ikuti pola kartu Sarpras/Kantin yang sudah ada persis: ikon, judul "Perpustakaan", link ke
/perpustakaan/login). Jangan ubah urutan/isi kartu modul lain yang sudah ada.
```

### 4.5 Verifikasi Frontend Lokal

```bash
cd apps/core-portal
npm run dev
```

- [ ] Buka `http://localhost:5173/` (Launcher) — kartu "Perpustakaan" muncul, publik tanpa login.
- [ ] Klik kartu Perpustakaan → masuk `/perpustakaan/login`, login pakai akun `superadmin` (atau
      akun dummy dengan role `pustakawan` kalau sudah di-seed) → masuk ke
      `/perpustakaan/dashboard`.
- [ ] Buka `/perpustakaan/opac` **tanpa login** (buka tab baru/incognito) — pencarian tetap
      berfungsi.
- [ ] Kembali ke Launcher, klik kartu modul lain (mis. Core/Sarpras) — tidak diminta login ulang
      (SSO, token sesi sama).

---

## Tahap 5 — Integrasi

- [ ] Uji `crossModuleHelper.validateStudent()`/`.validateEmployee()` dengan `ref_id` yang benar-
      benar ada di `akademik_local`/`kepegawaian_local` (bukan cuma placeholder `id=1`) — jalankan
      migration & seed modul Akademik/Kepegawaian dulu di lokal kalau belum ada.
- [ ] Uji endpoint `GET /parent-facing/students/:student_ref_id/loan-history` dengan `X-API-Key`
      dummy (buat entri sementara di tabel `api_clients` Core Service kalau belum ada klien untuk
      Portal Orangtua).
- [ ] Uji `POST /loan-reminders/run` menghasilkan baris baru di `loan_reminders` untuk pinjaman
      yang sengaja dibuat mendekati/lewat `due_at` (ubah manual `due_at` salah satu baris
      `book_loans` lewat query SQL untuk simulasi).

## Tahap 6 — Verifikasi Lokal Menyeluruh

- [ ] Seluruh checklist Tahap 2.7, 3.8, 4.5, 5 di atas ✅.
- [ ] Jalankan alur end-to-end manual: daftar anggota → pinjam buku → coba pinjam buku sama
      (harus gagal, 409) → kembalikan → pinjam lagi (harus berhasil).
- [ ] Tidak ada error di console backend (`npm run dev` di `api-backend`) maupun frontend selama
      alur di atas.

## Tahap 7 — Deployment (Setelah Disetujui Developer)

- [ ] **Belum dikerjakan** — tunggu instruksi eksplisit developer setelah Tahap 1–6 ✅ semua.
- [ ] Kalau sudah diizinkan: buat database `perpustakaan` (bukan `_local`) di MariaDB Hostinger,
      tambahkan kredensial `PERPUSTAKAAN_*` ke environment variable production `api-backend`,
      jalankan migration & seed produksi (seed produksi **tanpa** data dummy — hanya
      `book_categories` dasar kalau perlu), commit & baru `git push` ke `main` setelah developer
      menyetujui.

---

## Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Status: database belum dibuat, belum ada kode. Tahap 1 (dokumen perencanaan) selesai di sesi ini; Tahap 2 (database) siap dieksekusi begitu 5 keputusan terbuka di `rancangan-perpustakaan.md` §5 dikonfirmasi (minimal poin 1 & 3 yang berdampak skema). |

*(Tambahkan baris baru di atas setiap ada progres tahap baru — jangan hapus riwayat lama.)*
