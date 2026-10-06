# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Guru Mata Pelajaran:** Mengelola jadwal mengajar harian, mencatat presensi siswa per jam pelajaran beserta jurnal materi KBM, mengelola Tujuan Pembelajaran (TP), dan melakukan input nilai asesmen sumatif/formatif/sikap.
- **Wali Kelas:** Mengelola absensi harian rombel santri, memantau rekap kehadiran dan nilai kelas, serta mengakses direktori kontak orangtua/wali santri.
- **Guru BK (Bimbingan Konseling) & Pembina Asrama:** Mencatat dan menangani pelanggaran disiplin santri, riwayat konseling privat, dan pencatatan prestasi santri.
- **Tenaga Pendidik & Pegawai Sekolah:** Melakukan presensi kehadiran mandiri (check-in/check-out) dengan validasi radius lokasi GPS sekolah, mengajukan permohonan izin/cuti berlampiran berkas, dan memperbarui profil biodata mandiri.
- **Pimpinan Unit & Manajemen:** Kepala Sekolah, Waka Kurikulum, dan HRD Yayasan yang memantau kedisiplinan guru, progres KBM, dan penguncian sesi nilai rapor.

## Product Purpose

Portal Guru dan Sistem Manajemen Sekolah Terpadu Yayasan Aldepos (Core Aldepos) adalah platform kerja digital harian pendidik untuk mengintegrasikan seluruh operasional KBM, presensi GPS pegawai & santri, jurnal mengajar, dan penilaian Kurikulum Merdeka secara *real-time* dengan 11 database modular Aldepos tanpa redundansi manual maupun data palsu (*zero dummy*).

## Positioning

Sistem portal pendidik terintegrasi yang menggabungkan verifikasi presensi lokasi presisi, penjurnalan pembelajaran interaktif, integrasi e-Rapor instan, dan penanganan santri berbasis rekam jejak holistik dalam antarmuka web modern berkinerja tinggi yang dioptimalkan untuk perangkat mobile dan desktop.

## Operating Context

- **Lingkungan Penggunaan:** Digunakan harian di kelas saat KBM (via laptop, tablet, atau smartphone guru), di gerbang sekolah saat presensi kedatangan/kepulangan, dan di ruang guru saat evaluasi nilai.
- **Arsitektur Sistem:** Monorepo `apps/*` dengan backend Express modular monolith (`apps/api-backend`, port 3000), portal SPA React 18 + Vite 5 + Tailwind CSS 3 (`apps/core-portal`, port 5173), dan website publik Next.js 14 (`apps/website-utama`).
- **Database & Isolasi Modul:** 11 database MariaDB terpisah (Core, Kepegawaian, Akademik, Keuangan, Al-Quran/Tahfidz, Kantin, Sarpras, Dapur, Perpustakaan, Manajemen, Website Utama). Komunikasi lintas modul dilakukan secara in-process service / REST API terstandarisasi tanpa direct cross-database join.
- **Multi-Tenant Satuan Pendidikan:** Mendukung multi-unit (TK, SD, SMP, SMA, Pondok Pesantren/Tahfidz) dengan validasi kepemilikan unit sekolah (`satuan_pendidikan_id`) berbasis token JWT.

## Capabilities and Constraints

- **F1 - Presensi Kehadiran Guru:** Check-in dan check-out mandiri dengan kalkulasi Haversine GPS radius sekolah yang tercatat riil (latitude, longitude, jarak, dan waktu) ke tabel `employee_attendances`.
- **F2 - Pengajuan Izin Guru:** Form izin/cuti sakit dan dinas dengan dukungan upload berkas surat dokter/keterangan serta status approval berjenjang HRD/Kepala Sekolah.
- **F3 - Pengingat Jadwal Mengajar:** Roster jadwal mengajar terfilter otomatis khusus untuk guru yang sedang login, dilengkapi indikator waktu KBM aktif.
- **F4 - Perencanaan Pembelajaran & TP:** Master Tujuan Pembelajaran (TP), Capaian Pembelajaran (CP), dan lingkup materi yang sinkron dengan database Akademik dan e-Rapor.
- **F5 - Presensi Siswa & Jurnal Mengajar:** Pencatatan kehadiran santri per jam pelajaran atau per rombel, terintegrasi langsung dengan formulir Jurnal Mengajar (judul materi, pertemuan ke-N, dan catatan KBM).
- **F6 - Penilaian Siswa Terpadu:** Sinkron penuh dengan modul `/akademik/scores` (sesi asesmen, nilai sumatif/formatif, nilai TP, dan nilai karakter/sikap) tanpa duplikasi skema API.
- **F7 - Direktori Informasi Siswa:** Pencarian data santri per rombel, detail wali, nomor kontak darurat, dan ekspor data tabular ke format Excel (`.xlsx`).
- **F8 - Papan Pengumuman & Informasi:** Agregasi berita dan pengumuman resmi dari modul `website_utama` dengan filter target audiens yang aman.
- **F9 - Penanganan Kejadian Santri:** Pencatatan buku pelanggaran disiplin, prestasi santri, dan konseling BK dengan status penanganan terstruktur.
- **Batasan Integritas Data:** Data uang, presensi, nilai, dan dokumen resmi tidak boleh dihapus secara fisik (wajib menggunakan mekanisme Void/status dengan audit log). Seluruh mutasi data frontend wajib mengirimkan payload riil ke backend API.

## Brand Commitments

- **Identitas:** Yayasan Aldepos (Core Aldepos Enterprise).
- **Gaya Desain:** Berpedoman pada `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` dan `apps/core-portal/PANDUAN-DESAIN-UI.md` (Enterprise Modern, palet slate netral dengan aksen indigo/emerald, kartu berstruktur rapi, ribbon status, dan responsivitas mobile prima).

## Evidence on Hand

- **Laporan Audit Lengkap:** `docs/AUDIT-PORTAL-GURU.md` dan `docs/AUDIT-PROYEK.md`.
- **Aturan Sistem & Arsitektur:** `AGENTS.md` dan `docs/ARSITEKTUR-SISTEM.md`.
- **Panduan Desain & UI:** `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` serta `apps/core-portal/PANDUAN-DESAIN-UI.md`.
- **Skema Database:** File migrasi Knex di `apps/api-backend/db/migrations/` sebagai sumber kebenaran skema data.

## Product Principles

- **Truth in Data:** Seluruh form, tombol, dan mutasi data harus terhubung langsung ke backend API dan database riil; tidak ada data mock atau state palsu yang dibiarkan di produksi.
- **Fast, Focused Workflows:** Setiap tugas harian pendidik (absen, isi jurnal, input nilai) harus dapat dituntaskan secara efisien dalam hitungan detik pada layar smartphone maupun desktop.
- **Strict Domain Boundaries:** Batas antarmodul dihormati; tidak ada query langsung lintas database, semua interaksi mengikuti kontrak API terpadu.
- **Resilient & Transparent State:** State antarmuka menampilkan umpan balik yang jujur (loading skeletons, empty states informatif, dan error handling yang jelas).

## Accessibility & Inclusion

- Target sentuh minimum 44x44px untuk seluruh elemen interaktif pada mode mobile.
- Kontras teks memenuhi standar WCAG 2.1 AA di seluruh komponen antarmuka.
- Struktur semantik HTML5 yang ramah navigasi keyboard dan screen reader.
