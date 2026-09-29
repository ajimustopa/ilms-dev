Status: perlu-revisi
Diperbarui: 2026-08-24

# roles-kantin.md

> Matriks role & permission modul **Kantin**. Pola mengikuti `roles-coreservice.md`. **Kantin
> tidak mendefinisikan role baru** — role (`kasir`, `bendahara`, `kepala_kantin`, `admin`,
> `orangtua`) adalah role yang sudah/akan didaftarkan di tabel `roles` milik **Core Service**
> dan ditugaskan ke user lewat `user_school_roles` (lihat `rancangan-kantin.md` §4). Dokumen ini
> hanya memetakan role tersebut ke aksi & endpoint di dalam Kantin.

## 1. Konsep & Arsitektur RBAC di Kantin

1. **Definisi role tetap di Core Service.** Kantin memverifikasi JWT dan membaca daftar
   `permissions`/nama role dari payload token (lihat `api-contract-coreservice.md` §6) — tidak
   ada tabel `roles` fisik di database Kantin.
2. **Toggle akses menu lokal.** Kantin punya lapisan tambahan `role_menu_access` (lihat
   `erd-kantin.md` §2.2) untuk mematikan/menyalakan menu tertentu per role **di dalam aplikasi
   Kantin saja** — ini bukan RBAC baru, hanya kontrol tampilan/fitur granular tambahan di atas
   permission Core.
3. **Konteks Satuan Pendidikan tetap berlaku** — semua data Kantin difilter `school_unit_id`
   sesuai role & penugasan user di `user_school_roles` (Core Service).
4. **Orangtua** mengakses data terbatas pada `student_id` yang terhubung ke akunnya (validasi
   relasi ortu-anak diambil dari Akademik, bukan disimpan ulang di Kantin).

## 2. Definisi Role yang Dipakai Kantin (Sumber: Core Service)

| Nama Role | Kategori Scope | Deskripsi Peran di Konteks Kantin |
|---|---|---|
| `super_admin` | Global | Akses penuh, mewarisi seluruh hak `admin` di semua Satuan Pendidikan |
| `admin` | Spesifik Satuan Pendidikan | Konfigurasi & operasional penuh modul Kantin di sekolahnya |
| `kepala_kantin` | Spesifik Satuan Pendidikan | Setara `admin` untuk operasional Kantin (sesuai draf fitur, semua fitur admin dibagi kepala_kantin) |
| `bendahara` | Spesifik Satuan Pendidikan | Transaksi keuangan: top up/tarik tunai, pembayaran hak kantin/vendor, laporan keuangan |
| `kasir` | Spesifik Satuan Pendidikan | Transaksi penjualan & retur barang |
| `orangtua` | Terikat akun & anak | Self-service: saldo, riwayat, ganti PIN, batasi/blokir jajan anak sendiri |
| `internal_service` | Service-to-Service | Portal Orangtua & Keuangan mengakses endpoint tertentu via `X-API-Key` |

> Kalau `kepala_kantin` sebaiknya jadi role terpisah dari `admin` dengan hak lebih sempit (mis.
> tidak bisa toggle akses menu), ini perlu dikonfirmasi — draf fitur asli selalu menyamakan
> keduanya di kolom Aktor, TANDAI sebagai Keputusan Terbuka.

## 3. Matriks Hak Akses Fitur Kantin

> ✅ Diizinkan penuh | 🏫 Diizinkan khusus Satuan Pendidikan yang ditugaskan | 👤 Data milik
> sendiri (self-service) | ❌ Tidak diizinkan

