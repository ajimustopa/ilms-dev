# Rancangan Proyek: Core Service

> **WAJIB DIBACA setiap mulai sesi baru terkait Core Service.** File ini adalah sumber kebenaran
> untuk ruang lingkup dan keputusan arsitektur proyek ini. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status &
> Log Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> **Revisi 2026-08-16:** File diganti nama dari `rancangan.md` menjadi `rancangan-coreservice.md`
> (pola `rancangan-<nama-modul>.md` untuk 13 modul lain, disimpan bersama di root proyek yang
> sama — lihat `panduan-pengembangan-core-service.md` untuk daftar lengkap dokumen terkait).

## 1. Apa Ini & Posisinya dalam Sistem Besar

Core Service adalah aplikasi paling dasar dari **Sistem Manajemen Sekolah Terintegrasi**
(saat ini terdiri dari 14 aplikasi: Core Service, Website Utama, Akademik, Kepegawaian,
Keuangan, Portal Orangtua, Sarpras, Kantin, Dapur, Perpustakaan, Ujian & Bank Soal/CBE,
Komunikasi & Notifikasi, Tahfidz & Al-Quran, Pengelolaan).

Core Service **bukan** tempat menyimpan data induk siswa/pegawai (lihat Bagian 6). Perannya
murni sebagai:
- Pusat autentikasi & SSO untuk seluruh aplikasi
- Pusat data organisasi (Yayasan & Satuan Pendidikan)
- Pusat pengaturan sistem lintas aplikasi
- Jembatan integrasi (webhook publisher/subscriber, dokumentasi API, rate limiting)

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (berlaku semua 14 aplikasi — DB per aplikasi, multi-satuan-pendidikan,
JWT SSO, webhook, data induk hanya di satu aplikasi pemilik) sudah dipindah ke
**`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu dulu**, jangan diulang/disalin ulang di sini
supaya tidak ada dua sumber kebenaran yang bisa saling tidak sinkron.

Yang spesifik untuk Core Service saja:
- Core Service adalah **penerbit JWT** (access + refresh token) — satu-satunya aplikasi yang
  boleh melakukan proses login dan menandatangani token.
- Core Service adalah **publisher webhook utama** untuk perubahan data akun, Yayasan, dan Satuan
  Pendidikan. Aplikasi lain subscribe ke event ini lewat fitur "Webhook subscriber management"
  (lihat Bagian 4, fitur #10).
- Ada ketergantungan dua arah antara Core Service dan Akademik/Kepegawaian untuk provisioning
  akun — lihat `ARSITEKTUR-SISTEM.md` Bagian 6 untuk cara menanganinya saat pengembangan
  (jangan saling menunggu).

## 3. Stack Teknis

| Komponen | Pilihan | Catatan |
|---|---|---|
| Backend | Node.js + Express.js | *(asumsi awal — koreksi jika mau pakai Fastify)* |
| Query builder / migration | Knex.js | *(asumsi awal — bisa diganti Prisma/Sequelize/raw SQL)* |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` untuk hash password | |
| Database | MariaDB 10.5 | |
| Admin panel (frontend) | React (Vite) — SPA sederhana | *(asumsi awal)* |

Baris bertanda *(asumsi awal)* adalah pilihan default yang saya pakai supaya pengembangan bisa
langsung jalan — ubah baris ini begitu ada keputusan final, karena aplikasi satelit lain akan
mengikuti konvensi yang ditetapkan di sini.

Domain, strategi deploy (monorepo, folder `apps/`, Hostinger, GitHub Actions) sudah final dan
**hidup di `ARSITEKTUR-SISTEM.md` Bagian 1.1 dan 4.6–4.7**, tidak diulang di sini supaya tidak ada
dua sumber kebenaran — baca di sana kalau butuh detail domain/deployment Core Service.

## 4. Ruang Lingkup Fitur Core Service (13 Fitur, dari tabel fitur developer)

| Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|
| Autentikasi | Login SSO (JWT) | Must | username, password, token, refresh_token, expired_at | Semua pengguna |
| Autentikasi | Lupa password (pengajuan reset ke admin) | Must | username, kontak, status_permintaan, tanggal_permintaan | Semua pengguna, Admin |
| Autentikasi | Manajemen user & reset password | Must | username, password_hash, status, nama, jenis_akun, tanggal_dibuat | Admin |
| Autentikasi | Role & permission management | Must | nama_role, daftar_izin, deskripsi | Admin |
| Autentikasi | Audit log login & aktivitas | Should | user_id, aksi, ip_address, waktu, modul | Admin, Sistem |
| Data Master | Profil Yayasan | Must | nama_yayasan, alamat, kontak, email, nama_ketua, logo | Admin |
| Data Master | CRUD Satuan Pendidikan | Must | nama_sekolah, jenjang, npsn, alamat, kepsek, kontak, logo, status_aktif | Admin |
| Data Master | Pengaturan sistem (site settings) | Should | key, value, deskripsi | Admin |
| Integrasi | Webhook publisher | Must | event_type, endpoint_tujuan, payload, status_kirim, waktu | Sistem |
| Integrasi | Webhook subscriber management | Must | nama_aplikasi, url_endpoint, event_yang_dilanggan, status | Admin, Developer |
| Integrasi | Dokumentasi API (OpenAPI) | Should | - | Developer |
| Integrasi | Rate limiting & API gateway | Should | endpoint, limit_per_menit, klien | Developer, Admin |
| Keamanan | Audit log aktivitas admin lintas aplikasi | Should | admin_id, aplikasi, aksi, modul, data_sebelum, data_sesudah, waktu | Admin, Sistem |

