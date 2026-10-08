# Rencana Implementasi Redesign Login & Portal (Aldepos ILMS)

**Status:** Draf Rencana Tahap 0 (Pra-Implementasi)  
**Dokumen Rujukan:** `docs/design/design-login-portal/aldepos_ilms/DESIGN.md`, `apps/core-portal/PANDUAN-DESAIN-UI.md`, `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md`, `docs/security.md`  
**Nama Produk Resmi:** **Aldepos ILMS** (Integrated Learning Management System) — *Bukan Aldepos Quantum*.  
**Cakupan Tahapan:** Tahap 0 dari 8 Tahap (Hanya penulisan dokumen perencanaan, tanpa perubahan kode aplikasi).

---

## A. ATURAN WAJIB (Berlaku untuk Tahap 1 – 7)

1. **Sumber visual:** Folder `docs/design/design-login-portal/`. Berkas `code.html` di setiap subfolder varian hanya berfungsi sebagai referensi struktur DOM dan gaya visual. **DILARANG MENYALIN MENTAH `code.html`:** dilarang memakai Tailwind CDN, dilarang memuat font/ikon eksternal dari CDN (Material Symbols, Google Fonts link tag runtime, dll.), dan dilarang menambah dependensi npm baru tanpa persetujuan. Seluruh visual wajib diterjemahkan ke Tailwind CSS 3.4 proyek (`apps/core-portal/tailwind.config.js`) dan paket ikon `lucide-react` (^0.395.0) yang sudah terpasang.
2. **File TERLARANG diubah:**
   - `apps/core-portal/src/shared/store/AuthContext.jsx`
   - `apps/core-portal/src/shared/services/api.js`
   - `apps/core-portal/src/shared/utils/authHelper.js`
   - `apps/core-portal/src/router.jsx`  
   *Bila dalam implementasi dirasa perlu mengubah file-file ini, STOP pengerjaan dan laporkan alasannya secara formal.*
3. **Integritas Autentikasi & Navigasi:** Perilaku autentikasi, alur pengalihan URL (mis. kasir kantin wajib redirect otomatis ke `/kantin/pos`, pengguna umum kembali ke `location.state.from` atau `/`), mekanisme penyimpanan sesi di `localStorage`, sinkronisasi token, dan logika hak akses role terhadap modul (`MODULE_ACCESS_MAP` / RBAC) **TIDAK BOLEH BERUBAH SEDIKITPUN**.
4. **Disiplin Fitur:** Dilarang menambah elemen UI interaktif fiktif atau fitur di luar desain dan rencana tertulis. Segala bentuk penyempurnaan atau ide tambahan hanya dicatat sebagai usulan di laporan/backlog.
5. **Animasi & Estetika Ringan:** Tanpa library animasi pihak ketiga (Framer Motion dll.). Seluruh animasi wajib murni menggunakan CSS / Tailwind utilities dengan dukungan penuh `@media (prefers-reduced-motion: reduce)` (fallback tanpa pergeseran posisi). Tidak ada background gradasi liar, tidak ada efek blur/glassmorphism berat, dan hanya menggunakan tipografi **Inter**, kecuali dinyatakan lain oleh kesepakatan konflik desain.
6. **Mobile-First & Ergonomi:** Target sentuh interaktif minimum 44×44px (standar tombol/input 48–52px pada mobile), input font-size minimal 16px (mencegah auto-zoom iOS Safari), memanfaatkan `100dvh` dan safe-area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), serta zero horizontal scrollbar pada rentang viewport 360px – 430px.
7. **Standar Kualitas & Verifikasi Tiap Tahap:** Setiap tahap implementasi harus memastikan perintah `npm run build` pada `apps/core-portal` menghasilkan **exit code 0** (tanpa error sintaks/tipe/lint). Hasil diverifikasi pada viewport mobile (390×844px) dan desktop (1440×900px).
8. **Mode Gelap (Dark Mode):** Pertahankan kompatibilitas tema gelap dan terang yang tersimpan pada `localStorage.getItem('portal_theme')`. Desain Stitch varian terang dipetakan ke tema default, sedangkan varian gelap diturunkan secara konsisten menggunakan token `slate-900` / `slate-950` / `emerald-950` sesuai panduan enterprise.

---

## B. Inventaris Layar & State

Folder ekspor Google Stitch (`docs/design/design-login-portal/`) memuat 8 set layar utama dan 1 master visual identitas (`logo_baru_1.png`). Berikut adalah inventarisasi lengkap layar, breakpoint acuan, elemen utama, dan state yang divisualkan:

