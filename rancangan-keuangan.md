# rancangan-keuangan.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Keuangan.** File ini sumber kebenaran untuk
> ruang lingkup dan keputusan arsitektur modul Keuangan. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status & Log
> Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Disimpan flat di root proyek monorepo yang sama dengan dokumen Core Service, mengikuti pola
> `rancangan-<nama-modul>.md` — lihat `panduan-pengembangan-keuangan.md` untuk daftar lengkap
> dokumen terkait modul ini.

## 1. Apa Ini & Posisinya dalam Sistem Besar

Keuangan adalah salah satu dari 14 modul **Sistem Manajemen Sekolah Terintegrasi** (Core Service,
Website Utama, Akademik, Kepegawaian, **Keuangan**, Portal Orangtua, Sarpras, Kantin, Dapur,
Perpustakaan, CBE, Komunikasi & Notifikasi, Tahfidz & Al-Quran, Pengelolaan). Sesuai
`ARSITEKTUR-SISTEM.md` §7, modul ini dikerjakan di **Fase 4** — setelah Core Service, Kepegawaian,
dan Akademik selesai, karena Keuangan menggantungkan sebagian besar fiturnya pada data induk
siswa/kelas (Akademik) dan data payroll pegawai (Kepegawaian).

Keuangan **bukan** tempat menyimpan data induk siswa, orangtua, pegawai, atau tahun ajaran (lihat
Bagian 6). Perannya murni sebagai pusat pengelolaan uang sekolah:
- Anggaran (RAPBS) — perencanaan & realisasi
- Tagihan & pembayaran biaya pendidikan siswa
- Penerimaan non-SPP (hibah, sumbangan, dana BOS, dll)
- Pengeluaran operasional
- Pencairan gaji pegawai (disbursement — bukan perhitungan payroll)
- Pembukuan (COA, jurnal otomatis, buku besar, neraca) & laporan keuangan

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (DB per modul, multi-satuan-pendidikan, JWT SSO, webhook, data induk
hanya di satu modul pemilik, pemanggilan lintas modul in-process lewat service-layer bukan query
langsung) sudah final di **`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu dulu**, tidak diulang
di sini supaya tidak ada dua sumber kebenaran.

Yang spesifik untuk Keuangan saja:
- Keuangan adalah **satu-satunya pemilik data** anggaran (RAPBS), Chart of Account, jurnal, dan
  seluruh transaksi keuangan sekolah. Modul lain (Portal Orangtua, Sarpras, Komunikasi &
  Notifikasi, Pengelolaan) membaca data ini lewat service-layer Keuangan, tidak boleh menyimpan
  salinannya sendiri.
- Keuangan **mengonsumsi** data dari Core Service (`satuan_pendidikan_id`, tahun ajaran — lihat
  catatan Keputusan Terbuka soal kepemilikan tahun ajaran di Bagian 5), Akademik (siswa, kelas,
  tingkat), dan Kepegawaian (data payroll untuk pencairan gaji).
- Keuangan juga berelasi dengan Website Utama (rekonsiliasi pembayaran PPDB, fitur #108) dan
  Kantin (rekonsiliasi transaksi kantin, fitur #108) — lihat catatan ketergantungan dua arah di
  Bagian 7.
- Keuangan **menerbitkan webhook** untuk event yang relevan bagi modul lain (mis. tagihan lunas,
  perubahan status RAPBS) mengikuti format standar `ARSITEKTUR-SISTEM.md` §4.3, dan **subscribe**
  ke webhook Core Service (perubahan satuan pendidikan) serta Akademik/Kepegawaian sesuai
  kebutuhan.

## 3. Stack Teknis

Mengikuti persis konvensi global di `ARSITEKTUR-SISTEM.md` Bagian 4.1 — **tidak membuat keputusan
stack sendiri**:

| Komponen | Pilihan | Catatan |
|---|---|---|
| Backend | Node.js + Express.js, modul di `apps/api-backend/src/modules/keuangan/` | Satu proses backend bersama (modular monolith), bukan proses terpisah |
| Query builder / migration | Knex.js | Connection pool sendiri untuk database `keuangan`, dikonfigurasi di proses `api-backend` yang sama |
| Auth | JWT (`jsonwebtoken`) untuk verifikasi — Keuangan **tidak** menerbitkan token sendiri, hanya memverifikasi token yang diterbitkan Core Service | `bcrypt` tidak relevan di Keuangan karena tidak ada tabel password lokal |
| Database | MariaDB 10.5, database `keuangan` terpisah dari `core`, `akademik`, `kepegawaian`, dst | Satu database per modul, sesuai prinsip global |
| Frontend | React (Vite), route `/keuangan/*` di dalam `apps/core-portal/` yang sama | Pakai ulang `shared/` (Layout, ProtectedRoute, AuthContext, api service) dari Core Service |

## 4. Ruang Lingkup Fitur Keuangan (35 Fitur, dari `ARSITEKTUR-SISTEM.md` §2 & PRD)

> Prioritas MoSCoW di bawah diambil langsung dari daftar fitur PRD yang sudah Anda lampirkan
> (bukan draf yang perlu direview ulang) — tandai ke saya kalau ada yang ingin diubah.

| # | Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|---|
| 1 | Data Master | CRUD Jenis Kas (tunai/bank) | Must | nama_kas, jenis, nomor_rekening, nama_bank, saldo_awal, status_aktif | Admin Keuangan |
| 2 | Data Master | Saldo awal kas per tahun ajaran | Must | jenis_kas_id, tahun_ajaran_id, saldo_awal | Admin Keuangan |
| 3 | Data Master | Chart of Account (COA) hierarkis | Must | kode_akun, nama_akun, kelompok, akun_induk, level, status_aktif | Admin Keuangan |
| 4 | Data Master | Mapping akun transaksi | Must | kode_transaksi, jenis_transaksi, akun_debit, akun_kredit | Admin Keuangan |
| 5 | Data Master | Jenis Biaya Pendidikan | Must | nama_biaya, pola_tagih, kelompok_biaya_id, status_aktif | Admin Keuangan |
| 6 | Data Master | Kelompok Biaya & Nominal Biaya Acuan | Must | kelompok_biaya, jenis_biaya_id, satuan_pendidikan_id, tingkat_id, nominal_acuan | Admin Keuangan |
| 7 | Data Master | Jenis Pengeluaran & Jenis Pemasukan Khusus | Should | nama_jenis, tipe, akun_terkait | Admin Keuangan |
| 8 | Data Master | Program Kegiatan & Katalog Item | Should | nama_program, tahun_ajaran_id, nama_item, satuan, harga_acuan | Admin Keuangan |
| 9 | Data Master | Penetapan biaya individual & beasiswa/keringanan | Should | id_siswa, jenis_biaya_id, nominal_override, jenis_keringanan, persentase/nominal, alasan, status | Admin Keuangan |
| 10 | Anggaran (RAPBS) | Penyusunan RAPBS | Must | satuan_pendidikan_id, tahun_ajaran_id, versi, status, rencana_pemasukan, rencana_pengeluaran | Admin Keuangan, Kepala Sekolah |
| 11 | Anggaran (RAPBS) | Publish/terbit & revisi RAPBS | Must | rapbs_id, tanggal_terbit, alasan_revisi | Kepala Sekolah, Admin Keuangan |
| 12 | Anggaran (RAPBS) | Realisasi vs rencana anggaran (real-time) | Must | rapbs_id, program_kegiatan_id, rencana, realisasi, persentase_serapan | Admin Keuangan, Kepala Sekolah |
| 13 | Tagihan | Generate tagihan massal | Must | jenis_biaya_id, periode, target, daftar_siswa | Admin Keuangan |
| 14 | Tagihan | Daftar & filter tagihan | Must | id_tagihan, id_siswa, jenis_biaya, jumlah, jatuh_tempo, status | Admin Keuangan |
| 15 | Tagihan | Batalkan tagihan | Should | id_tagihan, alasan_batal, tanggal_batal | Admin Keuangan |
| 16 | Tagihan | Reminder tagihan otomatis | Should | id_tagihan, tanggal_kirim, kanal | Sistem |
| 17 | Pembayaran | Catat pembayaran tagihan | Must | id_tagihan, tanggal_bayar, nominal, metode, jenis_kas_id, keterangan | Admin Keuangan, Orangtua |
| 18 | Pembayaran | Edit/koreksi pembayaran | Should | id_pembayaran, data_lama, data_baru, alasan_koreksi | Admin Keuangan |
| 19 | Pembayaran | Cetak kwitansi pembayaran | Must | id_pembayaran, nomor_kwitansi, terbilang | Admin Keuangan, Orangtua |
| 20 | Pembayaran | Integrasi payment gateway | Must | channel_pembayaran, referensi_transaksi, status | Sistem |
| 21 | Pembayaran | Rekonsiliasi pembayaran PPDB & kantin | Should | referensi_transaksi, sumber, jumlah | Admin Keuangan |
| 22 | Penerimaan Lain | CRUD penerimaan non-SPP | Must | jenis_pemasukan_khusus_id, satuan_pendidikan_id, tahun_ajaran_id, nominal, tanggal, jenis_kas_id, keterangan | Admin Keuangan |
| 23 | Pengeluaran | Pencatatan realisasi pengeluaran | Must | nama_item, satuan, harga_satuan, jumlah, total, vendor, tanggal, no_bukti, rencana_pengeluaran_id, keterangan | Admin Keuangan |
| 24 | Pengeluaran | Edit & hapus pengeluaran | Should | id_pengeluaran, data_lama, data_baru, alasan | Admin Keuangan |
| 25 | Penggajian | Penggajian pegawai (disbursement) | Must | id_pegawai, jumlah_gaji, tanggal_bayar, status | Admin Keuangan |
| 26 | Pembukuan | Jurnal otomatis | Must | nomor_jurnal, tanggal, akun_debit, akun_kredit, jumlah, keterangan, sumber_transaksi | Admin Keuangan |
| 27 | Pembukuan | Tabungan siswa & pegawai | Should | id_siswa/pegawai, saldo, riwayat_transaksi | Admin Keuangan, Orangtua, Pegawai |
| 28 | Pembukuan | Tutup buku tahunan | Should | tahun_buku, status | Admin Keuangan |
| 29 | Pembukuan | Audit trail transaksi keuangan | Should | user, aksi, waktu, data_transaksi | Admin Keuangan |
| 30 | Laporan | Laporan Realisasi RAPBS | Must | periode, rapbs_id, rencana, realisasi, selisih, persentase_serapan | Admin Keuangan, Kepala Sekolah |
| 31 | Laporan | Buku Besar & Neraca Saldo | Must | periode, kode_akun, saldo_awal, mutasi_debit, mutasi_kredit, saldo_akhir | Admin Keuangan |
| 32 | Laporan | Surplus/Defisit & Arus Kas | Must | periode, total_pendapatan, total_beban, surplus/defisit, kas_masuk, kas_keluar | Admin Keuangan, Kepala Sekolah |
| 33 | Laporan | Neraca (posisi keuangan) | Must | periode, total_aset, total_kewajiban, total_ekuitas | Admin Keuangan, Kepala Sekolah |
| 34 | Dashboard | Dashboard Keuangan | Must | saldo_per_kas, status_tagihan, grafik_penerimaan_bulanan, grafik_pengeluaran_bulanan, persentase_realisasi_rapbs | Admin Keuangan, Kepala Sekolah, Yayasan |
| 35 | Integrasi | Endpoint parent-facing (tagihan & pembayaran) | Must | - | Sistem |

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Kepemilikan `tahun_ajaran_id`.** Beberapa fitur Keuangan (#2, #8, #22) merujuk
  `tahun_ajaran_id`, padahal tahun ajaran adalah data induk Akademik (`ARSITEKTUR-SISTEM.md` §3
  poin 5). Perlu dikonfirmasi: Keuangan menyimpan kolom `academic_year_id` sebagai referensi ID
  longgar ke Akademik (tanpa FK fisik, sesuai prinsip global), atau Keuangan punya konsep
  "tahun buku" sendiri yang independen dari tahun ajaran Akademik?
- **Alur approval beasiswa/keringanan biaya (fitur #9).** PRD hanya menyebut kolom `status` untuk
  pengajuan & persetujuan, tanpa merinci siapa yang menyetujui (Admin Keuangan sendiri? Kepala
  Sekolah? berjenjang?) dan apakah ada batas maksimal persentase/nominal keringanan.
  Perlu dikonfirmasi sebelum ERD status/workflow-nya difinalkan.
- **Relasi RAPBS dengan RKS (Rencana Kerja Sekolah) milik modul Pengelolaan (fitur #10).** PRD
  menyebut RAPBS bersumber juga dari "Pengelolaan (RKS)", tapi modul Pengelolaan baru dikerjakan
  di Fase 7 (jauh setelah Keuangan di Fase 4). Perlu diputuskan: RAPBS Keuangan dibangun dulu
  berdiri sendiri (tanpa ketergantungan RKS) dan disambungkan belakangan begitu Pengelolaan ada
  (pola mock/stub, `ARSITEKTUR-SISTEM.md` §6), atau field referensi RKS cukup disiapkan sebagai
  kolom ID nullable dari awal?
- **Penyedia payment gateway (fitur #20).** PRD tidak menyebut provider spesifik (Midtrans,
  Xendit, dll). Perlu dikonfirmasi sebelum desain tabel `payment_gateway_transactions` dan
  kontrak callback/webhook-nya difinalkan, karena tiap provider punya skema payload beda.
- **Rekonsiliasi dengan Kantin (fitur #21).** Modul Kantin baru dikerjakan di Fase 5 (setelah
  Keuangan). Perlu dikonfirmasi: fitur rekonsiliasi Kantin dibangun sebagai kerangka kosong dulu
  (tabel & endpoint siap, tapi belum ada data nyata untuk disambungkan) sesuai pola mock/stub,
  sedangkan rekonsiliasi PPDB (Website Utama, sudah ada di Fase 3) bisa langsung disambungkan
  sungguhan sejak awal.
- **Nomor kwitansi & nomor jurnal (fitur #19, #26).** PRD belum merinci format penomoran
  otomatis (mis. `KW/2026/08/00001`). Perlu konfirmasi format yang diinginkan, atau dibiarkan
  auto-increment polos dulu dan diformat ulang belakangan.
- **Cakupan "Audit trail transaksi keuangan" (fitur #29) vs `activity_logs` Core Service.** Core
  Service sudah punya tabel `activity_logs` gabungan (termasuk `log_type = 'admin_action'` untuk
  aktivitas lintas aplikasi). Perlu dikonfirmasi: fitur #29 ini jadi tabel log lokal khusus
  Keuangan (lebih detail untuk transaksi finansial, mis. `data_before`/`data_after` per
  transaksi) yang **juga** mengirim ringkasannya ke `activity_logs` Core lewat webhook/API
  seperti pola 13 aplikasi satelit lain, atau cukup salah satu saja?

## 6. Yang BUKAN Tanggung Jawab Modul Keuangan — Jangan Dikerjakan di Sini

- Data induk siswa & orangtua → domain **Akademik**
- Data induk pegawai → domain **Kepegawaian**
- Tahun ajaran, semester, rombel, tingkat, angkatan → domain **Akademik** (lihat catatan Bagian 5
  soal referensi `tahun_ajaran_id`)
- Perhitungan komponen gaji (potongan, tunjangan, PPh, dll) → domain **Kepegawaian** — Keuangan
  hanya mengeksekusi **pencairan** (disbursement) dari angka yang sudah final dari Kepegawaian
- Transaksi kasir kantin & saldo cashless siswa → domain **Kantin** — Keuangan hanya
  merekonsiliasi
- Pendaftaran & alur PPDB → domain **Website Utama** — Keuangan hanya merekonsiliasi pembayarannya
- RKS/RIPS, Program Kerja, evaluasi kinerja → domain **Pengelolaan**

Kalau di tengah pengembangan Keuangan muncul kebutuhan yang terasa seperti masuk ke salah satu
domain di atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Aplikasi yang Terhubung ke Keuangan

Berdasarkan `ARSITEKTUR-SISTEM.md` §5:

- **Keuangan bergantung pada:** Core Service (satuan pendidikan, auth), Akademik (siswa, kelas,
  tingkat, tahun ajaran), Kepegawaian (data payroll), Website Utama (data PPDB untuk
  rekonsiliasi), Kantin (data transaksi untuk rekonsiliasi).
- **Yang bergantung pada Keuangan:** Website Utama, Portal Orangtua, Sarpras, Kantin, Dapur
  (opsional), Komunikasi & Notifikasi, Pengelolaan.

Karena Keuangan (Fase 4) dibangun **sebelum** Kantin (Fase 5) dan Pengelolaan (Fase 7), dua
ketergantungan berikut perlu ditangani dengan pola mock/stub (`ARSITEKTUR-SISTEM.md` §6) supaya
tidak saling menunggu:
- **Keuangan ↔ Kantin**: Keuangan siapkan endpoint & tabel rekonsiliasi kosong dulu, sambungkan
  data nyata setelah Kantin selesai.
- **Keuangan ↔ Pengelolaan**: field referensi RKS di RAPBS disiapkan sebagai kolom ID nullable
  dulu (lihat Bagian 5), diisi sungguhan setelah Pengelolaan ada.

Rekonsiliasi dengan **Website Utama** (PPDB) tidak perlu mock karena Website Utama sudah selesai
lebih dulu (Fase 3).

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, penamaan
kolom database, dst) ada di `ARSITEKTUR-SISTEM.md` Bagian 4 — Keuangan **mengikuti**, bukan
menentukan sendiri. Kalau butuh mengubah salah satu konvensi itu, ubah di `ARSITEKTUR-SISTEM.md`,
bukan diam-diam beda sendiri di Keuangan.

Khusus Keuangan: environment variable diawali `KEUANGAN_` (mis. `KEUANGAN_DB_HOST`,
`KEUANGAN_DB_NAME`), sesuai `ARSITEKTUR-SISTEM.md` §4.5.

## 9. Dokumen Lain yang Terkait (baca kalau relevan dengan tugas sesi ini)

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut modul lain, bukan cuma Keuangan.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md` — pola format acuan (Core Service sudah selesai duluan).
- `erd-keuangan.md` — ERD tabel Keuangan.
- `api-contract-keuangan.md` — kontrak endpoint REST API Keuangan.
- `roles-keuangan.md` — matriks role & permission Keuangan.
- `panduan-pengembangan-keuangan.md` — checklist tahap pengembangan + prompt Antigravity & query
  SQL siap pakai per tahap.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar fitur lengkap 202 baris; sheet
  "Daftar Fitur" filter `Aplikasi = Keuangan` untuk 35 fitur di atas.

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Dokumen dibuat. Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). 35 fitur diambil dari daftar PRD yang dilampirkan developer (baris 88–122), disusun ulang jadi tabel ruang lingkup mengikuti pola `rancangan-coreservice.md` §4. 7 poin Keputusan Terbuka dicatat, belum ada yang diputuskan final. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
