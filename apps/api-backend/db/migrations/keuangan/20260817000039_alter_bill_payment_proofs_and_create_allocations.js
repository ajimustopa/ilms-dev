/**
 * Migration: alter_bill_payment_proofs_and_create_allocations
 * Modul Keuangan - Fitur Pemecahan (Split Allocation) Bukti Transfer ke Beberapa Tagihan Siswa
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Ubah tabel bill_payment_proofs
  // Jadikan student_bill_id nullable dan tambahkan total_transfer_amount serta student_id
  const hasTotal = await knex.schema.hasColumn('bill_payment_proofs', 'total_transfer_amount');
  if (!hasTotal) {
    await knex.schema.table('bill_payment_proofs', (table) => {
      table.bigInteger('student_id').unsigned().nullable().after('submitted_by_ref_id');
      table.decimal('total_transfer_amount', 18, 2).notNullable().defaultTo(0.00).after('amount');
    });
  }

  // Ubah student_bill_id menjadi NULLABLE
  await knex.raw(`
    ALTER TABLE \`bill_payment_proofs\` 
    MODIFY COLUMN \`student_bill_id\` BIGINT UNSIGNED NULL
  `);

  // Sinkronisasi total_transfer_amount = amount pada data lama
  await knex.raw(`
    UPDATE \`bill_payment_proofs\` 
    SET \`total_transfer_amount\` = \`amount\` 
    WHERE \`total_transfer_amount\` = 0.00 AND \`amount\` > 0
  `);

  // Sinkronisasi student_id dari student_bills jika ada
  await knex.raw(`
    UPDATE \`bill_payment_proofs\` p
    JOIN \`student_bills\` b ON p.student_bill_id = b.id
    SET p.student_id = b.student_id
    WHERE p.student_id IS NULL
  `);

  // 2. Buat tabel baru bill_payment_proof_allocations
  const hasAllocationsTable = await knex.schema.hasTable('bill_payment_proof_allocations');
  if (!hasAllocationsTable) {
    await knex.schema.createTable('bill_payment_proof_allocations', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('bill_payment_proof_id').unsigned().notNullable()
        .references('id').inTable('bill_payment_proofs')
        .onDelete('CASCADE').onUpdate('CASCADE');
      table.bigInteger('student_bill_id').unsigned().notNullable()
        .references('id').inTable('student_bills')
        .onDelete('RESTRICT').onUpdate('CASCADE');
      table.decimal('allocated_amount', 18, 2).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['bill_payment_proof_id', 'student_bill_id'], 'uq_bpp_allocations');
      table.index(['bill_payment_proof_id'], 'idx_bpp_allocations_proof');
    });

    // Migrasi data alokasi awal 1-to-1 untuk bukti transfer lama yang sudah punya student_bill_id
    await knex.raw(`
      INSERT IGNORE INTO \`bill_payment_proof_allocations\` (\`bill_payment_proof_id\`, \`student_bill_id\`, \`allocated_amount\`, \`created_at\`)
      SELECT \`id\`, \`student_bill_id\`, \`amount\`, \`created_at\`
      FROM \`bill_payment_proofs\`
      WHERE \`student_bill_id\` IS NOT NULL
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('bill_payment_proof_allocations');

  const hasTotal = await knex.schema.hasColumn('bill_payment_proofs', 'total_transfer_amount');
  if (hasTotal) {
    await knex.schema.table('bill_payment_proofs', (table) => {
      table.dropColumn(['total_transfer_amount', 'student_id']);
    });
  }
};