| No | Folder Varian | Breakpoint / Dimensi Desain | Elemen Utama | State yang Divisualkan |
|---|---|---|---|---|
| 1 | `aldepos_ilms_portal_login_main_state` | Desktop (1440×900 / export: 1600×1280) | - Split-screen: 55% Left Brand Panel, 45% Right Form Card<br>- Left: SVG Islamic lattice watermark, Logo Aldepos ILMS, Badge Yayasan, 3 Feature Pillars (SSO, Granular RBAC, Integrasi Multikampus), Version info & Live pulse status<br>- Right: Language switch (ID/EN), Theme toggle, Segmented identifier tab (Nama Pengguna vs Email/NIP), Form login (Username, Password + Visibility toggle, Policy checkbox), Submit button, Helpdesk footer | **Default / Pristine Form State (Desktop)**: Form siap diisi, kredensial kosong, feedback motion spec discrete tag di sudut kanan bawah. |
| 2 | `aldepos_ilms_mobile_login_default_state` | Mobile (390×844 / export: 487×1088) | - Top Brand Band (Solid Deep Emerald 228px dengan Islamic lattice overlay, Monogram logo, ILMS title, system pills)<br>- Overlapping bottom card (rounded-t-[20px] offset -24px)<br>- Tab switch (Username vs Email/NIP), input field 48px, toggle visibility, policy checkbox, submit CTA 52px, security badge footer | **Default / Pristine State (Mobile)**: Tampilan bersih tanpa keyboard aktif, header utuh 228px. |
| 3 | `aldepos_ilms_mobile_login_keyboard_error_state` | Mobile (390×844 / export: 487×1015) | - Collapsed Header (menyusut dari 228px ke 56px saat keyboard naik)<br>- Error Banner dismissible (Rose container, alert text sisa percobaan)<br>- Username input: Valid state (Checkmark hijau)<br>- Password input: Error state (border rose, bg rose tint, lock_reset icon)<br>- Persistent session toggle & countdown (Sesi: 8 jam)<br>- Simulated native touch keyboard viewport fitting | **Active Error + Focused / Virtual Keyboard State**: Menampilkan respons error 401, field validation feedback, dan kemampuan viewport tidak terpotong saat keyboard muncul. |
| 4 | `aldepos_ilms_portal_launcher_main_grid_state` | Desktop (1440×900 / export: 1600×1512) | - Sticky Top Header (Logo + Portal text, School Unit selector button, Global Search bar + Ctrl+K badge, Main Nav items, Notifications bell + red dot, Theme toggle, User avatar + Role label)<br>- Greeting Hero Banner (Deep emerald container + lattice pattern, Welcome name, Role pill, TA & Semester active, System status pill)<br>- Shelf "Terakhir Dibuka" (Grid 4 kolom kartu cepat)<br>- Section "Modul Utama" (Grid 6 kolom desktop, total 12 modul aktif)<br>- Section "Segera Hadir" (Grid 6 kolom desktop, 5 modul masa depan opacity 75%)<br>- Interactive Tooltip hover & Motion spec guide note<br>- Footer institusi terpadu | **Master Launcher Dashboard State (Desktop)**: Seluruh modul terpetakan, hover preview pada salah satu tile modul (Keuangan & Kasir), quick-shelf aktif. |
| 5 | `aldepos_ilms_portal_launcher_interaction_variants_empty_state` | Desktop Blueprint (Export: 973×1600) | Tiga sub-frame interaksi desktop:<br>1. *Frame 1:* School-Unit Switcher Dropdown Opened (Popover 280px, unit aktif bertanda checkmark hijau, tombol kelola unit).<br>2. *Frame 2:* Live Query Search Isolation (Input query 'keu', highlight match mark, FLIP animation grid, 2 ghost indicator cards).<br>3. *Frame 3:* Empty Access State (Akun tervalidasi tapi role kosong / 0 modul, ID user chip copyable, tombol Ajukan Akses & Bantuan IT). | **Interaction & Edge States (Desktop)**: Mengatur detail UX ketika berpindah unit sekolah, mencari modul, dan ketika staf belum memiliki hak akses RBAC sama sekali. |
| 6 | `aldepos_ilms_mobile_launcher_main_screen` | Mobile (390×844 / export: 428×1600) | - Fixed Top Bar (360–430px safe area, Brand + Monogram, User Avatar AF)<br>- Greeting Card kompak dengan lattice background<br>- Search input bar (48px) & School Unit Chip selector<br>- Horizontal Scroll Shelf "Terakhir Dibuka" (touch scroll-snap)<br>- Modul Utama: Grid 4 kolom mobile (12 modul, touch tile 60×60px)<br>- Segera Hadir: Grid 4 kolom mobile (5 modul upcoming)<br>- Sticky Bottom Bar ringkas (System status & Version) | **Master Launcher State (Mobile)**: Akses cepat satu jempol, scroll vertikal mulus, layout padat tanpa clipping. |
| 7 | `aldepos_ilms_mobile_launcher_bottom_sheets_empty_state` | Mobile Blueprint (Export: 487×1105) | Tiga sub-modal mobile bottom sheet:<br>1. *Sheet 1:* School-Unit Switcher Sheet (drag handle, daftar unit dengan radio check, tombol kelola).<br>2. *Sheet 2:* User Profile Menu Sheet (Avatar besar, email, link Panel Pengguna, Pengaturan, Ganti Kata Sandi, Keluar Akun rose).<br>3. *Sheet 3:* Zero Module Empty State (Shield icon, User ID copyable pill, CTA Pengajuan Akses). | **Overlay & Bottom Sheet Drawer States (Mobile)**: Transisi bottom-sheet slide-up 300ms dengan backdrop blur/dim ringan. |
| 8 | `aldepos_ilms_error_loading_state_variants` | Side-by-Side Blueprint (Export: 1600×1486) | Dua varian kartu login berdampingan:<br>- *Variant A (Error State):* Error alert box amber-rose, shake animation, valid username check, red-focused password.<br>- *Variant B (Loading/Async State):* Form locked (`pointer-events-none`), spinner SVG pada CTA submit ("Memverifikasi Akun..."), feedback teks handshake database, status TLS secure bar. | **Async Lifecycle & Validation State Matrix**: Menjamin transisi mulus saat pengguna menekan tombol Masuk dan menangani kegagalan kredensial. |

---

## C. Token Desain dari Desain Stitch & Pemetaan ke Token Proyek

### 1. Tabel Pemetaan Warna

