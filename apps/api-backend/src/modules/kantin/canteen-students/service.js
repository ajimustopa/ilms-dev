const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../../../config/db/kantin');
const { getStudentDisplayInfo } = require('../utils/studentHelper');
const { generateStudentQr, saveQrSvgFile, QR_STORAGE_DIR } = require('../utils/qrCodeGenerator');
const academicInternalService = require('../../akademik/internal/service');
const dailySpendingLimitsService = require('../daily-spending-limits/service');

class CanteenStudentsService {
  async listStudents(schoolUnitId, query = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('canteen_students');
    if (!isAll) {
      q = q.where('school_unit_id', schoolUnitId);
    }

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.search) {
      q = q.where(function() {
        this.where('cached_student_name', 'like', `%${query.search}%`)
            .orWhere('cached_class_group_name', 'like', `%${query.search}%`)
            .orWhere('qr_code', 'like', `%${query.search}%`);
      });
    }

    const students = await q.orderBy('id', 'desc');

    const activeLimit = await dailySpendingLimitsService.getActiveLimit(schoolUnitId);
    const adminLimitVal = activeLimit ? parseFloat(activeLimit.limit_amount) : null;

    const today = new Date().toISOString().slice(0, 10);
    const todaySpentRows = await db('sales_transactions')
      .where(function() {
        this.whereNull('status').orWhere('status', '!=', 'void');
      })
      .whereRaw('DATE(transaction_at) = ?', [today])
      .groupBy('canteen_student_id')
      .select('canteen_student_id', db.raw('SUM(total_amount) as total_spent'));

    const spentMap = new Map();
    todaySpentRows.forEach(row => {
      spentMap.set(Number(row.canteen_student_id), parseFloat(row.total_spent) || 0);
    });

    const result = [];
    for (const s of students) {
      const displayInfo = await getStudentDisplayInfo(s.student_id);
      const studentUniversalQr = displayInfo.nipd || displayInfo.nis || (s.qr_code && !s.qr_code.startsWith('QR-CANTIN-') ? s.qr_code : String(s.student_id));
      const filename = `canteen-student-${s.student_id}.svg`;
      const filePath = path.join(QR_STORAGE_DIR, filename);

      // Pastikan qr_code di DB sudah bersih dari prefix lama jika ada
      let currentQr = s.qr_code;
      if (!currentQr || currentQr.startsWith('QR-CANTIN-')) {
        currentQr = studentUniversalQr;
        try {
          await db('canteen_students').where({ id: s.id }).update({ qr_code: currentQr, updated_at: db.fn.now() });
        } catch (e) {}
      }

      // Jika file gambar belum ada di server disk, buat otomatis
      if (!fs.existsSync(filePath)) {
        try {
          generateStudentQr(s.student_id, displayInfo.nipd || displayInfo.nis, currentQr);
        } catch (e) {
          // Abaikan jika ada error pembuatan file
        }
      }

      let svgContent = null;
      if (fs.existsSync(filePath)) {
        try {
          svgContent = fs.readFileSync(filePath, 'utf8');
        } catch (e) {}
      }

      const customLimitVal = (s.custom_daily_limit !== null && s.custom_daily_limit !== undefined)
        ? parseFloat(s.custom_daily_limit)
        : null;

      let effectiveLimit = null;
      let limitSource = 'none';
      if (adminLimitVal !== null && customLimitVal !== null) {
        effectiveLimit = Math.min(adminLimitVal, customLimitVal);
        limitSource = adminLimitVal <= customLimitVal ? 'global' : 'custom';
      } else if (adminLimitVal !== null) {
        effectiveLimit = adminLimitVal;
        limitSource = 'global';
      } else if (customLimitVal !== null) {
        effectiveLimit = customLimitVal;
        limitSource = 'custom';
      }

      const studentTodaySpent = spentMap.get(Number(s.id)) || 0;
      const remainingLimit = effectiveLimit !== null ? Math.max(0, effectiveLimit - studentTodaySpent) : null;

      result.push({
        id: s.id,
        student_id: s.student_id,
        school_unit_id: s.school_unit_id,
        student_name: displayInfo.student_name,
        class_group_name: displayInfo.class_group_name,
        cohort_name: displayInfo.cohort_name || '-',
        nis: displayInfo.nis || null,
        nipd: displayInfo.nipd || displayInfo.nis || null,
        academic_status: displayInfo.academic_status,
        academic_status_label: displayInfo.academic_status_label,
        is_active_ta: displayInfo.is_active_ta,
        active_academic_year_name: displayInfo.active_academic_year_name,
        qr_code: currentQr,
        qr_image_url: `/uploads/canteen-qr/${filename}`,
        svg_content: svgContent,
        wallet_balance: parseFloat(s.wallet_balance),
        custom_daily_limit: customLimitVal,
        global_daily_limit: adminLimitVal,
        daily_spending_limit: effectiveLimit,
        effective_daily_limit: effectiveLimit,
        today_spent: studentTodaySpent,
        remaining_daily_limit: remainingLimit,
        limit_source: limitSource,
        has_daily_limit: Boolean(effectiveLimit !== null),
        is_blocked_by_parent: Boolean(s.is_blocked_by_parent),
        status: s.status,
        status_note: s.status_note
      });
    }