| # | Modul | Fitur | Aksi | `admin` | `kepala_kantin` | `bendahara` | `kasir` | `orangtua` | `internal_service` |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Konfigurasi | Jenis Akses (toggle menu) | Lihat, ubah toggle | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 2 | Produk | Vendor | CRUD, aktif/nonaktif | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 3 | Produk | Kategori Produk | CRUD, aktif/nonaktif | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 4 | Produk | Daftar Produk Vendor | CRUD, aktif/nonaktif, generate barcode | ✅ | ✅ | ❌ | 👁️ lihat saja | ❌ | ❌ |
| 5 | Produk | Penerimaan Barang | Input, lihat riwayat | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 6 | Produk | Retur Barang | Input, lihat riwayat | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| 7 | Murid (atribut kantin) | Lihat data, aktif/nonaktif, generate QR, reset PIN | ✅ | ✅ | ❌ | ❌ | 👤 (PIN ortu sendiri) | ❌ |
| 8 | Konfigurasi | Limit Jajan Harian | CRUD, aktif/nonaktif | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 9 | Keuangan | Top Up / Tarik Tunai | Input, lihat riwayat mutasi | ✅ | ✅ | ✅ | ❌ | 👤 lihat riwayat anak | ✅ (top-up online) |
| 10 | Penjualan | Transaksi Penjualan | Input transaksi | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| 11 | Keuangan | Piutang Hak Kantin & Vendor | Lihat, export | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 12 | Keuangan | Bayar Hak Kantin / Hak Vendor | Input pembayaran, lihat riwayat | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 13 | Keuangan | Pengeluaran Operasional | Input, lihat riwayat | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 14 | Orangtua | Saldo, riwayat mutasi, riwayat jajan | Lihat | ✅ (semua siswa) | ✅ (semua siswa) | ❌ | ❌ | 👤 (anak sendiri) | ✅ |
| 15 | Orangtua | Ganti PIN ortu, batasi jajan, blokir jajan | Ubah | ✅ | ✅ | ❌ | ❌ | 👤 (anak sendiri) | ✅ (batasi/blokir via Portal Ortu) |
| 16 | Laporan | Semua laporan | Lihat, export | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 17 | Dashboard | Ringkasan & grafik | Lihat | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Standar Penamaan Kode Izin (`permissions.code` di Core Service)

Kantin **mengusulkan** kode izin berikut untuk didaftarkan di tabel `permissions` milik Core
Service (module = `kantin`), format `kantin.<resource>.<action>`:

| Permission Code | Deskripsi |
|---|---|
| `kantin.access_menu.manage` | Mengatur toggle akses menu Kantin per role |
| `kantin.vendors.manage` | CRUD & status vendor |
| `kantin.products.manage` | CRUD & status kategori/produk vendor |
| `kantin.products.view` | Lihat daftar produk (kasir) |
| `kantin.goods_receipts.manage` | Input & lihat penerimaan barang |
| `kantin.returns.manage` | Input & lihat retur barang |
| `kantin.students.manage` | Lihat & kelola atribut kantin siswa (QR, PIN, status) |
| `kantin.limits.manage` | CRUD limit jajan harian |
| `kantin.wallet.manage` | Top up, tarik tunai, lihat mutasi |
| `kantin.sales.create` | Input transaksi penjualan |
| `kantin.receivables.view` | Lihat piutang hak kantin/vendor |
| `kantin.fees.manage` | Bayar hak kantin/vendor |
| `kantin.expenses.manage` | Catat & lihat pengeluaran operasional |
| `kantin.reports.view` | Lihat & export laporan |
| `kantin.dashboard.view` | Lihat dashboard |
| `kantin.parent_self_service` | Self-service orangtua (saldo, riwayat, PIN, limit, blokir) |

> Pendaftaran aktual kode izin ini ke tabel `permissions` Core Service dilakukan di Tahap 2/3,
> bukan bagian dari database Kantin sendiri.

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Matriks role awal dibuat. Role bersumber dari Core Service, tidak ada tabel role fisik di Kantin. Ditandai Keputusan Terbuka: apakah `kepala_kantin` perlu dipisah haknya dari `admin`. |

*(Tambahkan baris baru di atas setiap ada perubahan matriks — jangan hapus riwayat lama.)*
