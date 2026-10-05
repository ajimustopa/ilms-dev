/**
 * PSB (Penerimaan Siswa Baru) Service
 * apps/api-backend/src/modules/psb/service.js
 *
 * Mengelola:
 * 1. Program PSB & Kuota Rombel (L/P)
 * 2. Gelombang Pendaftaran & Tautan Skema Biaya
 * 3. Kebijakan Refund Pengunduran Diri
 * 4. Pendaftaran Calon Murid (Formulir Lengkap, No. Reg Unik, Validasi NISN, Auto-Akun)
 * 5. Tagihan & Pembayaran Biaya Pendaftaran Keuangan (ppdb_registration_bills)
 * 6. Dokumen Persyaratan Digital
 * 7. Lookups Lintas Modul
 */
const crypto = require('crypto');
const db = require('../../config/db/akademik');
const dbCore = require('../../config/db/core');
const crossModule = require('./common/psbCrossModuleServices');
const { generateShortUsername } = require('../../utils/usernameGenerator');
const { calculatePpdbStage } = require('./common/ppdbStageHelper');

function normalizeUnitId(schoolUnitId) {
  if (!schoolUnitId || schoolUnitId === 'all') return null;
  if (typeof schoolUnitId === 'object' && schoolUnitId !== null) {
    const id = Number(schoolUnitId.id);
    return !isNaN(id) && id > 0 ? id : null;
  }
  const id = Number(schoolUnitId);
  return !isNaN(id) && id > 0 ? id : null;
}

class PsbService {
  // ============================================================
  // 1. PROGRAM PSB (psb_processes) & KUOTA PER ROMBEL
  // ============================================================

  async listPrograms(schoolUnitId, filters = {}) {
    const validUnitId = normalizeUnitId(schoolUnitId);
    let q = db('psb_processes');

    if (filters.search) {
      q = q.where('name', 'like', `%${filters.search.trim()}%`);
    }
    if (filters.target_academic_year) {
      q = q.where('target_academic_year', filters.target_academic_year);
    }
    if (filters.target_academic_year_id && !isNaN(Number(filters.target_academic_year_id))) {
      q = q.where('target_academic_year_id', Number(filters.target_academic_year_id));
    }
    if (filters.status && filters.status !== 'all') {
      let st = filters.status;
      if (st === 'active') st = 'open';
      if (st === 'archived') st = 'closed';
      q = q.where('status', st);
    }

    // Filter eksplisit satuan_pendidikan_id dari query params atau dari header unit aktif
    const explicitUnitId = normalizeUnitId(filters.satuan_pendidikan_id);
    const activeUnitFilter = explicitUnitId || validUnitId;

    if (activeUnitFilter) {
      // Satuan Pendidikan Terpilih (Spesifik):
      // Hanya tampilkan program yang bertaut dengan satuan pendidikan tersebut:
      // 1. Terdaftar di psb_process_units
      // 2. ATAU memiliki kuota rombel kelas di psb_process_class_quotas
      // 3. ATAU memiliki gelombang di psb_groups
      // 4. ATAU program bertipe yayasan ('yayasan' menaungi seluruh satuan pendidikan)
      q = q.where(function() {
        this.whereIn('id', db('psb_process_units').select('psb_process_id').where('satuan_pendidikan_id', activeUnitFilter))
          .orWhereIn('id', db('psb_process_class_quotas').select('psb_process_id').where('satuan_pendidikan_id', activeUnitFilter))
          .orWhereIn('id', db('psb_groups').select('psb_process_id').where('satuan_pendidikan_id', activeUnitFilter))
          .orWhere('context_type', 'yayasan');
      });
    }

    const programs = await q.orderBy('id', 'desc');

    // Ambil daftar master satuan pendidikan aktif dari core_db
    let schoolUnitsMaster = [];
    try {
      schoolUnitsMaster = await dbCore('school_units')
        .select('id', 'name', 'level', 'is_active')
        .where('is_active', 1);
    } catch (err) {
      console.warn('[PSB Service] Master school_units tidak dapat dimuat:', err.message);
    }

    for (const prog of programs) {
      // Ambil unit yang berelasi dengan program ini
      const pUnits = await db('psb_process_units')
        .where('psb_process_id', prog.id)
        .select('satuan_pendidikan_id', 'code_prefix', 'target_registrants', 'quota_male', 'quota_female');

      const quotaUnits = await db('psb_process_class_quotas')
        .where('psb_process_id', prog.id)
        .pluck('satuan_pendidikan_id');

      const associatedUnitIds = Array.from(new Set([
        ...pUnits.map(u => Number(u.satuan_pendidikan_id)),
        ...quotaUnits.map(id => Number(id))
      ])).filter(id => !isNaN(id) && id > 0);

      prog.associated_unit_ids = associatedUnitIds;
      prog.units = schoolUnitsMaster.filter(u => associatedUnitIds.includes(Number(u.id)));

      if (prog.context_type === 'yayasan') {
        prog.unit_label = 'Pusat Yayasan (Gabungan Seluruh Satuan)';
        prog.is_consolidated = true;
      } else if (prog.units.length > 1) {
        prog.unit_label = `${prog.units.length} Unit: ${prog.units.map(u => u.level || u.name).join(' & ')}`;
        prog.is_consolidated = true;
      } else if (prog.units.length === 1) {
        const u = prog.units[0];
        prog.unit_label = `${u.name} (${u.level})`;
        prog.satuan_pendidikan_id = u.id;
        prog.is_consolidated = false;
      } else {
        prog.unit_label = 'Seluruh Satuan Pendidikan';
        prog.is_consolidated = true;
      }

      // Hitung Kuota Rombel (jika activeUnitFilter spesifik, hitung khusus unit tersebut)
      let quotaQuery = db('psb_process_class_quotas').where('psb_process_id', prog.id);
      if (activeUnitFilter) {
        quotaQuery = quotaQuery.where('satuan_pendidikan_id', activeUnitFilter);
      }
      const classQuotas = await quotaQuery;

      prog.total_quota_male = classQuotas.reduce((acc, cq) => acc + (cq.quota_male || 0), 0);
      prog.total_quota_female = classQuotas.reduce((acc, cq) => acc + (cq.quota_female || 0), 0);
      prog.total_quota = classQuotas.reduce((acc, cq) => acc + (cq.total_quota || 0), 0);
      prog.class_count = classQuotas.length;

      // Hitung Gelombang
      let wavesQuery = db('psb_groups').where('psb_process_id', prog.id);
      if (activeUnitFilter) {
        wavesQuery = wavesQuery.where(function() {
          this.where('satuan_pendidikan_id', activeUnitFilter).orWhereNull('satuan_pendidikan_id');
        });
      }
      const wavesCount = await wavesQuery.count('id as total').first();
      prog.waves_count = parseInt(wavesCount?.total, 10) || 0;

      // Hitung Pendaftar
      let regQuery = db('psb_registrants').where('psb_process_id', prog.id);
      if (activeUnitFilter) {
        regQuery = regQuery.where('satuan_pendidikan_id', activeUnitFilter);
      }
      const registrantsCount = await regQuery.count('id as total').first();
      prog.registrants_count = parseInt(registrantsCount?.total, 10) || 0;
    }

    return programs;
  }

