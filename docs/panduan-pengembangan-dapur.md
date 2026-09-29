Status: perlu-revisi
Diperbarui: 2026-08-24

# panduan-pengembangan-dapur.md

> **WAJIB DIBACA setiap mulai sesi baru terkait Dapur** — bersama `rancangan-dapur.md`,
> `erd-dapur.md`, `api-contract-dapur.md`, `roles-dapur.md`. Mengikuti pola Bagian 5
> `panduan-pengembangan-core-service.md` ("Pola untuk 13 Panduan Modul Berikutnya") — **modul ini
> dibangun langsung di struktur monorepo**, tidak ada bagian "Tahap Migrasi" karena belum ada kode
> lama. Database `dapur` **belum ada sama sekali** — dimulai dari nol.
>
> Aturan kerja: **lokal dulu, jangan push** — commit lokal boleh, `git push` ditunda sampai
> developer minta eksplisit (lihat `ARSITEKTUR-SISTEM.md` §4.7 dan
> `panduan-pengembangan-core-service.md` Bagian 0).

## Tahap 1 — Perencanaan (Dokumen)

- [x] `rancangan-dapur.md`, `erd-dapur.md`, `api-contract-dapur.md`, `roles-dapur.md` — draf
      selesai, disimpan flat di root monorepo.
- [ ] **Developer review & konfirmasi 7 Keputusan Terbuka** di `rancangan-dapur.md` Bagian 5
      sebelum lanjut Tahap 2 — terutama poin 2 (granularitas satuan pendidikan), 4 (granularitas
      absensi), dan 5 (role/permission), karena ketiganya mengubah struktur tabel inti.

**Prompt Antigravity untuk sesi review (opsional, kalau developer ingin dibantu merangkum
pertanyaan sebelum menjawab):**
```
Baca rancangan-dapur.md Bagian 5 (Keputusan Terbuka). Untuk tiap poin, jelaskan konsekuensi
praktis masing-masing opsi jawaban terhadap struktur tabel di erd-dapur.md, dalam bahasa
sederhana, supaya saya bisa memutuskan. Jangan langsung mengubah dokumen sebelum saya jawab.
```

## Tahap 2 — Database

### 2.1 Buat Database Lokal

Database `dapur` belum ada — buat database lokal baru dulu (bukan reuse database modul lain):

```sql
CREATE DATABASE dapur_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dapur_local'@'localhost' IDENTIFIED BY 'GantiPasswordIni!';
GRANT ALL PRIVILEGES ON dapur_local.* TO 'dapur_local'@'localhost';
FLUSH PRIVILEGES;
```

Tambahkan ke `apps/api-backend/.env`:
```
DAPUR_DB_HOST=localhost
DAPUR_DB_USER=dapur_local
DAPUR_DB_PASSWORD=GantiPasswordIni!
DAPUR_DB_NAME=dapur_local
DAPUR_PORT=3306
```

### 2.2 Setup Knex untuk Modul Dapur

**Prompt Antigravity:**
```
Di apps/api-backend, buat konfigurasi koneksi Knex baru untuk modul dapur, mengikuti pola
persis yang sudah dipakai modul core (lihat apps/api-backend/src/config/db-core.js atau
sejenisnya sebagai contoh). Buat:
- apps/api-backend/src/config/db-dapur.js — koneksi Knex baru pakai env var DAPUR_DB_HOST,
  DAPUR_DB_USER, DAPUR_DB_PASSWORD, DAPUR_DB_NAME, DAPUR_PORT (lihat pola CORE_ di modul core
  sebagai referensi penamaan).
- apps/api-backend/db/migrations/dapur/ — folder migration baru.
- apps/api-backend/db/seeds/dapur/ — folder seed baru.
- Daftarkan koneksi baru ini supaya bisa dijalankan lewat knexfile.js (tambahkan environment
  "dapur" atau connection terpisah sesuai pola yang sudah ada untuk modul core).
Jangan ubah migration/koneksi modul lain yang sudah ada.
```

### 2.3 Migration Bertahap per Kelompok Tabel

Sesuai `erd-dapur.md` Bagian 3, migration dipecah per kelompok (bukan satu file raksasa), supaya
bisa diuji satu-satu. Urutan & prompt per kelompok:

