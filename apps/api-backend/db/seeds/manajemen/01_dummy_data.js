/**
 * Seed: 01_dummy_data
 * Modul Manajemen & Mutu Sekolah - Sesuai erd-manajemen.md Bagian 5
 * 
 * Referensi Lintas Database:
 * - school_unit_id: 1 (SD Contoh 1 di core_local)
 * - created_by / user_id: 1 (superadmin di core_local)
 * - pic_employee_id / employee_id / evaluator_employee_id / assignee_employee_id / approver_employee_id: 1 (Ahmad Fauzi di kepegawaian_local)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Disable FK checks to allow clean truncate
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  await knex('approval_actions').truncate();
  await knex('approval_requests').truncate();
  await knex('approval_steps').truncate();
  await knex('approval_workflows').truncate();
  await knex('task_comments').truncate();
  await knex('tasks').truncate();
  await knex('project_members').truncate();
  await knex('projects').truncate();
  await knex('supervision_results').truncate();
  await knex('supervision_schedules').truncate();
  await knex('employee_performance_evaluation_criteria').truncate();
  await knex('employee_performance_evaluations').truncate();
  await knex('school_risks').truncate();
  await knex('cross_app_dashboard_snapshots').truncate();
  await knex('accreditation_evidences').truncate();
  await knex('accreditation_reports').truncate();
  await knex('self_evaluations').truncate();
  await knex('quality_indicator_achievements').truncate();
  await knex('quality_indicators').truncate();
  await knex('work_plan_programs').truncate();
  await knex('school_work_plans').truncate();
  await knex('institution_development_plans').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  const now = new Date();

  // 1. institution_development_plans (RIPS)
  const [idpId] = await knex('institution_development_plans').insert([
    {
      id: 1,
      school_unit_id: 1,
      title: 'RIPS SD Contoh 1 2026-2030',
      period_start_year: 2026,
      period_end_year: 2030,
      vision: 'Menjadi institusi pendidikan Islam terpadu yang unggul dan berdaya saing global.',
      mission: '1. Mengembangkan kurikulum terpadu berkarakter islami. 2. Meningkatkan mutu SDM pendidik.',
      document_url: '/documents/rips-2026-2030.pdf',
      status: 'draft',
      created_by: 1,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 2. school_work_plans (RKS)
  const [swpId] = await knex('school_work_plans').insert([
    {
      id: 1,
      school_unit_id: 1,
      institution_development_plan_id: 1,
      academic_year_id: 1,
      title: 'RKS SD Contoh 1 Tahun 2026/2027',
      program_focus: 'Peningkatan kompetensi pedagogik guru dan digitalisasi sarana kelas.',
      budget_ceiling_reference: 'RKAS-2026-SD-01',
      status: 'draft',
      created_by: 1,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 3. work_plan_programs (Program Kerja Unit)
  await knex('work_plan_programs').insert([
    {
      id: 1,
      school_work_plan_id: 1,
      school_unit_id: 1,
      unit_name: 'Kurikulum',
      pic_employee_id: 1,
      title: 'Penyusunan Silabus Tahun Ajaran Baru',
      description: 'Workshop penyusunan perangkat pembelajaran terpadu bagi dewan guru.',
      target: '100% guru menyelesaikan silabus dan RPP sebelum minggu pertama KBM.',
      budget_estimate_reference: 'ANG-KUR-2026-01',
      status: 'planned',
      start_date: '2026-07-01',
      end_date: '2026-07-15',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 4. quality_indicators (KPI & Indikator Mutu)
  const [qiId] = await knex('quality_indicators').insert([
    {
      id: 1,
      school_unit_id: 1,
      code: 'KPI-AKD-01',
      name: 'Rata-rata Nilai Ujian Akhir',
      category: 'akademik',
      unit_of_measure: 'poin',
      target_value: 80.00,
      data_source_module: 'akademik',
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      school_unit_id: 1,
      code: 'KPI-SDM-01',
      name: 'Persentase Kehadiran Pendidik & Tenaga Kependidikan',
      category: 'kepegawaian',
      unit_of_measure: '%',
      target_value: 95.00,
      data_source_module: 'kepegawaian',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 5. quality_indicator_achievements (Capaian KPI)
  await knex('quality_indicator_achievements').insert([
    {
      id: 1,
      quality_indicator_id: 1,
      school_unit_id: 1,
      period: '2026-Q2',
      actual_value: 82.50,
      recorded_by: 1,
      recorded_at: now,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 6. self_evaluations (Evadir)
  await knex('self_evaluations').insert([
    {
      id: 1,
      school_unit_id: 1,
      period_year: 2026,
      standard_component: 'Standar Isi & Kurikulum',
      score: 88.50,
      notes: 'Kurikulum terpadu terlaksana dengan baik, perlu pengayaan materi tahfidz.',
      status: 'draft',
      submitted_by: 1,
      submitted_at: now,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 7. accreditation_reports & evidences
  await knex('accreditation_reports').insert([
    {
      id: 1,
      school_unit_id: 1,
      accreditation_year: 2026,
      standard_code: 'STD-01-KOMPETENSI-LULUSAN',
      description: 'Laporan pemenuhan standar kompetensi lulusan berbasis karakter islami.',
      created_at: now,
      updated_at: now,
    },
  ]);

  await knex('accreditation_evidences').insert([
    {
      id: 1,
      accreditation_report_id: 1,
      evidence_description: 'Dokumen rekap nilai ujian hafalan tahfidz dan ijazah lulusan.',
      file_url: '/documents/bukti-akreditasi-std-01.pdf',
      score: 92.00,
      verified_by: 1,
      verified_at: now,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 8. school_risks (Manajemen Risiko)
  await knex('school_risks').insert([
    {
      id: 1,
      school_unit_id: 1,
      title: 'Keterlambatan renovasi gedung kelas',
      category: 'sarpras',
      description: 'Potensi perpanjangan waktu pengerjaan ruang kelas baru menjelang tahun ajaran baru.',
      likelihood: 'medium',
      impact: 'high',
      status: 'identified',
      mitigation_plan: 'Mengalihkan sementara ruang belajar ke laboratorium dan memantau progres kontraktor mingguan.',
      owner_employee_id: 1,
      identified_at: '2026-08-18',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 9. employee_performance_evaluations & criteria
  await knex('employee_performance_evaluations').insert([
    {
      id: 1,
      employee_id: 1,
      school_unit_id: 1,
      evaluator_employee_id: 1,
      period: '2026-S1',
      total_score: 87.50,
      category: 'sangat_baik',
      status: 'draft',
      notes: 'Kinerja pengajaran dan kedisiplinan sangat baik selama semester berjalan.',
      created_at: now,
      updated_at: now,
    },
  ]);

  await knex('employee_performance_evaluation_criteria').insert([
    {
      id: 1,
      employee_performance_evaluation_id: 1,
      criteria_name: 'Kompetensi Pedagogik & Penguasaan Kelas',
      weight: 40.00,
      score: 90.00,
      notes: 'Metode belajar interaktif dan partisipasi santri tinggi.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      employee_performance_evaluation_id: 1,
      criteria_name: 'Integritas & Kedisiplinan Kehadiran',
      weight: 30.00,
      score: 85.00,
      notes: 'Kehadiran tepat waktu sesuai jadwal mutabaah.',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 10. supervision_schedules & results
  await knex('supervision_schedules').insert([
    {
      id: 1,
      school_unit_id: 1,
      supervisor_employee_id: 1,
      supervised_employee_id: 2,
      supervision_type: 'akademik',
      class_group_id: 1,
      scheduled_date: '2026-08-25',
      status: 'scheduled',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 11. projects & members
  await knex('projects').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Persiapan Akreditasi 2026',
      description: 'Proyek konsolidasi instrumen dan berkas bukti akreditasi sekolah.',
      pic_employee_id: 1,
      budget_reference: 'ANG-PRJ-2026-01',
      start_date: '2026-08-01',
      end_date: '2026-11-30',
      status: 'planning',
      created_at: now,
      updated_at: now,
    },
  ]);

  await knex('project_members').insert([
    {
      id: 1,
      project_id: 1,
      employee_id: 1,
      role_in_project: 'Ketua Tim Proyek',
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      project_id: 1,
      employee_id: 2,
      role_in_project: 'Koordinator Berkas & Bukti',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 12. tasks & comments
  await knex('tasks').insert([
    {
      id: 1,
      school_unit_id: 1,
      project_id: 1,
      reference_type: 'project',
      reference_id: 1,
      title: 'Kumpulkan bukti dokumen standar 1',
      description: 'Lakukan verifikasi berkas kelulusan santri 3 tahun terakhir.',
      assignee_employee_id: 1,
      created_by: 1,
      priority: 'medium',
      status: 'todo',
      due_date: '2026-09-15',
      created_at: now,
      updated_at: now,
    },
  ]);

  await knex('task_comments').insert([
    {
      id: 1,
      task_id: 1,
      employee_id: 1,
      comment: 'Format dokumen sudah disiapkan di Google Drive panitia.',
      created_at: now,
    },
  ]);

  // 13. approval_workflows, steps, requests, actions
  await knex('approval_workflows').insert([
    {
      id: 1,
      school_unit_id: 1,
      name: 'Approval Program Kerja Unit',
      applies_to: 'work_plan_program',
      description: 'Alur persetujuan program kerja tahunan oleh Kepala Sekolah dan Yayasan.',
      created_at: now,
      updated_at: now,
    },
  ]);

  await knex('approval_steps').insert([
    {
      id: 1,
      approval_workflow_id: 1,
      step_order: 1,
      approver_job_position_id: null,
      approver_employee_id: 1,
      created_at: now,
      updated_at: now,
    },
  ]);

  console.log('Seed dummy data untuk modul Manajemen berhasil dimasukkan!');
};
