# PRODUCT REQUIREMENTS DOCUMENT (DRAFT)
# ILMS (Integrated Learning & Management System)

Status Dokumen: DRAFT [USULAN]  
Tanggal: 2026-09-30  
Pendekatan: Plan-First (Spesifikasi Produk dan Perilaku Tanpa Keputusan Teknis)

---

## 1. RINGKASAN PRODUK

### Problem Statement
Pengelolaan yayasan pendidikan yang menaungi multi-satuan pendidikan (TK, SD, SMP, SMA, Pondok Pesantren/Tahfidz) bertumpu pada tiga pilar operasional utama: siswa yang belajar, guru dan staf yang mengabdi, serta biaya pendidikan yang menopang seluruh kegiatan. Saat ini pengelola sekolah menghadapi tantangan berat: fragmentasi data identitas siswa, pencatatan guru dan tenaga kependidikan yang tersebar di berbagai unit tanpa penugasan yang jelas, ketidakakuratan penagihan biaya pendidikan (SPP), serta lambatnya pencatatan setoran loket dan lemahnya jejak audit saat terjadi kekeliruan data. ILMS (Integrated Learning & Management System) dirancang dari awal sebagai platform manajemen sekolah terpadu yang memberikan kepastian sistem dari fondasi melalui integrasi erat tiga pilar utama: Akademik, Kepegawaian, dan Keuangan, dengan pemisahan hak akses per unit yang mutlak sejak hari pertama.

### Tujuan Produk [USULAN]
1. Mengintegrasikan tiga pilar operasional sekolah (Akademik, Kepegawaian, dan Keuangan) dalam satu platform multi-satuan pendidikan yang terisolasi aman per unit.
2. Memastikan akurasi data induk siswa dan penugasan guru/staf di setiap satuan pendidikan dengan kontrol akses berbasis peran.
3. Menyederhanakan dan mengamankan siklus penagihan serta penerimaan SPP/biaya pendidikan melalui penegakan status Void dan jejak audit permanen.

### Non-Tujuan (Out of Scope MVP) [USULAN]
1. Tidak membangun modul pendukung sekunder (Kantin, Dapur, Sarpras, Perpustakaan, Psikotes, dan Perencanaan Mutu Jangka Panjang) sebelum tiga pilar inti terbukti stabil di lapangan.
2. Tidak menyertakan mesin penjadwalan pelajaran otomatis dan perhitungan gaji pegawai otomatis (payroll engine) yang kompleks pada rilis awal.
3. Tidak mengintegrasikan gerbang pembayaran online pihak ketiga; penerimaan pembayaran difokuskan pada kas tunai loket dan transfer bank manual.
4. Tidak membangun CMS publik untuk website promosi eksternal atau portal pendaftaran daring publik.
5. Tidak menyediakan kustomisasi alur kerja bebas per sekolah di luar parameter konfigurasi standar multi-satuan pendidikan.

---

## 2. PERSONA DAN PERAN PENGGUNA

Daftar peran pengguna sistem ILMS:

| Peran Pengguna | Deskripsi Peran | Tujuan Utama | Frekuensi Pakai | Status Usulan |
|---|---|---|---|---|
| **super_admin** | Pengelola administratif dan teknis tertinggi yayasan | Mengelola master unit sekolah, akun pengguna, peran, dan memantau audit log | Berkala / Mingguan | Dipertahankan |
| **admin_yayasan** | Pengurus harian atau direktur pendidikan yayasan | Memantau rekapitulasi data siswa, profil guru, dan keuangan lintas seluruh unit | Mingguan / Bulanan | Dipertahankan |
| **admin_satuan** | Staf tata usaha administrasi di unit sekolah | Mengelola tahun ajaran, data siswa, kelas rombel, dan mutasi siswa | Setiap Hari Kerja | **MVP (Aktif)** |
| **hrd** | Staf tata usaha kepegawaian / pengelola SDM | Mengelola biodata guru dan staf, status kerja, dan penugasan unit sekolah | Setiap Hari Kerja | **MVP (Aktif)** |
| **admin_keuangan** | Bendahara atau staf tata usaha keuangan unit | Mengatur skema tarif, menerbitkan tagihan, dan mencatat kuitansi pembayaran | Setiap Hari Kerja | **MVP (Aktif)** |
| **kepala_sekolah** | Pimpinan satuan pendidikan | Memantau operasional unit, memvalidasi mutasi siswa/guru, dan laporan | Harian / Mingguan | Dipertahankan |
| **guru** | Tenaga pendidik di kelas | Melihat penugasan kelas dan mencatat aktivitas pembelajaran | Setiap Hari Kerja | Ditunda ke Fase 2 |
| **wali_murid** | Orang tua atau wali santri | Melihat rincian tagihan pendidikan dan mengonfirmasi pembayaran | Bulanan / Insidental | Ditunda ke Fase 2 |
| **calon_murid** | Pendaftar penerimaan santri/siswa baru | Mengisi formulir pendaftaran dan melihat status seleksi | Musiman (Tahunan) | Ditunda ke Fase 2 |
| **staff_payroll** | Staf pengelola draf gaji pegawai | Mengisi rincian gaji pegawai | Bulanan | [KEPUTUSAN DIBUTUHKAN]: Usul dieliminasi, fungsi digabung ke hrd / admin_keuangan |
| **developer** | Akun teknis konfigurasi integrasi | Mengatur integrasi API pihak ketiga dan webhook | Sangat Jarang | [KEPUTUSAN DIBUTUHKAN]: Usul dieliminasi dari peran bisnis, satukan ke super_admin |

