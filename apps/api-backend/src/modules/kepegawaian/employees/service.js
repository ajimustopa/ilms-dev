/**
 * Employees Service Implementation
 * Modul Kepegawaian - Fitur 1.1: CRUD Data Pegawai (Master) & Fitur 1.6 (Aktivasi Pegawai)
 */
const db = require('../../../config/db/kepegawaian');
const coreDb = require('../../../config/db/core');
const akademikDb = require('../../../config/db/akademik');
const sarprasDb = require('../../../config/db/sarpras');
const usersService = require('../../core/users/service');
const schoolUnitsService = require('../../core/school-units/service');
const webhooksService = require('../../core/webhooks/service');


// Helper masking PII
function maskPii(val) {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.length <= 4) return '****';
  return `${trimmed.slice(0, 4)}${'*'.repeat(Math.max(4, trimmed.length - 8))}${trimmed.slice(-4)}`;
}

function isPrivilegedUser(user) {
  if (!user) return false;
  if (user.is_super_admin || user.account_type === 'super_admin') return true;
  const roles = user.user_school_roles || user.roles || [];
  return roles.some(r => {
    const roleName = typeof r === 'string' ? r : r.role_name || r.name;
    return ['super_admin', 'admin_yayasan', 'hrd'].includes(roleName);
  });
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

class EmployeesService {
  /**
   * Helper untuk membentuk query list pegawai dengan filter & pagination
   */
  async listEmployees(query = {}, user = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.per_page || query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    let baseQuery = db('employees');

    // Filter berdasarkan school_unit_id (abaikan jika 'all' atau data gabungan pusat yayasan)
    if (query.school_unit_id && query.school_unit_id !== 'all' && query.school_unit_id !== 'null' && query.school_unit_id !== 'undefined') {
      baseQuery = baseQuery.where('employees.school_unit_id', query.school_unit_id);
    }

    // Filter berdasarkan employment_status
    if (query.employment_status) {
      baseQuery = baseQuery.where('employees.employment_status', query.employment_status);
    }

    // Filter berdasarkan account_status
    if (query.account_status) {
      baseQuery = baseQuery.where('employees.account_status', query.account_status);
    }

    // Search berdasarkan nama atau nomor pegawai / NIK / NUPTK / NIP
    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('employees.full_name', 'like', `%${query.search}%`)
          .orWhere('employees.employee_number', 'like', `%${query.search}%`)
          .orWhere('employees.nip', 'like', `%${query.search}%`)
          .orWhere('employees.nik', 'like', `%${query.search}%`)
          .orWhere('employees.nuptk', 'like', `%${query.search}%`);
      });
    }

    const countResult = await baseQuery.clone().count('employees.id as total').first();
    const totalItems = parseInt(countResult.total, 10) || 0;

    const rows = await baseQuery
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .select(
        'employees.id',
        'employees.school_unit_id',
        'employees.employee_number',
        'employees.nik',
        'employees.nip',
        'employees.nuptk',
        'employees.full_name',
        'employees.academic_title',
        'employees.mother_name',
        'employees.citizenship',
        'employees.gender',
        'employees.employment_status',
        'employees.account_status',
        'employees.current_rank',
        'employees.current_position_id',
        'job_positions.name as current_position_name'
      )
      .orderBy('employees.id', 'desc')
      .limit(limit)
      .offset(offset);

    const privileged = isPrivilegedUser(user);

    const items = rows.map((r) => ({
      id: r.id,
      school_unit_id: r.school_unit_id,
      employee_number: r.employee_number,
      nik: privileged ? r.nik : maskPii(r.nik),
      nip: r.nip,
      nuptk: r.nuptk,
      full_name: r.full_name,
      academic_title: r.academic_title,
      mother_name: r.mother_name,
      citizenship: r.citizenship,
      gender: r.gender,
      employment_status: r.employment_status,
      account_status: r.account_status,
      current_rank: r.current_rank,
      current_position: r.current_position_id ? {
        id: r.current_position_id,
        name: r.current_position_name
      } : null
    }));

    return {
      items,
      pagination: {
        page,
        per_page: limit,
        total: totalItems,
        total_pages: Math.ceil(totalItems / limit) || 1
      }
    };
  }

  /**
   * Detail satu pegawai
   */
  async getEmployeeById(id, user = null) {
    const employee = await db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.id', id)
      .select(
        'employees.*',
        'job_positions.name as current_position_name'
      )
      .first();

    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const privileged = isPrivilegedUser(user);

    return {
      ...employee,
      nik: privileged ? employee.nik : maskPii(employee.nik),
      age: calculateAge(employee.birth_date),
      current_position: employee.current_position_id ? {
        id: employee.current_position_id,
        name: employee.current_position_name
      } : null
    };
  }

  /**
   * Tambah pegawai baru & in-process provisioning akun Core Service
   */
  async createEmployee(payload) {
    const {
      school_unit_id,
      employee_number,
      nik,
      nip,
      nuptk,
      full_name,
      academic_title,
      mother_name,
      citizenship,
      birth_place,
      birth_date,
      gender,
      religion,
      marital_status,
      address,
      phone_number,
      email,
      photo_url,
      current_position_id,
      current_rank,
      employment_status
    } = payload;

    // Validasi data wajib
    if (!school_unit_id || !employee_number || !full_name || !gender || !employment_status) {
      const error = new Error('Field school_unit_id, employee_number, full_name, gender, dan employment_status wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Validasi keberadaan Satuan Pendidikan in-process
    try {
      await schoolUnitsService.getSchoolUnitById(school_unit_id);
    } catch (e) {
      const error = new Error(`Satuan Pendidikan dengan ID ${school_unit_id} tidak valid`);
      error.statusCode = 422;
      throw error;
    }

    // Cek duplikasi nomor pegawai atau nuptk atau nik
    const existingNum = await db('employees').where({ employee_number: employee_number.trim() }).first();
    if (existingNum) {
      const error = new Error('Nomor pegawai sudah digunakan');
      error.statusCode = 409;
      throw error;
    }

    if (nik) {
      const existingNik = await db('employees').where({ nik: nik.trim() }).first();
      if (existingNik) {
        const error = new Error('NIK sudah terdaftar');
        error.statusCode = 409;
        throw error;
      }
    }

    if (nuptk) {
      const existingNuptk = await db('employees').where({ nuptk: nuptk.trim() }).first();
      if (existingNuptk) {
        const error = new Error('NUPTK sudah terdaftar');
        error.statusCode = 409;
        throw error;
      }
    }

    // Insert pegawai baru
    const [employeeId] = await db('employees').insert({
      school_unit_id,
      employee_number: employee_number.trim(),
      nik: nik ? nik.trim() : null,
      nip: nip ? nip.trim() : null,
      nuptk: nuptk ? nuptk.trim() : null,
      full_name: full_name.trim(),
      academic_title: academic_title ? academic_title.trim() : null,
      mother_name: mother_name ? mother_name.trim() : null,
      citizenship: citizenship || 'Indonesia',
      birth_place: birth_place || null,
      birth_date: birth_date || null,
      gender,
      religion: religion || null,
      marital_status: marital_status || null,
      address: address || null,
      phone_number: phone_number || null,
      email: email ? email.trim() : null,
      photo_url: photo_url || null,
      current_position_id: current_position_id || null,
      current_rank: current_rank || null,
      employment_status,
      account_status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // In-process provisioning akun Core Service (ref_type = 'staff', ref_id = employeeId)
    let coreAccount = null;
    try {
      const { generateShortUsername } = require('../../../utils/usernameGenerator');
      const existingUsernames = new Set((await coreDb('users').select('username')).map(u => u.username));
      const generatedUsername = generateShortUsername(full_name.trim(), existingUsernames);
      
      // Tentukan role otomatis berdasarkan status kepegawaian
      let targetRoleId = 3; // default: staf / admin unit
      if (employment_status === 'pelatih_ekskul') {
        const role = await db.raw("SELECT id FROM core_local.roles WHERE name = 'pelatih_ekskul' LIMIT 1");
        targetRoleId = role[0]?.[0]?.id || 16;
      } else if (employment_status === 'guru_tamu' || employment_status === 'partner') {
        const role = await db.raw("SELECT id FROM core_local.roles WHERE name = 'guru_tamu' LIMIT 1");
        targetRoleId = role[0]?.[0]?.id || 17;
      } else if (employment_status === 'gty' || employment_status === 'gtt') {
        const role = await db.raw("SELECT id FROM core_local.roles WHERE name = 'guru' LIMIT 1");
        targetRoleId = role[0]?.[0]?.id || 8;
      }

      coreAccount = await usersService.internalCreateUser({
        username: generatedUsername,
        password: 'abs321',
        full_name: full_name.trim(),
        account_type: 'staff',
        ref_type: 'staff',
        ref_id: employeeId,
        school_unit_id,
        role_id: targetRoleId
      });
    } catch (err) {
      console.warn(`[Core Provisioning Warning] Gagal membuat akun Core untuk pegawai ${employeeId}:`, err.message);
    }

    const createdEmployee = await this.getEmployeeById(employeeId, { is_super_admin: true });
    return {
      ...createdEmployee,
      core_account_provisioned: !!coreAccount,
      core_username: coreAccount ? coreAccount.username : null
    };
  }

  /**
   * Update data pegawai
   */
  async updateEmployee(id, payload, user = null) {
    const employee = await db('employees').where({ id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const allowedFields = [
      'school_unit_id',
      'nik',
      'nip',
      'nuptk',
      'full_name',
      'academic_title',
      'mother_name',
      'citizenship',
      'birth_place',
      'birth_date',
      'gender',
      'religion',
      'marital_status',
      'address',
      'phone_number',
      'email',
      'photo_url',
      'current_position_id',
      'current_rank',
      'employment_status'
    ];

    const updateData = { updated_at: db.fn.now() };
    for (const key of allowedFields) {
      if (payload[key] !== undefined) {
        updateData[key] = payload[key];
      }
    }

    if (updateData.nik) {
      const existingNik = await db('employees').where({ nik: updateData.nik.trim() }).whereNot({ id }).first();
      if (existingNik) {
        const error = new Error('NIK sudah terdaftar pada pegawai lain');
        error.statusCode = 409;
        throw error;
      }
    }

    if (updateData.school_unit_id) {
      try {
        await schoolUnitsService.getSchoolUnitById(updateData.school_unit_id);
      } catch (e) {
        const error = new Error(`Satuan Pendidikan dengan ID ${updateData.school_unit_id} tidak valid`);
        error.statusCode = 422;
        throw error;
      }
    }

    await db('employees').where({ id }).update(updateData);

    // Sync nama ke Core Service jika nama berubah
    if (updateData.full_name) {
      try {
        await usersService.internalSyncUser({
          ref_type: 'staff',
          ref_id: id,
          full_name: updateData.full_name
        });
      } catch (err) {
        // Abaikan jika akun core belum ada
      }
    }

    return this.getEmployeeById(id, user);
  }

  /**
   * Update status akun pegawai (active, inactive, resigned, retired) beserta pencatatan riwayat & alasan
   */
  async updateAccountStatus(id, { account_status, effective_date, reason }, user = null) {
    if (!['active', 'inactive', 'resigned', 'retired'].includes(account_status)) {
      const error = new Error("Status harus 'active', 'inactive', 'resigned', atau 'retired'");
      error.statusCode = 422;
      throw error;
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      const error = new Error('Alasan perubahan status akun wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = employee.account_status;

    await db('employees').where({ id }).update({
      account_status,
      updated_at: db.fn.now()
    });

    // Catat riwayat perubahan ke tabel employee_account_status_logs
    try {
      const hasTable = await db.schema.hasTable('employee_account_status_logs');
      if (hasTable) {
        await db('employee_account_status_logs').insert({
          employee_id: Number(id),
          previous_status: previousStatus,
          new_status: account_status,
          effective_date: effective_date || null,
          reason: reason.trim(),
          changed_by_user_id: user?.id || null,
          changed_by_name: user?.full_name || user?.username || 'Administrator',
          created_at: db.fn.now()
        });
      }
    } catch (err) {
      console.warn('Gagal mencatat status log:', err.message);
    }

    // Sinkronisasi status user ke Core Service jika resigned / retired / inactive
    const coreStatus = account_status === 'active' ? 'active' : 'inactive';
    try {
      await usersService.internalSyncUser({
        ref_type: 'staff',
        ref_id: id,
        status: coreStatus
      });
    } catch (err) {
      // Abaikan jika akun core tidak ada
    }

    // Catat webhook event ke tabel webhook_events (Core Service)
    try {
      await webhooksService.recordEvent('employee.status_changed', {
        employee_id: Number(id),
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        previous_status: previousStatus,
        account_status,
        effective_date: effective_date || null,
        reason: reason.trim(),
        changed_by: user?.full_name || user?.username || 'Administrator'
      });
    } catch (err) {}

    return {
      id: Number(id),
      employee_number: employee.employee_number,
      full_name: employee.full_name,
      previous_status: previousStatus,
      account_status,
      effective_date: effective_date || null,
      reason: reason.trim()
    };
  }

  /**
   * Mengambil riwayat log perubahan status akun pegawai
   */
  async getAccountStatusHistory(id) {
    const employee = await db('employees').where({ id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const hasTable = await db.schema.hasTable('employee_account_status_logs');
    if (!hasTable) return [];

    const logs = await db('employee_account_status_logs')
      .where({ employee_id: id })
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc');

    return logs;
  }

  /**
   * Mengambil rekap seluruh data terkait pegawai di berbagai modul sebelum penghapusan
   */
  async getRelatedData(id) {
    const employee = await db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.id', id)
      .select('employees.*', 'job_positions.name as current_position_name')
      .first();

    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Helper safe count
    const safeCount = async (knexInstance, tableName, condition) => {
      try {
        const has = await knexInstance.schema.hasTable(tableName);
        if (!has) return 0;
        const res = await knexInstance(tableName).where(condition).count('* as total').first();
        return parseInt(res?.total || 0, 10);
      } catch (e) {
        return 0;
      }
    };

    // 1. Biodata & Berkas
    const [
      addressCount,
      emergencyCount,
      docCount,
      bankCount,
      bpjsCount,
      skillsCount,
      workExpCount
    ] = await Promise.all([
      safeCount(db, 'employee_addresses', { employee_id: id }),
      safeCount(db, 'employee_emergency_contacts', { employee_id: id }),
      safeCount(db, 'employee_documents', { employee_id: id }),
      safeCount(db, 'employee_bank_accounts', { employee_id: id }),
      safeCount(db, 'employee_bpjs', { employee_id: id }),
      safeCount(db, 'employee_skills_certifications', { employee_id: id }),
      safeCount(db, 'employee_work_experiences', { employee_id: id })
    ]);

    // 2. Keluarga & Pendidikan
    const [familyCount, eduCount] = await Promise.all([
      safeCount(db, 'employee_family_members', { employee_id: id }),
      safeCount(db, 'employee_education_trainings', { employee_id: id })
    ]);

    // 3. Penugasan, Jabatan & Mutasi
    const [schoolAssignCount, posHistCount, mutationCount, retireCount] = await Promise.all([
      safeCount(db, 'employee_school_assignments', { employee_id: id }),
      safeCount(db, 'employee_position_history', { employee_id: id }),
      safeCount(db, 'employee_mutations', { employee_id: id }),
      safeCount(db, 'employee_retirement_plans', { employee_id: id })
    ]);

    // 4. Presensi, Cuti & Lembur
    const [attendanceCount, leaveCount, overtimeCount] = await Promise.all([
      safeCount(db, 'employee_attendances', { employee_id: id }),
      safeCount(db, 'employee_leave_requests', { employee_id: id }),
      safeCount(db, 'employee_overtimes', { employee_id: id })
    ]);

    // 5. Payroll, Kinerja & Psikotes
    const [payrollCount, performanceCount, psychotestResultCount, psychotestSessionCount] = await Promise.all([
      safeCount(db, 'payroll_items', { employee_id: id }),
      safeCount(db, 'performance_reviews', { employee_id: id }),
      safeCount(db, 'psychotest_results', { employee_id: id }),
      safeCount(db, 'psychotest_sessions', { employee_id: id })
    ]);

    // 6. Akademik & Pengajaran
    const [dutyCount, scheduleCount, legacyAssignCount, homeroomCount, supervisorCount, counselingCount] = await Promise.all([
      safeCount(akademikDb, 'subject_teacher_duties', { teacher_employee_id: id }),
      safeCount(akademikDb, 'subject_schedules', { teacher_employee_id: id }),
      safeCount(akademikDb, 'teaching_assignments', { teacher_employee_id: id }),
      safeCount(akademikDb, 'class_groups', { homeroom_teacher_employee_id: id }),
      safeCount(akademikDb, 'extracurriculars', { supervisor_employee_id: id }),
      safeCount(akademikDb, 'counseling_records', { counselor_employee_id: id })
    ]);

    // 7. Sarpras (Fasilitas & Pemeliharaan)
    const [facilityBookingCount, maintenanceCount] = await Promise.all([
      safeCount(sarprasDb, 'facility_bookings', { employee_id: id }),
      safeCount(sarprasDb, 'maintenance_requests', { reported_by: id })
    ]);

    // 8. Akun Core User
    let coreUserCount = 0;
    try {
      const users = await coreDb('users')
        .where((b) => {
          b.where({ ref_type: 'staff', ref_id: id })
            .orWhere({ employee_id: id });
          if (employee.email) {
            b.orWhere({ email: employee.email });
          }
        })
        .select('id', 'username', 'email');
      coreUserCount = users.length;
    } catch (e) {}

    const categories = [
      {
        id: 'biodata_berkas',
        name: 'Biodata & Berkas Kepegawaian',
        description: 'Alamat domisili/KTP, kontak darurat, berkas digital, nomor rekening, data BPJS, sertifikasi kompetensi, dan riwayat kerja.',
        total: addressCount + emergencyCount + docCount + bankCount + bpjsCount + skillsCount + workExpCount,
        items: [
          { label: 'Alamat Domisili / KTP', count: addressCount },
          { label: 'Kontak Darurat', count: emergencyCount },
          { label: 'Dokumen / Berkas Digital', count: docCount },
          { label: 'Rekening Bank', count: bankCount },
          { label: 'Kepesertaan BPJS', count: bpjsCount },
          { label: 'Sertifikasi & Keahlian', count: skillsCount },
          { label: 'Pengalaman Kerja Terdahulu', count: workExpCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'keluarga_pendidikan',
        name: 'Keluarga & Riwayat Pendidikan',
        description: 'Susunan anggota keluarga dan data riwayat pendidikan formal maupun pelatihan.',
        total: familyCount + eduCount,
        items: [
          { label: 'Anggota Keluarga', count: familyCount },
          { label: 'Riwayat Pendidikan & Pelatihan', count: eduCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'penugasan_jabatan',
        name: 'Penugasan, Jabatan & Mutasi',
        description: 'SK penugasan satuan pendidikan, rekam jejak jabatan, mutasi kerja, dan rencana pensiun.',
        total: schoolAssignCount + posHistCount + mutationCount + retireCount,
        items: [
          { label: 'Penugasan Satuan Pendidikan', count: schoolAssignCount },
          { label: 'Riwayat Jabatan', count: posHistCount },
          { label: 'Riwayat Mutasi', count: mutationCount },
          { label: 'Rencana Pensiun', count: retireCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'presensi_cuti',
        name: 'Presensi, Cuti & Lembur',
        description: 'Seluruh riwayat presensi/absensi harian, riwayat pengajuan cuti/izin, dan pengajuan lembur.',
        total: attendanceCount + leaveCount + overtimeCount,
        items: [
          { label: 'Rekam Presensi & Kehadiran', count: attendanceCount },
          { label: 'Pengajuan Cuti / Izin', count: leaveCount },
          { label: 'Pengajuan Lembur', count: overtimeCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'payroll_kinerja',
        name: 'Penggajian, Kinerja & Psikotes',
        description: 'Data komponen slip gaji/payroll, rekam evaluasi kinerja berkala, serta sesi dan hasil psikotes.',
        total: payrollCount + performanceCount + psychotestResultCount + psychotestSessionCount,
        items: [
          { label: 'Rincian Slip Gaji / Payroll', count: payrollCount },
          { label: 'Penilaian Kinerja / Evaluasi', count: performanceCount },
          { label: 'Hasil Tes Psikologi (MBTI/OCEAN)', count: psychotestResultCount },
          { label: 'Sesi Tes Psikologi', count: psychotestSessionCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'akademik_pengajaran',
        name: 'Akademik & Pengajaran',
        description: 'Penugasan mata pelajaran, alokasi jam jadwal mengajar, peran wali kelas, pembina ekskul, dan konseling siswa.',
        total: dutyCount + scheduleCount + legacyAssignCount + homeroomCount + supervisorCount + counselingCount,
        items: [
          { label: 'Penugasan Guru Mapel (Duties)', count: dutyCount },
          { label: 'Alokasi Jadwal Pelajaran (Schedules)', count: scheduleCount },
          { label: 'Penugasan Jadwal Ajar Legacy', count: legacyAssignCount },
          { label: 'Tugas Wali Kelas', count: homeroomCount },
          { label: 'Pembina Ekstrakurikuler', count: supervisorCount },
          { label: 'Catatan Bimbingan Konseling (BK)', count: counselingCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'sarpras_fasilitas',
        name: 'Sarpras & Peminjaman Fasilitas',
        description: 'Rekam peminjaman fasilitas sekolah dan laporan pemeliharaan sarana prasarana.',
        total: facilityBookingCount + maintenanceCount,
        items: [
          { label: 'Peminjaman Fasilitas / Ruangan', count: facilityBookingCount },
          { label: 'Laporan Pemeliharaan Aset', count: maintenanceCount }
        ].filter(i => i.count > 0)
      },
      {
        id: 'akun_user',
        name: 'Akun Login Pengguna (Core User)',
        description: 'Akun autentikasi pengguna dan seluruh hak akses role yang terhubung dengan pegawai ini.',
        total: coreUserCount,
        items: [
          { label: 'Akun Pengguna Sistem (User Login)', count: coreUserCount }
        ].filter(i => i.count > 0)
      }
    ];

    const totalRecords = categories.reduce((sum, cat) => sum + cat.total, 0);

    return {
      employee: {
        id: employee.id,
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        nik: employee.nik,
        nip: employee.nip,
        employment_status: employee.employment_status,
        account_status: employee.account_status,
        position_name: employee.current_position_name || '-'
      },
      total_records: totalRecords,
      categories: categories.filter(cat => cat.total > 0 || cat.items.length > 0)
    };
  }

  /**
   * Menghapus pegawai beserta seluruh data terkait di semua modul secara cascade transaction
   */
  async deleteEmployee(id, user = null) {
    const employee = await db('employees').where({ id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Bersihkan referensi di modul Akademik
    try {
      const hasDuties = await akademikDb.schema.hasTable('subject_teacher_duties');
      if (hasDuties) {
        const duties = await akademikDb('subject_teacher_duties').where({ teacher_employee_id: id }).select('id');
        const dutyIds = duties.map(d => d.id);
        if (dutyIds.length > 0) {
          const hasDutyClasses = await akademikDb.schema.hasTable('subject_teacher_duty_classes');
          if (hasDutyClasses) {
            await akademikDb('subject_teacher_duty_classes').whereIn('duty_id', dutyIds).delete();
          }
          await akademikDb('subject_teacher_duties').whereIn('id', dutyIds).delete();
        }
      }

      if (await akademikDb.schema.hasTable('subject_teachers')) {
        await akademikDb('subject_teachers').where({ teacher_employee_id: id }).delete();
      }

      if (await akademikDb.schema.hasTable('subject_schedules')) {
        await akademikDb('subject_schedules').where({ teacher_employee_id: id }).delete();
      }

      if (await akademikDb.schema.hasTable('teaching_assignments')) {
        await akademikDb('teaching_assignments').where({ teacher_employee_id: id }).delete();
      }

      if (await akademikDb.schema.hasTable('class_groups')) {
        await akademikDb('class_groups').where({ homeroom_teacher_employee_id: id }).update({ homeroom_teacher_employee_id: null });
      }

      if (await akademikDb.schema.hasTable('extracurriculars')) {
        await akademikDb('extracurriculars').where({ supervisor_employee_id: id }).update({ supervisor_employee_id: null });
      }

      if (await akademikDb.schema.hasTable('counseling_records')) {
        await akademikDb('counseling_records').where({ counselor_employee_id: id }).update({ counselor_employee_id: null });
      }

      if (await akademikDb.schema.hasTable('student_disciplinary_records')) {
        await akademikDb('student_disciplinary_records').where({ handled_by_employee_id: id }).update({ handled_by_employee_id: null });
      }
    } catch (err) {
      console.warn('Pembersihan data akademik terkait pegawai gagal sebagian:', err.message);
    }

    // 2. Bersihkan referensi di modul Sarpras
    try {
      if (await sarprasDb.schema.hasTable('facility_bookings')) {
        await sarprasDb('facility_bookings').where({ employee_id: id }).delete();
      }
      if (await sarprasDb.schema.hasTable('maintenance_requests')) {
        await sarprasDb('maintenance_requests').where({ reported_by: id }).update({ reported_by: null });
      }
    } catch (err) {
      console.warn('Pembersihan data sarpras terkait pegawai gagal sebagian:', err.message);
    }

    // 3. Bersihkan akun Core Users terkait
    try {
      const coreUsers = await coreDb('users')
        .where((b) => {
          b.where({ ref_type: 'staff', ref_id: id })
            .orWhere({ employee_id: id });
          if (employee.email) {
            b.orWhere({ email: employee.email });
          }
        })
        .select('id');

      const coreUserIds = coreUsers.map(u => u.id);
      if (coreUserIds.length > 0) {
        if (await coreDb.schema.hasTable('user_school_roles')) {
          await coreDb('user_school_roles').whereIn('user_id', coreUserIds).delete();
        }
        await coreDb('users').whereIn('id', coreUserIds).delete();
      }
    } catch (err) {
      console.warn('Pembersihan akun user core terkait pegawai gagal sebagian:', err.message);
    }

    // 4. Bersihkan tabel-tabel anak Kepegawaian dalam transaksi
    await db.transaction(async (trx) => {
      const childTables = [
        'employee_addresses',
        'employee_emergency_contacts',
        'employee_documents',
        'employee_bank_accounts',
        'employee_bpjs',
        'employee_skills_certifications',
        'employee_work_experiences',
        'employee_family_members',
        'employee_education_trainings',
        'employee_school_assignments',
        'employee_position_history',
        'employee_mutations',
        'employee_retirement_plans',
        'employee_attendances',
        'employee_leave_requests',
        'employee_overtimes',
        'payroll_items',
        'performance_reviews',
        'psychotest_results',
        'psychotest_sessions',
        'employee_account_status_logs'
      ];

      for (const table of childTables) {
        try {
          const has = await trx.schema.hasTable(table);
          if (has) {
            await trx(table).where({ employee_id: id }).delete();
          }
        } catch (e) {
          console.warn(`Gagal menghapus anak tabel ${table}:`, e.message);
        }
      }

      // Update recruitment_candidates jika ada
      try {
        if (await trx.schema.hasTable('recruitment_candidates')) {
          await trx('recruitment_candidates').where({ converted_to_employee_id: id }).update({ converted_to_employee_id: null });
        }
      } catch (e) {}

      // Hapus data pegawai utama
      await trx('employees').where({ id }).delete();
    });

    // Catat webhook event
    try {
      await webhooksService.recordEvent('employee.deleted', {
        employee_id: Number(id),
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        deleted_by: user?.full_name || user?.username || 'Admin'
      });
    } catch (err) {}

    return {
      id: Number(id),
      employee_number: employee.employee_number,
      full_name: employee.full_name,
      message: `Data pegawai "${employee.full_name}" beserta seluruh data terkait berhasil dihapus permanen.`
    };
  }
}

module.exports = new EmployeesService();

