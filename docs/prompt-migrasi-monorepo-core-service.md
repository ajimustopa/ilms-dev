Status: perlu-revisi
Diperbarui: 2026-08-17

# Cara Pakai

1. Taruh **enam file** ini di root proyek Antigravity yang berisi `coreservice` (folder
   `backend/`, `frontend/` dari struktur lama):
   - `ARSITEKTUR-SISTEM.md` (versi terbaru, hasil revisi monorepo)
   - `panduan-pengembangan-core-service.md` (versi terbaru, hasil revisi monorepo)
   - `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
     `roles-coreservice.md` (versi final — prefix endpoint `/api/v1/core/...`, referensi silang
     antar dokumen sudah diperbarui)
2. **Buat database lokal dulu** (lihat file `checklist-eksekusi-migrasi-core-service.md` Langkah 1)
   sebelum menjalankan prompt di bawah — backend butuh database yang sudah ada saat langkah 9
   nanti mencoba jalan lokal.
3. Salin seluruh isi di bawah garis ini, tempel sebagai prompt pertama di sesi Antigravity.

---

Baca dulu file-file ini di root proyek sebelum melakukan apapun: `ARSITEKTUR-SISTEM.md` (Bagian
1.1 dan Bagian 4), `panduan-pengembangan-core-service.md` (seluruh isinya, terutama Bagian 0 dan
Bagian 3), dan sekilas `rancangan-coreservice.md`, `erd-coreservice.md`,
`api-contract-coreservice.md`, `roles-coreservice.md` supaya tahu isinya sudah final dan tidak
perlu ditulis ulang. Ikuti checklist Bagian 3 di `panduan-pengembangan-core-service.md` secara
berurutan untuk merestrukturisasi proyek ini dari struktur lama (`backend/`, `frontend/` terpisah
di root) menjadi struktur monorepo baru. Sebelum mulai, konfirmasi ke saya ringkasan pemahamanmu
soal struktur target (Bagian 3.1) dalam 3-5 kalimat, baru mulai eksekusi setelah saya setujui.

Aturan yang wajib dipatuhi sepanjang sesi ini, tanpa kecuali:

1. **Jangan pernah menjalankan `git push`.** Commit lokal (`git add` + `git commit`) boleh dan
   disarankan di titik-titik aman supaya progres tercatat, tapi push ke `origin` hanya boleh
   terjadi kalau saya secara eksplisit memintanya di pesan berikutnya. Kalau kamu perlu menjalankan
   perintah git yang sifatnya push atau publish ke remote, berhenti dan tanya dulu.
2. **Buat branch lokal baru dulu** sebelum memindahkan file apapun, jangan kerja langsung di
   `main`. Beri nama `restrukturisasi-monorepo`.
3. Struktur target: buat folder `apps/website-utama/` (kosongkan dulu, belum ada kodenya),
   `apps/core-portal/`, `apps/api-backend/`. Dokumen (`rancangan-coreservice.md`,
   `erd-coreservice.md`, `api-contract-coreservice.md`, `roles-coreservice.md`,
   `ARSITEKTUR-SISTEM.md`, `panduan-pengembangan-core-service.md`) **tetap di root, tidak usah
   dipindah ke folder manapun** — sudah sesuai posisi target. Pindahkan isi `backend/` jadi
   bagian dari `apps/api-backend/src/modules/core/` dan isi `frontend/` jadi bagian dari
   `apps/core-portal/src/apps/core/` — ikuti detail path exact di Bagian 3.2 dan 3.3
   `panduan-pengembangan-core-service.md`, jangan menebak-nebak nama folder sendiri.
4. **Perbaiki alur login-nya sekalian saat memindahkan frontend**: halaman kartu (`Launcher.jsx`)
   harus tampil begitu buka `/` tanpa perlu login — jangan dibungkus `ProtectedRoute`. Baru saat
   kartu "Administrasi Sistem" (Core) diklik, arahkan ke `/core/login` (halaman `Login.jsx` yang
   sudah ada, dipindah ke situ apa adanya). Kalau sesi/token JWT sudah ada di local storage saat
   kartu diklik, langsung arahkan ke `/core/dashboard` tanpa menampilkan form login lagi.
5. Setelah backend dipindah, ubah mounting route di `apps/api-backend/src/app.js` supaya semua
   endpoint Core diakses lewat prefix `/api/v1/core/...` (bukan `/api/v1/...` langsung di root
   lagi). Sesuaikan juga `baseURL` dan pemanggilan endpoint di `apps/core-portal/src/shared/services/api.js`
   dan semua halaman yang manggil API supaya ikut prefix `/core/...` yang baru.
   **Sekalian perbaiki bug yang sudah ada sebelum migrasi**: saat ini `authRoutes` di-mount dua
   kali (`/auth` dan alias `/password-resets`), padahal route `/password-resets` dan
   `/password-resets/:id/process` sudah didefinisikan di dalam `authRoutes` itu sendiri, jadi
   alias mount ganda itu menghasilkan path yang salah, bukan `/api/v1/core/password-resets`
   seperti di `api-contract-coreservice.md`. Hapus mount ganda itu, pindahkan dua route
   password-resets itu supaya nempel langsung di router Core (bukan di bawah `/auth`), sehingga
   hasil akhirnya persis `GET /api/v1/core/password-resets` dan
   `PATCH /api/v1/core/password-resets/:id/process` sesuai kontrak.
6. Dokumen kontrak API sudah dalam bentuk final di `api-contract-coreservice.md` (base URL &
   seluruh path endpoint sudah pakai prefix `/api/v1/core/...`) — **tidak perlu diedit lagi**,
   cukup dipakai sebagai acuan saat mengubah mounting route backend (langkah 5).
7. Buat `.env` baru di `apps/api-backend/.env` dan `apps/core-portal/.env` untuk pengembangan
   lokal. **Database yang dipakai adalah database lokal baru** (bukan koneksi ke database
   production Hostinger) — saya sudah membuatnya sebelum sesi ini lewat query SQL, dengan nilai:
   `CORE_DB_HOST=127.0.0.1`, `CORE_DB_PORT=3306`, `CORE_DB_NAME=core_local`,
   `CORE_DB_USER=core_local`, `CORE_DB_PASSWORD=<password yang saya buat di Langkah 1 —
   akan saya beri tahu di chat ini>`. Karena database ini lokal dan terpisah dari production,
   **kamu BOLEH generate `CORE_JWT_SECRET` dan `CORE_JWT_REFRESH_SECRET` baru** (string acak
   panjang, tidak perlu sama dengan production) — tidak ada sesi production yang perlu dijaga di
   database lokal ini. `CORE_CORS_ORIGIN` isi `http://localhost:5173` (port dev server Vite
   `core-portal`). `CORE_PORT` bebas (mis. `3000`), `CORE_NODE_ENV=development`. Untuk
   `apps/core-portal/.env`: `VITE_API_BASE_URL=http://localhost:3000/api/v1`. Pastikan kedua
   `.env` masuk `.gitignore`.
