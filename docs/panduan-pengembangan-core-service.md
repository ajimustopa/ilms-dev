Status: perlu-revisi
Diperbarui: 2026-08-17

# Panduan Pengembangan Core Service — Status & Migrasi ke Monorepo 3 Domain

> **Status Proyek:** ✅ Backend, database & frontend Core Service **sudah selesai dan live** —
> tapi dibangun di bawah arsitektur **lama** (14 aplikasi terpisah, tiap aplikasi domain & repo
> sendiri). Sejak revisi `ARSITEKTUR-SISTEM.md` Bagian 1.1 (2026-08-16, direvisi lagi
> 2026-08-16), sistem pindah ke arsitektur **3 domain, 1 repo (monorepo)**. Dokumen ini punya dua
> bagian: **Bagian 1** adalah arsip status realisasi lama (jangan dihapus, jadi rujukan kode yang
> sudah ada), **Bagian 2 dst.** adalah checklist migrasi ke struktur baru.
>
> **WAJIB DIBACA setiap mulai sesi baru terkait Core Service** — bersama `rancangan-coreservice.md` dan
> `api-contract-coreservice.md`, `erd-coreservice.md`, dan `roles-coreservice.md`. Kalau instruksi di suatu sesi tampak bertentangan dengan status
> migrasi di sini, tanyakan dulu ke developer sebelum melanjutkan.

---

## 0. Aturan Kerja Selama Migrasi — Lokal Dulu, Jangan Push

> **Ini berlaku untuk seluruh checklist di Bagian 2.** Migrasi dikerjakan dan diuji **sepenuhnya
> di lokal** dulu sampai benar-benar berfungsi, baru boleh dipertimbangkan untuk di-push.

- [ ] Jangan `git push` ke `origin` sampai developer memberi instruksi eksplisit untuk push —
      commit boleh dibuat lokal (`git add` + `git commit`) supaya progres tetap tercatat & bisa
      di-*rollback*, tapi jangan pernah `git push`.
- [ ] Kalau perlu titik aman untuk mundur, buat branch lokal baru dulu (mis.
      `restrukturisasi-monorepo`) sebelum mulai memindahkan file, jangan langsung kerja di `main`.
- [ ] Backend & frontend dijalankan lokal (`npm run dev` di masing-masing folder `apps/`) untuk
      diuji manual, sebelum dianggap "berhasil".
- [ ] Koneksi database memakai **database lokal baru** (`core_local`), dibuat lewat query SQL
      sebelum migrasi mulai (lihat `checklist-eksekusi-migrasi-core-service.md` Langkah 1) — bukan
      lagi koneksi Remote MySQL ke database production Hostinger seperti draf sebelumnya. Migration
      Knex yang sudah ada (`backend/db/migrations/`) dijalankan ulang ke database lokal ini
      (`npx knex migrate:latest` + `npx knex seed:run`), supaya data uji coba lokal terpisah total
      dari production dan aman dieksperimen tanpa risiko.
- [ ] Domain production (`core.aldeposibs.com`, `api-core.aldeposibs.com`) **tidak disentuh**
      selama tahap ini — biarkan tetap melayani seperti biasa sampai versi monorepo teruji lokal
      dan developer siap deploy (Bagian 2.3 baru dikerjakan setelah itu, bukan sekarang).

---

## 1. Ringkasan Perubahan: Sebelum → Sesudah Migrasi