  async getProgramById(id, schoolUnitId = null) {
    const program = await db('psb_processes').where({ id: Number(id) }).first();
    if (!program) {
      const error = new Error('Program PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const validUnitId = normalizeUnitId(schoolUnitId);

    let quotaQuery = db('psb_process_class_quotas')
      .leftJoin('class_groups', 'psb_process_class_quotas.class_group_id', 'class_groups.id')
      .where('psb_process_class_quotas.psb_process_id', program.id)
      .select(
        'psb_process_class_quotas.*',
        'class_groups.name as class_group_name',
        'class_groups.type as class_group_type',
        'class_groups.capacity'
      );

    if (validUnitId) {
      quotaQuery = quotaQuery.where('psb_process_class_quotas.satuan_pendidikan_id', validUnitId);
    }
    const rawClassQuotas = await quotaQuery
      .orderBy('psb_process_class_quotas.satuan_pendidikan_id', 'asc')
      .orderBy('psb_process_class_quotas.grade_level', 'asc')
      .orderBy('class_groups.name', 'asc');

    const schoolUnitsMaster = await crossModule.listSchoolUnits();
    const classQuotas = rawClassQuotas.map(cq => {
      const u = schoolUnitsMaster.find(unit => Number(unit.id) === Number(cq.satuan_pendidikan_id));
      return {
        ...cq,
        satuan_pendidikan_name: u ? u.name : `Unit #${cq.satuan_pendidikan_id}`,
        class_group_name: cq.class_group_name || (cq.grade_level ? `Tingkat ${cq.grade_level}` : 'Kuota Tingkat')
      };
    });

    let waveQuery = db('psb_groups').where('psb_process_id', program.id);
    if (validUnitId) {
      waveQuery = waveQuery.where(function() {
        this.where('satuan_pendidikan_id', validUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    const waves = await waveQuery.orderBy('wave_number', 'asc').orderBy('start_date', 'asc');

    for (const wave of waves) {
      if (wave.fee_scheme_id) {
        const scheme = await crossModule.getFeeScheme(wave.fee_scheme_id);
        wave.fee_scheme_name = scheme?.name || `Skema Biaya #${wave.fee_scheme_id}`;
        wave.fee_scheme_total = scheme?.total_amount || 0;
      }
    }

    let refundQuery = db('psb_refund_policies').where(function() {
      this.where('psb_process_id', program.id).orWhereNull('psb_process_id');
    });
    if (validUnitId) {
      refundQuery = refundQuery.where('satuan_pendidikan_id', validUnitId);
    }
    const refundPolicies = await refundQuery.orderBy('fee_category', 'asc').orderBy('days_before_cutoff', 'desc');

    return {
      ...program,
      class_quotas: classQuotas,
      waves,
      refund_policies: refundPolicies
    };
  }

  async createProgram(payload) {
    const {
      name,
      description,
      target_academic_year,
      target_academic_year_id,
      context_type = 'satuan',
      status = 'open',
      start_date,
      end_date,
      satuan_pendidikan_id,
      class_quotas = []
    } = payload;

    let finalAyName = target_academic_year ? String(target_academic_year).trim() : null;
    let finalAyId = (target_academic_year_id && !isNaN(Number(target_academic_year_id))) ? Number(target_academic_year_id) : null;

    if (finalAyId && !finalAyName) {
      const ay = await crossModule.getAcademicYear(finalAyId);
      if (ay) finalAyName = ay.name;
    } else if (finalAyName && !finalAyId) {
      const ayList = await crossModule.listAcademicYears();
      const match = ayList.find(a => a.name === finalAyName);
      if (match) finalAyId = match.id;
    }

    if (!name || !finalAyName) {
      const error = new Error('Nama program dan tahun ajaran target (merujuk ke modul Akademik) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Normalisasi status ke ENUM valid ['draft', 'open', 'closed']
    let normalizedStatus = status || 'open';
    if (normalizedStatus === 'active') normalizedStatus = 'open';
    if (normalizedStatus === 'archived') normalizedStatus = 'closed';
    if (!['draft', 'open', 'closed'].includes(normalizedStatus)) {
      normalizedStatus = 'draft';
    }

    const targetUnitId = normalizeUnitId(satuan_pendidikan_id);

    // Validasi Keunikan Program: 1 Satuan Pendidikan (atau Konsolidasi Yayasan) hanya boleh memiliki 1 Program PSB per Tahun Ajaran
    const existingPrograms = await db('psb_processes')
      .where(function() {
        this.where('target_academic_year', finalAyName);
        if (finalAyId) {
          this.orWhere('target_academic_year_id', finalAyId);
        }
      });

    if (existingPrograms.length > 0) {
      if (context_type === 'yayasan') {
        const conflictProg = existingPrograms.find(p => p.context_type === 'yayasan');
        if (conflictProg) {
          const error = new Error(
            `Program PSB Tingkat Yayasan untuk Tahun Ajaran ${finalAyName} sudah terdaftar ("${conflictProg.name}"). Setiap tahun ajaran hanya diperbolehkan memiliki 1 program PSB. Silakan kelola Kuota Rombel atau Gelombang Pendaftaran pada program tersebut.`
          );
          error.statusCode = 422;
          throw error;
        }
      } else if (targetUnitId) {
        const existingProgIds = existingPrograms.map(p => p.id);
        const unitAssoc = await db('psb_process_units')
          .whereIn('psb_process_id', existingProgIds)
          .where('satuan_pendidikan_id', targetUnitId)
          .first();

        const yayasanProg = existingPrograms.find(p => p.context_type === 'yayasan');

        if (unitAssoc || yayasanProg) {
          const conflictId = unitAssoc?.psb_process_id || yayasanProg?.id;
          const conflictProg = existingPrograms.find(p => p.id === conflictId);
          const error = new Error(
            `Program PSB untuk Tahun Ajaran ${finalAyName} sudah terdaftar pada satuan pendidikan ini ("${conflictProg?.name || 'Program #' + conflictId}"). Setiap satuan pendidikan hanya diperbolehkan memiliki 1 program PSB per tahun ajaran. Silakan kelola Kuota Rombel atau Gelombang Pendaftaran pada program yang telah ada.`
          );
          error.statusCode = 422;
          throw error;
        }
      } else {
        const conflictProg = existingPrograms[0];
        const error = new Error(
          `Program PSB untuk Tahun Ajaran ${finalAyName} sudah terdaftar ("${conflictProg.name}"). Setiap tahun ajaran hanya diperbolehkan memiliki 1 program PSB.`
        );
        error.statusCode = 422;
        throw error;
      }
    }

    let programId;
    await db.transaction(async (trx) => {
      const [newId] = await trx('psb_processes').insert({
        name: name.trim(),
        description: description || null,
        target_academic_year: finalAyName,
        target_academic_year_id: finalAyId,
        context_type,
        status: normalizedStatus,
        start_date: start_date || null,
        end_date: end_date || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      programId = newId;

      if (targetUnitId) {
        await trx('psb_process_units').insert({
          psb_process_id: programId,
          satuan_pendidikan_id: targetUnitId,
          code_prefix: 'PSB',
          target_registrants: 0,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        }).onConflict(['psb_process_id', 'satuan_pendidikan_id']).ignore();
      } else if (context_type === 'yayasan' || !targetUnitId) {
        try {
          const allUnits = await dbCore('school_units').select('id').where('is_active', 1);
          for (const u of allUnits) {
            await trx('psb_process_units').insert({
              psb_process_id: programId,
              satuan_pendidikan_id: u.id,
              code_prefix: 'PSB',
              target_registrants: 0,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            }).onConflict(['psb_process_id', 'satuan_pendidikan_id']).ignore();
          }
        } catch (err) {
          console.warn('[PSB Service] Gagal auto-link all school_units for yayasan program:', err.message);
        }
      }

      if (Array.isArray(class_quotas) && class_quotas.length > 0) {
        for (const cq of class_quotas) {
          if (!cq.class_group_id && !cq.grade_level) continue;
          const male = parseInt(cq.quota_male, 10) || 0;
          const female = parseInt(cq.quota_female, 10) || 0;
          const total = cq.total_quota !== undefined ? parseInt(cq.total_quota, 10) : (male + female);
          const cqUnit = normalizeUnitId(cq.satuan_pendidikan_id) || targetUnitId || 1;
          const plannedClasses = parseInt(cq.planned_classes_count, 10) || 1;

          await trx('psb_process_class_quotas').insert({
            psb_process_id: programId,
            satuan_pendidikan_id: cqUnit,
            class_group_id: cq.class_group_id ? Number(cq.class_group_id) : null,
            grade_level: cq.grade_level ? String(cq.grade_level).trim() : null,
            planned_classes_count: plannedClasses,
            quota_male: male,
            quota_female: female,
            total_quota: total,
            notes: cq.notes || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }
    });

    return await this.getProgramById(programId);
  }

  async updateProgram(id, payload) {
    const program = await db('psb_processes').where({ id: Number(id) }).first();
    if (!program) {
      const error = new Error('Program PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      name,
      description,
      target_academic_year,
      target_academic_year_id,
      context_type,
      status,
      start_date,
      end_date,
      class_quotas
    } = payload;

    let finalAyName = target_academic_year !== undefined ? (target_academic_year ? target_academic_year.trim() : null) : undefined;
    let finalAyId = target_academic_year_id !== undefined ? (target_academic_year_id ? Number(target_academic_year_id) : null) : undefined;

    if (finalAyId && finalAyName === undefined) {
      const ay = await crossModule.getAcademicYear(finalAyId);
      if (ay) finalAyName = ay.name;
    } else if (finalAyName && finalAyId === undefined) {
      const ayList = await crossModule.listAcademicYears();
      const match = ayList.find(a => a.name === finalAyName);
      if (match) finalAyId = match.id;
    }

    // Jika tahun ajaran diubah, validasi apakah tahun ajaran baru sudah dipakai oleh program lain di unit yang sama
    if (finalAyName !== undefined && finalAyName !== program.target_academic_year) {
      const otherPrograms = await db('psb_processes')
        .whereNot('id', id)
        .where(function() {
          this.where('target_academic_year', finalAyName);
          if (finalAyId) {
            this.orWhere('target_academic_year_id', finalAyId);
          }
        });

      if (otherPrograms.length > 0) {
        const curContext = context_type || program.context_type;
        if (curContext === 'yayasan') {
          const conflict = otherPrograms.find(p => p.context_type === 'yayasan');
          if (conflict) {
            const error = new Error(
              `Tidak dapat mengubah ke Tahun Ajaran ${finalAyName} karena program PSB Tingkat Yayasan untuk tahun tersebut sudah ada ("${conflict.name}").`
            );
            error.statusCode = 422;
            throw error;
          }
        } else {
          const myUnits = await db('psb_process_units').where('psb_process_id', id).pluck('satuan_pendidikan_id');
          if (myUnits.length > 0) {
            const otherProgIds = otherPrograms.map(p => p.id);
            const conflictAssoc = await db('psb_process_units')
              .whereIn('psb_process_id', otherProgIds)
              .whereIn('satuan_pendidikan_id', myUnits)
              .first();

            const conflictYayasan = otherPrograms.find(p => p.context_type === 'yayasan');

            if (conflictAssoc || conflictYayasan) {
              const conflictId = conflictAssoc?.psb_process_id || conflictYayasan?.id;
              const conflict = otherPrograms.find(p => p.id === conflictId);
              const error = new Error(
                `Tidak dapat mengubah ke Tahun Ajaran ${finalAyName} karena sudah terdaftar pada program lain ("${conflict?.name || '#' + conflictId}"). Setiap satuan pendidikan hanya boleh memiliki 1 program per tahun ajaran.`
              );
              error.statusCode = 422;
              throw error;
            }
          }
        }
      }
    }

    await db.transaction(async (trx) => {
      const updateData = { updated_at: db.fn.now() };
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (finalAyName !== undefined) updateData.target_academic_year = finalAyName;
      if (finalAyId !== undefined) updateData.target_academic_year_id = finalAyId;
      if (context_type !== undefined) updateData.context_type = context_type;
      if (status !== undefined) {
        let normalizedStatus = status;
        if (normalizedStatus === 'active') normalizedStatus = 'open';
        if (normalizedStatus === 'archived') normalizedStatus = 'closed';
        if (['draft', 'open', 'closed'].includes(normalizedStatus)) {
          updateData.status = normalizedStatus;
        }
      }
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;

      await trx('psb_processes').where({ id }).update(updateData);

      if (Array.isArray(class_quotas)) {
        await trx('psb_process_class_quotas').where({ psb_process_id: id }).del();
        for (const cq of class_quotas) {
          if (!cq.class_group_id && !cq.grade_level) continue;
          const male = parseInt(cq.quota_male, 10) || 0;
          const female = parseInt(cq.quota_female, 10) || 0;
          const total = cq.total_quota !== undefined ? parseInt(cq.total_quota, 10) : (male + female);
          const cqUnit = normalizeUnitId(cq.satuan_pendidikan_id) || normalizeUnitId(program.satuan_pendidikan_id) || 1;
          const plannedClasses = parseInt(cq.planned_classes_count, 10) || 1;

          await trx('psb_process_class_quotas').insert({
            psb_process_id: id,
            satuan_pendidikan_id: cqUnit,
            class_group_id: cq.class_group_id ? Number(cq.class_group_id) : null,
            grade_level: cq.grade_level ? String(cq.grade_level).trim() : null,
            planned_classes_count: plannedClasses,
            quota_male: male,
            quota_female: female,
            total_quota: total,
            notes: cq.notes || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }
    });

    return await this.getProgramById(id);
  }

  async deleteProgram(id, options = {}) {
    const program = await db('psb_processes').where({ id: Number(id) }).first();
    if (!program) {
      const error = new Error('Program PSB tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const regCount = await db('psb_registrants').where({ psb_process_id: id }).count('id as total').first();
    const totalReg = parseInt(regCount?.total, 10) || 0;

    if (totalReg > 0) {
      const placedCount = await db('psb_registrants')
        .where({ psb_process_id: id })
        .where(function() {
          this.whereNotNull('placed_student_id')
            .orWhere('status', 'enrolled')
            .orWhere('status', 'placed');
        })
        .count('id as total')
        .first();

      if (parseInt(placedCount?.total, 10) > 0) {
        const error = new Error('Program PSB tidak dapat dihapus karena sudah memiliki santri yang resmi diterima / ditempatkan');
        error.statusCode = 400;
        throw error;
      }

      if (!options.force) {
        const error = new Error(`Program PSB "${program.name}" memiliki ${totalReg} data pendaftar (termasuk data dummy/uji coba). Konfirmasi penghapusan seluruh data draf untuk melanjutkan.`);
        error.statusCode = 400;
        throw error;
      }
    }

    await db.transaction(async (trx) => {
      if (totalReg > 0 && options.force) {
        const regIds = await trx('psb_registrants').where({ psb_process_id: id }).pluck('id');
        if (regIds.length > 0) {
          await trx('psb_registrant_documents').whereIn('psb_registrant_id', regIds).del();
          await trx('psb_status_logs').whereIn('psb_registrant_id', regIds).del();
          await trx('psb_test_sessions').whereIn('psb_registrant_id', regIds).del();
          await trx('psb_placement_logs').whereIn('psb_registrant_id', regIds).del();
          await trx('psb_withdrawals').whereIn('psb_registrant_id', regIds).del();
          await trx('psb_registrants').whereIn('id', regIds).del();
        }
      }

      await trx('psb_process_class_quotas').where({ psb_process_id: id }).del();
      await trx('psb_groups').where({ psb_process_id: id }).del();
      await trx('psb_process_units').where({ psb_process_id: id }).del();
      await trx('psb_processes').where({ id }).del();
    });

    return { id: Number(id), deleted: true };
  }

  // ============================================================
  // 2. GELOMBANG PENDAFTARAN (psb_groups / WAVES)
  // ============================================================

  async listWaves(programId, schoolUnitId = null) {
    let q = db('psb_groups')
      .leftJoin('psb_processes', 'psb_groups.psb_process_id', 'psb_processes.id')
      .select(
        'psb_groups.*',
        'psb_processes.name as program_name',
        'psb_processes.target_academic_year',
        'psb_processes.context_type as program_context_type'
      );

    if (programId && !isNaN(Number(programId))) {
      q = q.where('psb_groups.psb_process_id', Number(programId));
    }
    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      q = q.where(function() {
        this.where('psb_groups.satuan_pendidikan_id', validUnitId).orWhereNull('psb_groups.satuan_pendidikan_id');
      });
    }

    const waves = await q.orderBy('psb_groups.wave_number', 'asc').orderBy('psb_groups.start_date', 'asc');
    for (const w of waves) {
      if (w.fee_scheme_id) {
        const scheme = await crossModule.getFeeScheme(w.fee_scheme_id);
        w.fee_scheme_name = scheme?.name || null;
        w.fee_scheme_total = scheme?.total_amount || 0;
      }
    }
    return waves;
  }

  async createWave(payload) {
    const {
      psb_process_id,
      satuan_pendidikan_id,
      name,
      wave_number = 1,
      registration_path = 'reguler',
      description,
      quota,
      start_date,
      end_date,
      fee_scheme_id,
      registration_fee_amount = 0,
      is_active = true
    } = payload;

    if (!psb_process_id || !name) {
      const error = new Error('psb_process_id dan nama gelombang wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_groups').insert({
      psb_process_id: Number(psb_process_id),
      satuan_pendidikan_id: satuan_pendidikan_id ? Number(satuan_pendidikan_id) : null,
      name: name.trim(),
      wave_number: Number(wave_number),
      registration_path,
      description: description || null,
      quota: quota ? Number(quota) : null,
      start_date: start_date || null,
      end_date: end_date || null,
      fee_scheme_id: fee_scheme_id ? Number(fee_scheme_id) : null,
      registration_fee_amount: Number(registration_fee_amount) || 0,
      is_active: Boolean(is_active),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const wave = await db('psb_groups').where({ id }).first();
    if (wave && wave.fee_scheme_id) {
      const scheme = await crossModule.getFeeScheme(wave.fee_scheme_id);
      wave.fee_scheme_name = scheme?.name || null;
    }
    return wave;
  }

  async updateWave(id, payload) {
    const wave = await db('psb_groups').where({ id: Number(id) }).first();
    if (!wave) {
      const error = new Error('Gelombang pendaftaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      name,
      wave_number,
      registration_path,
      description,
      quota,
      start_date,
      end_date,
      fee_scheme_id,
      registration_fee_amount,
      is_active
    } = payload;

    const updateData = { updated_at: db.fn.now() };
    if (name !== undefined) updateData.name = name.trim();
    if (wave_number !== undefined) updateData.wave_number = Number(wave_number);
    if (registration_path !== undefined) updateData.registration_path = registration_path;
    if (description !== undefined) updateData.description = description;
    if (quota !== undefined) updateData.quota = quota ? Number(quota) : null;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (fee_scheme_id !== undefined) updateData.fee_scheme_id = fee_scheme_id ? Number(fee_scheme_id) : null;
    if (registration_fee_amount !== undefined) updateData.registration_fee_amount = Number(registration_fee_amount);
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    await db('psb_groups').where({ id }).update(updateData);
    return await db('psb_groups').where({ id }).first();
  }

  async deleteWave(id) {
    const wave = await db('psb_groups').where({ id: Number(id) }).first();
    if (!wave) {
      const error = new Error('Gelombang pendaftaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const regCount = await db('psb_registrants').where({ psb_group_id: id }).count('id as total').first();
    if (parseInt(regCount?.total, 10) > 0) {
      const error = new Error('Gelombang tidak dapat dihapus karena sudah memiliki pendaftar');
      error.statusCode = 400;
      throw error;
    }

    await db('psb_groups').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ============================================================
  // 3. KEBIJAKAN REFUND PENGUNDURAN DIRI (psb_refund_policies)
  // ============================================================

  async listRefundPolicies(satuanPendidikanId, programId = null) {
    let q = db('psb_refund_policies');
    if (satuanPendidikanId && satuanPendidikanId !== 'all') {
      q = q.where('satuan_pendidikan_id', Number(satuanPendidikanId));
    }
    if (programId && programId !== 'all') {
      q = q.where(function() {
        this.where('psb_process_id', Number(programId)).orWhereNull('psb_process_id');
      });
    }

    return await q.orderBy('fee_category', 'asc').orderBy('days_before_cutoff', 'desc');
  }

  async createRefundPolicy(payload) {
    const {
      satuan_pendidikan_id,
      psb_process_id,
      fee_category,
      days_before_cutoff = 0,
      refund_percentage = 0,
      admin_fee_deduction = 0,
      description,
      is_active = true
    } = payload;

    if (!satuan_pendidikan_id || !fee_category) {
      const error = new Error('satuan_pendidikan_id dan fee_category wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_refund_policies').insert({
      satuan_pendidikan_id: Number(satuan_pendidikan_id),
      psb_process_id: psb_process_id ? Number(psb_process_id) : null,
      fee_category,
      days_before_cutoff: Number(days_before_cutoff),
      refund_percentage: Number(refund_percentage),
      admin_fee_deduction: Number(admin_fee_deduction),
      description: description || null,
      is_active: Boolean(is_active),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return await db('psb_refund_policies').where({ id }).first();
  }

  async updateRefundPolicy(id, payload) {
    const policy = await db('psb_refund_policies').where({ id: Number(id) }).first();
    if (!policy) {
      const error = new Error('Kebijakan refund tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      fee_category,
      days_before_cutoff,
      refund_percentage,
      admin_fee_deduction,
      description,
      is_active
    } = payload;

    const updateData = { updated_at: db.fn.now() };
    if (fee_category !== undefined) updateData.fee_category = fee_category;
    if (days_before_cutoff !== undefined) updateData.days_before_cutoff = Number(days_before_cutoff);
    if (refund_percentage !== undefined) updateData.refund_percentage = Number(refund_percentage);
    if (admin_fee_deduction !== undefined) updateData.admin_fee_deduction = Number(admin_fee_deduction);
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    await db('psb_refund_policies').where({ id }).update(updateData);
    return await db('psb_refund_policies').where({ id }).first();
  }

  async deleteRefundPolicy(id) {
    const policy = await db('psb_refund_policies').where({ id: Number(id) }).first();
    if (!policy) {
      const error = new Error('Kebijakan refund tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_refund_policies').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ============================================================
  // 4. PENDAFTARAN CALON MURID (psb_registrants) & NO. REG GENERATOR
  // ============================================================

  async generateRegistrationNumber(psbProcessId, satuanPendidikanId) {
    const process = await db('psb_processes').where({ id: Number(psbProcessId) }).first();
    const unit = await crossModule.getSchoolUnit(satuanPendidikanId);

    // Ambil 4 digit tahun ajaran target (misal: "2026/2027" -> "2627")
    let yearPart = '2627';
    if (process && process.target_academic_year) {
      const match = process.target_academic_year.match(/(\d{4})\/(\d{4})/);
      if (match) {
        yearPart = `${match[1].slice(-2)}${match[2].slice(-2)}`;
      }
    }

    // Ambil prefix unit (SMP, SMA, atau KODE)
    let unitPart = 'REG';
    if (unit) {
      const levelUpper = (unit.level || '').toUpperCase();
      if (levelUpper.includes('SMP') || unit.name.toUpperCase().includes('SMP')) unitPart = 'SMP';
      else if (levelUpper.includes('SMA') || unit.name.toUpperCase().includes('SMA')) unitPart = 'SMA';
      else if (levelUpper.includes('SD') || unit.name.toUpperCase().includes('SD')) unitPart = 'SD';
      else unitPart = `U${unit.id}`;
    }

    const prefix = `PSB-${yearPart}-${unitPart}`;

    const countRow = await db('psb_registrants')
      .where({ psb_process_id: psbProcessId, satuan_pendidikan_id: satuanPendidikanId })
      .count('id as total')
      .first();

    const nextSeq = (Number(countRow?.total) || 0) + 1;
    let candidateNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;

    let collision = await db('psb_registrants').where({ registration_number: candidateNumber }).first();
    let offset = nextSeq;
    while (collision) {
      offset++;
      candidateNumber = `${prefix}-${String(offset).padStart(4, '0')}`;
      collision = await db('psb_registrants').where({ registration_number: candidateNumber }).first();
    }

    return candidateNumber;
  }

  async listRegistrants(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 50);
    const offset = (page - 1) * limit;

    let baseQuery = db('psb_registrants')
      .leftJoin('psb_processes', 'psb_registrants.psb_process_id', 'psb_processes.id')
      .leftJoin('psb_groups', 'psb_registrants.psb_group_id', 'psb_groups.id')
      .leftJoin('class_groups as target_class', 'psb_registrants.target_class_group_id', 'target_class.id')
      .leftJoin('class_groups as placed_class', 'psb_registrants.placed_class_group_id', 'placed_class.id');

    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      baseQuery = baseQuery.where('psb_registrants.satuan_pendidikan_id', validUnitId);
    }
    if (query.target_academic_year && query.target_academic_year !== 'all') {
      baseQuery = baseQuery.where('psb_processes.target_academic_year', query.target_academic_year);
    }
    if (query.target_academic_year_id && query.target_academic_year_id !== 'all') {
      baseQuery = baseQuery.where('psb_processes.target_academic_year_id', Number(query.target_academic_year_id));
    }
    if (query.psb_process_id) {
      baseQuery = baseQuery.where('psb_registrants.psb_process_id', Number(query.psb_process_id));
    }
    if (query.psb_group_id) {
      baseQuery = baseQuery.where('psb_registrants.psb_group_id', Number(query.psb_group_id));
    }
    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('psb_registrants.status', query.status);
    }
    if (query.gender && query.gender !== 'all') {
      baseQuery = baseQuery.where('psb_registrants.gender', query.gender);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where((b) => {
        b.where('psb_registrants.full_name', 'like', s)
          .orWhere('psb_registrants.registration_number', 'like', s)
          .orWhere('psb_registrants.nisn', 'like', s)
          .orWhere('psb_registrants.previous_school_name', 'like', s);
      });
    }

    const totalRow = await baseQuery.clone().count('psb_registrants.id as total').first();
    const totalItems = parseInt(totalRow?.total, 10) || 0;

    const items = await baseQuery
      .select(
        'psb_registrants.*',
        'psb_processes.name as psb_process_name',
        'psb_processes.target_academic_year',
        'psb_groups.name as wave_name',
        'psb_groups.wave_number',
        'psb_groups.registration_fee_amount',
        'target_class.name as target_class_name',
        'placed_class.name as placed_class_name'
      )
      .orderBy('psb_registrants.id', 'desc')
      .limit(limit)
      .offset(offset);

    // Batch fetch test sessions for stage calculation
    const itemIds = items.map(i => i.id);
    const testSessionsMap = {};
    if (itemIds.length > 0) {
      const allSessions = await db('psb_test_sessions').whereIn('psb_registrant_id', itemIds);
      for (const s of allSessions) {
        if (!testSessionsMap[s.psb_registrant_id]) testSessionsMap[s.psb_registrant_id] = [];
        testSessionsMap[s.psb_registrant_id].push(s);
      }
    }

    // Enrich dengan status tagihan pendaftaran & uang pangkal dari Keuangan + Kalkulasi 7 Tahapan PPDB
    for (const item of items) {
      const bill = await crossModule.getRegistrationFeeBill(item.id, item.registration_number);
      item.registration_fee_bill = bill ? {
        id: bill.id,
        amount: Number(bill.amount),
        paid_amount: Number(bill.paid_amount || 0),
        status: bill.status,
        is_paid: bill.is_paid,
        has_payments: Boolean(bill.has_payments),
        receipt_number: bill.payments?.[0]?.receipt_number || null,
        payment_date: bill.payments?.[0]?.payment_date || null
      } : null;

      const enrollmentBill = await crossModule.getEnrollmentFeeBill(item.id, item.registration_number);
      item.enrollment_fee_bill = enrollmentBill ? {
        id: enrollmentBill.id,
        amount: Number(enrollmentBill.amount),
        paid_amount: Number(enrollmentBill.paid_amount),
        remaining_balance: enrollmentBill.remaining_balance || Math.max(0, Number(enrollmentBill.amount) - Number(enrollmentBill.paid_amount || 0)),
        status: enrollmentBill.status,
        is_paid: enrollmentBill.is_paid,
        is_min_paid: enrollmentBill.is_min_paid,
        has_payments: Boolean(enrollmentBill.has_payments),
        receipt_number: enrollmentBill.payments?.[0]?.receipt_number || null,
        payment_date: enrollmentBill.payments?.[0]?.payment_date || null,
        notes: enrollmentBill.notes || null
      } : null;

      item.stage_info = calculatePpdbStage(
        item,
        item.registration_fee_bill,
        item.enrollment_fee_bill,
        testSessionsMap[item.id] || []
      );
    }

    return {
      items,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit) || 1
      }
    };
  }

  async getRegistrantById(id, schoolUnitId = null) {
    let q = db('psb_registrants')
      .leftJoin('psb_processes', 'psb_registrants.psb_process_id', 'psb_processes.id')
      .leftJoin('psb_groups', 'psb_registrants.psb_group_id', 'psb_groups.id')
      .leftJoin('class_groups as target_class', 'psb_registrants.target_class_group_id', 'target_class.id')
      .leftJoin('class_groups as placed_class', 'psb_registrants.placed_class_group_id', 'placed_class.id')
      .where('psb_registrants.id', Number(id));

    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      q = q.where('psb_registrants.satuan_pendidikan_id', validUnitId);
    }

    const registrant = await q.select(
      'psb_registrants.*',
      'psb_processes.name as psb_process_name',
      'psb_processes.target_academic_year',
      'psb_processes.target_academic_year_id',
      'psb_groups.name as wave_name',
      'psb_groups.wave_number',
      'psb_groups.registration_path',
      'psb_groups.registration_fee_amount',
      'target_class.name as target_class_name',
      'placed_class.name as placed_class_name'
    ).first();

    if (!registrant) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Ambil dokumen lampiran
    const documents = await db('psb_registrant_documents').where({ psb_registrant_id: registrant.id });

    // Ambil log status pendaftaran
    const statusLogs = await db('psb_status_logs')
      .where({ psb_registrant_id: registrant.id })
      .orderBy('created_at', 'desc');

    // Ambil data tagihan pendaftaran dari Keuangan
    const registrationBill = await crossModule.getRegistrationFeeBill(registrant.id, registrant.registration_number);

    // Ambil data tagihan uang pangkal dari Keuangan
    const enrollmentFeeBill = await crossModule.getEnrollmentFeeBill(registrant.id, registrant.registration_number);

    // Ambil daftar sesi ujian santri
    const testSessions = await db('psb_test_sessions')
      .leftJoin('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where({ 'psb_test_sessions.psb_registrant_id': registrant.id })
      .select(
        'psb_test_sessions.*',
        'psb_tests.name as test_name',
        'psb_tests.passing_score',
        'psb_tests.test_type'
      )
      .orderBy('psb_test_sessions.scheduled_at', 'asc');

    // Kalkulasi 7 Tahapan PPDB
    const stageInfo = calculatePpdbStage(registrant, registrationBill, enrollmentFeeBill, testSessions);

    return {
      ...registrant,
      documents,
      status_logs: statusLogs,
      registration_bill: registrationBill,
      enrollment_fee_bill: enrollmentFeeBill,
      test_sessions: testSessions,
      stage_info: stageInfo
    };
  }

  async createRegistrant(payload, userId = null) {
    const {
      psb_process_id,
      satuan_pendidikan_id,
      psb_group_id,
      nisn,
      full_name,
      gender,
      father_name,
      mother_name,
      parent_contact,
      previous_school_name,
      previous_school_address,
      birth_place,
      birth_date,
      address,
      parent_nik,
      parent_occupation,
      requested_grade_level_id,
      target_class_group_id,
      entry_type = 'reguler',
      source = 'admin_input'
    } = payload;

    // 1. Validasi field wajib (cukup nama santri dan nomor kontak orang tua/wali)
    if (!psb_process_id) throw new Error('Program PSB wajib dipilih');
    if (!satuan_pendidikan_id) throw new Error('Satuan pendidikan wajib dipilih');
    if (!full_name || !full_name.trim()) throw new Error('Nama lengkap calon santri wajib diisi');
    if (!parent_contact || !parent_contact.trim()) throw new Error('Nomor kontak orang tua / WhatsApp wajib diisi');

    const cleanGender = (gender && ['L', 'P'].includes(gender)) ? gender : 'L';

    // 2. Validasi keunikan NISN jika diisi
    if (nisn && nisn.trim()) {
      const cleanNisn = nisn.trim();
      const existingNisn = await db('psb_registrants')
        .where({ psb_process_id: Number(psb_process_id), nisn: cleanNisn })
        .first();
      if (existingNisn) {
        const error = new Error(`NISN ${cleanNisn} sudah terdaftar dalam program PSB ini`);
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Generate collision-free Nomor Registrasi
    const regNumber = await this.generateRegistrationNumber(psb_process_id, satuan_pendidikan_id);

    let registrantId;
    await db.transaction(async (trx) => {
      const [newId] = await trx('psb_registrants').insert({
        psb_process_id: Number(psb_process_id),
        satuan_pendidikan_id: Number(satuan_pendidikan_id),
        psb_group_id: psb_group_id ? Number(psb_group_id) : null,
        registration_number: regNumber,
        nisn: nisn && nisn.trim() ? nisn.trim() : null,
        full_name: full_name.trim(),
        gender: cleanGender,
        birth_place: birth_place && birth_place.trim() ? birth_place.trim() : null,
        birth_date: birth_date || null,
        address: address && address.trim() ? address.trim() : null,
        father_name: father_name && father_name.trim() ? father_name.trim() : null,
        mother_name: mother_name && mother_name.trim() ? mother_name.trim() : null,
        parent_contact: parent_contact.trim(),
        parent_nik: parent_nik && parent_nik.trim() ? parent_nik.trim() : null,
        parent_occupation: parent_occupation && parent_occupation.trim() ? parent_occupation.trim() : null,
        previous_school_name: previous_school_name && previous_school_name.trim() ? previous_school_name.trim() : null,
        previous_school_address: previous_school_address && previous_school_address.trim() ? previous_school_address.trim() : null,
        entry_type,
        requested_grade_level_id: requested_grade_level_id ? Number(requested_grade_level_id) : null,
        target_class_group_id: target_class_group_id ? Number(target_class_group_id) : null,
        status: 'registered',
        source,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      registrantId = newId;

      // 4. Catat Log Awal di psb_status_logs
      await trx('psb_status_logs').insert({
        psb_registrant_id: registrantId,
        previous_status: null,
        new_status: 'registered',
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Sistem PSB',
        notes: `Pendaftaran baru berhasil dibuat dengan nomor ${regNumber}`,
        created_at: db.fn.now()
      });
    });

    // 5. Integrasi Tagihan Biaya Pendaftaran ke Keuangan
    let feeBill = null;
    try {
      const process = await db('psb_processes').where({ id: Number(psb_process_id) }).first();
      let feeAmount = 0;
      if (psb_group_id) {
        const group = await db('psb_groups').where({ id: Number(psb_group_id) }).first();
        feeAmount = Number(group?.registration_fee_amount || 0);
      }

      if (feeAmount > 0) {
        feeBill = await crossModule.createRegistrationFeeBill({
          schoolUnitId: satuan_pendidikan_id,
          registrantId,
          targetAcademicYearId: process?.target_academic_year_id || 1,
          amount: feeAmount,
          registrantName: full_name.trim(),
          registrationNumber: regNumber,
          userId
        });
      }
    } catch (billErr) {
      console.warn('[PsbService] Warning pembuatan tagihan pendaftaran ke keuangan:', billErr.message);
    }

    // 6. Buat Akun Calon Murid Otomatis
    let userAccount = null;
    try {
      userAccount = await this.createRegistrantAccount(registrantId);
    } catch (accErr) {
      console.warn('[PsbService] Warning pembuatan akun user calon murid:', accErr.message);
    }

    const completeData = await this.getRegistrantById(registrantId);
    return {
      ...completeData,
      generated_account: userAccount ? {
        username: userAccount.username,
        password: userAccount.password
      } : null
    };
  }

  async updateRegistrant(id, payload, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(id) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const allowedFields = [
      'psb_group_id',
      'nisn',
      'full_name',
      'gender',
      'birth_place',
      'birth_date',
      'address',
      'father_name',
      'mother_name',
      'parent_contact',
      'parent_nik',
      'parent_occupation',
      'previous_school_name',
      'previous_school_address',
      'entry_type',
      'requested_grade_level_id',
      'target_class_group_id',
      'status'
    ];

    const updateData = { updated_at: db.fn.now() };
    for (const key of allowedFields) {
      if (payload[key] !== undefined) {
        updateData[key] = payload[key];
      }
    }

    // Catat log jika status berubah
    if (payload.status && payload.status !== reg.status) {
      await db('psb_status_logs').insert({
        psb_registrant_id: reg.id,
        previous_status: reg.status,
        new_status: payload.status,
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Panitia PSB',
        notes: payload.status_notes || `Status diubah dari ${reg.status} menjadi ${payload.status}`,
        created_at: db.fn.now()
      });
    }

    await db('psb_registrants').where({ id: Number(id) }).update(updateData);
    return await this.getRegistrantById(id);
  }

  async declareProspectiveStudent(registrantId, payload = {}, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = reg.status;
    const notes = payload.notes || 'Dinyatakan resmi sebagai Calon Siswa (Siap dimasukkan ke dalam rombel)';

    await db('psb_registrants').where({ id: reg.id }).update({
      status: 'prospective_student',
      updated_at: db.fn.now()
    });

    await db('psb_status_logs').insert({
      psb_registrant_id: reg.id,
      previous_status: previousStatus,
      new_status: 'prospective_student',
      action_by_user_id: userId ? Number(userId) : null,
      action_by_name: 'Panitia PSB',
      notes,
      created_at: db.fn.now()
    });

    return await this.getRegistrantById(reg.id);
  }

  async deleteRegistrant(id) {
    const reg = await db('psb_registrants').where({ id: Number(id) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (reg.status === 'placed' || reg.placed_student_id) {
      const error = new Error('Calon murid yang sudah ditempatkan ke rombel definitif tidak dapat dihapus');
      error.statusCode = 400;
      throw error;
    }

    await db('psb_registrants').where({ id: Number(id) }).del();
    return { id: Number(id), deleted: true };
  }

  // ============================================================
  // 5. PEMBUATAN AKUN PORTAL CALON MURID (users table)
  // ============================================================

  async createRegistrantAccount(registrantId) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (reg.user_account_id) {
      return {
        psb_registrant_id: Number(registrantId),
        user_account_id: reg.user_account_id,
        message: 'Akun calon murid sudah ada'
      };
    }

    const existingUsernames = new Set((await dbCore('users').select('username')).map((u) => u.username));
    const generatedUsername = generateShortUsername(reg.full_name.trim(), existingUsernames);
    const randomPassword = crypto.randomBytes(4).toString('hex').toLowerCase(); // 8 karakter misal "a3f8b91c"

    let targetRoleId = 18;
    try {
      const roleRow = await dbCore('roles').where({ name: 'calon_murid' }).orWhere({ name: 'siswa' }).first();
      if (roleRow) targetRoleId = roleRow.id;
    } catch (_) {}

    const coreAccount = await crossModule.createStudentUserAccount({
      username: generatedUsername,
      password: randomPassword,
      full_name: reg.full_name.trim(),
      account_type: 'student',
      ref_type: 'psb_registrant',
      ref_id: reg.id,
      school_unit_id: reg.satuan_pendidikan_id,
      role_id: targetRoleId
    });

    await db('psb_registrants').where({ id: Number(registrantId) }).update({
      user_account_id: coreAccount.id,
      updated_at: db.fn.now()
    });

    return {
      psb_registrant_id: Number(registrantId),
      user_account_id: coreAccount.id,
      username: generatedUsername,
      password: randomPassword,
      message: 'Akun portal calon murid berhasil dibuat'
    };
  }

  // ============================================================
  // 6. DOKUMEN PERSYARATAN DIGITAL (psb_registrant_documents)
  // ============================================================

  async listDocuments(registrantId) {
    return await db('psb_registrant_documents')
      .where({ psb_registrant_id: Number(registrantId) })
      .orderBy('id', 'asc');
  }

  async addDocument(registrantId, payload) {
    const { document_type, document_name, file_url, notes } = payload;
    if (!document_type || !file_url) {
      const error = new Error('document_type dan file_url wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('psb_registrant_documents').insert({
      psb_registrant_id: Number(registrantId),
      document_type,
      document_name: document_name || document_type,
      file_url,
      is_submitted: true,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return await db('psb_registrant_documents').where({ id }).first();
  }

  async verifyDocument(registrantId, docId, payload, userId = null) {
    const { is_verified = true, notes } = payload;
    const doc = await db('psb_registrant_documents')
      .where({ id: Number(docId), psb_registrant_id: Number(registrantId) })
      .first();

    if (!doc) {
      const error = new Error('Dokumen pendaftaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_registrant_documents').where({ id: Number(docId) }).update({
      is_submitted: Boolean(is_verified),
      verified_by: userId ? Number(userId) : null,
      verified_at: is_verified ? db.fn.now() : null,
      notes: notes || doc.notes,
      updated_at: db.fn.now()
    });

    return await db('psb_registrant_documents').where({ id: Number(docId) }).first();
  }

  async deleteDocument(registrantId, docId) {
    const doc = await db('psb_registrant_documents')
      .where({ id: Number(docId), psb_registrant_id: Number(registrantId) })
      .first();

    if (!doc) {
      const error = new Error('Dokumen pendaftaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_registrant_documents').where({ id: Number(docId) }).del();
    return { id: Number(docId), deleted: true };
  }

  // ============================================================
  // 7. PEMBAYARAN BIAYA PENDAFTARAN (KASIR / TRANSAKSI KEUANGAN)
  // ============================================================

  async getRegistrantBill(registrantId) {
    const bill = await crossModule.getRegistrationFeeBill(registrantId);
    if (!bill) {
      const error = new Error('Tagihan biaya pendaftaran belum tersedia untuk calon murid ini');
      error.statusCode = 404;
      throw error;
    }
    return bill;
  }

  async payRegistrantBill(registrantId, payload, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const bill = await crossModule.getRegistrationFeeBill(registrantId);
    if (!bill) {
      const error = new Error('Tagihan biaya pendaftaran tidak ditemukan di Keuangan');
      error.statusCode = 404;
      throw error;
    }

    const { cash_account_id, amount_paid, payment_method = 'cash', payment_date, notes } = payload;
    const paymentResult = await crossModule.recordRegistrationFeePayment({
      billId: bill.id,
      schoolUnitId: reg.satuan_pendidikan_id,
      cashAccountId: cash_account_id,
      amountPaid: amount_paid || bill.amount,
      paymentMethod: payment_method,
      paymentDate: payment_date,
      notes: notes || `Pembayaran Biaya Formulir Pendaftaran: ${reg.full_name} (${reg.registration_number})`,
      userId
    });

    // Jika lunas, update status pendaftar menjadi registration_fee_paid (atau test_ready)
    if (paymentResult.is_paid) {
      await db('psb_registrants').where({ id: reg.id }).update({
        status: 'registration_fee_paid',
        updated_at: db.fn.now()
      });

      await db('psb_status_logs').insert({
        psb_registrant_id: reg.id,
        previous_status: reg.status,
        new_status: 'registration_fee_paid',
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Kasir Keuangan',
        notes: `Biaya pendaftaran lunas dicatat dengan Kwitansi ${paymentResult.receipt_number}`,
        created_at: db.fn.now()
      });
    }

    return {
      registrant_id: reg.id,
      registration_number: reg.registration_number,
      ...paymentResult
    };
  }

  // ============================================================
  // 8. MASTER TES SELEKSI (psb_tests) & BANK SOAL (psb_test_questions)
  // ============================================================

  async listTests(processId) {
    if (!processId) {
      const error = new Error('Parameter psb_process_id wajib disertakan');
      error.statusCode = 400;
      throw error;
    }

    const tests = await db('psb_tests')
      .where({ psb_process_id: Number(processId) })
      .orderBy('id', 'asc');

    for (const t of tests) {
      const questionsCount = await db('psb_test_questions')
        .where({ psb_test_id: t.id })
        .count('id as total')
        .first();
      t.questions_count = parseInt(questionsCount?.total, 10) || 0;

      const sessionsCount = await db('psb_test_sessions')
        .where({ psb_test_id: t.id })
        .count('id as total')
        .first();
      t.scheduled_participants_count = parseInt(sessionsCount?.total, 10) || 0;

      const gradedCount = await db('psb_test_sessions')
        .where({ psb_test_id: t.id, status: 'graded' })
        .count('id as total')
        .first();
      t.graded_participants_count = parseInt(gradedCount?.total, 10) || 0;
    }

    return tests;
  }

  async getTestById(id) {
    const test = await db('psb_tests').where({ id: Number(id) }).first();
    if (!test) {
      const error = new Error('Tes seleksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const questions = await db('psb_test_questions')
      .where({ psb_test_id: test.id })
      .orderBy('order_number', 'asc');

    test.questions = questions.map(q => {
      let parsedOptions = q.options;
      if (typeof q.options === 'string') {
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (_) {
          parsedOptions = q.options;
        }
      }
      return { ...q, options: parsedOptions };
    });

    const stats = await db('psb_test_sessions')
      .where({ psb_test_id: test.id })
      .select(
        db.raw('COUNT(id) as total_sessions'),
        db.raw("SUM(CASE WHEN status = 'graded' THEN 1 ELSE 0 END) as graded_sessions"),
        db.raw("SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed_sessions"),
        db.raw("AVG(CASE WHEN status = 'graded' THEN total_score ELSE NULL END) as average_score")
      )
      .first();

    test.stats = {
      total_sessions: parseInt(stats?.total_sessions, 10) || 0,
      graded_sessions: parseInt(stats?.graded_sessions, 10) || 0,
      passed_sessions: parseInt(stats?.passed_sessions, 10) || 0,
      average_score: stats?.average_score ? Number(Number(stats.average_score).toFixed(2)) : null
    };

    return test;
  }

  async createTest(payload) {
    const {
      psb_process_id,
      name,
      test_type = 'academic',
      description = null,
      duration_minutes = 60,
      passing_score = 70.00,
      weight_percentage = 100.00,
      is_active = 1
    } = payload;

    if (!psb_process_id || !name) {
      const error = new Error('Program PSB dan nama tes seleksi wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    const [id] = await db('psb_tests').insert({
      psb_process_id: Number(psb_process_id),
      name: name.trim(),
      test_type,
      description,
      duration_minutes: Number(duration_minutes),
      passing_score: Number(passing_score),
      weight_percentage: Number(weight_percentage),
      is_active: is_active ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return await this.getTestById(id);
  }

  async updateTest(id, payload) {
    const existing = await db('psb_tests').where({ id: Number(id) }).first();
    if (!existing) {
      const error = new Error('Tes seleksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updates = { updated_at: db.fn.now() };
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.test_type !== undefined) updates.test_type = payload.test_type;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.duration_minutes !== undefined) updates.duration_minutes = Number(payload.duration_minutes);
    if (payload.passing_score !== undefined) updates.passing_score = Number(payload.passing_score);
    if (payload.weight_percentage !== undefined) updates.weight_percentage = Number(payload.weight_percentage);
    if (payload.is_active !== undefined) updates.is_active = payload.is_active ? 1 : 0;

    await db('psb_tests').where({ id: Number(id) }).update(updates);
    return await this.getTestById(id);
  }

  async deleteTest(id) {
    const existing = await db('psb_tests').where({ id: Number(id) }).first();
    if (!existing) {
      const error = new Error('Tes seleksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const sessionsCount = await db('psb_test_sessions')
      .where({ psb_test_id: Number(id) })
      .count('id as total')
      .first();

    if (parseInt(sessionsCount?.total, 10) > 0) {
      const error = new Error('Tes seleksi tidak dapat dihapus karena sudah memiliki sesi ujian peserta');
      error.statusCode = 400;
      throw error;
    }

    await db('psb_test_questions').where({ psb_test_id: Number(id) }).delete();
    await db('psb_tests').where({ id: Number(id) }).delete();

    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // BANK SOAL / RUBRIK PENILAIAN
  // ==========================================

  async listTestQuestions(testId) {
    const questions = await db('psb_test_questions')
      .where({ psb_test_id: Number(testId) })
      .orderBy('order_number', 'asc');

    return questions.map(q => {
      let parsed = q.options;
      if (typeof q.options === 'string') {
        try { parsed = JSON.parse(q.options); } catch (_) { parsed = q.options; }
      }
      return { ...q, options: parsed };
    });
  }

  async createTestQuestion(testId, payload) {
    const test = await db('psb_tests').where({ id: Number(testId) }).first();
    if (!test) {
      const error = new Error('Tes seleksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      question_type = 'multiple_choice',
      question_text,
      options = null,
      correct_answer = null,
      score_weight = 1.00,
      order_number
    } = payload;

    if (!question_text) {
      const error = new Error('Teks soal / kriteria penilaian wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    let nextOrder = order_number;
    if (!nextOrder) {
      const maxOrder = await db('psb_test_questions')
        .where({ psb_test_id: Number(testId) })
        .max('order_number as max')
        .first();
      nextOrder = (maxOrder?.max || 0) + 1;
    }

    const formattedOptions = options && typeof options === 'object' ? JSON.stringify(options) : options;

    const [id] = await db('psb_test_questions').insert({
      psb_test_id: Number(testId),
      question_type,
      question_text: question_text.trim(),
      options: formattedOptions,
      correct_answer: correct_answer ? String(correct_answer).trim() : null,
      score_weight: Number(score_weight),
      order_number: Number(nextOrder),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return await db('psb_test_questions').where({ id }).first();
  }

  async updateTestQuestion(questionId, payload) {
    const existing = await db('psb_test_questions').where({ id: Number(questionId) }).first();
    if (!existing) {
      const error = new Error('Soal / kriteria tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updates = { updated_at: db.fn.now() };
    if (payload.question_type !== undefined) updates.question_type = payload.question_type;
    if (payload.question_text !== undefined) updates.question_text = payload.question_text.trim();
    if (payload.options !== undefined) {
      updates.options = typeof payload.options === 'object' ? JSON.stringify(payload.options) : payload.options;
    }
    if (payload.correct_answer !== undefined) updates.correct_answer = payload.correct_answer;
    if (payload.score_weight !== undefined) updates.score_weight = Number(payload.score_weight);
    if (payload.order_number !== undefined) updates.order_number = Number(payload.order_number);

    await db('psb_test_questions').where({ id: Number(questionId) }).update(updates);
    return await db('psb_test_questions').where({ id: Number(questionId) }).first();
  }

  async deleteTestQuestion(questionId) {
    const existing = await db('psb_test_questions').where({ id: Number(questionId) }).first();
    if (!existing) {
      const error = new Error('Soal / kriteria tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_test_questions').where({ id: Number(questionId) }).delete();
    return { id: Number(questionId), deleted: true };
  }

  // ============================================================
  // 9. PENJADWALAN SESI TES & KARTU PESERTA UJIAN (psb_test_sessions)
  // ============================================================

  async listTestSessions(filters = {}) {
    let q = db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .join('psb_registrants', 'psb_test_sessions.psb_registrant_id', 'psb_registrants.id')
      .select(
        'psb_test_sessions.*',
        'psb_tests.name as test_name',
        'psb_tests.test_type',
        'psb_tests.duration_minutes',
        'psb_tests.passing_score',
        'psb_tests.weight_percentage',
        'psb_registrants.registration_number',
        'psb_registrants.full_name as registrant_name',
        'psb_registrants.gender',
        'psb_registrants.satuan_pendidikan_id',
        'psb_registrants.previous_school_name',
        'psb_registrants.parent_contact',
        'psb_registrants.status as registrant_status'
      );

    if (filters.psb_process_id) {
      q = q.where('psb_tests.psb_process_id', Number(filters.psb_process_id));
    }
    if (filters.psb_test_id) {
      q = q.where('psb_test_sessions.psb_test_id', Number(filters.psb_test_id));
    }
    if (filters.psb_registrant_id) {
      q = q.where('psb_test_sessions.psb_registrant_id', Number(filters.psb_registrant_id));
    }
    if (filters.status && filters.status !== 'all') {
      q = q.where('psb_test_sessions.status', filters.status);
    }
    if (filters.satuan_pendidikan_id && filters.satuan_pendidikan_id !== 'all') {
      q = q.where('psb_registrants.satuan_pendidikan_id', Number(filters.satuan_pendidikan_id));
    }
    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      q = q.where(function() {
        this.where('psb_registrants.full_name', 'like', term)
          .orWhere('psb_registrants.registration_number', 'like', term)
          .orWhere('psb_test_sessions.room_location', 'like', term)
          .orWhere('psb_test_sessions.examiner_name', 'like', term);
      });
    }

    return await q.orderBy('psb_test_sessions.scheduled_at', 'asc').orderBy('psb_test_sessions.id', 'asc');
  }

  async scheduleTestSession(payload) {
    const {
      psb_test_id,
      psb_registrant_id,
      scheduled_at,
      room_location = null,
      examiner_name = null,
      notes = null
    } = payload;

    if (!psb_test_id || !psb_registrant_id) {
      const error = new Error('Tes seleksi dan calon murid wajib dipilih');
      error.statusCode = 400;
      throw error;
    }

    const test = await db('psb_tests').where({ id: Number(psb_test_id) }).first();
    if (!test) {
      const error = new Error('Tes seleksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const reg = await db('psb_registrants').where({ id: Number(psb_registrant_id) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const existing = await db('psb_test_sessions')
      .where({
        psb_test_id: Number(psb_test_id),
        psb_registrant_id: Number(psb_registrant_id)
      })
      .first();

    if (existing) {
      await db('psb_test_sessions')
        .where({ id: existing.id })
        .update({
          scheduled_at: scheduled_at ? new Date(scheduled_at) : existing.scheduled_at,
          room_location: room_location || existing.room_location,
          examiner_name: examiner_name || existing.examiner_name,
          notes: notes || existing.notes,
          updated_at: db.fn.now()
        });
      return await db('psb_test_sessions').where({ id: existing.id }).first();
    }

    const [id] = await db('psb_test_sessions').insert({
      psb_test_id: Number(psb_test_id),
      psb_registrant_id: Number(psb_registrant_id),
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      room_location: room_location ? room_location.trim() : null,
      examiner_name: examiner_name ? examiner_name.trim() : null,
      notes: notes ? notes.trim() : null,
      status: 'scheduled',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    if (['registration_fee_paid', 'document_verified'].includes(reg.status)) {
      await db('psb_registrants').where({ id: reg.id }).update({
        status: 'tested',
        updated_at: db.fn.now()
      });
    }

    return await db('psb_test_sessions').where({ id }).first();
  }

  async bulkScheduleTestSessions(payload) {
    const {
      psb_test_id,
      registrant_ids = [],
      scheduled_at,
      room_location,
      examiner_name
    } = payload;

    if (!psb_test_id || !Array.isArray(registrant_ids) || registrant_ids.length === 0) {
      const error = new Error('Tes seleksi dan daftar calon murid wajib disertakan');
      error.statusCode = 400;
      throw error;
    }

    let scheduledCount = 0;
    for (const regId of registrant_ids) {
      try {
        await this.scheduleTestSession({
          psb_test_id,
          psb_registrant_id: regId,
          scheduled_at,
          room_location,
          examiner_name
        });
        scheduledCount++;
      } catch (err) {
        // continue
      }
    }

    return {
      psb_test_id: Number(psb_test_id),
      total_requested: registrant_ids.length,
      total_scheduled: scheduledCount
    };
  }

  async getExamCard(registrantId) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const program = await db('psb_processes').where({ id: reg.psb_process_id }).first();
    const wave = reg.psb_group_id ? await db('psb_groups').where({ id: reg.psb_group_id }).first() : null;
    const units = await crossModule.listSchoolUnits();
    const unit = units.find(u => Number(u.id) === Number(reg.satuan_pendidikan_id));

    const sessions = await db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where('psb_test_sessions.psb_registrant_id', reg.id)
      .select(
        'psb_test_sessions.id as session_id',
        'psb_test_sessions.scheduled_at',
        'psb_test_sessions.room_location',
        'psb_test_sessions.examiner_name',
        'psb_test_sessions.status as session_status',
        'psb_tests.id as test_id',
        'psb_tests.name as test_name',
        'psb_tests.test_type',
        'psb_tests.duration_minutes',
        'psb_tests.passing_score'
      )
      .orderBy('psb_test_sessions.scheduled_at', 'asc');

    return {
      exam_card_title: 'KARTU PESERTA SELEKSI PENERIMAAN SISWA BARU (PPDB)',
      academic_year: program?.target_academic_year || '2026/2027',
      program_name: program?.name,
      wave_name: wave?.name || 'Gelombang Umum',
      school_unit_name: unit?.name || 'Satuan Pendidikan Aldepos',
      school_unit_level: unit?.level,
      participant: {
        registration_number: reg.registration_number,
        full_name: reg.full_name,
        gender: reg.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        nisn: reg.nisn || '-',
        birth_place: reg.birth_place,
        birth_date: reg.birth_date,
        previous_school_name: reg.previous_school_name,
        parent_name: reg.father_name || reg.mother_name || '-',
        parent_contact: reg.parent_contact
      },
      schedule: sessions,
      instructions: [
        'Peserta hadir 15 menit sebelum ujian dimulai di lokasi yang telah ditentukan.',
        'Membawa kartu peserta ujian ini dalam bentuk cetak fisik atau digital.',
        'Membawa alat tulis dan perlengkapan ujian mandiri.',
        'Mematuhi tata tertib dan adab Islami selama di lingkungan sekolah.'
      ]
    };
  }

  // ============================================================
  // 10. PENILAIAN SELEKSI & KALKULASI SKOR KOMPOSIT
  // ============================================================

  async submitSessionScore(sessionId, payload, userId = null) {
    const session = await db('psb_test_sessions').where({ id: Number(sessionId) }).first();
    if (!session) {
      const error = new Error('Sesi ujian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const test = await db('psb_tests').where({ id: session.psb_test_id }).first();
    if (!test) {
      const error = new Error('Tes seleksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      total_score,
      examiner_name = null,
      notes = null,
      is_passed = null
    } = payload;

    if (total_score === undefined || total_score === null) {
      const error = new Error('Nilai total ujian wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    const numericScore = Number(total_score);
    const passingThreshold = Number(test.passing_score || 0);
    const finalIsPassed = is_passed !== null ? (is_passed ? 1 : 0) : (numericScore >= passingThreshold ? 1 : 0);

    await db('psb_test_sessions')
      .where({ id: session.id })
      .update({
        total_score: numericScore,
        is_passed: finalIsPassed,
        examiner_name: examiner_name ? examiner_name.trim() : session.examiner_name,
        notes: notes ? notes.trim() : session.notes,
        status: 'graded',
        submitted_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    const summary = await this.calculateRegistrantCompositeScore(session.psb_registrant_id);

    return {
      session_id: session.id,
      psb_registrant_id: session.psb_registrant_id,
      test_name: test.name,
      total_score: numericScore,
      is_passed: finalIsPassed === 1,
      status: 'graded',
      registrant_composite_score: summary.composite_score
    };
  }

  async submitSessionAnswers(sessionId, answersList = [], userId = null) {
    const session = await db('psb_test_sessions').where({ id: Number(sessionId) }).first();
    if (!session) {
      const error = new Error('Sesi ujian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const test = await db('psb_tests').where({ id: session.psb_test_id }).first();
    let calculatedTotalScore = 0;

    for (const ans of answersList) {
      const { psb_test_question_id, answer_text, is_correct, score_awarded } = ans;
      const question = await db('psb_test_questions').where({ id: Number(psb_test_question_id) }).first();

      let awarded = Number(score_awarded || 0);
      let correct = is_correct !== undefined ? (is_correct ? 1 : 0) : null;

      if (question && question.correct_answer && answer_text) {
        if (question.correct_answer.trim().toLowerCase() === String(answer_text).trim().toLowerCase()) {
          correct = 1;
          if (score_awarded === undefined) {
            awarded = Number(question.score_weight || 1);
          }
        } else if (correct === null) {
          correct = 0;
        }
      }

      calculatedTotalScore += awarded;

      const existingAns = await db('psb_test_answers')
        .where({
          psb_test_session_id: session.id,
          psb_test_question_id: Number(psb_test_question_id)
        })
        .first();

      if (existingAns) {
        await db('psb_test_answers')
          .where({ id: existingAns.id })
          .update({
            answer_text: answer_text ? String(answer_text) : existingAns.answer_text,
            is_correct: correct,
            score_awarded: awarded,
            updated_at: db.fn.now()
          });
      } else {
        await db('psb_test_answers').insert({
          psb_test_session_id: session.id,
          psb_test_question_id: Number(psb_test_question_id),
          answer_text: answer_text ? String(answer_text) : null,
          is_correct: correct,
          score_awarded: awarded,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    const passingThreshold = Number(test?.passing_score || 0);
    const isPassed = calculatedTotalScore >= passingThreshold ? 1 : 0;

    await db('psb_test_sessions')
      .where({ id: session.id })
      .update({
        total_score: calculatedTotalScore,
        is_passed: isPassed,
        status: 'graded',
        submitted_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    const summary = await this.calculateRegistrantCompositeScore(session.psb_registrant_id);

    return {
      session_id: session.id,
      total_score: calculatedTotalScore,
      is_passed: isPassed === 1,
      registrant_composite_score: summary.composite_score
    };
  }

  async calculateRegistrantCompositeScore(registrantId) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) return { composite_score: null, all_passed: false };

    const tests = await db('psb_tests')
      .where({ psb_process_id: reg.psb_process_id, is_active: 1 });

    const sessions = await db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where('psb_test_sessions.psb_registrant_id', reg.id)
      .select('psb_test_sessions.*', 'psb_tests.weight_percentage', 'psb_tests.passing_score', 'psb_tests.name as test_name');

    if (sessions.length === 0) {
      return { composite_score: null, all_passed: false, graded_count: 0, total_tests: tests.length };
    }

    let weightedSum = 0;
    let weightSum = 0;
    let allPassed = true;
    let gradedCount = 0;

    for (const s of sessions) {
      if (s.status === 'graded' && s.total_score !== null) {
        gradedCount++;
        const weight = Number(s.weight_percentage || 100);
        weightedSum += Number(s.total_score) * (weight / 100);
        weightSum += (weight / 100);

        if (!s.is_passed) {
          allPassed = false;
        }
      } else {
        allPassed = false;
      }
    }

    const compositeScore = weightSum > 0 ? Number((weightedSum / weightSum).toFixed(2)) : null;

    if (compositeScore !== null) {
      await db('psb_registrants').where({ id: reg.id }).update({
        final_selection_score: compositeScore,
        updated_at: db.fn.now()
      });
    }

    return {
      registrant_id: reg.id,
      composite_score: compositeScore,
      all_passed: allPassed && gradedCount === tests.length,
      graded_count: gradedCount,
      total_tests: tests.length,
      sessions
    };
  }

  async getRegistrantSelectionSummary(registrantId) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const calculation = await this.calculateRegistrantCompositeScore(reg.id);

    return {
      registrant: {
        id: reg.id,
        registration_number: reg.registration_number,
        full_name: reg.full_name,
        gender: reg.gender,
        satuan_pendidikan_id: reg.satuan_pendidikan_id,
        current_status: reg.status,
        selection_decision: reg.selection_decision,
        decision_letter_number: reg.decision_letter_number,
        announcement_notes: reg.announcement_notes
      },
      ...calculation
    };
  }

  // ============================================================
  // 11. PENGUMUMAN HASIL KELULUSAN & KEPUTUSAN SELEKSI
  // ============================================================

  async listAnnouncements(schoolUnitId, filters = {}) {
    let q = db('psb_registrants');

    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      q = q.where('psb_registrants.satuan_pendidikan_id', validUnitId);
    }
    if (filters.psb_process_id) {
      q = q.where('psb_registrants.psb_process_id', Number(filters.psb_process_id));
    }
    if (filters.psb_group_id) {
      q = q.where('psb_registrants.psb_group_id', Number(filters.psb_group_id));
    }
    if (filters.decision && filters.decision !== 'all') {
      q = q.where('psb_registrants.selection_decision', filters.decision);
    }
    if (filters.status && filters.status !== 'all') {
      q = q.where('psb_registrants.status', filters.status);
    }
    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      q = q.where(function() {
        this.where('psb_registrants.full_name', 'like', term)
          .orWhere('psb_registrants.registration_number', 'like', term)
          .orWhere('psb_registrants.previous_school_name', 'like', term);
      });
    }

    const registrants = await q
      .orderByRaw('psb_registrants.final_selection_score IS NULL ASC, psb_registrants.final_selection_score DESC')
      .orderBy('psb_registrants.registration_number', 'asc');

    const stats = {
      total_candidates: registrants.length,
      total_accepted: registrants.filter(r => r.selection_decision === 'accepted' || r.status === 'accepted').length,
      total_waitlisted: registrants.filter(r => r.selection_decision === 'waitlisted' || r.status === 'waitlisted').length,
      total_rejected: registrants.filter(r => r.selection_decision === 'rejected' || r.status === 'rejected').length,
      total_pending: registrants.filter(r => !r.selection_decision).length
    };

    return {
      stats,
      candidates: registrants.map((r, index) => ({
        rank: index + 1,
        id: r.id,
        registration_number: r.registration_number,
        nisn: r.nisn,
        full_name: r.full_name,
        gender: r.gender,
        satuan_pendidikan_id: r.satuan_pendidikan_id,
        previous_school_name: r.previous_school_name,
        parent_contact: r.parent_contact,
        final_selection_score: r.final_selection_score ? Number(r.final_selection_score) : null,
        selection_decision: r.selection_decision || 'pending',
        selection_decided_at: r.selection_decided_at,
        decision_letter_number: r.decision_letter_number,
        announcement_notes: r.announcement_notes,
        status: r.status
      }))
    };
  }

  async decideSelectionResults(payload, userId = null) {
    let decisionItems = [];

    if (Array.isArray(payload.decisions)) {
      decisionItems = payload.decisions;
    } else if (Array.isArray(payload.registrant_ids) && payload.decision) {
      decisionItems = payload.registrant_ids.map(id => ({
        registrant_id: id,
        decision: payload.decision,
        decision_letter_number: payload.decision_letter_number || null,
        notes: payload.announcement_notes || payload.notes || null
      }));
    } else {
      const error = new Error('Format keputusan seleksi tidak valid. Sertakan decisions atau registrant_ids + decision');
      error.statusCode = 400;
      throw error;
    }

    const allowedDecisions = ['accepted', 'waitlisted', 'rejected'];
    const results = [];

    for (const item of decisionItems) {
      const { registrant_id, decision, decision_letter_number, notes } = item;

      if (!allowedDecisions.includes(decision)) {
        continue;
      }

      const reg = await db('psb_registrants').where({ id: Number(registrant_id) }).first();
      if (!reg) continue;

      const previousStatus = reg.status;
      const letterNo = decision_letter_number || `SKL-PSB-${reg.satuan_pendidikan_id || '01'}-${String(reg.id).padStart(4, '0')}`;

      await db('psb_registrants').where({ id: reg.id }).update({
        status: decision,
        selection_decision: decision,
        selection_decided_at: db.fn.now(),
        decision_letter_number: letterNo,
        announcement_notes: notes || (decision === 'accepted' ? 'Selamat, Anda dinyatakan Diterima.' : 'Keputusan hasil seleksi panitia PSB.'),
        updated_at: db.fn.now()
      });

      await db('psb_status_logs').insert({
        psb_registrant_id: reg.id,
        previous_status: previousStatus,
        new_status: decision,
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Panitia Seleksi PSB',
        notes: `Rilis Keputusan Seleksi: ${decision.toUpperCase()} (SK: ${letterNo})`,
        created_at: db.fn.now()
      });

      results.push({
        registrant_id: reg.id,
        registration_number: reg.registration_number,
        full_name: reg.full_name,
        decision,
        decision_letter_number: letterNo
      });
    }

    return {
      total_decided: results.length,
      decisions: results
    };
  }

  async getDecisionLetter(registrantId) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (!reg.selection_decision) {
      const error = new Error('Hasil seleksi untuk calon murid ini belum diumumkan');
      error.statusCode = 400;
      throw error;
    }

    const program = await db('psb_processes').where({ id: reg.psb_process_id }).first();
    const units = await crossModule.listSchoolUnits();
    const unit = units.find(u => Number(u.id) === Number(reg.satuan_pendidikan_id));

    const isAccepted = reg.selection_decision === 'accepted';
    const letterDate = reg.selection_decided_at ? new Date(reg.selection_decided_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return {
      letter_header: {
        organization: 'YAYASAN ALDEPOS SALIMAH INDONESIA',
        school_unit: unit?.name || 'Satuan Pendidikan Aldepos',
        level: unit?.level,
        address: 'Jl. Raya Aldepos, Bogor, Jawa Barat',
        academic_year: program?.target_academic_year || '2026/2027'
      },
      letter_meta: {
        letter_number: reg.decision_letter_number || `SKL-PSB-${reg.id}`,
        letter_date: letterDate,
        subject: 'SURAT KEPUTUSAN HASIL SELEKSI PENERIMAAN SISWA BARU (PPDB)'
      },
      candidate: {
        registration_number: reg.registration_number,
        full_name: reg.full_name,
        nisn: reg.nisn || '-',
        gender: reg.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        birth_place_date: `${reg.birth_place || '-'}, ${reg.birth_date ? new Date(reg.birth_date).toLocaleDateString('id-ID') : '-'}`,
        previous_school: reg.previous_school_name,
        parent_name: reg.father_name || reg.mother_name || '-'
      },
      evaluation: {
        composite_score: reg.final_selection_score ? Number(reg.final_selection_score) : null,
        decision: reg.selection_decision,
        decision_label: isAccepted ? 'DITERIMA (LULUS)' : (reg.selection_decision === 'waitlisted' ? 'CADANGAN' : 'TIDAK DITERIMA'),
        announcement_notes: reg.announcement_notes
      },
      next_steps: isAccepted ? [
        'Melakukan konfirmasi penerimaan dan melengkapi berkas administrasi lanjutan.',
        'Melakukan pembayaran Uang Pangkal / Biaya Masuk sesuai dengan mekanisme skema biaya Keuangan.',
        'Mengikuti kegiatan Masa Pengenalan Lingkungan Sekolah (MPLS) sesuai jadwal yang ditetapkan.'
      ] : [
        'Bagi calon santri berstatus Cadangan, panitia akan menghubungi kembali apabila terdapat kuota yang belum terpenuhi.'
      ]
    };
  }

  // ============================================================
  // 12. TAGIHAN UANG PANGKAL & PEMBAYARAN (ppdb_registration_bills)
  // ============================================================

  async createEnrollmentFeeBill(registrantId, payload = {}, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (reg.status !== 'accepted' && reg.selection_decision !== 'accepted') {
      const error = new Error('Tagihan uang pangkal hanya dapat diterbitkan untuk calon murid yang telah DITERIMA (LULUS)');
      error.statusCode = 400;
      throw error;
    }

    const program = await db('psb_processes').where({ id: reg.psb_process_id }).first();

    const bill = await crossModule.createEnrollmentFeeBill({
      schoolUnitId: reg.satuan_pendidikan_id,
      registrantId: reg.id,
      targetAcademicYearId: program?.target_academic_year_id || 1,
      feeSchemeId: payload.fee_scheme_id || reg.fee_group_id,
      customAmount: payload.amount,
      registrantName: reg.full_name,
      registrationNumber: reg.registration_number,
      dueDate: payload.due_date,
      userId
    });

    return bill;
  }

  async getEnrollmentFeeBill(registrantId) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const bill = await crossModule.getEnrollmentFeeBill(reg.id);
    if (!bill) {
      const error = new Error('Tagihan uang pangkal belum diterbitkan untuk calon murid ini');
      error.statusCode = 404;
      throw error;
    }

    return bill;
  }

  async payEnrollmentFeeBill(registrantId, payload, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const bill = await crossModule.getEnrollmentFeeBill(reg.id);
    if (!bill) {
      const error = new Error('Tagihan uang pangkal tidak ditemukan di Keuangan');
      error.statusCode = 404;
      throw error;
    }

    const { cash_account_id, amount_paid, payment_method = 'cash', payment_date, notes } = payload;
    const paymentResult = await crossModule.recordEnrollmentFeePayment({
      billId: bill.id,
      schoolUnitId: reg.satuan_pendidikan_id,
      cashAccountId: cash_account_id,
      amountPaid: amount_paid || bill.remaining_balance || bill.amount,
      paymentMethod: payment_method,
      paymentDate: payment_date,
      notes: notes || `Pembayaran Uang Pangkal PPDB: ${reg.full_name} (${reg.registration_number})`,
      userId
    });

    // Jika lunas (atau mencapai pelunasan), update status calon murid menjadi 'enrolled'
    if (paymentResult.is_paid) {
      await db('psb_registrants').where({ id: reg.id }).update({
        status: 'enrolled',
        updated_at: db.fn.now()
      });

      await db('psb_status_logs').insert({
        psb_registrant_id: reg.id,
        previous_status: reg.status,
        new_status: 'enrolled',
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Kasir Keuangan',
        notes: `Uang pangkal lunas dicatat dengan Kwitansi ${paymentResult.receipt_number}. Siap penempatan rombel.`,
        created_at: db.fn.now()
      });
    }

    return {
      registrant_id: reg.id,
      registration_number: reg.registration_number,
      ...paymentResult
    };
  }

  // ============================================================
  // 13. KUOTA & PENEMPATAN SISWA KE ROMBEL KELAS (AKADEMIK)
  // ============================================================

  async checkClassQuota(classGroupId, processId = null, gender = null) {
    return await crossModule.checkClassGroupQuota(classGroupId, processId, gender);
  }

  async placeRegistrantInClass(registrantId, payload, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Calon murid harus sudah accepted, enrolled, atau prospective_student
    const allowedStatuses = ['accepted', 'enrolled', 'prospective_student', 'placed'];
    if (!allowedStatuses.includes(reg.status)) {
      const error = new Error(`Calon murid berstatus "${reg.status}" belum dapat ditempatkan ke rombel. Status harus "accepted", "enrolled", atau "prospective_student".`);
      error.statusCode = 400;
      throw error;
    }

    const { class_group_id, academic_year_id, custom_nipd, notes } = payload;
    if (!class_group_id) {
      const error = new Error('Rombel kelas tujuan penempatan wajib dipilih');
      error.statusCode = 400;
      throw error;
    }

    const program = await db('psb_processes').where({ id: reg.psb_process_id }).first();
    const targetAyId = academic_year_id || program?.target_academic_year_id || 1;

    const previousStatus = reg.status;
    const placementResult = await crossModule.enrollAndPlaceStudent({
      registrantId: reg.id,
      classGroupId: Number(class_group_id),
      academicYearId: targetAyId,
      placedBy: userId ? `User ID ${userId}` : 'Panitia PSB',
      customNipd: custom_nipd || null,
      notes: notes || null
    });

    // Catat log status
    await db('psb_status_logs').insert({
      psb_registrant_id: reg.id,
      previous_status: previousStatus,
      new_status: 'placed',
      action_by_user_id: userId ? Number(userId) : null,
      action_by_name: 'Panitia PSB / Bagian Akademik',
      notes: `Siswa resmi ditempatkan di rombel ${placementResult.class_group_name} dengan NIPD ${placementResult.nipd}`,
      created_at: db.fn.now()
    });

    return placementResult;
  }

  async listPlacements(schoolUnitId, filters = {}) {
    let q = db('psb_placement_logs')
      .join('psb_registrants', 'psb_placement_logs.psb_registrant_id', 'psb_registrants.id')
      .join('class_groups', 'psb_placement_logs.class_group_id', 'class_groups.id')
      .select(
        'psb_placement_logs.*',
        'psb_registrants.registration_number',
        'psb_registrants.full_name as student_name',
        'psb_registrants.gender',
        'psb_registrants.satuan_pendidikan_id',
        'psb_registrants.placed_student_id',
        'class_groups.name as class_group_name',
        'class_groups.type as class_group_type'
      );

    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      q = q.where('psb_registrants.satuan_pendidikan_id', validUnitId);
    }
    if (filters.class_group_id) {
      q = q.where('psb_placement_logs.class_group_id', Number(filters.class_group_id));
    }
    if (filters.academic_year_id) {
      q = q.where('psb_placement_logs.academic_year_id', Number(filters.academic_year_id));
    }
    if (filters.psb_process_id) {
      q = q.where('psb_registrants.psb_process_id', Number(filters.psb_process_id));
    }
    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      q = q.where(function() {
        this.where('psb_registrants.full_name', 'like', term)
          .orWhere('psb_registrants.registration_number', 'like', term)
          .orWhere('psb_placement_logs.nipd', 'like', term);
      });
    }

    return await q.orderBy('psb_placement_logs.placed_at', 'desc');
  }

  // ============================================================
  // 14. KEBIJAKAN REFUND (psb_refund_policies)
  // ============================================================

  async listRefundPolicies(schoolUnitId, processId = null) {
    let q = db('psb_refund_policies');
    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      q = q.where(function() {
        this.where('satuan_pendidikan_id', validUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    if (processId) {
      q = q.where(function() {
        this.where('psb_process_id', Number(processId)).orWhereNull('psb_process_id');
      });
    }

    return await q.orderBy('fee_category', 'asc').orderBy('days_before_cutoff', 'desc');
  }

  async getRefundPolicyById(id) {
    const policy = await db('psb_refund_policies').where({ id: Number(id) }).first();
    if (!policy) {
      const error = new Error('Kebijakan refund tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return policy;
  }

  async createRefundPolicy(payload) {
    const {
      satuan_pendidikan_id,
      psb_process_id = null,
      fee_category = 'enrollment_fee',
      days_before_cutoff = 0,
      refund_percentage = 0.00,
      admin_fee_deduction = 0.00,
      description = null,
      is_active = 1
    } = payload;

    if (!satuan_pendidikan_id) {
      const error = new Error('Satuan pendidikan wajib ditentukan');
      error.statusCode = 400;
      throw error;
    }

    const [id] = await db('psb_refund_policies').insert({
      satuan_pendidikan_id: Number(satuan_pendidikan_id),
      psb_process_id: psb_process_id ? Number(psb_process_id) : null,
      fee_category,
      days_before_cutoff: Number(days_before_cutoff),
      refund_percentage: Number(refund_percentage),
      admin_fee_deduction: Number(admin_fee_deduction),
      description: description ? description.trim() : null,
      is_active: is_active ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return await this.getRefundPolicyById(id);
  }

  async updateRefundPolicy(id, payload) {
    const existing = await db('psb_refund_policies').where({ id: Number(id) }).first();
    if (!existing) {
      const error = new Error('Kebijakan refund tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updates = { updated_at: db.fn.now() };
    if (payload.fee_category !== undefined) updates.fee_category = payload.fee_category;
    if (payload.days_before_cutoff !== undefined) updates.days_before_cutoff = Number(payload.days_before_cutoff);
    if (payload.refund_percentage !== undefined) updates.refund_percentage = Number(payload.refund_percentage);
    if (payload.admin_fee_deduction !== undefined) updates.admin_fee_deduction = Number(payload.admin_fee_deduction);
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active ? 1 : 0;

    await db('psb_refund_policies').where({ id: Number(id) }).update(updates);
    return await this.getRefundPolicyById(id);
  }

  async deleteRefundPolicy(id) {
    const existing = await db('psb_refund_policies').where({ id: Number(id) }).first();
    if (!existing) {
      const error = new Error('Kebijakan refund tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('psb_refund_policies').where({ id: Number(id) }).delete();
    return { id: Number(id), deleted: true };
  }

  // ============================================================
  // 15. MESIN ESTIMASI REFUND & PENGUNDURAN DIRI (psb_withdrawals)
  // ============================================================

  async calculateRefundEstimate(registrantId, withdrawalDate = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const program = await db('psb_processes').where({ id: reg.psb_process_id }).first();
    const enrollmentBill = await crossModule.getEnrollmentFeeBill(reg.id);
    const registrationBill = await crossModule.getRegistrationFeeBill(reg.id);

    const enrollmentPaid = Number(enrollmentBill?.paid_amount || 0);
    const registrationPaid = Number(registrationBill?.paid_amount || 0);
    const totalPaid = enrollmentPaid + registrationPaid;

    // Hitung sisa hari menuju cutoff (menggunakan start_date program atau 1 Juli tahun berikutnya)
    const targetYear = program?.target_academic_year ? parseInt(program.target_academic_year.slice(0, 4), 10) : new Date().getFullYear();
    const cutoffDateStr = program?.start_date || `${targetYear}-07-15`;
    const cutoffDate = new Date(cutoffDateStr);
    const wDate = withdrawalDate ? new Date(withdrawalDate) : new Date();

    const diffMs = cutoffDate.getTime() - wDate.getTime();
    const daysBeforeCutoff = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Cari kebijakan refund aktif yang paling relevan
    const policies = await db('psb_refund_policies')
      .where({
        satuan_pendidikan_id: reg.satuan_pendidikan_id,
        fee_category: 'enrollment_fee',
        is_active: 1
      })
      .orderBy('days_before_cutoff', 'desc');

    let matchedPolicy = null;
    for (const p of policies) {
      if (daysBeforeCutoff >= p.days_before_cutoff) {
        matchedPolicy = p;
        break;
      }
    }

    // Default jika belum ada kebijakan terdaftar
    let refundPercentage = 0;
    let adminDeduction = 0;
    let policyDesc = 'Standar aturan umum';

    if (matchedPolicy) {
      refundPercentage = Number(matchedPolicy.refund_percentage);
      adminDeduction = Number(matchedPolicy.admin_fee_deduction);
      policyDesc = matchedPolicy.description || `Aturan ${matchedPolicy.days_before_cutoff}+ hari`;
    } else {
      if (daysBeforeCutoff >= 30) {
        refundPercentage = 80.00;
        adminDeduction = 250000.00;
        policyDesc = 'Pengunduran diri > 30 hari sebelum tahun ajaran (Refund 80% potongan admin Rp 250rb)';
      } else if (daysBeforeCutoff >= 14) {
        refundPercentage = 50.00;
        adminDeduction = 500000.00;
        policyDesc = 'Pengunduran diri 14-29 hari sebelum tahun ajaran (Refund 50% potongan admin Rp 500rb)';
      } else {
        refundPercentage = 0.00;
        adminDeduction = 0.00;
        policyDesc = 'Pengunduran diri kurang dari 14 hari (Dana tidak dapat dikembalikan / Hangus)';
      }
    }

    // Uang pendaftaran bersifat non-refundable sesuai ketentuan yayasan
    const grossRefund = enrollmentPaid * (refundPercentage / 100);
    const estimatedRefund = Math.max(0, grossRefund - adminDeduction);

    return {
      registrant_id: reg.id,
      full_name: reg.full_name,
      registration_number: reg.registration_number,
      financials: {
        registration_fee_paid: registrationPaid,
        registration_fee_refundable: false,
        enrollment_fee_paid: enrollmentPaid,
        enrollment_fee_refundable: true,
        total_paid: totalPaid
      },
      cutoff_evaluation: {
        cutoff_date: cutoffDateStr,
        withdrawal_date: wDate.toISOString().slice(0, 10),
        days_remaining: daysBeforeCutoff,
        policy_description: policyDesc
      },
      refund_calculation: {
        refund_percentage: refundPercentage,
        gross_refund_amount: Number(grossRefund.toFixed(2)),
        admin_fee_deduction: adminDeduction,
        estimated_refund_amount: Number(estimatedRefund.toFixed(2))
      }
    };
  }

  async submitWithdrawal(registrantId, payload, userId = null) {
    const reg = await db('psb_registrants').where({ id: Number(registrantId) }).first();
    if (!reg) {
      const error = new Error('Data calon murid tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const {
      withdrawal_date,
      reason_category = 'lainnya',
      reason_detail = null,
      supporting_doc_url = null,
      refund_requested = false,
      refund_amount = 0,
      refund_bank_name = null,
      refund_account_number = null,
      refund_account_holder = null
    } = payload;

    const validReasons = ['negeri', 'ekonomi', 'domisili', 'kesehatan', 'pondok', 'lainnya'];
    const chosenReason = validReasons.includes(reason_category) ? reason_category : 'lainnya';

    const previousStatus = reg.status;
    const wDate = withdrawal_date || new Date().toISOString().slice(0, 10);

    const [id] = await db('psb_withdrawals').insert({
      psb_registrant_id: reg.id,
      satuan_pendidikan_id: reg.satuan_pendidikan_id,
      withdrawal_date: wDate,
      reason_category: chosenReason,
      reason_detail: reason_detail ? reason_detail.trim() : null,
      supporting_doc_url: supporting_doc_url ? supporting_doc_url.trim() : null,
      refund_requested: refund_requested ? 1 : 0,
      refund_amount: refund_requested ? Number(refund_amount || 0) : 0.00,
      refund_bank_name: refund_bank_name ? refund_bank_name.trim() : null,
      refund_account_number: refund_account_number ? refund_account_number.trim() : null,
      refund_account_holder: refund_account_holder ? refund_account_holder.trim() : null,
      status: 'submitted',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Perbarui status pendaftar menjadi withdrawn
    await db('psb_registrants').where({ id: reg.id }).update({
      status: 'withdrawn',
      updated_at: db.fn.now()
    });

    // Sinkronkan ke tagihan Keuangan jika ada pengajuan refund
    if (refund_requested) {
      await crossModule.updateBillRefundStatus(reg.id, 'requested', refund_amount, {
        bank_name: refund_bank_name,
        account_number: refund_account_number,
        account_holder: refund_account_holder,
        reason: reason_detail
      });
    }

    // Catat riwayat status log
    await db('psb_status_logs').insert({
      psb_registrant_id: reg.id,
      previous_status: previousStatus,
      new_status: 'withdrawn',
      action_by_user_id: userId ? Number(userId) : null,
      action_by_name: 'Panitia PSB / Orang Tua',
      notes: `Pengajuan pengunduran diri karena ${chosenReason.toUpperCase()}: ${reason_detail || '-'} (Refund Diajukan: Rp ${Number(refund_amount || 0).toLocaleString('id-ID')})`,
      created_at: db.fn.now()
    });

    return await this.getWithdrawalById(id);
  }

  async listWithdrawals(schoolUnitId, filters = {}) {
    let q = db('psb_withdrawals')
      .join('psb_registrants', 'psb_withdrawals.psb_registrant_id', 'psb_registrants.id')
      .select(
        'psb_withdrawals.*',
        'psb_registrants.registration_number',
        'psb_registrants.full_name as registrant_name',
        'psb_registrants.gender',
        'psb_registrants.parent_contact',
        'psb_registrants.previous_school_name',
        'psb_registrants.placed_student_id',
        'psb_registrants.placed_class_group_id'
      );

    const validUnitId = normalizeUnitId(schoolUnitId);
    if (validUnitId) {
      q = q.where('psb_withdrawals.satuan_pendidikan_id', validUnitId);
    }
    if (filters.status && filters.status !== 'all') {
      q = q.where('psb_withdrawals.status', filters.status);
    }
    if (filters.reason_category && filters.reason_category !== 'all') {
      q = q.where('psb_withdrawals.reason_category', filters.reason_category);
    }
    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      q = q.where(function() {
        this.where('psb_registrants.full_name', 'like', term)
          .orWhere('psb_registrants.registration_number', 'like', term)
          .orWhere('psb_withdrawals.refund_account_holder', 'like', term);
      });
    }

    const items = await q.orderBy('psb_withdrawals.created_at', 'desc');

    const stats = {
      total_submissions: items.length,
      total_approved: items.filter(w => w.status === 'approved').length,
      total_processed: items.filter(w => w.status === 'processed').length,
      total_rejected: items.filter(w => w.status === 'rejected').length,
      total_refund_amount_processed: items
        .filter(w => w.status === 'processed')
        .reduce((sum, w) => sum + Number(w.refund_amount || 0), 0)
    };

    return { stats, withdrawals: items };
  }

  async getWithdrawalById(id) {
    const item = await db('psb_withdrawals')
      .join('psb_registrants', 'psb_withdrawals.psb_registrant_id', 'psb_registrants.id')
      .where('psb_withdrawals.id', Number(id))
      .select(
        'psb_withdrawals.*',
        'psb_registrants.registration_number',
        'psb_registrants.full_name as registrant_name',
        'psb_registrants.gender',
        'psb_registrants.parent_contact',
        'psb_registrants.previous_school_name',
        'psb_registrants.placed_student_id',
        'psb_registrants.placed_class_group_id'
      )
      .first();

    if (!item) {
      const error = new Error('Pengajuan pengunduran diri tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    item.enrollment_bill = await crossModule.getEnrollmentFeeBill(item.psb_registrant_id);
    item.registration_bill = await crossModule.getRegistrationFeeBill(item.psb_registrant_id);

    return item;
  }

  async reviewWithdrawal(id, payload, userId = null) {
    const item = await db('psb_withdrawals').where({ id: Number(id) }).first();
    if (!item) {
      const error = new Error('Pengajuan pengunduran diri tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { action, rejection_reason = null } = payload;
    if (!['approve', 'reject'].includes(action)) {
      const error = new Error('Aksi review tidak valid. Gunakan "approve" atau "reject"');
      error.statusCode = 400;
      throw error;
    }

    const reg = await db('psb_registrants').where({ id: item.psb_registrant_id }).first();

    if (action === 'approve') {
      await db('psb_withdrawals').where({ id: item.id }).update({
        status: 'approved',
        approved_by: userId ? Number(userId) : null,
        approved_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // Lepaskan penempatan rombel jika siswa sebelumnya sudah ditempatkan
      if (reg && reg.placed_student_id) {
        await crossModule.releaseClassPlacement(reg.placed_student_id, reg.placed_class_group_id);
      }

      // Update status refund di Keuangan
      await crossModule.updateBillRefundStatus(item.psb_registrant_id, 'approved', item.refund_amount, {
        approved_by: userId
      });

      await db('psb_status_logs').insert({
        psb_registrant_id: item.psb_registrant_id,
        previous_status: reg?.status || 'withdrawn',
        new_status: 'withdrawn',
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Pimpinan / Panitia PPDB',
        notes: `Pengunduran diri disetujui. Refund Rp ${Number(item.refund_amount).toLocaleString('id-ID')} siap dicairkan. Kuota rombel telah dilepaskan.`,
        created_at: db.fn.now()
      });
    } else {
      await db('psb_withdrawals').where({ id: item.id }).update({
        status: 'rejected',
        rejection_reason: rejection_reason ? rejection_reason.trim() : 'Ditolak oleh pimpinan',
        updated_at: db.fn.now()
      });

      await crossModule.updateBillRefundStatus(item.psb_registrant_id, 'rejected');

      await db('psb_status_logs').insert({
        psb_registrant_id: item.psb_registrant_id,
        previous_status: reg?.status || 'withdrawn',
        new_status: reg?.status || 'withdrawn',
        action_by_user_id: userId ? Number(userId) : null,
        action_by_name: 'Pimpinan / Panitia PPDB',
        notes: `Pengajuan pengunduran diri / refund ditolak: ${rejection_reason || '-'}`,
        created_at: db.fn.now()
      });
    }

    return await this.getWithdrawalById(item.id);
  }

  async disburseRefund(id, payload, userId = null) {
    const item = await db('psb_withdrawals').where({ id: Number(id) }).first();
    if (!item) {
      const error = new Error('Pengajuan pengunduran diri tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (item.status !== 'approved') {
      const error = new Error(`Pengembalian dana belum dapat dicairkan karena status pengajuan saat ini adalah "${item.status}". Status harus "approved".`);
      error.statusCode = 400;
      throw error;
    }

    const {
      cash_account_id,
      disbursement_date,
      proof_number,
      notes
    } = payload;

    const reg = await db('psb_registrants').where({ id: item.psb_registrant_id }).first();

    const disbursementResult = await crossModule.recordRefundDisbursementInKeuangan({
      registrantId: item.psb_registrant_id,
      schoolUnitId: item.satuan_pendidikan_id,
      cashAccountId: cash_account_id || 1,
      amount: item.refund_amount,
      recipientName: item.refund_account_holder || reg?.full_name,
      proofNumber: proof_number,
      disbursementDate: disbursement_date,
      notes: notes || `Pencairan Refund Pengunduran Diri: ${reg?.full_name} (${item.refund_bank_name} ${item.refund_account_number})`
    });

    // Update status psb_withdrawals menjadi processed
    await db('psb_withdrawals').where({ id: item.id }).update({
      status: 'processed',
      processed_by: userId ? Number(userId) : null,
      processed_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    await db('psb_status_logs').insert({
      psb_registrant_id: item.psb_registrant_id,
      previous_status: 'withdrawn',
      new_status: 'withdrawn',
      action_by_user_id: userId ? Number(userId) : null,
      action_by_name: 'Kasir / Bendahara Keuangan',
      notes: `Pengembalian dana (refund) sebesar Rp ${Number(item.refund_amount).toLocaleString('id-ID')} telah berhasil ditransfer via Bukti ${disbursementResult.proof_number}`,
      created_at: db.fn.now()
    });

    return {
      withdrawal_id: item.id,
      status: 'processed',
      refund_amount: Number(item.refund_amount),
      ...disbursementResult
    };
  }

  // ============================================================
  // 16. LOOKUP DATA LINTAS MODUL (AKADEMIK, KEUANGAN, CORE)
  // ============================================================

  async getAcademicYearsLookup(schoolUnitId) {
    return await crossModule.listAcademicYears({ satuan_pendidikan_id: schoolUnitId });
  }

  async getClassGroupsLookup(schoolUnitId, academicYearId = null) {
    return await crossModule.listClassGroups(schoolUnitId, academicYearId);
  }

  async getFeeSchemesLookup(schoolUnitId, academicYearId = null) {
    return await crossModule.listFeeSchemes(schoolUnitId, academicYearId);
  }

  async getCashAccountsLookup(schoolUnitId) {
    return await crossModule.listCashAccounts(schoolUnitId);
  }

  async getSchoolUnitsLookup() {
    return await crossModule.listSchoolUnits();
  }
}

module.exports = new PsbService();