    let filtered = result;

    if (query.cohort_name && query.cohort_name !== 'all') {
      filtered = filtered.filter(r => r.cohort_name === query.cohort_name);
    }

    if (query.academic_status && query.academic_status !== 'all') {
      if (query.academic_status === 'aktif_ta') {
        filtered = filtered.filter(r => r.is_active_ta);
      } else if (query.academic_status === 'lulus') {
        filtered = filtered.filter(r => r.academic_status === 'lulus');
      } else if (query.academic_status === 'pindah') {
        filtered = filtered.filter(r => r.academic_status === 'pindah' || r.academic_status === 'keluar');
      } else if (query.academic_status === 'non_aktif_ta') {
        filtered = filtered.filter(r => !r.is_active_ta);
      }
    }

    return filtered;
  }

  async getStudentByStudentId(schoolUnitId, studentId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('canteen_students').where({ student_id: studentId });
    if (!isAll) {
      q = q.where({ school_unit_id: schoolUnitId });
    }
    const s = await q.first();

    if (!s) return null;

    const displayInfo = await getStudentDisplayInfo(studentId);
    const studentUniversalQr = displayInfo.nipd || displayInfo.nis || (s.qr_code && !s.qr_code.startsWith('QR-CANTIN-') ? s.qr_code : String(studentId));
    const filename = `canteen-student-${studentId}.svg`;
    const filePath = path.join(QR_STORAGE_DIR, filename);

    let currentQr = s.qr_code;
    if (!currentQr || currentQr.startsWith('QR-CANTIN-')) {
      currentQr = studentUniversalQr;
      try {
        await db('canteen_students').where({ id: s.id }).update({ qr_code: currentQr, updated_at: db.fn.now() });
      } catch (e) {}
    }

    let svgContent = null;
    if (!fs.existsSync(filePath)) {
      try {
        const generated = generateStudentQr(studentId, displayInfo.nipd || displayInfo.nis, currentQr);
        svgContent = generated.svg_content;
      } catch (e) {}
    } else {
      try {
        svgContent = fs.readFileSync(filePath, 'utf8');
      } catch (e) {}
    }

    const activeLimit = await dailySpendingLimitsService.getActiveLimit(schoolUnitId);
    const adminLimitVal = activeLimit ? parseFloat(activeLimit.limit_amount) : null;
    const customLimitVal = (s.custom_daily_limit !== null && s.custom_daily_limit !== undefined)
      ? parseFloat(s.custom_daily_limit)
      : null;

    let effectiveLimit = null;
    let limitSource = 'none';
    if (adminLimitVal !== null && customLimitVal !== null) {
      effectiveLimit = Math.min(adminLimitVal, customLimitVal);
      limitSource = adminLimitVal <= customLimitVal ? 'global' : 'custom';
    } else if (adminLimitVal !== null) {
      effectiveLimit = adminLimitVal;
      limitSource = 'global';
    } else if (customLimitVal !== null) {
      effectiveLimit = customLimitVal;
      limitSource = 'custom';
    }

    const today = new Date().toISOString().slice(0, 10);
    const spentRow = await db('sales_transactions')
      .where({ canteen_student_id: s.id })
      .where(function() {
        this.whereNull('status').orWhere('status', '!=', 'void');
      })
      .whereRaw('DATE(transaction_at) = ?', [today])
      .sum('total_amount as total_spent')
      .first();

    const studentTodaySpent = spentRow?.total_spent ? parseFloat(spentRow.total_spent) : 0;
    const remainingLimit = effectiveLimit !== null ? Math.max(0, effectiveLimit - studentTodaySpent) : null;

    return {
      id: s.id,
      student_id: s.student_id,
      school_unit_id: s.school_unit_id,
      student_name: displayInfo.student_name,
      class_group_name: displayInfo.class_group_name,
      cohort_name: displayInfo.cohort_name || '-',
      nis: displayInfo.nis || null,
      nipd: displayInfo.nipd || displayInfo.nis || null,
      academic_status: displayInfo.academic_status,
      academic_status_label: displayInfo.academic_status_label,
      is_active_ta: displayInfo.is_active_ta,
      active_academic_year_name: displayInfo.active_academic_year_name,
      qr_code: currentQr,
      qr_image_url: `/uploads/canteen-qr/${filename}`,
      svg_content: svgContent,
      wallet_balance: parseFloat(s.wallet_balance),
      custom_daily_limit: customLimitVal,
      global_daily_limit: adminLimitVal,
      daily_spending_limit: effectiveLimit,
      effective_daily_limit: effectiveLimit,
      today_spent: studentTodaySpent,
      remaining_daily_limit: remainingLimit,
      limit_source: limitSource,
      has_daily_limit: Boolean(effectiveLimit !== null),
      is_blocked_by_parent: Boolean(s.is_blocked_by_parent),
      has_child_pin: Boolean(s.child_pin_hash),
      has_parent_pin: Boolean(s.parent_pin_hash),
      status: s.status,
      status_note: s.status_note
    };
  }

  async ensureCanteenStudentRecord(schoolUnitId, studentId) {
    let s = await db('canteen_students').where({ student_id: studentId }).first();
    if (!s) {
      const displayInfo = await getStudentDisplayInfo(studentId);
      const defaultQr = displayInfo.nipd || displayInfo.nis || String(studentId);
      const defaultPinHash = await bcrypt.hash('123456', 10);
      const effectiveUnitId = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' ? schoolUnitId : 1;

      // Buat file gambar QR di storage server
      try {
        generateStudentQr(studentId, displayInfo.nipd || displayInfo.nis, defaultQr);
      } catch (e) {}

      const [id] = await db('canteen_students').insert({
        school_unit_id: effectiveUnitId,
        student_id: studentId,
        cached_student_name: displayInfo.student_name,
        cached_class_group_name: displayInfo.class_group_name,
        qr_code: defaultQr,
        wallet_balance: 0,
        child_pin_hash: defaultPinHash,
        parent_pin_hash: defaultPinHash,
        status: 'active'
      });

      s = await db('canteen_students').where({ id }).first();
    }
    return s;
  }

  async updateStatus(schoolUnitId, studentId, payload) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    const { status, status_note = null } = payload;

    await db('canteen_students')
      .where({ id: s.id })
      .update({
        status,
        status_note,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return this.getStudentByStudentId(schoolUnitId, studentId);
  }

  async generateQr(schoolUnitId, studentId) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    const displayInfo = await getStudentDisplayInfo(studentId);

    // Generate teks QR (NIPD siswa secara universal) dan file SVG gambar
    const qrResult = generateStudentQr(studentId, displayInfo.nipd || displayInfo.nis);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ qr_code: qrResult.qr_code, updated_at: db.fn.now() });

    const updated = await this.getStudentByStudentId(schoolUnitId, studentId);
    return {
      ...updated,
      file_path: qrResult.file_path,
      file_url: qrResult.file_url,
      svg_content: qrResult.svg_content
    };
  }

  async bulkGenerateQr(schoolUnitId, payload = {}) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let q = db('canteen_students');
    if (!isAll) {
      q = q.where('school_unit_id', schoolUnitId);
    }

    const students = await q;
    let generatedCount = 0;

    for (const s of students) {
      try {
        const displayInfo = await getStudentDisplayInfo(s.student_id);
        const qrCode = displayInfo.nipd || displayInfo.nis || (s.qr_code && !s.qr_code.startsWith('QR-CANTIN-') ? s.qr_code : String(s.student_id));
        const qrResult = generateStudentQr(s.student_id, displayInfo.nipd || displayInfo.nis, qrCode);

        await db('canteen_students')
          .where({ id: s.id })
          .update({
            qr_code: qrResult.qr_code,
            updated_at: db.fn.now()
          });

        generatedCount++;
      } catch (err) {
        console.error(`[Bulk QR] Gagal generate QR untuk santri ID ${s.student_id}:`, err.message);
      }
    }

    return {
      total_students: students.length,
      total_generated: generatedCount,
      message: `Berhasil men-generate ${generatedCount} gambar QR santri (menggunakan NIPD) ke folder penyimpanan server.`
    };
  }

  async updateQr(schoolUnitId, studentId, qrCode) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);

    // Generate file SVG dengan kode baru
    generateStudentQr(studentId, null, qrCode);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ qr_code: qrCode, updated_at: db.fn.now() });

    return this.getStudentByStudentId(schoolUnitId, studentId);
  }

  async resetChildPin(schoolUnitId, studentId) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    // Generate 6 digit random PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = await bcrypt.hash(newPin, 10);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ child_pin_hash: pinHash, updated_at: db.fn.now() });

    return {
      student_id: Number(studentId),
      new_pin: newPin,
      message: 'PIN anak berhasil di-reset'
    };
  }

  async resetParentPin(schoolUnitId, studentId) {
    const s = await this.ensureCanteenStudentRecord(schoolUnitId, studentId);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinHash = await bcrypt.hash(newPin, 10);

    await db('canteen_students')
      .where({ id: s.id })
      .update({ parent_pin_hash: pinHash, updated_at: db.fn.now() });

    return {
      student_id: Number(studentId),
      new_pin: newPin,
      message: 'PIN orangtua berhasil di-reset'
    };
  }

  async syncFromAcademic(schoolUnitId) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const activeStudents = await academicInternalService.listActiveStudents({
      satuan_pendidikan_id: isAll ? null : schoolUnitId,
      include_all: true
    });

    if (!activeStudents || activeStudents.length === 0) {
      return {
        total_synced: 0,
        inserted: 0,
        updated: 0,
        message: 'Tidak ada data santri ditemukan di Modul Akademik'
      };
    }

    let inserted = 0;
    let updated = 0;
    const defaultPinHash = await bcrypt.hash('123456', 10);

    for (const student of activeStudents) {
      const studentId = Number(student.id);
      const displayInfo = await getStudentDisplayInfo(studentId);
      const targetUnitId = student.satuan_pendidikan_id || (schoolUnitId && !isAll ? schoolUnitId : 1);
      const universalQr = student.nipd || student.nis || displayInfo.nipd || displayInfo.nis || String(studentId);

      const existing = await db('canteen_students')
        .where({ student_id: studentId })
        .first();

      if (existing) {
        const updateData = {
          school_unit_id: targetUnitId,
          cached_student_name: displayInfo.student_name,
          cached_class_group_name: displayInfo.class_group_name,
          updated_at: db.fn.now()
        };
        if (!existing.qr_code || existing.qr_code.startsWith('QR-CANTIN-')) {
          updateData.qr_code = universalQr;
        }
        await db('canteen_students')
          .where({ id: existing.id })
          .update(updateData);
        updated++;
      } else {
        await db('canteen_students').insert({
          school_unit_id: targetUnitId,
          student_id: studentId,
          cached_student_name: displayInfo.student_name,
          cached_class_group_name: displayInfo.class_group_name,
          qr_code: universalQr,
          wallet_balance: 0,
          child_pin_hash: defaultPinHash,
          parent_pin_hash: defaultPinHash,
          status: 'active'
        });
        inserted++;
      }

      // Pastikan SVG file diperbarui
      try {
        generateStudentQr(studentId, universalQr);
      } catch (e) {}
    }

    return {
      total_synced: activeStudents.length,
      inserted,
      updated,
      message: `Berhasil menyinkronkan ${activeStudents.length} santri dari Akademik (${inserted} baru, ${updated} diperbarui)`
    };
  }
}

module.exports = new CanteenStudentsService();