| Aspek | Sebelum (arsitektur lama, sudah live) | Sesudah (target arsitektur baru) |
|---|---|---|
| Domain frontend | `core.aldeposibs.com` (SPA khusus Core Service) | `core.aldeposibs.com` (domain **sama**, isinya jadi Portal Aplikasi Internal — landing kartu 14 aplikasi *termasuk Core*, tanpa perlu login dulu untuk melihat kartu-kartunya) |
| Domain backend | `api-core.aldeposibs.com`, route `/api/v1/*` | `api.aldeposibs.com`, route `/api/v1/core/*` (prefix modul ditambah, satu backend menaungi 14 domain fungsi) |
| Repo | Repo sendiri `aldepos-core` | **Satu repo (monorepo)** untuk semuanya — Website Utama, Portal + 13 modul internal, dan backend jadi tiga folder (`apps/website-utama/`, `apps/core-portal/`, `apps/api-backend/`) di repo yang sama |
| Database | `u622997391_dbcore` di MariaDB Hostinger | **Tidak berubah** — tetap database sendiri per modul (lihat `ARSITEKTUR-SISTEM.md` Bagian 3 poin 1) |
| Login | Halaman `/login` milik Core Service sendiri | **Tetap per-aplikasi**, bukan satu login bersama — halaman kartu (`Launcher`) tampil duluan tanpa login, baru saat kartu diklik muncul halaman login **milik aplikasi itu** (lihat Bagian 3.3) |
| Env var | `.env` sendiri di repo `aldepos-core` | Pindah jadi `.env` di `apps/api-backend/.env` (backend) dan `apps/core-portal/.env` (frontend) di monorepo yang sama — prefix `CORE_` tetap dipakai |
| Alur kerja | Push langsung ke `main`, deploy otomatis | **Kerja & uji di lokal dulu** (Bagian 0) — push ditunda sampai fungsional |

---

## 2. Arsip Status Realisasi (Arsitektur Lama — Referensi Kode yang Sudah Ada)

### 2.1 Konfigurasi Production yang Sudah Terverifikasi

| Komponen | Nilai / Konfigurasi Nyata (lama) | Keterangan |
|---|---|---|
| Repository GitHub (lama) | `https://github.com/ajimustopa/aldepos-core.git` | Jadi sumber kode yang akan dipindah ke monorepo baru — repo lama ini nanti bisa diarsipkan setelah migrasi teruji & di-push |
| Node.js Runtime | Node.js v20.x / v22.x LTS | Express.js v4 + Knex.js — dipertahankan sebagai stack di `apps/api-backend` |
| Database Hostinger | MariaDB (`u622997391_dbcore`), user `u622997391_core` | **Tidak berubah**, tetap dipakai apa adanya setelah migrasi |
| Akun Super Admin | User `superadmin`, role `super_admin` | Tetap dipakai, tidak perlu seed ulang |

### 2.2 Tahap 1–4 (✅ Selesai 100% di arsitektur lama)

- **ERD**: 17 tabel di `erd-coreservice.md` — **tidak berubah**, jadi acuan skema database `core` di struktur baru.
- **Kontrak API**: `api-contract-coreservice.md` — isi kontrak endpoint tetap valid, hanya base URL & prefix
  path yang perlu diperbarui (lihat Bagian 3.4).
- **Role & Permission**: `roles-coreservice.md`, 4 role dasar (`super_admin`, `admin_yayasan`,
  `admin_satuan_pendidikan`, `developer`) — tidak berubah.
- **Backend**: 9 modul internal sudah jadi di `backend/src/modules/` — `auth`, `users`, `roles`,
  `foundation`, `school-units`, `system-settings`, `webhooks`, `api-clients`, `activity-logs`.
  Middleware inti: `verifyJwt.js`, `requirePermission.js`, `errorHandler.js`.
- **Frontend**: SPA React (Vite) dengan 9 halaman jadi (`Dashboard`, `ManajemenUser`,
  `RoleManagement`, `ProfilYayasan`, `SatuanPendidikan`, `PengaturanSistem`,
  `WebhookSubscribers`, `ApiClients`, `AuditLog`) plus `Login.jsx`, `Layout.jsx`,
  `ProtectedRoute.jsx`, `AuthContext.jsx`, `services/api.js` (axios interceptor + auto-refresh
  token). Semua sudah konek API asli, tidak ada mock data tersisa di jalur produksi.

