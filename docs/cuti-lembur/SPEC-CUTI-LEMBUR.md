# SPEC-CUTI-LEMBUR — Spesifikasi Acuan Terkunci
Core Aldepos · Modul Kepegawaian (HRIS) · Halaman "Manajemen Cuti, Izin & Lembur"

Simpan di repo: `docs/cuti-lembur/SPEC-CUTI-LEMBUR.md`. Dokumen ini adalah sumber kebenaran untuk SEMUA tahap implementasi. Bila kode/AGENTS.md bertentangan dengan dokumen ini, jangan diam-diam memilih: tulis "PERLU KEPUTUSAN", ambil opsi paling aman, jelaskan.

Aturan nilai: semua angka kebijakan di bawah adalah **nilai awal (seed) yang dapat diubah HRD** dan disimpan di tabel konfigurasi. Dilarang hardcode di kode. Label: `USULAN-TERKUNCI` = diputuskan sementara, boleh diubah HRD kapan saja lewat UI.

---

## 0. Konvensi umum
- Respons mengikuti amplop yang ada: `{ success, data, message, errors }`. Untuk error baru, `errors = [{ code, field, message }]` dengan kode stabil (§12).
- Tanggal bertipe DATE dipakai sebagai string `YYYY-MM-DD` (jangan lewat objek Date/zona waktu). "Hari ini" HANYA lewat helper `todayWIB()` (Asia/Jakarta) yang jamnya dapat disuntik saat uji.
- Validasi input dengan Zod di semua endpoint baru. Tidak ada mass-assignment. Transisi status hanya lewat endpoint khusus.
- Tidak boleh JOIN lintas database. Akses Akademik/Core lewat service in-process.
- Semua tulis ke ledger/approval/audit dilakukan dalam transaksi Knex.
- Kode `leave_type` lama (`sakit, izin_pribadi, cuti_tahunan, cuti_melahirkan, cuti_khusus, dinas_luar, lainnya`) WAJIB tetap diterima dan dikembalikan apa adanya (Portal Guru bergantung padanya).

---

## 1. Fakta sistem (dari audit) dan butir verifikasi

### 1.1 Fakta
- Tabel `employee_leave_requests` dan `employee_overtimes` ada, 0 baris, status hanya `pending/approved/rejected`, satu approver (`approved_by/approved_at`). `leave_type` varchar(100), whitelist 7 kode di `attendance/service.js:9-17`.
- Backend: `apps/api-backend/src/modules/kepegawaian/attendance/` (`routes.js`, `controller.js`, `service.js`, `calendarService.js`). Frontend: `apps/core-portal/src/apps/kepegawaian/pages/CutiLembur.jsx`. Portal Guru: `apps/core-portal/src/apps/guru/` (`attendanceService.js`, `pages/AbsensiPage.jsx`).
- `calendarService.getEffectiveWorkDays(employeeId, schoolUnitId, startDate, endDate)` sudah membaca cuti `approved`. `resolveEmployeeSchedule(employeeId, schoolUnitId, dateStr)` menyelesaikan jadwal harian.
- Presensi: tabel `employee_attendances` (unik `employee_id+attendance_date`, status `present|sick|permitted|absent`, `sub_status`), `attendance_period_locks` (open→review→locked→submitted_to_payroll), `attendance_audit_logs`. Cuti di presensi = `status='permitted'`, `sub_status='cuti'`.
- Permission yang ada: `kepegawaian.leave_requests.manage` (122), `kepegawaian.overtimes.manage` (123), `kepegawaian.attendances.manage` (120), `kepegawaian.attendances.read` (121), `kepegawaian.view`, `kepegawaian.manage`, `kepegawaian.work_schedules.*`. Role `hrd` terdaftar (9 permission) tetapi 0 akun.
- Core `users`: 214 akun. `ref_type='student'` 171 (ref_id = ID siswa di Akademik, BUKAN ID pegawai), `ref_type='staff'` 41 (26 `account_type teacher`, 15 `staff`), `ref_type NULL` 2.
- Pegawai 41 (40 aktif), semua `school_unit_id=1`. Gender, marital_status, employment_status terisi 100% (19 GTY, 10 PTY, 7 PNS, 5 Pelatih Ekskul). `current_position_id` terisi 7/41. Tidak ada kolom tanggal masuk dan atasan langsung. `job_positions`: ID1 Kepala Sekolah (level 1), ID2 Wakil Kepala Sekolah (level 2, parent 1).
- Library frontend: react 18, lucide-react, date-fns, react-day-picker, xlsx. TIDAK ADA library chart/kalender. Backend: `xlsx`, `pdfkit` (pola ekspor di `attendance/service.js` ~baris 2000-2200).
- Komponen bersama (`apps/core-portal/src/shared/components/`): DataTable, Modal, Drawer, FilterBar, DatePickerField, StatusPill/StatusBadge, Toast, LoadingSkeleton, EmptyState (ErrorState: verifikasi).
- Tidak ada cron, tidak ada notifikasi, Payroll hardcoded (`payroll/service.js:119-150`).
- Bug: `CutiLembur.jsx:36` mengirim `leave_type: 'Cuti Tahunan'` (harus snake_case).
- Celah keamanan terbukti: (a) `GET /leave-requests` dan `GET /overtimes` hanya `authenticate`, tanpa scoping; (b) `POST /leave-requests` dan `POST /overtimes` hanya memaksa `employee_id` bila `ref_type` staff/teacher, sehingga siswa/NULL bisa memakai `employee_id` bebas; (c) kode `ref_type==='teacher'` tidak pernah muncul di data.

### 1.2 Dugaan yang wajib diverifikasi
V1 nilai literal `employment_status` (huruf besar/kecil) dan apakah PNS = DPK · V2 pemegang 7 `current_position_id`, apakah ada KS aktif · V3 perilaku `AbsensiPage.jsx` terhadap status/field tak dikenal, daftar lengkap `leave_type`, field yang dibaca · V4 apakah `public/uploads` disajikan statis, penamaan file, batas body JSON · V5 isi `calendarService` (hook libur, mode flexible/shift, tanggal tanpa penugasan, bentuk return) · V6 granularitas `attendance_period_locks` dan guard yang bisa dipakai ulang, apakah approve/cancel cuti dicek · V7 Presensi: check-in di hari non-kerja, sub_status sakit/izin/dinas luar, apakah `permitted` dihitung hadir · V8 kolom `attendance_audit_logs` · V9 sumber upah pokok per pegawai · V10 zona waktu Node/MariaDB, `dateStrings` mysql2, versi MariaDB (JSON, CHECK, generated column) · V11 daftar role (ada `kepala_sekolah`?), efek `kepegawaian.view`, apakah `requirePermission` sadar-satuan, guard route halaman · V12 hak CREATE DATABASE/MariaDB lokal · V13 nama fungsi service kalender Akademik dan nilai `holiday_type` · V14 apakah akun pegawai nonaktif masih bisa login · V15 pola seed data uji Presensi · V16 isi `AGENTS.md` yang relevan.

Temuan tambahan yang dicatat TANPA diperbaiki di lingkup cuti: endpoint presensi self-service (`check-in`, `today-status`, `/my`) memakai `user.ref_id` — periksa apakah `ref_type` diverifikasi (risiko ID siswa terbaca sebagai ID pegawai). `GET /attendances` bisa membuka status `sick` ke non-HRD.

---

## 2. Keputusan terkunci (USULAN-TERKUNCI)

