# rancangan-website-utama.md

> **WAJIB DIBACA setiap mulai sesi baru terkait Website Utama.** File ini adalah sumber kebenaran
> untuk ruang lingkup dan keputusan arsitektur modul ini. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status & Log
> Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Dibuat 2026-08-17, mengikuti pola `rancangan-coreservice.md` (Core Service, sudah selesai
> dibangun duluan, jadi acuan format untuk 13 modul lain).

## 1. Apa Ini & Posisinya dalam Sistem Besar

Website Utama adalah **satu-satunya modul yang dideploy terpisah dari `core-portal`** — situs
publik sekolah di domain sendiri `aldeposibs.com`, dibangun dengan **Next.js** (bukan React SPA
seperti 13 modul internal), karena butuh SSR/SSG untuk SEO dan diakses **tanpa login** oleh
pengunjung umum & calon siswa/ortu.

Fungsinya:
- Profil publik sekolah (beranda, profil, struktur organisasi, kehidupan sekolah, kontak,
  akreditasi)
- Publikasi konten (berita/pengumuman, galeri, FAQ, testimoni, agenda, artikel guru/siswa)
- PPDB online (pendaftaran, jadwal seleksi, pembayaran, tracking status)
- Konsultasi publik (tiket & booking konsultasi virtual)
- CMS untuk mengelola semua konten di atas

Total **22 fitur** (lihat Bagian 4), sesuai `ARSITEKTUR-SISTEM.md` Bagian 2.

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL ada di `ARSITEKTUR-SISTEM.md` Bagian 3 — **baca file itu dulu**, tidak
diulang di sini. Yang spesifik untuk Website Utama:

- Website Utama **satu-satunya modul dengan deployment frontend terpisah** dari `core-portal`
  (`ARSITEKTUR-SISTEM.md` Bagian 1.1 & 4.2) — Next.js di `aldeposibs.com`, bukan route di dalam
  SPA `core.aldeposibs.com`.
- Karena itu, pemanggilan ke backend (`api.aldeposibs.com/api/v1/website-utama/...`) tetap lewat
  **HTTP asli** (bukan pemanggilan service in-process), berbeda dari 13 modul internal lain yang
  kini bisa saling panggil in-process karena satu proses `api-backend` dan satu SPA
  `core-portal`.
- Website Utama **tidak punya database sendiri berisi data induk** — ia hanya menyimpan konten
  yang memang miliknya sendiri (berita, galeri, FAQ, testimoni, PPDB, tiket konsultasi, dst).
  Data induk siswa/PPDB hasil verifikasi tetap di Akademik; data pegawai/guru tetap di
  Kepegawaian; data Satuan Pendidikan/Yayasan tetap di Core.

### 2.1 Keputusan: Publik Tanpa Login, CMS Admin Hidup di `core-portal` **(Final)**

Developer mengonfirmasi Website Utama **publik murni, tidak ada login sama sekali** di aplikasi
Next.js-nya. Karena tetap ada kebutuhan CMS (Fitur #33, #34, #35 dan aksi edit/tambah/publish di
hampir semua fitur konten), keputusannya:

- **CMS Admin (login + seluruh halaman kelola konten) ditempatkan di dalam `core-portal`**, di
  `apps/core-portal/src/apps/website-utama/pages/` — **bukan** di dalam aplikasi Next.js
  `apps/website-utama/`. Website Utama jadi satu-satunya modul yang **tidak** punya `Login.jsx`
  sendiri di dalam foldernya sendiri (berbeda dari pola default Bagian 5
  `panduan-pengembangan-core-service.md`), karena aplikasi Next.js-nya memang tidak boleh ada
  halaman login.
- Alasan: staf admin (Superadmin, Admin CMS, Guru, Siswa yang menulis artikel) sudah memakai
  `core-portal` untuk modul lain, jadi bisa langsung pakai ulang `shared/` (Layout,
  ProtectedRoute, AuthContext, axios interceptor + auto-refresh) yang sudah ada dari Core
  Service — tidak perlu bangun logic auth kedua di Next.js hanya untuk beberapa admin.
