# rancangan-dapur.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Dapur.** File ini sumber kebenaran untuk
> ruang lingkup dan keputusan arsitektur modul Dapur. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status & Log
> Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Ditulis mengikuti pola persis `rancangan-coreservice.md` (Core Service = modul acuan yang sudah
> selesai duluan).

## 1. Apa Ini & Posisinya dalam Sistem Besar

Dapur adalah modul operasional dapur sekolah dalam **Sistem Manajemen Sekolah Terintegrasi**
(14 modul — lihat `ARSITEKTUR-SISTEM.md` Bagian 2). Cakupannya jauh lebih luas dari catatan lama
di `ARSITEKTUR-SISTEM.md` (8 fitur) — **lihat Bagian 5 poin 1** soal koreksi ini.

Perannya mencakup seluruh rantai proses dapur sekolah: perencanaan menu & resep, perhitungan
kebutuhan bahan, anggaran & biaya, pengadaan/belanja, penerimaan bahan, persediaan/gudang,
produksi, distribusi & absensi makan, kontrol kualitas & keamanan pangan, pencatatan waste, serta
analitik/laporan lintas seluruh proses tersebut.

Dapur **bukan** tempat menyimpan data induk siswa/pegawai/keuangan — modul ini **mengonsumsi**
data itu dari modul pemiliknya (lihat Bagian 6).

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (DB per modul, multi-satuan-pendidikan, JWT SSO, webhook, data induk
hanya di satu aplikasi pemilik) ada di **`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu dulu**,
tidak diulang di sini.

Yang spesifik untuk Dapur:
- Dapur **mengonsumsi** JWT yang diterbitkan Core Service — tidak menerbitkan token sendiri.
- Dapur **mengonsumsi** data Satuan Pendidikan/Yayasan dari Core Service untuk kolom
  `satuan_pendidikan_id` di hampir semua tabel transaksional (dapur bisa beroperasi per satuan
  pendidikan, mis. dapur terpisah per unit sekolah — **lihat Keputusan Terbuka Bagian 5 poin 2**
  soal apakah dapur benar-benar per satuan pendidikan atau terpusat satu dapur untuk seluruh
  yayasan).
- Dapur **mengonsumsi** data pegawai (PIC/petugas: Kepala Dapur, Petugas Gudang, Petugas
  Distribusi, QC Dapur, Admin Dapur) dari Kepegawaian — tidak menyimpan data induk pegawai
  sendiri, hanya `ref_id` ke Kepegawaian.
- Dapur **mengonsumsi** data santri/kelompok santri dari Akademik untuk kebutuhan forecast porsi,
  distribusi, dan absensi makan — tidak menyimpan data induk santri sendiri, hanya `ref_id` ke
  Akademik (lihat `kitchen_student_groups` di `erd-dapur.md` sebagai tabel cache/referensi).
- Dapur **opsional** terhubung ke Keuangan untuk anggaran/RAPBS (lihat Bagian 5 poin 3 — status
  masih opsional atau wajib perlu dikonfirmasi karena modul Dapur di sini menyertakan fitur
  Anggaran & Biaya cukup detail).
- Tidak ada ketergantungan dua arah yang diketahui antara Dapur dan modul lain (Dapur murni
  konsumen data Core/Kepegawaian/Akademik/Keuangan, tidak ada modul lain yang butuh data Dapur
  untuk provisioning/proses inti mereka) — kalau nanti ditemukan, catat di sini dan tangani sesuai
  pola `ARSITEKTUR-SISTEM.md` Bagian 6.

## 3. Stack Teknis

Mengikuti persis `ARSITEKTUR-SISTEM.md` Bagian 4 — **tidak membuat keputusan stack sendiri di
sini**:

| Komponen | Pilihan |
|---|---|
| Backend | Node.js + Express.js — modul folder `apps/api-backend/src/modules/dapur/` di monorepo yang sama |
| Query builder / migration | Knex.js |
| Database | MariaDB 10.5, InnoDB, `utf8mb4` — database sendiri untuk modul Dapur |
| Auth | Verifikasi JWT dari Core Service (`CORE_JWT_SECRET`, import in-process) — Dapur tidak menerbitkan token |
| Frontend | React (Vite), folder `apps/core-portal/src/apps/dapur/pages/`, pakai ulang `apps/core-portal/src/shared/` |
| Env var prefix | `DAPUR_` (mis. `DAPUR_DB_HOST`, `DAPUR_DB_NAME`) |

## 4. Ruang Lingkup Fitur Dapur (202 Fitur — Draf Awal dari Daftar Fitur Developer)

> **Ditandai untuk direview, terutama kolom Prioritas.** Daftar di bawah disusun apa adanya dari
> 202 baris fitur yang dilampirkan developer (semuanya `Aplikasi = Dapur`), dikelompokkan per
> Modul/Kategori sesuai kolom asli. Kolom "Kolom/Atribut Utama" & "Aktor" diringkas dari kolom
> asli (banyak baris berbagi pola atribut yang sama — lihat catatan pengelompokan di
> `erd-dapur.md`).

### 4.1 Master Data Dapur (14 fitur — Prioritas: Must)

| Fitur | Kolom/Atribut Utama | Aktor |
|---|---|---|
| Master bahan baku | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master satuan & konversi | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master kategori bahan | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master supplier | tanggal, supplier, item, qty, harga, status, dokumen | Admin Dapur |
| Master lokasi penyimpanan | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master alat dapur | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master jenis makan | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master kelompok santri | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Kalender hari operasional | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Parameter sistem dapur | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master alergi & pantangan | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master jenis kemasan | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master standar kualitas bahan | kode, nama, kategori, status, periode, keterangan | Admin Dapur |
| Master hari besar/acara | kode, nama, kategori, status, periode, keterangan | Admin Dapur |

### 4.2 Menu (14 fitur)

| Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|
| Perencanaan menu makan | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Template menu mingguan | Should | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Siklus menu bulanan | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Versi & histori menu | Should | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Penguncian menu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Substitusi menu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Pengecekan keberagaman menu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Penandaan menu favorit | Could | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Standar gizi/nutrisi menu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Alergen menu | Should | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Batas biaya per porsi | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Kalender menu khusus | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Usulan menu | Could | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Evaluasi & feedback menu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |

### 4.3 Resep & Standar Produksi (15 fitur)

| Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|
| Master menu masakan | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| Resep standar | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| Resep per jumlah porsi | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| Yield/bobot bersih bahan | Must | tanggal, objek, nilai, status, keterangan, PIC | Kepala Dapur |
| Standar porsi | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| Standar bumbu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| Langkah proses masak | Must | tanggal, batch/WO, menu, bahan, qty, PIC, status | Kepala Dapur |
| Suhu/waktu proses standar | Must | tanggal, objek, indikator, hasil, batas, PIC, catatan | Kepala Dapur |
| Foto referensi hidangan | Could | tanggal, objek, nilai, status, keterangan, PIC | Kepala Dapur |
| Standar penyajian | Must | tanggal, objek, nilai, status, keterangan, PIC | Kepala Dapur |
| Versi resep | Should | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| Simulasi biaya resep | Should | periode, item, qty, unit_cost, total_cost, sumber_harga | Kepala Dapur |
| Konversi resep batch | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |
| SOP sanitasi per proses | Must | tanggal, objek, indikator, hasil, batas, PIC, catatan | Kepala Dapur |
| Persetujuan resep | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Kepala Dapur |

### 4.4 Perencanaan Kebutuhan (14 fitur, semua Dependency: Core Service)

| Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|
| Forecast jumlah porsi | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Perencanaan porsi per kelas/kelompok | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Buffer porsi | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Kebutuhan bahan per menu | Must | menu, tanggal/periode, komponen, qty, satuan, porsi, status | Admin Dapur |
| Kebutuhan bahan mingguan | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Kebutuhan bahan bulanan | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Net requirement setelah stok | Must | bahan, lokasi/lot, qty, satuan, nilai, status | Admin Dapur |
| Perencanaan bahan substitusi | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Perencanaan kapasitas dapur | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Workload produksi | Must | tanggal, batch/WO, menu, bahan, qty, PIC, status | Admin Dapur |
| Rencana kebutuhan kemasan | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Rencana kebutuhan tenaga kerja | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Simulasi perubahan jumlah santri | Should | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |
| Peringatan kebutuhan mendesak | Must | tanggal, objek, nilai, status, keterangan, PIC | Admin Dapur |

### 4.5 Anggaran & Biaya (14 fitur, semua Dependency: Keuangan)

| Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|
| Anggaran dapur tahunan | Must | periode, kategori, pagu, realisasi, deviasi | Admin Dapur |
| Anggaran per bulan | Must | periode, kategori, pagu, realisasi, deviasi | Admin Dapur |
| Anggaran per porsi | Must | periode, kategori, pagu, realisasi, deviasi | Admin Dapur |
| Anggaran per kelompok | Must | periode, kategori, pagu, realisasi, deviasi | Admin Dapur |
| Estimasi biaya menu | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Simulasi biaya pekanan | Should | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Komparasi anggaran vs realisasi | Must | periode, kategori, pagu, realisasi, deviasi | Admin Dapur |
| Kontrol deviasi biaya | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Biaya bahan per porsi | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Biaya waste | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Biaya overhead dapur | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Alokasi biaya per layanan makan | Must | periode, item, qty, unit_cost, total_cost, sumber_harga | Admin Dapur |
| Pengendalian komitmen belanja | Must | tanggal, supplier, item, qty, harga, status, dokumen | Admin Dapur |
| Persetujuan anggaran | Must | periode, kategori, pagu, realisasi, deviasi | Admin Dapur |

### 4.6 Pengadaan & Belanja (15 fitur, semua Dependency: Keuangan/Procurement)

Rencana pembelian, Daftar belanja harian, Permintaan pembelian, Persetujuan pembelian, Purchase
order, Perbandingan harga supplier, Histori harga bahan, Pemilihan supplier (Should), Jadwal
belanja, Checklist belanja, Pencatatan transaksi belanja, Bukti transaksi belanja, Retur ke
supplier, Pembelian darurat, Rekonsiliasi belanja — **semua Must** kecuali Pemilihan supplier
(Should). Kolom mayoritas: `tanggal, supplier, item, qty, harga, status, dokumen`; 2 fitur pakai
`periode, item, qty, unit_cost, total_cost, sumber_harga` (Perbandingan & Histori harga). Aktor:
Admin Dapur.

### 4.7 Penerimaan Bahan (12 fitur, Dependency: Procurement)

Penerimaan bahan, Pemeriksaan kuantitas, Pemeriksaan kualitas, Pemeriksaan suhu bahan, Tanggal
kedaluwarsa/lot, Penolakan penerimaan, Berita acara penerimaan, Penerimaan parsial (Should),
Selisih penerimaan, Dokumentasi penerimaan, Penempatan awal bahan, Lead time supplier (Should) —
sisanya **Must**. Kolom mayoritas: `tanggal, supplier, item, qty, lot, expiry, hasil, status`.
Aktor: Petugas Gudang.

### 4.8 Persediaan & Gudang (16 fitur)

Stok bahan baku, Stok per lot, Minimum stok, Reorder point, Stock opname, Penyesuaian stok, Mutasi
antar lokasi, Pengambilan bahan, Picking list, FIFO/FEFO, Bahan mendekati kedaluwarsa, Stok kritis,
Kartu stok, Nilai persediaan (Should), Pemusnahan stok, Retur internal — **semua Must** kecuali
Nilai persediaan (Should). Kolom mayoritas: `bahan, lokasi/lot, qty, satuan, nilai, status`.
Aktor: Petugas Gudang.

### 4.9 Produksi & Operasional Dapur (15 fitur)

Jadwal produksi, Work order produksi, Batch produksi, Kitting bahan, Pencatatan pemakaian bahan,
Kelebihan/kekurangan pemakaian, Log proses masak, Checklist persiapan produksi, Pencatatan hasil
masak, Pencatatan sisa masakan, Rework masakan (Could), Downtime alat (Could), Serah terima shift,
Check-in area produksi, Checklist kebersihan akhir — sisanya **Must**. Aktor: Kepala Dapur.

### 4.10 Distribusi & Absensi Makan (14 fitur, semua Dependency: Core Service)

Jadwal distribusi makan, Porsi per kelompok, Daftar pengantaran, Serah terima makanan, Absensi
makan santri, Absensi per kelas/asrama, Pengurangan porsi karena tidak hadir, Daftar penerima
khusus, Label porsi khusus, Kontrol jumlah porsi keluar, Makan tambahan, Pengembalian makanan,
Jadwal distribusi shift (Could), Rekap tingkat konsumsi — sisanya **Must**. Aktor: Petugas
Distribusi.

### 4.11 Kontrol Kualitas & Keamanan Pangan (15 fitur, semua Must)

Checklist penerimaan mutu, Checklist kebersihan personel, Kontrol suhu penyimpanan, Kontrol suhu
masak, Kontrol suhu holding, Kontrol organoleptik, Sampling makanan, Checklist sanitasi alat,
Checklist sanitasi area, Insiden keamanan pangan, Tindakan korektif & preventif, Audit internal
mutu, Kalibrasi alat ukur, Peringatan pelanggaran kritis, Status kelulusan batch. Aktor: QC Dapur.

### 4.12 Waste & Kehilangan (12 fitur, semua Should kecuali Target pengurangan waste = Could)

Pencatatan bahan rusak, Pencatatan bahan kedaluwarsa, Pencatatan kehilangan bahan, Pencatatan
makanan terbuang, Klasifikasi waste, Nilai kerugian waste, Analisis akar penyebab waste, Target
pengurangan waste (Could), Monitoring waste vs target, Tindakan pengurangan waste, Rekap waste per
bahan, Rekap waste per menu. Aktor: Admin Dapur.

### 4.13 Analitik & Laporan (18 fitur, semua Must kecuali Jadwal laporan otomatis = Could, Drill-down KPI = Should)

Dashboard operasional dapur, Laporan menu mingguan, Laporan kebutuhan bahan, Laporan pembelian,
Laporan stok, Laporan pemakaian bahan, Laporan konsumsi santri, Laporan biaya per porsi, Laporan
deviasi anggaran, Laporan supplier, Laporan QC & keamanan pangan, Laporan waste, Analisis tren
harga bahan, Analisis konsumsi bahan, Analisis akurasi forecast, Ekspor laporan, Jadwal laporan
otomatis (Could), Drill-down KPI (Should). Sumber: Semua modul Dapur. Konsumen: Pimpinan, Audit,
Keuangan. Aktor: Admin Dapur.

### 4.14 Workflow, Pengguna & Audit (14 fitur, semua Must kecuali Backup & pemulihan data = Could)

Manajemen pengguna dapur, Role & hak akses, Approval bertingkat, Notifikasi tugas, Notifikasi stok
kritis, Notifikasi expiry (Should), Audit trail, Riwayat perubahan data, Penguncian periode, Tutup
buku dapur, Backup & pemulihan data (Could), Import data massal, Validasi data lintas modul, Status
layanan dapur. Aktor: Admin Sistem. Dependency: Core Service + Notifikasi.

## 5. Keputusan Terbuka — Keputusan yang Telah Ditetapkan (Final)

Tujuh poin keputusan telah dikonfirmasi dan ditetapkan bersama developer pada 2026-08-18:

1. **Ruang Lingkup Fitur (202 Fitur Penuh):**
   - **Keputusan:** Mengakomodasi seluruh 202 fitur operasional dapur dengan strategi **~48 tabel generik** berbasis kolom *discriminator* (`type`). Seluruh rantai operasional (resep, kitting produksi, QC kebersihan/suhu, dan tracking waste) tercakup rapi tanpa membengkakkan jumlah tabel.
2. **Model Operasional Dapur (Dapur Sentral / Central Kitchen):**
   - **Keputusan:** Operasional dapur bersifat terpusat (*Central Kitchen*) untuk seluruh Yayasan (pembelian bahan, gudang persediaan bahan mentah, dan proses masak dilakukan bersama).
   - **Struktur Kolom:** Kolom `satuan_pendidikan_id` bersifat `NULLABLE` pada tabel master bahan baku, gudang persediaan, dan batch produksi, namun **`NOT NULL` (Wajib)** pada tabel hilir yaitu distribusi makanan (`kitchen_meal_distributions`) dan absensi makan (`kitchen_meal_attendances`).
3. **Status Ketergantungan ke Keuangan (Anggaran Mandiri + Referensi Opsional):**
   - **Keputusan:** Modul Dapur mengelola pagu anggaran dan batas biaya per porsi secara mandiri di `kitchen_budgets` & `kitchen_cost_records`.
   - **Struktur Kolom:** Kolom `finance_ref_id` bersifat `NULLABLE` (opsional) agar tidak memblokir operasional, dan siap disambungkan saat modul Keuangan aktif.
4. **Granularitas Absensi Makan Santri (Model Hybrid):**
   - **Keputusan:** Mendukung pencatatan kehadiran makan secara fleksibel, baik per kelompok/rombel asrama maupun scan kartu santri individual.
   - **Struktur Kolom:** Tabel `kitchen_meal_attendances` memiliki kolom `attendance_level ENUM('individual', 'group')`, `group_id BIGINT UNSIGNED NOT NULL`, dan `student_id BIGINT UNSIGNED NULLABLE`.
5. **Manajemen Pengguna & Staf Dapur (Role Core + Tabel Penugasan Lokal):**
   - **Keputusan:** Otentikasi dan permission tetap tunggal di Core Service (`user_school_roles` & permissions `dapur.*`), sedangkan tabel `kitchen_staff_assignments` lokal di database Dapur tetap dipertahankan untuk mencatat penugasan shift kerja harian dan stasiun kerja dapur (persiapan, masak, gudang, kurir).
6. **Sumber Realisasi Biaya (Dihitung Otomatis dari Transaksi Dapur):**
   - **Keputusan:** Angka realisasi biaya bahan dan waste dihitung otomatis dan *real-time* dari transaksi pergerakan stok keluar (`kitchen_stock_movements`) dan kerugian sampah (`kitchen_waste_records`).
7. **Status Layanan Dapur (Pengumuman Jadwal & Operasional Makan):**
   - **Keputusan:** Tabel `kitchen_service_status` berfungsi sebagai papan informasi operasional harian pelayanan makan santri (status buka normal, keterlambatan, menu darurat, atau pengumuman jadwal puasa/sahur).

## 6. Yang BUKAN Tanggung Jawab Dapur — Jangan Dikerjakan di Sini

- Data induk siswa & orangtua → domain **Akademik** (Dapur hanya simpan `ref_id`/cache kelompok)
- Data induk pegawai → domain **Kepegawaian** (Dapur hanya simpan `ref_id` PIC/petugas)
- Akun login, Yayasan, Satuan Pendidikan → domain **Core Service**
- Anggaran/RAPBS resmi, COA, pembukuan jurnal → domain **Keuangan** (Dapur hanya mengonsumsi/
  mencatat referensi, lihat Keputusan Terbuka poin 3 & 6)
- Tagihan ke orangtua, pembayaran → domain **Keuangan**/**Portal Orangtua**, bukan Dapur meskipun
  Dapur menghasilkan data biaya per porsi yang mungkin jadi input tagihan

Kalau di tengah pengembangan Dapur muncul kebutuhan yang terasa seperti masuk ke salah satu domain
di atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Aplikasi yang Terhubung ke Dapur

- **Core Service** — auth (JWT), data Satuan Pendidikan/Yayasan, pengaturan sistem.
- **Kepegawaian** — data PIC/petugas dapur (Admin Dapur, Kepala Dapur, Petugas Gudang, Petugas
  Distribusi, QC Dapur), hanya `ref_id`.
- **Akademik** — data santri & kelompok santri untuk forecast porsi, distribusi, absensi makan,
  hanya `ref_id`/cache.
- **Keuangan** — anggaran/RAPBS, realisasi biaya (status wajib/opsional: lihat Bagian 5 poin 3).
- **Pengelolaan** (konsumen) — dashboard agregat lintas modul akan menarik data laporan Dapur.

Matriks ketergantungan penuh 14 aplikasi ada di `ARSITEKTUR-SISTEM.md` Bagian 5 (sudah diperbarui
mencantumkan Kepegawaian & Akademik untuk Dapur — lihat Bagian 5 poin 1 di atas).

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, dst) ada di
`ARSITEKTUR-SISTEM.md` Bagian 4 — Dapur **mengikuti**, tidak menentukan sendiri.

Khusus Dapur: environment variable diawali `DAPUR_` (mis. `DAPUR_DB_HOST`, `DAPUR_DB_NAME`).
Prefix path API: `/api/v1/dapur/...`. Prefix route frontend: `/dapur/...`.

## 9. Dokumen Lain yang Terkait

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh, prinsip arsitektur global, konvensi teknis
  global, matriks ketergantungan. Baca dulu untuk pertanyaan yang menyangkut modul lain.
- `erd-dapur.md` — ERD tabel Dapur (strategi tabel generik per kategori — lihat Bagian 0 file
  itu untuk penjelasan pengelompokan).
- `api-contract-dapur.md` — kontrak endpoint REST API Dapur.
- `roles-dapur.md` — matriks role & permission Dapur.
- `panduan-pengembangan-dapur.md` — checklist tahap pengembangan + prompt Antigravity & query SQL
  siap pakai per tahap.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar 202 fitur lengkap, filter
  `Aplikasi = Dapur`.
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — isi setiap satu item Dapur selesai
  dibuat & diuji.
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan & tracker progres.

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat & 7 Keputusan Terbuka di Bagian 5 telah diputuskan (1A, 2B, 3B, 4C, 5B, 6A, 7A): Cakupan 202 fitur (48 tabel), Central Kitchen (satuan_pendidikan_id wajib di distribusi & absensi), Anggaran mandiri Dapur + ref opsional, Absensi makan hybrid, Penugasan shift staf dapur lokal, Biaya real-time otomatis dari mutasi stok, dan Status layanan pengumuman makan. Status: Tahap 1 Selesai / Siap Menuju ERD & Migration. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