| # | Keputusan |
|---|---|
| 1 | Jatah cuti tahunan 12 HK, basis **tahun ajaran** (`period_start_month=7`, Jul–Jun, kunci periode mis. `2026/2027`). Basis kalender tetap didukung lewat konfigurasi (`period_start_month=1`). |
| 2 | Tanpa syarat masa kerja minimum (`min_service_months_for_eligibility=0`). Pro-rata bulanan untuk pegawai yang masuk di tengah periode, bulan masuk dihitung bila tanggal masuk ≤ 15, pembulatan turun ke kelipatan 0,5. |
| 3 | Cuti tahunan hanya untuk status GTY dan PTY. PNS (DPK) dan Pelatih Ekskul tidak mendapat jatah otomatis (aturan ASN dicatat sebagai pekerjaan terpisah). Pelatih hanya sakit/izin/dinas luar. |
| 4 | Carry over maksimal 6 hari, kedaluwarsa 3 bulan setelah awal periode baru (basis Jul–Jun: 30 September). |
| 5 | Cuti bersama memotong jatah hanya bila libur tersebut ditandai `deducts_annual_leave=1`. Pemotongan hanya untuk pegawai yang dijadwalkan bekerja pada hari itu dan menjadi target libur. Default 0. |
| 6 | Libur sekolah/semester/Ramadan menarget **jadwal kerja tertentu** (guru); pegawai berjadwal lain (satpam/dapur/asrama) tetap bekerja pada tanggal itu. |
| 7 | Hari libur yang jatuh dalam cuti HK tidak dipotong. Pada cuti mode kalender, hari libur ikut dihitung (`holiday_inside_calendar_leave_counted=true`). Aturan sandwich TIDAK diimplementasi. |
| 8 | Batas cuti khusus sesuai tabel seed §3.3. |
| 9 | Cuti melahirkan 90 hari kalender, gaji 100%, lampiran wajib. |
| 10 | Profil approval seed: `std_3` (atasan langsung opsional → KS → HRD), `head_hrd` (KS → HRD), `light_hrd` (HRD saja). `admin_satuan_pendidikan` mendapat `override` terbatas pada satuannya. |
| 11 | KS ditetapkan eksplisit lewat tabel `school_unit_approvers` (bukan turunan `job_positions`). Delegasi lewat `approval_delegations`. |
| 12 | `cuti_tanpa_gaji` ada tetapi nonaktif (`is_active=0`) sampai HRD mengaktifkan. |
| 13 | Sakit gaji 100%. Izin pribadi gaji 100% tetapi tunjangan kehadiran hari itu hangus (`affects_attendance_allowance=1`). Haji dan umrah `payroll_pay_percent=0` (HRD dapat ubah). Jenis legacy generik (`cuti_khusus`, `lainnya`) = NULL (HRD menentukan lewat reklasifikasi). |
| 14 | Batas pengajuan mundur dan lead time sesuai §3.3. |
| 15 | Saldo tidak boleh minus (`allow_negative=0`). |
| 16 | Lampiran sesuai §3.3. Sakit wajib lampiran bila durasi ≥ 2 HK. |
| 17 | Alasan dan lampiran jenis sakit hanya terlihat oleh pemilik dan HR (`reason_visible_to_supervisor_for_sick=false`). Atasan/KS hanya melihat jenis dan tanggal. |
| 18 | Lembur: HRD/admin satuan menugaskan; atasan/KS mengusulkan (status pending, disetujui HRD); pegawai boleh klaim sendiri dengan batas mundur 7 hari. Approval default satu langkah HRD. |
| 19 | Estimasi upah lembur: struktur kebijakan dibangun, tetapi tarif flat bernilai NULL dan sumber upah pokok belum ada, sehingga estimasi tampil "—". Dilarang mengarang tarif. Pengali seed (USULAN, verifikasi hukum): hari kerja jam ke-1 ×1,5, jam ke-2+ ×2; akhir pekan/libur jam 1-8 ×2, jam 9 ×3, jam 10-11 ×4. |
| 20 | Batas lembur: harian 4 jam, mingguan 18 jam (Senin–Minggu), bulanan 72 jam. Pembulatan 30 menit, minimum bayar 30 menit, toleransi rekonsiliasi 15 menit. |
| 21 | Kompensasi lembur ditukar cuti: tidak dibangun (P3). |
| 22 | Lembur hanya untuk GTY dan PTY (dapat diubah lewat kebijakan lembur). |
| 23 | Pemilik boleh membatalkan cuti yang sudah disetujui sendiri bila `start_date` masih ≥ 3 hari ke depan dan periode belum terkunci. Selain itu hanya HRD (override). |
| 24 | Periode presensi terkunci tidak dapat dilewati. Perubahan hanya setelah periode dibuka lewat prosedur Presensi. |
| 25 | Tidak ada notifikasi otomatis dan tidak ada eskalasi otomatis. Pengganti: kotak masuk persetujuan, badge, daftar "lewat SLA", dan tautan `wa.me` dengan templat pesan. |
| 26 | Tier gaji sakit panjang: tidak dibangun (P3). |
| 27 | Pencairan sisa cuti saat resign: di luar lingkup. |
| 28 | `join_date` dan atasan langsung diisi HRD lewat UI "Kelengkapan Data Pegawai". Tanpa `join_date`, hak tidak dihitung (`UNKNOWN_JOIN_DATE`). TIDAK ADA fallback `employees.created_at`. |
| 29 | Database dev: MariaDB lokal dengan nama `core_dev`, `kepegawaian_dev`, `akademik_dev`. Skema dari menjalankan migrasi Knex dari nol. Data uji lewat seed. Data live TIDAK disalin. |
| 30 | Perbaikan IDOR di endpoint presensi dikerjakan sebagai hotfix terpisah (prompt H-1). Branch cuti hanya melaporkannya. |
| 31 | Portal Guru: tidak diubah dahulu. Endpoint `GET /leave-balances/my` disiapkan. Perubahan Portal Guru (saldo dari API, jenis dinamis, status baru) adalah pekerjaan terpisah setelah ledger stabil. |
| 32 | Flexible (pelatih ekskul): `flexible_employee_day_rule=mon_fri`. |
| 33 | Grafik dan kalender memakai SVG/CSS native dan `date-fns`. Tanpa library baru. |
| 34 | Data libur nasional/cuti bersama TIDAK boleh dikarang. Sumber hanya impor berkas (CSV/JSON) yang diisi HRD, plus input manual. |
| 35 | Cuti menikah 1 kali seumur kerja. Cuti haji 1 kali. |
| 36 | Ambang rawan personel: per satuan atau per jadwal kerja (bukan per mata pelajaran). |
| 37 | Cuti disetujui diturunkan saat dibaca; materialisasi ke `employee_attendances` terjadi saat periode ditutup (kolom nullable `leave_request_id` ditambahkan ke `employee_attendances`). |

Hal yang harus dikerjakan manusia (bukan Antigravity): isi `join_date` dan atasan langsung 41 pegawai; tetapkan KS di `school_unit_approvers`; siapkan berkas libur 2026/2027 dari SKB resmi; buat akun HRD nyata; verifikasi angka cuti/lembur dengan konsultan hukum; tinjau seed haji/umrah (gaji 0).

---

## 3. Taksonomi jenis cuti

### 3.1 Kategori
`annual`, `special`, `sick`, `permit`, `official`, `unpaid`, `other`.

### 3.2 Atribut `leave_types`
`code` (unik), `name`, `category`, `description`, `color`, `sort_order`, `is_active`, `is_system`, `count_mode` (`work_days|calendar_days`), `deducts_balance`, `balance_policy_id`, `max_days_per_request`, `max_days_per_year`, `max_occurrences_lifetime`, `half_day_allowed`, `attachment_rule` (`none|optional|required|required_after_days`), `attachment_required_after_days`, `gender_restriction` (`any|male|female`), `eligible_employment_statuses` (JSON, NULL = semua), `eligible_marital_statuses` (JSON, NULL = semua), `min_service_months`, `min_notice_days`, `max_backdate_days`, `payroll_pay_percent` (0–100, NULL = belum diputuskan), `affects_attendance_allowance`, `affects_discipline`, `attendance_status`, `attendance_sub_status`, `approval_profile_id`, `visible_in_self_service`, `reason_required`.

