/**
 * Fee Schemes & Student Fee Assignments Service for Keuangan Module
 * apps/api-backend/src/modules/keuangan/schemes/service.js
 * 
 * Mengelola Template Skema Biaya Pendidikan (fee_schemes, fee_scheme_items)
 * dan Penetapan Biaya Siswa (student_fee_scheme_assignments).
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const crossModuleServices = require('../common/crossModuleServices');

const isUnit = (id) => id && id !== 'all' && id !== 'foundation' && id !== 'null';

class FeeSchemesService {
  // ============================================================
  // 1. FEE SCHEMES (Template Skema Biaya)
  // ============================================================

  async listFeeSchemes(schoolUnitId, filters = {}) {
    let query = db('fee_schemes');
    if (isUnit(schoolUnitId)) {
      query = query.where('fee_schemes.school_unit_id', schoolUnitId);
    }
    if (filters.academic_year_id && filters.academic_year_id !== 'all') {
      const ayId = Number(filters.academic_year_id);
      let matchedAyIds = [ayId];
      try {
        const refAy = await crossModuleServices.getAcademicYear(ayId);
        if (refAy && refAy.name) {
          const allAys = await crossModuleServices.listAcademicYears();
          allAys.filter(y => y.name === refAy.name).forEach(y => {
            if (!matchedAyIds.includes(y.id)) matchedAyIds.push(y.id);
          });
        }
      } catch (e) {}
      query = query.whereIn('fee_schemes.academic_year_id', matchedAyIds);
    }
    if (filters.is_active !== undefined) {
      const isActive = filters.is_active === 'true' || filters.is_active === true;
      query = query.where('fee_schemes.is_active', isActive);
    }

    const schemes = await query.orderBy('fee_schemes.id', 'desc');

    // Enrich with item count and assigned student count
    return Promise.all(schemes.map(async (s) => {
      const items = await db('fee_scheme_items')
        .join('fee_types', 'fee_scheme_items.fee_type_id', 'fee_types.id')
        .where('fee_scheme_items.fee_scheme_id', s.id)
        .select(
          'fee_scheme_items.*',
          'fee_types.name as fee_type_name',
          'fee_types.billing_pattern'
        );

      const assignedCount = await db('student_fee_scheme_assignments')
        .where({ fee_scheme_id: s.id, is_custom: false })
        .count('id as total')
        .first();

      let totalAmount = 0;
      let monthlyAmount = 0;
      let nonMonthlyAmount = 0;

      items.forEach((it) => {
        if (it.value_type === 'fixed_amount') {
          const val = parseFloat(it.value) || 0;
          totalAmount += val;
          if (it.billing_pattern === 'monthly') {
            monthlyAmount += val;
          } else {
            nonMonthlyAmount += val;
          }
        }
      });

      let academicYearName = `T.A. ${s.academic_year_id}`;
      try {
        const ay = await crossModuleServices.getAcademicYear(s.academic_year_id);
        if (ay?.name) academicYearName = ay.name;
      } catch (e) {
        // fallback
      }

      return {
        ...s,
        academic_year_name: academicYearName,
        items_count: items.length,
        assigned_students_count: parseInt(assignedCount?.total || 0, 10),
        total_amount: totalAmount,
        monthly_amount: monthlyAmount,
        non_monthly_amount: nonMonthlyAmount,
        items
      };
    }));
  }

  async getFeeSchemeById(schoolUnitId, id, trx = null) {
    const conn = trx || db;
    let query = conn('fee_schemes').where('fee_schemes.id', id);
    if (isUnit(schoolUnitId)) {
      query = query.where('fee_schemes.school_unit_id', schoolUnitId);
    }
    const scheme = await query.first();
    if (!scheme) return null;

    const items = await conn('fee_scheme_items')
      .join('fee_types', 'fee_scheme_items.fee_type_id', 'fee_types.id')
      .where('fee_scheme_items.fee_scheme_id', scheme.id)
      .select(
        'fee_scheme_items.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

    const assignedCount = await conn('student_fee_scheme_assignments')
      .where({ fee_scheme_id: scheme.id, is_custom: false })
      .count('id as total')
      .first();

    let totalAmount = 0;
    let monthlyAmount = 0;
    let nonMonthlyAmount = 0;

    items.forEach((it) => {
      if (it.value_type === 'fixed_amount') {
        const val = parseFloat(it.value) || 0;
        totalAmount += val;
        if (it.billing_pattern === 'monthly') {
          monthlyAmount += val;
        } else {
          nonMonthlyAmount += val;
        }
      }
    });

    return {
      ...scheme,
      items,
      total_amount: totalAmount,
      monthly_amount: monthlyAmount,
      non_monthly_amount: nonMonthlyAmount,
      assigned_students_count: parseInt(assignedCount?.total || 0, 10)
    };
  }

  async createFeeScheme(schoolUnitId, data, userId = null) {
    const { academic_year_id, code, name, description, items = [] } = data;
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);

    return db.transaction(async (trx) => {
      // 1. Insert header skema
      const [schemeId] = await trx('fee_schemes').insert({
        school_unit_id: targetUnit,
        academic_year_id: academic_year_id || 1,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description || null,
        is_active: true
      });

      const actualId = schemeId || (await trx('fee_schemes').where({ school_unit_id: targetUnit, academic_year_id: academic_year_id || 1, code: code.trim().toUpperCase() }).first()).id;

      // 2. Insert items
      if (items && items.length > 0) {
        const rows = items.map((it) => ({
          fee_scheme_id: actualId,
          fee_type_id: it.fee_type_id,
          value_type: it.value_type || 'fixed_amount',
          value: parseFloat(it.value || 0)
        }));
        await trx('fee_scheme_items').insert(rows);
      }

      const created = await this.getFeeSchemeById(targetUnit, actualId, trx);

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: 'CREATE_FEE_SCHEME',
        entityType: 'fee_scheme',
        entityId: actualId,
        dataAfter: created,
        trx
      });

      return created;
    });
  }

  async updateFeeScheme(schoolUnitId, id, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getFeeSchemeById(targetUnit, id);
    if (!before) return null;

    const { code, name, description, academic_year_id, items } = data;

    return db.transaction(async (trx) => {
      await trx('fee_schemes')
        .where({ id })
        .update({
          code: code ? code.trim().toUpperCase() : before.code,
          name: name ? name.trim() : before.name,
          description: description !== undefined ? description : before.description,
          academic_year_id: academic_year_id || before.academic_year_id
        });

      // Sync items if provided
      if (items && Array.isArray(items)) {
        await trx('fee_scheme_items').where({ fee_scheme_id: id }).delete();
        if (items.length > 0) {
          const rows = items.map((it) => ({
            fee_scheme_id: id,
            fee_type_id: it.fee_type_id,
            value_type: it.value_type || 'fixed_amount',
            value: parseFloat(it.value || 0)
          }));
          await trx('fee_scheme_items').insert(rows);
        }
      }

      const updated = await this.getFeeSchemeById(targetUnit, id, trx);

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: 'UPDATE_FEE_SCHEME',
        entityType: 'fee_scheme',
        entityId: id,
        dataBefore: before,
        dataAfter: { ...updated, edit_reason: data.edit_reason || data.reason || null },
        trx
      });

      return updated;
    });
  }

  async toggleFeeSchemeStatus(schoolUnitId, id, isActive, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getFeeSchemeById(targetUnit, id);
    if (!before) return null;

    await db('fee_schemes')
      .where({ id })
      .update({ is_active: isActive });

    const updated = await this.getFeeSchemeById(targetUnit, id);

    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: isActive ? 'ACTIVATE_FEE_SCHEME' : 'DEACTIVATE_FEE_SCHEME',
      entityType: 'fee_scheme',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });

    return updated;
  }

  async duplicateFeeSchemes(schoolUnitId, data, userId = null) {
    const {
      source_academic_year_id,
      target_academic_year_id,
      scheme_ids = [],
      adjustment_percentage = 0,
      copy_mode = 'create_copy' // 'create_copy' | 'skip_existing' | 'overwrite_existing'
    } = data;

    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);

    if (!source_academic_year_id || !target_academic_year_id) {
      const err = new Error('Tahun Ajaran Asal dan Tahun Ajaran Tujuan wajib ditentukan');
      err.statusCode = 400;
      throw err;
    }

    if (String(source_academic_year_id) === String(target_academic_year_id) && copy_mode === 'overwrite_existing') {
      const err = new Error('Duplikasi pada Tahun Ajaran yang sama tidak dapat menggunakan mode timpa (overwrite)');
      err.statusCode = 400;
      throw err;
    }

    // 1. Ambil skema sumber
    let sourceQuery = db('fee_schemes')
      .where('academic_year_id', Number(source_academic_year_id));
    if (isUnit(targetUnit)) {
      sourceQuery = sourceQuery.where('school_unit_id', targetUnit);
    }
    if (scheme_ids && scheme_ids.length > 0) {
      sourceQuery = sourceQuery.whereIn('id', scheme_ids);
    }

    const sourceSchemes = await sourceQuery;
    if (sourceSchemes.length === 0) {
      const err = new Error('Tidak ada skema biaya yang ditemukan pada Tahun Ajaran Asal');
      err.statusCode = 404;
      throw err;
    }

    // 2. Ambil skema yang sudah ada di target academic year untuk deteksi duplikasi
    let targetExistingQuery = db('fee_schemes')
      .where('academic_year_id', Number(target_academic_year_id));
    if (isUnit(targetUnit)) {
      targetExistingQuery = targetExistingQuery.where('school_unit_id', targetUnit);
    }
    const existingTargetSchemes = await targetExistingQuery;
    const existingCodeMap = new Map();
    existingTargetSchemes.forEach(s => existingCodeMap.set(s.code.toUpperCase(), s));

    const rateMultiplier = 1 + (parseFloat(adjustment_percentage || 0) / 100);

    return db.transaction(async (trx) => {
      const duplicatedResults = [];

      for (const src of sourceSchemes) {
        const srcItems = await trx('fee_scheme_items')
          .where('fee_scheme_id', src.id);

        let targetCode = src.code.trim().toUpperCase();
        let targetName = src.name.trim();

        const existingMatch = existingCodeMap.get(targetCode);

        if (existingMatch) {
          if (copy_mode === 'skip_existing') {
            continue;
          } else if (copy_mode === 'overwrite_existing') {
            await trx('fee_scheme_items').where({ fee_scheme_id: existingMatch.id }).delete();
            
            const newItems = srcItems.map(it => {
              let val = parseFloat(it.value || 0);
              if (it.value_type === 'fixed_amount' && parseFloat(adjustment_percentage || 0) !== 0) {
                val = Math.round(val * rateMultiplier);
              }
              return {
                fee_scheme_id: existingMatch.id,
                fee_type_id: it.fee_type_id,
                value_type: it.value_type,
                value: val
              };
            });

            if (newItems.length > 0) {
              await trx('fee_scheme_items').insert(newItems);
            }

            await trx('fee_schemes').where({ id: existingMatch.id }).update({
              name: targetName,
              description: src.description ? `(Salinan dari TA ${source_academic_year_id}) ${src.description}` : `Salinan dari TA ${source_academic_year_id}`,
              is_active: true,
              updated_at: trx.fn.now()
            });

            duplicatedResults.push({ id: existingMatch.id, code: targetCode, name: targetName, mode: 'overwritten' });
            continue;
          } else {
            let counter = 1;
            while (existingCodeMap.has(`${targetCode}_SALINAN${counter}`)) {
              counter++;
            }
            targetCode = `${targetCode}_SALINAN${counter}`;
            targetName = `${targetName} (Salinan ${counter})`;
          }
        }

        const [newSchemeId] = await trx('fee_schemes').insert({
          school_unit_id: targetUnit,
          academic_year_id: Number(target_academic_year_id),
          code: targetCode,
          name: targetName,
          description: src.description ? `(Salinan dari TA ${source_academic_year_id}) ${src.description}` : `Salinan dari TA ${source_academic_year_id}`,
          is_active: true,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

        const actualId = newSchemeId || (await trx('fee_schemes').where({ school_unit_id: targetUnit, academic_year_id: Number(target_academic_year_id), code: targetCode }).first()).id;

        if (srcItems.length > 0) {
          const newItems = srcItems.map(it => {
            let val = parseFloat(it.value || 0);
            if (it.value_type === 'fixed_amount' && parseFloat(adjustment_percentage || 0) !== 0) {
              val = Math.round(val * rateMultiplier);
            }
            return {
              fee_scheme_id: actualId,
              fee_type_id: it.fee_type_id,
              value_type: it.value_type,
              value: val
            };
          });
          await trx('fee_scheme_items').insert(newItems);
        }

        existingCodeMap.set(targetCode, { id: actualId, code: targetCode });
        duplicatedResults.push({ id: actualId, code: targetCode, name: targetName, mode: 'created' });
      }

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: 'DUPLICATE_FEE_SCHEMES',
        entityType: 'fee_scheme',
        entityId: duplicatedResults[0]?.id || null,
        dataBefore: { source_academic_year_id, total_source_schemes: sourceSchemes.length },
        dataAfter: {
          target_academic_year_id,
          total_duplicated: duplicatedResults.length,
          adjustment_percentage,
          copy_mode,
          results: duplicatedResults
        },
        trx
      });

      return {
        message: `Berhasil menduplikat ${duplicatedResults.length} skema biaya ke Tahun Ajaran sasaran`,
        duplicated_count: duplicatedResults.length,
        results: duplicatedResults
      };
    });
  }

  // ============================================================
  // 2. STUDENT FEE SCHEME ASSIGNMENTS (Penetapan Biaya Siswa)
  // ============================================================

  async listStudentAssignments(schoolUnitId, filters = {}) {
    const { academic_year_id = 1, class_id = null, fee_scheme_id = null, is_custom = null, search = '' } = filters;
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : null;

    // 1. Ambil daftar siswa dari modul Akademik sesuai konteks Tahun Ajaran (mencakup riwayat historis lampau)
    let students = await crossModuleServices.getStudentsByAcademicYear(targetUnit, {
      academic_year_id,
      class_id,
      search
    });

    // 2. Ambil seluruh data assignments untuk academic_year_id tersebut
    let asgQuery = db('student_fee_scheme_assignments')
      .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
      .select(
        'student_fee_scheme_assignments.*',
        'fee_schemes.code as scheme_code',
        'fee_schemes.name as scheme_name',
        'fee_schemes.description as scheme_description'
      );

    if (targetUnit) {
      asgQuery = asgQuery.where('student_fee_scheme_assignments.school_unit_id', targetUnit);
    }
    if (academic_year_id && academic_year_id !== 'all') {
      const ayId = Number(academic_year_id);
      let matchedAyIds = [ayId];
      try {
        const refAy = await crossModuleServices.getAcademicYear(ayId);
        if (refAy && refAy.name) {
          const allAys = await crossModuleServices.listAcademicYears();
          allAys.filter(y => y.name === refAy.name).forEach(y => {
            if (!matchedAyIds.includes(y.id)) matchedAyIds.push(y.id);
          });
        }
      } catch (e) {}
      asgQuery = asgQuery.whereIn('student_fee_scheme_assignments.academic_year_id', matchedAyIds);
    }

    const assignments = await asgQuery;

    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.student_id] = a;
    });

    // 3. Ambil seluruh custom adjustments aktif jika ada
    let adjQuery = db('student_fee_adjustments')
      .join('fee_types', 'student_fee_adjustments.fee_type_id', 'fee_types.id')
      .select(
        'student_fee_adjustments.*',
        'fee_types.name as fee_type_name'
      );

    if (targetUnit) {
      adjQuery = adjQuery.where('student_fee_adjustments.school_unit_id', targetUnit);
    }

    const adjustments = await adjQuery;

    const adjustmentMap = {};
    adjustments.forEach(adj => {
      if (!adjustmentMap[adj.student_id]) adjustmentMap[adj.student_id] = [];
      adjustmentMap[adj.student_id].push(adj);
    });

    // 4. Siapkan skema items map untuk perhitungan breakdown
    const schemeIds = [...new Set(assignments.map(a => a.fee_scheme_id).filter(Boolean))];
    let schemeItemsMap = {};
    if (schemeIds.length > 0) {
      const allSchemeItems = await db('fee_scheme_items')
        .whereIn('fee_scheme_id', schemeIds);
      allSchemeItems.forEach(item => {
        if (!schemeItemsMap[item.fee_scheme_id]) schemeItemsMap[item.fee_scheme_id] = {};
        schemeItemsMap[item.fee_scheme_id][item.fee_type_id] = item;
      });
    }

    // 5. Cari fee_type untuk Tunggakan Tahun Ajaran Sebelumnya & hitung sisa tunggakan dari tahun ajaran lampau
    const arrearsFeeType = await db('fee_types')
      .where(function() {
        this.where('code', 'arrears_previous_year')
          .orWhereRaw("LOWER(name) LIKE '%tunggakan%'");
      })
      .first();
    const arrearsFtId = arrearsFeeType ? arrearsFeeType.id : 11;

    let studentArrearsMap = {};
    try {
      const allAys = await crossModuleServices.listAcademicYears();
      const currentAy = allAys.find(y => y.id === Number(academic_year_id));
      let prevAyIds = [];
      if (currentAy) {
        prevAyIds = allAys
          .filter(y => {
            if (currentAy.start_date && y.start_date) {
              return new Date(y.start_date) < new Date(currentAy.start_date);
            }
            return Number(y.id) < Number(currentAy.id);
          })
          .map(y => y.id);
      } else if (academic_year_id && academic_year_id !== 'all') {
        prevAyIds = allAys
          .filter(y => Number(y.id) < Number(academic_year_id))
          .map(y => y.id);
      }

      const studentIds = students.map(s => s.id);
      if (studentIds.length > 0 && prevAyIds.length > 0) {
        let arrearsQuery = db('student_bills')
          .whereIn('student_id', studentIds)
          .whereIn('academic_year_id', prevAyIds)
          .whereIn('status', ['unpaid', 'partially_paid', 'draft'])
          .groupBy('student_id')
          .select('student_id', db.raw('SUM(amount - paid_amount) as total_arrears'));

        if (targetUnit) {
          arrearsQuery = arrearsQuery.where('school_unit_id', targetUnit);
        }

        const arrearsRows = await arrearsQuery;
        arrearsRows.forEach(r => {
          studentArrearsMap[r.student_id] = parseFloat(r.total_arrears || 0);
        });
      }
    } catch (e) {
      console.error('Error fetching student previous arrears:', e);
    }

    // 6. Gabungkan dan filter
    let results = students.map(st => {
      const asg = assignmentMap[st.id] || null;
      const customItems = adjustmentMap[st.id] || [];

      // Hitung rincian nominal fee per fee_type
      const feeBreakdown = {};
      let totalAssignedAmount = 0;

      const studentSchemeItems = asg?.fee_scheme_id ? (schemeItemsMap[asg.fee_scheme_id] || {}) : {};
      const customItemsByFeeType = {};
      customItems.forEach(ci => {
        customItemsByFeeType[ci.fee_type_id] = ci;
      });

      // Hitung untuk setiap pos biaya yang terdaftar pada skema atau adjustment
      const allFeeTypeIds = new Set([
        ...Object.keys(studentSchemeItems),
        ...Object.keys(customItemsByFeeType)
      ]);

      const autoArrears = studentArrearsMap[st.id] || 0;
      const hasManualArrears = customItemsByFeeType[arrearsFtId] !== undefined;

      if (autoArrears > 0 && arrearsFtId) {
        allFeeTypeIds.add(String(arrearsFtId));
      }

      allFeeTypeIds.forEach(ftId => {
        const sItem = studentSchemeItems[ftId];
        const cItem = customItemsByFeeType[ftId];
        const isArrearsPos = String(ftId) === String(arrearsFtId);

        let baseAmount = sItem ? parseFloat(sItem.value || 0) : 0;
        let finalAmount = baseAmount;
        let note = '';
        let isAutoArrears = false;

        if (cItem) {
          if (cItem.adjustment_kind === 'override_amount') {
            finalAmount = parseFloat(cItem.override_amount || 0);
            note = 'Override';
          } else if (cItem.adjustment_kind === 'waiver') {
            const pct = parseFloat(cItem.waiver_percentage || 0);
            const disc = (baseAmount * pct) / 100;
            finalAmount = Math.max(0, baseAmount - disc);
            note = `Diskon ${pct}%`;
          }
        } else if (isArrearsPos && autoArrears > 0) {
          // Otomatis terisi sisa tunggakan tahun ajaran sebelumnya jika tidak diinput manual
          baseAmount = autoArrears;
          finalAmount = autoArrears;
          isAutoArrears = true;
          note = 'Otomatis Sisa Tunggakan Lalu';
        }

        feeBreakdown[ftId] = {
          base_amount: baseAmount,
          final_amount: finalAmount,
          has_adjustment: Boolean(cItem),
          is_auto_arrears: isAutoArrears,
          adjustment_note: note
        };

        totalAssignedAmount += finalAmount;
      });

      const isTransfer = st.registration_type === 'pindahan' || st.entry_type === 'pindahan' || String(st.registration_type_display || '').toLowerCase().includes('pindah');
      return {
        student_id: st.id,
        student_name: st.full_name,
        nis: st.nis || '-',
        nisn: st.nisn || '-',
        registration_type: isTransfer ? 'pindahan' : 'siswa_baru',
        registration_type_display: isTransfer ? 'Siswa Pindahan' : 'Siswa Baru',
        entry_type: isTransfer ? 'pindahan' : 'reguler',
        is_transfer_student: isTransfer,
        current_grade_level_id: st.current_grade_level_id || st.grade_level_id || 1,
        class_name: st.class_name || '-',
        assignment: asg ? {
          id: asg.id,
          fee_scheme_id: asg.fee_scheme_id,
          scheme_code: asg.scheme_code || null,
          scheme_name: asg.scheme_name || (asg.is_custom ? 'Khusus (Custom)' : 'Belum Ditetapkan'),
          is_custom: Boolean(asg.is_custom),
          assigned_at: asg.assigned_at,
          reason: asg.reason,
          total_amount: totalAssignedAmount,
          fee_breakdown: feeBreakdown,
          previous_data: asg.previous_data ? (typeof asg.previous_data === 'string' ? JSON.parse(asg.previous_data) : asg.previous_data) : null
        } : {
          id: null,
          fee_scheme_id: null,
          scheme_code: null,
          scheme_name: 'Belum Ditetapkan',
          is_custom: false,
          assigned_at: null,
          reason: null,
          total_amount: totalAssignedAmount,
          fee_breakdown: feeBreakdown,
          previous_data: null
        },
        custom_adjustments: customItems
      };
    });

    if (fee_scheme_id) {
      results = results.filter(r => String(r.assignment?.fee_scheme_id) === String(fee_scheme_id));
    }
    if (is_custom !== null && is_custom !== undefined) {
      const customBool = is_custom === 'true' || is_custom === true;
      results = results.filter(r => r.assignment?.is_custom === customBool);
    }
    if (filters.registration_type && filters.registration_type !== 'all') {
      const wantPindahan = filters.registration_type === 'pindahan' || String(filters.registration_type).toLowerCase().includes('pindah');
      results = results.filter(r => (r.registration_type === 'pindahan') === wantPindahan);
    }

    return results;
  }

  async assignSchemeToStudent(schoolUnitId, payload, userId = null) {
    const { student_id, academic_year_id = 1, fee_scheme_id, reason } = payload;
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;

    return db.transaction(async (trx) => {
      const existing = await trx('student_fee_scheme_assignments')
        .where({
          school_unit_id: targetUnit,
          student_id,
          academic_year_id
        })
        .first();

      let assignedRecordId;

      if (existing) {
        if (!reason) {
          const err = new Error('Alasan perubahan skema (reason) wajib diisi saat mengubah penetapan biaya siswa');
          err.statusCode = 422;
          throw err;
        }

        const snapshot = {
          fee_scheme_id: existing.fee_scheme_id,
          is_custom: existing.is_custom,
          assigned_at: existing.assigned_at,
          assigned_by: existing.assigned_by,
          reason: existing.reason
        };

        await trx('student_fee_scheme_assignments')
          .where({ id: existing.id })
          .update({
            fee_scheme_id,
            is_custom: false,
            assigned_by: userId,
            assigned_at: trx.fn.now(),
            previous_data: JSON.stringify(snapshot),
            reason
          });

        assignedRecordId = existing.id;
      } else {
        const [id] = await trx('student_fee_scheme_assignments').insert({
          school_unit_id: targetUnit,
          student_id,
          academic_year_id,
          fee_scheme_id,
          is_custom: false,
          assigned_by: userId,
          assigned_at: trx.fn.now(),
          reason: reason || 'Penetapan awal skema biaya siswa'
        });
        assignedRecordId = id || (await trx('student_fee_scheme_assignments').where({ school_unit_id: targetUnit, student_id, academic_year_id }).first()).id;
      }

      const result = await trx('student_fee_scheme_assignments')
        .leftJoin('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
        .where('student_fee_scheme_assignments.id', assignedRecordId)
        .select('student_fee_scheme_assignments.*', 'fee_schemes.name as scheme_name', 'fee_schemes.code as scheme_code')
        .first();

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: existing ? 'UPDATE_STUDENT_FEE_ASSIGNMENT' : 'CREATE_STUDENT_FEE_ASSIGNMENT',
        entityType: 'student_fee_scheme_assignment',
        entityId: assignedRecordId,
        dataBefore: existing || null,
        dataAfter: result,
        trx
      });

      return result;
    });
  }

  async bulkAssignScheme(schoolUnitId, payload, userId = null) {
    const { student_ids = [], class_id = null, academic_year_id = 1, fee_scheme_id, reason } = payload;
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;

    let targetStudentIds = [...student_ids];
    if (class_id && targetStudentIds.length === 0) {
      const classStudents = await crossModuleServices.getStudentsByClass(class_id, targetUnit);
      targetStudentIds = classStudents.map(s => s.id);
    }

    if (targetStudentIds.length === 0) {
      const err = new Error('Daftar target siswa tidak boleh kosong');
      err.statusCode = 422;
      throw err;
    }

    const assignedResults = [];

    await db.transaction(async (trx) => {
      for (const sId of targetStudentIds) {
        const existing = await trx('student_fee_scheme_assignments')
          .where({
            school_unit_id: targetUnit,
            student_id: sId,
            academic_year_id
          })
          .first();

        if (existing) {
          const snapshot = {
            fee_scheme_id: existing.fee_scheme_id,
            is_custom: existing.is_custom,
            assigned_at: existing.assigned_at,
            assigned_by: existing.assigned_by,
            reason: existing.reason
          };

          await trx('student_fee_scheme_assignments')
            .where({ id: existing.id })
            .update({
              fee_scheme_id,
              is_custom: false,
              assigned_by: userId,
              assigned_at: trx.fn.now(),
              previous_data: JSON.stringify(snapshot),
              reason: reason || 'Penetapan massal skema biaya'
            });
          assignedResults.push(existing.id);
        } else {
          const [newId] = await trx('student_fee_scheme_assignments').insert({
            school_unit_id: targetUnit,
            student_id: sId,
            academic_year_id,
            fee_scheme_id,
            is_custom: false,
            assigned_by: userId,
            assigned_at: trx.fn.now(),
            reason: reason || 'Penetapan massal skema biaya awal'
          });
          assignedResults.push(newId);
        }
      }

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: 'BULK_ASSIGN_STUDENT_FEE_SCHEME',
        entityType: 'student_fee_scheme_assignment',
        dataAfter: {
          fee_scheme_id,
          academic_year_id,
          total_assigned: targetStudentIds.length,
          student_ids: targetStudentIds,
          reason
        },
        trx
      });
    });

    return {
      success: true,
      total_assigned: targetStudentIds.length,
      assigned_student_ids: targetStudentIds
    };
  }

  async assignCustomStudentFee(schoolUnitId, payload, userId = null) {
    const { student_id, academic_year_id = 1, reason, custom_items = [] } = payload;
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;

    return db.transaction(async (trx) => {
      const existing = await trx('student_fee_scheme_assignments')
        .where({
          school_unit_id: targetUnit,
          student_id,
          academic_year_id
        })
        .first();

      let assignmentId;

      if (existing) {
        const snapshot = {
          fee_scheme_id: existing.fee_scheme_id,
          is_custom: existing.is_custom,
          assigned_at: existing.assigned_at,
          assigned_by: existing.assigned_by,
          reason: existing.reason
        };

        await trx('student_fee_scheme_assignments')
          .where({ id: existing.id })
          .update({
            fee_scheme_id: null,
            is_custom: true,
            assigned_by: userId,
            assigned_at: trx.fn.now(),
            previous_data: JSON.stringify(snapshot),
            reason: reason || 'Penetapan penyesuaian khusus (custom)'
          });
        assignmentId = existing.id;
      } else {
        const [newId] = await trx('student_fee_scheme_assignments').insert({
          school_unit_id: targetUnit,
          student_id,
          academic_year_id,
          fee_scheme_id: null,
          is_custom: true,
          assigned_by: userId,
          assigned_at: trx.fn.now(),
          reason: reason || 'Penetapan awal biaya khusus (custom)'
        });
        assignmentId = newId || (await trx('student_fee_scheme_assignments').where({ school_unit_id: targetUnit, student_id, academic_year_id }).first()).id;
      }

      // Sync custom items into student_fee_adjustments
      if (custom_items && Array.isArray(custom_items) && custom_items.length > 0) {
        for (const item of custom_items) {
          const adjExisting = await trx('student_fee_adjustments')
            .where({
              school_unit_id: targetUnit,
              student_id,
              fee_type_id: item.fee_type_id
            })
            .first();

          // Jika override_amount kosong (string kosong / null / undefined), hapus penyesuaian manual agar kembali otomatis ke hitungan sistem
          const isOverrideEmpty = item.override_amount === '' || item.override_amount === null || item.override_amount === undefined;

          if (isOverrideEmpty) {
            if (adjExisting) {
              await trx('student_fee_adjustments').where({ id: adjExisting.id }).del();
            }
          } else {
            const numericOverride = parseFloat(item.override_amount || 0);
            if (adjExisting) {
              await trx('student_fee_adjustments')
                .where({ id: adjExisting.id })
                .update({
                  assignment_id: assignmentId,
                  adjustment_kind: item.adjustment_kind || 'override_amount',
                  override_amount: numericOverride,
                  waiver_type: item.waiver_type || 'Dispensasi Khusus',
                  waiver_percentage: item.waiver_percentage !== undefined ? item.waiver_percentage : null,
                  waiver_amount: item.waiver_amount !== undefined ? item.waiver_amount : null,
                  reason: item.reason || reason,
                  status: 'approved',
                  approved_by: userId,
                  approved_at: trx.fn.now()
                });
            } else {
              await trx('student_fee_adjustments').insert({
                school_unit_id: targetUnit,
                student_id,
                assignment_id: assignmentId,
                fee_type_id: item.fee_type_id,
                adjustment_kind: item.adjustment_kind || 'override_amount',
                override_amount: numericOverride,
                waiver_type: item.waiver_type || 'Dispensasi Khusus',
                waiver_percentage: item.waiver_percentage !== undefined ? item.waiver_percentage : null,
                waiver_amount: item.waiver_amount !== undefined ? item.waiver_amount : null,
                reason: item.reason || reason,
                status: 'approved',
                approved_by: userId,
                approved_at: trx.fn.now()
              });
            }
          }
        }
      }

      const result = await trx('student_fee_scheme_assignments')
        .where({ id: assignmentId })
        .first();

      await logFinanceAudit({
        schoolUnitId: targetUnit,
        userId,
        action: 'ASSIGN_CUSTOM_STUDENT_FEE',
        entityType: 'student_fee_scheme_assignment',
        entityId: assignmentId,
        dataBefore: existing || null,
        dataAfter: { ...result, custom_items },
        trx
      });

      return result;
    });
  }
}

module.exports = new FeeSchemesService();
