Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-dapur.md

> Rujukan: `ARSITEKTUR-SISTEM.md` Bagian 4.3 (format response, penamaan endpoint global),
> `erd-dapur.md` (entitas & kolom). Base URL production: `https://api.aldeposibs.com/api/v1/dapur`.
> Staging: `https://staging-api.aldeposibs.com/api/v1/dapur`. Lokal:
> `http://localhost:<port>/api/v1/dapur`.
>
> Format response: `{ success, data, message, errors }` (sesuai `ARSITEKTUR-SISTEM.md` §4.3).
> Auth: `Authorization: Bearer <jwt>` untuk pengguna (verifikasi in-process pakai `CORE_JWT_SECRET`
> milik Core Service — Dapur tidak menerbitkan token sendiri). `X-API-Key` untuk pemanggilan
> service-to-service dari modul lain yang mengonsumsi data Dapur (mis. Pengelolaan untuk dashboard
> agregat) — memakai `api_clients` milik Core Service.

## 1. Konvensi Endpoint

- Semua endpoint diawali `/api/v1/dapur/...`.
- List: `GET /resource?page=&limit=&filter...`, response `data` berupa array + `meta.pagination`.
- Detail: `GET /resource/:id`.
- Create: `POST /resource`. Update: `PUT /resource/:id` (full) atau `PATCH /resource/:id`
  (partial). Delete: umumnya **soft-delete via status**, bukan `DELETE` fisik, kecuali disebut
  lain.
- Endpoint aksi non-CRUD (approve, verify, lock, dst) memakai pola
  `POST /resource/:id/<aksi>`, mis. `POST /purchase-orders/12/approve`.
