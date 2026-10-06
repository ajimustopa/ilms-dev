# LAPORAN PREFLIGHT CHECK — KESIAPAN IMPLEMENTASI UI PORTAL GURU

**Proyek:** Core Aldepos — Modul Portal Guru  
**Waktu Pemeriksaan:** 2026-10-07  
**Tipe Pemeriksaan:** Read-Only Preflight Verification  

---

## A. Tabel Ringkasan 8 Area Pemeriksaan

| No | Area Pemeriksaan | Status | Ringkasan Temuan & Bukti |
|---|---|---|---|
| **1** | **Repo & Git** | **PERLU PERBAIKAN** | • Branch aktif adalah `main` (seharusnya bekerja di feature branch seperti `feature/portal-guru-uiux` sesuai aturan repo).<br/>• Working tree memiliki modifikasi yang belum di-commit pada 9 file di `apps/core-portal/src/apps/guru/` dan 4 file/folder untracked.<br/>• Remote `origin` dan `prod` terpasang valid; riwayat commit terakhir masuk akal (`73774b2`, `4edf49f`, `5223593`). |
| **2** | **Stack & Perintah Dasar** | **SIAP** | • Frontend: React 18.3, Vite 5.4, React Router DOM 6.28, Tailwind CSS 3.4, Lucide React, Axios.<br/>• Backend: Node.js/Express, Knex 3.1, MySQL2/MariaDB, Zod.<br/>• Build test (`npm --workspace=apps/core-portal run build`) **berhasil 100% tanpa error** (`✓ built in 1m 15s`).<br/>• Skrip test/lint belum didefinisikan di `package.json` (sesuai catatan arsitektur T-005). |
| **3** | **Dokumen Acuan** | **SIAP** | • `docs/PRD-PORTAL-GURU-UIUX.md` (Ada, 451 baris, utuh).<br/>• `docs/AUDIT-PORTAL-GURU.md` (Ada, 686 baris, utuh).<br/>• `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` (Ada, 594 baris, utuh).<br/>• Path rujukan antar-dokumen saling terhubung dan konsisten. |
| **4** | **File Desain (`docs/design/`)** | **PERLU PERBAIKAN** | • 11 subfolder (`01-dashboard` s/d `11-profil`) lengkap dengan total 44 file (`.html` & `.png` mobile/desktop). Seluruh HTML valid & berpenutup `</html>`.<br/>• `docs/design/README.md` ada dan valid.<br/>• `docs/design/DESIGN.md` **belum disimpan** (token sudah diekstraksi dan menunggu persetujuan).<br/>• Terdapat sedikit inkonsistensi: `11-profil` desktop sidebar `w-[260px]` vs `w-64`, dan beberapa kelas `rounded-2xl` di mockups HTML yang dilarang oleh PRD (harus dinormalisasi ke `rounded-xl`). |
| **5** | **Rules & Workflows** | **PERLU PERBAIKAN** | • `.agent/rules/portal-guru.md` (Ada, mencakup larangan migrasi/seed tanpa izin, token desain, isolasi data guru, 4 state halaman, larangan duplikasi endpoint).<br/>• Folder `.agent/workflows/` (implementasi-halaman, verifikasi-halaman, audit-integrasi) **tidak ditemukan** di workspace. |
| **6** | **Modul Portal Guru yang Sudah Ada** | **SIAP** | • Struktur 11 halaman, konteks `TeacherContext`, dan auth hook telah ada di `apps/core-portal/src/apps/guru/`.<br/>• Seluruh route terdaftar di `apps/core-portal/src/router.jsx` (baris 1114–1245).<br/>• Seluruh service API di `src/apps/guru/services/` telah terhubung ke endpoint backend riil (`/kepegawaian/`, `/akademik/`, `/website-utama/`, `/core/`).<br/>• Komponen reusable tersedia: `AttendanceReminderBanner`, `BottomSheet`, `Button`, `Card`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `FormField`, `GuruBottomNav`, `GuruHeader`, `GuruLayout`, `PageHeader`, `QuickAttendanceModal`, `SegmentedTabs`, `SelectorKonteks`, `SelectSheet`, `Skeleton`, `StatusBadge`, `Toast`. |
| **7** | **Database & Lingkungan (Keselamatan)** | **SIAP** | • Konfigurasi Knex (`knexfile*.js`) di lingkungan dev menunjuk ke host lokal (`127.0.0.1` / default dev) dan database lokal (`*_local`). Tidak ada indikasi koneksi ke produksi.<br/>• Seluruh migrasi tabel yang dibutuhkan telah tersedia (`lesson_attendances`, `teaching_journals`, `employee_attendances`, `learning_objectives`, `student_incidents`, `counseling_records`).<br/>• Folder seeds tersedia lengkap per modul. |
| **8** | **MCP & Alat Bantu** | **SIAP** | • Subagent browser visual preview dan tool eksekusi command tersedia dan siap dipakai untuk verifikasi UI per halaman. |

