# rancangan-sarpras.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Sarpras.** File ini adalah sumber kebenaran
> untuk ruang lingkup dan keputusan arsitektur modul ini. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status & Log
> Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Mengikuti pola `rancangan-coreservice.md` (Core Service, sudah selesai dibangun, jadi acuan
> format untuk 13 modul lain — lihat `ARSITEKTUR-SISTEM.md` Bagian 8).

## 1. Apa Ini & Posisinya dalam Sistem Besar

Sarpras adalah modul ke-7 dari **Sistem Manajemen Sekolah Terintegrasi** (14 modul — lihat
`ARSITEKTUR-SISTEM.md` Bagian 2). Perannya:

- Pencatatan lokasi fisik satuan pendidikan (lahan, bangunan, ruangan) — data ini **dikonsumsi
  Akademik** untuk penentuan ruang rombel.
- Pencatatan inventaris aset tetap (barang) beserta kondisi dan riwayat mutasi lokasinya.
- Pengelolaan peminjaman ruang/fasilitas oleh pegawai, termasuk approval berjenjang.
- Pencatatan permintaan & tindak lanjut perbaikan (maintenance) aset/fasilitas.
- Pengelolaan supplier dan proses pengadaan barang (yang nilai transaksinya diteruskan ke
  Keuangan).
- Pencatatan bahan habis pakai (consumables) — stok masuk/keluar dan stock opname berkala.

