# Core Aldepos

Sistem manajemen sekolah terintegrasi Yayasan Aldepos (monorepo `apps/*`): backend Express modular monolith, portal internal React, dan website publik Next.js. Delapan dari sebelas modul sudah berjalan di produksi, jadi **jangan menulis ulang kode yang jalan**; kerjakan hanya tugas aktif.

Status: draft | Diperbarui: 2026-09-29

## Stack (terverifikasi dari package.json)
- Backend `apps/api-backend`: Node.js (CommonJS), Express 4, Knex 3 + mysql2, MariaDB 10.5, zod, jsonwebtoken, bcryptjs, helmet, pdfkit.
- Portal `apps/core-portal`: React 18 (ES Modules), Vite 5, react-router 6, Tailwind 3, axios.
- Website `apps/website-utama`: Next.js 14 (App Router, TypeScript).
- Database: **11 database terpisah**, satu per modul: core, kepegawaian, akademik, keuangan, alquran, kantin, sarpras, dapur, perpustakaan, manajemen, website-utama.

## Aturan wajib
1. Satu database per modul. **Dilarang JOIN atau FOREIGN KEY lintas database.** Data modul lain diambil lewat service milik modul itu (in-process), bukan query langsung ke tabelnya.
2. Tabel spesifik sekolah wajib punya `satuan_pendidikan_id`. Unit yang aktif **harus divalidasi terhadap `school_units` milik user di JWT**; jangan percaya header dari klien begitu saja.
3. Data uang, presensi, nilai, dan dokumen resmi tidak dihapus fisik. Gunakan **Void** dengan alasan wajib dan catat di audit log. Delete fisik hanya untuk draf.
4. Response API: sukses `{ success: true, data, message, errors: null }`, gagal `{ success: false, data: null, message, errors }`.
5. Nama tabel dan kolom: Inggris, `snake_case`. PK `id BIGINT UNSIGNED AUTO_INCREMENT`; `created_at`/`updated_at` kecuali tabel log append-only.
6. Query hanya lewat Knex (parameterized). Input divalidasi di backend dengan zod. Logic bisnis di service layer, bukan di controller atau route.
7. Rahasia hanya dari environment. **Tidak boleh ada nilai default untuk rahasia.** Jangan menampilkan atau menyalin isi `.env`.
8. Jangan menambah dependency tanpa persetujuan.
9. Jangan mengubah file di `docs/` kecuali tugas aktif menyebutnya. Selain itu, usulkan diff-nya di jawaban.
10. Kerjakan hanya tugas di "Sedang dikerjakan" pada `docs/tasks.md`. Temuan baru masuk Backlog, jangan dikerjakan sekaligus.
11. Centang tugas hanya jika "Selesai jika" terpenuhi dan bukti verifikasinya ditampilkan (test, atau langkah manual bila test belum ada).
12. Git: branch `feature/T-xxx-slug`, commit `tipe(T-xxx): ringkasan`. Jangan commit langsung ke `main`. Jangan `git add` seluruh folder tanpa memeriksa `git status`.
13. UI: ikuti panduan desain (lihat peta dokumen) dan pakai komponen di `apps/core-portal/src/shared/`. Jangan membuat token, warna, atau gaya baru sendiri.

## Pola yang dikenal tidak aman: jangan ditiru
Rinciannya di `docs/security.md`. Jangan menyalin pola berikut ke kode baru: `requireApiKey` yang tidak memvalidasi kunci, fallback rahasia seperti `SECRET || 'teks'`, mengambil `student_id` dari query/body tanpa cek kepemilikan (termasuk fallback `|| 1`), dan memakai header unit sekolah tanpa validasi.

## Peta dokumen: baca ini dulu sesuai tugas
| Tugas | Baca |
|---|---|
| Backend / logic modul X | `ai-ref-X.md`, `api-contract-X.md`, `roles-X.md`, `docs/security.md` |
| Skema database | **Migrasi di `apps/api-backend/db/migrations/<modul>/` adalah kebenaran.** `erd-X.md` dan `ai-ref-X.md` hanya rujukan dan bisa tertinggal |
| UI | `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` dan `apps/core-portal/PANDUAN-DESAIN-UI.md` (akan digabung), `api-contract-X.md` |
| Arsitektur / lintas modul | `docs/ARSITEKTUR-SISTEM.md`, `docs/AI-CONTEXT.md` §2-§4 (berstatus perlu-revisi; cek anotasi DRIFT) |
| Deployment | `docs/panduan-deployment-dan-strategi-lingkungan.md` (sebagian TIDAK VALID; baca peringatannya) |
| Tugas berikutnya | `docs/tasks.md` |

Modul: core, website-utama, akademik, kepegawaian, keuangan, sarpras, kantin, dapur, perpustakaan, alquran, manajemen. Modul belum ada: Ujian/CBE dan Komunikasi. Portal Orangtua baru sebagian (`ParentBills.jsx`).

## Perintah standar
- dev backend: `npm run dev:backend` (port 3000, memuat `apps/api-backend/.env`)
- dev portal: `npm run dev:portal` (5173) | dev website: `npm --workspace=apps/website-utama run dev`
- build portal: `npm run build:portal`
- migrate core: `npm run migrate:core` | modul lain: `npm --workspace=apps/api-backend run migrate:<modul>`
- seed: `npm --workspace=apps/api-backend run seed:<modul>` (core: `seed`)
- test: **belum ada** (dibuat di T-005) | lint: **belum ada** (T-005)
