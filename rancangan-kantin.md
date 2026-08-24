# rancangan-kantin.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Kantin.** File ini sumber kebenaran untuk
> ruang lingkup dan keputusan arsitektur modul Kantin. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status & Log
> Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Disusun mengikuti pola `rancangan-coreservice.md` (Core Service, sudah selesai dibangun, jadi
> acuan format untuk 13 modul lain).

## 1. Apa Ini & Posisinya dalam Sistem Besar

Kantin adalah modul operasional kantin sekolah dalam **Sistem Manajemen Sekolah Terintegrasi**
(14 modul — lihat `ARSITEKTUR-SISTEM.md` Bagian 2). Perannya:
- Mengelola vendor & produk (titipan maupun belanja sendiri kantin)
- Mengelola saldo dompet cashless siswa & transaksi kasir
- Membagi hak pendapatan antara kantin dan vendor (revenue sharing)
- Menyediakan akses orangtua untuk memantau & membatasi jajan anak
- Laporan & dashboard operasional kantin

Kantin **bukan** tempat menyimpan data induk siswa, rombel, akun/user, atau role (lihat Bagian 6).

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (DB per aplikasi, multi-satuan-pendidikan, JWT SSO, webhook, data induk
hanya di satu aplikasi pemilik) ada di `ARSITEKTUR-SISTEM.md` Bagian 3 — baca di sana, tidak
diulang di sini.

Yang spesifik untuk Kantin:
- Kantin **mengonsumsi** data dari Core Service (auth/JWT, akun, role, satuan pendidikan),
  Akademik (data induk siswa & rombel), Kepegawaian (data pegawai untuk penugasan kasir/bendahara/
  kepala kantin bila perlu ditampilkan namanya), dan Keuangan (pembukuan hak kantin, kalau
  Keuangan sudah menyediakan endpoint jurnal — lihat Keputusan Terbuka §5).
- Kantin adalah **pemilik** data: saldo dompet cashless, PIN anak/ortu (khusus kantin, bukan PIN
  akun Core), riwayat transaksi jajan, limit jajan harian, dan hak vendor. Data ini **tidak**
  disalin ke Akademik/Core.
- Kantin **menerbitkan webhook** untuk Portal Orangtua (perubahan saldo, riwayat jajan) dan untuk
  Keuangan (pencatatan hak kantin sebagai pendapatan), sesuai format standar
  `{ event_type, timestamp, data, satuan_pendidikan_id }`.