- Semua endpoint list mendukung filter `satuan_pendidikan_id` (nullable — lihat catatan Keputusan
  Terbuka #2 di `rancangan-dapur.md`).

## 2. Master Data (§4.1 `rancangan-dapur.md`)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/ingredients` | Master bahan baku |
| GET/PUT | `/ingredients/:id` | " |
| POST | `/ingredients/:id/deactivate` | Nonaktifkan bahan |
| GET/POST | `/units` | Master satuan |
| GET/POST | `/units/conversions` | Konversi satuan |
| GET/POST | `/suppliers` | Master supplier |
| GET/PUT | `/suppliers/:id` | " |
| GET/POST | `/student-groups` | Master kelompok santri (cache Akademik) |
| GET/POST | `/operational-calendar` | Kalender hari operasional |
| GET/PUT | `/system-parameters` | Parameter sistem dapur |
| GET/POST | `/master-data?type=` | Kategori bahan, lokasi penyimpanan, alat dapur, jenis makan, alergi & pantangan, jenis kemasan, standar kualitas bahan, hari besar/acara |
| GET/PUT | `/master-data/:id` | " |

## 3. Menu (§4.2)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/menus?type=` | Perencanaan/template/siklus/khusus menu |
| GET/PUT | `/menus/:id` | Detail, edit |
| POST | `/menus/:id/copy` | Duplikasi menu |
| POST | `/menus/:id/lock` | Penguncian menu |
| POST | `/menus/:id/substitute` | Substitusi menu |
| GET | `/menus/:id/versions` | Versi & histori menu |
| POST | `/menus` (dgn `parent_menu_id`) | Buat versi baru |
| POST | `/menus/propose` | Usulan menu |
| GET/POST | `/menus/:id/items` | Komponen menu |
| GET/POST | `/menus/:id/nutrition` | Standar gizi & alergen menu |
| GET | `/menus/:id/diversity-check` | Pengecekan keberagaman menu |
| POST | `/menus/:id/favorite` | Penandaan menu favorit |
| GET/PUT | `/menu-cost-limits` | Batas biaya per porsi |
| GET/POST | `/menus/:id/evaluations` | Evaluasi & feedback menu |

## 4. Resep & Standar Produksi (§4.3)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/recipes` | Master menu masakan, resep standar |
| GET/PUT | `/recipes/:id` | Detail, edit |
| POST | `/recipes/:id/approve` | Persetujuan resep |
| GET | `/recipes/:id/versions` | Versi resep |
| POST | `/recipes/:id/convert-batch` | Konversi resep batch |
| GET/POST | `/recipes/:id/ingredients` | Komposisi bahan, standar bumbu, yield |
| GET/POST | `/recipes/:id/steps` | Langkah proses masak, suhu/waktu, SOP sanitasi, standar penyajian |
| GET/POST | `/recipes/:id/references` | Foto referensi hidangan |
| GET/POST | `/recipes/:id/cost-simulations` | Simulasi biaya resep |

## 5. Perencanaan Kebutuhan (§4.4)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/meal-plans` | Forecast porsi, perencanaan per kelompok, buffer porsi |
| GET | `/material-requirements?period_type=weekly\|monthly&menu_id=` | Kebutuhan bahan per menu/mingguan/bulanan |
| GET | `/material-requirements/net` | Net requirement setelah stok |
| GET | `/material-requirements/urgent` | Peringatan kebutuhan mendesak |
| POST | `/material-requirements/substitution-plan` | Perencanaan bahan substitusi |
| GET/POST | `/capacity-plans?type=` | Kapasitas dapur, workload, kemasan, tenaga kerja, simulasi jumlah santri |

## 6. Anggaran & Biaya (§4.5)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/budgets?scope=` | Anggaran tahunan/bulanan/per porsi/per kelompok |
| POST | `/budgets/:id/submit` | Ajukan anggaran |
| POST | `/budgets/:id/approve` | Persetujuan anggaran |
| GET | `/budgets/:id/comparison` | Komparasi anggaran vs realisasi |
| GET/POST | `/cost-estimates` | Estimasi biaya menu, simulasi biaya pekanan |
| GET | `/cost-estimates/deviation` | Kontrol deviasi biaya |
| GET | `/cost-records?type=` | Biaya bahan/porsi, waste, overhead, alokasi per layanan |
| GET/POST | `/spending-commitments` | Pengendalian komitmen belanja |

## 7. Pengadaan & Belanja (§4.6)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/purchase-requests` | Permintaan pembelian |
| POST | `/purchase-requests/:id/approve` | Persetujuan pembelian |
| GET/POST | `/purchase-orders` | Rencana pembelian, PO |
| PUT | `/purchase-orders/:id` | Edit |
| POST | `/purchase-orders/:id/send` | Kirim PO ke supplier |
| GET/POST | `/purchase-orders/:id/items` | Item PO |
| GET/POST | `/daily-shopping-lists` | Daftar belanja harian, checklist belanja |
| GET | `/supplier-price-history?ingredient_id=` | Perbandingan & histori harga supplier |
| POST | `/supplier-price-history/:id/select` | Pemilihan supplier |
| GET/POST | `/purchase-transactions?type=purchase\|return\|emergency` | Transaksi belanja, retur, pembelian darurat |
| GET | `/purchase-transactions/:id/proof` | Bukti transaksi |
| GET/POST | `/purchase-reconciliations` | Rekonsiliasi belanja |

## 8. Penerimaan Bahan (§4.7)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/goods-receipts` | Penerimaan bahan |
| PUT | `/goods-receipts/:id` | Edit |
| POST | `/goods-receipts/:id/verify` | Verifikasi |
| GET | `/goods-receipts/:id/report` | Berita acara penerimaan |
| GET/POST | `/goods-receipts/:id/items` | Item, pemeriksaan kuantitas/kualitas/suhu, lot & expiry |
| POST | `/goods-receipt-items/:id/reject` | Penolakan penerimaan |
| GET | `/goods-receipt-items/:id/variance` | Selisih penerimaan |

## 9. Persediaan & Gudang (§4.8)

| Method | Endpoint | Fitur |
|---|---|---|
| GET | `/stock-balances?ingredient_id=&location_id=` | Stok bahan baku, per lot |
| GET | `/stock-balances/critical` | Stok kritis, minimum stok, reorder point |
| GET | `/stock-balances/near-expiry` | Bahan mendekati kedaluwarsa |
| GET | `/stock-balances/valuation` | Nilai persediaan |
| GET/POST | `/stock-movements?type=` | Penyesuaian, mutasi antar lokasi, pengambilan, pemusnahan, retur internal |
| GET | `/stock-movements/card?ingredient_id=` | Kartu stok |
| GET/POST | `/stock-opnames` | Stock opname |
| GET/POST | `/stock-opnames/:id/items` | Detail opname |
| GET/POST | `/picking-lists` | Picking list |

## 10. Produksi & Operasional Dapur (§4.9)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/production-schedules` | Jadwal produksi |
| GET/POST | `/production-batches` | Work order, batch produksi |
| POST | `/production-batches/:id/start` | Mulai |
| POST | `/production-batches/:id/pause` | Pause |
| POST | `/production-batches/:id/complete` | Selesai |
| POST | `/production-batches/:id/verify` | Verifikasi |
| GET/POST | `/production-batches/:id/materials` | Kitting bahan, pemakaian, selisih |
| GET/POST | `/production-logs?type=` | Log proses masak, checklist persiapan, hasil masak, sisa masakan, rework, downtime, serah terima shift, check-in, checklist kebersihan |

## 11. Distribusi & Absensi Makan (§4.10)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/meal-distributions` | Jadwal distribusi, porsi per kelompok |
| GET | `/meal-distributions/:id/delivery-list` | Daftar pengantaran |
| POST | `/meal-distributions/:id/handover` | Serah terima makanan |
| POST | `/meal-distributions/:id/extra` | Makan tambahan |
| POST | `/meal-distributions/:id/return` | Pengembalian makanan |
| GET/POST | `/meal-attendances` | Absensi makan santri, per kelas/asrama |
| POST | `/meal-attendances/:id/reduce-portion` | Pengurangan porsi tidak hadir |
| GET | `/meal-attendances/consumption-recap` | Rekap tingkat konsumsi |
| GET/POST | `/special-meal-recipients` | Daftar penerima khusus, label porsi khusus |

## 12. Kontrol Kualitas & Keamanan Pangan (§4.11)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/qc-checks?type=` | Checklist mutu, kebersihan, suhu, organoleptik, sanitasi, kalibrasi, audit internal |
| GET/POST | `/food-sampling` | Sampling makanan |
| GET/POST | `/food-safety-incidents` | Insiden keamanan pangan, tindakan korektif/preventif |
| GET | `/food-safety-incidents/critical-alerts` | Peringatan pelanggaran kritis |
| GET/POST | `/production-batches/:id/qc-result` | Status kelulusan batch |

## 13. Waste & Kehilangan (§4.12)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/waste-records?type=` | Bahan rusak/kedaluwarsa/hilang, makanan terbuang, klasifikasi |
| GET | `/waste-records/analysis` | Analisis akar penyebab, rekap per bahan/menu |
| GET/POST | `/waste-reduction-targets` | Target, monitoring, tindakan pengurangan waste |

## 14. Analitik & Laporan (§4.13)

| Method | Endpoint | Fitur |
|---|---|---|
| GET | `/dashboard` | Dashboard operasional dapur |
| GET | `/reports/menu-weekly` | Laporan menu mingguan |
| GET | `/reports/material-requirements` | Laporan kebutuhan bahan |
| GET | `/reports/purchases` | Laporan pembelian |
| GET | `/reports/stock` | Laporan stok |
| GET | `/reports/material-usage` | Laporan pemakaian bahan |
| GET | `/reports/student-consumption` | Laporan konsumsi santri |
| GET | `/reports/cost-per-portion` | Laporan biaya per porsi |
| GET | `/reports/budget-deviation` | Laporan deviasi anggaran |
| GET | `/reports/suppliers` | Laporan supplier |
| GET | `/reports/qc-food-safety` | Laporan QC & keamanan pangan |
| GET | `/reports/waste` | Laporan waste |
| GET | `/reports/price-trend` | Analisis tren harga bahan |
| GET | `/reports/material-consumption-analysis` | Analisis konsumsi bahan |
| GET | `/reports/forecast-accuracy` | Analisis akurasi forecast |
| POST | `/reports/export` | Ekspor laporan |
| GET/POST | `/report-schedules` | Jadwal laporan otomatis |
| GET | `/reports/:type/drill-down` | Drill-down KPI |

## 15. Workflow, Pengguna & Audit (§4.14)

| Method | Endpoint | Fitur |
|---|---|---|
| GET/POST | `/staff-assignments` | Manajemen pengguna dapur, role & hak akses (draf — lihat Keputusan Terbuka #5) |
| GET/POST | `/approval-requests` | Approval bertingkat |
| POST | `/approval-requests/:id/approve` | " |
| POST | `/approval-requests/:id/reject` | " |
| GET/POST | `/notifications?type=` | Notifikasi tugas, stok kritis, expiry |
| POST | `/notifications/:id/read` | Tandai dibaca |
| GET | `/audit-trails` | Audit trail, riwayat perubahan data |
| GET/POST | `/period-locks` | Penguncian periode, tutup buku dapur |
| POST | `/data-imports` | Import data massal |
| GET | `/data-validations` | Validasi data lintas modul |
| GET/PUT | `/service-status` | Status layanan dapur (definisi menunggu klarifikasi) |

## 16. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | Dokumen dibuat, mengikuti struktur 202 fitur di `rancangan-dapur.md`/`erd-dapur.md`. |

*(Tambahkan baris baru di atas setiap ada endpoint baru/berubah — jangan hapus riwayat lama.)*
