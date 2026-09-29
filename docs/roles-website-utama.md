Status: perlu-revisi
Diperbarui: 2026-08-24

# roles-website-utama.md

> Matriks role & permission modul **Website Utama**. Mengikuti pola `roles-coreservice.md`.
> Contoh path endpoint memakai prefix `/api/v1/website-utama/...`.
>
> **Catatan penting berbeda dari modul lain**: karena publik tanpa login (lihat
> `rancangan-website-utama.md` §2.1), matriks di bawah hanya relevan untuk endpoint `/admin/...`.
> Endpoint `/public/...` selalu bisa diakses siapa saja tanpa role — ditandai baris terpisah di
> Bagian 3.

---

## 1. Konsep & Arsitektur RBAC Website Utama

Website Utama **tidak mendefinisikan role globalnya sendiri** — role tetap berasal dari
tabel `roles`/`user_school_roles` milik Core Service (satu sumber kebenaran RBAC lintas sistem,
`erd-coreservice.md` §2.4–2.7). Yang spesifik untuk modul ini adalah **`cms_access_grants`**
(`erd-website-utama.md` §2.23) — tabel penetapan **siapa (user Core) boleh mengakses CMS Website
Utama dan dengan `role_code` apa**, karena tidak semua user Core otomatis punya akses CMS
(misalnya guru punya akun Core untuk modul Akademik tapi belum tentu ditugaskan menulis di
Website Utama).

### 1.1 Prinsip Desain
1. Akun & autentikasi tetap sepenuhnya dari Core Service — Website Utama tidak menyimpan
   password/sesi sendiri.
2. Akses CMS bersifat **opt-in per user** lewat `cms_access_grants`, bukan otomatis dari role
   Core Service manapun — supaya guru/siswa yang menulis artikel tidak otomatis dapat akses CMS
   penuh.
3. `role_code` di `cms_access_grants` **belum final** (lihat `rancangan-website-utama.md` §5) —
   daftar di Bagian 2 adalah usulan awal untuk direview developer.

---

## 2. Definisi Daftar Role CMS Website Utama (Usulan — Tandai untuk Review)

