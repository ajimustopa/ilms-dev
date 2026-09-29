Status: perlu-revisi
Diperbarui: 2026-08-24

# rancangan-perpustakaan.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Perpustakaan.** File ini adalah sumber
> kebenaran untuk ruang lingkup dan keputusan arsitektur modul ini. Kalau ada instruksi di suatu
> sesi yang tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum
> melanjutkan** — jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian
> **"Status & Log Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Dibuat mengikuti pola `rancangan-coreservice.md` (Core Service sudah selesai dibangun duluan,
> jadi acuan format untuk 13 modul lain, termasuk modul ini).

## 1. Apa Ini & Posisinya dalam Sistem Besar

Perpustakaan adalah salah satu dari 14 modul **Sistem Manajemen Sekolah Terintegrasi** (Core
Service, Website Utama, Akademik, Kepegawaian, Keuangan, Portal Orangtua, Sarpras, Kantin, Dapur,
**Perpustakaan**, Ujian & Bank Soal/CBE, Komunikasi & Notifikasi, Tahfidz & Al-Quran,
Pengelolaan). Sesuai `ARSITEKTUR-SISTEM.md` Bagian 7 (Urutan Pengembangan), Perpustakaan masuk
**Fase 6** — dependency ringan, tidak jadi sumber data induk untuk modul lain, dan bisa dikerjakan
paralel dengan Sarpras/Dapur/CBE/Tahfidz/Komunikasi.

Perannya:
- Mengelola katalog buku & bahan pustaka non-buku milik perpustakaan sekolah
- Mengelola siklus sirkulasi: peminjaman, pengembalian, denda, reservasi, buku hilang/rusak
- Menyediakan akses pencarian katalog publik (OPAC)
- Menyediakan laporan sirkulasi & statistik pemanfaatan
- Expose data riwayat baca anak ke Portal Orangtua lewat endpoint parent-facing

