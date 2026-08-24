# roles-keuangan.md

> Dokumen ini adalah acuan resmi arsitektur otorisasi, penetapan peran (*role*), daftar izin
> (*permissions*), dan aturan kontrol akses berbasis peran (RBAC) untuk modul **Keuangan**.
> Mengikuti pola `roles-coreservice.md` — struktur otorisasi (tabel `roles`, `permissions`,
> `role_permissions`, `user_school_roles`) **tidak diduplikasi di database Keuangan**, tetap
> hidup di database Core Service dan diakses lewat payload JWT (lihat Bagian 6). Database
> `keuangan` hanya menyimpan data transaksi keuangan, bukan data otorisasi.

---

## 1. Konsep & Arsitektur RBAC Keuangan

Keuangan **tidak mendefinisikan ulang** mesin RBAC — role, permission, dan penetapan role per
Satuan Pendidikan (`user_school_roles`) tetap didefinisikan & disimpan di Core Service
(`erd-coreservice.md` §2.4–2.7). Yang didefinisikan di sini adalah:
1. Role baru yang khusus relevan untuk konteks Keuangan (`admin_keuangan`), didaftarkan sebagai
   baris baru di tabel `roles` milik Core Service.
2. Daftar kode izin baru berformat `keuangan.<module>.<action>`, didaftarkan sebagai baris baru
   di tabel `permissions` milik Core Service.
3. Matriks pemetaan fitur Keuangan ke kode izin tersebut.

### 1.1 Prinsip Desain
1. **Role & permission tetap global-per-role, tapi penetapan ke user per Satuan Pendidikan** —
   sama seperti Core Service, seorang Admin Keuangan bisa hanya berwenang di satu Satuan
   Pendidikan tertentu lewat `user_school_roles`.
2. **Data transaksi keuangan tidak pernah dibaca lintas Satuan Pendidikan** kecuali oleh
   `super_admin`/`admin_yayasan` — setiap query wajib difilter `school_unit_id` dari konteks aktif
   user, bukan opsional.
