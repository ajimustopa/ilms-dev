/**
 * Migration 81: Add academic_year_id to journal_entries and backfill
 * Menyelaraskan pencatatan jurnal akuntansi dengan konteks peruntukan Tahun Ajaran (bukan sekadar tanggal kalender)
 */

exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('journal_entries', 'academic_year_id');
  if (!hasCol) {
    await knex.schema.alterTable('journal_entries', function (table) {
      table.bigInteger('academic_year_id').unsigned().notNullable().defaultTo(2).after('school_unit_id');
      table.index(['school_unit_id', 'academic_year_id'], 'idx_journal_entries_ay');
    });

    // 1. Backfill dari pembayaran tagihan siswa (bill_payments -> student_bills)
    try {
      await knex.raw(`
        UPDATE journal_entries je
        JOIN bill_payments bp ON je.source_type = 'student_bill_payment' AND je.source_id = bp.id
        JOIN student_bills sb ON bp.student_bill_id = sb.id
        SET je.academic_year_id = sb.academic_year_id
        WHERE sb.academic_year_id IS NOT NULL
      `);
    } catch (e) {
      console.warn('Backfill journal_entries from student_bills warning:', e.message);
    }

    // 2. Backfill dari pembayaran PPDB (ppdb_registration_bills)
    try {
      const hasPpdbTable = await knex.schema.hasTable('ppdb_registration_bills');
      if (hasPpdbTable) {
        await knex.raw(`
          UPDATE journal_entries je
          JOIN ppdb_registration_bills prb ON je.source_id = prb.id
          SET je.academic_year_id = prb.academic_year_id
          WHERE je.source_type IN ('ppdb_bill_payment', 'student_bill_payment')
            AND prb.academic_year_id IS NOT NULL
        `);
      }
    } catch (e) {
      console.warn('Backfill journal_entries from ppdb_registration_bills warning:', e.message);
    }

    // 3. Backfill dari pengeluaran / belanja (expenses)
    try {
      await knex.raw(`
        UPDATE journal_entries je
        JOIN expenses e ON je.source_type = 'expense' AND je.source_id = e.id
        SET je.academic_year_id = e.academic_year_id
        WHERE e.academic_year_id IS NOT NULL
      `);
    } catch (e) {
      console.warn('Backfill journal_entries from expenses warning:', e.message);
    }

    // 4. Backfill dari pemasukan lain (other_incomes)
    try {
      await knex.raw(`
        UPDATE journal_entries je
        JOIN other_incomes oi ON je.source_type = 'other_income' AND je.source_id = oi.id
        SET je.academic_year_id = oi.academic_year_id
        WHERE oi.academic_year_id IS NOT NULL
      `);
    } catch (e) {
      console.warn('Backfill journal_entries from other_incomes warning:', e.message);
    }
  }
};

exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('journal_entries', 'academic_year_id');
  if (hasCol) {
    await knex.schema.alterTable('journal_entries', function (table) {
      table.dropIndex(['school_unit_id', 'academic_year_id'], 'idx_journal_entries_ay');
      table.dropColumn('academic_year_id');
    });
  }
};
