# roles-perpustakaan.md

> Matriks role & permission modul **Perpustakaan**. Mengikuti pola `roles-coreservice.md`. Role
> global (`super_admin`, `admin_yayasan`, `admin_satuan_pendidikan`, `internal_service`) berasal
> dari `roles-coreservice.md` §2 — didefinisikan sekali di Core Service, dipakai lintas modul
> lewat `user_school_roles`. Modul ini menambah satu role baru khusus operasional harian:
> `pustakawan`.

---

## 1. Konsep & Arsitektur RBAC Perpustakaan

Perpustakaan mengikuti model RBAC yang sama seperti Core Service (Hierarchical Multi-Tenant RBAC,
lihat `roles-coreservice.md` §1.1) — role ditetapkan per Satuan Pendidikan lewat
`user_school_roles` (tabel milik Core Service), permission spesifik Perpustakaan didaftarkan
dengan kode `perpustakaan.<resource>.<action>` di tabel `permissions` (juga milik Core Service,
prinsip "role & permission global didefinisikan di satu tempat").

## 2. Definisi Daftar Role

| Nama Role (`roles.name`) | Kategori Scope | Baru/Reuse | Deskripsi Peran |
|---|---|---|---|
| `super_admin` | Global | Reuse (Core) | Akses penuh, termasuk seluruh fitur Perpustakaan lintas Satuan Pendidikan. |
| `admin_yayasan` | Yayasan | Reuse (Core) | Pengawasan/laporan lintas sekolah, tidak menangani operasional harian sirkulasi. |
| `admin_satuan_pendidikan` | Spesifik Satuan Pendidikan | Reuse (Core) | Pengawasan operasional Perpustakaan di sekolahnya (mis. approve kategori baru, lihat laporan), bukan pekerjaan harian sirkulasi. |
| **`pustakawan`** | Spesifik Satuan Pendidikan | **Baru (modul ini)** | Staf pengelola perpustakaan sehari-hari: katalog, sirkulasi (pinjam/kembali/denda), reservasi, laporan. |
| `pengguna_terautentikasi` *(Implicit)* | Lokal / Terikat Akun | Reuse (Core) | Siswa/pegawai yang jadi anggota perpustakaan — dipakai sebagai basis role `anggota` di bawah. |
| `internal_service` | Service-to-Service | Reuse (Core) | Portal Orangtua (fitur #171) & Pengelolaan (fitur #176) via API Key. |

> Role `anggota` **bukan** role RBAC terpisah di `roles` — anggota adalah siswa/pegawai dengan
> akun `pengguna_terautentikasi` biasa yang punya baris di `library_members`. Otorisasi tindakan
> "milik sendiri" (👤 di matriks bawah) dicek lewat pencocokan `library_members.ref_id` dengan
> `users.ref_id` milik token JWT, bukan lewat role baru.

## 3. Matriks Hak Akses Fitur Perpustakaan (14 Fitur)

> ✅ Diizinkan penuh | 🏢 Diizinkan khusus Satuan Pendidikan yang ditugaskan | 👤 Diizinkan khusus
> data milik diri sendiri (anggota) | ❌ Tidak diizinkan

| # | Modul | Fitur | Aksi | `super_admin` | `admin_yayasan` | `admin_satuan_pendidikan` | `pustakawan` | `pengguna_terautentikasi` (anggota) | `internal_service` |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 163 | Katalog | Katalog buku (CRUD) | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | ✅<br>❌ | 🏢<br>❌ | 🏢<br>🏢 | ✅ (via OPAC)<br>❌ | ❌<br>❌ |
| 164 | Katalog | Referensi & kategori | Lihat<br>Kelola | ✅<br>✅ | ✅<br>❌ | 🏢<br>❌ | 🏢<br>🏢 | ✅<br>❌ | ❌<br>❌ |
| 172 | Katalog | Bahan pustaka non-buku | Kelola | ✅ | ❌ | ❌ | 🏢 | ❌ | ❌ |
| 165 | Anggota | Data anggota | Lihat daftar<br>Daftarkan anggota<br>Nonaktifkan | ✅<br>✅<br>✅ | ✅<br>❌<br>❌ | 🏢<br>❌<br>🏢 | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| 174 | Anggota | Riwayat peminjaman anggota | Lihat | ✅ | ✅ | 🏢 | 🏢 | 👤 | ❌ |
| 166 | Sirkulasi | Peminjaman buku | Proses pinjam<br>Perpanjang | ✅<br>✅ | ❌<br>❌ | ❌<br>❌ | 🏢<br>🏢 | ❌<br>👤 | ❌<br>❌ |
| 167 | Sirkulasi | Pengembalian & denda | Proses kembali<br>Tandai lunas | ✅<br>✅ | ❌<br>❌ | ❌<br>❌ | 🏢<br>🏢 | ❌<br>❌ | ❌<br>❌ |
| 168 | Sirkulasi | Reservasi/booking | Ajukan<br>Batalkan<br>Kelola (approve/expire) | ✅<br>✅<br>✅ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | 🏢<br>🏢<br>🏢 | 👤<br>👤<br>❌ | ❌<br>❌<br>❌ |
| 173 | Sirkulasi | Buku hilang/rusak | Lapor<br>Selesaikan | ✅<br>✅ | ❌<br>❌ | 🏢 (lihat saja)<br>❌ | 🏢<br>🏢 | ❌<br>❌ | ❌<br>❌ |
| 175 | Notifikasi | Pengingat jatuh tempo/denda | Lihat log<br>Jalankan batch | ✅<br>✅ | ✅<br>❌ | 🏢<br>❌ | 🏢<br>🏢 | ❌<br>❌ | ❌<br>✅ (job terjadwal) |
| 169 | OPAC | Pencarian katalog | Cari & lihat ketersediaan | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 170 | Laporan | Sirkulasi & buku terpopuler | Generate & export | ✅ | ✅ | 🏢 | 🏢 | ❌ | ❌ |
| 176 | Laporan | Statistik pemanfaatan | Generate & export | ✅ | ✅ | 🏢 | 🏢 | ❌ | ✅ (Pengelolaan) |
| 171 | Integrasi | Endpoint parent-facing | Ambil data riwayat baca anak | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Portal Orangtua) |