---

## 3. INVENTARIS DOMAIN MODUL DAN TRIASE

Evaluasi seluruh domain fungsional sekolah untuk menentukan prioritas implementasi:

| Domain Modul | Fungsi Singkat | Nilai Bisnis | Kompleksitas Bangun | Ketergantungan Domain | Rekomendasi | Alasan Triase |
|---|---|---|---|---|---|---|
| **Fondasi Core** | Multi-satuan pendidikan, identitas pengguna, peran, otorisasi, log audit | Sangat Tinggi | Sedang | Tidak ada | **Fondasi Wajib** | Fondasi mutlak identitas, tata kelola multi-sekolah, dan keamanan bagi seluruh domain. |
| **Akademik Dasar** | Data induk siswa, rombongan belajar, tahun ajaran, mutasi dasar | Sangat Tinggi | Sedang | Fondasi Core | **MVP** | Pilar 1: Menyediakan data induk siswa dan kelas yang menjadi subjek operasional utama. |
| **Kepegawaian Dasar** | Data guru & staf, penugasan unit sekolah, status kepegawaian | Sangat Tinggi | Sedang | Fondasi Core | **MVP** | Pilar 2: Menyediakan data induk tenaga pendidik dan kependidikan di setiap sekolah. |
| **Keuangan Dasar** | Master tarif, penagihan SPP siswa, pembayaran kas/bank, kuitansi, void | Sangat Tinggi | Tinggi | Core, Akademik | **MVP** | Pilar 3: Mengelola arus penerimaan dana operasional yang menopang kegiatan sekolah. |
| **Akademik Lanjutan** | Penjadwalan pelajaran otomatis, buku nilai, cetak rapor | Tinggi | Tinggi | Core, Akademik | Ditunda (Fase 2) | Penilaian dan rapor dibutuhkan bertahap menjelang akhir semester. |
| **Kepegawaian Lanjutan** | Penggajian otomatis (payroll), presensi kerja, evaluasi kinerja | Tinggi | Tinggi | Core, Kepegawaian | Ditunda (Fase 2) | Kalkulasi gaji otomatis membutuhkan data kehadiran terintegrasi yang stabil. |
| **Keuangan Lanjutan** | RAPBS, rekonsiliasi mutasi rekening koran, buku besar COA | Sedang | Tinggi | Core, Keuangan | Ditunda (Fase 2) | Pembukuan akuntansi lanjutan membutuhkan aliran kas harian yang sudah tertib. |
| **Tahfidz & Alquran** | Target hafalan, mutabaah harian, ujian munaqasyah, kitab | Sedang | Rendah | Core, Akademik | Ditunda (Fase 2) | Modul spesifik kepesantrenan yang membutuhkan master siswa terdaftar terlebih dahulu. |
| **Website & PPDB** | Portal publik informasi sekolah dan pendaftaran santri baru | Sedang | Sedang | Core, Akademik | Ditunda (Fase 2) | Pemasaran dan registrasi daring dapat dipisahkan dari administrasi internal harian. |
| **Kantin & Dompet Santri** | Kasir belanja harian (POS), dompet digital santri, limit jajan | Rendah | Sedang | Core, Keuangan | Ditunda (Fase 3) | Layanan fasilitas pendukung yang tidak memengaruhi kelulusan atau legalitas sekolah. |
| **Sarana & Prasarana** | Inventaris aset gedung/ruang, peminjaman fasilitas, pengadaan, BHP | Sedang | Sedang | Fondasi Core | Ditunda (Fase 3) | Pencatatan fisik aset dapat ditata mandiri sebelum integrasi sistem terpusat. |
| **Perpustakaan** | Katalogisasi pustaka, sirkulasi peminjaman, denda keterlambatan | Rendah | Rendah | Core, Akademik | Ditunda (Fase 3) | Layanan literasi pendukung yang bukan prasyarat administrasi wajib yayasan. |
| **Dapur & Gizi Asrama** | Perencanaan menu gizi, standar resep, kebutuhan bahan, log masak | Rendah | Sangat Tinggi | Core, Keuangan | Ditunda (Fase 3) | Kompleksitas tinggi yang khusus diperuntukkan bagi asrama penuh. |
| **Manajemen Mutu Strategis** | Rencana 25 tahun, evaluasi diri, Balanced Scorecard KPI, heatmap risiko | Rendah (Harian) | Sangat Tinggi | Seluruh Modul | **Dibuang** | Perencanaan jangka panjang terlalu abstrak sebelum sistem transaksi harian menghasilkan data riil. |