- **Penyesuaian penting terhadap draf fitur asli (77 baris):** draf awal berisi modul penuh
  "Role" (#5–8), "User" (#9–13), "Rombel" (#30–33), dan "Murid" (#34–40) sebagai CRUD mandiri.
  Ini **direvisi** supaya patuh prinsip arsitektur global (data induk siswa/rombel → Akademik,
  akun/role → Core Service):
  - **Role & User (#5–13):** Kantin **tidak** membuat/mengedit akun atau role sendiri. Kasir,
    bendahara, kepala kantin, admin adalah **role Core Service** yang sudah ada, ditugaskan ke
    user lewat `user_school_roles` milik Core (di luar cakupan Kantin). Yang tersisa jadi
    tanggung jawab Kantin hanyalah **pengaturan menu/fitur mana yang bisa diakses tiap role di
    dalam aplikasi Kantin** — fitur "Jenis Akses" (#1–4) direinterpretasi jadi tabel toggle
    akses-menu lokal Kantin (lihat `erd-kantin.md` §2.1–2.2), bukan manajemen role global.
  - **Rombel & Murid (#30–40):** Kantin **tidak** menyimpan tabel siswa/rombel sendiri. Kantin
    hanya punya tabel `canteen_students` yang **mereferensikan** `student_id` milik Akademik
    (kolom ID biasa, bukan FK fisik lintas database) plus atribut yang **memang milik Kantin**:
    saldo dompet, PIN anak, PIN ortu (khusus kantin), status blokir jajan, limit kustom. Nama,
    JK, dan rombel siswa **ditampilkan** dengan memanggil service Akademik (in-process, sesuai
    `ARSITEKTUR-SISTEM.md` §1.1) saat dibutuhkan, atau disimpan sebagai kolom cache tampilan
    read-only yang disegarkan lewat webhook Akademik (`cached_student_name`,
    `cached_class_group_name`) — **bukan** sumber kebenaran, jangan diedit manual dari Kantin.
  - Baris fitur asli #1–13 dan #30–40 tetap dicatat di tabel Bagian 4 di bawah supaya jejak PRD
    202-baris tidak hilang, tapi kolom "Catatan Penyesuaian" menjelaskan reinterpretasinya.

## 3. Stack Teknis

Ikuti `ARSITEKTUR-SISTEM.md` Bagian 4 (Konvensi Teknis Global) — Kantin **tidak membuat
keputusan stack sendiri**:

| Komponen | Pilihan |
|---|---|
| Backend | Express.js, sebagai modul `apps/api-backend/src/modules/kantin/` di backend monolith bersama |
| Query builder / migration | Knex.js, koneksi terpisah ke database `kantin` |
| Auth | Verifikasi JWT terbitan Core Service (import langsung, in-process) — Kantin tidak menerbitkan token sendiri |
| Database | MariaDB 10.5, `utf8mb4`, InnoDB — database sendiri (`u622997391_dbkantin` di production, `kantin_local` untuk lokal) |
| Frontend | React (Vite), folder `apps/core-portal/src/apps/kantin/pages/`, termasuk `Login.jsx` sendiri (SSO otomatis via sesi JWT bersama, lihat `panduan-pengembangan-core-service.md` §4.3) |

## 4. Ruang Lingkup Fitur Kantin (77 Baris Draf, Disesuaikan)

Tabel penuh 77 fitur (kolom/atribut, aktor) ada di daftar fitur lampiran developer. Ringkasan per
modul dengan catatan penyesuaian arsitektur:

| Modul (draf asli) | Cakupan Baris | Status di Kantin | Catatan Penyesuaian |
|---|---|---|---|
| Konfigurasi — Jenis Akses | #1–4 | **Dipertahankan, direinterpretasi** | Jadi toggle akses-menu Kantin per role Core (`access_menus`, `role_menu_access`), bukan manajemen jenis akses global |
| Konfigurasi — Role | #5–8 | **Dihapus dari Kantin** | Role adalah domain Core Service (`roles`, `user_school_roles`). Kantin hanya *memakai* role yang sudah ada (kasir, bendahara, kepala_kantin, admin) |
| Konfigurasi — User | #9–13 | **Dihapus dari Kantin** | Akun/user adalah domain Core Service. Kantin tidak CRUD user maupun reset password akun |
| Produk — Vendor, Kategori, Produk Vendor, Barcode, Penerimaan Barang | #14–29 | **Dipertahankan penuh** | Domain asli Kantin, tidak tumpang tindih modul lain |
| Murid — Rombel | #30–33 | **Dihapus dari Kantin** | Rombel adalah domain Akademik. Kantin mengambil data rombel via referensi `class_group_id` ke Akademik untuk tampilan/filter saja |
| Murid — Murid (identitas, biodata) | #34, 36, 37 (sebagian) | **Dihapus dari Kantin** | NIPD, JK, nama, rombel, nama & kontak ortu adalah data induk Akademik. Kantin hanya referensi `student_id` |
| Murid — atribut kantin (saldo, PIN, QR, reset PIN) | #35 (sebagian), 38, 39, 40 | **Dipertahankan sebagai domain Kantin** | Jadi tabel `canteen_students`: saldo dompet, PIN anak, PIN ortu (kantin), QR code kantin — bukan identitas siswa |
| Konfigurasi — Limit Jajan Harian | #41–44 | **Dipertahankan penuh** | Domain asli Kantin |
| Keuangan — Top Up/Tarik Tunai, Mutasi Dompet | #45–46 | **Dipertahankan penuh** | |
| Penjualan — Transaksi Penjualan | #47 | **Dipertahankan penuh** | Inti operasional kasir |
| Keuangan — Piutang & Hak Kantin/Vendor, Pembayaran | #48–54 | **Dipertahankan penuh** | Perhitungan revenue sharing kantin↔vendor |
| Produk — Retur Barang | #55–56 | **Dipertahankan penuh** | |
| Keuangan — Pengeluaran Operasional | #57–58 | **Dipertahankan penuh** | |
| Orangtua — Saldo, Riwayat, Ganti PIN, Batasi/Blokir Jajan | #59–64 | **Dipertahankan penuh** | Endpoint dikonsumsi Portal Orangtua, bukan disalin ke sana |
| Laporan | #65–69 | **Dipertahankan penuh** | |
| Dashboard | #70–77 | **Dipertahankan penuh** | |

**Prioritas (MoSCoW):** belum ditandai per baris di draf yang dilampirkan — lihat Keputusan
Terbuka §5 poin 1, jangan diasumsikan sepihak.

## 5. Keputusan Terbuka & Hasil Keputusan (Final)

Keputusan telah disetujui developer pada 2026-08-18:

1. **Prioritas MoSCoW:** Seluruh 77 fitur disepakati diimplementasikan penuh.
2. **Ketergantungan Data Siswa & Pegawai:** Validasi `student_id` ke modul Akademik dan `employee_id` (kasir/pengelola) ke modul Kepegawaian dipanggil secara **in-process** langsung via service-layer yang sudah aktif.
3. **Skema Pembayaran Hak Vendor & Hak Kantin ke Keuangan:** Dicatat lokal terlebih dahulu di database Kantin (`canteen_fee_payments` & `vendor_fee_payments`), integrasi pencatatan jurnal ke modul Keuangan dihubungkan via webhook/service.
4. **Metode Pembayaran Top Up Saldo Siswa:** Menggunakan ENUM: `'cash'`, `'transfer'`, `'qris'`, `'other'`.
5. **Barcode vs QR Code:** Siswa diidentifikasi dengan string unik **QR Code**, sedangkan produk kemasan/fisik diidentifikasi dengan **Barcode**.
6. **Limit Jajan Harian:** Pengaturan limit jajan harian dikelola **terpusat oleh Admin Kantin** (lewat tabel `daily_spending_limits` per rombel atau satuan pendidikan).

## 6. Yang BUKAN Tanggung Jawab Kantin — Jangan Dikerjakan di Sini

- Data induk siswa, orangtua, rombel, tahun ajaran/semester → domain **Akademik**
- Data induk pegawai → domain **Kepegawaian**
- Akun login, role global, Satuan Pendidikan, Yayasan → domain **Core Service**
- Pembukuan/jurnal akuntansi resmi, RAPBS → domain **Keuangan** (Kantin hanya mengirim data hak
  kantin sebagai *sumber* pendapatan, bukan mengelola buku besar)

Kalau di tengah pengembangan Kantin muncul kebutuhan yang terasa seperti masuk ke salah satu
domain di atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Aplikasi yang Terhubung ke Kantin

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 5:
- Kantin **bergantung pada**: Core Service (auth/akun/role), Akademik (data siswa/rombel),
  Kepegawaian (nama pegawai jika perlu ditampilkan), Keuangan (opsional, integrasi jurnal — lihat
  Keputusan Terbuka).
- Kantin **dikonsumsi oleh**: Portal Orangtua (saldo, riwayat jajan, blokir/batasi), Keuangan
  (data hak kantin sebagai pendapatan), Pengelolaan (dashboard agregat).
- **Ketergantungan dua arah Kantin ↔ Portal Orangtua** (`ARSITEKTUR-SISTEM.md` §6): Kantin
  dibangun **duluan** sampai transaksi kasir jalan penuh tanpa Portal Orangtua; integrasi top-up
  online dari Portal Orangtua disambungkan setelah Portal Orangtua ada — endpoint sisi Kantin
  untuk fitur ini (§59–64 di Bagian 4) dibangun sebagai API biasa yang bisa dipanggil manual/lewat
  Postman dulu untuk testing, tidak perlu menunggu Portal Orangtua punya UI.

## 8. Konvensi Teknis

Ikuti `ARSITEKTUR-SISTEM.md` Bagian 4 sepenuhnya (format response, penamaan tabel/endpoint, auth
header, dst) — Kantin tidak menentukan konvensi sendiri.

Khusus Kantin: environment variable diawali `KANTIN_` (mis. `KANTIN_DB_HOST`, `KANTIN_DB_NAME`).

## 9. Dokumen Lain yang Terkait

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh, baca dulu untuk pertanyaan lintas modul.
- `erd-kantin.md` — ERD tabel Kantin.
- `api-contract-kantin.md` — kontrak endpoint REST API Kantin.
- `roles-kantin.md` — matriks role & permission Kantin (memakai role Core Service, bukan role
  baru).
- `panduan-pengembangan-kantin.md` — checklist tahap pengembangan + prompt Antigravity & query
  SQL siap pakai per tahap.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md` — pola format acuan (Core Service sudah selesai dibangun duluan).

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Developer mengonfirmasi: (1) pakai penuh 77 fitur draf sebagai basis, (2) fitur Role/User/Rombel/Murid (identitas) direvisi supaya patuh prinsip arsitektur global — tidak duplikasi data induk Core Service & Akademik. Tahap: belum mulai coding, mulai Tahap 1 (ERD & kontrak API). |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