| Token Stitch (DESIGN.md) | Hex Stitch | Token Proyek Terdekat (`PANDUAN-DESAIN-UI.md` / Tailwind) | Usulan Resolusi & Standardisasi |
|---|---|---|---|
| `primary` | `#00652c` | `brand-800` (`#166534`) / `emerald-700` (`#15803d`) | **Pakai `brand-700` (`#15803d`)** sebagai warna primer interaktif utama agar selaras dengan modul Keuangan. `#00652c` dipetakan ke `brand-800`. |
| `primary-container` | `#15803d` | `brand-700` (`#15803d`) | **Identik** (`emerald-700`). Digunakan untuk tombol utama dan kartu fokus. |
| `dark-emerald` (Hero) | `#14532d` | `brand-900` (`#14532d`) | **Identik** (`emerald-900`). Digunakan untuk panel kiri Login dan Banner Greeting Launcher. |
| `surface` / `background` | `#f8f9ff` | `slate-50` (`#f8fafc`) / `slate-100` (`#f1f5f9`) | **Konflik Kecil:** Stitch memakai tint kebiruan `#f8f9ff`. **Resolusi:** Untuk halaman Login dan Launcher, gunakan canvas `bg-slate-50` (`#f8fafc`) atau surface container `#f1f5f9` agar tidak menciptakan deviasi warna latar global. |
| `on-surface` (Text) | `#0d1c2f` | `slate-900` (`#0f172a`) / `slate-800` (`#1e293b`) | **Pakai `slate-900` (`#0f172a`)**. Sangat dekat (perbedaan visual < 1%), mematuhi token netral panduan enterprise. |
| `on-surface-variant` | `#3f493f` / `#334155` | `slate-600` (`#475569`) / `slate-700` (`#334155`) | **Pakai `slate-600` / `slate-700`** untuk label sekunder dan subjudul. |
| `outline` | `#6f7a6e` / `#64748b` | `slate-500` (`#64748b`) | **Pakai `slate-500`** untuk ikon sekunder & border default. |
| `outline-variant` (Border) | `#becabc` / `#cbd5e1` | `slate-200` (`#e2e8f0`) / `slate-300` (`#cbd5e1`) | **Pakai `border-slate-200` (atau `border-slate-200/80`)**. Sesuai aturan border 1px solid enterprise. |
| `error` / `tertiary` | `#ba1a1a` / `#e11d48` | `rose-600` (`#e11d48`) | **Pakai `rose-600` / `rose-700`** untuk error, logout, dan alert destruktif. |
| `error-container` | `#ffdad6` / `#ffe4e6` | `rose-50` (`#fff1f2`) / `rose-100` (`#ffe4e6`) | **Pakai `rose-50` / `rose-100`** untuk background box pesan error. |
| `secondary-container` | `#b1f2be` / `#dcfce7` | `emerald-100` (`#dcfce7`) | **Pakai `emerald-100`** untuk chip role & pill sukses. |

### 2. Tabel Tipografi, Radius, Shadow & Spacing

| Kategori | Nilai Desain Stitch | Standar Proyek (`PANDUAN-DESAIN-UI.md`) | Resolusi |
|---|---|---|---|
| **Font Family** | Inter (100–900) | Inter (Google Fonts) | **Sama:** Hanya gunakan font Inter. |
| **Tabular Numbers** | Tabular figures (`tnum`) | `.tnum`, `.num-cell` (`index.css`) | **Wajib:** Terapkan `.tnum` pada tahun ajaran, angka versi, ID pengguna, dan badge count. |
| **Radius Kartu** | `12px` (`rounded-xl` / `rounded-lg`) | `rounded-lg` (8px) untuk kartu, `rounded-xl` (12px) untuk modal/section banner | **Sesuai:** Banner hero & modal drawer = `rounded-xl` (12px); tile modul, input, dan kartu cepat = `rounded-lg` (8px). Dilarang `rounded-2xl` / `rounded-3xl`. |
| **Radius Tombol/Input** | `8px` (`rounded-md` / `rounded-lg`) | `rounded-lg` (8px) | **Sama:** `rounded-lg` (8px). |
| **Radius Badge/Chip** | `4px` – `9999px` (Pill) | `rounded` (4px) / `rounded-full` untuk badge status | **Resolusi:** Chip satuan pendidikan dan role menggunakan `rounded-full` ringkas; tag spesifikasi & status badge menggunakan `rounded` (4px) sesuai panduan enterprise. |
| **Shadow** | Flat 1px border; modal `shadow-lg`/`shadow-xl`; no diffuse drop-shadows | Border 1px solid `slate-200`, `shadow-xs` / `shadow-sm` | **Sama:** Elemen kartu flat dengan border hairline 1px solid, bayangan hanya pada modal dropdown/bottom sheet. |
| **Tinggi Input/Tombol** | Input 40px (desktop) & 48px (mobile); CTA 48px – 52px | 36px – 40px (desktop), min 44px (mobile touch) | **Sesuai:** Desktop standard 40px, Mobile comfortable 48–52px untuk touch target accessibility. |

### 3. Daftar Konflik Desain vs Panduan & Usulan Penyelesaian

1. **Konflik 1: Logo Produk ("Aldepos ILMS" vs "Aldepos Quantum" vs "ALDEPOS Core")**
   - *Temuan:* Pada kode lama terdapat inkonsistensi penamaan ("Aldepos Quantum", "Aldepos Core", "Yayasan Aldepos"). Di desain Stitch tercantum konsisten **"Aldepos ILMS"** (Sistem Informasi Sekolah).
   - *Penyelesaian:* **Desain Stitch menang.** Semua label brand teks di Login dan Launcher distandarkan menjadi **"Aldepos ILMS"** (dengan subteks "Sistem Informasi Sekolah / Pesantren").
2. **Konflik 2: Navigasi Header Launcher (Tabs "Academic", "Tahfidz", "Finance" di Navbar)**
   - *Temuan:* Pada desain desktop Launcher (`aldepos_ilms_portal_launcher_main_grid_state/code.html`), terdapat navlink horizontal di top header ("Academic", "Tahfidz", "Finance", "Boarding"). Namun portal saat ini adalah Hub Launcher berbasis hak akses dinamis (RBAC), di mana setiap modul dibuka melalui Grid Modul atau routing modul masing-masing.
   - *Penyelesaian:* Header atas desktop difokuskan pada: Logo Brand, Unit Selector (KMI / SMA / SMP / Yayasan), Global Search Filter (`Ctrl+K`), Theme Toggle, Notifications (Placeholder disabled / counter riil), dan User Avatar Dropdown. Link modul spesifik di navbar atas disederhanakan/disembunyikan agar tidak memecah arsitektur navigasi dinamis RBAC.
