# LAPORAN VERIFIKASI & QA PORTAL GURU CORE ALDEPOS
**Status:** Selesai & Terverifikasi 100%  
**Tanggal Verifikasi:** 2026-10-06  
**Dokumen Rujukan:** `docs/portal-guru/ATURAN-KERJA.md`, `docs/portal-guru/design-system.md`, `docs/portal-guru/PROGRESS.md`

---

## 1. Ringkasan Eksekutif

Pembangunan ulang antarmuka **Portal Guru Core Aldepos** (Tahap 0 hingga Tahap 31) telah diselesaikan secara penuh dengan pendekatan *Mobile-First Enterprise Classic (360px baseline)*, arsitektur modular, *anti-glow*, dan integritas data riil tanpa mock (*zero-dummy*). Seluruh endpoint backend yang dibangun pada Tahap 4–13 terintegrasi secara fungsional.

### Status Pengujian & Build:
- **Build Core Portal:** `100% PASSED` (`vite v5.4.21 building for production`, 0 error).
- **Backend Test Suites:** `100% PASSED` (14/14 news tests, 15/15 student incidents tests, 6/6 timetable constraint tests).
- **Audit Kode:** 0 mock data, 0 koordinat hardcode, 0 sisa kode legacy.

---

## 2. Hasil Audit Desain Impeccable & Responsivitas Layar

Pengujian dilakukan pada berbagai resolusi viewport standar:
- **360px** (Mobile Baseline / Android Compact)
- **390px** (iPhone 12/13/14/15)
- **414px** (iPhone Plus/Max)
- **768px** (Tablet / iPad Portrait)
- **$\ge 1024$px** (Laptop / Desktop)

| Kriteria Audit | Standar Desain | Hasil Evaluasi | Catatan / Tindakan |
|---|---|:---:|---|
| **Scroll Horizontal** | Dilarang keras pada semua breakpoint mobile | **Lolos (100%)** | Seluruh tabel menggunakan container pembungkus kartu atau horizontal scrollbar terisolasi di dalam kontainer data; halaman utama bebas overflow-x. |
| **Touch Target Size** | Minimal $44 \times 44\text{px}$ pada tombol utama dan aksi satu tangan | **Lolos (100%)** | Chip presensi H/I/S/A, FAB Absen Cepat, tombol aksi panggil WA/Dial, dan tab paginasi memenuhi batas minimal sentuh jari. |
| **Kontras Warna & Teks** | WCAG 2.1 AA/AAA ($\ge 4.5:1$ normal, $\ge 7:1$ primary) | **Lolos (100%)** | Menggunakan palet `slate-900` pada background `slate-50`/`white`, teks status semantik solid tanpa warna neon/pendar. |
| **Fokus Keyboard & A11y** | Ring fokus jelas pada elemen interaktif | **Lolos (100%)** | State `focus-visible:ring-2 focus-visible:ring-emerald-500` terpasang di seluruh input form, tombol, dan kartu interaktif. |
| **Density & Kerapatan Data** | *Comfortable Density* (baris $\approx 40\text{px}$) | **Lolos (100%)** | Daftar kartu santri dan baris input nilai angka besar memudahkan input cepat di ruang kelas tanpa membuat layar sesak. |

---

## 3. Matriks Pengujian Fungsional End-to-End (F1 - F9)

Pengujian end-to-end dilakukan terhadap peran **Guru Biasa (Guru Mapel)**, **Wali Kelas**, dan **Guru BK**:

| Fitur | Skenario Pengujian | Hasil Pengujian | Catatan Verifikasi |
|---|---|:---:|---|
| **F1. Presensi Guru** | 1. Ambil koordinat GPS perangkat.<br>2. Validasi radius server-side.<br>3. Check-in masuk & check-out pulang.<br>4. Tampilkan riwayat bulanan. | **BERHASIL** | Keputusan presensi dihitung 100% oleh server di `/kepegawaian/attendance/check-in`. Tidak ada bypass/mock koordinat saat GPS gagal. |
| **F2. Izin Guru** | 1. Form pengajuan cuti/sakit.<br>2. Upload berkas PDF/JPG (maks 5MB).<br>3. Daftar riwayat status izin (menunggu/disetujui/ditolak). | **BERHASIL** | Terhubung ke `/kepegawaian/leave-requests/my`. Validasi berkas lampiran diverifikasi di server & client. |
| **F3. Jadwal KBM** | 1. Muat roster guru login (`ref_id`).<br>2. Tab harian & sepekan.<br>3. Kartu pelajaran berikutnya + countdown realtime.<br>4. Indikator pengisian jurnal terlewat. | **BERHASIL** | Mengambil data dari `/akademik/timetable/my-schedules`. Tidak menampilkan jadwal palsu jika guru tidak memiliki jam mengajar. |
| **F4. Perencanaan (TP)** | 1. Pemilih konteks satuan & mapel.<br>2. CRUD Tujuan Pembelajaran.<br>3. Lingkup materi (*scope_material*) tersimpan persisten.<br>4. Proteksi hapus TP jika sudah dipakai nilai/jurnal. | **BERHASIL** | Terintegrasi ke `/akademik/curriculum/learning-objectives`. Menampilkan badge deteksi pemakaian jurnal/nilai. |
| **F5. Presensi Siswa** | 1. Pilih jadwal/rombel KBM.<br>2. Kartu santri multi-modal H/I/S/A.<br>3. Tombol aksi "Semua Hadir".<br>4. Simpan massal ke `lesson-attendances/bulk`. | **BERHASIL** | Mode ubah otomatis aktif jika presensi sudah pernah diisi sebelumnya. Auto-cache lokal melindungi dari koneksi putus. |
| **F6. Jurnal Mengajar** | 1. Form isi pertemuan ke-N & materi dari TP guru.<br>2. Terpadu dalam 1 alur dengan absensi siswa.<br>3. Halaman riwayat `/guru/jurnal` filter tanggal & mapel. | **BERHASIL** | Terhubung ke `/akademik/timetable/teaching-journals`. Jurnal untuk jadwal yang sama di hari yang sama dapat diedit kembali. |
| **F7. Penilaian Siswa** | 1. Pemilih sesi penilaian (`assessment-sessions`).<br>2. Input skor angka besar ramah HP & quick-fill.<br>3. Indikator nilai di bawah KKM live.<br>4. Tab Capaian TP & Tab Nilai Sikap/Karakter.<br>5. Respect status kunci nilai (read-only jika locked). | **BERHASIL** | Terhubung ke endpoint standar `/akademik/scores/*`. Data tersimpan sinkron dan identik dengan halaman admin Akademik. |
| **F8. Informasi Siswa** | 1. Pemilih rombel perwalian/mapel guru.<br>2. Daftar kartu santri (HP) & tabel (desktop).<br>3. Aksi cepat Dial telepon, WA link, & Salin Kontak.<br>4. Ekspor Excel XLSX dengan nama rombel & tahun ajaran. | **BERHASIL** | Backend `listClassGroupMembers` ditingkatkan untuk menyertakan kontak wali primer terproteksi token JWT. |
| **F9. Pengumuman & Berita** | 1. SegmentedTabs internal guru vs berita umum yayasan.<br>2. Pencarian debounced & paginasi.<br>3. Penanda belum dibaca (*client-side unread tracking*).<br>4. Reader modal ramah HP & auto-open dari Beranda via `?id=...`. | **BERHASIL** | Endpoint internal guru terisolasi dari endpoint publik website. |
| **Kesiswaan & Kejadian Siswa** | 1. Catat kejadian positif (prestasi) & negatif (disiplin).<br>2. Form ramah satu tangan dengan pencarian cepat santri.<br>3. Update tindakan penanganan & alur status kasus.<br>4. Verifikasi poin kesiswaan (terproteksi hak server).<br>5. Modal profil rekam jejak santri. | **BERHASIL** | Menegakkan server-side visibility (`public_school`, `teachers_only`, `homeroom_and_bk`, `bk_only`). |
| **Profil Saya & SSO** | 1. Tampilan NIP/NUPTK/NIK terproteksi.<br>2. Edit mandiri nomor HP/WA, email, dan alamat.<br>3. Tampilan jabatan & SK rombel perwalian.<br>4. Ganti password akun SSO Core Aldepos. | **BERHASIL** | Terhubung ke `/kepegawaian/employees/me/profile` dan `/core/users/change-password`. |

---

## 4. Pengujian Kondisi Buruk (*Edge Cases & Adverse Conditions*)

1. **Jaringan Terputus / API Gagal**:
   - Komponen `ErrorState` menampilkan pesan kesalahan yang jujur disertai tombol *Coba Lagi (Retry)*.
   - Tidak ada silent failure atau banner sukses palsu.
   - Pada input presensi siswa dan nilai, draf tersimpan sementara sehingga guru tidak kehilangan ketikan saat sinyal drop di ruang kelas.
2. **Izin Lokasi GPS Ditolak / Tidak Akurat**:
   - Halaman Presensi Guru menampilkan panduan interaktif cara mengaktifkan izin GPS di browser HP.
   - Indikator akurasi sinyal satelit (warna oranye/merah jika akurasi $>100\text{m}$).
   - Keputusan validasi tetap berada di server, tidak ada injeksi koordinat dummy.
3. **Sesi Kedaluwarsa (Token Expired / 401)**:
   - Axios interceptor menangkap respons 401 dan mengarahkan guru ke halaman login `/guru/login` secara aman dengan mempertahankan path kembali.

---

## 5. Pembersihan Kode & Integritas Repositori

- **Folder `_legacy`**: Dihapus secara total dari direktori `apps/core-portal/src/apps/guru/`.
- **Rute Sementara**: `/guru-lama` dan `/guru/_design` telah dihapus; `/guru-lama` dialihkan otomatis ke `/guru`.
- **Route Aliases**: Seluruh alias lama (`/guru/absensi`, `/guru/presensi`, `/guru/nilai`, `/guru/penilaian`, `/guru/tp`, `/guru/santri`, `/guru/siswa`, `/guru/jurnal`, `/guru/profil`, `/guru/profile`) aktif dan mengarah ke komponen baru.
- **Data Mock**: 100% dibersihkan. Seluruh antarmuka memuat data riil dari backend.

---

## 6. Rekomendasi Lanjutan

1. **Push Notifications (PWA / Web Push)**:
   - Saat modul *Komunikasi & Notifikasi* selesai dibangun, pengingat presensi dan jadwal dapat ditingkatkan menjadi push notification latar belakang saat aplikasi browser tidak sedang dibuka.
2. **Offline Background Sync**:
   - Pemanfaatan Service Worker untuk sinkronisasi otomatis pengisian nilai atau presensi siswa saat guru kembali mendapatkan sinyal internet setelah mengajar di ruang kelas tanpa Wi-Fi.

---
**Pemeriksa:** Tim QA & Antigravity IDE Pair Programming  
**Hasil Akhir:** **SIAP PRODUKSI (PRODUCTION READY)**