Catatan penting soal fitur "Manajemen user & reset password": akun **tidak dibuat manual dari
sini**. Akun otomatis terbentuk saat data diinput di modul asalnya — guru/pegawai dibuat dari
Kepegawaian, siswa/orangtua dibuat dari Akademik. Core hanya mengelola sisi akun (aktif/nonaktif,
reset password, role) setelah akun itu ada.

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Struktur referensi `users` ke entitas asli.** Usulan: kolom `ref_type`
  (admin/guru/pegawai/siswa/orangtua) + `ref_id` + `satuan_pendidikan_id`. Perlu dikonfirmasi.
- **Audit log ganda (Fitur #5 vs #13).** Keduanya tampak tumpang tindih (login/aktivitas vs
  aktivitas admin lintas aplikasi) — digabung jadi satu tabel `audit_logs` atau tetap dipisah?
- **Granularitas permission.** Role sederhana per pengguna, atau role bisa berbeda per Satuan
  Pendidikan (pegawai yang bertugas di 2 sekolah punya role beda di tiap sekolah)?
- **Format payload webhook standar** (disarankan: `event_type`, `timestamp`, `data`,
  `satuan_pendidikan_id`) — harus disepakati sebelum aplikasi satelit mulai subscribe, karena
  semua aplikasi lain akan mengikuti format ini.

## 6. Yang BUKAN Tanggung Jawab Core Service — Jangan Dikerjakan di Sini

- Data induk siswa & orangtua → domain **Akademik**
- Data induk pegawai → domain **Kepegawaian**
- Tahun ajaran, semester, rombel, tingkat, angkatan → domain **Akademik**
- Apapun yang sifatnya transaksional (nilai, tagihan, presensi, dsb) → domain aplikasi
  masing-masing

Kalau di tengah pengembangan Core Service muncul kebutuhan yang terasa seperti masuk ke salah
satu domain di atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Aplikasi yang Terhubung ke Core Service

Matriks ketergantungan penuh 14 aplikasi ada di `ARSITEKTUR-SISTEM.md` Bagian 5. Ringkasan yang
relevan untuk Core Service: semua 13 aplikasi lain bergantung ke Core Service minimal untuk
autentikasi (JWT), data Satuan Pendidikan/Yayasan, dan pengaturan sistem.

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, dst) ada di
`ARSITEKTUR-SISTEM.md` Bagian 4 — Core Service **mengikuti**, bukan menentukan sendiri, karena
aplikasi lain akan meniru pola yang duluan dipakai di sini. Kalau butuh mengubah salah satu
konvensi itu, ubah di `ARSITEKTUR-SISTEM.md`, bukan diam-diam beda sendiri di Core Service.

Khusus Core Service: environment variable diawali `CORE_` (mis. `CORE_JWT_SECRET`, `CORE_DB_HOST`).

## 9. Dokumen Lain yang Terkait (baca kalau relevan dengan tugas sesi ini)

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 aplikasi, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut aplikasi lain, bukan cuma Core Service.
- `erd-coreservice.md` — ERD final 17 tabel Core Service.
- `api-contract-coreservice.md` — kontrak endpoint REST API lengkap Core Service.
- `roles-coreservice.md` — matriks role & permission Core Service.
- `panduan-pengembangan-core-service.md` — status realisasi & checklist migrasi ke struktur
  monorepo (lihat file ini untuk tahu file mana yang perlu dibaca Antigravity di tiap sesi).
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar fitur lengkap 202 baris, 14
  aplikasi. Sheet "Daftar Fitur" filter `Aplikasi = Core Service` untuk detail lengkap 13 fitur
  di atas.
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — catatan teknis yang **sudah jadi**
  (tabel, endpoint, enum, dst). Isi sheet ini setiap satu item Core Service selesai dibuat &
  diuji — jangan tunggu sampai semua selesai.
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan (Perencanaan → Database →
  Backend → ... → Go-Live) dan tracker progres lintas 14 aplikasi.

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-16 | File diganti nama dari `rancangan.md` jadi `rancangan-coreservice.md`. Baris "Deploy" & "Domain rencana" di Bagian 3 (placeholder lama, belum final) dihapus — domain & strategi deploy sudah final dan dirujuk ke `ARSITEKTUR-SISTEM.md` Bagian 1.1/4.6–4.7, tidak diulang di sini. Bagian 9 diperbarui menyebut `erd-coreservice.md`, `api-contract-coreservice.md`, `roles-coreservice.md`. |
| 2026-08-16 | Dokumen dibuat. Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). |
| 2026-08-16 | Bagian prinsip arsitektur global & konvensi teknis dipindah ke `ARSITEKTUR-SISTEM.md` supaya tidak terduplikasi di tiap aplikasi. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*