8. Tulis field `"workspaces": ["apps/*"]` di `package.json` root supaya mendukung npm workspaces
   untuk ketiga folder `apps/*` — `package.json` root yang ada sekarang **belum** punya field
   `workspaces` sama sekali (isinya cuma script lama `--prefix frontend`/`--prefix backend`),
   jadi ini ditulis baru, bukan sekadar menyesuaikan path yang sudah ada. Sesuaikan juga
   script-script di root supaya merujuk ke `apps/api-backend` dan `apps/core-portal`.
9. Sebelum menjalankan servernya, jalankan migration & seed dulu supaya tabel-tabel ada di
   database lokal yang masih kosong: di dalam `apps/api-backend`, jalankan `npx knex
   migrate:latest` lalu `npx knex seed:run`. Laporkan output kedua perintah itu ke saya. Baru
   setelah itu coba jalankan `apps/api-backend` dan `apps/core-portal` secara lokal (`npm
   install` lalu `npm run dev` di masing-masing folder). Laporkan ke saya kalau ada error, jangan
   langsung mencoba memperbaikinya sendiri dengan menebak — tanya dulu kalau penyebabnya tidak
   jelas dari pesan error.
10. Ceklis satu per satu item verifikasi di Bagian 3.5 `panduan-pengembangan-core-service.md`
    (health check, login per aplikasi, SSO saat klik ulang kartu, dst) dan laporkan hasilnya ke
    saya dalam bentuk checklist juga. Jangan menandai sesuatu "berhasil" kalau belum benar-benar
    kamu jalankan dan lihat hasilnya.
11. Setelah semua checklist Bagian 3.5 hijau, **berhenti** dan tunggu instruksi saya — jangan
    lanjut ke commit final atau push tanpa saya minta.

Kerjakan langkah demi langkah, jangan lompat ke deployment/Hostinger (Bagian 2.3 lama sudah tidak
relevan untuk sesi ini, itu baru dikerjakan nanti setelah saya setuju hasil lokalnya). Kalau di
tengah jalan kamu menemukan sesuatu yang tidak dijelaskan di `panduan-pengembangan-core-service.md`
atau `ARSITEKTUR-SISTEM.md` (misalnya nama file yang tidak sesuai ekspektasi), berhenti dan
tanyakan ke saya dulu — jangan mengasumsikan sendiri seperti yang diingatkan di
`rancangan-coreservice.md`.