Invarian konfigurasi: kategori `annual` saja yang boleh `deducts_balance=1` pada rilis ini; `deducts_balance=1` mewajibkan `balance_policy_id`; `calendar_days` tidak boleh `deducts_balance=1`; `is_system=1` tidak boleh dihapus dan `code`-nya tidak boleh diubah.

### 3.3 Seed (USULAN-TERKUNCI)
Nilai status kepegawaian harus dicocokkan dengan nilai literal di DB (V1).

| code | kategori | batas | hitung | potong jatah | gaji % | lampiran | syarat | mundur / lead | setengah hari | profil |
|---|---|---|---|---|---|---|---|---|---|---|
| `cuti_tahunan` | annual | saldo | HK | ya | 100 | tidak | GTY, PTY | 0 / H-3 | ya | std_3 |
| `sakit` | sick | – | HK | tidak | 100 | wajib bila ≥2 HK | semua | 7 / 0 | ya | head_hrd |
| `izin_pribadi` | permit | 2 HK/pengajuan, 6 HK/tahun | HK | tidak | 100, tunjangan hadir hangus | opsional | semua | 3 / 0 | ya | head_hrd |
| `dinas_luar` | official | – | HK | tidak | 100 (dihitung hadir) | wajib | semua | 7 / 0 | ya | head_hrd |
| `cuti_melahirkan` | special | 90 hari | kalender | tidak | 100 | wajib | perempuan | 30 / 0 | tidak | head_hrd |
| `cuti_keguguran` | special | 45 hari | kalender | tidak | 100 | wajib | perempuan | 14 / 0 | tidak | head_hrd |
| `cuti_menikah` | special | 3 HK, 1 kali seumur kerja | HK | tidak | 100 | wajib | marital `single` | 0 / H-7 | tidak | head_hrd |
| `cuti_istri_melahirkan` | special | 2 HK/kejadian | HK | tidak | 100 | wajib | laki-laki, `married` | 14 / 0 | tidak | head_hrd |
| `cuti_duka_keluarga_inti` | special | 2 HK | HK | tidak | 100 | opsional | semua | 7 / 0 | tidak | head_hrd |
| `cuti_duka_serumah` | special | 1 HK | HK | tidak | 100 | opsional | semua | 7 / 0 | tidak | head_hrd |
| `cuti_keluarga_sakit` | special | 2 HK/pengajuan, 6 HK/tahun | HK | tidak | 100 | wajib | semua | 3 / 0 | tidak | head_hrd |
| `cuti_keluarga_menikah` | special | 2 HK | HK | tidak | 100 | wajib | semua | 0 / H-3 | tidak | head_hrd |
| `cuti_khitan_baptis_anak` | special | 2 HK | HK | tidak | 100 | opsional | semua | 0 / H-3 | tidak | head_hrd |
| `cuti_ibadah_haji` | special | 40 hari, 1 kali | kalender | tidak | 0 | wajib | semua | 0 / H-30 | tidak | std_3 |
| `cuti_umrah` | special | 14 hari | kalender | tidak | 0 | wajib | semua | 0 / H-14 | tidak | std_3 |
| `cuti_tanpa_gaji` | unpaid | 30 hari/pengajuan | kalender | tidak | 0 | opsional | semua | 0 / H-7 | tidak | std_3, **nonaktif** |
| `cuti_khusus` (legacy) | special | – | HK | tidak | NULL | opsional | semua | 0 / 0 | tidak | light_hrd |
| `lainnya` (legacy) | other | – | HK | tidak | NULL | opsional, alasan wajib | semua | 0 / 0 | tidak | light_hrd |

Tujuh kode legacy (`sakit, izin_pribadi, cuti_tahunan, cuti_melahirkan, cuti_khusus, dinas_luar, lainnya`) dibuat `is_system=1`. `cuti_khusus` generik wajib direklasifikasi HRD ke jenis spesifik saat approval (§6.6).

Pemetaan presensi: `sick` → status `sick`; `permit` → `permitted/izin`; `annual|special|unpaid` → `permitted/cuti`; `official` → `permitted/dinas_luar` (verifikasi V7).

### 3.4 Profil approval seed
- `std_3`: langkah 1 `direct_supervisor` (opsional), 2 `unit_head`, 3 `hrd_pool`.
- `head_hrd`: 1 `unit_head`, 2 `hrd_pool`.
- `light_hrd`: 1 `hrd_pool`.

### 3.5 `leave_module_settings` (seed)
`flexible_employee_day_rule=mon_fri`, `holiday_inside_calendar_leave_counted=true`, `employee_self_cancel_approved_until_days_before=3`, `reason_visible_to_supervisor_for_sick=false`, `overtime_self_claim_max_backdate_days=7`, `semester_ranges` (array rentang, diisi HRD), `approval_overdue_hours=72`.

---

## 4. Mesin hitung durasi

### 4.1 Model setengah hari
`start_portion` dan `end_portion` ∈ {full, am, pm}. Bila `start_date == end_date`: kedua porsi harus sama (full/am/pm). Bila rentang >1 hari: `start_portion` ∈ {full, pm}, `end_portion` ∈ {full, am}. Bobot: full=1.0, am/pm=0.5. Label jam ("pagi/siang") hanya tampilan dari jadwal pegawai.

### 4.2 Fungsi murni
Input: `startDate, endDate, startPortion, endPortion, countMode, dayFacts[date], flexibleDayRule, periodOf(date), holidayInsideCalendarCounted`. `dayFacts[date] = { scheduleState: WORKDAY|NONWORKDAY|NO_ASSIGNMENT|FLEXIBLE, offHolidays: [...] }` (sudah difilter satuan dan jadwal pegawai oleh adapter).

```
validate end >= start else INVALID_RANGE ; portions per 4.1 else INVALID_PORTION
for d in dates(start..end):
  weight = 1.0
  if d == start: weight = w(startPortion)
  if d == end:   weight = min(weight, w(endPortion))
  if countMode == 'calendar_days':
      state = 'COUNTED'
      if offHoliday(d) and not holidayInsideCalendarCounted: state = 'HOLIDAY_OFF'
  else:
      s = dayFacts[d].scheduleState
      if s == 'NO_ASSIGNMENT': state = 'NO_SCHEDULE'
      else:
        isWork = (s=='WORKDAY') or (s=='FLEXIBLE' and flexibleRule(d))   # FLEXIBLE => warning FLEXIBLE_SCHEDULE_RULE_APPLIED
        if not isWork: state = 'WEEKEND_OFF'          # non-kerja menang atas libur
        elif offHoliday(d): state = 'HOLIDAY_OFF'     # >1 libur pada tanggal sama = satu pengurang
        else state = 'COUNTED'
  contribution = (state=='COUNTED') ? weight : 0
  breakdown.add({date, state, weight: contribution, period: periodOf(d)})
if semua state == 'NO_SCHEDULE' -> NO_SCHEDULE_ASSIGNMENT
if total == 0 -> NO_WORKING_DAYS
return { total, breakdown, byPeriod, warnings }
```
Pembantu: `computeEndDate(start, n, mode)`: kalender → `start + n - 1`; HK → tanggal COUNTED ke-n.
Adapter `buildDayFacts` memakai `calendarService.resolveEmployeeSchedule` dan `holidayService` (jangan menduplikasi logika jadwal). Resolusi per rentang secara batch (hindari N+1).

### 4.3 Kasus uji durasi (fixture fiktif; bukan data libur resmi)
Kalender: 5 Okt 2026 Senin, 9 Okt Jumat, 10 Okt Sabtu, 11 Okt Minggu, 12 Okt Senin, 14 Okt Rabu, 16 Okt Jumat, 17 Okt Sabtu; 28 Des 2026 Senin, 31 Des Kamis; 1 Jan 2027 Jumat, 4 Jan Senin. Jadwal S1 = Sen–Jum, S2 = Sen–Sab.