**Kelompok 1 — Master Data (9 tabel, lihat `erd-dapur.md` §1.1 & §2.1):**
```
Baca erd-dapur.md Bagian 1.1 dan 2.1 (Master Data). Buat migration Knex di
apps/api-backend/db/migrations/dapur/ untuk 9 tabel: kitchen_ingredients, kitchen_units,
kitchen_unit_conversions, kitchen_suppliers, kitchen_student_groups,
kitchen_operational_calendar, kitchen_system_parameters, kitchen_master_data,
kitchen_ingredient_allergens — persis sesuai kolom & constraint yang tertulis di dokumen itu.
Pakai PK id BIGINT UNSIGNED AUTO_INCREMENT, created_at/updated_at TIMESTAMP di semua tabel
kecuali disebutkan append-only. Urutkan file migration supaya tabel yang direferensikan dibuat
lebih dulu (kitchen_units & kitchen_master_data sebelum kitchen_ingredients, dst). Setelah
migration ditulis, jalankan npx knex migrate:latest --env dapur (atau sesuai environment yang
sudah didaftarkan di knexfile.js) dan laporkan hasilnya.
```

**Kelompok 2 — Menu & Resep (11 tabel, `erd-dapur.md` §1.2–1.3 & §2.2–2.3):**
```
Baca erd-dapur.md Bagian 1.2, 1.3, 2.2, 2.3. Buat migration Knex untuk 11 tabel: kitchen_menus,
kitchen_menu_items, kitchen_menu_nutrition, kitchen_menu_diversity_checks,
kitchen_menu_cost_limits, kitchen_menu_evaluations, kitchen_recipes,
kitchen_recipe_ingredients, kitchen_recipe_steps, kitchen_recipe_references,
kitchen_recipe_cost_simulations. Referensi ke kitchen_ingredients/kitchen_units dari Kelompok 1
tetap FK biasa (satu database yang sama). Jalankan migration setelah selesai, laporkan hasil.
```

**Kelompok 3 — Perencanaan & Anggaran (7 tabel, §1.4–1.5 & §2.4–2.5):**
```
Baca erd-dapur.md Bagian 1.4, 1.5, 2.4, 2.5. Buat migration untuk kitchen_meal_plans,
kitchen_material_requirements, kitchen_capacity_plans, kitchen_budgets, kitchen_cost_estimates,
kitchen_cost_records, kitchen_spending_commitments. Jalankan migration, laporkan hasil.
```

**Kelompok 4 — Pengadaan & Penerimaan (9 tabel, §1.6–1.7 & §2.6–2.7):**
```
Baca erd-dapur.md Bagian 1.6, 1.7, 2.6, 2.7. Buat migration untuk kitchen_purchase_requests,
kitchen_purchase_orders, kitchen_purchase_order_items, kitchen_daily_shopping_lists,
kitchen_supplier_price_history, kitchen_purchase_transactions,
kitchen_purchase_reconciliations, kitchen_goods_receipts, kitchen_goods_receipt_items.
Jalankan migration, laporkan hasil.
```

**Kelompok 5 — Persediaan & Produksi (9 tabel, §1.8–1.9 & §2.8–2.9):**
```
Baca erd-dapur.md Bagian 1.8, 1.9, 2.8, 2.9. Buat migration untuk kitchen_stock_balances,
kitchen_stock_movements (append-only, tanpa updated_at), kitchen_stock_opnames,
kitchen_stock_opname_items, kitchen_picking_lists, kitchen_production_schedules,
kitchen_production_batches, kitchen_production_batch_materials, kitchen_production_logs
(append-only). Jalankan migration, laporkan hasil.
```

**Kelompok 6 — Distribusi, QC & Waste (11 tabel, §1.10–1.12 & §2.10–2.12):**
```
Baca erd-dapur.md Bagian 1.10, 1.11, 1.12, 2.10, 2.11, 2.12. Buat migration untuk
kitchen_meal_distributions, kitchen_meal_attendances, kitchen_special_meal_recipients,
kitchen_qc_checks, kitchen_food_sampling, kitchen_food_safety_incidents,
kitchen_batch_qc_results, kitchen_waste_records, kitchen_waste_reduction_targets. Jalankan
migration, laporkan hasil.
```

**Kelompok 7 — Laporan & Workflow (9 tabel, §1.13–1.14 & §2.13–2.14):**
```
Baca erd-dapur.md Bagian 1.13, 1.14, 2.13, 2.14. Buat migration untuk kitchen_report_schedules,
kitchen_staff_assignments, kitchen_approval_requests, kitchen_notifications,
kitchen_audit_trails (append-only), kitchen_period_locks, kitchen_data_imports,
kitchen_data_validations, kitchen_service_status. Jalankan migration, laporkan hasil.
```

### 2.4 Verifikasi Migration