---

## 4. SCOPE MVP (TIGA PILAR UTAMA)

Sesuai arahan produk, rilis MVP memfokuskan implementasi pada **tiga pilar modul fungsional**: **Akademik**, **Kepegawaian**, dan **Keuangan**, yang berjalan di atas Fondasi Akses Core:

1. **Modul Akademik Dasar (Siswa dan Rombel)**
   - Cakupan: Penetapan tahun ajaran dan semester aktif, pembentukan tingkat kelas dan rombongan belajar (rombel), pendaftaran dan pembaruan biodata siswa (NIS/NISN/NIK), penempatan siswa ke rombel, serta pencatatan status siswa (aktif, mutasi keluar, lulus).
2. **Modul Kepegawaian Dasar (Guru dan Staf)**
   - Cakupan: Pengelolaan data induk guru dan tenaga kependidikan (NIP, NIK, kontak, riwayat pendidikan), penetapan status kerja (Tetap, Kontrak, Honorer), penugasan resmi guru/staf ke satu atau beberapa satuan pendidikan, serta pencatatan status keaktifan staf.
3. **Modul Keuangan Dasar (Tarif dan Penagihan SPP)**
   - Cakupan: Master jenis biaya dan skema tarif per tingkat kelas, penerbitan draf tagihan massal per rombel (siklus hidup DRAFT -> PUBLISHED), pencatatan penerimaan kas dan transfer bank, pencetakan kuitansi resmi, pembatalan resmi (Void) dengan alasan wajib, dan kartu pembayaran siswa (student ledger).
4. **Fondasi Pendukung: Akses dan Organisasi Core**
   - Cakupan: Profil yayasan, master satuan pendidikan multi-sekolah, manajemen akun pengguna, otentikasi sesi terpusat, pemetaan peran per unit sekolah (`user_school_roles`), penegakan isolasi akses data berbasis konteks unit aktif, dan log pencatatan audit perubahan data.

### Mengapa Kombinasi Tiga Modul Ini Dipilih?
Kombinasi Akademik, Kepegawaian, dan Keuangan membentuk segitiga emas operasional sekolah nyata. Sekolah tidak dapat beroperasi tanpa data siswa yang diajar (Akademik), guru dan tenaga kependidikan yang mengajar (Kepegawaian), serta tata kelola uang sekolah yang membiayai operasional harian (Keuangan). Membangun ketiganya secara terpadu sejak awal memastikan korelasi antar-entitas terjalin rapi tanpa tumpang tindih data.

### Tabel Fitur Ditunda (Deferred Features)
| Fitur / Sub-Modul | Target Rilis | Alasan Ditunda |
|---|---|---|
| Mesin Penjadwalan Pelajaran Otomatis | Fase 2 | Algoritma heuristik kompleks; sekolah dapat mengunggah atau mengatur jadwal manual di awal. |
| Penilaian Formatif/Sumatif dan Rapor | Fase 2 | Hanya dibutuhkan menjelang tengah atau akhir semester; data siswa harus mapan lebih dahulu. |
| Penggajian Pegawai Otomatis (Payroll Engine) | Fase 2 | [KEPUTUSAN DIBUTUHKAN]: Menghindari komplikasi integrasi presensi dan tunjangan sebelum data staf stabil. |
| Presensi Biometrik dan Rekap Lembur Pegawai | Fase 2 | Memerlukan integrasi perangkat keras dan konfigurasi jam kerja fleksibel. |
| RAPBS dan Buku Besar Akuntansi COA | Fase 2 | Memerlukan data historis realisasi biaya; tahap awal memprioritaskan kas masuk dari siswa. |
| Rekonsiliasi Otomatis Mutasi Bank | Fase 2 | Butuh standardisasi data rekening koran; tahap awal menggunakan verifikasi bukti bayar manual. |
| Portal Khusus Wali Murid dan Guru Mandiri | Fase 2 | Tata usaha dapat mencetak kartu tagihan fisik sebelum portal mandiri dibuka. |
| Modul Kantin, Dapur, Sarpras, Perpustakaan | Fase 3 | Merupakan operasional fasilitas penunjang, bukan proses inti izin operasional sekolah. |
| Perencanaan Strategis 25 Tahun & BSC | Dibuang | Terlalu dini untuk sistem operasional harian yang belum memiliki akumulasi data transaksi. |