---

## B. Matriks Kesiapan per Halaman

| Halaman | Desain Default Ada | Layar Khusus yang Belum Didesain (Sesuai README.md) | UI Lama Ada | API Terhubung | Risiko | Siap Dimulai? |
|---|---|---|---|---|---|---|
| **01-Dashboard** (`/guru/dashboard`) | Mobile & Desktop | Loading skeleton, empty state jadwal/pengumuman | Ada (`Dashboard.jsx`) | Terhubung (`attendanceService`, `scheduleService`, `announcementService`) | Rendah | **YA** |
| **02-Presensi Diri** (`/guru/absensi-diri`) | Mobile & Desktop | Sudah masuk, luar radius GPS, GPS lemah/offline, waktu pulang | Ada (`AbsensiPage.jsx`) | Terhubung (`/kepegawaian/attendances/*`) | Sedang (Logika GPS & Geofence) | **YA** |
| **03-Pengajuan Izin** (`/guru/absensi-diri#izin`) | Mobile & Desktop | Form pengajuan, modal preview bukti file surat izin | Ada (`IzinPage.jsx`) | Terhubung (`/kepegawaian/leave-requests/*`) | Rendah | **YA** |
| **04-Jadwal** (`/guru/jadwal`) | Mobile & Desktop | Mode tampilan mingguan, filter hari, empty jadwal libur | Ada (`JadwalPage.jsx`) | Terhubung (`/akademik/my-schedules`, `teaching-assignments`) | Rendah | **YA** |
| **05-Tujuan Pembelajaran** (`/guru/tujuan-pembelajaran`) | Mobile & Desktop | Form modal tambah/edit TP, drawer pilih rombel/mapel, konfirmasi hapus | Ada (`PerencanaanPage.jsx`) | Terhubung (`/akademik/curriculum/learning-objectives`) | Sedang (Form State & Validasi TP) | **YA** |
| **06-Absensi Kelas & Jurnal** (`/guru/absensi-kelas`) | Mobile & Desktop | Jurnal terbuka, bulk select 'Hadir Semua', siswa absen banyak | Ada (`PresensiSiswaPage.jsx`, `JurnalPage.jsx`) | Terhubung (`/akademik/lesson-attendances/bulk`, `teaching-journals`) | Sedang (Bulk Matrix Data) | **YA** |
| **07-Penilaian** (`/guru/penilaian`) | Mobile & Desktop | Tab Capaian TP, Tab Sikap/Karakter, lock status rapor, error input di luar 0-100 | Ada (`NilaiPage.jsx`) | Terhubung (`/akademik/scores/*`, `tp-scores/bulk`) | Sedang (Matrix Grid Input) | **YA** |
| **08-Siswa & Kontak Wali** (`/guru/siswa`) | Mobile & Desktop | Filter drawer rombel/status, kontak modal WhatsApp wali santri | Ada (`SantriPage.jsx`) | Terhubung (`/akademik/curriculum/class-groups/*/members`) | Rendah | **YA** |
| **09-Pengumuman** (`/guru/pengumuman`) | Mobile & Desktop | Detail modal/reader pengumuman, download attachment PDF | Ada (`PengumumanPage.jsx`) | Terhubung (`/website-utama/admin/news/teacher-announcements`) | Rendah | **YA** |
| **10-Kejadian & Konseling** (`/guru/kejadian-siswa`) | Mobile & Desktop | Form rekam insiden santri, tab Konseling Privat BK (akses terbatas) | Ada (`KejadianPage.jsx`, `KonselingPage.jsx`) | Terhubung (`/akademik/incidents`, `counseling-records`) | Sedang (Hak Akses Peran) | **YA** |
| **11-Profil & Akun** (`/guru/profil`) | Mobile & Desktop | Form ganti kata sandi, modal konfirmasi logout | Ada (`ProfilPage.jsx`) | Terhubung (`/kepegawaian/employees/me/profile`, `/core/users/change-password`) | Rendah | **YA** |

---

## C. Daftar Bloker & Perbaikan yang Diperlukan (Berdasarkan Urgensi)

