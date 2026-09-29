Status: perlu-revisi
Diperbarui: 2026-08-24

# roles-dapur.md

> Rujukan: `rancangan-dapur.md` Bagian 4 (kolom Aktor per fitur), `erd-dapur.md` Bagian 1.14
> (`kitchen_staff_assignments`), `api-contract-dapur.md`. Role/permission sesungguhnya tetap
> ditentukan Core Service (`roles`, `permissions`, `user_school_roles`) — dokumen ini mendefinisikan
> **kode permission** yang dipakai modul Dapur dan peran operasional lokal
> (`kitchen_staff_assignments.staff_role`) — **status draf, menunggu konfirmasi Keputusan Terbuka
> #5 di `rancangan-dapur.md`.**

## 1. Daftar Peran Operasional Dapur

Diambil dari kolom "Aktor" di 202 fitur (`rancangan-dapur.md` Bagian 4):

| Peran | Cakupan Tanggung Jawab |
|---|---|
| `admin_dapur` | Master data, menu, perencanaan kebutuhan, anggaran, pengadaan, waste, laporan |
| `kepala_dapur` | Resep & standar produksi, produksi & operasional dapur |
| `petugas_gudang` | Penerimaan bahan, persediaan & gudang |
| `petugas_distribusi` | Distribusi & absensi makan |
| `qc_dapur` | Kontrol kualitas & keamanan pangan |
| `admin_sistem` | Workflow, pengguna, audit, penguncian periode |

Sesuai pola Core Service, tiap peran di atas dipetakan ke **role** di Core Service
(`user_school_roles`) supaya JWT & permission tetap terpusat — `kitchen_staff_assignments` hanya
mencatat *penugasan operasional* (siapa jadi Kepala Dapur di satuan pendidikan mana), bukan sumber
kebenaran hak akses itu sendiri.

## 2. Matriks Permission per Modul Fitur

Format kode permission: `dapur.<kategori>.<aksi>` (mengikuti pola `akademik.nilai.edit` di
`erd-coreservice.md`).

| Kategori | Kode Permission | admin_dapur | kepala_dapur | petugas_gudang | petugas_distribusi | qc_dapur | admin_sistem |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Master Data | `dapur.master.view` / `.manage` | ✅ | 👁 | 👁 | 👁 | 👁 | ✅ |
| Menu | `dapur.menu.view` / `.manage` / `.approve` | ✅ | 👁 | — | 👁 | — | — |
| Resep & Standar Produksi | `dapur.resep.view` / `.manage` / `.approve` | 👁 | ✅ | — | — | 👁 | — |
| Perencanaan Kebutuhan | `dapur.perencanaan.view` / `.manage` | ✅ | 👁 | 👁 | — | — | — |
| Anggaran & Biaya | `dapur.anggaran.view` / `.manage` / `.approve` | ✅ | — | — | — | — | 👁 |
| Pengadaan & Belanja | `dapur.pengadaan.view` / `.manage` / `.approve` | ✅ | — | 👁 | — | — | — |
| Penerimaan Bahan | `dapur.penerimaan.view` / `.manage` | 👁 | — | ✅ | — | 👁 | — |
| Persediaan & Gudang | `dapur.stok.view` / `.manage` / `.opname` | 👁 | 👁 | ✅ | — | 👁 | — |
| Produksi & Operasional | `dapur.produksi.view` / `.manage` | 👁 | ✅ | 👁 | — | 👁 | — |
| Distribusi & Absensi Makan | `dapur.distribusi.view` / `.manage` | 👁 | — | — | ✅ | — | — |
| Kontrol Kualitas & Keamanan Pangan | `dapur.qc.view` / `.manage` | 👁 | 👁 | — | — | ✅ | — |
| Waste & Kehilangan | `dapur.waste.view` / `.manage` | ✅ | 👁 | 👁 | — | 👁 | — |
| Analitik & Laporan | `dapur.laporan.view` / `.export` | ✅ | 👁 | 👁 | 👁 | 👁 | ✅ |
| Workflow, Pengguna & Audit | `dapur.admin.manage` / `dapur.audit.view` | 👁 | — | — | — | — | ✅ |

Legenda: ✅ akses penuh (view + manage + aksi approval kalau ada), 👁 hanya lihat (view), —
tidak ada akses.

## 3. Contoh Path Endpoint dengan Prefix Modul

Sesuai `api-contract-dapur.md`, semua endpoint memakai prefix `/api/v1/dapur/...`, contoh
penerapan permission:

| Endpoint | Permission Dibutuhkan |
|---|---|
| `POST /api/v1/dapur/menus` | `dapur.menu.manage` |
| `POST /api/v1/dapur/menus/:id/lock` | `dapur.menu.approve` |
| `POST /api/v1/dapur/recipes/:id/approve` | `dapur.resep.approve` |
| `POST /api/v1/dapur/purchase-orders/:id/send` | `dapur.pengadaan.manage` |
| `POST /api/v1/dapur/purchase-requests/:id/approve` | `dapur.pengadaan.approve` |
| `POST /api/v1/dapur/goods-receipts/:id/verify` | `dapur.penerimaan.manage` |
| `POST /api/v1/dapur/stock-opnames` | `dapur.stok.opname` |
| `POST /api/v1/dapur/production-batches/:id/verify` | `dapur.produksi.manage` |
| `POST /api/v1/dapur/meal-distributions/:id/handover` | `dapur.distribusi.manage` |
| `GET /api/v1/dapur/qc-checks` | `dapur.qc.view` |
| `GET /api/v1/dapur/reports/*` | `dapur.laporan.view` |
| `POST /api/v1/dapur/period-locks` | `dapur.admin.manage` |

## 4. Keputusan Terbuka Terkait

Lihat `rancangan-dapur.md` Bagian 5 poin 5 — apakah `kitchen_staff_assignments` benar-benar
diperlukan sebagai tabel lokal terpisah, atau cukup pakai `user_school_roles` Core Service dengan
role baru (`admin_dapur`, `kepala_dapur`, dst) didaftarkan langsung di Core. Matriks di atas tetap
valid untuk kedua opsi — bedanya hanya di mana data penugasan disimpan.

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat berdasar kolom Aktor 202 fitur. Status draf, menunggu konfirmasi Keputusan Terbuka #5 `rancangan-dapur.md`. |

*(Tambahkan baris baru di atas setiap ada perubahan role/permission — jangan hapus riwayat lama.)*