| `role_code` | Deskripsi Peran |
|---|---|
| `superadmin_cms` | Akses penuh seluruh submodul CMS, termasuk kelola akses CMS user lain (Fitur #34) dan pengaturan situs/SEO (Fitur #35) |
| `admin_konten` | Kelola konten publik (beranda, profil pengajar, kehidupan sekolah, berita, galeri, FAQ, testimoni, agenda, akreditasi) — Fitur #14–#24 |
| `admin_ppdb` | Kelola PPDB: jadwal seleksi, verifikasi pembayaran manual, update status pendaftar — Fitur #25–#28 |
| `admin_konsultasi` | Kelola tiket & booking konsultasi — Fitur #29–#30 |
| `editor_artikel` | Guru/Siswa dengan akses submit & edit artikel sendiri (tidak bisa publish langsung) — Fitur #31 |
| `moderator_artikel` | Review, publish artikel, dan moderasi komentar — Fitur #31–#32 |

> Kalau developer memutuskan cukup satu role generik `admin_cms` untuk semua submodul (bukan
> dipecah 6 seperti di atas), tinggal hapus baris yang tidak perlu — struktur tabel
> `cms_access_grants` (VARCHAR bebas) sudah mendukung kedua opsi tanpa migrasi ulang skema.

---

## 3. Matriks Hak Akses per Fitur

> **Keterangan Simbol:** ✅ Diizinkan penuh | 🏢 Khusus Satuan Pendidikan yang ditugaskan |
> 👤 Khusus data miliknya sendiri | ❌ Tidak diizinkan | 🌐 Endpoint publik, semua orang (tanpa login)

| # | Fitur | Aksi | `superadmin_cms` | `admin_konten` | `admin_ppdb` | `admin_konsultasi` | `editor_artikel` | `moderator_artikel` | Publik |
|:---:|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 14 | Beranda | Lihat / Edit hero & highlights | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 15 | Profil sekolah | Lihat | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🌐 |
| 16 | Struktur organisasi & profil pengajar | Lihat / Edit | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 17 | Kehidupan sekolah | Lihat / Edit | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 18 | Berita & pengumuman | Lihat / Tulis / Publish | ✅/✅/✅ | ✅/✅/✅ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | 🌐/❌/❌ |
| 19 | Galeri foto & kegiatan | Lihat / Edit | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 20 | FAQ publik | Lihat / Edit | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 21 | Testimoni | Lihat / Moderasi tampil | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 22 | Agenda & kegiatan sekolah | Lihat / Edit / Publish | ✅/✅/✅ | ✅/✅/✅ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | 🌐/❌/❌ |
| 23 | Kontak & lokasi sekolah | Lihat | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🌐 |
| 24 | Informasi akreditasi & prestasi | Lihat / Edit | ✅/✅ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 25 | PPDB online | Submit (publik) / Lihat semua pendaftar / Verifikasi berkas | 🌐/✅/✅ | 🌐/❌/❌ | 🌐/✅/✅ | 🌐/❌/❌ | 🌐/❌/❌ | 🌐/❌/❌ | 🌐/❌/❌ |
| 26 | Jadwal seleksi PPDB | Lihat / Edit | ✅/✅ | ❌/❌ | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | 🌐/❌ |
| 27 | Pembayaran biaya pendaftaran | Bayar (publik) / Verifikasi manual | 🌐/✅ | 🌐/❌ | 🌐/✅ | 🌐/❌ | 🌐/❌ | 🌐/❌ | 🌐/❌ |
| 28 | Tracking status pendaftaran | Lihat (publik, per kode) / Update status | 🌐/✅ | 🌐/❌ | 🌐/✅ | 🌐/❌ | 🌐/❌ | 🌐/❌ | 🌐/❌ |
| 29 | Form konsultasi publik (tiket) | Kirim (publik) / Lihat semua / Balas / Tutup | 🌐/✅/✅/✅ | 🌐/❌/❌/❌ | 🌐/❌/❌/❌ | 🌐/✅/✅/✅ | 🌐/❌/❌/❌ | 🌐/❌/❌/❌ | 🌐/❌/❌/❌ |
| 30 | Booking konsultasi virtual | Booking (publik) / Konfirmasi / Reschedule | 🌐/✅/✅ | 🌐/❌/❌ | 🌐/❌/❌ | 🌐/✅/✅ | 🌐/❌/❌ | 🌐/❌/❌ | 🌐/❌/❌ |
| 31 | Artikel & berita oleh guru/siswa | Tulis draft / Submit review / Publish | ✅/✅/✅ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | 👤/👤/❌ | ✅/✅/✅ | 🌐 (lihat published) |
| 32 | Moderasi komentar artikel | Lihat komentar / Approve / Reject | ✅/✅/✅ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ✅/✅/✅ | 🌐 (kirim komentar) |
| 33 | Theme builder | Lihat / Edit / Preview | ✅/✅/✅ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌ |
| 34 | Manajemen user CMS (superadmin) | Lihat daftar akses / Beri akses / Cabut akses | ✅/✅/✅ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌/❌/❌ | ❌ |
| 35 | Pengaturan situs & SEO | Lihat / Edit | ✅/✅ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | ❌/❌ | ❌ |

---

## 4. Pemetaan Database & Contoh Middleware

### 4.1 Relasi Otorisasi

```
+------------------+         +------------------------+
| Core: users      | <-----> | cms_access_grants       |
+------------------+         +------------------------+
| id (PK)          |         | id (PK)                 |
| username         |         | school_unit_id           |
| account_type     |         | user_id (ref users.id)   |
+------------------+         | role_code                |
                              | status                   |
                              +--------------------------+
```

`cms_access_grants.user_id` **bukan FK fisik** ke `users.id` Core Service (beda database) —
divalidasi lewat pemanggilan service Core secara in-process saat login CMS dijalankan (ambil
payload JWT, cek `cms_access_grants` di database Website Utama untuk `role_code` aktif).

### 4.2 Contoh Middleware (Express, in-process)

```js
// apps/api-backend/src/modules/website-utama/middleware/requireCmsRole.js
function requireCmsRole(...allowedRoles) {
  return async (req, res, next) => {
    const grant = await db('cms_access_grants')
      .where({ user_id: req.user.id, school_unit_id: req.schoolUnitId, status: 'active' })
      .first();
    if (!grant || !allowedRoles.includes(grant.role_code)) {
      return res.status(403).json({ success: false, data: null, message: 'Tidak memiliki akses CMS', errors: null });
    }
    req.cmsRole = grant.role_code;
    next();
  };
}
module.exports = { requireCmsRole };
```

Contoh pemakaian di route:
```js
router.put('/admin/site-settings', verifyJwt, requireCmsRole('superadmin_cms'), siteSettingsController.update);
router.post('/admin/news', verifyJwt, requireCmsRole('superadmin_cms', 'admin_konten'), newsController.create);
```

---

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Dokumen dibuat. Daftar 6 `role_code` di Bagian 2 ditandai **usulan awal untuk
  direview** (lihat `rancangan-website-utama.md` §5 poin granularitas role CMS). |

*(Tambahkan baris baru di atas setiap ada perubahan daftar role/permission — jangan hapus
riwayat lama.)*