1. **[PRIORITAS TINGGI] Pindah Branch Git dari `main`:**
   - **Masalah:** Saat ini branch aktif adalah `main` dengan working tree yang belum di-commit.
   - **Tindakan yang Diperlukan:** Buat feature branch khusus (misalnya `git checkout -b feature/portal-guru-uiux-refinement`) dan commit/stash perubahan lokal sebelum mulai memodifikasi kode.
2. **[PRIORITAS MENENGAH] Pembuatan & Persetujuan `docs/design/DESIGN.md`:**
   - **Masalah:** Token desain belum diformalkan ke dalam `docs/design/DESIGN.md`.
   - **Tindakan yang Diperlukan:** Simpan draf token yang telah disarikan ke file tersebut setelah persetujuan pengguna.
3. **[PRIORITAS MENENGAH] Normalisasi Token & Batasan Desain:**
   - **Masalah:** File mockups HTML masih mengandung variasi token Material Design 3 dan beberapa class `rounded-2xl` (16px).
   - **Tindakan yang Diperlukan:** Dalam implementasi React, batasi radius maksimal `rounded-xl` (12px) dan terapkan 4 pilar warna status Tailwind (Emerald, Rose, Amber, Indigo) sesuai PRD bagian 4.

---

## D. Urutan Implementasi yang Diusulkan

Urutan disusun dari fondasi layout & halaman operasional inti ke halaman penunjang:

1. **Tahap 0: Fondasi Sistem Desain & Shell Navigasi**
   - Penyelarasan `GuruLayout.jsx`, `GuruHeader.jsx`, `GuruBottomNav.jsx` (5-slot bar), dan drawer navigasi dengan token PRD.
2. **Tahap 1: 01-Dashboard (`/guru/dashboard`)**
   - Banner jadwal terdekat, quick attendance summary, ringkasan KPI mengajar, dan feed pengumuman singkat.
3. **Tahap 2: 02-Presensi Diri & 03-Pengajuan Izin (`/guru/absensi-diri`)**
   - Check-in/out GPS radar, status geofencing radius, dan modal form pengajuan izin/cuti beserta upload berkas.
4. **Tahap 3: 04-Jadwal Mengajar (`/guru/jadwal`)**
   - Tampilan jadwal KBM harian/mingguan dengan penanda sesi aktif.
5. **Tahap 4: 06-Absensi Kelas & Jurnal Mengajar (`/guru/absensi-kelas`)**
   - Quick check H/I/S/A, bulk "Hadir Semua", dan form jurnal KBM per jam pelajaran.
6. **Tahap 5: 05-Tujuan Pembelajaran (TP) & 07-Penilaian Siswa (`/guru/tujuan-pembelajaran`, `/guru/penilaian`)**
   - Entri TP materi dan lembar penilaian matrix (TP & Karakter).
7. **Tahap 6: 08-Siswa & Kontak Wali (`/guru/siswa`)**
   - Direktori santri rombel dan tautan cepat kontak wali santri.
8. **Tahap 7: 09-Pengumuman & 10-Kejadian/Konseling Siswa (`/guru/pengumuman`, `/guru/kejadian-siswa`)**
   - Feed pengumuman + modal reader, form pencatatan insiden/prestasi & konseling santri.
9. **Tahap 8: 11-Profil Guru (`/guru/profil`) & Final Polish**
   - Rincian biodata guru, pengaturan akun, dan audit komprehensif 4-state (loading, empty, error, offline).

---

## E. Pertanyaan yang Perlu Dijawab Sebelum Mulai

1. **Branch Git:** Apakah kita boleh membuat branch baru `feature/portal-guru-uiux-refinement` dan menyimpan/commit perubahan lokal yang ada sebelum mulai?
2. **Persetujuan DESIGN.md:** Apakah draf token di `docs/design/DESIGN.md` yang ditampilkan sebelumnya sudah disetujui untuk disimpan?
3. **Strategi Refactoring UI:** Apakah implementasi dilakukan secara bertahap per halaman (mulai dari Tahap 0: Layout + 01-Dashboard) dengan pengujian visual per layar?

---

## F. KEPUTUSAN PREFLIGHT

### **STATUS: GO BERSYARAT**

**Alasan:**
1. **Frontend & Backend sangat siap:** Kode aplikasi terstruktur rapi, seluruh service telah terhubung ke endpoint backend yang tepat, migrasi database lengkap, dan build Vite lulus 100%.
2. **Desain referensi lengkap:** Seluruh 11 halaman memiliki artefak HTML & PNG resolusi penuh.
3. **Syarat yang harus dipenuhi sebelum menulis kode:**
   - Pindah dari branch `main` ke feature branch baru.
   - Menyimpan `docs/design/DESIGN.md` yang telah disetujui.