| # | Skenario | Input | Output |
|---|---|---|---|
| T1 | Minggu penuh | S1, HK, 05–09 Okt, full | 5.0 |
| T2 | Lewat akhir pekan | S1, HK, Jum 09 → Sen 12 | 2.0 (Sab/Min WEEKEND_OFF) |
| T3 | Sama T2, mode kalender | S1, kalender | 4.0 |
| T4 | Setengah hari tunggal | S1, HK, Rab 07 Okt, am | 0.5 |
| T5 | Setengah hari di ujung | S1, HK, Sen 05 pm → Rab 07 am | 2.0 (0.5+1+0.5) |
| T6 | Hari non-kerja tunggal | S1, HK, Sab 10 Okt | error NO_WORKING_DAYS |
| T7 | Libur di tengah | libur nasional Rab 14, rentang 12–16 | 4.0 |
| T8a | Libur semester 12–16 Okt menarget S1, rentang 12–17, pegawai S1 | | error NO_WORKING_DAYS |
| T8b | Kasus sama, pegawai S2 (tidak ditarget) | | 6.0 |
| T9 | Libur nasional jatuh Sabtu 10, rentang Jum 09 → Sen 12, S1 | | 2.0 (tidak dikurangi ganda) |
| T10 | Melahirkan kalender | mulai Sel 1 Des 2026, 90 hari | `computeEndDate` = 2027-02-28, total 90.0; byPeriod basis kalender 2026=31, 2027=59 |
| T11 | Lintas tahun HK + libur 1 Jan 2027 | S1, HK, 28 Des 2026 → 5 Jan 2027 | 6.0; byPeriod kalender: 2026=4, 2027=2; basis Jul–Jun: satu periode 6.0 |
| T12 | Pegawai flexible | FLEXIBLE, aturan mon_fri, 05–11 Okt | 5.0 + warning |
| T13 | Setengah hari pada hari libur | libur Rab 14, am pada 14 Okt, S1 | error NO_WORKING_DAYS |
| T14 | Setengah hari lewat akhir pekan | S1, Jum 09 pm → Sen 12 am | 1.0 |
| T15 | Rentang terbalik | akhir < mulai | error INVALID_RANGE |
| T16 | Porsi tak sah | >1 hari dengan start_portion=am | error INVALID_PORTION |
| T17 | Tanpa penugasan jadwal | penugasan mulai 2 Nov 2026, rentang 05–09 Okt | error NO_SCHEDULE_ASSIGNMENT |
| T18 | Libur satuan lain | libur khusus satuan 2 pada Rab 14, pegawai satuan 1, 12–16 | 5.0 |
| T19 | Jadwal Jumat libur | jadwal Sen–Kam+Sab, HK, Kam 08 → Sen 12 | 3.0 |
| T20 | Kalender mencakup libur | kalender, libur Rab 14, 12–16 | 5.0 |
| T21 | Dua libur satu tanggal | nasional + semester pada Rab 14, S1, 12–16 | 4.0 |

### 4.4 Urutan validasi pengajuan
1. Struktur dan pegawai: `INVALID_RANGE`, `INVALID_PORTION`, `EMPLOYEE_INACTIVE`, `ACTOR_NOT_EMPLOYEE`, `FORBIDDEN_SCOPE`.
2. Kelayakan: `TYPE_INACTIVE`, `TYPE_NOT_ALLOWED_FOR_EMPLOYEE` (gender, status kepegawaian, status nikah, masa kerja).
3. Hari: `NO_SCHEDULE_ASSIGNMENT`, `NO_WORKING_DAYS`.
4. Waktu: `BACKDATE_EXCEEDED`, `NOTICE_TOO_SHORT`, `PERIOD_LOCKED`.
5. Batas: `MAX_DAYS_PER_REQUEST` (rantai pengajuan berdempetan jenis sama dijumlahkan), `MAX_DAYS_PER_YEAR`, `MAX_OCCURRENCES`.
6. Lampiran: `ATTACHMENT_REQUIRED`.
7. Tumpang tindih: `OVERLAP_APPROVED`, `OVERLAP_PENDING` (pengajuan aktif milik pegawai yang sama), `ATTENDANCE_PRESENT_CONFLICT`, `OVERTIME_CONFLICT`.
8. Saldo: `ENTITLEMENT_NOT_ELIGIBLE`, `UNKNOWN_JOIN_DATE`, `BALANCE_INSUFFICIENT`.
Peringatan (tidak memblokir): ambang rawan personel, `FLEXIBLE_SCHEDULE_RULE_APPLIED`, rekan satu satuan cuti bersamaan.

---

## 5. Jatah, saldo, dan ledger

### 5.1 Kebijakan (`leave_balance_policies`, seed)
`code=annual_default`, `period_start_month=7`, `proration_mode=monthly`, `proration_join_day_cutoff=15`, `rounding=floor_half`, `min_service_months_for_eligibility=0`, `carry_over_enabled=1`, `carry_over_max_days=6`, `carry_over_expiry_months=3`, `allow_negative=0`. Aturan hak (`leave_entitlement_rules`): GTY 12 hari, PTY 12 hari (prioritas sama, `min_service_months=0`).

### 5.2 Hak awal (fungsi murni `computeEntitlement`)
1. Cocokkan aturan menurut `employment_status` dan masa kerja (dari `join_date`). Prioritas tertinggi menang.
2. `join_date` kosong → status `UNKNOWN_JOIN_DATE`, hak tidak dihitung. Dilarang fallback `created_at`.
3. Pro-rata: `hak = days × bulan_dihitung / 12`, dibulatkan sesuai `rounding`. Bulan masuk dihitung bila tanggal masuk ≤ cutoff.
4. Inisialisasi lazy: `ensureEntitlement(employee, period)` menulis entri `grant` idempoten saat saldo dibaca/dibutuhkan. HRD juga bisa `bulk-assign`.

### 5.3 Carry over dan kedaluwarsa
- Tutup periode (`close`, default `dry_run=true`): `carry_in = MIN(sisa_bucket_current, carry_over_max_days)` ke periode baru, bucket `carry_over`.
- `carry_expires_on` = akhir bulan ke-`carry_over_expiry_months` sejak awal periode baru.
- Sisa carry over yang lewat tanggal itu dicatat entri `expire` (idempoten, dipicu lazy saat saldo dibaca dan lewat perintah manual).
- Alokasi per hari urut tanggal: hari ≤ `carry_expires_on` mengambil dari bucket `carry_over` dulu, sisanya dari `current`.
- Tidak ada cron: sediakan perintah npm manual `leave:close-period` dan `leave:reconcile`.

### 5.4 Ledger
Tiap entri punya `delta_available`, `delta_reserved`, `delta_used` bertanda.

| entry_type | available | reserved | used | Kapan |
|---|---|---|---|---|
| `grant`, `carry_in` | + | 0 | 0 | hak awal, carry over |
| `reserve` | − | + | 0 | pengajuan dibuat |
| `commit` | 0 | − | + | disetujui |
| `release` | + | − | 0 | ditolak/ditarik/direvisi (versi lama) |
| `refund` | + | 0 | − | dibatalkan setelah disetujui |
| `joint_leave_debit` | − | 0 | + | cuti bersama yang memotong jatah |
| `expire` | − | 0 | 0 | kedaluwarsa carry over |
| `adjust` | ± | 0 | 0 | koreksi HRD, alasan wajib |

Invarian: `SUM(reserved)` = total hari pengajuan `pending`/`revision_requested` yang memotong jatah; `SUM(used)` = total hari `approved` + debit cuti bersama; `available = grants + carry_in ± adjust − expire − reserved − used`.
Ledger append-only (tanpa UPDATE/DELETE). Koreksi dengan entri pembalik. `idempotency_key` unik (mis. `leave:{id}:reserve:v{versi}`). Konkurensi: `SELECT … FOR UPDATE` pada baris saldo, dan `GET_LOCK('leave:emp:{id}')` untuk pengecekan tumpang tindih. `employee_leave_balances` hanyalah cache yang dapat dibangun ulang dari ledger.

