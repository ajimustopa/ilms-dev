/**
 * Report Cards Service Implementation
 * Modul Akademik - Fitur: Rapor Siswa, Catatan Wali Kelas,
 * Materialisasi Nilai Akhir per Mapel (report_card_subject_scores),
 * Input Manual & Impor Excel Riwayat Rapor Lampau.
 */
const db = require('../../../config/db/akademik');
const studentsService = require('../students/service');
const XLSX = require('xlsx');

class ReportCardsService {
  async listReportCards(query = {}) {
    let baseQuery = db('report_cards')
      .join('students', 'report_cards.student_id', 'students.id')
      .join('semesters', 'report_cards.semester_id', 'semesters.id')
      .leftJoin('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .select(
        'report_cards.*',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'semesters.name as semester_name',
        'academic_years.name as academic_year_name'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('report_cards.student_id', query.student_id);
    }
    if (query.semester_id) {
      baseQuery = baseQuery.where('report_cards.semester_id', query.semester_id);
    }
    if (query.data_source) {
      baseQuery = baseQuery.where('report_cards.data_source', query.data_source);
    }
    if (query.is_legacy !== undefined) {
      baseQuery = baseQuery.where('report_cards.is_legacy', query.is_legacy ? 1 : 0);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.whereIn('report_cards.student_id', function () {
        this.select('student_id').from('student_class_enrollments').where('class_group_id', query.class_group_id);
      });
    }

    return baseQuery.orderBy('report_cards.id', 'desc');
  }