3. **Konflik 3: Watermark Ornamen Geometris Islami (SVG Lattice Mesh)**
   - *Temuan:* Panduan UI melarang dekorasi berlebihan / ilustrasi kartun, tetapi desain Stitch memperkenalkan ornamen tone-on-tone Islamic 8-Point Star geometric mesh dengan opasitas sangat rendah (3%–11%) pada panel hijau institusi.
   - *Penyelesaian:* Ornamen garis geometris hairline (Lattice Pattern) ini **diterima** sebagai komponen identitas brand resmi (`LatticePattern.jsx`), karena bersifat flat, monokrom tone-on-tone, tidak menggunakan gradasi, dan memberikan wibawa institusional pesantren modern tanpa mengganggu keterbacaan data.

---

## D. Pohon Komponen yang Diusulkan

Arsitektur folder frontend dipecah secara modular, modular-clean, dan reusable di bawah `apps/core-portal/src/`:

```
apps/core-portal/src/
├── shared/
│   └── components/
│       └── brand/
│           ├── BrandLogo.jsx             # Render logo monogram 'A' / full logo SVG/PNG adaptif
│           ├── LatticePattern.jsx         # SVG Islamic 8-point geometric watermark tone-on-tone
│           └── SystemStatusBadge.jsx      # Live ping green dot & server version indicator
├── apps/
│   └── core/
│       └── pages/
│           ├── Login.jsx                 # Entry point Login (menggabungkan container & responsive layout)
│           └── login/
│               ├── LoginBrandPanel.jsx   # Panel kiri 55% desktop (Manifesto, Pillars, Lattice, Badge)
│               ├── LoginFormCard.jsx     # Kartu form autentikasi (Tabs identifier, Inputs, Action CTA)
│               ├── LoginMobileHeader.jsx # Header mobile 228px -> 56px collapsible
│               └── LoginErrorAlert.jsx   # Banner notifikasi kesalahan login & retry counter
└── pages/
    ├── Launcher.jsx                      # Entry point Portal Launcher (state search, unit, modal)
    └── launcher/
        ├── LauncherHeader.jsx            # Top bar (Logo, Unit Switcher, Search input, Profile menu)
        ├── LauncherGreetingHero.jsx      # Banner hijau sapaan (Nama user, Role, TA/Semester, Status)
        ├── LauncherRecentShelf.jsx       # Section "Terakhir Dibuka" (4 modul akses cepat)
        ├── LauncherModuleGrid.jsx        # Grid utama 12 modul aktif dengan RBAC filter
        ├── LauncherUpcomingSection.jsx   # Section 5 modul "Segera Hadir" (opacity 75%)
        ├── LauncherUnitModal.jsx         # Dropdown popover (Desktop) & Bottom Sheet (Mobile)
        ├── LauncherProfileModal.jsx      # User profile dropdown / drawer (Ganti sandi, logout)
        └── LauncherEmptyAccess.jsx       # Tampilan fallback zero-access (ID copy & request access)
```

### Rincian Props & Konsumen Komponen:

| Komponen | Lokasi File | Props Utama | Konsumen | Deskripsi / Tanggung Jawab |
|---|---|---|---|---|
| `BrandLogo` | `src/shared/components/brand/BrandLogo.jsx` | `variant: 'full'|'symbol'|'monogram'`, `size: 'sm'|'md'|'lg'`, `theme: 'light'|'dark'|'white'`, `className?: string` | `Login.jsx`, `LauncherHeader.jsx`, `LoginMobileHeader.jsx` | Merender logo resmi Aldepos ILMS (simbol geometris atau teks lengkap) secara konsisten dan tajam. |
| `LatticePattern` | `src/shared/components/brand/LatticePattern.jsx` | `opacity?: number`, `color?: string`, `animated?: boolean`, `density?: 'fine'|'normal'` | `LoginBrandPanel.jsx`, `LoginMobileHeader.jsx`, `LauncherGreetingHero.jsx` | Pola garis bintang 8-titik geometris Islami inline SVG dengan dukungan animasi *slow ambient drift*. |
| `SystemStatusBadge` | `src/shared/components/brand/SystemStatusBadge.jsx` | `version?: string`, `isOnline?: boolean`, `variant?: 'pill'|'text'` | `LoginBrandPanel.jsx`, `LauncherGreetingHero.jsx`, `LauncherHeader.jsx` | Menampilkan indikator sistem aktif (dot hijau berdenyut) dan string versi aman. |
| `LoginBrandPanel` | `src/apps/core/pages/login/LoginBrandPanel.jsx` | `version: string` | `Login.jsx` (Desktop View `lg:flex`) | Menampilkan wibawa institusi, 3 pilar sistem (SSO, RBAC, Multikampus), dan hak cipta yayasan. |
| `LoginFormCard` | `src/apps/core/pages/login/LoginFormCard.jsx` | `username, setUsername, password, setPassword, activeTab, setActiveTab, showPassword, setShowPassword, rememberMe, setRememberMe, handleSubmit, isLoading, errorMsg, fieldErrors` | `Login.jsx` | Kartu input interaktif login, toggle password, tab pemilih username/email, dan tombol masuk. |
| `LoginMobileHeader` | `src/apps/core/pages/login/LoginMobileHeader.jsx` | `isCollapsed: boolean, onToggleTheme: () => void, isDarkMode: boolean` | `Login.jsx` (Mobile View `lg:hidden`) | Header hijau atas mobile yang menyusut mulus saat fokus input / keyboard aktif. |
| `LauncherGreetingHero` | `src/pages/launcher/LauncherGreetingHero.jsx` | `userName: string, userRoleLabel: string, academicYearText?: string, semesterText?: string` | `Launcher.jsx` | Banner sambutan pengguna dengan latar hijau institusi dan metadata sesi aktif. |
| `LauncherRecentShelf` | `src/pages/launcher/LauncherRecentShelf.jsx` | `recentModules: Array<ModuleItem>, onSelectModule: (path: string) => void` | `Launcher.jsx` | Rak horizontal akses cepat untuk 4 modul yang terakhir kali dikunjungi pengguna. |
| `LauncherModuleGrid` | `src/pages/launcher/LauncherModuleGrid.jsx` | `modules: Array<ModuleItem>, searchQuery: string, onSelectModule: (path: string) => void` | `Launcher.jsx` | Grid interaktif modul (12 modul utama) lengkap dengan status akses dan animasi filter. |
| `LauncherUnitModal` | `src/pages/launcher/LauncherUnitModal.jsx` | `isOpen: boolean, onClose: () => void, units: Array<Unit>, activeUnitId: number, onSelectUnit: (id: number) => void, isMobile?: boolean` | `Launcher.jsx` | Modal / bottom-sheet pemilihan satuan pendidikan (SMA, SMP, KMI, Yayasan Pusat). |
| `LauncherProfileModal` | `src/pages/launcher/LauncherProfileModal.jsx` | `isOpen: boolean, onClose: () => void, user: Object, onLogout: () => void, isMobile?: boolean` | `Launcher.jsx` | Drawer/popover profil pengguna dengan tombol Ganti Kata Sandi dan Keluar. |
| `LauncherEmptyAccess` | `src/pages/launcher/LauncherEmptyAccess.jsx` | `user: Object` | `Launcher.jsx` | Layar informatif jika pengguna belum mendapatkan penugasan role modul apapun. |