### 2.3 Tahap 5 (🟡 Belum tuntas saat migrasi dimulai)

- [x] Health check, query publik, login admin sudah teruji live.
- [ ] Pengujian switch satuan pendidikan aktif di navbar — **lanjutkan pengujian ini setelah
      migrasi**, jangan dianggap selesai duluan.
- [ ] Pengujian pembuatan akun baru & pencatatan `activity_logs` — sama, lanjutkan setelah migrasi.

---

## 3. Tahap Migrasi ke Monorepo 3 Domain

> Ini **bukan** membangun ulang dari nol. Tugasnya memindahkan folder & menyesuaikan path/env,
> logika bisnis di dalam tiap file umumnya tidak berubah. Semua langkah di bawah dikerjakan
> **lokal**, ikuti aturan Bagian 0.

### 3.1 Struktur Monorepo Target

```
aldepos-sistem/                  (nama repo baru, satu repo untuk semuanya)
├── apps/
│   ├── website-utama/           (Next.js — publik, aldeposibs.com)
│   ├── core-portal/             (React Vite SPA — core.aldeposibs.com)
│   │   └── src/
│   │       ├── shared/          (komponen dipakai bersama SEMUA modul: Layout, ProtectedRoute, AuthContext, api.js)
│   │       ├── pages/
│   │       │   └── Launcher.jsx (halaman kartu 14 aplikasi, PUBLIK — tidak butuh login)
│   │       └── apps/
│   │           ├── core/pages/  (9 halaman admin Core Service + Login.jsx milik Core)
│   │           ├── akademik/    (folder kosong dulu, diisi belakangan)
│   │           └── ...          (satu folder per modul, diisi progresif)
│   └── api-backend/             (Express — api.aldeposibs.com)
│       └── src/
│           ├── middlewares/     (dipakai bersama semua modul)
│           ├── config/db/       (satu file koneksi Knex per modul, mis. core.js)
│           └── modules/
│               ├── core/        (9 submodul Core: auth, users, roles, dst — isi dari backend/src/modules/ lama)
│               ├── akademik/    (folder kosong dulu)
│               └── ...
├── ARSITEKTUR-SISTEM.md
├── rancangan-coreservice.md
├── erd-coreservice.md
├── roles-coreservice.md
├── api-contract-coreservice.md
├── panduan-pengembangan-core-service.md   (file ini)
│   (dokumen 13 modul lain nanti mengikuti pola sama, flat di root: rancangan-akademik.md,
│    erd-akademik.md, roles-akademik.md, api-contract-akademik.md, panduan-pengembangan-akademik.md, dst)
└── package.json                 (root — npm workspaces baru; `package.json` lama cuma punya script
    `--prefix frontend/backend`, BELUM ada field `workspaces` sama sekali, jadi ini ditulis baru,
    bukan disesuaikan — lihat Bagian 3.2 poin terakhir)
```

### 3.2 Backend — pindah jadi folder `apps/api-backend/`

- [ ] Buat folder `apps/api-backend/src/modules/core/` di dalam repo monorepo baru.
- [ ] Pindahkan isi `backend/src/modules/{auth,users,roles,foundation,school-units,
      system-settings,webhooks,api-clients,activity-logs}/` apa adanya ke
      `apps/api-backend/src/modules/core/<nama-submodul>/` (tetap 3 file per submodul:
      `routes.js`, `controller.js`, `service.js` — polanya jadi acuan untuk 13 modul lain).
- [ ] Pindahkan `backend/src/middlewares/*` ke `apps/api-backend/src/middlewares/` — jadi
      middleware **bersama**, dipakai modul lain juga (terutama `verifyJwt.js`).
- [ ] Pindahkan `backend/src/config/database.js` jadi `apps/api-backend/src/config/db/core.js` —
      karena `api-backend` sekarang menampung banyak koneksi Knex (satu per modul).
