/**
 * Migration: expand_employee_master_schema
 * Modul Kepegawaian - Redesain & Perluasan Skema Data Induk GTK (Standar Dapodik)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Perluas tabel employees
  await knex.schema.alterTable('employees', (table) => {
    table.string('nik', 20).nullable().unique().after('employee_number');
    table.string('mother_name', 150).nullable().after('academic_title');
    table.string('citizenship', 50).nullable().defaultTo('Indonesia').after('mother_name');
  });

  // 2. Buat tabel 1:N employee_addresses
  await knex.schema.createTable('employee_addresses', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.enum('address_type', ['ktp', 'domisili']).notNullable();
    table.text('street').nullable();
    table.string('rt', 5).nullable();
    table.string('rw', 5).nullable();
    table.string('hamlet', 100).nullable();
    table.string('village', 100).nullable();
    table.string('district', 100).nullable();
    table.string('city', 100).nullable();
    table.string('province', 100).nullable();
    table.string('postal_code', 10).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'address_type'], 'uq_employee_addresses_emp_type');
    table.index(['employee_id'], 'idx_employee_addresses_emp_id');
  });

  // Migrasi data lama dari employees.address -> employee_addresses (tipe 'domisili')
  const existingEmployeesWithAddress = await knex('employees')
    .whereNotNull('address')
    .whereRaw("TRIM(address) != ''")
    .select('id', 'address');

  if (existingEmployeesWithAddress.length > 0) {
    const addressRows = existingEmployeesWithAddress.map((emp) => ({
      employee_id: emp.id,
      address_type: 'domisili',
      street: emp.address,
      created_at: new Date(),
      updated_at: new Date()
    }));
    await knex('employee_addresses').insert(addressRows);
  }

  // 3. Perluas tabel employee_family_members
  await knex.schema.alterTable('employee_family_members', (table) => {
    table.string('birth_place', 100).nullable().after('name');
    table.date('marriage_date').nullable().after('birth_date');
    table.string('occupation', 100).nullable().after('marriage_date');
  });

  // 4. Perluas tabel employee_education_trainings
  // Modifikasi enum record_type dan tambah kolom detail
  await knex.schema.raw("ALTER TABLE employee_education_trainings MODIFY COLUMN record_type ENUM('education','training','certification','skill') NOT NULL");

  await knex.schema.alterTable('employee_education_trainings', (table) => {
    table.string('major', 100).nullable().after('education_level');
    table.date('event_start_date').nullable().after('organizer');
    table.date('event_end_date').nullable().after('event_start_date');
    table.string('proficiency_level', 50).nullable().after('event_end_date');
    table.string('certificate_number', 100).nullable().after('proficiency_level');
  });

  // 5. Buat tabel 1:N employee_publications
  await knex.schema.createTable('employee_publications', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.integer('publication_year').unsigned().nullable();
    table.string('publisher_or_media', 150).nullable();
    table.string('publication_url', 255).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id'], 'idx_employee_publications_emp_id');
  });

  // 6. Buat tabel 1:N employee_work_experiences
  await knex.schema.createTable('employee_work_experiences', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.string('organization_name', 150).notNullable();
    table.string('role_title', 150).notNullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id'], 'idx_employee_work_experiences_emp_id');
  });

  // 7. Perluas tabel employee_position_history
  await knex.schema.alterTable('employee_position_history', (table) => {
    table.enum('document_type', ['pengangkatan', 'spk', 'penugasan', 'jabatan_internal']).notNullable().defaultTo('jabatan_internal').after('rank');
    table.string('document_number', 100).nullable().after('document_type');
    table.smallint('validity_years').nullable().after('document_number');
    table.text('evaluation_note').nullable().after('validity_years');
  });

  // 8. Buat tabel 1:N employee_warning_letters
  await knex.schema.createTable('employee_warning_letters', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.date('warning_date').notNullable();
    table.string('letter_number', 100).notNullable();
    table.text('description').nullable();
    table.bigInteger('issued_by').unsigned().nullable()
      .references('id').inTable('employees').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id'], 'idx_employee_warning_letters_emp_id');
  });

  // 9. Buat tabel 1:N employee_organization_activities
  await knex.schema.createTable('employee_organization_activities', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.string('organization_name', 150).notNullable();
    table.string('position', 100).nullable();
    table.integer('year').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id'], 'idx_employee_org_activities_emp_id');
  });

  // 10. Buat tabel 1:N employee_document_checklists
  await knex.schema.createTable('employee_document_checklists', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.string('document_name', 100).notNullable();
    table.enum('status', ['available', 'not_available']).notNullable().defaultTo('not_available');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'document_name'], 'uq_employee_doc_checklists_emp_doc');
    table.index(['employee_id'], 'idx_employee_doc_checklists_emp_id');
  });

  // 11. Buat tabel 1:1 employee_bank_accounts
  await knex.schema.createTable('employee_bank_accounts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable().unique()
      .references('id').inTable('employees').onDelete('CASCADE');
    table.string('bank_name', 100).notNullable();
    table.string('account_number', 50).notNullable();
    table.string('account_holder_name', 150).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id'], 'idx_employee_bank_accounts_emp_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('employee_bank_accounts');
  await knex.schema.dropTableIfExists('employee_document_checklists');
  await knex.schema.dropTableIfExists('employee_organization_activities');
  await knex.schema.dropTableIfExists('employee_warning_letters');

  await knex.schema.alterTable('employee_position_history', (table) => {
    table.dropColumn('evaluation_note');
    table.dropColumn('validity_years');
    table.dropColumn('document_number');
    table.dropColumn('document_type');
  });

  await knex.schema.dropTableIfExists('employee_work_experiences');
  await knex.schema.dropTableIfExists('employee_publications');

  await knex.schema.alterTable('employee_education_trainings', (table) => {
    table.dropColumn('certificate_number');
    table.dropColumn('proficiency_level');
    table.dropColumn('event_end_date');
    table.dropColumn('event_start_date');
    table.dropColumn('major');
  });
  await knex.schema.raw("ALTER TABLE employee_education_trainings MODIFY COLUMN record_type ENUM('education','training','certification') NOT NULL");

  await knex.schema.alterTable('employee_family_members', (table) => {
    table.dropColumn('occupation');
    table.dropColumn('marriage_date');
    table.dropColumn('birth_place');
  });

  await knex.schema.dropTableIfExists('employee_addresses');

  await knex.schema.alterTable('employees', (table) => {
    table.dropColumn('citizenship');
    table.dropColumn('mother_name');
    table.dropColumn('nik');
  });
};