### 5.5 Siklus pengajuan terhadap ledger
- Dibuat (jenis memotong jatah): `reserve` per bucket/periode. Saldo kurang → `BALANCE_INSUFFICIENT`.
- Disetujui: `commit`. Bypass HRD: `reserve`+`commit` dalam satu transaksi.
- Ditolak / ditarik / dibatalkan sebelum disetujui: `release`.
- Minta revisi: reservasi dipertahankan. Kirim ulang: `release` versi lama + `reserve` versi baru (satu transaksi, `version`+1).
- Dibatalkan setelah disetujui: `refund` penuh bila belum ada hari lewat dan periode belum terkunci. Bila sebagian sudah berjalan (hanya HRD): `refund` hanya hari setelah tanggal pembatalan. Periode terkunci → `409 PERIOD_LOCKED`.
- Diubah setelah disetujui (hanya HRD, alasan wajib): `refund` versi lama + `reserve`/`commit` versi baru dalam satu transaksi.
- Cuti bersama (`deducts_annual_leave=1`): aksi `apply` idempoten (kunci `holiday:{id}:emp:{employeeId}`), tidak ganda bila pegawai sudah punya cuti disetujui pada hari itu, hanya untuk pegawai terjadwal bekerja dan target libur.

### 5.6 Kasus uji
| # | Kasus | Hasil |
|---|---|---|
| B1 | Basis Jul–Jun, 12 hari, cutoff 15. Masuk 10 Okt 2026 | Okt–Jun = 9 bulan → 9.0 |
| B2 | Masuk 16 Okt 2026 | Nov–Jun = 8 bulan → 8.0 |
| B3 | Masuk 1 Jul 2026 | 12.0 |
| B1c | Basis kalender (konfigurasi), masuk 10 Apr 2026 | Apr–Des = 9 → 9.0 |
| B4 | Sisa 9.0 saat tutup periode 2026/2027, carry max 6 | `carry_in`=6.0 ke 2027/2028, `carry_expires_on`=2027-09-30 |
| B5 | Carry 2.0, cuti Kam 30 Sep 2027 → Sel 5 Okt 2027 (Kam, Jum, Sen, Sel = 4 HK, tanpa libur) | 30 Sep dari carry (1.0), tiga hari sisanya dari current (3.0), sisa carry 1.0 kedaluwarsa |
| B6 | Reserve 5 lalu ditolak | saldo kembali ke awal |
| B7 | Disetujui Sen–Jum (5 hari), HRD batalkan efektif Kam | refund 2.0, 3 hari tetap terpakai |
| B8 | Saldo 3.0, minta 4.0 | `BALANCE_INSUFFICIENT` (allow_negative=0). Dengan allow_negative dan batas −2 → diterima, sisa −1.0 |
| B9 | Dua pengajuan 3.0+3.0 bersamaan terhadap saldo 5.0 | tepat satu berhasil |
| B10 | Persetujuan yang sama diulang | tidak ada `commit` ganda |

---

## 6. Mesin approval

### 6.1 Sumber approver
| Sumber | Penetapan | Bila kosong |
|---|---|---|
| `direct_supervisor` | `employees.direct_supervisor_employee_id` | langkah opsional dilewati, audit `skipped:no_supervisor` |
| `unit_head` | tabel `school_unit_approvers` (satuan, pegawai, `valid_from/valid_to`) | langkah wajib → pengajuan tetap dibuat, langkah `unassigned`, tampil di antrean HRD |
| `hrd_pool` | semua pengguna ber-permission `kepegawaian.leave_requests.manage` dalam cakupan satuan, kecuali pemohon | `unassigned` (saat ini belum ada akun HRD, `super_admin` dapat bertindak) |
| `yayasan_pool` | pengguna role `admin_yayasan` | dipakai sebagai eskalasi |
Pra-isi KS dari `job_positions.level=1` hanya saran untuk dikonfirmasi HRD (jangan memakai `LIKE '%Kepala Sekolah%'`, ia cocok juga dengan Wakil Kepala Sekolah).

### 6.2 Snapshot
Saat pengajuan dibuat, langkah profil di-snapshot ke `approval_steps` (per `request_version`). Perubahan jabatan setelahnya tidak mengubah rute kecuali lewat `reassign-approver`. `min_days_threshold` pada langkah profil: langkah hanya berlaku bila durasi ≥ ambang.

### 6.3 Siapa boleh bertindak pada langkah
1. Pegawai yang ditugaskan. 2. Delegasi aktif (kedalaman 1, tanpa re-delegasi; dicatat "atas nama"). 3. Untuk `hrd_pool`: pemegang `manage` dalam cakupan satuan. 4. `override`: dapat memajukan langkah apa pun atau menyetujui seluruh sisa langkah ("setujui langsung"), alasan wajib, ditandai `bypassed`.

### 6.4 Aturan
- Tidak ada persetujuan diri sendiri (termasuk HRD dan KS). Langkah yang jatuh ke pemohon dialihkan: pemohon KS → langsung HRD; pemohon satu-satunya HRD → `yayasan_pool`.
- Minta revisi: approver mana pun (catatan wajib). Status `revision_requested`. Kirim ulang oleh pemilik memulai dari langkah 1, `version`+1, riwayat lama tersimpan.
- Tolak: alasan wajib, final.
- Tarik oleh pemilik: boleh selama `pending` atau `revision_requested` → `cancelled`.
- Eskalasi otomatis tidak ada. Antrean "lewat SLA" (`approval_overdue_hours`) dan aksi manual `reassign-approver`/override.

### 6.5 Status dan transisi legal (cuti)
Status tersimpan: `pending`, `revision_requested`, `approved`, `rejected`, `cancelled`. "Selesai/kedaluwarsa" tidak disimpan.
```
submit -> pending --langkah disetujui--> pending(next) --langkah terakhir--> approved
pending -> rejected (final) | cancelled (final) | revision_requested
revision_requested -> pending (kirim ulang, v+1) | cancelled | rejected
approved -> cancelled (aturan §5.5/§2 #23) | approved (diubah HRD, versi baru)
bypass HRD: submit -> approved
```
Transisi lain → `409`. Lembur memakai mesin yang sama (`entity_type='overtime'`) dengan status `pending|approved|rejected|cancelled`.
Kompatibilitas Portal Guru: `status` tetap `pending` selama proses; `current_step_no` menunjukkan posisi.

### 6.6 Reklasifikasi
Hanya `override`. Ubah `cuti_khusus` generik ke jenis spesifik; durasi dan ledger dihitung ulang dengan audit.

---

## 7. Lembur

### 7.1 Peran
- Menugaskan: pemegang `overtimes.manage` (`origin='assigned'`, boleh langsung `approved`).
- Mengusulkan: atasan langsung/KS untuk bawahan/satuannya (status `pending`, disetujui HRD).
- Klaim sendiri: pegawai lewat Portal Guru (`origin='requested'`), batas mundur `overtime_self_claim_max_backdate_days`.
- Kelayakan menurut `eligible_employment_statuses` kebijakan lembur (seed GTY, PTY).

### 7.2 Jenis hari otomatis
`holiday` bila ada libur `is_off_day` yang menarget pegawai; `weekend` bila tanggal non-kerja menurut jadwal; selain itu `workday`. Override oleh HR hanya dengan alasan (`day_type_overridden=1`).

### 7.3 Rekonsiliasi dengan presensi (bila `requires_actual_attendance=1`)
- Hari kerja: lembur nyata = `check_out − MAX(akhir jam kerja terjadwal, awal jendela)`, dibatasi jendela disetujui.
- Hari non-kerja/libur: irisan `check_in…check_out` dengan jendela.
- `payable_hours` = irisan jendela disetujui dengan realisasi, dibulatkan 30 menit, minimum 30 menit, toleransi 15 menit.
- `realization_status`: `pending|matched|partial|no_attendance|manual`. HRD mengonfirmasi sebelum periode ditutup (`PATCH /overtimes/:id/reconcile`, override beralasan).
- Presensi hanya satu baris per pegawai per hari. Perilaku check-in di hari non-kerja HARUS diverifikasi (V7) sebelum rekonsiliasi akhir pekan/libur diaktifkan.