---

## 5. USER STORIES MVP

### A. Fondasi Akses dan Organisasi Core

- **US-001 [Must]**: Sebagai Pengguna Terdaftar, saya ingin masuk ke sistem dan memilih satuan pendidikan yang menjadi wewenang saya, agar saya dapat bekerja sesuai konteks unit sekolah saya.
  - Kriteria 1: Pengguna berhasil masuk dengan kredensial valid dan disajikan daftar unit sekolah yang ditugaskan padanya.
  - Kriteria 2: Pengguna dengan wewenang multi-sekolah dapat beralih konteks unit aktif tanpa harus login ulang.
  - Kriteria 3 [Kasus Tepi]: Pengguna yang memasukkan kredensial salah diblokir dengan pesan validasi informatif tanpa membocorkan eksistensi nama pengguna.

- **US-002 [Must]**: Sebagai Super Admin, saya ingin mendaftarkan pengguna baru dan menetapkan perannya pada unit sekolah tertentu, agar akses operasional terdistribusi secara aman.
  - Kriteria 1: Admin dapat membuat akun dan mengaitkannya ke satu atau lebih satuan pendidikan dengan peran spesifik.
  - Kriteria 2: Akses operasional pengguna otomatis terisolasi hanya pada data unit sekolah yang ditetapkan padanya.
  - Kriteria 3 [Kasus Tepi]: Upaya mendaftarkan username atau alamat email yang sudah terdaftar ditolak oleh sistem dengan pesan yang jelas.

- **US-003 [Must]**: Sebagai Super Admin / Kepala Sekolah, saya ingin melihat catatan riwayat aktivitas pengguna pada data penting, agar setiap perubahan data memiliki pertanggungjawaban.
  - Kriteria 1: Setiap aksi pembuatan data, pembaruan, pembatalan (void), dan login tercatat otomatis lengkap dengan nama pelaku dan waktu.
  - Kriteria 2: Riwayat audit bersifat append-only dan tidak dapat diubah atau dihapus oleh peran apa pun.
  - Kriteria 3 [Kasus Tepi]: Penelusuran log audit pada rentang waktu tanpa aktivitas menampilkan tampilan kosong yang informatif tanpa galat sistem.

### B. Modul Akademik Dasar

- **US-004 [Must]**: Sebagai Admin Satuan, saya ingin menetapkan tahun ajaran dan semester yang sedang aktif, agar seluruh data siswa dan tagihan merujuk pada periode yang benar.
  - Kriteria 1: Admin dapat membuat daftar tahun ajaran dan menandai satu periode sebagai periode aktif operasional.
  - Kriteria 2: Seluruh pembuatan rombel dan penagihan otomatis mengadopsi tahun ajaran aktif secara default.
  - Kriteria 3 [Kasus Tepi]: Sistem menolak pengaktifan dua tahun ajaran secara bersamaan dalam satu satuan pendidikan.

- **US-005 [Must]**: Sebagai Admin Satuan, saya ingin menginput dan memperbarui biodata siswa lengkap dengan nomor identitasnya, agar data induk santri terdata rapi.
  - Kriteria 1: Biodata siswa mencakup nama lengkap, NIS, NISN, NIK, tanggal lahir, nama wali, kontak, dan status siswa.
  - Kriteria 2: Sistem memverifikasi bahwa NIS unik pada unit sekolah bersangkutan.
  - Kriteria 3 [Kasus Tepi]: Sistem menolak penyimpanan jika NISN atau NIK sudah terdaftar pada siswa lain di yayasan (lintas unit).

- **US-006 [Must]**: Sebagai Admin Satuan, saya ingin mengelompokkan siswa ke dalam kelas rombongan belajar (rombel), agar pengelolaan kelas dan penagihan kelompok dapat diproses.
  - Kriteria 1: Admin dapat membuat rombel berdasarkan tingkat kelas dan tahun ajaran aktif.
  - Kriteria 2: Admin dapat menambahkan siswa ke dalam rombel secara individu maupun kolektif.
  - Kriteria 3 [Kasus Tepi]: Siswa yang sudah terdaftar aktif di satu rombel reguler pada tahun ajaran yang sama ditolak jika didaftarkan ke rombel reguler kedua.

- **US-007 [Should]**: Sebagai Admin Satuan, saya ingin memperbarui status siswa menjadi mutasi keluar atau lulus, agar siswa non-aktif tidak lagi ditagih pada periode berikutnya.
  - Kriteria 1: Perubahan status siswa wajib menyertakan tanggal efektif dan catatan alasan.
  - Kriteria 2: Siswa non-aktif otomatis dikeluarkan dari daftar rombel aktif dan generator tagihan periode baru.
  - Kriteria 3 [Kasus Tepi]: Siswa yang memiliki tagihan belum lunas tetap dapat diubah statusnya, namun tunggakan historisnya tetap tercatat di sistem keuangan.

