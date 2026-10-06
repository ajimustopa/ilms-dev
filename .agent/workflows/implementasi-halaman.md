---
description: Implementasi/optimasi satu halaman Portal Guru berdasarkan desain Stitch (3 fase)
---
Portal Guru SUDAH ADA dan terhubung ke API. Tugas ini mengoptimalkan, bukan membangun ulang. Pertahankan route, service, dan logika bisnis yang sudah benar.

FASE 1 - ANALISIS SELISIH (hanya baca, jangan ubah file):
1. Lihat PNG di docs/design/<folder halaman>/ lebih dulu, lalu HTML untuk struktur. Baca docs/design/DESIGN.md dan bagian PRD halaman itu (docs/PRD-PORTAL-GURU-UIUX.md).
2. Temukan file UI, route, service, dan komponen halaman saat ini di apps/core-portal/src/apps/guru/.
3. Buat tabel: Elemen desain/PRD | Kondisi sekarang | Tindakan (PERTAHANKAN / UBAH TAMPILAN / TAMBAH / GANTI) | Perlu perubahan backend/DB? (ya/tidak).
4. Daftar layar yang tidak ada di desain (loading skeleton, empty, error, form, tab, status khusus) yang akan Anda turunkan dari PRD bagian 5-7 dan gaya layar default.
5. Jika perlu perubahan backend/DB: usulkan endpoint/kolom/migrasi beserta rollback. JANGAN menulis atau menjalankan migrasi pada fase ini.
6. Daftar risiko regresi dan pertanyaan untuk saya.
BERHENTI. Tunggu saya mengetik LANJUT.

FASE 2 - IMPLEMENTASI (setelah LANJUT):
1. Backend/DB hanya jika disetujui: buat file migrasi yang bisa di-rollback; JANGAN menjalankannya, berikan perintahnya.
2. Terapkan desain ke komponen React memakai token Tailwind proyek dan komponen bersama dari shell. Jangan menyalin markup HTML mockup mentah. Jangan memakai script Tailwind CDN dari mockup.
3. Wajib: 4 state (skeleton, empty, error, offline bila relevan), responsif mobile 390 / tablet 768 / desktop 1440, touch target mobile minimal 44x44px, angka tabular-nums, semua teks UI berbahasa Indonesia, tidak ada rounded-2xl/3xl, tidak ada data dummy.
4. Pertahankan kontrak API dan payload yang sudah ada kecuali disetujui.

FASE 3 - VERIFIKASI & SERAH TERIMA:
1. Jalankan lint, type-check (jika ada), build, dan test. Laporkan hasilnya apa adanya.
2. Jalankan aplikasi, uji alur utama dan alur gagal, ambil screenshot mobile/tablet/desktop, bandingkan dengan PNG desain dan sebutkan selisih.
3. Uji isolasi data (guru A tidak melihat data guru B) jika ada akun uji.
4. Laporkan: file yang berubah, hasil uji, selisih dari desain, layar yang diturunkan (bukan dari desain), keputusan yang butuh saya.
5. Commit dengan pesan feat(guru): <halaman>. JANGAN push, JANGAN merge.