- [ ] Pindahkan `backend/db/migrations/` dan `backend/db/seeds/` ke
      `apps/api-backend/db/migrations/core/` dan `apps/api-backend/db/seeds/core/` — isi file
      migration **tidak perlu diubah**, cuma lokasinya.
- [ ] Di `apps/api-backend/src/app.js`, mount router Core dengan **prefix baru**:
      `app.use('/api/v1/core', coreV1Router)` — bukan lagi `app.use('/api/v1', v1Router)` di
      root. Endpoint yang tadinya `/api/v1/auth/login` jadi `/api/v1/core/auth/login`, dst.
      **Update `api-contract-coreservice.md` (di root proyek) supaya path barunya konsisten.**
- [ ] Endpoint internal (`/internal/users`, `/internal/activity-logs`) ikut pindah jadi
      `/api/v1/core/internal/...` — catat di `api-contract-coreservice.md`.
- [ ] Hapus/nonaktifkan `backend/app.js` & `backend/server.js` (entry point lama) setelah kode
      sepenuhnya pindah — `apps/api-backend` punya satu entry point sendiri untuk semua modul.
      Entry point baru: `apps/api-backend/server.js` (setara `backend/server.js` lama, cukup
      `require('./src/server.js')`) dan `apps/api-backend/src/server.js` (setara `backend/src/server.js`
      lama, isinya sama — start Express app, listen di `CORE_PORT`/`PORT`, tes koneksi DB saat boot).
      Jangan buat dua entry point berbeda gaya, ikuti pola yang sudah ada ini apa adanya.
- [ ] **Sambil membetulkan mounting, sekalian perbaiki bug alias `/password-resets`** yang sudah
      ada sejak sebelum migrasi: saat ini `backend/src/app.js` me-mount router `authRoutes` yang
      sama di dua prefix (`/auth` dan `/password-resets`), padahal di dalam `authRoutes` sendiri
      route-nya sudah didefinisikan lengkap sebagai `/password-resets` dan
      `/password-resets/:id/process`. Akibatnya alias itu menghasilkan path ganda yang salah
      (`/api/v1/password-resets/password-resets`, bukan `/api/v1/password-resets` sesuai
      `api-contract-coreservice.md`), sementara path yang benar-benar berfungsi sekarang cuma
      `/api/v1/auth/password-resets...`. Saat mount ulang dengan prefix `/api/v1/core`, mount
      `authRoutes` **hanya** di bawah `/auth` seperti biasa, lalu tambahkan route
      `GET /password-resets` dan `PATCH /password-resets/:id/process` langsung di router utama
      Core (bukan alias mount ganda) supaya persis sama dengan `api-contract-coreservice.md`
      (`GET /api/v1/core/password-resets`, `PATCH /api/v1/core/password-resets/:id/process`).
      Hapus alias mount ganda yang lama.
- [ ] Tulis ulang `package.json` di root proyek supaya punya field `"workspaces": ["apps/*"]` —
      **file lama belum punya field ini sama sekali** (cuma berisi script `--prefix frontend`/
      `--prefix backend` untuk struktur lama), jadi ini ditulis baru, bukan "disesuaikan
      pathnya" seperti disangka draf sebelumnya. Sesuaikan juga script-nya supaya merujuk
      `apps/api-backend` dan `apps/core-portal` (dan `apps/website-utama` nanti).

### 3.3 Frontend — pindah jadi folder `apps/core-portal/`

- [ ] Buat folder `apps/core-portal/src/apps/core/pages/` di repo monorepo baru.
- [ ] Pindahkan `frontend/src/pages/{Dashboard,ManajemenUser,RoleManagement,ProfilYayasan,
      SatuanPendidikan,PengaturanSistem,WebhookSubscribers,ApiClients,AuditLog}.jsx` ke
      `apps/core-portal/src/apps/core/pages/` apa adanya.
