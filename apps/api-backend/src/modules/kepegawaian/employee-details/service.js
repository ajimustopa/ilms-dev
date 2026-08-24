/**
 * Employee Details Service Implementation
 * Modul Kepegawaian - Fitur: Detail Pegawai, Pendidikan, Diklat, Keahlian, Keluarga,
 * Alamat KTP/Domisili, Karya Tulis, Karir Eksternal, Organisasi, Berkas, Rekening Bank, SP, Pensiun, Riwayat Gaji
 */
const db = require('../../../config/db/kepegawaian');

const DEFAULT_DOCUMENTS = [
  'KTP',
  'KK',
  'Akta Kelahiran',
  'Ijazah SD',
  'Ijazah SMP',
  'Ijazah SMA',
  'Ijazah S1',
  'Ijazah S2',
  'Ijazah S3'
];

class EmployeeDetailsService {
  // ==========================================
  // 1. Pendidikan, Pelatihan, Sertifikasi & Keahlian
  // ==========================================
  async listEducationTrainings(employeeId) {
    return db('employee_education_trainings')
      .where({ employee_id: employeeId })
      .orderBy('graduation_year', 'desc')
      .orderBy('id', 'desc');
  }

  async createEducationTraining(employeeId, payload) {
    const {
      record_type,
      education_level,
      major,
      institution_name,
      graduation_year,
      training_name,
      organizer,
      event_start_date,
      event_end_date,
      proficiency_level,
      certificate_number,
      certificate_file_url
    } = payload;

    if (!record_type || !['education', 'training', 'certification', 'skill'].includes(record_type)) {
      const error = new Error("Field record_type harus 'education', 'training', 'certification', atau 'skill'");
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_education_trainings').insert({
      employee_id: employeeId,
      record_type,
      education_level: education_level || null,
      major: major || null,
      institution_name: institution_name || null,
      graduation_year: graduation_year || null,
      training_name: training_name || null,
      organizer: organizer || null,
      event_start_date: event_start_date || null,
      event_end_date: event_end_date || null,
      proficiency_level: proficiency_level || null,
      certificate_number: certificate_number || null,
      certificate_file_url: certificate_file_url || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_education_trainings').where({ id }).first();
  }

  async updateEducationTraining(id, payload) {
    const existing = await db('employee_education_trainings').where({ id }).first();
    if (!existing) {
      const error = new Error('Data pendidikan/pelatihan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = [
      'record_type',
      'education_level',
      'major',
      'institution_name',
      'graduation_year',
      'training_name',
      'organizer',
      'event_start_date',
      'event_end_date',
      'proficiency_level',
      'certificate_number',
      'certificate_file_url'
    ];
    for (const key of allowed) {
      if (payload[key] !== undefined) updateData[key] = payload[key];
    }

    await db('employee_education_trainings').where({ id }).update(updateData);
    return db('employee_education_trainings').where({ id }).first();
  }

  async deleteEducationTraining(id) {
    const existing = await db('employee_education_trainings').where({ id }).first();
    if (!existing) {
      const error = new Error('Data pendidikan/pelatihan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_education_trainings').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 2. Anggota Keluarga
  // ==========================================
  async listFamilyMembers(employeeId) {
    return db('employee_family_members')
      .where({ employee_id: employeeId })
      .orderBy('id', 'asc');
  }

  async createFamilyMember(employeeId, payload) {
    const { relation, name, birth_place, birth_date, marriage_date, occupation } = payload;
    if (!relation || !name) {
      const error = new Error("Field relation ('spouse'/'child') dan name wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    if (!['spouse', 'child'].includes(relation)) {
      const error = new Error("Field relation harus 'spouse' atau 'child'");
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_family_members').insert({
      employee_id: employeeId,
      relation,
      name: name.trim(),
      birth_place: birth_place || null,
      birth_date: birth_date || null,
      marriage_date: marriage_date || null,
      occupation: occupation || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_family_members').where({ id }).first();
  }

  async updateFamilyMember(id, payload) {
    const existing = await db('employee_family_members').where({ id }).first();
    if (!existing) {
      const error = new Error('Data anggota keluarga tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.relation) updateData.relation = payload.relation;
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.birth_place !== undefined) updateData.birth_place = payload.birth_place;
    if (payload.birth_date !== undefined) updateData.birth_date = payload.birth_date;
    if (payload.marriage_date !== undefined) updateData.marriage_date = payload.marriage_date;
    if (payload.occupation !== undefined) updateData.occupation = payload.occupation;

    await db('employee_family_members').where({ id }).update(updateData);
    return db('employee_family_members').where({ id }).first();
  }

  async deleteFamilyMember(id) {
    const existing = await db('employee_family_members').where({ id }).first();
    if (!existing) {
      const error = new Error('Data anggota keluarga tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_family_members').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 3. Alamat KTP & Domisili (employee_addresses)
  // ==========================================
  async listAddresses(employeeId) {
    return db('employee_addresses')
      .where({ employee_id: employeeId })
      .orderBy('id', 'asc');
  }

  async createAddress(employeeId, payload) {
    const { address_type, street, rt, rw, hamlet, village, district, city, province, postal_code } = payload;
    if (!address_type || !['ktp', 'domisili'].includes(address_type)) {
      const error = new Error("Field address_type ('ktp' atau 'domisili') wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('employee_addresses')
      .where({ employee_id: employeeId, address_type })
      .first();

    if (existing) {
      const error = new Error(`Alamat bertipe ${address_type} sudah ada. Gunakan fungsi edit.`);
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('employee_addresses').insert({
      employee_id: employeeId,
      address_type,
      street: street || null,
      rt: rt || null,
      rw: rw || null,
      hamlet: hamlet || null,
      village: village || null,
      district: district || null,
      city: city || null,
      province: province || null,
      postal_code: postal_code || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_addresses').where({ id }).first();
  }

  async updateAddress(id, payload) {
    const existing = await db('employee_addresses').where({ id }).first();
    if (!existing) {
      const error = new Error('Alamat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = ['street', 'rt', 'rw', 'hamlet', 'village', 'district', 'city', 'province', 'postal_code'];
    for (const k of allowed) {
      if (payload[k] !== undefined) updateData[k] = payload[k];
    }

    await db('employee_addresses').where({ id }).update(updateData);
    return db('employee_addresses').where({ id }).first();
  }

  async deleteAddress(id) {
    const existing = await db('employee_addresses').where({ id }).first();
    if (!existing) {
      const error = new Error('Alamat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_addresses').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 4. Karya Tulis & Publikasi (employee_publications)
  // ==========================================
  async listPublications(employeeId) {
    return db('employee_publications')
      .where({ employee_id: employeeId })
      .orderBy('publication_year', 'desc')
      .orderBy('id', 'desc');
  }

  async createPublication(employeeId, payload) {
    const { title, publication_year, publisher_or_media, publication_url, notes } = payload;
    if (!title) {
      const error = new Error('Judul karya tulis (title) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_publications').insert({
      employee_id: employeeId,
      title: title.trim(),
      publication_year: publication_year || null,
      publisher_or_media: publisher_or_media || null,
      publication_url: publication_url || null,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_publications').where({ id }).first();
  }

  async updatePublication(id, payload) {
    const existing = await db('employee_publications').where({ id }).first();
    if (!existing) {
      const error = new Error('Data karya tulis tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = ['title', 'publication_year', 'publisher_or_media', 'publication_url', 'notes'];
    for (const k of allowed) {
      if (payload[k] !== undefined) updateData[k] = payload[k];
    }

    await db('employee_publications').where({ id }).update(updateData);
    return db('employee_publications').where({ id }).first();
  }

  async deletePublication(id) {
    const existing = await db('employee_publications').where({ id }).first();
    if (!existing) {
      const error = new Error('Data karya tulis tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_publications').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 5. Pengalaman Kerja / Riwayat Karir (employee_work_experiences)
  // ==========================================
  async listWorkExperiences(employeeId) {
    return db('employee_work_experiences')
      .where({ employee_id: employeeId })
      .orderBy('start_date', 'desc')
      .orderBy('id', 'desc');
  }

  async createWorkExperience(employeeId, payload) {
    const { organization_name, role_title, start_date, end_date } = payload;
    if (!organization_name || !role_title) {
      const error = new Error('Field organization_name dan role_title wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_work_experiences').insert({
      employee_id: employeeId,
      organization_name: organization_name.trim(),
      role_title: role_title.trim(),
      start_date: start_date || null,
      end_date: end_date || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_work_experiences').where({ id }).first();
  }

  async updateWorkExperience(id, payload) {
    const existing = await db('employee_work_experiences').where({ id }).first();
    if (!existing) {
      const error = new Error('Data pengalaman kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = ['organization_name', 'role_title', 'start_date', 'end_date'];
    for (const k of allowed) {
      if (payload[k] !== undefined) updateData[k] = payload[k];
    }

    await db('employee_work_experiences').where({ id }).update(updateData);
    return db('employee_work_experiences').where({ id }).first();
  }

  async deleteWorkExperience(id) {
    const existing = await db('employee_work_experiences').where({ id }).first();
    if (!existing) {
      const error = new Error('Data pengalaman kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_work_experiences').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 6. Surat Peringatan / SP (employee_warning_letters)
  // ==========================================
  async listWarningLetters(employeeId) {
    return db('employee_warning_letters')
      .leftJoin('employees as issuer', 'employee_warning_letters.issued_by', 'issuer.id')
      .where('employee_warning_letters.employee_id', employeeId)
      .select(
        'employee_warning_letters.*',
        'issuer.full_name as issuer_name',
        'issuer.employee_number as issuer_employee_number'
      )
      .orderBy('employee_warning_letters.warning_date', 'desc');
  }

  async createWarningLetter(employeeId, payload) {
    const { warning_date, letter_number, description, issued_by } = payload;
    if (!warning_date || !letter_number) {
      const error = new Error('Field warning_date dan letter_number wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_warning_letters').insert({
      employee_id: employeeId,
      warning_date,
      letter_number: letter_number.trim(),
      description: description || null,
      issued_by: issued_by || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_warning_letters').where({ id }).first();
  }

  async updateWarningLetter(id, payload) {
    const existing = await db('employee_warning_letters').where({ id }).first();
    if (!existing) {
      const error = new Error('Surat peringatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = ['warning_date', 'letter_number', 'description', 'issued_by'];
    for (const k of allowed) {
      if (payload[k] !== undefined) updateData[k] = payload[k];
    }

    await db('employee_warning_letters').where({ id }).update(updateData);
    return db('employee_warning_letters').where({ id }).first();
  }

  async deleteWarningLetter(id) {
    const existing = await db('employee_warning_letters').where({ id }).first();
    if (!existing) {
      const error = new Error('Surat peringatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_warning_letters').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 7. Kegiatan Organisasi (employee_organization_activities)
  // ==========================================
  async listOrganizationActivities(employeeId) {
    return db('employee_organization_activities')
      .where({ employee_id: employeeId })
      .orderBy('year', 'desc')
      .orderBy('id', 'desc');
  }

  async createOrganizationActivity(employeeId, payload) {
    const { organization_name, position, year } = payload;
    if (!organization_name) {
      const error = new Error('Field organization_name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_organization_activities').insert({
      employee_id: employeeId,
      organization_name: organization_name.trim(),
      position: position || null,
      year: year || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_organization_activities').where({ id }).first();
  }

  async updateOrganizationActivity(id, payload) {
    const existing = await db('employee_organization_activities').where({ id }).first();
    if (!existing) {
      const error = new Error('Data kegiatan organisasi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    const allowed = ['organization_name', 'position', 'year'];
    for (const k of allowed) {
      if (payload[k] !== undefined) updateData[k] = payload[k];
    }

    await db('employee_organization_activities').where({ id }).update(updateData);
    return db('employee_organization_activities').where({ id }).first();
  }

  async deleteOrganizationActivity(id) {
    const existing = await db('employee_organization_activities').where({ id }).first();
    if (!existing) {
      const error = new Error('Data kegiatan organisasi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_organization_activities').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 8. Kelengkapan Berkas (employee_document_checklists)
  // ==========================================
  async listDocumentChecklists(employeeId) {
    const existing = await db('employee_document_checklists')
      .where({ employee_id: employeeId })
      .orderBy('id', 'asc');

    // Auto-seed default standard documents if list is empty
    if (existing.length === 0) {
      const rows = DEFAULT_DOCUMENTS.map((docName) => ({
        employee_id: employeeId,
        document_name: docName,
        status: 'not_available',
        created_at: new Date(),
        updated_at: new Date()
      }));
      await db('employee_document_checklists').insert(rows);
      return db('employee_document_checklists').where({ employee_id: employeeId }).orderBy('id', 'asc');
    }

    return existing;
  }

  async createDocumentChecklist(employeeId, payload) {
    const { document_name, status, file_url, notes } = payload;
    if (!document_name) {
      const error = new Error('Field document_name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('employee_document_checklists')
      .where({ employee_id: employeeId, document_name: document_name.trim() })
      .first();

    if (existing) {
      const error = new Error(`Item berkas '${document_name}' sudah ada`);
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('employee_document_checklists').insert({
      employee_id: employeeId,
      document_name: document_name.trim(),
      status: status || 'not_available',
      file_url: file_url || null,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_document_checklists').where({ id }).first();
  }

  async updateDocumentChecklist(id, payload) {
    const existing = await db('employee_document_checklists').where({ id }).first();
    if (!existing) {
      const error = new Error('Item checklist berkas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.document_name) updateData.document_name = payload.document_name.trim();
    if (payload.status) updateData.status = payload.status;
    if (payload.file_url !== undefined) updateData.file_url = payload.file_url;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    await db('employee_document_checklists').where({ id }).update(updateData);
    return db('employee_document_checklists').where({ id }).first();
  }

  async deleteDocumentChecklist(id) {
    const existing = await db('employee_document_checklists').where({ id }).first();
    if (!existing) {
      const error = new Error('Item checklist berkas tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_document_checklists').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 9. Data Rekening Bank (employee_bank_accounts - 1:N)
  // ==========================================
  async listBankAccounts(employeeId) {
    return db('employee_bank_accounts')
      .where({ employee_id: employeeId })
      .orderBy('id', 'asc');
  }

  async createBankAccount(employeeId, payload) {
    const { bank_id, bank_name, account_number, account_holder_name } = payload;
    if (!bank_name || !account_number || !account_holder_name) {
      const error = new Error('Field bank_name, account_number, dan account_holder_name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('employee_bank_accounts').insert({
      employee_id: employeeId,
      bank_id: bank_id || null,
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_holder_name: account_holder_name.trim(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_bank_accounts').where({ id }).first();
  }

  async updateBankAccount(id, payload) {
    const existing = await db('employee_bank_accounts').where({ id }).first();
    if (!existing) {
      const error = new Error('Data rekening bank tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.bank_id !== undefined) updateData.bank_id = payload.bank_id;
    if (payload.bank_name) updateData.bank_name = payload.bank_name.trim();
    if (payload.account_number) updateData.account_number = payload.account_number.trim();
    if (payload.account_holder_name) updateData.account_holder_name = payload.account_holder_name.trim();

    await db('employee_bank_accounts').where({ id }).update(updateData);
    return db('employee_bank_accounts').where({ id }).first();
  }

  async deleteBankAccount(id) {
    const existing = await db('employee_bank_accounts').where({ id }).first();
    if (!existing) {
      const error = new Error('Data rekening bank tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_bank_accounts').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 10. Rencana Pensiun (employee_retirement_plans - 1:1)
  // ==========================================
  async getRetirementPlan(employeeId) {
    const plan = await db('employee_retirement_plans').where({ employee_id: employeeId }).first();
    return plan || null;
  }

  async upsertRetirementPlan(employeeId, payload) {
    const { retirement_date, retirement_type } = payload;
    if (!retirement_date || !retirement_type) {
      const error = new Error('Field retirement_date dan retirement_type wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('employee_retirement_plans').where({ employee_id: employeeId }).first();

    if (existing) {
      await db('employee_retirement_plans').where({ employee_id: employeeId }).update({
        retirement_date,
        retirement_type: retirement_type.trim(),
        updated_at: db.fn.now()
      });
    } else {
      await db('employee_retirement_plans').insert({
        employee_id: employeeId,
        retirement_date,
        retirement_type: retirement_type.trim(),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    return db('employee_retirement_plans').where({ employee_id: employeeId }).first();
  }

  // ==========================================
  // 11. Riwayat Gaji Pegawai (payroll_items)
  // ==========================================
  async listEmployeePayrollHistory(employeeId) {
    const items = await db('payroll_items')
      .join('payroll_periods', 'payroll_items.payroll_period_id', 'payroll_periods.id')
      .where('payroll_items.employee_id', employeeId)
      .select(
        'payroll_items.*',
        'payroll_periods.period_month',
        'payroll_periods.period_year',
        'payroll_periods.status as period_status',
        'payroll_periods.created_at as period_created_at'
      )
      .orderBy('payroll_periods.period_year', 'desc')
      .orderBy('payroll_periods.period_month', 'desc');

    return items.map((item) => {
      let components = {};
      let deductions = {};
      try {
        components = typeof item.salary_components === 'string' ? JSON.parse(item.salary_components) : (item.salary_components || {});
      } catch (e) {}
      try {
        deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions) : (item.deductions || {});
      } catch (e) {}

      return {
        id: item.id,
        payroll_period_id: item.payroll_period_id,
        period_month: item.period_month,
        period_year: item.period_year,
        period_status: item.period_status,
        date_effective: item.period_created_at ? new Date(item.period_created_at).toISOString().split('T')[0] : `${item.period_year}-${String(item.period_month).padStart(2, '0')}-01`,
        gapok: components.gapok || 0,
        tunjangan_jabatan: components.tunjangan_jabatan || 0,
        tunjangan_kehadiran: components.tunjangan_kehadiran || 0,
        tunjangan_konsumsi: components.tunjangan_konsumsi || 0,
        tunjangan_istri: components.tunjangan_istri || 0,
        tunjangan_anak: components.tunjangan_anak || 0,
        total_salary: item.net_salary || 0,
        salary_components: components,
        deductions: deductions
      };
    });
  }
}

module.exports = new EmployeeDetailsService();