---

## E. Tabel Pemetaan Ikon (Material Symbols → `lucide-react` v0.395.0)

Semua ikon di desain Stitch yang menggunakan Material Symbols wajib diterjemahkan ke ikon `lucide-react` yang telah terverifikasi ada pada `node_modules` proyek:

| Ikon di Desain Stitch (Material Symbols) | Padanan Resmi `lucide-react` (^0.395.0) | Status Verifikasi di Proyek | Keterangan / Konteks Pemakaian |
|---|---|---|---|
| `verified_user`, `admin_panel_settings`, `shield` | `ShieldCheck` / `Shield` | **Tersedia (True)** | Pilar SSO, Modul Administrasi Sistem (Core), Status Keamanan |
| `badge`, `co_present` | `Badge` (atau `UserCheck` / `Users2`) | **Tersedia (True)** | Pilar Akses Peran, Modul SDM & Kepegawaian, Portal Guru |
| `hub`, `language`, `public` | `Globe` / `Compass` | **Tersedia (True)** | Pilar Integrasi Multikampus, Website Utama |
| `person`, `account_circle` | `User` | **Tersedia (True)** | Input username, Avatar profil user |
| `mail`, `forward_to_inbox`, `outgoing_mail` | `Mail` / `Send` | **Tersedia (True)** | Input email, CTA Kirim Pengajuan Akses |
| `lock`, `lock_reset`, `password` | `Lock` / `KeyRound` | **Tersedia (True)** | Input password, Ganti Kata Sandi |
| `visibility`, `visibility_off` | `Eye` / `EyeOff` | **Tersedia (True)** | Toggle lihat/sembunyikan kata sandi |
| `arrow_forward`, `navigate_next`, `chevron_right` | `ArrowRight` / `ChevronRight` | **Tersedia (True)** | Tombol submit, Navigasi baris modul |
| `check`, `check_circle` | `Check` / `CheckCircle2` | **Tersedia (True)** | Validasi field sukses, Radio terpilih unit |
| `close`, `cancel` | `X` / `AlertCircle` | **Tersedia (True)** | Tutup modal/banner, Pesan kesalahan input |
| `search` | `Search` | **Tersedia (True)** | Kotak pencarian modul |
| `domain`, `apartment`, `account_balance` | `Building2` / `Building` | **Tersedia (True)** | Satuan pendidikan, Kantor Yayasan Pusat |
| `school` | `GraduationCap` / `School` | **Tersedia (True)** | Modul Akademik & Kurikulum |
| `calculate`, `account_balance_wallet`, `payments` | `Calculator` / `Wallet` | **Tersedia (True)** | Modul Keuangan & Kasir Digital |
| `menu_book`, `auto_stories` | `BookOpen` | **Tersedia (True)** | Modul Tahfidz & Al-Qur'an |
| `domain_add` | `Building2` / `Boxes` | **Tersedia (True)** | Modul Sarana & Prasarana (Sarpras) |
| `local_library` | `Library` / `BookOpen` | **Tersedia (True)** | Modul Perpustakaan Digital |
| `monitoring` | `BarChart3` / `Activity` | **Tersedia (True)** | Modul Manajemen Mutu |
| `restaurant` | `Utensils` | **Tersedia (True)** | Modul Kantin Digital |
| `inventory_2` | `Boxes` / `Warehouse` / `ChefHat` | **Tersedia (True)** | Modul Dapur & Logistik |
| `military_tech`, `trophy` | `Trophy` | **Tersedia (True)** | Modul Kesiswaan & Prestasi (Segera Hadir) |
| `quiz` | `FileText` / `HelpCircle` | **Tersedia (True)** | Modul Ujian Daring & CBT (Segera Hadir) |
| `person_add` | `UserPlus` | **Tersedia (True)** | Modul PPDB & Seleksi (Segera Hadir) |
| `psychology`, `explore` | `Compass` / `HeartHandshake` | **Tersedia (True)** | Modul Bimbingan & Konseling (Segera Hadir) |
| `diversity_3` | `Users` / `Users2` | **Tersedia (True)** | Modul Tracer Study & Alumni (Segera Hadir) |
| `notifications` | `Bell` | **Tersedia (True)** | Lonceng notifikasi header |
| `light_mode`, `dark_mode` | `Sun` / `Moon` | **Tersedia (True)** | Toggle tema terang / gelap |
| `unfold_more`, `expand_more` | `ChevronDown` | **Tersedia (True)** | Dropdown unit selector |
| `open_in_new` | `ExternalLink` | **Tersedia (True)** | Tautan keluar / buka tab baru |
| `content_copy` | `Copy` | **Tersedia (True)** | Salin ID Pengguna pada empty state |
| `refresh`, `autorenew`, `sync` | `RefreshCw` / `RotateCcw` | **Tersedia (True)** | Reset pencarian, Indikator sinkronisasi |
| `tune` | `Sliders` / `Settings` | **Tersedia (True)** | Pengaturan / Kelola Satuan Pendidikan |
| `logout` | `LogOut` | **Tersedia (True)** | Tombol keluar akun |
| `support_agent` | `Headphones` / `LifeBuoy` | **Tersedia (True)** | Pusat Bantuan IT |