- [ ] Pindahkan `frontend/src/pages/Login.jsx` ke `apps/core-portal/src/apps/core/pages/Login.jsx`
      — **ini tetap halaman login milik Core Service sendiri**, bukan halaman bersama (lihat
      catatan penting Bagian 4.3 di bawah — ini koreksi dari draf migrasi sebelumnya).
- [ ] Pindahkan `frontend/src/components/Layout.jsx`, `ProtectedRoute.jsx`,
      `store/AuthContext.jsx`, `services/api.js` ke `apps/core-portal/src/shared/` — ini jadi
      milik bersama semua 14 aplikasi (session JWT, axios interceptor, proteksi route, layout
      shell), dipakai ulang oleh modul lain juga.
- [ ] Buat halaman baru `apps/core-portal/src/pages/Launcher.jsx` — halaman kartu/icon berisi
      **14 aplikasi** (13 modul internal + Core Service sendiri sebagai satu kartu, mis. label
      "Administrasi Sistem"). Halaman ini **PUBLIK, tidak dibungkus `ProtectedRoute`** — tampil
      duluan begitu buka `core.aldeposibs.com`, tanpa perlu login dulu.
- [ ] Update `router.jsx` jadi router gabungan milik `core-portal`:
      - `/` → `Launcher.jsx` (publik, tanpa `ProtectedRoute`)
      - `/core/login` → `apps/core/pages/Login.jsx` (halaman login milik Core Service)
      - `/core/*` (selain `/core/login`) → dibungkus `ProtectedRoute`, isinya 9 halaman admin
        Core Service (`/core/dashboard`, `/core/users`, `/core/roles`, `/core/foundation`,
        `/core/school-units`, `/core/settings`, `/core/webhooks`, `/core/api-clients`,
        `/core/audit-logs`)
      - `/akademik/login`, `/keuangan/login`, dst → diisi progresif seiring modul lain dibangun,
        polanya sama persis dengan `/core/login`
- [ ] `ProtectedRoute` untuk tiap modul: kalau token JWT sudah ada di sesi (user sudah login lewat
      modul lain sebelumnya, karena satu SPA = satu sesi), klik kartu modul lain **langsung**
      masuk ke dashboard modul itu tanpa diminta login ulang. Kalau belum ada token, baru
      diarahkan ke `/<modul>/login`. Ini bukan "satu halaman login untuk semua", tapi tetap
      terasa SSO karena sesinya memang satu — beda dengan draf migrasi sebelumnya yang keliru
      membuat halaman login jadi satu-satunya milik shell.
- [ ] Update `services/api.js`: `baseURL` axios tetap satu untuk semua modul
      (`https://api.aldeposibs.com/api/v1`), tapi tiap pemanggilan endpoint Core sekarang pakai
      prefix `/core/...` (mis. `api.get('/core/users')` bukan `api.get('/users')` lagi).

### 3.4 Environment Variable (lokal)

- [ ] Buat database lokal baru dulu lewat query SQL (`CREATE DATABASE`, `CREATE USER`, `GRANT`)
      — lihat `checklist-eksekusi-migrasi-core-service.md` Langkah 1. Ini database terpisah total
      dari production, jadi aman untuk migration/seed/testing tanpa menyentuh data live.
- [ ] Buat `apps/api-backend/.env` lokal: `CORE_DB_HOST=127.0.0.1`, `CORE_DB_PORT=3306`,
      `CORE_DB_USER`/`CORE_DB_PASSWORD` sesuai yang dibuat di query SQL, `CORE_DB_NAME=core_local`.
      Karena ini database lokal terpisah (bukan reuse production), `CORE_JWT_SECRET` dan
      `CORE_JWT_REFRESH_SECRET` **boleh digenerate baru** — tidak ada sesi production yang perlu
      dijaga tetap valid di database lokal ini.
