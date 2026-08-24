/**
 * Migration: Create Subject Grade KKM Matrix Table
 * Menyimpan KKM / KKTP per Mata Pelajaran per Tahun Ajaran per Tingkat Kelas (atau Rombel spesifik)
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('subject_grade_kkms');
  if (!exists) {
    await knex.schema.createTable('subject_grade_kkms', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().index();
      table.bigInteger('academic_year_id').unsigned().notNullable().index();
      table.bigInteger('grade_level_id').unsigned().notNullable().index();
      table.bigInteger('subject_id').unsigned().notNullable().index();
      table.bigInteger('class_group_id').unsigned().nullable().index(); // Opsional jika KKM per rombel spesifik
      
      table.decimal('kkm', 5, 2).notNullable().defaultTo(75.00);
      table.decimal('threshold_c', 5, 2).nullable().defaultTo(75.00); // Interval Batas Cukup
      table.decimal('threshold_b', 5, 2).nullable().defaultTo(83.00); // Interval Batas Baik
      table.decimal('threshold_a', 5, 2).nullable().defaultTo(92.00); // Interval Batas Sangat Baik
      
      table.text('description').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['satuan_pendidikan_id', 'academic_year_id', 'grade_level_id', 'subject_id'], 'uniq_subject_year_grade_kkm');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('subject_grade_kkms');
};