### C. Modul Kepegawaian Dasar

- **US-008 [Must]**: Sebagai HRD / Staf Kepegawaian, saya ingin menginput dan mengelola biodata guru serta tenaga kependidikan (NIP, NIK, nama lengkap, kontak, riwayat pendidikan), agar yayasan memiliki basis data terpusat staf sekolah.
  - Kriteria 1: Data pegawai mencakup informasi pribadi, kontak darurat, nomor identitas kependudukan, serta kualifikasi pendidikan terakhir.
  - Kriteria 2: Sistem memvalidasi keunikan NIP dan NIK di tingkat yayasan.
  - Kriteria 3 [Kasus Tepi]: Penginputan data pegawai dengan NIK yang sudah ada di sistem ditolak dengan peringatan data ganda.

- **US-009 [Must]**: Sebagai HRD / Staf Kepegawaian, saya ingin menugaskan guru atau staf ke satu atau lebih satuan pendidikan dengan posisi jabatan tertentu, agar penempatan kerja tenaga pendidik terdefinisi jelas.
  - Kriteria 1: Admin dapat menetapkan penugasan pegawai ke unit sekolah tertentu dengan jabatan (misal: Guru Kelas, Wali Kelas, Kepala Tata Usaha, Guru Mapel).
  - Kriteria 2: Seorang guru dapat ditugaskan mengajar di lebih dari satu unit sekolah dengan menandai unit penugasan utama.
  - Kriteria 3 [Kasus Tepi]: Upaya menghapus penugasan unit yang sedang aktif sebagai penugasan tunggal seorang pegawai ditolak sebelum penggantinya ditetapkan.

- **US-010 [Should]**: Sebagai HRD / Kepala Sekolah, saya ingin mengelola status kepegawaian (Tetap, Kontrak, Honorer) serta mencatat mutasi atau penonaktifan staf, agar hak dan legalitas kerja pegawai akurat.
  - Kriteria 1: Setiap perubahan status kepegawaian mencatat tanggal berlakunya surat keputusan (SK) dan masa berlaku kontrak jika ada.
  - Kriteria 2: Pegawai yang dinonaktifkan otomatis kehilangan hak akses operasional pada unit sekolah bersangkutan.
  - Kriteria 3 [Kasus Tepi]: Penonaktifan pegawai yang masih aktif menjabat sebagai kepala sekolah atau wali kelas menampilkan peringatan untuk menunjuk pejabat pengganti.

### D. Modul Keuangan Dasar

- **US-011 [Must]**: Sebagai Admin Keuangan, saya ingin menetapkan master jenis biaya dan skema tarif per tingkat kelas, agar dasar penetapan nominal tagihan seragam.
  - Kriteria 1: Admin dapat membuat jenis biaya (misal: SPP Bulanan, Uang Pangkal, Seragam) dengan tipe frekuensi (bulanan atau sekali bayar).
  - Kriteria 2: Admin dapat mengaitkan nominal baku jenis biaya tersebut ke tingkat kelas tertentu pada tahun ajaran aktif.
  - Kriteria 3 [Kasus Tepi]: Penghapusan jenis biaya yang sudah pernah digunakan dalam tagihan aktif ditolak oleh sistem.

- **US-012 [Must]**: Sebagai Admin Keuangan, saya ingin menerbitkan draf tagihan biaya pendidikan untuk satu kelas rombel sekaligus, agar proses penagihan bulanan cepat dan efisien.
  - Kriteria 1: Sistem membuat draf tagihan untuk seluruh siswa aktif di rombel terpilih berdasarkan skema tarif yang berlaku.
  - Kriteria 2: Draf tagihan yang sudah diperiksa dapat di-publish resmi agar siap menerima pembayaran di loket.
  - Kriteria 3 [Kasus Tepi]: Sistem mencegah duplikasi penerbitan tagihan untuk jenis biaya, siswa, dan periode bulan yang sama persis.

- **US-013 [Must]**: Sebagai Admin Keuangan, saya ingin mencatat penerimaan pembayaran dari wali murid dan menerbitkan bukti kuitansi, agar santri mendapatkan kepastian pelunasan.
  - Kriteria 1: Admin dapat mencari tagihan siswa berdasarkan NIS atau nama dan menginput nominal bayar serta metode penerimaan (kas/transfer).
  - Kriteria 2: Status tagihan otomatis terbarui menjadi Lunas (PAID) jika nominal penuh, atau Angsuran (PARTIAL) jika sebagian.
  - Kriteria 3 [Kasus Tepi]: Sistem menolak pencatatan pembayaran dengan nominal melebihi sisa kewajiban tagihan bersangkutan.