- [ ] `CORE_PORT` dan `CORE_NODE_ENV=development` untuk lokal.
- [ ] `CORE_CORS_ORIGIN` di `.env` lokal diisi origin frontend lokal (`http://localhost:5173`,
      port default Vite di proyek ini), **bukan** nilai production (`https://api-core.aldeposibs.com`)
      — kalau dibiarkan nilai lama, browser akan blokir semua request dari `core-portal` lokal
      karena CORS, meski backend & koneksi DB-nya sudah benar.
- [ ] Buat `apps/core-portal/.env` lokal: `VITE_API_BASE_URL=http://localhost:<port-api-backend-lokal>/api/v1`.
- [ ] Pastikan `.env` di kedua folder masuk `.gitignore` root monorepo.
- [ ] Jalankan `npx knex migrate:latest` lalu `npx knex seed:run` di `apps/api-backend` sebelum
      `npm run dev` — database lokal masih kosong, tabel & akun `superadmin` awal baru ada setelah
      langkah ini.

### 3.5 Verifikasi Lokal (checklist "berfungsi" sebelum boleh dipertimbangkan push)

- [ ] `apps/api-backend` jalan lokal (`npm run dev` atau setara), health check
      `GET http://localhost:<port>/` merespons status sehat.
- [ ] `GET http://localhost:<port>/api/v1/core/school-units` mengembalikan data yang sama seperti
      di production (dari database yang sama, cuma path baru).
- [ ] `apps/core-portal` jalan lokal, buka `http://localhost:<port>/` → langsung tampil
      `Launcher.jsx` (kartu 14 aplikasi) **tanpa diminta login**.
- [ ] Klik kartu "Administrasi Sistem" (Core) → masuk ke `/core/login`, isi `superadmin` /
      `Password123!` (akun dummy dari seed lokal `001_initial_seed.js`, BUKAN password
      production) → berhasil masuk ke `/core/dashboard`.
- [ ] Kembali ke `/` (Launcher), klik ulang kartu "Administrasi Sistem" → **langsung** masuk ke
      `/core/dashboard` tanpa diminta login lagi (karena token masih ada di sesi).
- [ ] Seluruh 9 halaman admin lama (`ManajemenUser`, `RoleManagement`, dst) masih berfungsi
      seperti sebelum migrasi.
- [ ] Lanjutkan 2 item Tahap 5 yang belum tuntas (Bagian 2.3).
- [ ] Baru setelah semua di atas ✅ — laporkan ke developer, tunggu instruksi eksplisit sebelum
      `git push` (lihat Bagian 0).

---

## 4. Konvensi Core Service dalam Monorepo

### 4.1 Lokasi Kode

| Bagian | Lokasi baru |
|---|---|
| Route/controller/service Core | `apps/api-backend/src/modules/core/<submodul>/` |
| Migration & seed Core | `apps/api-backend/db/migrations/core/`, `apps/api-backend/db/seeds/core/` |
| Halaman admin + login Core | `apps/core-portal/src/apps/core/pages/` |
| Komponen/utility bersama (bukan cuma Core) | `apps/core-portal/src/shared/` |
| Dokumen Core Service (rancangan, ERD, kontrak API, role&permission) | root proyek, suffix `-coreservice` (`rancangan-coreservice.md`, dst) |

### 4.2 Prefix

- API: semua endpoint Core diakses lewat `/api/v1/core/...`.
- Frontend: semua halaman Core (termasuk login-nya sendiri) diakses lewat `/core/...`.

### 4.3 Catatan Penting — Launcher Publik, Login Tetap Per Aplikasi

Beda dari draf migrasi sebelumnya (yang membuat satu halaman login bersama di level shell), desain
yang benar sesuai kebutuhan awal (`ARSITEKTUR-SISTEM.md` Bagian 1.1):

- **`Launcher.jsx` (halaman kartu) tampil PUBLIK** — siapapun buka `core.aldeposibs.com` langsung
  lihat 14 kartu aplikasi, tidak perlu login dulu.
