---
name: ALDEPOS Kepegawaian
colors:
  surface: '#f8f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#555c6d'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e7486'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#dce2f6'
  tertiary-fixed-dim: '#c0c6da'
  on-tertiary-fixed: '#151b2a'
  on-tertiary-fixed-variant: '#404757'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 1.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

Sistem desain ini dirancang khusus untuk platform tata kelola kepegawaian yayasan pendidikan Islam dan modern (HRIS Sekolah). Karakter visual menggabungkan ketelitian operasional enterprise dengan ketenangan institusional.

- **Kepribadian:** Tertib, terpercaya, modern, dan efisien. Mengurangi beban kognitif pengelola sekolah melalui visual yang terstruktur dan higienis.
- **Audiens Target:** Operator yayasan, kepala sekolah, bagian tata usaha (TU), dan tim audit penggajian/SDM.
- **Pendekatan Gaya:** Modern Corporate Enterprise dengan kontras fungsional ganda (*dual-tone context*). Navigasi global memanfaatkan sidebar gelap (*dark navy*) untuk fokus struktural, sementara kanvas kerja menggunakan latar terang berdensitas tinggi (*high-density data surface*) untuk kenyamanan membaca data numerik, presensi, dan riwayat guru/staf.

## Colors

Palet warna dibangun untuk mendukung kejelasan status hierarki kepegawaian dan kepatuhan administrasi:

- **Primary (`#059669` / Emerald Green):** Melambangkan kestabilan dan integritas yayasan. Digunakan untuk tombol utama, indikator aktif, verifikasi data, dan status "Hadir" atau "Aktif". Varian hover berada pada `#047857`.
- **Secondary (`#0284C7` / Blue Accent):** Digunakan untuk status informasi, berkas SK, penugasan struktural, serta badge informatif dengan latar `#E0F2FE`.
- **Sidebar & Chrome Navigasi (`#0B1220` / Dark Navy):** Digunakan eksklusif pada bilah navigasi samping untuk memberikan pemisahan tegas antara navigasi sistem dan ruang kerja. Border navigasi memakai `#1E293B`, latar hover menu menggunakan `#111B2E`, teks redup `#94A3B8`, dan status aktif `#FFFFFF`.
- **Neutral Surface & Canvas:** Kanvas utama menggunakan `#F6F8FA` untuk meredam silau layar monitor harian. Panel kartu, tabel, dan formulir menggunakan `#FFFFFF` solid dengan pembatas border `#E2E8F0`.
- **Tipografi Netral:** Teks utama memakai `#0F172A` (Slate-900) untuk tingkat keterbacaan kontras tinggi, sedangkan teks sekunder atau metadata menggunakan `#64748B` (Slate-500).

## Typography

Sistem tipografi dioptimalkan untuk kepadatan data tinggi (*high-density administration*):
- Menggunakan keluarga font **Inter** secara konsisten dari judul hingga label mikro data tabel.
- Ukuran teks standar operasional dititikberatkan pada rentang 11px hingga 14px untuk memaksimalkan jumlah baris tabel dan metrik KPI tanpa mengorbankan keterbacaan.
- Angka numerik pada modul penggajian (*payroll*), NIP, dan jam mengajar wajib mengaktifkan fitur tabular font (`font-variant-numeric: tabular-nums`) untuk memastikan kesejajaran vertikal sempurna.

## Layout & Spacing

Tata letak mengadopsi model dasbor desktop-first dengan sidebar persisten:
- **Sidebar Terkunci:** Lebar standar desktop 260px (dapat diciutkan menjadi 72px icon-only).
- **Kanvas Utama:** Menggunakan grid adaptif 12 kolom dengan jarak gutter desktop 24px (`1.5rem`) dan margin luar 28px (`1.75rem`).
- **Densitas Komponen:** Memakai ritme kelipatan 4px/8px yang diperketat. Jarak padding internal kartu menggunakan `space-xl` (24px) untuk container utama, dan `space-md` (12px) untuk padding sel tabel dan formulir kompak.
- **Adaptasi Mobile/Tablet:** Pada breakpoint di bawah 1024px, sidebar bertransformasi menjadi off-canvas drawer modal dengan tombol pemicu navigasi di topbar header.