3. **Orangtua/siswa/pegawai hanya self-service** — akses dibatasi ke data milik `ref_id` mereka
   sendiri lewat endpoint `/parent-facing/*` (fitur #35), tidak pernah lewat endpoint admin biasa.
4. **`internal_service` dipakai untuk endpoint `/internal/*`** yang dipanggil modul lain
   (Kepegawaian untuk payroll, Website Utama/Kantin untuk rekonsiliasi).

---

## 2. Definisi Daftar Role

Role `super_admin`, `admin_yayasan`, `developer`, `internal_service` sudah didefinisikan di
`roles-coreservice.md` §2 dan dipakai ulang di sini (bukan dibuat baru). Role tambahan khusus
konteks Keuangan:

| Nama Role (`roles.name`) | Kategori Scope | `is_system_role` | Deskripsi Peran |
|---|---|:---:|---|
| `super_admin` *(dipakai ulang dari Core)* | Global | `TRUE` | Akses penuh seluruh modul termasuk Keuangan |
| `admin_yayasan` *(dipakai ulang dari Core)* | Yayasan (Lintas Satuan) | `FALSE` | Monitoring keuangan lintas Satuan Pendidikan (baca laporan & dashboard konsolidasi) |
| `admin_keuangan` | Spesifik Satuan Pendidikan | `FALSE` | Staf tata usaha keuangan / bendahara sekolah — operasional harian: tagihan, pembayaran, pengeluaran, pembukuan |
| `kepala_sekolah` *(role lintas modul, dipakai ulang)* | Spesifik Satuan Pendidikan | `FALSE` | Menyetujui/menerbitkan RAPBS, melihat laporan & dashboard, tidak melakukan transaksi harian |
| `orangtua` *(role lintas modul, dipakai ulang)* | Lokal / Terikat Akun Anak | `FALSE` | Melihat & membayar tagihan anak, melihat saldo tabungan anak (fitur #35) |
| `pegawai` *(role lintas modul, dipakai ulang)* | Lokal / Terikat Akun | `FALSE` | Melihat saldo tabungan miliknya sendiri (fitur #27) |
| `internal_service` *(dipakai ulang dari Core)* | Service-to-Service | `TRUE` | Kepegawaian (ingest payroll), Website Utama/Kantin (ingest rekonsiliasi) |

---

## 3. Matriks Hak Akses Fitur Keuangan (35 Fitur)

> **Keterangan Simbol:** ✅ Diizinkan penuh · 🏢 Khusus Satuan Pendidikan yang ditugaskan · 👤 Khusus data milik diri sendiri (self-service) · ❌ Tidak diizinkan

| # | Fitur | `super_admin` | `admin_yayasan` | `admin_keuangan` | `kepala_sekolah` | `orangtua`/`pegawai` | `internal_service` |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | CRUD Jenis Kas | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 2 | Saldo awal kas per tahun ajaran | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 3 | Chart of Account (COA) | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 4 | Mapping akun transaksi | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 5 | Jenis Biaya Pendidikan | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 6 | Kelompok Biaya & Nominal Acuan | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 7 | Jenis Pengeluaran & Pemasukan Khusus | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 8 | Program Kegiatan & Katalog Item | ✅ | 🏢 (baca) | 🏢 | 🏢 (baca) | ❌ | ❌ |
| 9 | Penetapan biaya individual & beasiswa | ✅ | ❌ | 🏢 (ajukan) | 🏢 (setujui) ⚠ | ❌ | ❌ |
| 10 | Penyusunan RAPBS | ✅ | 🏢 (baca) | 🏢 | 🏢 | ❌ | ❌ |
| 11 | Publish/revisi RAPBS | ✅ | ❌ | 🏢 (susun) | 🏢 (terbitkan) | ❌ | ❌ |
| 12 | Realisasi vs rencana anggaran | ✅ | 🏢 | 🏢 | 🏢 | ❌ | ❌ |
| 13 | Generate tagihan massal | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 14 | Daftar & filter tagihan | ✅ | 🏢 | 🏢 | 🏢 (baca) | 👤 (anak sendiri) | ❌ |
| 15 | Batalkan tagihan | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 16 | Reminder tagihan otomatis | ✅ | ❌ | 🏢 (baca log) | ❌ | ❌ | ✅ (kirim) |
| 17 | Catat pembayaran tagihan | ✅ | ❌ | 🏢 | ❌ | 👤 (bayar milik anak) | ❌ |
| 18 | Edit/koreksi pembayaran | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 19 | Cetak kwitansi pembayaran | ✅ | 🏢 | 🏢 | ❌ | 👤 | ❌ |
| 20 | Integrasi payment gateway | ✅ | ❌ | 🏢 (baca) | ❌ | 👤 (checkout) | ✅ (callback) |
| 21 | Rekonsiliasi pembayaran PPDB & kantin | ✅ | ❌ | 🏢 | ❌ | ❌ | ✅ (ingest) |
| 22 | CRUD penerimaan non-SPP | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 23 | Pencatatan realisasi pengeluaran | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 24 | Edit & hapus pengeluaran | ✅ | ❌ | 🏢 | ❌ | ❌ | ❌ |
| 25 | Penggajian pegawai (disbursement) | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ✅ (ingest) |
| 26 | Jurnal otomatis | ✅ | 🏢 (baca) | 🏢 | ❌ | ❌ | ❌ |
| 27 | Tabungan siswa & pegawai | ✅ | ❌ | 🏢 | ❌ | 👤 | ❌ |
| 28 | Tutup buku tahunan | ✅ | 🏢 | 🏢 (ajukan) | ❌ | ❌ | ❌ |
| 29 | Audit trail transaksi keuangan | ✅ | 🏢 | 🏢 (baca) | ❌ | ❌ | ❌ |
| 30 | Laporan Realisasi RAPBS | ✅ | 🏢 | 🏢 | 🏢 | ❌ | ❌ |
| 31 | Buku Besar & Neraca Saldo | ✅ | 🏢 | 🏢 | ❌ | ❌ | ❌ |
| 32 | Surplus/Defisit & Arus Kas | ✅ | 🏢 | 🏢 | 🏢 | ❌ | ❌ |
| 33 | Neraca (posisi keuangan) | ✅ | 🏢 | 🏢 | 🏢 | ❌ | ❌ |
| 34 | Dashboard Keuangan | ✅ | 🏢 | 🏢 | 🏢 | ❌ | ❌ |
| 35 | Endpoint parent-facing | ✅ | ❌ | ❌ | ❌ | 👤 | ✅ (dipakai Portal Ortu) |

> Baris #9 ditandai `⚠` — siapa yang berwenang menyetujui (`kepala_sekolah` atau tetap
> `admin_keuangan` berjenjang) masih menunggu Keputusan Terbuka #2 di `rancangan-keuangan.md` §5.

---

## 4. Pemetaan Database & Standar Penamaan Kode Izin

### 4.1 Prinsip
Kode izin Keuangan didaftarkan sebagai baris baru di tabel `permissions` **milik Core Service**
(bukan tabel baru di database `keuangan`), format: `keuangan.<module>.<resource>.<action>`.

### 4.2 Daftar Standar Izin Keuangan

| Module (`permissions.module`) | Permission Code | Deskripsi |
|---|---|---|
| `keuangan.master` | `keuangan.master.cash_accounts.manage` | Kelola jenis kas & saldo awal |
| `keuangan.master` | `keuangan.master.coa.manage` | Kelola Chart of Account & mapping akun |
| `keuangan.master` | `keuangan.master.fees.manage` | Kelola jenis biaya, kelompok biaya, nominal acuan |
| `keuangan.master` | `keuangan.master.categories.manage` | Kelola jenis pengeluaran/pemasukan khusus, program kegiatan, katalog item |
| `keuangan.master` | `keuangan.master.fee_adjustments.submit` | Mengajukan penetapan biaya individual/keringanan |
| `keuangan.master` | `keuangan.master.fee_adjustments.approve` | Menyetujui/menolak pengajuan keringanan biaya |
| `keuangan.budget` | `keuangan.budget.view` | Melihat RAPBS & realisasi |
| `keuangan.budget` | `keuangan.budget.manage` | Menyusun draft & revisi RAPBS |
| `keuangan.budget` | `keuangan.budget.publish` | Menerbitkan RAPBS |
| `keuangan.bills` | `keuangan.bills.view` | Melihat daftar & detail tagihan |
| `keuangan.bills` | `keuangan.bills.generate` | Generate tagihan massal |
| `keuangan.bills` | `keuangan.bills.cancel` | Membatalkan tagihan |
| `keuangan.payments` | `keuangan.payments.record` | Mencatat pembayaran tagihan |
| `keuangan.payments` | `keuangan.payments.correct` | Mengoreksi pembayaran |
| `keuangan.payments` | `keuangan.payments.reconcile` | Melakukan rekonsiliasi PPDB/Kantin |
| `keuangan.expenses` | `keuangan.expenses.manage` | Mencatat, mengedit, menghapus pengeluaran |
| `keuangan.income` | `keuangan.income.manage` | Mencatat penerimaan non-SPP |
| `keuangan.payroll` | `keuangan.payroll.disburse` | Mencairkan gaji pegawai |
| `keuangan.bookkeeping` | `keuangan.bookkeeping.view` | Melihat jurnal, buku besar, neraca saldo |
| `keuangan.bookkeeping` | `keuangan.bookkeeping.manual_entry` | Membuat jurnal koreksi manual |
| `keuangan.bookkeeping` | `keuangan.bookkeeping.close_year` | Mengajukan/melakukan tutup buku tahunan |
| `keuangan.savings` | `keuangan.savings.manage` | Kelola tabungan siswa/pegawai (setor/tarik) |
| `keuangan.reports` | `keuangan.reports.view` | Melihat & mengekspor seluruh laporan keuangan |
| `keuangan.security` | `keuangan.security.audit_logs.view` | Melihat audit trail transaksi keuangan |
| `keuangan.parent` | `keuangan.parent.self_service` | Akses self-service orangtua/siswa (fitur #35) |

---

## 5. Implementasi Multi-Satuan-Pendidikan

Sama seperti Core Service (`roles-coreservice.md` §5), penetapan `admin_keuangan` ke user
dilakukan per Satuan Pendidikan lewat `user_school_roles` milik Core Service — **bukan** tabel
baru di database `keuangan`. Contoh: seorang bendahara yang bertugas di dua sekolah yayasan yang
sama akan punya dua baris `user_school_roles` dengan `role_id` mengarah ke `admin_keuangan`, satu
per `school_unit_id`. Setiap request ke API Keuangan wajib membawa konteks `school_unit_id` aktif
(dari header/parameter yang divalidasi terhadap payload JWT), dan seluruh query database
`keuangan` difilter berdasarkan itu.

---

## 6. Integrasi Otorisasi dengan JWT Payload

Sama seperti Core Service, backend Keuangan **tidak query ke Core Service tiap request** — cukup
verifikasi signature JWT lokal (in-process, satu backend) dan baca daftar `permissions` yang
sudah disematkan di payload token saat login (lihat contoh struktur di `roles-coreservice.md`
§6). Middleware `requirePermission('keuangan.bills.generate')` dst di
`apps/api-backend/src/modules/keuangan/` cukup mengecek string kode izin ini ada di
`school_units[].permissions` sesuai `school_unit_id` aktif — pola middleware yang sama persis
dipakai ulang dari Core Service, tidak dibuat ulang.

## 7. Status & Riwayat Dokumen

| Tanggal | Versi | Catatan Perubahan |
|---|---|---|
| 2026-08-17 | v1.0.0 | Penyusunan awal matriks role & permission Keuangan. 35 fitur dipetakan ke 7 role (4 di antaranya dipakai ulang dari Core Service). Baris #9 (approval keringanan biaya) ditandai `⚠` menunggu Keputusan Terbuka `rancangan-keuangan.md` §5. |

*(Tambahkan baris baru di atas setiap ada perubahan skema izin — jangan hapus riwayat lama.)*