Sarpras **bukan** tempat menyimpan data induk pegawai (lihat Bagian 6) — hanya mereferensikan
`employee_id`/`user_id` dari Kepegawaian/Core Service.

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (DB per modul, multi-satuan-pendidikan, JWT SSO, webhook, data induk
hanya di satu aplikasi pemilik) ada di **`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu dulu**,
tidak diulang di sini.

Yang spesifik untuk Sarpras:

- Sarpras adalah **pemilik data lokasi fisik** (lahan/bangunan/ruangan) dan **pemilik data
  inventaris aset & bahan habis pakai**. Modul lain tidak boleh menyimpan salinan data ini.
- **Akademik mengonsumsi `facility_rooms`** dari Sarpras (via service-layer in-process, lihat
  `ARSITEKTUR-SISTEM.md` Bagian 1.1) untuk field `room_id` pada penentuan ruang rombel — bukan
  Sarpras yang bergantung ke Akademik. Ini koreksi atas asumsi awal sebelum sesi ini dimulai
  (lihat Bagian 10 — Log Perubahan).
- **Keuangan mengonsumsi data pengadaan** (`procurements`) untuk diproses jadi transaksi
  pembayaran — Sarpras hanya menyimpan `finance_reference_id` (kolom ID biasa, bukan FK fisik)
  setelah Keuangan memproses.
- **Kepegawaian dikonsumsi Sarpras** untuk validasi `employee_id` (peminjam/pelapor) dan struktur
  jabatan (approval berjenjang) — lihat Bagian 5 poin 2 untuk detail yang belum final.
- Tidak ada ketergantungan dua arah yang perlu ditangani dengan mock/stub khusus (beda dari
  Core Service ↔ Akademik/Kepegawaian) — Sarpras bisa dibangun & berjalan sendiri lebih dulu,
  dengan `finance_reference_id` dan validasi `employee_id` sementara berupa data dummy sampai
  Keuangan/Kepegawaian tersedia untuk diuji terintegrasi.

## 3. Stack Teknis

Ikuti persis **`ARSITEKTUR-SISTEM.md` Bagian 4** (Backend Express.js modular monolith, Knex.js,
MariaDB 10.5, JWT dari Core Service, React Vite untuk frontend) — Sarpras **tidak membuat
keputusan stack sendiri**, karena sudah final dan ditetapkan Core Service sebagai modul pertama.

Khusus Sarpras: environment variable diawali `SARPRAS_` (mis. `SARPRAS_DB_HOST`,
`SARPRAS_DB_NAME`), mengikuti pola `ARSITEKTUR-SISTEM.md` Bagian 4.5.

## 4. Ruang Lingkup Fitur Sarpras (13 Fitur)

> Draf awal dari `ARSITEKTUR-SISTEM.md` Bagian 2 mencatat **9 fitur** untuk Sarpras (baris
> 137–145 dari daftar 202 fitur). Sesi ini menambah **4 fitur** (ditandai *(tambahan)*) atas
> permintaan eksplisit developer: hierarki lokasi fisik (prasyarat kolom `room_id` di Inventaris
> & Peminjaman) dan pencatatan bahan habis pakai. **Tandai untuk direview**, terutama kolom
> Prioritas fitur tambahan.

| Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|
| Lokasi & Denah | Manajemen Lokasi Fisik (Lahan → Bangunan → Ruangan) *(tambahan)* | Must | site: nama, alamat, luas_lahan, status_kepemilikan; bangunan: nama, fungsi, jumlah_lantai, kondisi; ruangan: kode_ruang, nama_ruang, jenis_ruang, kapasitas, kondisi | Admin Sarpras |
| Inventaris | Inventaris aset/barang | Must | kode_barang, nama, kategori, room_id, kondisi, nilai_perolehan | Admin Sarpras |
| Inventaris | QR code/barcode aset | Could | kode_barang, qr_code | Admin Sarpras |
| Peminjaman | Peminjaman ruang/fasilitas | Must | employee_id, room_id/nama_fasilitas_lain, tanggal, jam, keperluan, status | Pegawai, Admin Sarpras |
| Peminjaman | Jadwal pemakaian fasilitas | Should | room_id, tanggal, jam, status_terisi | Pegawai, Admin Sarpras |
| Peminjaman | Approval peminjaman berjenjang | Could | id_peminjaman, approver, level, status | Atasan |
| Pemeliharaan | Permintaan & perbaikan (maintenance) | Must | asset_id/room_id, laporan_kerusakan, status_perbaikan, biaya | Pegawai, Admin Sarpras |
| Pengadaan | Manajemen supplier/vendor | Should | nama_supplier, kontak, kategori_barang | Admin Sarpras |
| Pengadaan | Pengadaan barang | Should | id_permintaan, barang, jumlah, supplier, status, finance_reference_id | Admin Sarpras |
| Bahan Habis Pakai | Master bahan habis pakai *(tambahan)* | Must | kode, nama, satuan, kategori, stok_minimum, stok_saat_ini | Admin Sarpras |
| Bahan Habis Pakai | Mutasi stok masuk/keluar *(tambahan)* | Must | item, jenis_mutasi, jumlah, referensi, lokasi_tujuan, tanggal | Admin Sarpras |
| Bahan Habis Pakai | Stock opname *(tambahan)* | Should | tanggal_opname, pelaksana, stok_sistem, stok_fisik, selisih | Admin Sarpras |
| Laporan | Laporan kondisi & penyusutan aset | Could | periode, daftar_aset, nilai_susut | Admin Sarpras |

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD Detail

Belum diputuskan developer secara rinci, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Legalitas lahan.** Apakah `facility_sites` perlu field legal formal (nomor sertifikat, jenis
  hak atas tanah persis gaya Dapodik) atau cukup catatan bebas (`certificate_number` + `notes`
  sederhana seperti draf ERD Bagian 5 di `erd-sarpras.md`)?
- **Level approval berjenjang.** Berapa level, dan siapa "atasan" per level (ditentukan dari
  struktur jabatan Kepegawaian) — modul Kepegawaian belum tentu punya struktur jabatan yang
  cukup detail untuk ini. Sementara: 1 level fleksibel (`approval_level` bisa lebih dari 1 kalau
  nanti dibutuhkan), approver diisi manual per pengajuan, bukan otomatis dari struktur jabatan.
- **Kategori bahan habis pakai.** Kategori baku (ATK, kebersihan, dst) atau teks bebas? Sementara
  teks bebas (`category VARCHAR`), tanpa tabel master kategori terpisah.
- **Cakupan stock opname.** Satu sesi opname mencakup seluruh item bahan habis pakai satuan
  pendidikan sekaligus, atau bisa per lokasi/gudang tertentu? Sementara: per satuan pendidikan
  (tidak per lokasi), karena `consumable_items` belum punya kolom lokasi penyimpanan.
- **Fasilitas non-ruangan** (lapangan terbuka, halaman). Sementara dicatat sebagai
  `facility_rooms.room_type = 'lapangan'`/`'aula'` di bawah sebuah `facility_buildings` (bukan
  langsung di bawah `facility_sites`) supaya tetap satu hierarki — perlu dikonfirmasi apakah ini
  cukup atau perlu jalur tersendiri langsung di bawah lahan.

## 6. Yang BUKAN Tanggung Jawab Modul Ini — Jangan Dikerjakan di Sini

- Data induk pegawai (nama, jabatan, status kepegawaian) → domain **Kepegawaian**
- Struktur jabatan/organisasi lengkap → domain **Kepegawaian**
- Proses pembayaran & pembukuan pengadaan (jurnal, COA) → domain **Keuangan**, Sarpras hanya
  menyimpan status permintaan + `finance_reference_id`
- Data rombel, tahun ajaran, penentuan siswa per kelas → domain **Akademik** (Sarpras hanya
  menyediakan data `facility_rooms` yang dikonsumsi Akademik, tidak menyimpan data rombel itu
  sendiri)
- Dashboard agregat lintas aplikasi → domain **Pengelolaan** (Sarpras hanya jadi sumber data)

Kalau di tengah pengembangan muncul kebutuhan yang terasa masuk ke salah satu domain di atas,
berhenti dan konfirmasi ke developer.

## 7. Aplikasi yang Terhubung ke Sarpras

- **Bergantung pada:** Core Service (auth, satuan pendidikan), Kepegawaian (validasi
  `employee_id`, approver), Keuangan (proses pengadaan).
- **Dikonsumsi oleh:** Akademik (data `facility_rooms` untuk rombel), Pengelolaan (data aset &
  maintenance untuk dashboard agregat).

Matriks ketergantungan penuh 14 modul ada di `ARSITEKTUR-SISTEM.md` Bagian 5 — catatan: baris
Sarpras di matriks itu (Core Service, Kepegawaian, Keuangan) **konsisten** dengan keputusan
Bagian 2 di atas.

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, dst) ada di
`ARSITEKTUR-SISTEM.md` Bagian 4 — Sarpras **mengikuti**, bukan menentukan sendiri.

## 9. Dokumen Lain yang Terkait

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh, baca dulu kalau pertanyaan menyangkut
  modul lain.
- `erd-sarpras.md` — ERD 14 tabel Sarpras.
- `api-contract-sarpras.md` — kontrak endpoint REST API Sarpras.
- `roles-sarpras.md` — matriks role & permission Sarpras.
- `panduan-pengembangan-sarpras.md` — checklist tahap pengembangan + prompt Antigravity & query
  SQL siap pakai per tahap.
- `rancangan-coreservice.md`, `erd-coreservice.md`, dll — **contoh format** yang diikuti kelima
  dokumen Sarpras ini (Core Service dibangun duluan, jadi acuan pola).

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Koreksi ketergantungan: awalnya disebut Sarpras bergantung pada "coreservice, kepegawaian, akademik" — dikoreksi jadi **Core Service, Kepegawaian, Keuangan** (sesuai `ARSITEKTUR-SISTEM.md` Bagian 5), dengan catatan bahwa Akademik justru **mengonsumsi** data ruangan dari Sarpras, bukan sebaliknya. Ditambahkan 4 fitur di luar draf 202 fitur asli: Manajemen Lokasi Fisik (Lahan-Bangunan-Ruangan), Master Bahan Habis Pakai, Mutasi Stok, Stock Opname — atas permintaan eksplisit developer untuk mencatat hierarki lokasi gaya Dapodik dan pelacakan bahan habis pakai. Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