```sql
-- Jalankan di database dapur_local setelah semua kelompok migration selesai
SHOW TABLES;
-- Harus menunjukkan ~48 tabel dengan prefix kitchen_
SELECT COUNT(*) AS total_tabel FROM information_schema.tables WHERE table_schema = 'dapur_local';
```

### 2.5 Seed Data Dummy

**Prompt Antigravity:**
```
Buat seed Knex di apps/api-backend/db/seeds/dapur/001_initial_seed.js untuk data dummy minimal
supaya modul Dapur bisa diuji end-to-end secara lokal:
- 3 kitchen_master_data type=ingredient_category (mis. "Sayuran", "Protein", "Bumbu")
- 5 kitchen_units (kg, gram, liter, ml, pcs) + 2 kitchen_unit_conversions
- 5 kitchen_ingredients contoh (beras, ayam, wortel, minyak goreng, garam)
- 2 kitchen_suppliers dummy
- 2 kitchen_student_groups dummy (academic_ref_id boleh angka dummy 1 dan 2)
- 1 kitchen_menus contoh + 2 kitchen_menu_items
- 1 kitchen_recipes contoh terhubung ke menu item itu + 2 kitchen_recipe_ingredients
- 1 baris kitchen_staff_assignments dengan staff_role admin_dapur, core_user_id dummy = 1
Jalankan npx knex seed:run --env dapur setelah selesai, laporkan hasil dan tampilkan isi
kitchen_ingredients untuk verifikasi.
```

## Tahap 3 — Backend

**Prompt Antigravity (per kelompok fitur, ikuti urutan Kelompok migration di atas):**
```
Baca api-contract-dapur.md Bagian 2 (Master Data) dan erd-dapur.md Bagian 2.1. Buat modul
backend Dapur untuk Master Data di apps/api-backend/src/modules/dapur/master-data/ — controller,
service, route — mengikuti pola persis modul core yang sudah ada (lihat
apps/api-backend/src/modules/core/foundation/ sebagai contoh struktur file & format response
{ success, data, message, errors }). Mount route dengan prefix /api/v1/dapur/... langsung
(bukan /api/v1/... dulu seperti Core Service dulu). Middleware verifyJwt & requirePermission
pakai ulang punya Core (import, bukan bikin ulang), dengan kode permission dapur.master.view
dan dapur.master.manage (lihat roles-dapur.md Bagian 2). Jangan sentuh modul core yang sudah
ada.
```

Ulangi pola prompt yang sama untuk tiap kelompok fitur berikutnya (Menu, Resep, Perencanaan,
Anggaran, Pengadaan, Penerimaan, Persediaan, Produksi, Distribusi, QC, Waste, Laporan, Workflow),
merujuk bagian terkait di `api-contract-dapur.md` dan `erd-dapur.md`, dengan kode permission
sesuai `roles-dapur.md` Bagian 2–3.

**Verifikasi tiap kelompok backend selesai:**
```bash
curl -s http://localhost:<port>/api/v1/dapur/ingredients \
  -H "Authorization: Bearer <token_dummy_dari_seed>" | jq
```

## Tahap 4 — Frontend

**Prompt Antigravity:**
```
Baca api-contract-dapur.md dan roles-dapur.md. Buat halaman frontend Dapur di
apps/core-portal/src/apps/dapur/pages/ mengikuti pola persis modul core yang sudah ada (lihat
apps/core-portal/src/apps/core/pages/ sebagai contoh struktur file, styling Tailwind, dan
pemakaian shared/Layout.jsx, shared/ProtectedRoute.jsx). Buat:
- Login.jsx sendiri untuk Dapur (route /dapur/login) — pakai ulang shared/AuthContext.jsx dan
  shared/services/api.js yang sudah ada, JANGAN bikin ulang logic auth/interceptor.
- Dashboard.jsx (ringkas, panggil GET /api/v1/dapur/dashboard)
- Halaman list+form untuk Master Data (bahan baku, satuan, supplier) sebagai contoh pola dulu,
  modul lain menyusul di sesi berikutnya.
Tambahkan satu kartu baru "Dapur" di apps/core-portal/src/pages/Launcher.jsx, mengarah ke
/dapur/login (atau langsung /dapur/dashboard kalau sesi JWT sudah ada, ikuti pola SSO yang
sudah dipakai kartu Core).
```

Lanjutkan pola prompt yang sama per kelompok fitur untuk halaman-halaman berikutnya (Menu, Resep,
Perencanaan, Anggaran, Pengadaan, Penerimaan, Persediaan, Produksi, Distribusi, QC, Waste,
Laporan, Workflow), sesuai urutan Tahap 3.

## Tahap 5 — Integrasi Lintas Modul