- **US-014 [Must]**: Sebagai Admin Keuangan, saya ingin membatalkan (Void) tagihan resmi atau pembayaran yang salah input dengan mencantumkan alasan, agar pembukuan tetap akuntabel tanpa penghapusan data fisik.
  - Kriteria 1: Tagihan atau kuitansi yang berstatus terbit tidak dapat dihapus, hanya dapat diubah statusnya menjadi VOID.
  - Kriteria 2: Pembatalan wajib menyertakan teks alasan minimal 10 karakter dan tercatat di audit log beserta identitas pembatal.
  - Kriteria 3 [Kasus Tepi]: Upaya membatalkan tagihan yang sudah memiliki transaksi pembayaran aktif ditolak sebelum transaksinya di-void terlebih dahulu.

- **US-015 [Should]**: Sebagai Admin Keuangan / Kepala Sekolah, saya ingin melihat kartu pembayaran santri (student ledger) yang merangkum riwayat tagihan dan setoran, agar posisi tunggakan santri dapat dipantau akurat.
  - Kriteria 1: Kartu menyajikan daftar seluruh tagihan, total bayar, tanggal pembayaran, dan sisa tunggakan per siswa secara kronologis.
  - Kriteria 2: Kartu dapat dicetak atau diekspor ke format dokumen siap bagikan kepada orang tua.
  - Kriteria 3 [Kasus Tepi]: Siswa baru yang belum memiliki tagihan menampilkan saldo kewajiban Rp 0 dengan riwayat kosong yang rapi.

---

## 6. ATURAN BISNIS

Aturan perilaku produk yang wajib dipatuhi sistem ILMS:

- **BR-001 (Isolasi Multi-Satuan Pendidikan)**: Pengguna hanya berhak melihat dan memanipulasi data operasional pada satuan pendidikan yang secara eksplisit diberikan padanya. Tindakan lintas unit diblokir kecuali untuk peran yayasan tingkat pusat.
- **BR-002 (Siklus Hidup Tagihan Siswa)**: Status tagihan wajib mengikuti state machine ketat: `DRAFT -> PUBLISHED -> PARTIAL -> PAID -> VOID`. Tagihan DRAFT dapat diubah atau dihapus; tagihan PUBLISHED tidak boleh dihapus fisik.
- **BR-003 (Prinsip Void Tanpa Hapus Fisik)**: Seluruh dokumen transaksi resmi (tagihan terbit, kuitansi pembayaran) tidak boleh dihapus dari sistem. Koreksi pembatalan dilakukan dengan status VOID disertai alasan tertulis wajib.
- **BR-004 (Keunikan Identitas Siswa)**: NIS wajib unik dalam satu satuan pendidikan. NISN dan NIK wajib unik secara global di seluruh satuan pendidikan di bawah naungan yayasan.
- **BR-005 (Keunikan Identitas Pegawai)**: NIP/NUPTK dan NIK pegawai wajib unik di tingkat yayasan untuk mencegah identitas ganda antar-unit sekolah.
- **BR-006 (Penugasan Multi-Unit Pegawai)**: Guru dan tenaga kependidikan dapat ditugaskan mengajar di lebih dari satu unit sekolah di bawah yayasan yang sama, dengan kewajiban menandai satu unit sebagai penugasan induk (home base).
- **BR-007 (Akumulasi Tunggakan)** [KEPUTUSAN DIBUTUHKAN]: Tagihan periode lalu yang belum lunas otomatis terhitung sebagai tunggakan kewajiban berjalan pada kartu pembayaran siswa.
- **BR-008 (Batas Penerimaan Pembayaran)**: Pembayaran tidak boleh dicatat melebihi sisa tagihan bersangkutan guna menghindari saldo gantung tak teridentifikasi.

---

## 7. KEBUTUHAN NON-FUNGSIONAL (TINGKAT PRODUK)

Standar mutu produk yang harus dicapai sistem:

1. **Keamanan dan Integritas Otentikasi**
   - Validasi identitas wajib dilakukan pada setiap aksi tanpa pengecualian. Seluruh akses data wajib melalui verifikasi kredensial yang sah.
   - Sesi pengguna otomatis kedaluwarsa setelah periode tidak aktif untuk mencegah penyalahgunaan terminal bersama di kantor tata usaha.
2. **Kinerja dan Waktu Tanggap**
   - Pencarian data siswa, guru, atau tagihan dengan kata kunci nama/nomor induk harus merespons di bawah 1,5 detik pada volume ribuan data.
   - Penerbitan draf tagihan untuk satu rombel (30 sampai 40 siswa) harus selesai di bawah 3 detik.
3. **Ketersediaan dan Ketahanan Sistem**
   - Sistem dapat diakses penuh selama jam kerja operasional sekolah dengan target ketersediaan 99,5% pada hari kerja.
   - Penanganan kesalahan sistem harus menampilkan pesan edukatif dalam bahasa Indonesia yang memandu pengguna, bukan kode galat teknis mentah.
