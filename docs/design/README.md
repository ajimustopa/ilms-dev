# Peta Desain Portal Guru

Sumber: Google Stitch. Ukuran acuan: mobile 390px, desktop 1440px.
Setiap layar punya pasangan .html (referensi visual) dan .png (acuan perbandingan).

## Aturan pakai
- HTML adalah referensi visual, BUKAN kode produksi. Bangun ulang memakai komponen dan stack proyek yang ada.
- Untuk token (warna, tipografi, radius, spacing): DESIGN.md menang. Jika tidak ada, ekstrak dari HTML dan simpan ke DESIGN.md.
- Untuk tata letak: folder halaman yang bersangkutan menang.
- Layar yang TIDAK tersedia di bawah dirancang oleh agent mengikuti PRD (bagian 5-7) dan gaya layar default halaman yang sama. Tandai di laporan bahwa layar itu diturunkan, bukan dari desain.

## Layar yang tersedia
| Folder | Route | mobile-default | desktop-default |
|---|---|---|---|
| 01-dashboard | /guru/dashboard | ada | ada |
| 02-presensi-diri | /guru/absensi-diri | ada | ada |
| 03-pengajuan-izin | /guru/absensi-diri (tab Pengajuan) | ada | ada |
| 04-jadwal | /guru/jadwal | ada | ada |
| 05-tujuan-pembelajaran | /guru/tujuan-pembelajaran | ada | ada |
| 06-absensi-kelas | /guru/absensi-kelas | ada | ada |
| 07-penilaian | /guru/penilaian | ada | ada |
| 08-siswa | /guru/siswa | ada | ada |
| 09-pengumuman | /guru/pengumuman | ada | ada |
| 10-kejadian-siswa | /guru/kejadian-siswa | ada | ada |
| 11-profil | /guru/profil | ada | ada |

## Layar yang belum didesain (diturunkan agent dari PRD)
- State loading (skeleton), empty, error untuk semua halaman: ikuti PRD bagian 7.
- 02-presensi-diri: sudah-masuk, luar-radius, gps-lemah, waktu-pulang (desktop juga).
- 03-pengajuan-izin: form pengajuan, form dengan preview upload.
- 05-tujuan-pembelajaran: form TP, drawer pilih konteks, konfirmasi hapus.
- 06-absensi-kelas: jurnal terbuka, banyak siswa absen.
- 07-penilaian: tab Capaian TP, tab Sikap & Karakter, nilai invalid, status dikunci, drawer filter.
- 08-siswa: drawer filter.
- 09-pengumuman: detail (reader/modal).
- 10-kejadian-siswa: tab Prestasi, tab Konseling Privat BK, form kejadian.

## Catatan
- Beberapa halaman sempat punya banyak iterasi gaya di Stitch. Iterasi desain lama tidak disimpan di repo (hanya versi final di 01-dashboard sampai 11-profil) dan folder _arsip tidak ada. Acuan resmi hanya subfolder `01-dashboard` s/d `11-profil` serta `DESIGN.md`.