- **Login tetap milik masing-masing aplikasi** — klik kartu Core → `/core/login` (halaman login
  Core Service sendiri); nanti klik kartu Akademik → `/akademik/login` (halaman login Akademik
  sendiri), dst. Ini menjaga kesan "aplikasi terpisah" sesuai permintaan awal, walau satu SPA.
- **Sesi tetap satu (SSO)** — karena satu SPA menyimpan satu token JWT, kalau user sudah login
  lewat kartu manapun, klik kartu lain tidak akan diminta login ulang (lihat Bagian 3.3). Tiap
  aplikasi tetap punya *halaman* login sendiri untuk kasus belum ada sesi sama sekali.
- Core Service tetap satu-satunya penerbit JWT (`POST /api/v1/core/auth/login`) — yang berubah
  cuma bahwa *halaman* login-nya kini salah satu route di antara 14, bukan gerbang tunggal
  sebelum masuk portal.

---

## 5. Pola untuk 13 Panduan Modul Berikutnya

Dokumen `panduan-pengembangan-<nama-modul>.md` untuk 13 modul lain (Akademik, Kepegawaian, dst)
**tidak perlu** bagian "Tahap Migrasi" seperti Bagian 3 di atas — mereka dibangun langsung di
struktur monorepo (`apps/api-backend/src/modules/<nama-modul>/`,
`apps/core-portal/src/apps/<nama-modul>/`), tidak ada kode lama yang perlu dipindah. Pola yang
tetap sama untuk semua modul (termasuk Core Service di atas sebagai contoh yang sudah jadi):

- Tahap 1–2 (Perencanaan, Database) tetap sama seperti pola lama — `erd-<nama-modul>.md`,
  `api-contract-<nama-modul>.md`, `roles-<nama-modul>.md`, `rancangan-<nama-modul>.md` disimpan
  flat di **root proyek** (pola sama seperti 4 dokumen Core Service — lihat Bagian 6), migration &
  seed di folder modul masing-masing.
- Tahap 3 (Backend) langsung menulis di `apps/api-backend/src/modules/<nama-modul>/`, mount
  dengan prefix `/api/v1/<nama-modul>/...` sejak awal.
- Tahap 4 (Frontend) langsung menulis di `apps/core-portal/src/apps/<nama-modul>/pages/`,
  termasuk `Login.jsx` sendiri untuk modul itu (ikuti pola Bagian 4.3 — login tetap per aplikasi),
  pakai ulang `apps/core-portal/src/shared/` yang sudah ada dari Core Service (Layout,
  ProtectedRoute, AuthContext, api service) — **tidak perlu bikin ulang** logic auth/interceptor.
- Tambahkan satu kartu baru di `Launcher.jsx` untuk modul itu begitu siap dirilis.
- Kerjakan & uji lokal dulu sebelum push (ikuti aturan Bagian 0), tiap modul baru.
- Tahap 5–7 (Integrasi, Deployment, Go-Live) mengikuti checklist yang sama seperti Bagian 2.3–3.5
  di atas, tanpa bagian migrasi.

---

## 6. Dokumen Lain yang Terkait

Sesuai revisi 2026-08-16, empat dokumen khusus Core Service diganti nama dengan akhiran
`-coreservice` dan disimpan **flat di root proyek monorepo** (bukan lagi di subfolder), supaya
tidak bentrok dengan dokumen 13 modul lain yang menyusul dengan pola nama yang sama:

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh, Bagian 1.1 untuk arsitektur 3 domain +
  1 repo, Bagian 4 untuk konvensi teknis global yang jadi rujukan migrasi ini.
- `rancangan-coreservice.md` — ruang lingkup & keputusan arsitektur Core Service, tidak
  terpengaruh migrasi (isinya soal *apa* yang dikerjakan Core Service, bukan *di mana* kodenya
  hidup). Baris "Deploy"/"Domain rencana" yang usang sudah dibersihkan, dirujuk balik ke
  `ARSITEKTUR-SISTEM.md`.