4. **Jejak Audit dan Kepatuhan**
   - 100% tindakan penambahan, pengubahan status (terutama Void), mutasi penugasan staf, dan penghapusan draf wajib memiliki jejak audit permanen yang mencatat identitas pengguna, waktu kejadian, dan nilai sebelum/sesudah perubahan.
5. **Aksesibilitas dan Tata Letak Antarmuka**
   - Antarmuka tabular keuangan, siswa, dan staf wajib menggunakan perataan angka yang rapi (tabular numbers) dengan header tabel tetap terlihat (sticky header) saat menggulir daftar panjang.
   - Setiap tabel data wajib memiliki tampilan pemuatan (loading shimmer), tampilan kosong informatif (empty state), dan tampilan penanganan galat (error state) yang jelas.

---

## 8. PRINSIP PRODUK DAN STANDAR KUALITAS

Prinsip panduan dalam mendesain produk ILMS:

### Prinsip Produk yang Ditegakkan
1. **Isolasi Domain yang Tegas**: Memisahkan alur kerja dan data antar Tiga Pilar (Akademik, Kepegawaian, Keuangan) agar dapat dirawat dan dikembangkan secara mandiri.
2. **Audit Trail dan Kebijakan Void Permanen**: Mengharamkan penghapusan fisik pada dokumen resmi untuk menjamin kepastian audit yayasan dan keandalan data historis.
3. **Konteks Multi-Satuan Pendidikan Melekat pada Akun Pengguna**: Konteks unit sekolah wajib melekat pada sesi pengguna untuk mencegah kebocoran data antar-sekolah.
4. **Antarmuka Tabular Terstandarisasi**: Penggunaan angka tabular, header tabel lengket (sticky), dan format mata uang yang seragam untuk kenyamanan kerja staf tata usaha.
5. **Konsistensi Kontrak Pertukaran Data**: Menjaga struktur data bolak-balik yang seragam antara sistem pengolah dan antarmuka pengguna.

### Pola Desain yang Dihindari (Antipola)
1. **Halaman Monolitik Gemuk Multifungsi**: Menolak layar antarmuka tunggal yang menggabungkan seluruh fungsi sekaligus; setiap alur kerja harus memiliki layar spesifik yang fokus.
2. **Fallback Kredensial atau Pengabaian Konfigurasi Keamanan**: Menolak sistem berjalan jika variabel konfigurasi keamanan tidak lengkap pada lingkungan operasional.
3. **Pemeriksaan Otorisasi Semu**: Menolak fungsi verifikasi izin yang hanya memeriksa label tanpa memvalidasi keabsahan data pengguna yang sedang aktif.
4. **Pembengkakan Lingkup Modul Sekunder Sebelum Validasi Pasar**: Tidak membangun modul penunjang fasilitas sebelum modul inti teruji stabil di lapangan.
5. **Pelepasan Fitur Tanpa Verifikasi Pengujian Otomatis**: Menolak peluncuran logika bisnis ke pengguna tanpa disertai pembuktian uji otomatis yang lolos 100%.

---

## 9. METRIK KEBERHASILAN MVP [USULAN]

1. **Kecepatan Penagihan Massal**: Staf tata usaha mampu menerbitkan tagihan bulanan untuk seluruh siswa dalam 1 unit sekolah (< 500 siswa) dalam waktu `< 10 menit [USULAN]`.
2. **Efisiensi Loket Pembayaran**: Waktu pencatatan setoran tunai siswa hingga kuitansi tercetak adalah `< 45 detik per transaksi [USULAN]`.
3. **Kelengkapan Data Tenaga Pendidik**: Tercapainya `100% data guru dan staf terpetakan ke unit sekolah` penugasan masing-masing pada bulan pertama rilis `[USULAN]`.
4. **Integritas Penolakan Akses Silang**: Pengujian isolasi data antar-unit sekolah mencapai `100% terisolasi tanpa celah lintas unit [USULAN]`.
5. **Tingkat Adopsi Operasional**: Minimal `90% staf tata usaha, bendahara, dan staf kepegawaian` di unit percontohan menggunakan sistem secara mandiri dalam 2 pekan pertama rilis `[USULAN]`.
6. **Cakupan Pengujian Otomatis Fitur Inti**: Pengujian otomatis pada aturan bisnis ketiga pilar MVP mencapai minimal `> 80% coverage [USULAN]`.

---

## 10. RISIKO DAN ASUMSI

