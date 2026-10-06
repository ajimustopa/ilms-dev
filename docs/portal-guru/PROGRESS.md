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
| **15** | Komponen dasar | [ ] | | |
| **16** | Dashboard | [ ] | | |
| **17** | Absensi guru | [ ] | | |
| **18** | Pengingat absen | [ ] | | |
| **19** | Izin guru | [ ] | | |
| **20** | Jadwal dan pengingat mengajar | [ ] | | |
| **21** | Perencanaan pembelajaran | [ ] | | |
| **22** | Absensi siswa | [ ] | | |
| **23** | Jurnal mengajar UI | [ ] | | |
| **24** | Nilai sesi | [ ] | | |
| **25** | Nilai TP dan sikap | [ ] | | |
| **26** | Informasi siswa | [ ] | | |
| **27** | Pengumuman | [ ] | | |
| **28** | Kejadian siswa | [ ] | | |
| **29** | Penanganan kejadian | [ ] | | |
| **30** | Profil dan bersih-bersih | [ ] | | |
| **31** | QA akhir | [ ] | | |