  async getReportCardById(id) {
    const report = await db('report_cards')
      .join('students', 'report_cards.student_id', 'students.id')
      .join('semesters', 'report_cards.semester_id', 'semesters.id')
      .leftJoin('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .where('report_cards.id', id)
      .select(
        'report_cards.*',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'semesters.name as semester_name',
        'academic_years.name as academic_year_name'
      )
      .first();

    if (!report) {
      const error = new Error('Rapor tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Ambil nilai akhir per mapel dari tabel materialisasi report_card_subject_scores
    let materializedScores = await db('report_card_subject_scores')
      .join('subjects', 'report_card_subject_scores.subject_id', 'subjects.id')
      .where('report_card_subject_scores.report_card_id', report.id)
      .select(
        'report_card_subject_scores.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      )
      .orderBy('subjects.name', 'asc');

    // 2. Ambil nilai seluruh mapel semester terkait dari student_scores
    const rawScores = await db('student_scores')
      .join('subjects', 'student_scores.subject_id', 'subjects.id')
      .where({
        'student_scores.student_id': report.student_id,
        'student_scores.semester_id': report.semester_id
      })
      .select(
        'student_scores.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'subjects.kkm'
      );

    // 3. Ambil rincian capaian Tujuan Pembelajaran (TP)
    const tpScores = await db('student_tp_scores')
      .join('learning_objectives', 'student_tp_scores.learning_objective_id', 'learning_objectives.id')
      .join('subjects', 'student_tp_scores.subject_id', 'subjects.id')
      .where({
        'student_tp_scores.student_id': report.student_id,
        'student_tp_scores.semester_id': report.semester_id
      })
      .select(
        'student_tp_scores.*',
        'learning_objectives.code as tp_code',
        'learning_objectives.description as tp_description',
        'subjects.name as subject_name'
      )
      .orderBy('learning_objectives.order_index', 'asc');

    // 4. Ambil nilai sikap
    const attitudes = await db('student_attitude_scores')
      .where({
        student_id: report.student_id,
        semester_id: report.semester_id
      });

    // 5. Ambil rekap presensi
    const attendances = await db('student_attendances')
      .where({ student_id: report.student_id })
      .select('status', db.raw('COUNT(id) as total'))
      .groupBy('status');

    return {
      ...report,
      subject_scores: materializedScores,
      scores: rawScores,
      tp_scores: tpScores,
      attitudes,
      attendance_summary: attendances
    };
  }

  // ==========================================
  // Generate Rapor Otomatis Siswa Aktif (dengan Materialisasi ke report_card_subject_scores)
  // ==========================================
  async generateReportCards(payload, user = null) {
    const { student_id, class_group_id, semester_id, homeroom_note } = payload;
    if (!semester_id || (!student_id && !class_group_id)) {
      const error = new Error('Field semester_id dan salah satu dari student_id atau class_group_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    let targetStudentIds = [];
    if (student_id) {
      targetStudentIds = [student_id];
    } else if (class_group_id) {
      const enrollments = await db('student_class_enrollments').where({ class_group_id });
      targetStudentIds = enrollments.map((e) => e.student_id);
    }

    if (targetStudentIds.length === 0) {
      const error = new Error('Tidak ada siswa yang ditemukan untuk di-generate rapor');
      error.statusCode = 404;
      throw error;
    }

    // Cek apakah semester ini dari tahun ajaran aktif atau lampau
    const sem = await db('semesters')
      .leftJoin('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .select('semesters.*', 'academic_years.is_active as is_academic_year_active')
      .where('semesters.id', semester_id)
      .first();

    const isLegacy = sem && sem.is_academic_year_active === 0 ? 1 : 0;
    const generatorEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;
    const generatedResults = [];

    for (const sid of targetStudentIds) {
      const student = await db('students').where({ id: sid }).first();
      if (!student) continue;

      const pdfUrl = `/uploads/reports/rapor_${sid}_sem_${semester_id}_${Date.now()}.pdf`;

      let reportCard = await db('report_cards')
        .where({ student_id: sid, semester_id })
        .first();

      let reportCardId;
      if (reportCard) {
        reportCardId = reportCard.id;
        await db('report_cards').where({ id: reportCard.id }).update({
          homeroom_note: homeroom_note || reportCard.homeroom_note,
          file_url: pdfUrl,
          data_source: 'generated',
          is_legacy: isLegacy,
          generated_at: db.fn.now(),
          generated_by_employee_id: generatorEmployeeId,
          updated_at: db.fn.now()
        });
        generatedResults.push({ id: reportCard.id, student_id: sid, file_url: pdfUrl, status: 'updated' });
      } else {
        const [newId] = await db('report_cards').insert({
          student_id: sid,
          semester_id,
          homeroom_note: homeroom_note || null,
          file_url: pdfUrl,
          data_source: 'generated',
          is_legacy: isLegacy,
          generated_at: db.fn.now(),
          generated_by_employee_id: generatorEmployeeId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        reportCardId = newId;
        generatedResults.push({ id: newId, student_id: sid, file_url: pdfUrl, status: 'generated' });
      }

      // Materialisasi nilai akhir per mapel ke report_card_subject_scores
      // Ambil seluruh nilai komponen mapel pada semester ini untuk siswa
      const mapelScores = await db('student_scores')
        .join('subjects', 'student_scores.subject_id', 'subjects.id')
        .where({
          'student_scores.student_id': sid,
          'student_scores.semester_id': semester_id
        })
        .select(
          'student_scores.subject_id',
          'subjects.kkm',
          db.raw('AVG(student_scores.score) as avg_score')
        )
        .groupBy('student_scores.subject_id', 'subjects.kkm');

      for (const ms of mapelScores) {
        const finalScore = parseFloat(parseFloat(ms.avg_score || 0).toFixed(2));
        const kkm = ms.kkm ? parseFloat(ms.kkm) : 75.0;
        const predikat = finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : 'D';

        const existingScore = await db('report_card_subject_scores')
          .where({ report_card_id: reportCardId, subject_id: ms.subject_id })
          .first();

        if (existingScore) {
          await db('report_card_subject_scores').where({ id: existingScore.id }).update({
            score: finalScore,
            max_score: 100.0,
            predikat,
            kkm_snapshot: kkm,
            updated_at: db.fn.now()
          });
        } else {
          await db('report_card_subject_scores').insert({
            report_card_id: reportCardId,
            subject_id: ms.subject_id,
            score: finalScore,
            max_score: 100.0,
            predikat,
            kkm_snapshot: kkm,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }
    }

    return {
      total_generated: generatedResults.length,
      semester_id,
      items: generatedResults
    };
  }

  // ==========================================
  // 3. Input Manual Nilai Rapor Siswa / Riwayat Lampau (Legacy Entry)
  // ==========================================
  async createLegacyEntry(payload, user = null) {
    const {
      student_id,
      semester_id,
      homeroom_notes,
      decision,
      subject_scores = []
    } = payload;

    if (!student_id || !semester_id) {
      const error = new Error('Field student_id dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const student = await db('students').where('id', student_id).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek apakah semester berasal dari tahun ajaran aktif atau lampau
    const sem = await db('semesters')
      .leftJoin('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .select('semesters.*', 'academic_years.is_active as is_academic_year_active')
      .where('semesters.id', semester_id)
      .first();

    const isLegacy = sem && sem.is_academic_year_active === 0 ? 1 : 0;
    const generatorEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;

    // 1. Cari atau buat report_cards
    let reportCard = await db('report_cards')
      .where({ student_id, semester_id })
      .first();

    let reportCardId;
    if (reportCard) {
      reportCardId = reportCard.id;
      await db('report_cards').where({ id: reportCard.id }).update({
        homeroom_note: homeroom_notes !== undefined ? homeroom_notes : reportCard.homeroom_note,
        data_source: 'manual_input',
        is_legacy: isLegacy,
        generated_at: db.fn.now(),
        generated_by_employee_id: generatorEmployeeId,
        updated_at: db.fn.now()
      });
    } else {
      const [newId] = await db('report_cards').insert({
        student_id,
        semester_id,
        homeroom_note: homeroom_notes || null,
        data_source: 'manual_input',
        is_legacy: isLegacy,
        generated_at: db.fn.now(),
        generated_by_employee_id: generatorEmployeeId,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      reportCardId = newId;
    }

    // 2. Upsert baris-baris report_card_subject_scores
    let savedScoresCount = 0;
    if (Array.isArray(subject_scores) && subject_scores.length > 0) {
      for (const item of subject_scores) {
        if (!item.subject_id || item.score === undefined || item.score === null || isNaN(item.score)) {
          continue;
        }

        const scNum = parseFloat(item.score);
        const maxSc = item.max_score ? parseFloat(item.max_score) : 100.0;
        const autoPredikat = item.predikat || (scNum >= 90 ? 'A' : scNum >= 80 ? 'B' : scNum >= 70 ? 'C' : 'D');

        const existingScore = await db('report_card_subject_scores')
          .where({ report_card_id: reportCardId, subject_id: item.subject_id })
          .first();

        if (existingScore) {
          await db('report_card_subject_scores').where({ id: existingScore.id }).update({
            score: scNum,
            max_score: maxSc,
            predikat: autoPredikat,
            kkm_snapshot: item.kkm_snapshot ? parseFloat(item.kkm_snapshot) : existingScore.kkm_snapshot,
            notes: item.notes !== undefined ? item.notes : existingScore.notes,
            updated_at: db.fn.now()
          });
        } else {
          await db('report_card_subject_scores').insert({
            report_card_id: reportCardId,
            subject_id: item.subject_id,
            score: scNum,
            max_score: maxSc,
            predikat: autoPredikat,
            kkm_snapshot: item.kkm_snapshot ? parseFloat(item.kkm_snapshot) : null,
            notes: item.notes || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
        savedScoresCount++;
      }
    }

    return {
      report_card_id: reportCardId,
      student_id,
      semester_id,
      scores_count: savedScoresCount,
      is_legacy: !!isLegacy,
      message: 'Nilai rapor berhasil disimpan secara manual'
    };
  }

  // ==========================================
  // 4. Generate Template Impor Excel (XLSX)
  // ==========================================
  async getImportTemplate(query = {}) {
    const { class_group_id, semester_id, satuan_pendidikan_id } = query;

    let unitId = satuan_pendidikan_id || 1;
    let enrolledStudents = [];
    let gradeLevelId = null;

    if (class_group_id) {
      const cg = await db('class_groups').where('id', class_group_id).first();
      if (cg) {
        unitId = cg.satuan_pendidikan_id || unitId;
        gradeLevelId = cg.grade_level_id;
      }

      enrolledStudents = await db('student_class_enrollments')
        .join('students', 'student_class_enrollments.student_id', 'students.id')
        .where('student_class_enrollments.class_group_id', class_group_id)
        .select(
          'students.nisn',
          'students.nis',
          'students.full_name'
        )
        .orderBy('students.full_name', 'asc');
    }

    // Ambil daftar mata pelajaran untuk unit & jenjang terkait
    let subjectQuery = db('subjects')
      .where('is_active', 1)
      .where(function () {
        this.where('satuan_pendidikan_id', unitId).orWhereNull('satuan_pendidikan_id');
      });

    const subjects = await subjectQuery.orderBy('id', 'asc');

    // Susun baris header
    const headers = ['NISN', 'NIS', 'Nama Siswa'];
    for (const sub of subjects) {
      headers.push(`[${sub.id}] ${sub.name}`);
    }

    const dataRows = [headers];

    // Jika ada siswa terdaftar, masukkan baris default
    if (enrolledStudents.length > 0) {
      for (const st of enrolledStudents) {
        const row = [st.nisn || '', st.nis || '', st.full_name];
        for (let i = 0; i < subjects.length; i++) {
          row.push(''); // Kolom nilai kosong untuk diisi
        }
        dataRows.push(row);
      }
    } else {
      // Masukkan baris contoh
      const exampleRow = ['0012345678', 'NIS-1001', 'Fulan bin Fulan'];
      for (let i = 0; i < subjects.length; i++) {
        exampleRow.push(85);
      }
      dataRows.push(exampleRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai Rapor');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  // ==========================================
  // 5. Impor Nilai Rapor Massal (Bulk Import)
  // ==========================================
  async importReportCards(payload, user = null) {
    const {
      class_group_id,
      semester_id,
      auto_create_missing_students = false,
      rows = [],
      satuan_pendidikan_id
    } = payload;

    if (!semester_id || !Array.isArray(rows) || rows.length === 0) {
      const error = new Error('Field semester_id dan rows (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const unitId = satuan_pendidikan_id || 1;
    const sem = await db('semesters')
      .leftJoin('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .select('semesters.*', 'academic_years.is_active as is_academic_year_active')
      .where('semesters.id', semester_id)
      .first();

    const isLegacy = sem && sem.is_academic_year_active === 0 ? 1 : 0;
    const generatorEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;

    // Ambil cache seluruh mapel untuk matching header ID / nama
    const allSubjects = await db('subjects')
      .where('is_active', 1)
      .where(function () {
        this.where('satuan_pendidikan_id', unitId).orWhereNull('satuan_pendidikan_id');
      });

    let successCount = 0;
    let createdStudentsCount = 0;
    let matchedStudentsCount = 0;
    const errors = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowIndex = idx + 1;

      // Extract identitas siswa
      const nisn = row.nisn || row.NISN || (row['NISN / No. Induk'] ? String(row['NISN / No. Induk']).trim() : null);
      const nis = row.nis || row.NIS || (row['NIS / No. Induk'] ? String(row['NIS / No. Induk']).trim() : null);
      const name = row.full_name || row.name || row['Nama Siswa'] || row['Nama Lengkap'] || row['nama'];

      if (!name && !nisn && !nis) {
        errors.push({ row: rowIndex, name: 'Kosong', reason: 'Baris tidak memiliki nama, NIS, maupun NISN' });
        continue;
      }

      // 1. Cari siswa yang cocok
      let student = null;
      if (nisn && String(nisn).trim()) {
        student = await db('students').where('nisn', String(nisn).trim()).first();
      }
      if (!student && nis && String(nis).trim()) {
        student = await db('students')
          .where('satuan_pendidikan_id', unitId)
          .where('nis', String(nis).trim())
          .first();
      }
      if (!student && name && String(name).trim()) {
        student = await db('students')
          .where('satuan_pendidikan_id', unitId)
          .whereRaw('LOWER(full_name) = ?', [String(name).trim().toLowerCase()])
          .first();
      }

      // 2. Jika siswa tidak ditemukan
      if (!student) {
        if (auto_create_missing_students && name && String(name).trim()) {
          try {
            const addRes = await studentsService.quickAddLegacyStudent({
              full_name: String(name).trim(),
              nis: nis ? String(nis).trim() : null,
              nisn: nisn ? String(nisn).trim() : null,
              gender: row.gender === 'P' ? 'P' : 'L',
              status: isLegacy ? 'lulus' : 'aktif',
              satuan_pendidikan_id: unitId,
              class_group_id: class_group_id || null
            }, user);
            student = addRes.student;
            createdStudentsCount++;
          } catch (e) {
            errors.push({ row: rowIndex, name: name || '-', reason: `Gagal membuat siswa baru otomatis: ${e.message}` });
            continue;
          }
        } else {
          errors.push({ row: rowIndex, name: name || '-', reason: 'Siswa tidak ditemukan dan opsi auto-create nonaktif' });
          continue;
        }
      } else {
        matchedStudentsCount++;
      }

      // 3. Buat atau update report_cards
      let reportCard = await db('report_cards')
        .where({ student_id: student.id, semester_id })
        .first();

      let reportCardId;
      if (reportCard) {
        reportCardId = reportCard.id;
        await db('report_cards').where({ id: reportCard.id }).update({
          data_source: 'bulk_import',
          is_legacy: isLegacy,
          generated_at: db.fn.now(),
          generated_by_employee_id: generatorEmployeeId,
          updated_at: db.fn.now()
        });
      } else {
        const [newId] = await db('report_cards').insert({
          student_id: student.id,
          semester_id,
          data_source: 'bulk_import',
          is_legacy: isLegacy,
          generated_at: db.fn.now(),
          generated_by_employee_id: generatorEmployeeId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        reportCardId = newId;
      }

      // 4. Parse nilai mapel dari row
      // Mendukung format scores: { [subject_id]: score } atau object keys seperti "[10] Matematika" atau "Matematika"
      const scoreEntries = [];

      if (row.scores && typeof row.scores === 'object') {
        for (const [sKey, sVal] of Object.entries(row.scores)) {
          const sId = parseInt(sKey, 10);
          if (!isNaN(sId) && sVal !== '' && sVal !== null && !isNaN(sVal)) {
            scoreEntries.push({ subject_id: sId, score: parseFloat(sVal) });
          }
        }
      }

      // Parse dari kolom-kolom root jika tidak ada row.scores
      for (const [colKey, colVal] of Object.entries(row)) {
        if (colVal === '' || colVal === null || isNaN(colVal)) continue;

        // Cek pola "[12] Nama Mapel"
        const idMatch = colKey.match(/^\[(\d+)\]/);
        if (idMatch) {
          const subId = parseInt(idMatch[1], 10);
          scoreEntries.push({ subject_id: subId, score: parseFloat(colVal) });
        } else {
          // Cek kecocokan nama mapel
          const matchedSub = allSubjects.find((s) => s.name.toLowerCase() === colKey.trim().toLowerCase() || s.code.toLowerCase() === colKey.trim().toLowerCase());
          if (matchedSub) {
            scoreEntries.push({ subject_id: matchedSub.id, score: parseFloat(colVal) });
          }
        }
      }

      // 5. Upsert ke report_card_subject_scores
      for (const se of scoreEntries) {
        const scNum = se.score;
        const predikat = scNum >= 90 ? 'A' : scNum >= 80 ? 'B' : scNum >= 70 ? 'C' : 'D';

        const existingScore = await db('report_card_subject_scores')
          .where({ report_card_id: reportCardId, subject_id: se.subject_id })
          .first();

        if (existingScore) {
          await db('report_card_subject_scores').where({ id: existingScore.id }).update({
            score: scNum,
            predikat,
            updated_at: db.fn.now()
          });
        } else {
          await db('report_card_subject_scores').insert({
            report_card_id: reportCardId,
            subject_id: se.subject_id,
            score: scNum,
            max_score: 100.0,
            predikat,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }

      successCount++;
    }

    return {
      total_rows: rows.length,
      success_count: successCount,
      created_students_count: createdStudentsCount,
      matched_students_count: matchedStudentsCount,
      errors
    };
  }

  // ==========================================
  // 6. Riwayat Seluruh Rapor Siswa (Report Card History)
  // ==========================================
  async getStudentReportCardHistory(studentId) {
    const student = await db('students')
      .leftJoin('cohorts', 'students.cohort_id', 'cohorts.id')
      .select('students.*', 'cohorts.name as cohort_name')
      .where('students.id', studentId)
      .first();

    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const reportCards = await db('report_cards')
      .join('semesters', 'report_cards.semester_id', 'semesters.id')
      .leftJoin('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .select(
        'report_cards.*',
        'semesters.name as semester_name',
        'academic_years.name as academic_year_name',
        'academic_years.start_date as academic_year_start'
      )
      .where('report_cards.student_id', studentId)
      .orderBy('academic_years.start_date', 'asc')
      .orderBy('semesters.id', 'asc');

    for (const rc of reportCards) {
      rc.subject_scores = await db('report_card_subject_scores')
        .join('subjects', 'report_card_subject_scores.subject_id', 'subjects.id')
        .where('report_card_subject_scores.report_card_id', rc.id)
        .select(
          'report_card_subject_scores.*',
          'subjects.name as subject_name',
          'subjects.code as subject_code'
        )
        .orderBy('subjects.name', 'asc');
    }

    return {
      student,
      total_report_cards: reportCards.length,
      report_cards: reportCards
    };
  }

  async updateNote(id, { homeroom_note }) {
    const report = await db('report_cards').where({ id }).first();
    if (!report) {
      const error = new Error('Rapor tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('report_cards').where({ id }).update({
      homeroom_note: homeroom_note || null,
      updated_at: db.fn.now()
    });

    return db('report_cards').where({ id }).first();
  }
}

module.exports = new ReportCardsService();