### 7.4 Batas dan upah
- Batas jam (data konfigurasi): 4/hari, 18/minggu (Senin–Minggu), 72/bulan. Pelanggaran → `OVERTIME_LIMIT_EXCEEDED`, override HR beralasan.
- `calc_method`: `flat_hourly` atau `monthly_wage_divisor` (÷173). Tanpa tarif/sumber upah, `estimated_wage=NULL` dan UI menampilkan "—". Dilarang mengarang tarif.
- Pengali per `day_type` dan tingkat jam di `overtime_multiplier_tiers` (seed lihat §2 #19). Simpan `multiplier_breakdown` dan snapshot tarif pada record.
- Lembur pada hari cuti penuh ditolak (`OVERTIME_CONFLICT`). Cuti setengah hari boleh berdampingan dengan lembur pada porsi lain.

---

## 8. Aturan interaksi
1. Cuti vs presensi: tanggal berpresensi `present` memblokir pengajuan (`ATTENDANCE_PRESENT_CONFLICT`; setengah hari diputuskan HRD). Tanggal `absent` boleh dikoreksi lewat cuti susulan dalam batas mundur dan periode terbuka. Cuti menang atas alpa, tidak pernah menimpa `present`.
2. Integrasi presensi: (a) saat dibaca — `getEffectiveWorkDays` menurunkan status cuti dari pengajuan `approved`, perluasan hanya menambah field (`holiday_off`, `leave_request_id`, `leave_type_code`, `leave_portion`); (b) saat periode ditutup (transisi lock Presensi) — `materializeLeaveIntoAttendance(period)` menulis/memperbarui baris `employee_attendances` dalam transaksi yang sama dan masuk `summary_snapshot` (kolom nullable `leave_request_id` ditambahkan ke `employee_attendances`).
3. Periode terkunci (`locked`/`submitted_to_payroll`): pengajuan baru, persetujuan, pembatalan, atau perubahan yang menyentuh tanggalnya → `409 PERIOD_LOCKED`.
4. Perubahan jadwal/libur setelah disetujui: `duration_days` dan `day_breakdown` tersimpan tetap berlaku. Sistem menandai selisih di daftar "Perlu tinjauan" (`GET /leave-requests/needs-review`); HRD dapat `recalculate` (beraudit).
5. Pegawai nonaktif/resign/pensiun: pengajuan baru → `EMPLOYEE_INACTIVE`; pengajuan pending diblokir 409 dan muncul di "Perlu tinjauan"; cuti masa depan dibatalkan HRD dengan `refund`. Mutasi antar satuan: pengajuan memakai `school_unit_id` saat dibuat, pending dialihkan lewat `reassign-approver`.

---

## 9. Keamanan dan hak akses

### 9.1 Helper wajib
`resolveActor(user)` → `{ employeeId | null, unitScope, permissions }`. Pegawai hanya diakui bila `ref_type ∈ {staff, teacher}` DAN `ref_id` menunjuk pegawai aktif yang ada. Semua endpoint self-service wajib memakainya.

### 9.2 Aturan
- `POST /leave-requests`, `POST /overtimes`: aktor tanpa `manage`/`override` → `employee_id` dari body DIABAIKAN dan dipaksa `actor.employeeId`. Bila `employeeId` null (siswa, `ref_type` NULL) → 403. Aktor HR → pegawai harus dalam cakupan satuannya (di luar → 403/404).
- HR ditentukan oleh PERMISSION, bukan daftar nama role atau `user.is_admin`.
- Cakupan satuan dari JWT di backend. `school_unit_id`/`employee_id` dari query diabaikan untuk non-privileged.
- `GET /leave-requests` dan `GET /overtimes`: butuh `.manage` atau `.read`, scoping JWT. `attachment_url` mentah tidak dikembalikan di list.
- `/my`: butuh aktor pegawai valid, jika tidak 403.

### 9.3 Lampiran
Simpan di folder non-statis, nama file acak, unduh lewat endpoint terotorisasi yang men-stream. Pemilik, HR dalam cakupan, dan approver pada langkah pengajuan itu boleh. Validasi MIME dari konten. Verifikasi V4; bila `public/uploads` ternyata statis, pindahkan.

### 9.4 Privasi
Alasan dan lampiran jenis `sick` hanya untuk pemilik dan HR (§2 #17).

### 9.5 Permission baru (Core, migrasi/seed terpisah, hanya Core dev)
| Permission | super_admin | admin_yayasan | admin_satuan_pendidikan | hrd | guru/staf |
|---|---|---|---|---|---|
| `kepegawaian.leave_requests.read` | ✔ | ✔ | ✔ | ✔ | – |
| `kepegawaian.leave_requests.override` | ✔ | ✔ | ✔ (satuan sendiri) | ✔ | – |
| `kepegawaian.leave_types.manage` | ✔ | ✔ | – | ✔ | – |
| `kepegawaian.holidays.manage` | ✔ | ✔ | ✔ (satuan sendiri) | ✔ | – |
| `kepegawaian.leave_balances.read` | ✔ | ✔ | ✔ | ✔ | – |
| `kepegawaian.leave_balances.manage` | ✔ | ✔ | – | ✔ | – |
| `kepegawaian.overtime_settings.manage` | ✔ | ✔ | – | ✔ | – |
| `kepegawaian.leave_reports.read` | ✔ | ✔ | ✔ | ✔ | – |
Hak approver non-HRD (atasan/KS) berbasis penugasan di service, bukan permission.

---

## 10. Desain data (additive, idempoten, ada rollback)

Konvensi: Knex per modul Kepegawaian, InnoDB, utf8mb4, `bigint unsigned`, guard `hasTable/hasColumn`, `down` menghapus yang ditambahkan. Referensi ke Core/Akademik hanya ID tanpa FK. Kolom JSON mengikuti pola `anomaly_flags` (longtext + `json_valid`).

### 10.1 Kolom tambahan
`employees`: `join_date DATE NULL`, `direct_supervisor_employee_id BIGINT UNSIGNED NULL` (FK self, `CHECK (direct_supervisor_employee_id <> id)`).

`employee_leave_requests`: `leave_type_id NULL` (FK leave_types; `leave_type` tetap = kode), `duration_days DECIMAL(5,1) NULL`, `count_mode ENUM('work_days','calendar_days') NULL`, `day_breakdown JSON NULL`, `start_portion ENUM('full','am','pm') NOT NULL DEFAULT 'full'`, `end_portion` (sama), `status ENUM('pending','approved','rejected','revision_requested','cancelled')`, `current_step_no TINYINT UNSIGNED NULL`, `version INT UNSIGNED NOT NULL DEFAULT 1`, `submitted_by_user_id NULL`, `submitted_on_behalf TINYINT(1) DEFAULT 0`, `bypass_approval TINYINT(1) DEFAULT 0`, `cancelled_at`, `cancelled_by_user_id`, `cancel_reason`. `approved_by/approved_at` tetap, diisi saat persetujuan akhir. Index: `(school_unit_id,status,start_date)`, `(employee_id,start_date,end_date)`, `(status)`.

`employee_overtimes`: `origin ENUM('assigned','requested') DEFAULT 'requested'`, `assigned_by_user_id`, `assignment_batch_id`, `spk_number VARCHAR(100) NULL`, `day_type ENUM('workday','weekend','holiday') NULL`, `day_type_overridden TINYINT(1) DEFAULT 0`, `requires_actual_attendance TINYINT(1) DEFAULT 1`, `payable_hours DECIMAL(4,2) NULL`, `realization_status ENUM('pending','matched','partial','no_attendance','manual') DEFAULT 'pending'`, `compensation_type ENUM('pay','time_off') DEFAULT 'pay'`, `rate_policy_id NULL`, `hourly_rate_snapshot DECIMAL(12,2) NULL`, `multiplier_breakdown JSON NULL`, `estimated_wage DECIMAL(14,2) NULL`, `status ENUM('pending','approved','rejected','cancelled')`, `current_step_no`, `version`. `hours` tetap = jam rencana. Index: `(school_unit_id,status,overtime_date)`, `(employee_id,overtime_date)`.

`employee_attendances` (tahap integrasi): `leave_request_id BIGINT UNSIGNED NULL`.

### 10.2 Tabel baru
```
holidays(id, school_unit_id NULL, unit_key AS IFNULL(school_unit_id,0) STORED, name, holiday_type
  ENUM('national','joint_leave','school_semester','school_ramadan','school_exam','foundation','unit_special'),
  start_date, end_date CHECK(end_date>=start_date), is_off_day DEFAULT 1,
  applies_to ENUM('all_employees','schedules') DEFAULT 'all_employees',
  deducts_annual_leave DEFAULT 0, date_rule ENUM('fixed_date','floating') DEFAULT 'floating',
  review_status ENUM('confirmed','draft_needs_review') DEFAULT 'confirmed',
  source ENUM('manual','imported_file','copied','academic_calendar'), source_ref, academic_event_id NULL,
  notes, created_by, updated_by, created_at, updated_at, deleted_at NULL;
  UNIQUE(unit_key,holiday_type,start_date,name); INDEX(unit_key,start_date,end_date))
holiday_schedule_targets(holiday_id, work_schedule_id) PK gabungan

leave_types (atribut §3.2)
leave_approval_profiles(id, code UNIQUE, name, is_active)
leave_approval_profile_steps(id, profile_id, step_no, step_name,
  approver_source ENUM('direct_supervisor','unit_head','hrd_pool','yayasan_pool'),
  is_required, min_days_threshold NULL, sla_hours NULL; UNIQUE(profile_id,step_no))
school_unit_approvers(id, school_unit_id, approver_role ENUM('unit_head'), employee_id,
  valid_from, valid_to NULL, created_by, created_at)
approval_delegations(id, school_unit_id, delegator_employee_id, delegate_employee_id,
  scope ENUM('leave','overtime','all'), valid_from, valid_to, reason, is_active, revoked_at NULL, created_by)
approval_steps(id, entity_type ENUM('leave','overtime'), entity_id, request_version, step_no,
  approver_source, assigned_employee_id NULL,
  status ENUM('pending','approved','rejected','revision_requested','skipped','bypassed'),
  acted_by_user_id, acted_by_employee_id, on_behalf_of_employee_id, acted_at, comment, skip_reason;
  UNIQUE(entity_type,entity_id,request_version,step_no))

leave_balance_policies(id, code UNIQUE, name, school_unit_id NULL, period_start_month TINYINT,
  proration_mode ENUM('none','monthly'), proration_join_day_cutoff NULL,
  rounding ENUM('floor_half','nearest_half','ceil_half'), min_service_months_for_eligibility DEFAULT 0,
  carry_over_enabled, carry_over_max_days NULL, carry_over_expiry_months NULL,
  allow_negative, negative_limit_days NULL, is_active, effective_from)
leave_entitlement_rules(id, policy_id, employment_status NULL, min_service_months DEFAULT 0,
  max_service_months NULL, days DECIMAL(5,1), priority SMALLINT)
leave_balance_periods(id, policy_id, school_unit_id, period_key, start_date, end_date,
  status ENUM('open','closed'), closed_at, closed_by; UNIQUE(policy_id,school_unit_id,period_key))
employee_leave_balances(id, employee_id, period_id, policy_id, granted, carry_in, adjusted, used,
  reserved, expired, available DECIMAL(5,1), carry_expires_on NULL, updated_at;
  UNIQUE(employee_id,period_id,policy_id))   -- cache
leave_ledger_entries(id, employee_id, period_id, policy_id, bucket ENUM('current','carry_over'),
  entry_type ENUM('grant','carry_in','reserve','commit','release','refund','joint_leave_debit','expire','adjust','compensation_credit'),
  delta_available, delta_reserved, delta_used DECIMAL(5,1), effective_date,
  source_type ENUM('leave_request','holiday','adjustment','period_close','overtime','system'),
  source_id NULL, source_version NULL, idempotency_key VARCHAR(120) UNIQUE, reason VARCHAR(500) NULL,
  created_by_user_id, created_by_employee_id, created_at;
  INDEX(employee_id,period_id,created_at), INDEX(source_type,source_id))

overtime_rate_policies(id, school_unit_id NULL, name, calc_method ENUM('flat_hourly','monthly_wage_divisor'),
  flat_hourly_rate DECIMAL(12,2) NULL, wage_divisor SMALLINT DEFAULT 173, rounding_minutes, min_payable_minutes,
  max_hours_per_day, max_hours_per_week, max_hours_per_month, eligible_employment_statuses JSON NULL,
  comp_off_hours_per_day NULL, is_active, effective_from)
overtime_multiplier_tiers(id, policy_id, day_type, from_hour DECIMAL(4,1), to_hour NULL, multiplier DECIMAL(3,1))

absence_thresholds(id, school_unit_id, group_type ENUM('unit','work_schedule'), group_ref_id NULL,
  max_absent_count NULL, max_absent_percent NULL, is_active)
leave_module_settings(id, school_unit_id NULL, setting_key, setting_value JSON; UNIQUE(school_unit_id,setting_key))
leave_audit_logs(id, entity_type, entity_id, action, actor_user_id, actor_employee_id NULL,
  before_json, after_json, reason, ip, created_at; INDEX(entity_type,entity_id,created_at))
```
`leave_audit_logs` dipisah dari `attendance_audit_logs` kecuali V8 menunjukkan pemakaian ulang aman.

### 10.3 Urutan migrasi Kepegawaian
M-A fondasi (`employees` kolom baru, `leave_audit_logs`, `leave_module_settings`) · M-B `holidays` + targets · M-C `leave_types` + profil + `school_unit_approvers` + delegasi (+ baris 7 kode legacy) · M-D kebijakan jatah (policies, rules, periods) · M-E ledger + balances · M-F perluasan `employee_leave_requests` + `approval_steps` · M-G perluasan `employee_overtimes` + kebijakan lembur · M-H `absence_thresholds` · M-I `employee_attendances.leave_request_id`. Core (terpisah): migrasi/seed permission §9.5.
Backfill `leave_type_id` dari `LOWER(TRIM(leave_type))`; kode tak dikenal → `lainnya` dengan catatan (saat ini 0 baris).

### 10.4 Kalender akademik
`POST /holidays/sync-academic` memanggil service Akademik in-process, MENYALIN event `is_holiday=1` ke `holidays` (`source='academic_calendar'`, `academic_event_id`, upsert idempoten) berstatus `draft_needs_review`. Libur untuk siswa tidak otomatis libur pegawai: HRD mengonfirmasi dan menentukan jadwal target. Tabel Akademik saat ini kosong sehingga fitur ini P3.
Impor libur: CSV/JSON dengan parser sendiri (jangan memakai `xlsx` untuk membaca berkas unggahan). Salin tahun lalu: libur `fixed_date` disalin dengan tanggal sama; `floating` disalin sebagai `draft_needs_review`.

### 10.5 Kontrak data ke Payroll (read-only)
`GET /kepegawaian/payroll-feed?period=YYYY-MM&school_unit_id=` mengembalikan per pegawai: `leave_days_by_type[{code,days,pay_percent,affects_attendance_allowance}]`, `unpaid_equivalent_days`, `overtime[{day_type,payable_hours,multiplier_breakdown,estimated_wage}]`, `source_ids`, `snapshot_hash`, plus `as_of` dan `lock_status`. Periode yang belum `locked` diberi `provisional:true`. `pay_percent=null` berarti belum diputuskan dan tidak boleh diproses. `payroll/service.js calculatePeriod` TIDAK diubah.

---

## 11. Kontrak API (basis `/kepegawaian`)

`[EXT]` memperluas endpoint lama secara kompatibel, `[NEW]` baru.

### 11.1 Master dan pengaturan
| Method & path | Permission |
|---|---|
| `GET /leave-types` [NEW] | authenticate (aktif dan terlihat untuk non-HR; HR semua) |
| `POST/PUT /leave-types`, `PATCH /leave-types/:id/active` [NEW] | `leave_types.manage` (DELETE hanya bila belum pernah dipakai dan bukan `is_system`) |
| `GET/PUT /approval-profiles` [NEW] | `leave_types.manage` |
| `GET/POST/PUT/DELETE /unit-approvers` [NEW] | `leave_types.manage` |
| `GET/POST/DELETE /approval-delegations` [NEW] | pemilik delegasi untuk dirinya, atau HR |
| `GET/PUT /leave-settings`, `GET/PUT /absence-thresholds` [NEW] | `leave_types.manage` |
| `GET /leave-employee-profile`, `PATCH /leave-employee-profile/:employeeId` (join_date, atasan langsung) [NEW] | `leave_balances.manage` |
| `GET /holidays?year=&school_unit_id=&type=` [NEW] | authenticate (scoping) |
| `POST/PUT/DELETE /holidays` [NEW] | `holidays.manage` |
| `POST /holidays/import` (preview lalu commit), `POST /holidays/copy-year`, `POST /holidays/sync-academic` [NEW] | `holidays.manage` |
| `POST /holidays/:id/apply-joint-leave-deduction` [NEW, idempoten] | `holidays.manage` + `leave_balances.manage` |
| `GET /holidays/effective?employee_id=&from=&to=` [NEW] | authenticate + scoping |
| `GET/PUT /leave-balance-policies` (+rules) [NEW] | `leave_balances.manage` |
| `GET/PUT /overtime-settings` [NEW] | `overtime_settings.manage` |

### 11.2 Pengajuan cuti/izin
| Method & path | Permission | Catatan |
|---|---|---|
| `GET /leave-requests` [EXT] | `.manage` atau `.read`, scoping JWT | filter `status[]`, `leave_type`, `category`, `employee_id`, `date_from/date_to` (irisan), `preset`, `q`, `page`, `per_page`. `data` tetap array, `meta` bila `page` diberikan |
| `GET /leave-requests/my` [EXT] | authenticate + aktor pegawai | field lama tetap + `leave_type_name`, `duration_days` |
| `GET /leave-requests/inbox` [NEW] | authenticate (penugasan) | termasuk delegasi |
| `GET /leave-requests/needs-review` [NEW] | `.manage`/`.read` | selisih jadwal/libur, pegawai nonaktif, langkah `unassigned`, lewat SLA |
| `GET /leave-requests/:id` [NEW] | pemilik, approver langkah, atau HR | detail + `approval_steps` + pratinjau saldo + rekan tumpang tindih (nama saja) |
| `POST /leave-requests/preview` [NEW] | authenticate + aktor | tidak menulis; durasi, breakdown, dampak saldo, errors, warnings |
| `POST /leave-requests` [EXT] | authenticate + aktor (§9.2) | wajib `leave_type`, `start_date`, `end_date`; opsional `employee_id` (hanya HR), `start_portion`, `end_portion`, `reason`, `attachment`, `attachment_name`, `bypass_approval`+`bypass_reason` (hanya `override`). 422 untuk `leave_type` tak valid dipertahankan |
| `PATCH /leave-requests/:id/approve` [EXT] | penugasan langkah / HR / `override` | body opsional `comment`, `bypass` |
| `PATCH /leave-requests/:id/reject` [EXT] | sama | `rejection_reason` atau `reason` wajib |
| `PATCH /leave-requests/:id/request-revision` [NEW] | penugasan langkah / HR | `comment` wajib |
| `PATCH /leave-requests/:id/resubmit` [NEW] | pemilik | |
| `PATCH /leave-requests/:id/cancel` [NEW] | pemilik (§2 #23) atau `override` | |
| `PATCH /leave-requests/:id/reassign-approver`, `/reclassify`, `POST /leave-requests/:id/recalculate` [NEW] | `override` | |
| `POST /leave-requests/bulk-approve`, `/bulk-reject` [NEW] | otorisasi ulang per item | maks 50, hasil per item |
| `GET /leave-requests/:id/attachment` [EXT] | pemilik, HR, approver langkah | stream |
| `GET /leave-requests/calendar-matrix` [NEW] | `.read`/`.manage` | `month`, `school_unit_id`, `category`, `include_overtime` |
| `GET /leave-requests/reports/summary|by-type|trend|top|recap` [NEW] | `leave_reports.read` | |
| `GET /leave-requests/reports/export?format=xlsx|pdf` [NEW] | `leave_reports.read` | |

### 11.3 Saldo
`GET /leave-balances?period=&q=` (`leave_balances.read`) · `GET /leave-balances/my` (aktor pegawai) · `GET /leave-balances/:employeeId/ledger` (`leave_balances.read`) · `POST /leave-balances/adjust` dan `/bulk-assign` (`leave_balances.manage`, alasan wajib) · `POST /leave-balances/periods/:id/close` dan `/reconcile` (`leave_balances.manage`, `dry_run=true` default). Semua [NEW].

### 11.4 Lembur
`GET /overtimes` [EXT] (`overtimes.manage` atau `leave_requests.read`, scoping JWT, filter tanggal/status/pegawai/`q`/paginasi) · `GET /overtimes/my` [EXT] · `GET /overtimes/:id` [NEW] · `POST /overtimes/preview` [NEW] · `POST /overtimes` [EXT] (opsional `origin`, `spk_number`, `day_type_override`, `requires_actual_attendance`) · `POST /overtimes/bulk` [NEW] (`employee_ids[]`, satu `assignment_batch_id`) · `PATCH /overtimes/:id/approve|reject` [EXT] · `PATCH /overtimes/:id/cancel` [NEW] · `PATCH /overtimes/:id/reconcile` [NEW] · `PATCH /overtimes/bulk-approve` [NEW].

### 11.5 Payroll
`GET /payroll-feed` [NEW] read-only (§10.5).

---

## 12. Kode error stabil
`INVALID_RANGE, INVALID_PORTION, EMPLOYEE_INACTIVE, ACTOR_NOT_EMPLOYEE, FORBIDDEN_SCOPE, TYPE_INACTIVE, TYPE_NOT_ALLOWED_FOR_EMPLOYEE, NO_SCHEDULE_ASSIGNMENT, NO_WORKING_DAYS, BACKDATE_EXCEEDED, NOTICE_TOO_SHORT, PERIOD_LOCKED, MAX_DAYS_PER_REQUEST, MAX_DAYS_PER_YEAR, MAX_OCCURRENCES, ATTACHMENT_REQUIRED, OVERLAP_APPROVED, OVERLAP_PENDING, ATTENDANCE_PRESENT_CONFLICT, OVERTIME_CONFLICT, ENTITLEMENT_NOT_ELIGIBLE, UNKNOWN_JOIN_DATE, BALANCE_INSUFFICIENT, OVERTIME_LIMIT_EXCEEDED, ILLEGAL_TRANSITION, APPROVER_UNASSIGNED, SELF_APPROVAL_FORBIDDEN, DELEGATION_INVALID`.
Pemetaan HTTP: validasi struktur/bisnis 422; konflik (tumpang tindih, saldo, kunci, transisi ilegal) 409; akses 403; tidak ditemukan 404.

---

## 13. Di luar lingkup (P3, dicatat saja)
Kompensasi lembur ditukar cuti · tier gaji sakit panjang · ekspor `.ics` · notifikasi otomatis dan eskalasi otomatis · ambang per mata pelajaran · aturan sandwich · pencairan sisa cuti · sinkron kalender akademik (bergantung data) · aturan ASN untuk PNS DPK · perubahan Portal Guru · cetak PDF ledger per pegawai · integrasi hitung Payroll.
