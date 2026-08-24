/**
 * Curriculum Controller Implementation
 * Modul Akademik - Fitur Master: Tahun Ajaran, Angkatan, Tingkat, Rombel,
 * Anggota Rombel (Enrollment & Unassigned Students Picker), Mapel, Jadwal Ajar.
 */
const curriculumService = require('./service');

class CurriculumController {
  // 1. Tahun Ajaran
  async listAcademicYears(req, res, next) {
    try {
      const data = await curriculumService.listAcademicYears(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar tahun ajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAcademicYear(req, res, next) {
    try {
      const data = await curriculumService.createAcademicYear(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tahun ajaran berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAcademicYear(req, res, next) {
    try {
      const data = await curriculumService.updateAcademicYear(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Tahun ajaran berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAcademicYear(req, res, next) {
    try {
      const data = await curriculumService.deleteAcademicYear(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Tahun ajaran berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async activateAcademicYear(req, res, next) {
    try {
      const data = await curriculumService.activateAcademicYear(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Tahun ajaran berhasil diaktifkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Angkatan (Cohorts)
  async listCohorts(req, res, next) {
    try {
      const data = await curriculumService.listCohorts(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar angkatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCohort(req, res, next) {
    try {
      const data = await curriculumService.createCohort(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Angkatan berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCohort(req, res, next) {
    try {
      const data = await curriculumService.updateCohort(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Angkatan berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCohort(req, res, next) {
    try {
      const data = await curriculumService.deleteCohort(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Angkatan berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Semester
  async listSemesters(req, res, next) {
    try {
      const data = await curriculumService.listSemesters(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar semester berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createSemester(req, res, next) {
    try {
      const data = await curriculumService.createSemester(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Semester berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSemester(req, res, next) {
    try {
      const data = await curriculumService.updateSemester(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Semester berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSemester(req, res, next) {
    try {
      const data = await curriculumService.deleteSemester(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Semester berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async activateSemester(req, res, next) {
    try {
      const data = await curriculumService.activateSemester(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Semester berhasil diaktifkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Tingkat Kelas (Grade Levels)
  async listGradeLevels(req, res, next) {
    try {
      const data = await curriculumService.listGradeLevels(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar tingkat kelas berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createGradeLevel(req, res, next) {
    try {
      const data = await curriculumService.createGradeLevel(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tingkat kelas berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateGradeLevel(req, res, next) {
    try {
      const data = await curriculumService.updateGradeLevel(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Tingkat kelas berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteGradeLevel(req, res, next) {
    try {
      const data = await curriculumService.deleteGradeLevel(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Tingkat kelas berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Rombel (Class Groups)
  async listClassGroups(req, res, next) {
    try {
      const data = await curriculumService.listClassGroups(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar rombel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getClassGroupById(req, res, next) {
    try {
      const data = await curriculumService.getClassGroupById(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail rombel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createClassGroup(req, res, next) {
    try {
      const data = await curriculumService.createClassGroup(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Rombel berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateClassGroup(req, res, next) {
    try {
      const data = await curriculumService.updateClassGroup(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Data rombel berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteClassGroup(req, res, next) {
    try {
      const data = await curriculumService.deleteClassGroup(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Rombel berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Anggota Rombel & Unassigned Students
  async listClassGroupMembers(req, res, next) {
    try {
      const data = await curriculumService.listClassGroupMembers(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar anggota rombel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listUnassignedStudents(req, res, next) {
    try {
      const data = await curriculumService.listUnassignedStudents(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar siswa belum masuk rombel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addStudentsToClassGroup(req, res, next) {
    try {
      const data = await curriculumService.addStudentsToClassGroup(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Siswa berhasil ditambahkan ke rombel',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async removeStudentFromClassGroup(req, res, next) {
    try {
      const data = await curriculumService.removeStudentFromClassGroup(req.params.enrollmentId, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Siswa berhasil dikeluarkan dari rombel dan riwayat telah dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listClassRemovalLogs(req, res, next) {
    try {
      const data = await curriculumService.listClassRemovalLogs(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Riwayat pengeluaran siswa dari rombel berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async transferStudentClassGroup(req, res, next) {
    try {
      const data = await curriculumService.transferStudentClassGroup(req.params.enrollmentId, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Siswa berhasil dipindahkan ke rombel tujuan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Mapel
  async listSubjects(req, res, next) {
    try {
      const data = await curriculumService.listSubjects(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar mata pelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createSubject(req, res, next) {
    try {
      const data = await curriculumService.createSubject(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Mata pelajaran berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSubject(req, res, next) {
    try {
      const data = await curriculumService.updateSubject(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Mata pelajaran berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleSubjectStatus(req, res, next) {
    try {
      const result = await curriculumService.toggleSubjectStatus(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listSubjectLogs(req, res, next) {
    try {
      const data = await curriculumService.listSubjectLogs(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar riwayat status mata pelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSubject(req, res, next) {
    try {
      const reason = req.body?.reason || req.query?.reason || 'Penghapusan mata pelajaran';
      const data = await curriculumService.deleteSubject(req.params.id, req.user, reason);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. Pembagian Tugas Mengajar & Ekskul (Tugas Guru)
  async listTeachingDuties(req, res, next) {
    try {
      const data = await curriculumService.listTeachingDuties(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar penugasan guru berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async assignTeacherDuty(req, res, next) {
    try {
      const data = await curriculumService.assignTeacherDuty(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Penugasan guru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async removeTeacherDuty(req, res, next) {
    try {
      const data = await curriculumService.removeTeacherDuty(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listTeachingDutyLogs(req, res, next) {
    try {
      const data = await curriculumService.listTeachingDutyLogs(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Riwayat log penugasan guru berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. Opsi / Preset Jadwal & Jadwal Pelajaran
  async listSchedulePresets(req, res, next) {
    try {
      const data = await curriculumService.listSchedulePresets(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar opsi jadwal berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createSchedulePreset(req, res, next) {
    try {
      const data = await curriculumService.createSchedulePreset(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Opsi jadwal berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async activateSchedulePreset(req, res, next) {
    try {
      const data = await curriculumService.activateSchedulePreset(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: `Opsi jadwal "${data.name}" berhasil diberlakukan / diaktifkan`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSchedulePreset(req, res, next) {
    try {
      const data = await curriculumService.updateSchedulePreset(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Opsi jadwal berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSchedulePreset(req, res, next) {
    try {
      const data = await curriculumService.deleteSchedulePreset(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listScheduleLogs(req, res, next) {
    try {
      const data = await curriculumService.listScheduleLogs(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Riwayat perubahan jadwal berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listSchedules(req, res, next) {
    try {
      const data = await curriculumService.listSchedules(req.query);
      res.status(200).json({
        success: true,
        data: data.schedules,
        subjects_status: data.subjects_status,
        active_preset: data.active_preset,
        presets: data.presets,
        message: 'Daftar jadwal pelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createSchedule(req, res, next) {
    try {
      const data = await curriculumService.createSchedule(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Jadwal pelajaran berhasil ditambahkan dan dicatat ke riwayat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSchedule(req, res, next) {
    try {
      const data = await curriculumService.updateSchedule(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Jadwal pelajaran berhasil diperbarui dan dicatat ke riwayat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSchedule(req, res, next) {
    try {
      const data = await curriculumService.deleteSchedule(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleScheduleStatus(req, res, next) {
    try {
      const data = await curriculumService.toggleScheduleStatus(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: `Jadwal ${data.is_active ? 'diaktifkan' : 'dinonaktifkan'} dan dicatat ke riwayat`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. Jadwal Ajar Legacy
  async listTeachingAssignments(req, res, next) {
    try {
      const data = await curriculumService.listTeachingAssignments(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar jadwal ajar berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createTeachingAssignment(req, res, next) {
    try {
      const data = await curriculumService.createTeachingAssignment(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Jadwal ajar berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. Tujuan Pembelajaran (Learning Objectives)
  async listLearningObjectives(req, res, next) {
    try {
      const data = await curriculumService.listLearningObjectives(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar tujuan pembelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLearningObjective(req, res, next) {
    try {
      const data = await curriculumService.createLearningObjective(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tujuan pembelajaran berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLearningObjectivesBulk(req, res, next) {
    try {
      const data = await curriculumService.createLearningObjectivesBulk(req.body);
      res.status(201).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }


  async updateLearningObjective(req, res, next) {
    try {
      const data = await curriculumService.updateLearningObjective(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Tujuan pembelajaran berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLearningObjective(req, res, next) {
    try {
      const data = await curriculumService.deleteLearningObjective(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. KKM / KKTP Mata Pelajaran
  async listSubjectGradeKkms(req, res, next) {
    try {
      const data = await curriculumService.listSubjectGradeKkms(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar KKM mata pelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async batchUpsertSubjectGradeKkms(req, res, next) {
    try {
      const data = await curriculumService.batchUpsertSubjectGradeKkms(req.body);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSubjectGradeKkm(req, res, next) {
    try {
      const data = await curriculumService.deleteSubjectGradeKkm(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 12. Struktur Kurikulum
  async listCurriculumStructures(req, res, next) {
    try {
      const data = await curriculumService.listCurriculumStructures(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar struktur kurikulum berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async saveCurriculumStructures(req, res, next) {
    try {
      const data = await curriculumService.saveCurriculumStructures(req.body);
      res.status(200).json({
        success: true,
        data,
        message: data.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CurriculumController();