| Risiko / Asumsi | Kategori | Dampak | Strategi Mitigasi |
|---|---|---|---|
| **Risiko Scope Creep (Pembengkakan Lingkup)** | Manajemen Produk | Tinggi: Permintaan penambahan fitur rapor atau payroll otomatis menunda rilis | Mengunci batas MVP pada 3 modul dan mengarahkan fitur lanjutan ke dokumen Backlog Fase 2. |
| **Risiko Resistensi Staf terhadap Aturan Void** | Operasional | Sedang: Staf mengeluh karena tidak bisa menghapus tagihan yang salah begitu saja | Memberikan antarmuka pembatalan Void yang mudah dengan opsi alasan drop-down plus catatan singkat. |
| **Risiko Guru Rangkap Tugas Multi-Unit** | Bisnis | Sedang: Ketidakjelasan perhitungan beban kerja guru yang mengajar di SD dan SMP sekaligus | Menetapkan konsep unit penugasan utama (home base) dan unit penugasan tambahan pada modul Kepegawaian. |
| **Risiko Inkonsistensi Data Identitas Siswa/Guru** | Data | Tinggi: NIK atau NIS ganda lama saat migrasi data awal | Menyediakan mekanisme validasi prasyarat data saat impor data siswa dan staf awal. |
| **Asumsi Kesiapan Data Master Tarif** | Operasional | Sedang: Penerbitan tagihan tertunda jika skema tarif per tingkat belum disepakati yayasan | Menyediakan formulir konfigurasi tarif yang fleksibel sebelum tahun ajaran baru dibuka. |

---

## 11. DAFTAR PERTANYAAN TERBUKA (KEPUTUSAN DIBUTUHKAN)

Daftar keputusan yang membutuhkan konfirmasi pemilik produk sebelum spesifikasi dibekukan:

1. **[KEPUTUSAN DIBUTUHKAN #1 - Ruang Lingkup Modul Kepegawaian di MVP]**:
   Apakah modul Kepegawaian pada rilis MVP difokuskan pada Data Induk Pegawai & Penugasan Unit Sekolah saja, atau menyertakan pencatatan draf slip gaji sederhana?
   - Opsi A (Rekomendasi): Batasi pada Data Induk Pegawai, Jabatan, dan Penugasan Unit Sekolah. Penggajian (payroll engine) ditunda ke Fase 2 agar fokus peluncuran siswa & keuangan tidak terhambat.
   - Opsi B: Sertakan pencatatan slip gaji statis (tanpa kalkulasi otomatis presensi).

2. **[KEPUTUSAN DIBUTUHKAN #2 - Penyederhanaan Peran Pengguna di Rilis Awal]**:
   Apakah peran `staff_payroll` dan `developer` dieliminasi dari peran bisnis sistem baru?
   - Opsi A (Rekomendasi): Eliminasi keduanya. Tugas payroll nantinya ditangani `hrd` / `admin_keuangan`, konfigurasi sistem teknis ditangani `super_admin`.
   - Opsi B: Pertahankan `staff_payroll` sebagai peran tersendiri untuk persiapan modul payroll di Fase 2.

3. **[KEPUTUSAN DIBUTUHKAN #3 - Mekanisme Penanganan Tunggakan Periode Lalu]**:
   Bagaimana sistem menangani sisa tagihan bulan lalu yang belum lunas saat tagihan bulan baru diterbitkan?
   - Opsi A (Rekomendasi): Tagihan lama tetap berdiri sebagai dokumen terpisah, namun total tunggakan ditampilkan akumulatif pada kartu pembayaran siswa.
   - Opsi B: Tagihan lama dilebur dan ditambahkan nominalnya ke dalam tagihan bulan berjalan (Konsekuensi: riwayat pelunasan per bulan menjadi rancu).

4. **[KEPUTUSAN DIBUTUHKAN #4 - Kebijakan Pembayaran Lebih (Overpayment)]**:
   Jika wali murid membayar nominal melebihi sisa tagihan bersangkutan, bagaimana sistem merespons?
   - Opsi A (Rekomendasi): Sistem menolak kelebihan bayar; staf harus menginput nominal pas sesuai sisa tagihan.
   - Opsi B: Kelebihan bayar otomatis dialokasikan ke tagihan bulan berikutnya jika sudah terbit.
   - Opsi C: Kelebihan bayar disimpan sebagai deposit saldo santri (Konsekuensi: membutuhkan modul dompet/deposit tambahan di MVP).

5. **[KEPUTUSAN DIBUTUHKAN #5 - Format Penomoran Dokumen Kuitansi dan Tagihan]**:
   Bagaimana skema penomoran resmi kuitansi pembayaran dan nomor tagihan?
   - Opsi A (Rekomendasi): Berbasis kode satuan pendidikan dan tahun ajaran (contoh: `INV/SD/2026/00001` dan `KW/SD/2026/00001`).
   - Opsi B: Penomoran berurutan tunggal terpusat di tingkat yayasan (contoh: `KW-2026-000001`).
