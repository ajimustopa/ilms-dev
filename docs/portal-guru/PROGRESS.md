# PROGRESS PEMBANGUNAN ULANG PORTAL GURU

Dokumen pelacak status pengerjaan tahapan pembangunan ulang Portal Guru Core Aldepos.

| Tahap | Nama Tahap | Status | Tanggal Selesai | Catatan / Bukti Verifikasi |
|:---:|---|:---:|:---:|---|
| **0** | Impeccable | [x] | 2026-10-06 | PRODUCT.md & .impeccable/config.json comp-first |
| **1** | Aturan kerja | [x] | 2026-10-06 | ATURAN-KERJA.md & PROGRESS.md dibuat |
| **2** | Opsi desain | [x] | 2026-10-06 | 3 opsi & preview HTML (opsi-a, opsi-b, opsi-c) |
| **3** | Terapkan desain | [x] | 2026-10-06 | design-system.md, guru-theme.css, DESIGN.md, /guru/_design |
| **4** | Kolom GPS absensi | [x] | 2026-10-06 | Migrasi kepegawaian 20261006140001, service checkin/out updated, tested |
| **5** | Master lokasi dan jam kerja | [x] | 2026-10-06 | Migrasi 20261006140002, CRUD endpoints, permissions seed, tested |
| **6** | UI HRD | [x] | 2026-10-06 | Halaman PengaturanAbsensi.jsx di Kepegawaian, GPS auto-detect, routes |
| **7** | Validasi check-in/out | [x] | 2026-10-06 | Validasi GPS server-side, evaluasi shift/radius, endpoint today-status, unit test 100% |
| **8** | Lampiran izin | [x] | 2026-10-06 | Migrasi 20261006140004, upload base64/disk (PDF/JPG/PNG/WEBP maks 5MB), endpoint my/attachment terproteksi, test 100% |
| **9** | Jadwal dan penugasan guru | [x] | 2026-10-06 | Endpoint my-schedules & my-teaching-assignments (filter guru dari ref_id, rombel wali kelas, test 100%) |
| **10** | Jurnal mengajar | [x] | 2026-10-06 | Migrasi teaching_journals (20261006140005), CRUD & today-status endpoint, verifikasi guru vs admin, test 100% |
| **11** | Rancangan kejadian siswa | [x] | 2026-10-06 | Analisis tabel eksisting & usulan 2 opsi skema (A & B) di rancangan-kejadian-siswa.md |
| **12** | Implementasi kejadian siswa | [x] | 2026-10-06 | Migrasi 20261006150001 (incident_categories & student_incidents), CRUD + handling-status + verify-points + summary endpoints, server-side visibility enforcement, 15 tests 100% |
| **13** | Target audiens pengumuman | [x] | 2026-10-06 | Migrasi 20261006160001 (target_audience di news_posts), isolasi ketat endpoint publik, endpoint internal teacher-announcements, form CMS target selector, test 100% |
| **14** | Shell dan navigasi | [x] | 2026-10-06 | Pindah kode lama ke _legacy (/guru-lama/*), struktur baru pages/components/services/hooks/utils, shell mobile-first (header, bottom nav 5 slot, drawer), placeholder F1-F9, build verified |
| **15** | Komponen dasar | [x] | 2026-10-06 | 14 komponen dasar mobile-first (44px target, anti-glow, multi-modal H/I/S/A, SelectorKonteks Tahap 9), showcase di /guru/_design |
| **16** | Dashboard | [x] | 2026-10-06 | Beranda data riil (presensi masuk/pulang, roster KBM dinamis ongoing/upcoming/done, pengumuman guru, pintasan 44px, zero-dummy, isolasi state) |
| **17** | Absensi guru | [x] | 2026-10-06 | Halaman /guru/absensi (GPS geolocation akurat, validasi radius sekolah server-side, jam shift, anti-bypass, riwayat bulanan, build verified) |
| **18** | Pengingat absen | [x] | 2026-10-06 | Banner pengingat di shell GuruLayout (dinamis shift pagi/sore, dismiss sesi, navigasi /guru/absensi, anti-mock) |
| **19** | Izin guru | [x] | 2026-10-06 | Halaman /guru/izin (daftar status izin, form pengajuan, validasi lampiran Tahap 8 PDF/JPG/PNG/WEBP maks 5MB, bottom sheet detail) |
| **20** | Jadwal dan pengingat mengajar | [x] | 2026-10-06 | Halaman /guru/jadwal (tab hari & sepekan, kartu pelajaran berikutnya + hitung mundur realtime, indikator status jurnal terisi/belum, pintasan absensi/jurnal, build verified) |
| **21** | Perencanaan pembelajaran | [x] | 2026-10-06 | Halaman /guru/perencanaan (pemilih konteks & mapel/jenjang guru, CRUD TP ke endpoint learning-objectives, scope_material persisten, deteksi pemakaian jurnal/nilai & proteksi hapus, build verified) |
| **22** | Absensi siswa | [x] | 2026-10-06 | Halaman /guru/presensi-siswa (pilihan sesi jadwal & rombel, kartu santri bertumpuk, chip H/I/S/A 44px, aksi semua hadir, simpan massal ke lesson-attendances/bulk, auto-cache offline, slot jurnal, build verified) |
| **23** | Jurnal mengajar UI | [x] | 2026-10-06 | Form jurnal terpadu di /guru/presensi-siswa (pertemuan ke-N, pilih TP/materi bebas, catatan umum, simpan terpadu), deteksi jurnal eksis/mode ubah, halaman riwayat /guru/jurnal (filter tanggal & mapel, edit, hapus, build verified) |
| **24** | Nilai sesi | [x] | 2026-10-06 | Ringkasan aturan-nilai.md, halaman /guru/nilai (konteks mapel/rombel, assessment-sessions picker & create, kartu santri input angka besar HP-friendly, KKM live indicator, quick-fill, kunci nilai read-only, simpan massal ke /akademik/assessment-sessions/:id/scores, build verified) |
| **25** | Nilai TP dan sikap | [x] | 2026-10-06 | Integrasi tab Nilai Capaian TP (pilih TP, input skor & status ketercapaian, simpan massal ke /akademik/scores/tp-scores/bulk) & tab Nilai Sikap / Karakter (dimensi Profil Pelajar Pancasila, template naratif, simpan massal ke /akademik/scores/attitude-scores/bulk), verifikasi silang identik dengan /akademik/scores, build verified |
| **26** | Informasi siswa | [x] | 2026-10-06 | Peningkatan backend listClassGroupMembers (nipd, nickname, TTL, kontak orangtua terproteksi auth JWT), halaman /guru/santri & /guru/siswa (pemilih konteks & rombel guru, kartu mobile-first, tabel desktop, aksi telp/WA/salin kontak, ekspor Excel XLSX dengan penamaan rombel & tahun ajaran, build verified) |
| **27** | Pengumuman | [x] | 2026-10-06 | Halaman /guru/pengumuman (SegmentedTabs internal guru vs berita publik yayasan, pencarian debounced, paginasi, client-side unread tracking per user, reader BottomSheet modal ramah HP, auto-open & mark read dari Beranda via ?id=..., build verified) |
| **28** | Kejadian siswa | [x] | 2026-10-06 | Halaman /guru/kejadian-siswa (filter jenis positif/negatif, kategori tata tertib, rombel/santri, status penanganan; form catat kejadian ramah satu tangan dengan pencarian cepat santri & auto-bobot poin; detail kejadian read-only dengan rekap rekam jejak santri, visibilitas server-side enforced, build verified) |
| **29** | Penanganan kejadian | [x] | 2026-10-06 | Alur penanganan kasus (update tindakan pembinaan/sanksi, transisi status handling, riwayat petugas penangan), verifikasi bobot poin kesiswaan (terproteksi hak akses server), modal rekam jejak santri (agregasi poin pelanggaran, prestasi, skor bersih, status disiplin), build verified |
| **30** | Profil dan bersih-bersih | [x] | 2026-10-06 | Halaman /guru/profil (biodata, jabatan, penugasan KBM, update kontak mandiri, ganti password SSO), halaman /guru/konseling fungsional, penghapusan total folder _legacy & route /guru-lama & /guru/_design, pembersihan mock & console, verifikasi routing alias, build verified |
| **31** | QA akhir | [x] | 2026-10-06 | Verifikasi menyeluruh F1-F9, audit desain Impeccable (360-768px, 44px target, anti-glow, a11y focus), uji kondisi buruk & offline resiliency, backend test suites 100% pass, dokumen LAPORAN-QA.md selesai |
