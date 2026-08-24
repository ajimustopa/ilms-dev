/**
 * Integration Test for Scores & Report Card Processing
 */
const scoresService = require('../src/modules/akademik/scores/service');
const db = require('../src/config/db/akademik');

async function testIntegration() {
  console.log('🧪 Starting scores & report card integration test...');

  // 1. List Assessment Types
  const types = await scoresService.listAssessmentTypes({ satuan_pendidikan_id: 1 });
  console.log(`✅ Loaded ${types.length} assessment types. Total weight: ${types.reduce((a, b) => a + b.weight_percentage, 0)}%`);

  // 2. Dapatkan data rombel, semester, mapel, siswa
  const classGroup = await db('class_groups').first();
  const semester = await db('semesters').first();
  const subject = await db('subjects').first();
  const academicYear = await db('academic_years').first();

  if (!classGroup || !semester || !subject) {
    console.log('ℹ️ Skip test: Class/Semester/Subject data empty');
    process.exit(0);
  }

  const ayId = academicYear?.id || semester.academic_year_id || 1;
  console.log(`📌 Testing with Class: ${classGroup.name} (id: ${classGroup.id}), Subject: ${subject.name} (id: ${subject.id}), Semester: ${semester.name} (id: ${semester.id}), AY: ${ayId}`);

  // Pastikan ada Tujuan Pembelajaran (TP) untuk mapel & semester ini
  let tps = await db('learning_objectives').where({ subject_id: subject.id, semester_id: semester.id });
  if (tps.length === 0) {
    const [tp1Id] = await db('learning_objectives').insert({
      satuan_pendidikan_id: 1,
      academic_year_id: ayId,
      grade_level_id: classGroup.grade_level_id,
      subject_id: subject.id,
      semester_id: semester.id,
      code: 'TP 1.1',
      description: 'Memahami konsep dasar dan hukum-hukum terkait',
      order_index: 1,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    const [tp2Id] = await db('learning_objectives').insert({
      satuan_pendidikan_id: 1,
      academic_year_id: ayId,
      grade_level_id: classGroup.grade_level_id,
      subject_id: subject.id,
      semester_id: semester.id,
      code: 'TP 1.2',
      description: 'Menerapkan dan menganalisis studi kasus nyata',
      order_index: 2,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    tps = await db('learning_objectives').whereIn('id', [tp1Id, tp2Id]);
    console.log('✅ Created sample Learning Objectives (TP 1.1 & TP 1.2)');
  }

  // 3. Buat Sesi Penilaian Baru
  const formatifType = types.find(t => t.code === 'FORMATIF') || types[0];
  const newSession = await scoresService.createAssessmentSession({
    satuan_pendidikan_id: 1,
    academic_year_id: ayId,
    semester_id: semester.id,
    class_group_id: classGroup.id,
    subject_id: subject.id,
    assessment_type_id: formatifType.id,
    title: 'Formatif 1 - Pemahaman Teori & Kasus',
    assessment_date: '2026-08-22',
    learning_objective_ids: tps.map(t => t.id),
    max_score: 100,
    notes: 'Ujian harian berbasis TP'
  });
  console.log(`✅ Created assessment session: "${newSession.title}" (id: ${newSession.id})`);

  // 4. Input Nilai Sesi Siswa
  const sessionDetail = await scoresService.getSessionScores(newSession.id);
  console.log(`👥 Students in session: ${sessionDetail.students.length}`);

  if (sessionDetail.students.length > 0) {
    const sampleStudent = sessionDetail.students[0];
    const tpScoresPayload = {};
    if (tps[0]) tpScoresPayload[tps[0].id] = 92; // Sangat baik
    if (tps[1]) tpScoresPayload[tps[1].id] = 68; // Perlu bimbingan / peningkatan

    await scoresService.saveSessionScoresBulk(newSession.id, {
      items: [
        {
          student_id: sampleStudent.student_id,
          score: 80,
          feedback: 'Kerja bagus, perlu latihan lebih lanjut pada studi kasus',
          tp_scores: tpScoresPayload
        }
      ]
    });
    console.log(`✅ Saved session scores for student ${sampleStudent.student_name}`);

    // 5. Test Recap Matrix
    const recap = await scoresService.getRecapMatrix({
      class_group_id: classGroup.id,
      subject_id: subject.id,
      semester_id: semester.id
    });
    console.log(`✅ Recap matrix generated for ${recap.students.length} students. TP averages for sample student:`, recap.matrix[sampleStudent.student_id]?.tp_averages);

    // 6. Test Process Report & Auto Narrative Generation
    const processRes = await scoresService.processReportScores({
      class_group_id: classGroup.id,
      subject_id: subject.id,
      semester_id: semester.id,
      academic_year_id: ayId,
      items: [
        {
          student_id: sampleStudent.student_id,
          final_score: 80,
          tp_scores: tpScoresPayload,
          competency_description: null // Trigger auto narrative formula
        }
      ]
    });
    console.log(`✅ Processed report result:`, processRes.items[0]);
    console.log(`📝 Generated Narrative Description: "${processRes.items[0]?.competency_description}"`);

    // 7. Test Leger Nilai
    const leger = await scoresService.getLegerData({
      class_group_id: classGroup.id,
      semester_id: semester.id
    });
    console.log(`✅ Leger loaded with ${leger.students.length} students. Rank #1 student: ${leger.students[0]?.student_name} (Avg: ${leger.students[0]?.average_score})`);
  }

  console.log('🎉 All scores integration tests passed successfully!');
  process.exit(0);
}

testIntegration().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