- [ ] Sambungkan pemanggilan service-layer in-process ke Kepegawaian untuk resolusi nama
      PIC/petugas (`ref_id` di `kitchen_production_batches.pic_id`, dst) — kalau modul
      Kepegawaian sudah expose service function yang bisa dipanggil.
- [ ] Sambungkan ke Akademik untuk resolusi `kitchen_student_groups.academic_ref_id` dan
      `student_ref_id` di absensi makan.
- [ ] **Tergantung Keputusan Terbuka #3** (`rancangan-dapur.md`) — kalau anggaran Dapur wajib
      terintegrasi ke Keuangan, sambungkan `kitchen_budgets`/`kitchen_cost_records` ke service
      Keuangan setelah modul itu expose kontraknya.
- [ ] Sebelum modul sumber (Kepegawaian/Akademik) benar-benar expose service function yang
      dibutuhkan, pakai **mock/stub function** dulu sesuai pola `ARSITEKTUR-SISTEM.md` Bagian 6
      supaya pengembangan Dapur tidak menunggu.

**Prompt Antigravity untuk mock sementara:**
```
Buat fungsi stub sementara di apps/api-backend/src/modules/dapur/shared/external-refs.js —
misalnya getStaffName(staffRefId) dan getStudentGroupName(groupRefId) — yang untuk sekarang
mengembalikan data dummy (mis. "Staf #<id>", "Kelompok #<id>"), supaya modul Dapur bisa
dikembangkan & diuji tanpa menunggu Kepegawaian/Akademik expose service sungguhan. Beri
komentar TODO jelas menandai bagian ini perlu diganti pemanggilan service asli nanti.
```

## Tahap 6 — Verifikasi Lokal

- [ ] `apps/api-backend` jalan lokal (`npm run dev`), seluruh endpoint Dapur (Bagian 2–15
      `api-contract-dapur.md`) diuji manual minimal 1 kali per kelompok (bisa pakai `curl`/Postman).
- [ ] `apps/core-portal` jalan lokal, buka `http://localhost:<port>/` → `Launcher.jsx` menampilkan
      kartu "Dapur" bersama kartu modul lain.
- [ ] Klik kartu Dapur → masuk ke `/dapur/login`, login pakai akun dummy dari seed Tahap 2.5 →
      berhasil masuk ke `/dapur/dashboard`.
- [ ] Alur inti diuji end-to-end secara manual minimal sekali: buat menu → buat resep → hitung
      kebutuhan bahan → buat PO → catat penerimaan bahan → stok bertambah → buat batch produksi →
      pemakaian bahan mengurangi stok → distribusi ke kelompok santri → catat absensi → cek QC
      checklist → laporan dashboard menunjukkan angka yang konsisten dengan data di atas.
- [ ] Tidak ada mock/stub data tersisa di jalur produksi kecuali yang sudah didokumentasikan di
      Tahap 5 sebagai menunggu integrasi modul lain.

## Tahap 7 — Deployment (Setelah Developer Setuju)

- [ ] Tambahkan `paths:` filter untuk Dapur di workflow GitHub Actions `deploy-api-backend.yml`
      dan `deploy-core-portal.yml` kalau belum mencakup folder modul baru (biasanya sudah otomatis
      kalau filter memang di level `apps/api-backend/**` dan `apps/core-portal/**`, tidak perlu
      filter per modul — cek konfigurasi yang sudah ada dulu sebelum menambah).
- [ ] Buat database `dapur` production di Hostinger (pola penamaan sesuai
      `ARSITEKTUR-SISTEM.md` §4.6: `<kode_hosting>_dbdapur`, user
      `<kode_hosting>_dapur`).
- [ ] Jalankan migration & seed production (**seed production HARUS beda dari seed lokal** —
      tanpa akun dummy `superadmin`/`Password123!`, sesuaikan dengan data organisasi
      sesungguhnya).
- [ ] Tambahkan `DAPUR_*` env var ke `.env` production `apps/api-backend`.
- [ ] `git push` **hanya setelah developer memberi instruksi eksplisit** (lihat Bagian 0 &
      `ARSITEKTUR-SISTEM.md` §4.7).
- [ ] Setelah live, mulai isi `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` per item
      Dapur yang sudah selesai & teruji — jangan tunggu semua selesai.

## Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat. Database `dapur` belum ada, mulai dari Tahap 1. Checklist mengikuti pola Bagian 5 `panduan-pengembangan-core-service.md`, tanpa bagian migrasi. |

*(Tambahkan baris baru di atas setiap ada progres/keputusan baru — jangan hapus riwayat lama.)*
