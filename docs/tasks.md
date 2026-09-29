Status: draft
Diperbarui: 2026-09-29

# Tasks

Aturan: satu tugas aktif, satu branch `feature/T-xxx-slug`, satu commit. Hanya milestone di "Berikutnya" yang dirinci; sisanya cukup judul dan dirinci saat sudah dekat.

## Sedang dikerjakan
- [ ] T-004b Verifikasi temuan T-004 (hanya baca)
  - Baca: security.md
  - Selesai jika: lima pertanyaan terbuka di security.md terjawab dengan kutipan kode, dan riwayat git diperiksa untuk file `.env`

## Berikutnya (urut prioritas)
- [ ] T-005 Tahap B minimal: test runner dan script
  - Baca: AGENTS.md, security.md
  - Selesai jika: `npm test` dan `npm run lint` di root berjalan dari clone bersih; dua test timetable yang sudah ada ikut dijalankan; satu smoke test endpoint health lolos
- [ ] T-006 `.env.example` lengkap dan validasi env saat start
  - Baca: security.md (aturan 4)
  - Selesai jika: `.env.example` memuat variabel 11 modul (tanpa nilai rahasia); server berhenti dengan pesan jelas bila variabel wajib kosong; ada test untuk kasus itu
- [ ] T-007 Hapus fallback rahasia JWT (SEC-06b)
  - Baca: security.md
  - Selesai jika: tidak ada `|| '...'` untuk rahasia di seluruh `src/`; test membuktikan server tidak start tanpa `CORE_JWT_SECRET`. **Prasyarat: pastikan variabel itu terisi di produksi sebelum deploy**

## Backlog / temuan baru
- T-008 Rate limit login, reset password, PPDB, upload bukti (SEC-02b, SEC-03)
- T-009 `requireApiKey`: validasi hash ke `api_clients`, atau lepas dari route yang tidak memakainya (SEC-01)
- T-010 Sertakan `ref_type` dan `ref_id` di JWT (B2-03)
- T-011 Portal orangtua: cek kepemilikan santri di server, hapus fallback `|| 1` (SEC-04)
- T-012 Ukur cakupan lalu validasi `x-school-unit-id` terhadap `school_units` di JWT secara terpusat (SEC-10)
- T-013 CORS whitelist dari environment (SEC-05)
- T-014 Upload bukti bayar publik: kunci acak, bukan ID berurutan; validasi `file_url` dan batas body (SEC-02c, SEC-09)
- T-015 CI dasar: lint, test, build
- T-016 Skrip backup 11 database dan prosedur restore tertulis
- T-017 `conventions.md` dengan satu contoh kode "emas"
- T-018 Skrip pembuat skema dari migrasi; hapus tabel kolom dari `ai-ref-*`
- T-019 Gabung dokumen per modul, satu modul per tugas, mulai dari alquran
- T-020 Perbarui dokumen: root route `/` (login gate dipertahankan), klaim GitHub Actions, klaim API token website-utama
- T-021 Impeccable: init, `design-system.md`, lalu komponen `shared/`
- T-022 Selesaikan utang desain: `manajemen-theme.css`, duplikasi layout modul
- T-023 Rapikan `AI-CONTEXT.md`: hapus rujukan ke file yang tidak ada, pecah tabel status
- T-024 Pintasan migrasi root untuk 6 modul yang belum punya

## Selesai
- [x] T-001 Konsolidasi docs: 4 file lama diarsipkan, header status ditambahkan (`fd12151`)
- [x] T-002 Audit drift dokumen vs kode. Catatan: tabel hasil perlu dicek ulang per temuan (B1-08, B2-04, B2-07 keliru atau salah rujukan)
- [x] T-003 Koreksi dokumen berdasarkan audit (`6225e29`)
- [x] T-004 Pengintaian keamanan (hanya baca); hasil ada di security.md