Perpustakaan **bukan** pemilik data induk anggota — anggota perpustakaan (siswa/pegawai) adalah
representasi lokal dari data yang sudah ada di Akademik (siswa) dan Kepegawaian (pegawai), sesuai
prinsip arsitektur global "data induk hanya hidup di satu aplikasi pemilik"
(`ARSITEKTUR-SISTEM.md` Bagian 3 poin 5).

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (satu database per modul, tidak ada JOIN/FK fisik lintas database,
multi-satuan-pendidikan, JWT SSO, webhook, data induk hanya di satu aplikasi pemilik) ada di
**`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu dulu**, tidak diulang di sini supaya tidak ada
dua sumber kebenaran.

Yang spesifik untuk Perpustakaan:
- Perpustakaan **mengonsumsi** data dari tiga modul lain secara in-process (satu proses
  `api-backend`, lihat `ARSITEKTUR-SISTEM.md` Bagian 1.1):
  - **Core Service** — verifikasi JWT (siapa yang login), data `users`/`school_units` untuk
    konteks pustakawan & satuan pendidikan aktif.
  - **Akademik** — validasi & ambil profil ringkas siswa saat siswa didaftarkan sebagai anggota
    perpustakaan (`ref_type='student'`).
  - **Kepegawaian** — validasi & ambil profil ringkas pegawai saat pegawai didaftarkan sebagai
    anggota perpustakaan (`ref_type='employee'`).
- Pola pemanggilan mengikuti contoh yang sudah ada di modul Sarpras
  (`apps/api-backend/src/modules/sarpras/utils/crossModuleHelper.js`) — panggil langsung instance
  Knex modul lain (`src/config/db/akademik.js`, `src/config/db/kepegawaian.js`), **bukan** query
  ke tabel modul lain lewat JOIN, dan selalu punya fallback graceful kalau modul sumber belum
  terhubung/belum ada datanya (jangan sampai fitur Perpustakaan gagal total hanya karena
  Akademik/Kepegawaian sedang bermasalah).
- Perpustakaan **tidak mempublish webhook signifikan** ke modul lain kecuali untuk event yang
  dikonsumsi Portal Orangtua (lihat Bagian 5, keputusan terbuka soal mekanisme ini) dan opsional
  ke Komunikasi & Notifikasi untuk pengingat jatuh tempo/denda (fitur #10).
- Perpustakaan **tidak punya ketergantungan dua arah** dengan Akademik/Kepegawaian seperti Core
  Service — arah ketergantungannya searah (Perpustakaan → Akademik/Kepegawaian), jadi tidak perlu
  pola mock/stub timbal balik seperti di `ARSITEKTUR-SISTEM.md` Bagian 6. Yang perlu di-mock hanya
  sisi Perpustakaan saat Akademik/Kepegawaian belum tersedia di lokal (lihat
  `panduan-pengembangan-perpustakaan.md` Tahap 3).

## 3. Stack Teknis

Mengikuti persis `ARSITEKTUR-SISTEM.md` Bagian 4 (Konvensi Teknis Global) — **tidak membuat
keputusan stack sendiri**:

| Komponen | Pilihan | Rujukan |
|---|---|---|
| Backend | Node.js + Express.js, modul di `apps/api-backend/src/modules/perpustakaan/` | §4.1 |
| Query builder / migration | Knex.js, instance koneksi sendiri (`src/config/db/perpustakaan.js`) | §4.1 |
| Database | MariaDB 10.5, InnoDB, `utf8mb4`, database lokal `perpustakaan_local` | §4.1 |
| Auth | Verifikasi JWT terbitan Core Service (`CORE_JWT_SECRET`, import langsung in-process) | §4.1 |
| Frontend | React (Vite), route `/perpustakaan/*` di dalam `apps/core-portal/`, halaman login sendiri | §4.2 |
| Validasi request | `zod`/`joi` (ikut standar yang dipakai modul lain yang sudah jadi — cek `sarpras`/`kantin` sebagai contoh terbaru) | §4.1 |

## 4. Ruang Lingkup Fitur Perpustakaan (14 Fitur)

> **Dasar:** 9 fitur asli dari `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` (baris
> 163–171) + 5 fitur tambahan hasil penyempurnaan (disetujui developer) yang **belum** ada di PRD
> asli — lihat `ARSITEKTUR-SISTEM.md` Bagian 9 (Status & Log Perubahan) untuk catatan sinkronisasi
> total fitur sistem (202 → 207).

| No PRD | Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|---|
| 163 | Katalog | Katalog buku (CRUD koleksi) | Must | title, author, publisher, publish_year, isbn, category_id, material_type, total_copies, shelf_location, cover_image | Pustakawan |
| 164 | Katalog | Referensi & kategori/klasifikasi buku | Should | category_name, category_code, description | Pustakawan |
| 172 | Katalog | Manajemen bahan pustaka non-buku | Could | material_type (journal/ebook/magazine/cd/other), title, format, stock | Pustakawan |
| 165 | Anggota | Data anggota perpustakaan | Must | ref_type (student/employee), ref_id, member_card_number, card_valid_until, max_loan_limit, status | Pustakawan |
| 174 | Anggota | Riwayat peminjaman anggota | Should | member_id, daftar_riwayat_pinjaman | Pustakawan, Anggota |
| 166 | Sirkulasi | Peminjaman buku | Must | book_copy_id, member_id, borrowed_at, due_at, borrowed_by | Pustakawan, Anggota |
| 167 | Sirkulasi | Pengembalian & denda | Must | loan_id, returned_at, fine_amount, fine_payment_status, returned_to | Pustakawan |
| 168 | Sirkulasi | Reservasi/booking buku | Could | book_id, member_id, reservation_status, reserved_at, expires_at | Anggota, Pustakawan |
| 173 | Sirkulasi | Buku hilang/rusak | Should | book_copy_id, loan_id, condition_status, replacement_fee, resolution_status | Pustakawan |
| 175 | Notifikasi | Pengingat jatuh tempo & denda | Should | loan_id, reminder_type, channel, sent_at, status | Sistem |
| 169 | OPAC | OPAC (Online Public Access Catalog) | **Must** | kata_kunci_pencarian, filter_kategori, filter_ketersediaan | Publik, Anggota |
| 170 | Laporan | Laporan sirkulasi & buku terpopuler | Should | periode, jumlah_pinjam, top_books | Pustakawan |
| 176 | Laporan | Statistik pemanfaatan perpustakaan | Could | periode, jumlah_kunjungan, jumlah_pinjam | Pustakawan, Pengelolaan |
| 171 | Integrasi | Endpoint parent-facing (riwayat baca anak) | Could | student_ref_id, daftar_riwayat_pinjaman | Sistem (dipanggil Portal Orangtua) |

Catatan penting soal fitur "Data anggota perpustakaan": akun/status keanggotaan **bukan** akun
login. Anggota perpustakaan adalah entitas lokal (tabel `library_members`) yang menunjuk balik ke
`students`/`employees` lewat `ref_type` + `ref_id` (tanpa FK fisik, sesuai prinsip global), dibuat
manual oleh Pustakawan (bukan otomatis lewat webhook seperti akun Core Service) — lihat keputusan
terbuka #2 di Bagian 5 soal apakah ini perlu diotomatisasi nanti.

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Cakupan koleksi per Satuan Pendidikan.** Apakah katalog buku (`books`) dipisah ketat per
  `satuan_pendidikan_id` (tiap sekolah punya koleksi & rak sendiri, sesuai prinsip global §3 poin
  2), atau ada opsi koleksi bersama tingkat Yayasan yang bisa diakses lintas sekolah (mis. satu
  perpustakaan pusat)? Ini menentukan apakah `satuan_pendidikan_id` di tabel `books`
  wajib/nullable.
- **Pembuatan anggota perpustakaan: manual vs otomatis.** Saat ini diasumsikan Pustakawan
  mendaftarkan anggota secara manual dengan memvalidasi siswa/pegawai lewat pemanggilan
  in-process ke Akademik/Kepegawaian. Perlu dikonfirmasi apakah nanti perlu diotomatisasi (mis.
  semua siswa aktif otomatis jadi anggota) — kalau ya, perlu keputusan mekanisme
  (webhook dari Akademik saat siswa baru terdaftar, atau job sinkronisasi berkala?).
- **Mekanisme pencatatan kunjungan** untuk fitur #176 (Statistik pemanfaatan). PRD tidak
  menjelaskan apakah kunjungan dicatat lewat check-in manual di meja pustakawan, kartu/barcode
  scan, atau cukup diturunkan dari data peminjaman (tanpa pencatatan kunjungan baca-di-tempat).
  Tabel `library_visit_logs` di `erd-perpustakaan.md` bersifat **tentatif** sampai ini
  diputuskan — kalau ditiadakan, fitur #176 cukup pakai data `book_loans`.
- **Kanal pengiriman notifikasi (fitur #175).** Apakah Perpustakaan mengirim notifikasi sendiri
  atau selalu lewat modul **Komunikasi & Notifikasi** (publish event, modul itu yang kirim
  WA/Email/SMS)? Draf ERD saat ini mengasumsikan Perpustakaan hanya mencatat *permintaan*
  pengiriman (`loan_reminders`), pengiriman sungguhan didelegasikan — perlu dikonfirmasi begitu
  modul Komunikasi & Notifikasi mulai dibangun.
- **Format & pemicu endpoint parent-facing (fitur #171).** Perlu dikonfirmasi apakah dipanggil
  langsung (in-process, karena satu proses backend) oleh modul Portal Orangtua tiap kali halaman
  dibuka, atau di-cache/di-refresh berkala. Draf `api-contract-perpustakaan.md` mengasumsikan
  dipanggil langsung (in-process call biasa, bukan endpoint HTTP terpisah — tapi kontraknya tetap
  didokumentasikan seolah-olah HTTP, sesuai `ARSITEKTUR-SISTEM.md` §1.1).
- **Perhitungan denda.** PRD tidak menyebutkan aturan tarif denda (per hari? flat? beda per
  kategori buku?). Draf ERD menyediakan kolom `fine_amount` sebagai angka final tanpa tabel
  aturan tarif — kalau perlu tabel `fine_rules` terpisah (adjustable oleh Pustakawan), ini masih
  terbuka untuk didiskusikan.

## 6. Yang BUKAN Tanggung Jawab Modul Ini — Jangan Dikerjakan di Sini

- Data induk siswa & orangtua → domain **Akademik**
- Data induk pegawai → domain **Kepegawaian**
- Akun login, JWT, role/permission dasar → domain **Core Service**
- Pencatatan penerimaan pembayaran denda sebagai transaksi keuangan resmi (jurnal/pembukuan) →
  domain **Keuangan** (Perpustakaan hanya mencatat *jumlah* denda & status bayar/lunas, bukan
  jurnal akuntansinya)
- Pengiriman notifikasi WA/Email/SMS sungguhan → domain **Komunikasi & Notifikasi**
  (Perpustakaan hanya mencatat permintaan pengiriman)
- Tampilan riwayat baca anak di sisi Portal Orangtua (UI-nya) → domain **Portal Orangtua**,
  Perpustakaan hanya menyediakan datanya

Kalau di tengah pengembangan muncul kebutuhan yang terasa seperti masuk ke salah satu domain di
atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Aplikasi yang Terhubung ke Modul Ini

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 5 (Matriks Ketergantungan):

- **Perpustakaan bergantung pada:** Core Service (auth, wajib untuk semua modul), Akademik (data
  siswa), Kepegawaian (data pegawai)
- **Modul yang bergantung pada Perpustakaan:** Portal Orangtua (riwayat baca anak, fitur #171),
  Pengelolaan (dashboard agregat, opsional lewat fitur #176)

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, environment
variable, dst) ada di `ARSITEKTUR-SISTEM.md` Bagian 4 — Perpustakaan **mengikuti**, bukan
menentukan sendiri.

Khusus Perpustakaan: environment variable diawali `PERPUSTAKAAN_` (mis.
`PERPUSTAKAAN_DB_HOST`, `PERPUSTAKAAN_DB_NAME`), endpoint API diawali `/api/v1/perpustakaan/...`,
route frontend diawali `/perpustakaan/...`.

## 9. Dokumen Lain yang Terkait

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. Baca ini lebih dulu untuk pertanyaan yang
  jawabannya menyangkut modul lain.
- `erd-perpustakaan.md` — ERD tabel database Perpustakaan.
- `api-contract-perpustakaan.md` — kontrak endpoint REST API lengkap Perpustakaan.
- `roles-perpustakaan.md` — matriks role & permission Perpustakaan.
- `panduan-pengembangan-perpustakaan.md` — checklist tahap pengembangan + prompt Antigravity &
  query SQL siap pakai per tahap.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md` — pola/contoh format yang diikuti dokumen-dokumen modul ini.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — sheet "Daftar Fitur" filter
  `Aplikasi = Perpustakaan` untuk 9 baris fitur asli (163–171); 5 fitur tambahan (172–176) perlu
  ditambahkan ke sheet ini secara manual oleh developer (Antigravity tidak mengedit file `.xlsx`
  di sesi ini).

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Ruang lingkup ditetapkan 14 fitur (9 asli + 5 usulan pengembangan disetujui developer). OPAC dinaikkan prioritas dari Should → Must. Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). Database `perpustakaan_local` belum dibuat. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
