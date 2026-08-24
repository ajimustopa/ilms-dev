# roles-sarpras.md

> Dokumen ini adalah acuan resmi arsitektur otorisasi, penetapan peran (*role*), daftar izin
> (*permissions*), dan aturan kontrol akses berbasis peran (RBAC) untuk modul **Sarpras** dalam
> Sistem Manajemen Sekolah Terintegrasi. Mengikuti pola `roles-coreservice.md`.

---

## 1. Konsep & Arsitektur RBAC Sarpras

Sarpras memakai model RBAC yang sama dengan Core Service — role & permission global per
instalasi Yayasan, penetapan role ke user **per Satuan Pendidikan** lewat `user_school_roles`
milik Core Service (Sarpras tidak punya tabel role sendiri, mengikuti model terpusat Core
Service).

---

## 2. Definisi Daftar Role

| Nama Role (`roles.name` di Core Service) | Kategori Scope | Deskripsi Peran |
|---|---|---|
| `super_admin` | Global | Akses penuh seluruh modul termasuk Sarpras (warisan dari Core Service). |
| `admin_sarpras` | Spesifik Satuan Pendidikan | Admin operasional modul Sarpras — kelola lokasi fisik, aset, peminjaman, pemeliharaan, pengadaan, bahan habis pakai di satuan pendidikannya. |
| `atasan_sarpras` | Spesifik Satuan Pendidikan | Pegawai dengan jabatan struktural yang bertindak sebagai approver peminjaman fasilitas berjenjang. |
| `pegawai` *(peran umum lintas modul)* | Spesifik Satuan Pendidikan | Peran dasar pegawai — mengajukan peminjaman ruang/fasilitas milik sendiri, melaporkan kerusakan. |
| `internal_service` *(sistem/mesin)* | Service-to-Service | Kredensial API Key untuk Akademik (baca `facility_rooms`) dan Keuangan (isi `finance_reference_id`). |

---

## 3. Matriks Hak Akses Fitur Sarpras

> ✅ Diizinkan penuh · 🏢 Terbatas Satuan Pendidikan yang ditugaskan · 👤 Terbatas data milik
> sendiri · ❌ Tidak diizinkan

| # | Fitur | Aksi | `super_admin` | `admin_sarpras` | `atasan_sarpras` | `pegawai` | `internal_service` |
|:---:|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | Manajemen Lokasi Fisik | Kelola lahan/bangunan/ruangan | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 1b | — | Baca ruangan (dipakai Akademik) | ✅ | 🏢 | ❌ | ❌ | ✅ |
| 2 | Inventaris aset | Lihat/kelola aset & mutasi lokasi | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 3 | QR code aset | Generate/cetak/scan | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 4 | Peminjaman fasilitas | Ajukan peminjaman | ✅ | 🏢 | 👤 | 👤 | ❌ |
| 4b | — | Lihat jadwal pemakaian | ✅ | 🏢 | 🏢 | 🏢 | ❌ |
| 5 | Approval berjenjang | Setujui/tolak peminjaman | ✅ | 🏢 | 🏢 | ❌ | ❌ |
| 6 | Maintenance | Laporkan kerusakan | ✅ | 🏢 | ❌ | 👤 | ❌ |
| 6b | — | Tindak lanjut & tutup tiket | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 7 | Supplier/vendor | Kelola master supplier | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 8 | Pengadaan barang | Ajukan/setujui/terima barang | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 8b | — | Isi `finance_reference_id` | ✅ | ❌ | ❌ | ❌ | ✅ |
| 9 | Bahan habis pakai (master) | Kelola master item | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 10 | Mutasi stok BHP | Catat stok masuk/keluar | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 11 | Stock opname | Buat sesi, isi fisik, finalisasi | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 12 | Laporan kondisi & penyusutan | Lihat/generate laporan | ✅ | 🏢 | ❌ | ❌ | ❌ |

---

## 4. Standar Penamaan Kode Izin (`permissions.code`)

Format: `sarpras.<module>.<action>`

| Module | Permission Code | Deskripsi |
|---|---|---|
| `sarpras.facility` | `sarpras.facility.sites.manage` | Kelola lahan |
| `sarpras.facility` | `sarpras.facility.buildings.manage` | Kelola bangunan |
| `sarpras.facility` | `sarpras.facility.rooms.manage` | Kelola ruangan |
| `sarpras.facility` | `sarpras.facility.rooms.view` | Lihat/baca ruangan (dipakai endpoint internal Akademik) |
| `sarpras.assets` | `sarpras.assets.manage` | Kelola aset & QR code |
| `sarpras.assets` | `sarpras.assets.mutate` | Catat mutasi lokasi aset |
| `sarpras.bookings` | `sarpras.bookings.create` | Ajukan peminjaman fasilitas |
| `sarpras.bookings` | `sarpras.bookings.view_schedule` | Lihat jadwal pemakaian fasilitas |
| `sarpras.bookings` | `sarpras.bookings.approve` | Setujui/tolak peminjaman |
| `sarpras.maintenance` | `sarpras.maintenance.report` | Laporkan kerusakan |
| `sarpras.maintenance` | `sarpras.maintenance.manage` | Tindak lanjut & tutup tiket |
| `sarpras.procurement` | `sarpras.procurement.vendors.manage` | Kelola master supplier |
| `sarpras.procurement` | `sarpras.procurement.manage` | Kelola pengadaan barang |
| `sarpras.procurement` | `sarpras.procurement.finance_reference.update` | Isi referensi transaksi Keuangan |
| `sarpras.consumables` | `sarpras.consumables.manage` | Kelola master & mutasi stok bahan habis pakai |
| `sarpras.consumables` | `sarpras.consumables.opname` | Kelola stock opname |
| `sarpras.reports` | `sarpras.reports.view` | Lihat laporan kondisi & penyusutan aset |

---

## 5. Status & Riwayat Dokumen

| Tanggal | Catatan Perubahan |
|---|---|
| 2026-08-18 | Penyusunan awal — 5 role (`super_admin`, `admin_sarpras`, `atasan_sarpras`, `pegawai`, `internal_service`), matriks 16 baris aksi, standar kode izin `sarpras.<module>.<action>`. Approval berjenjang (`atasan_sarpras`) masih memakai penetapan approver manual per pengajuan — lihat keputusan terbuka di `rancangan-sarpras.md` §5, belum otomatis dari struktur jabatan Kepegawaian. |

