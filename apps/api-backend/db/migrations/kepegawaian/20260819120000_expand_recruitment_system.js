/**
 * Migration: expand_recruitment_system
 * Modul Kepegawaian - Fitur 1.6: Rekrutmen & Onboarding Pegawai Lengkap
 * (Riwayat Tahapan, Berkas Lamaran, Wawancara, Bank Tes Psikotes, Evaluasi Microteaching)
 */
exports.up = async function(knex) {
  // 1. Modifikasi tabel recruitment_candidates untuk field profil lengkap
  await knex.schema.alterTable('recruitment_candidates', function(table) {
    table.string('email', 100).nullable().after('applied_position');
    table.string('phone_number', 30).nullable().after('email');
    table.string('last_education', 100).nullable().after('phone_number'); // mis. S1 Pendidikan Matematika - UNJ (IPK 3.85)
    table.text('skills').nullable().after('last_education'); // JSON atau string keahlian
    table.text('work_experiences').nullable().after('skills'); // JSON riwayat pekerjaan
    table.text('documents').nullable().after('work_experiences'); // JSON daftar berkas terunggah (CV, Ijazah, dsb)
    table.text('notes').nullable().after('documents');
    // Ubah selection_stage menjadi varchar agar fleksibel untuk semua tahap
    table.string('selection_stage', 50).defaultTo('applied').alter();
  });

  // 2. Tabel Riwayat Tahapan Rekrutmen (Audit trail / timeline per kandidat)
  await knex.schema.createTable('recruitment_stage_histories', function(table) {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('candidate_id').unsigned().notNullable()
      .references('id').inTable('recruitment_candidates').onDelete('CASCADE');
    table.string('stage', 50).notNullable(); // applied, screening, interview, psychological_test, microteaching, offering, accepted, rejected
    table.string('status', 30).defaultTo('in_progress'); // in_progress, passed, failed, skipped
    table.text('notes').nullable();
    table.string('assessor_name', 150).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. Tabel Bank Instrumen Soal Tes Psikotes & Wawancara
  await knex.schema.createTable('recruitment_test_instruments', function(table) {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.string('title', 200).notNullable();
    table.string('test_type', 50).notNullable(); // psychological, interview_rubric, general_knowledge
    table.text('description').nullable();
    table.integer('duration_minutes').defaultTo(30);
    table.decimal('passing_score', 5, 2).defaultTo(70.00);
    table.json('questions').nullable(); // Array of question objects with options, score weights, correct answers
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. Tabel Hasil Tes Psikotes & Ujian Tertulis Kandidat
  await knex.schema.createTable('recruitment_test_results', function(table) {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('candidate_id').unsigned().notNullable()
      .references('id').inTable('recruitment_candidates').onDelete('CASCADE');
    table.bigInteger('instrument_id').unsigned().notNullable()
      .references('id').inTable('recruitment_test_instruments').onDelete('CASCADE');
    table.json('answers').nullable(); // Jawaban kandidat per butir soal
    table.decimal('total_score', 5, 2).notNullable().defaultTo(0);
    table.string('status', 30).notNullable().defaultTo('pending'); // passed, failed, pending
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 5. Tabel Penilaian Wawancara (Tanya Jawab & Rubrik Komprehensif)
  await knex.schema.createTable('recruitment_interview_evaluations', function(table) {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('candidate_id').unsigned().notNullable()
      .references('id').inTable('recruitment_candidates').onDelete('CASCADE');
    table.string('interviewer_name', 150).notNullable();
    table.date('interview_date').notNullable();
    table.json('questions_answers').nullable(); // Array of { question, answer, score, notes }
    table.decimal('overall_score', 5, 2).defaultTo(0);
    table.string('recommendation', 50).defaultTo('recommended'); // recommended, reconsider, rejected
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 6. Tabel Evaluasi Microteaching (Khusus Pelamar Guru / Pendidik)
  await knex.schema.createTable('recruitment_microteaching_evaluations', function(table) {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('candidate_id').unsigned().notNullable()
      .references('id').inTable('recruitment_candidates').onDelete('CASCADE');
    table.string('evaluator_name', 150).notNullable();
    table.string('subject_topic', 200).notNullable(); // Topik/Materi yang diajarkan
    table.date('teaching_date').notNullable();
    // Aspek Penilaian (0-100)
    table.decimal('mastery_score', 5, 2).defaultTo(0); // 1. Penguasaan Materi & Silabus
    table.decimal('methodology_score', 5, 2).defaultTo(0); // 2. Metode Pembelajaran & Interaksi
    table.decimal('classroom_management_score', 5, 2).defaultTo(0); // 3. Pengelolaan Kelas & Waktu
    table.decimal('media_tech_score', 5, 2).defaultTo(0); // 4. Pemanfaatan Media & Teknologi
    table.decimal('communication_score', 5, 2).defaultTo(0); // 5. Penampilan, Etika & Komunikasi
    table.decimal('final_score', 5, 2).defaultTo(0); // Rata-rata / Nilai Akhir
    table.string('recommendation', 50).defaultTo('recommended'); // highly_recommended, recommended, rejected
    table.text('evaluator_notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('recruitment_microteaching_evaluations');
  await knex.schema.dropTableIfExists('recruitment_interview_evaluations');
  await knex.schema.dropTableIfExists('recruitment_test_results');
  await knex.schema.dropTableIfExists('recruitment_test_instruments');
  await knex.schema.dropTableIfExists('recruitment_stage_histories');

  await knex.schema.alterTable('recruitment_candidates', function(table) {
    table.dropColumn('notes');
    table.dropColumn('documents');
    table.dropColumn('work_experiences');
    table.dropColumn('skills');
    table.dropColumn('last_education');
    table.dropColumn('phone_number');
    table.dropColumn('email');
  });
};