## Elevation & Depth

Sistem kedalaman mengutamakan penegasan batas (*border-first structure*) daripada bayangan tebal:
- **Tingkat 0 (Kanvas Dasar):** `#F6F8FA` tanpa bayangan.
- **Tingkat 1 (Kartu & Panel Data):** Background `#FFFFFF`, garis pembatas `1px solid #E2E8F0`, dan bayangan mikro ambient: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Tingkat 2 (Dropdown, Popover, Filter Panel):** `1px solid #E2E8F0`, bayangan menengah: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Tingkat 3 (Modal Dialog & Drawer):** `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)` dengan backdrop overlay `rgba(11, 18, 32, 0.5)`.

## Shapes

Bahasa bentuk mengusung kenyamanan visual modern yang rapi:
- Kartu modul, kontainer tabel, dan modal dialog menggunakan kelengkungan `rounded-xl` (12px).
- Komponen interaktif input field, tombol, dan dropdown menu menggunakan kelengkungan `rounded-lg` (8px - 10px).
- Tag status, lencana verifikasi, dan avatar profil staf menggunakan kelengkungan kapsul penuh (*pill-shaped*).

## Components

### Tombol (Buttons)
- **Primary:** Latar `#059669`, teks putih, radius 8-10px, tinggi kompak 36px untuk desktop. Hover: `#047857`. Focus ring: 2px offset dengan warna `#059669`.
- **Secondary / Outline:** Latar transparan atau putih, border `1px solid #E2E8F0`, teks `#0F172A`. Hover: latar `#F8FAFC`, border `#CBD5E1`.
- **Ghost / Action Icon:** Latar transparan, warna ikon `#64748B`. Hover: latar `#F1F5F9`, ikon `#0F172A`.

### Kartu (Cards) & Wadah Data
- Latar belakang `#FFFFFF`, sudut 12px, border `1px solid #E2E8F0`. Header kartu dipisahkan oleh garis border tipis jika memuat aksi pencarian atau ekspor data.

### Kolom Input & Form
- Tinggi default 36px (ukuran kompak 32px untuk filter tabel). Latar `#FFFFFF`, border `1px solid #CBD5E1`, sudut 8px.
- Placeholder memakai `#94A3B8`. Keadaan fokus: border `#059669` dengan ring lembut `0 0 0 3px rgba(5, 150, 105, 0.15)`.

### Lencana Status (Badges & Chips)
- Tipografi ukuran 11px (label-xs) semi-bold, radius penuh (*pill*).
- **Status Aktif/Hadir:** Latar `#ECFDF5`, teks `#047857`, titik indikator hijau `#10B981`.
- **Status Penugasan/SK/Info:** Latar `#E0F2FE`, teks `#0369A1`.
- **Status Cuti/Izin:** Latar `#FEF3C7`, teks `#B45309`.
- **Status Nonaktif/Peringatan:** Latar `#FEE2E2`, teks `#B91C1C`.

### Tabel Kepegawaian (Data Tables)
- Header tabel: latar `#F8FAFC`, teks `#475569`, ukuran 12px huruf kapital terstruktur (*uppercase tracking*), border bawah `1px solid #E2E8F0`.
- Baris tabel: tinggi baris 48px, teks 13px reguler, efek hover baris `#F8FAFC`.

### Modul Khusus: Indikator Matriks Mengajar & Sertifikasi
- Komponen bar kemajuan (*progress bar*) setinggi 6px dengan latar `#E2E8F0` dan indikator `#059669` untuk memonitor pemenuhan beban 24 jam mengajar mingguan guru sertifikasi.