## 4. Daftar Permission (`permissions.code`, prefix `perpustakaan.`)

Contoh kode permission yang perlu didaftarkan di tabel `permissions` milik Core Service (mengikuti
pola `roles-coreservice.md` §4.2, format `<module>.<resource>.<action>`):

```
perpustakaan.books.view
perpustakaan.books.manage
perpustakaan.categories.view
perpustakaan.categories.manage
perpustakaan.members.view
perpustakaan.members.register
perpustakaan.members.deactivate
perpustakaan.loans.create
perpustakaan.loans.extend
perpustakaan.loans.return
perpustakaan.loans.pay_fine
perpustakaan.reservations.create
perpustakaan.reservations.manage
perpustakaan.lost_damaged.report
perpustakaan.lost_damaged.resolve
perpustakaan.reminders.view
perpustakaan.reminders.run
perpustakaan.reports.view
```

Penetapan `role_permissions` untuk role `pustakawan` mencakup seluruh daftar di atas kecuali yang
eksplisit ditandai ❌ di matriks Bagian 3.

## 5. Contoh Path Endpoint dengan Prefix Modul

Sesuai `ARSITEKTUR-SISTEM.md` §1.1, seluruh endpoint Perpustakaan diakses lewat prefix
`/api/v1/perpustakaan/...`, contoh:

- `GET /api/v1/perpustakaan/books` — perlu `perpustakaan.books.view`
- `POST /api/v1/perpustakaan/loans` — perlu `perpustakaan.loans.create`
- `GET /api/v1/perpustakaan/opac/search` — publik, tidak perlu permission

## 6. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Role baru `pustakawan` didefinisikan; role global lain reuse dari `roles-coreservice.md`. Matriks 14 fitur disusun berdasarkan `rancangan-perpustakaan.md` §4. |

*(Tambahkan baris baru di atas setiap ada perubahan role/permission — jangan hapus riwayat lama.)*