---

## F. Inventaris Animasi & Motion Specs

Semua animasi dirancang menggunakan utilitas murni Tailwind CSS dan CSS keyframes di `index.css`, tanpa library eksternal, dan menerapkan `@media (prefers-reduced-motion: reduce)`:

```css
/* Definisi Keyframes Inti di apps/core-portal/src/index.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes latticeDrift {
  0% { transform: translate(0, 0); }
  50% { transform: translate(24px, 24px); }
  100% { transform: translate(0, 0); }
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

@keyframes sheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Reduced Motion Safety */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Rincian Spesifikasi Interaksi:
1. **Fade-Up Stagger (Login Form & Launcher Grid):** Elemen form dan kartu modul muncul berurutan dengan durasi 250–300ms, timing `cubic-bezier(0.16, 1, 0.3, 1)`, stagger delay 30–40ms per item.
2. **Lattice Ambient Drift:** Latar ornamen islami bergerak diagonal sangat lambat (siklus loop 60 detik) untuk menciptakan kedalaman tenang khas arsitektur institusi.
3. **Form Error Shake:** Input password dan alert box bergetar 200ms saat otentikasi gagal (`-4px, +4px, -2px, +2px, 0`).
4. **Tactile Press Feedback:** Semua tombol dan kartu modul merespons klik/sentuhan dengan `active:scale-[0.98]` (desktop) dan `active:scale-[0.95]` (mobile) selama 100ms.
5. **Bottom-Sheet Slide-Up (Mobile):** Drawer pilihan unit dan profil meluncur ke atas dari bawah layar dalam 300ms dengan backdrop fade 200ms.
6. **Live Search Filtering:** Kartu modul yang tidak cocok kata kunci bertransisi memudar (`opacity-0 scale-95`) dalam 150ms tanpa layout reflow yang mengganggu.

---

## G. Analisis Kesenjangan Data & Logika Bisnis

Berdasarkan investigasi menyeluruh pada backend (`apps/api-backend`) dan state context (`AuthContext.jsx`), berikut adalah pemetaan ketersediaan data nyata vs desain Stitch serta keputusan implementasinya:

| Elemen Desain Stitch | Sumber Data Nyata di Proyek | Status Ketersediaan | Keputusan Default Implementasi |
|---|---|---|---|
| **Sapaan Nama Pengguna** ("Selamat datang, Ahmad Fauzi") | `user?.name` / `user?.full_name` / `user?.username` dari `AuthContext` | **Tersedia (Nyata)** | **Gunakan data nyata.** Ambil `user.name || user.full_name || user.username || 'Pengguna'`. |
| **Label Role Pengguna** ("Admin Yayasan" / "Superadmin") | `user?.role` / `activeSchoolUnit?.role` / `user?.account_type` | **Tersedia (Nyata)** | **Gunakan data nyata.** Buat helper pemformatan label role resmi (mis. `super_admin` → "Superadmin", `admin_yayasan` → "Admin Yayasan", `kepala_sekolah` → "Kepala Sekolah", `guru` → "Dewan Guru", `keuangan` → "Staf Keuangan"). |
| **Satuan Pendidikan Aktif & Daftar Unit** ("SMA Aldepos IBS", "SMP Aldepos", dll.) | `schoolUnits` dan `activeSchoolUnit` dari `AuthContext` (didapat dari `/core/school-units`) | **Tersedia (Nyata)** | **Gunakan data nyata.** Tampilkan nama `activeSchoolUnit.name`. Jika user memiliki >1 unit sekolah, tombol switcher aktif dan membuka modal pemilihan unit yang memanggil `changeActiveSchoolUnit(unit.id)`. Jika hanya 1 unit, non-aktifkan tombol dropdown. |
| **Tahun Ajaran & Semester Aktif** ("Tahun Ajaran 2026/2027 · Semester Ganjil") | Modul Akademik memiliki `academic_years`, namun belum ada endpoint global publik di Core Service yang bisa diakses seluruh role (mis. kasir/sarpras). | **Sebagian / Belum Global** | **Keputusan Bersih:** Tampilkan informasi Tahun Ajaran & Semester HANYA bila data tersedia di konteks/unit aktif. Bila belum ada di auth session, ganti dengan tanggal kalender Masehi & Hijriyah hari ini yang akurat (mis. "Kamis, 8 Oktober 2026"), **JANGAN melakukan hardcode tahun ajaran palsu**. |
| **Shelf "Terakhir Dibuka"** (4 Modul Cepat) | Belum ada tabel database khusus untuk log histori launcher per user. | **Belum Ada di Backend** | **Gunakan `localStorage` (Klien):** Simpan 4 modul terakhir yang diklik oleh pengguna di `localStorage.getItem('aldepos_recent_modules')`. Jika masih kosong (pengguna baru), sembunyikan section ini atau tampilkan 4 modul teratas yang diizinkan oleh hak aksesnya. |
| **Lonceng Notifikasi (Header)** | Modul komunikasi terpusat belum dibangun di backend. | **Belum Ada di Backend** | **Tampilkan ikon statis / sembunyikan badge merah:** Tampilkan ikon lonceng bersih tanpa badge dot merah palsu, dengan tooltip "Tidak ada notifikasi baru" atau sembunyikan elemen ini sampai modul komunikasi aktif. |
| **Menu "Ganti Kata Sandi"** | Endpoint update password tersedia di Core (`/core/users/change-password` atau profil). | **Tersedia** | Arahkan navigasi ke modal ganti password profil yang sudah ada atau route pengaturan profil. |
| **Link "Lupa sandi?" (Login Card)** | Reset password otomatis via email belum terkonfigurasi untuk seluruh pengguna pesantren. | **Helpdesk Flow** | Tampilkan bantuan kontak/WhatsApp admin IT Pesantren (`it-helpdesk@aldepos.sch.id` / Ext. 104) alih-alih form email palsu. |
| **Daftar & Hak Akses Modul Utama** (12 Modul) | Berdasarkan `MODULE_ACCESS_MAP` di `Launcher.jsx` yang dicocokkan terhadap role pengguna di `user.roles` / `activeSchoolUnit.roles`. | **Tersedia (Nyata)** | **Gunakan logika RBAC nyata yang sudah berjalan.** Tampilkan hanya modul yang diizinkan untuk role user yang sedang login. Hitung badge total modul secara dinamis (`allowedModules.length + ' modul'`), bukan angka statis 12. |
| **Daftar "Segera Hadir"** (5 Modul Upcoming) | Modul-modul masa depan (Kesiswaan, CBT, PPDB, BK, Alumni) yang terdaftar di `Launcher.jsx`. | **Tersedia (Katalog)** | Tampilkan sebagai kartu statis berstatus "Segera Hadir" (opacity 75%, cursor not-allowed, tanpa tautan aktif). |
| **Bahasa (Selector ID / EN)** | Multi-bahasa i18n belum diimplementasikan di seluruh modul aplikasi. | **Belum Tersedia** | Sembunyikan toggle bahasa atau kunci di "ID" untuk mencegah ekspektasi fitur bahasa Inggris yang belum diterjemahkan. |
| **Persetujuan Kebijakan Privasi (Checkbox Login)** | UI interaktif persetujuan akses keamanan sistem. | **UI Form Requirement** | Dipertahankan sebagai checkbox validasi login wajib (state `policyAccepted`). |

---

## H. Rencana Aset & Visual

### 1. Logo Baru Aldepos ILMS
- **Sumber Aset:** `docs/design/design-login-portal/logo_baru_1.png/screen.png`
- **Spesifikasi Sumber:** Format PNG RGBA (dengan transparansi latar), dimensi 1600 × 570 px, ukuran berkas 124.8 KB.
- **Rencana Konversi & Penempatan Aset:**
  - `apps/core-portal/public/brand/logo-aldepos-ilms.png` (Versi tajam high-res landscape untuk Login dan Header).
  - `apps/core-portal/public/brand/logo-aldepos-monogram.png` (Versi crop simbol 'A' geometris untuk icon mobile dan avatar brand).
  - `apps/core-portal/public/favicon.ico` dan `public/favicon.svg` (Ikon browser tab resmi).
  - `apps/core-portal/public/apple-touch-icon.png` (180×180px untuk iOS home screen bookmark).
  - Pembuatan komponen `BrandLogo.jsx` berbasis SVG murni / gambar responsif agar render selalu tajam di semua DPI layar.

### 2. Status Foto Kampus Lama (`aldepos-campus.jpg`)
- **Status:** Foto `apps/core-portal/public/aldepos-campus.jpg` (994 KB) **TIDAK DIGUNAKAN** pada desain baru Stitch (desain baru menggunakan arsitektur flat tone-on-tone emerald dengan watermark geometris islami).
- **Keputusan:** File `aldepos-campus.jpg` **TIDAK DIHAPUS** (sesuai aturan retensi aset), tetapi tidak dimuat di bundle Login baru untuk menghemat bandwidth hingga 1 MB.

---

## I. Verifikasi & Penyelarasan Rencana 8 Tahap

Rencana redesign Login & Portal dibagi menjadi 8 tahap terukur:

- [x] **Tahap 0: Analisis & Dokumen Rencana Implementasi** *(Tahap aktif saat ini)*
  - Menulis dokumen `RENCANA-IMPLEMENTASI.md` lengkap.
  - Tanpa mengubah kode aplikasi.
- [ ] **Tahap 1: Setup Aset & Token Desain**
  - Ekstraksi dan penempatan logo `logo-aldepos-ilms.png`, monogram, dan favicon di `apps/core-portal/public/brand/`.
  - Pembuatan komponen brand bersama di `src/shared/components/brand/` (`BrandLogo.jsx`, `LatticePattern.jsx`, `SystemStatusBadge.jsx`).
  - Penambahan keyframes CSS di `src/index.css` (fade-up, error-shake, lattice-drift, reduced-motion rules).
  - Verifikasi build `npm run build:portal` exit code 0.
- [ ] **Tahap 2: Komponen Login Desktop & Mobile (`src/apps/core/pages/login/`)**
  - Membangun `LoginBrandPanel.jsx`, `LoginFormCard.jsx`, `LoginMobileHeader.jsx`, `LoginErrorAlert.jsx`.
  - Memastikan form mendukung tab Nama Pengguna / Email NIP, toggle kata sandi, remember me, dan keyboard safe view.
  - Verifikasi build `npm run build:portal` exit code 0.
- [ ] **Tahap 3: Perakitan Halaman Login (`src/apps/core/pages/Login.jsx`)**
  - Integrasi komponen login ke `Login.jsx`.
  - Menghubungkan alur autentikasi riil `useAuth()`, penanganan error pesan dari API, redirect kasir ke `/kantin/pos`, redirect default ke `location.state.from` atau `/`.
  - Pengujian state error (401 invalid password) dan loading state.
  - Verifikasi build `npm run build:portal` exit code 0.
- [ ] **Tahap 4: Komponen Launcher Desktop & Mobile (`src/pages/launcher/`)**
  - Membangun `LauncherHeader.jsx`, `LauncherGreetingHero.jsx`, `LauncherRecentShelf.jsx`, `LauncherModuleGrid.jsx`, `LauncherUpcomingSection.jsx`.
  - Membangun `LauncherUnitModal.jsx` (dropdown desktop & bottom sheet mobile), `LauncherProfileModal.jsx`, dan `LauncherEmptyAccess.jsx`.
  - Memastikan pencarian instan (live search query + shortcut `Ctrl+K`) dan tile press micro-interactions.
  - Verifikasi build `npm run build:portal` exit code 0.
- [ ] **Tahap 5: Perakitan Halaman Launcher (`src/pages/Launcher.jsx`)**
  - Integrasi seluruh subkomponen ke `Launcher.jsx`.
  - Menghubungkan data nyata pengguna, unit sekolah aktif, pengalihan unit via `changeActiveSchoolUnit`, dan pemfilteran RBAC dinamis (`MODULE_ACCESS_MAP`).
  - Integrasi rak riwayat "Terakhir Dibuka" berbasis `localStorage`.
  - Verifikasi build `npm run build:portal` exit code 0.
- [ ] **Tahap 6: Mode Gelap, Aksesibilitas & Responsif Teliti**
  - Audit mode gelap pada Login dan Launcher (pastikan kontras teks `slate-100` pada latar `slate-950` / `emerald-950` memenuhi WCAG AA).
  - Audit aksesibilitas keyboard (fokus ring 2px emerald, tab order logis, `aria-expanded`, `aria-selected`, `role="tab"`).
  - Pengujian pada resolusi mobile 360px, 390px, 412px, 768px, 1024px, dan 1440px.
  - Verifikasi build `npm run build:portal` exit code 0.
- [ ] **Tahap 7: Uji Regresi Autentikasi, Audit Akhir & Pembaruan Dokumentasi**
  - Uji alur masuk multi-role: Superadmin, Admin Satuan, Kasir Kantin (verifikasi redirect ke `/kantin/pos`), Guru, dan user tanpa role.
  - Pengujian logout, persistensi sesi, dan perpindahan unit sekolah.
  - Pembaruan dokumen `tasks.md` dan penutupan tugas redesign.

---

## J. Risiko Teknis & Pertanyaan Terbuka

### 1. Risiko Teknis Teridentifikasi
1. **Perubahan State Scroll Saat Keyboard Mobile Muncul:** Pada layar mobile berukuran kecil (360×640px), keyboard virtual dapat menutupi tombol submit jika form tidak fleksibel.  
   *Mitigasi:* Gunakan `min-h-[100dvh]`, header otomatis menyusut (*collapsed* 56px), dan form card dapat di-scroll vertikal secara mulus.
2. **Ketergantungan Ikon Non-Standar:** Desain Stitch menyertakan ikon Material Symbols yang tidak identik 1:1 dengan Lucide.  
   *Mitigasi:* Telah dibuat tabel pemetaan resmi di Bagian E; seluruh ikon dijamin menggunakan Lucide React v0.395.0 terpasang tanpa dependensi baru.
3. **Penyalahgunaan Data Mocking:** Risiko memunculkan data statis seperti "Tahun Ajaran 2026/2027" untuk role non-akademik yang tidak relevan.  
   *Mitigasi:* Aturan ketat pada Bagian G: hanya menampilkan data yang tervalidasi dari API/sesi; jika tidak tersedia, sembunyikan elemen atau ganti dengan penanggalan kalender masehi riil.

### 2. Pertanyaan Terbuka untuk Diselaraskan
1. **Pemilihan Bahasa (Language Selector ID/EN):** Desain Stitch menampilkan tombol pill `ID / EN` di pojok kanan atas Login. Mengingat saat ini seluruh modul backend & frontend beroperasi dalam Bahasa Indonesia, apakah tombol bahasa sebaiknya **disembunyikan sepenuhnya** pada rilis ini, atau ditampilkan sebagai tombol non-aktif (hanya label visual "ID")? *(Rekomendasi teknis: Sembunyikan agar tidak membingungkan pengguna).*
2. **Penanganan "Lupa Sandi":** Apakah link "Lupa sandi?" di form login cukup membuka modal bantuan kontak Administrator IT Yayasan / Helpdesk Pesantren (WhatsApp & Email), atau ada alur self-service khusus yang sedang direncanakan? *(Rekomendasi teknis: Buka modal dialog bantuan resmi dengan nomor ekstensi IT).*
3. **Rak "Terakhir Dibuka" untuk Pengguna Baru:** Jika pengguna baru pertama kali masuk dan belum memiliki riwayat klik modul di browsernya, apakah rak "Terakhir Dibuka" disembunyikan sampai ada modul yang diklik, atau default menampilkan 4 modul utama pertama yang diizinkan untuk rolenya? *(Rekomendasi teknis: Tampilkan 4 modul default teratas sesuai role agar layout tetap seimbang).*

---
*Dokumen ini disusun sebagai acuan tunggal pengerjaan Tahap 1 hingga Tahap 7.*