- Konsekuensinya untuk backend: `apps/api-backend/src/modules/website-utama/` dipisah dua
  kelompok rute:
  - **Endpoint publik** (`/api/v1/website-utama/public/...`) — tanpa auth, dipanggil situs
    Next.js untuk menampilkan konten & submit form (PPDB, konsultasi).
  - **Endpoint admin** (`/api/v1/website-utama/admin/...`) — pakai `Authorization: Bearer <jwt>`
    sama seperti modul internal lain, dipanggil dari `core-portal`.
- Ditandai final berdasarkan instruksi eksplisit developer 2026-08-17 — bukan asumsi sepihak.

## 3. Stack Teknis

Ikuti `ARSITEKTUR-SISTEM.md` Bagian 4 — Website Utama **tidak membuat keputusan stack sendiri**:

| Komponen | Pilihan | Rujukan |
|---|---|---|
| Frontend publik | **Next.js** (`apps/website-utama/`) | ARSITEKTUR-SISTEM.md §4.2 |
| Frontend CMS admin | React (Vite), route di dalam `apps/core-portal/src/apps/website-utama/` | ARSITEKTUR-SISTEM.md §4.2, §2.1 di atas |
| Backend | Express.js, modul `apps/api-backend/src/modules/website-utama/` | ARSITEKTUR-SISTEM.md §4.1 |
| Query builder / migration | Knex.js | ARSITEKTUR-SISTEM.md §4.1 |
| Database | MariaDB 10.5, InnoDB, `utf8mb4` — **database sendiri** untuk modul ini | ARSITEKTUR-SISTEM.md §4.1, §3 poin 1 |
| Auth | Verifikasi JWT terbitan Core Service (`CORE_JWT_SECRET`, import langsung in-process untuk sisi admin di `core-portal`/`api-backend`) | ARSITEKTUR-SISTEM.md §4.1 |
| Styling | Tailwind CSS (di kedua frontend — Next.js & CMS admin) | ARSITEKTUR-SISTEM.md §4.2 |
| Payment gateway (Fitur #27) | **Belum ditentukan** — lihat Bagian 5 Keputusan Terbuka | - |

## 4. Ruang Lingkup Fitur Website Utama (22 Fitur, dari daftar fitur developer)

| Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|
| Konten Publik | Beranda | Must | hero, statistik (live dari Core/Akademik/Kepegawaian, tidak disimpan lokal), keunggulan, navbar, footer | Admin (edit), Publik (lihat) |
| Konten Publik | Profil sekolah | Must | nama, npsn, jenjang, alamat, visi_misi, sejarah, kontak, logo — **sumber: Core**, ditampilkan saja | Publik |
| Konten Publik | Struktur organisasi & profil pengajar | Should | nama, jabatan, foto, urutan, bio singkat | Admin, Publik |
| Konten Publik | Kehidupan sekolah (fasilitas, ekskul, tata tertib, prestasi) | Should | judul, kategori, deskripsi, foto | Admin, Publik |
| Konten Publik | Berita & pengumuman | Must | judul, slug, isi, kategori, tanggal_publish, gambar_sampul | Admin, Publik |
| Konten Publik | Galeri foto & kegiatan | Should | nama_album, foto/video, tanggal, deskripsi | Admin, Publik |
| Konten Publik | FAQ publik | Could | pertanyaan, jawaban, kategori, urutan | Admin, Publik |
| Konten Publik | Testimoni | Could | nama, peran, isi, foto, status_tampil | Admin, Publik |
| Konten Publik | Agenda & kegiatan sekolah | Should | nama_kegiatan, tanggal, lokasi, deskripsi, poster | Admin, Publik |
| Konten Publik | Kontak & lokasi sekolah | Could | alamat, telepon, email, koordinat_peta — **sumber: Core** | Publik |
| Konten Publik | Informasi akreditasi & prestasi | Could | jenis_akreditasi, nilai, tahun, sertifikat | Admin, Publik |
| Pendaftaran | PPDB online | Must | data_diri_calon, data_ortu, upload_dokumen, jalur_pendaftaran | Calon siswa/ortu, Admin |
| Pendaftaran | Jadwal seleksi PPDB | Must | gelombang, tanggal_tes, lokasi/link, jenis_tes | Admin |
| Pendaftaran | Pembayaran biaya pendaftaran | Must | id_pendaftar, jumlah, status_bayar, referensi_gateway | Calon siswa/ortu, Admin |
| Pendaftaran | Tracking status pendaftaran | Must | id_pendaftar, status, catatan, tanggal_update | Admin, Calon siswa/ortu |
| Konsultasi | Form konsultasi publik (tiket) | Should | nama, kontak, subjek, isi, status, balasan | Publik, Admin |
| Konsultasi | Booking konsultasi virtual | Could | nama, kontak, jadwal, link_meeting, status | Publik, Admin |
| Publikasi | Artikel & berita oleh guru/siswa | Should | judul, slug, isi, kategori, status, penulis, views | Guru, Siswa, Admin |
| Publikasi | Moderasi komentar artikel | Could | id_artikel, nama, isi_komentar, status | Admin |
| CMS Admin | Theme builder | Could | preset_warna, tipografi | Admin |
| CMS Admin | Manajemen user CMS (superadmin) | Must | username, role, status — **akun tetap dari Core**, ini cuma penetapan akses CMS | Superadmin |
| CMS Admin | Pengaturan situs & SEO | Should | key, value, meta tag, sitemap/robots.txt | Admin |

> Kolom Prioritas mengikuti kolom "Prioritas" di daftar fitur asli — **tandai untuk direview**,
> belum tentu final kalau developer mau ubah urutan MoSCoW-nya.

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Payment gateway PPDB (Fitur #27).** Belum ditentukan penyedia (Midtrans/Xendit/lainnya),
  metode pembayaran yang didukung, dan apakah rekonsiliasi ke Keuangan (disebut "opsional" di
  daftar fitur) dikerjakan di fase ini atau ditunda ke Fase Keuangan.
  **Aturan sementara**: kolom `payment_gateway_ref` dibuat generik (nullable, tanpa integrasi
  aktif dulu) sampai keputusan ini diambil — status pembayaran bisa diupdate manual oleh Admin
  sebagai jalan pintas awal.
- **Multi-step PPDB — berapa langkah pasti & dokumen wajib apa saja.** Daftar fitur hanya
  menyebut "data diri, data ortu, upload dokumen" secara umum. Perlu daftar dokumen wajib per
  jalur pendaftaran dan urutan step form dari developer/Akademik sebelum ERD tabel dokumen
  final.
- **Siapa yang boleh menulis artikel (Fitur #31)** — "Guru, Siswa" tercatat sebagai aktor, tapi
  akun mereka berasal dari Akademik/Kepegawaian (bukan CMS admin biasa). Perlu dikonfirmasi:
  apakah mereka login lewat `core-portal` (modul Akademik/Kepegawaian masing-masing) lalu diberi
  akses submodul artikel Website Utama, atau perlu jalur akses terpisah.
- **Granularitas role CMS.** Daftar fitur hanya menyebut "Admin" & "Superadmin" secara umum —
  perlu dipecah lebih detail di `roles-website-utama.md` (mis. apakah ada role khusus "Editor
  Berita" vs "Admin PPDB" terpisah, atau cukup satu role "admin_cms" generik).
- **Retensi/arsip PPDB per tahun ajaran** — apakah data pendaftar lama dihapus/diarsipkan setiap
  tahun ajaran baru, atau tetap disimpan permanen untuk statistik.

## 6. Yang BUKAN Tanggung Jawab Website Utama — Jangan Dikerjakan di Sini

- Verifikasi & penempatan kelas hasil PPDB → domain **Akademik** (Website Utama hanya kirim data
  pendaftar & terima balik status)
- Data induk siswa/ortu setelah diterima → domain **Akademik**
- Data induk guru/pegawai (untuk profil pengajar) → domain **Kepegawaian**, Website Utama hanya
  simpan salinan tampilan (bio, urutan, foto) yang mengacu ID pegawai
- Data Yayasan/Satuan Pendidikan/kontak resmi sekolah → domain **Core Service**
- Data fasilitas fisik/aset → domain **Sarpras**, Website Utama hanya menampilkan ringkasan untuk
  halaman "Kehidupan Sekolah"
- Rekonsiliasi pembayaran & pembukuan → domain **Keuangan** (opsional, lihat Keputusan Terbuka)
- Akun login itu sendiri (password, sesi) → domain **Core Service**, Website Utama CMS hanya
  memakai token yang diterbitkan Core

## 7. Aplikasi yang Terhubung ke Website Utama

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 5:

- **Website Utama bergantung pada**: Core Service (auth CMS, data Satuan Pendidikan/Yayasan),
  Akademik (verifikasi & penempatan PPDB, kalender untuk agenda), Kepegawaian (data guru untuk
  profil pengajar & penulis artikel), Sarpras (data fasilitas untuk halaman kehidupan sekolah),
  Keuangan (rekonsiliasi pembayaran PPDB, opsional).
- **Yang bergantung pada Website Utama**: Akademik (menerima data pendaftar PPDB untuk
  diverifikasi), Keuangan (rekonsiliasi pembayaran), Portal Orangtua (opsional — berita &
  agenda).

### 7.1 Ketergantungan Dua Arah (Website Utama ↔ Akademik)

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 6: Website Utama kirim data pendaftar PPDB ke Akademik untuk
verifikasi; Akademik kirim balik status verifikasi ke Website untuk halaman tracking. Karena
Website Utama tetap panggil lewat HTTP asli (Bagian 2 di atas), **bangun Website Utama dulu
dengan endpoint Akademik di-mock** (respons dummy status `pending` dari fungsi mock lokal),
sambungkan sungguhan setelah Akademik fase verifikasi PPDB selesai (Fase 2 di urutan
pengembangan, `ARSITEKTUR-SISTEM.md` §7).

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, dst) ada di
`ARSITEKTUR-SISTEM.md` Bagian 4 — Website Utama **mengikuti**, tidak menentukan sendiri.

Khusus Website Utama: environment variable diawali `WEBSITEUTAMA_` (mis.
`WEBSITEUTAMA_DB_HOST`, `WEBSITEUTAMA_DB_NAME`) di `.env` `apps/api-backend/`; frontend Next.js
punya `.env` sendiri di `apps/website-utama/` (`NEXT_PUBLIC_API_BASE_URL`).

## 9. Dokumen Lain yang Terkait (baca kalau relevan dengan tugas sesi ini)

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut modul lain.
- `erd-website-utama.md` — ERD tabel database Website Utama.
- `api-contract-website-utama.md` — kontrak endpoint REST API (publik & admin) Website Utama.
- `roles-website-utama.md` — matriks role & permission Website Utama.
- `panduan-pengembangan-website-utama.md` — checklist tahap pengembangan + prompt
  Antigravity/query SQL siap pakai per tahap.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md` — contoh format & pola acuan (Core Service sudah selesai dibangun
  duluan).

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Dokumen dibuat. Ruang lingkup 22 fitur dikonfirmasi dari daftar fitur developer (revisi setelah file yang salah ter-attach sebelumnya berisi fitur Akademik). Keputusan final: CMS Admin hidup di `core-portal`, Website Utama publik murni tanpa login (Bagian 2.1). Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
