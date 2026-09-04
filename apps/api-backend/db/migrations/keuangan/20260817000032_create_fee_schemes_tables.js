/**
 * Migration: create_fee_schemes_tables
 * Modul Keuangan - Fitur Template Skema Biaya Pendidikan & Penetapan Biaya Siswa
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel Master Skema Biaya Pendidikan (fee_schemes)
  await knex.schema.createTable('fee_schemes', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.string('code', 50).notNullable();
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'academic_year_id', 'code'], 'uq_fee_schemes_code');
    table.index(['school_unit_id', 'academic_year_id'], 'idx_fee_schemes_unit_year');
  });

  // 2. Tabel Rincian Pos Biaya per Skema (fee_scheme_items)
  await knex.schema.createTable('fee_scheme_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('fee_scheme_id').unsigned().notNullable()
      .references('id').inTable('fee_schemes')
      .onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('fee_type_id').unsigned().notNullable()
      .references('id').inTable('fee_types')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.enum('value_type', ['fixed_amount', 'percentage_of_reference', 'waiver_full']).notNullable().defaultTo('fixed_amount');
    table.decimal('value', 18, 2).notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['fee_scheme_id', 'fee_type_id'], 'uq_fsi_scheme_type');
    table.index(['fee_scheme_id'], 'idx_fsi_scheme');
  });

  // 3. Tabel Penetapan Biaya Siswa (student_fee_scheme_assignments)
  await knex.schema.createTable('student_fee_scheme_assignments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.bigInteger('fee_scheme_id').unsigned().nullable()
      .references('id').inTable('fee_schemes')
      .onDelete('SET NULL').onUpdate('CASCADE');
    table.boolean('is_custom').notNullable().defaultTo(false);
    table.bigInteger('assigned_by').unsigned().nullable();
    table.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
    table.json('previous_data').nullable();
    table.text('reason').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'student_id', 'academic_year_id'], 'uq_student_fee_assignment');
    table.index(['school_unit_id', 'academic_year_id'], 'idx_sfsa_unit_year');
    table.index(['fee_scheme_id'], 'idx_sfsa_scheme');
  });

  // 4. Tambahkan relasi assignment_id ke student_fee_adjustments jika belum ada
  const hasCol = await knex.schema.hasColumn('student_fee_adjustments', 'assignment_id');
  if (!hasCol) {
    await knex.schema.table('student_fee_adjustments', (table) => {
      table.bigInteger('assignment_id').unsigned().nullable().after('fee_type_id')
        .references('id').inTable('student_fee_scheme_assignments')
        .onDelete('SET NULL').onUpdate('CASCADE');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('student_fee_adjustments', 'assignment_id');
  if (hasCol) {
    await knex.schema.table('student_fee_adjustments', (table) => {
      table.dropForeign(['assignment_id']);
      table.dropColumn('assignment_id');
    });
  }
  await knex.schema.dropTableIfExists('student_fee_scheme_assignments');
  await knex.schema.dropTableIfExists('fee_scheme_items');
  await knex.schema.dropTableIfExists('fee_schemes');
};