- `api-contract-coreservice.md` — **sudah diperbarui** base URL & seluruh path endpoint ke
  prefix `/api/v1/core/...` (lihat Bagian 3.2 & 3.4 di atas).
- `erd-coreservice.md` — skema 17 tabel, tidak berubah isinya, cuma nama file.
- `roles-coreservice.md` — matriks role & permission, contoh path endpoint sudah diperbarui ke
  prefix `/api/v1/core/...`.

## 7. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-16 | **Revisi kelima:** Keputusan database berubah dari "reuse database production lewat Remote MySQL" jadi **database lokal baru** (`core_local`, dibuat lewat query SQL sendiri, migration+seed dijalankan ulang ke situ). Konsekuensi: `CORE_JWT_SECRET`/`CORE_JWT_REFRESH_SECRET` sekarang boleh digenerate baru (tidak perlu jaga kompatibilitas sesi production), kredensial login verifikasi pakai akun dummy seed lokal (`superadmin` / `Password123!`), bukan password production. Langkah lengkap & urutan eksekusi ada di `checklist-eksekusi-migrasi-core-service.md`. |
| 2026-08-16 | **Revisi keempat (hasil cek konsistensi terhadap `coreservice.zip`):** Bagian 3.1 dikoreksi — `package.json` root **belum** punya field `workspaces` sama sekali (bukan "sudah ada dasarnya" seperti draf sebelumnya), jadi ditulis baru. Bagian 3.2 ditambah: penjelasan entry point baru `apps/api-backend/server.js`, perbaikan bug alias `/password-resets` (mount ganda yang sudah salah sejak sebelum migrasi), dan langkah eksplisit menulis `workspaces` di `package.json` root. Bagian 3.4 ditambah: peringatan `CORE_DB_HOST=localhost` tidak akan berfungsi dari komputer lokal (perlu Remote MySQL + IP whitelist di hPanel, host diganti ke hostname/IP Hostinger), dan `CORE_CORS_ORIGIN` perlu diarahkan ke origin lokal (`http://localhost:5173`) supaya tidak diblokir CORS. |
| 2026-08-16 | **Revisi ketiga:** 4 dokumen khusus Core Service (`rancangan.md`, `erd.md`, `api-contract.md`, `roles.md`) diganti nama jadi `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`, `roles-coreservice.md` — disimpan flat di root proyek monorepo (bukan subfolder `docs/core-service/` seperti draf sebelumnya). Bagian 3.1 (struktur target), 3.2 (langkah update kontrak API), 5 (pola modul lain), dan 6 (dokumen terkait) diperbarui menyesuaikan. |
| 2026-08-16 | Revisi kedua: struktur pindah dari "3 repo terpisah" jadi **1 monorepo** (`apps/website-utama`, `apps/core-portal`, `apps/api-backend`). Koreksi alur login: `Launcher.jsx` jadi halaman publik (bukan di balik login), tiap aplikasi tetap punya halaman login sendiri (bukan satu login bersama seperti draf sebelumnya). Menambahkan Bagian 0 (aturan kerja lokal dulu, tidak push sampai fungsional). |
| 2026-08-16 | Dokumen ditulis ulang pertama kali: menambahkan checklist migrasi ke arsitektur 3 domain, konvensi lokasi kode & prefix di repo bersama, pola untuk 13 panduan modul berikutnya. Status realisasi lama (Tahap 1–5) diarsipkan, tidak dihapus. |
| 2026-08-16 (sebelumnya) | Status Tahap 1–4 selesai 100%, Tahap 5 berjalan (dicatat di panduan versi lama sebelum revisi arsitektur). |

*(Tambahkan baris baru di atas setiap ada progres migrasi/keputusan baru — jangan hapus riwayat lama.)*