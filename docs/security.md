Status: draft
Diperbarui: 2026-09-29

# Keamanan: Core Aldepos

Sumber: pengintaian T-004 (hanya baca) dan audit T-002. Setiap temuan punya kutipan kode asli. Temuan bertanda **PERLU VERIFIKASI** belum dibuktikan tuntas. Perbaikan dikerjakan lewat tugas di `tasks.md`, dengan test lebih dulu setelah T-005.

## Aset dan ancaman
| Aset | Ancaman utama |
|---|---|
| Data keuangan (tagihan, pembayaran, jurnal) | Pemalsuan bukti bayar, akses tanpa izin, kehilangan data (backup) |
| Data pribadi santri dan wali | Wali membaca data santri lain, kebocoran lintas satuan pendidikan |
| Akun dan token (JWT, superadmin) | Pemalsuan token, brute force login |
| Dompet dan PIN santri (kantin) | Pembobolan PIN, transaksi tanpa izin |
| Ketersediaan (produksi Hostinger) | Banjir request ke endpoint publik, backup tidak mencakup semua database |

## Aturan wajib
1. Semua endpoint non-publik melewati `verifyJwt` dan `requirePermission`. Endpoint publik harus tercatat di daftar "Endpoint publik" di bawah.
2. Unit sekolah aktif divalidasi terhadap `school_units` di JWT. Header dari klien tidak dipercaya.
3. Data anak hanya boleh dibaca wali yang terhubung ke anak itu (cek di server, bukan dari parameter).
4. Rahasia hanya dari environment. **Server harus gagal start** bila rahasia wajib tidak ada. Tidak ada nilai default.
5. Query hanya lewat Knex (parameterized). Input divalidasi dengan zod di backend.
6. Password dan PIN di-hash dengan `bcryptjs`. Jangan menulis nilai rahasia ke log.
7. Endpoint publik yang menulis data wajib rate limit.
8. Data uang tidak dihapus fisik; pakai Void dengan alasan dan audit log.
9. Backup semua 11 database berjalan otomatis dan **restore sudah pernah dicoba**.

## Temuan terbukti (T-004)
| ID | Temuan | Kutipan / bukti | Tingkat | Tugas |
|---|---|---|---|---|
| SEC-06b | Fallback rahasia JWT hardcoded. Jika `CORE_JWT_SECRET` kosong di server, siapa pun yang tahu string ini bisa memalsukan token, termasuk superadmin | `verifyJwt.js:20` `process.env.CORE_JWT_SECRET \|\| 'default_core_jwt_secret_key'` | Tinggi | T-007 |
| SEC-04 | Wali dapat memilih `student_id` sendiri, dan ada fallback ke santri nomor 1. Jika JWT tidak memuat `ref_id` (lihat B2-03, **PERLU VERIFIKASI**), wali tanpa parameter otomatis mendapat data santri 1 | `keuangan/parent-facing/controller.js:20` `req.query.student_id \|\| req.body?.student_id \|\| req.user?.ref_id \|\| 1` | Tinggi | T-010, T-011 |
| SEC-01 | `requireApiKey` hanya mengecek keberadaan header, tidak memvalidasi kunci | `middlewares/auth.js:17-18` `// TODO: Validasi hash API key` lalu `next();` | Tinggi | T-009 |
| SEC-03 | Tidak ada rate limit di backend (login, reset password, pendaftaran PPDB, upload bukti bayar). **Konfirmasi lewat package.json** | Pencarian `express-rate-limit` dan `rate-limit` tanpa hasil | Tinggi | T-008 |
| SEC-10 | Header `x-school-unit-id` dipakai langsung sebagai filter pada endpoint yang hanya memakai `verifyJwt`. **Cakupan belum diukur** (belum dihitung berapa endpoint) | `keuangan/schemes/controller.js:46` `req.headers['x-school-unit-id'] \|\| req.body.school_unit_id` | Sedang-Tinggi | T-012 |
| SEC-02c | Upload bukti bayar PPDB publik memakai ID tagihan berurutan sebagai satu-satunya kunci | `ppdb-billing/routes.js:218` `'/public/ppdb-billing/registration-bills/:id/upload-proof'` | Sedang | T-014 |
| SEC-02b | Pendaftaran PPDB publik menulis pendaftar dan tagihan tanpa rate limit. Naik dari "rendah" karena gabungan dengan SEC-03 | `website-utama/public/routes.js:37` `router.post('/ppdb/registrants', ...)` | Sedang | T-008 |
| SEC-09 | Dokumen diterima sebagai string `file_url` dalam JSON tanpa validasi tipe. Lokasi penyimpanan file belum terjawab (**PERLU VERIFIKASI**). Batas body 50 MB perlu ditinjau | `akademik/psb/service.js:873` `if (!document_type \|\| !file_url)` | Sedang | T-014 |
| SEC-05 | CORS mengizinkan semua origin dan `CORE_CORS_ORIGIN` tidak dipakai. Risiko rendah selama token dikirim lewat header `Authorization`, bukan cookie; tetap perlu whitelist | `app.js:79-81` `cors({ origin: true, credentials: true })` | Rendah-Sedang | T-013 |
| SEC-02d | Jawaban psikotes publik hanya dijaga token URL. Keacakan token belum diperiksa | `psychotest/routes.js:22` `'/public/:token/answers'` | Rendah | Backlog |
| SEC-08 | Tidak ada skrip backup di repo. Prosedur di dokumen hanya untuk satu database | `panduan-deployment...md` (blok TIDAK VALID) | Tinggi (operasional) | Manual + T-0xx |

Sudah baik: PIN dompet kantin di-hash `bcrypt` dan dibandingkan dengan `bcrypt.compare` (SEC-07). `.gitignore` memblokir `.env` (SEC-06a; riwayat git belum diperiksa).

## Endpoint publik yang diketahui (perlu dilengkapi)
`POST /core/auth/login`, `POST /website-utama/public/ppdb/registrants`, `POST /keuangan/public/ppdb-billing/registration-bills/:id/upload-proof`, `POST /kepegawaian/psychotest/public/:token/answers`, OPAC perpustakaan. Daftar lengkap masih perlu dipastikan.

## Pertanyaan terbuka
1. Siapa pemanggil route yang memakai `requireApiKey`? Website-utama tampaknya tidak mengirim kunci, jadi route itu mungkin tidak dipakai atau memang terbuka.
2. Apakah JWT produksi memuat `ref_type` dan `ref_id`? Sumber: `core/auth/service.js:115-122`.
3. Apakah `CORE_JWT_SECRET` produksi terisi nilai acak yang kuat?
4. Apakah `.env` pernah masuk riwayat git?
5. Apakah ada rate limit di lapisan Nginx atau Cloudflare?

## Checklist sebelum rilis
- [ ] Semua temuan Tinggi ditutup atau diterima tertulis
- [ ] Backup 11 database otomatis, restore pernah diuji
- [ ] Rahasia produksi bukan nilai default, dan server menolak start tanpa rahasia
- [ ] Rate limit aktif di login dan endpoint publik penulis data
- [ ] Audit dependency (`npm audit`) dijalankan
- [ ] HTTPS aktif, error tracking dan logging aktif
