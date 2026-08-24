/**
 * Circulation Service Implementation
 * Modul Perpustakaan: Peminjaman (Loans), Pengembalian & Denda, Reservasi, dan Buku Hilang/Rusak
 */
const db = require('../../../config/db/perpustakaan');
const { validateStudent, validateEmployee } = require('../utils/crossModuleHelper');

class CirculationService {
  // ==========================================
  // 1. PEMINJAMAN BUKU (book_loans)
  // ==========================================

  async listLoans(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('book_loans as bl')
      .join('book_copies as bc', 'bl.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .join('library_members as lm', 'bl.member_id', 'lm.id')
      .where(function () {
        if (schoolUnitId) {
          this.where('bl.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.loan_status) {
      baseQuery = baseQuery.where('bl.loan_status', query.loan_status);
    }
    if (query.member_id) {
      baseQuery = baseQuery.where('bl.member_id', query.member_id);
    }
    if (query.book_copy_id) {
      baseQuery = baseQuery.where('bl.book_copy_id', query.book_copy_id);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where(function () {
        this.where('b.title', 'like', s)
          .orWhere('bc.copy_code', 'like', s)
          .orWhere('lm.member_card_number', 'like', s);
      });
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .select(
        'bl.*',
        'bc.copy_code',
        'bc.condition_status as copy_condition',
        'b.id as book_id',
        'b.title as book_title',
        'b.author as book_author',
        'b.isbn as book_isbn',
        'lm.member_card_number',
        'lm.ref_type as member_ref_type',
        'lm.ref_id as member_ref_id'
      )
      .orderBy('bl.id', 'desc')
      .limit(perPage)
      .offset(offset);

    // Enrich member names
    const enriched = await Promise.all(
      items.map(async (item) => {
        let profile = null;
        try {
          if (item.member_ref_type === 'student') {
            profile = await validateStudent(item.member_ref_id);
          } else if (item.member_ref_type === 'employee') {
            profile = await validateEmployee(item.member_ref_id);
          }
        } catch (e) {
          profile = { id: item.member_ref_id, full_name: `${item.member_ref_type} #${item.member_ref_id}` };
        }
        return {
          ...item,
          borrower_name: profile?.full_name || `Anggota #${item.member_id}`,
        };
      })
    );

    return {
      items: enriched,
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(total) || 0,
        total_pages: Math.ceil((total || 0) / perPage),
      },
    };
  }

  async getLoanById(schoolUnitId, id) {
    let q = db('book_loans as bl')
      .join('book_copies as bc', 'bl.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .join('library_members as lm', 'bl.member_id', 'lm.id')
      .where('bl.id', id);

    if (schoolUnitId) {
      q = q.where('bl.satuan_pendidikan_id', schoolUnitId);
    }

    const loan = await q
      .select(
        'bl.*',
        'bc.copy_code',
        'bc.condition_status as copy_condition',
        'bc.shelf_location as copy_shelf',
        'b.id as book_id',
        'b.title as book_title',
        'b.author as book_author',
        'b.isbn as book_isbn',
        'lm.member_card_number',
        'lm.ref_type as member_ref_type',
        'lm.ref_id as member_ref_id'
      )
      .first();

    if (!loan) {
      const err = new Error('Data transaksi peminjaman tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let profile = null;
    try {
      if (loan.member_ref_type === 'student') {
        profile = await validateStudent(loan.member_ref_id);
      } else if (loan.member_ref_type === 'employee') {
        profile = await validateEmployee(loan.member_ref_id);
      }
    } catch (e) {
      profile = { id: loan.member_ref_id, full_name: `Anggota #${loan.member_id}` };
    }

    return {
      ...loan,
      borrower_name: profile?.full_name || `Anggota #${loan.member_id}`,
      borrower_profile: profile,
    };
  }

  async createLoan(schoolUnitId, data, borrowedByUserId) {
    const schoolId = data.satuan_pendidikan_id || schoolUnitId || 1;

    // 1. Cek ketersediaan eksemplar buku (book_copies)
    const copy = await db('book_copies as bc')
      .join('books as b', 'bc.book_id', 'b.id')
      .where('bc.id', data.book_copy_id)
      .select('bc.*', 'b.title as book_title', 'b.satuan_pendidikan_id')
      .first();

    if (!copy) {
      const err = new Error(`Eksemplar buku dengan ID ${data.book_copy_id} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    if (copy.circulation_status !== 'available') {
      const err = new Error(
        `Eksemplar '${copy.copy_code || copy.id}' saat ini berstatus '${copy.circulation_status}', tidak tersedia untuk dipinjam`
      );
      err.statusCode = 409;
      throw err;
    }

    if (copy.condition_status === 'lost') {
      const err = new Error(`Eksemplar '${copy.copy_code || copy.id}' dilaporkan hilang`);
      err.statusCode = 409;
      throw err;
    }

    // 2. Cek status keanggotaan & batas maksimal peminjaman (library_members)
    const member = await db('library_members').where({ id: data.member_id }).first();
    if (!member) {
      const err = new Error(`Anggota perpustakaan ID ${data.member_id} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    if (member.status !== 'active') {
      const err = new Error('Keanggotaan perpustakaan sedang dinonaktifkan');
      err.statusCode = 409;
      throw err;
    }

    if (member.card_valid_until && new Date(member.card_valid_until) < new Date()) {
      const err = new Error('Kartu anggota perpustakaan telah kedaluwarsa');
      err.statusCode = 409;
      throw err;
    }

    // Hitung peminjaman aktif yang belum dikembalikan
    const [{ activeLoansCount }] = await db('book_loans')
      .where({ member_id: data.member_id })
      .whereIn('loan_status', ['borrowed', 'overdue'])
      .count({ activeLoansCount: '*' });

    const maxLimit = member.max_loan_limit || 3;
    if (parseInt(activeLoansCount) >= maxLimit) {
      const err = new Error(
        `Anggota telah mencapai batas maksimal pinjaman (${maxLimit} buku aktif)`
      );
      err.statusCode = 409;
      throw err;
    }

    // 3. Tentukan due_at (default 7 hari dari sekarang jika tidak dispesifikasikan)
    let dueAt;
    if (data.due_at) {
      dueAt = new Date(data.due_at);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dueAt = d;
    }

    const borrowedAt = new Date();

    // 4. Lakukan transaksi insert loan & update book_copies.circulation_status
    let newLoanId;
    await db.transaction(async (trx) => {
      const [id] = await trx('book_loans').insert({
        satuan_pendidikan_id: schoolId,
        book_copy_id: data.book_copy_id,
        member_id: data.member_id,
        loan_status: 'borrowed',
        borrowed_at: borrowedAt,
        due_at: dueAt,
        extended_count: 0,
        fine_amount: 0,
        fine_payment_status: 'none',
        borrowed_by: borrowedByUserId || null,
        created_at: borrowedAt,
        updated_at: borrowedAt,
      });

      newLoanId = id;

      // Update status eksemplar menjadi borrowed
      await trx('book_copies').where({ id: data.book_copy_id }).update({
        circulation_status: 'borrowed',
        updated_at: borrowedAt,
      });
    });

    return this.getLoanById(schoolId, newLoanId);
  }

  async extendLoan(schoolUnitId, loanId) {
    const loan = await this.getLoanById(schoolUnitId, loanId);

    if (loan.loan_status !== 'borrowed') {
      const err = new Error(`Peminjaman tidak dapat diperpanjang karena berstatus '${loan.loan_status}'`);
      err.statusCode = 409;
      throw err;
    }

    if (loan.extended_count >= 2) {
      const err = new Error('Buku sudah diperpanjang 2 kali (batas maksimal perpanjangan)');
      err.statusCode = 409;
      throw err;
    }

    // Cek apakah ada reservasi yang sedang menunggu untuk judul buku ini
    const pendingReservation = await db('book_reservations')
      .where({ book_id: loan.book_id, reservation_status: 'waiting' })
      .first();

    if (pendingReservation) {
      const err = new Error('Peminjaman tidak dapat diperpanjang karena buku ini telah direservasi oleh anggota lain');
      err.statusCode = 409;
      throw err;
    }

    // Tambah masa pinjam 7 hari ke depan
    const currentDue = new Date(loan.due_at);
    const newDue = new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db('book_loans').where({ id: loanId }).update({
      due_at: newDue,
      extended_count: loan.extended_count + 1,
      updated_at: new Date(),
    });

    return this.getLoanById(schoolUnitId, loanId);
  }

  async returnLoan(schoolUnitId, loanId, returnedToUserId) {
    const loan = await this.getLoanById(schoolUnitId, loanId);

    if (loan.loan_status === 'returned') {
      const err = new Error('Buku sudah berstatus dikembalikan sebelumnya');
      err.statusCode = 409;
      throw err;
    }

    const returnedAt = new Date();
    const dueAt = new Date(loan.due_at);

    // =========================================================================
    // PERHITUNGAN DENDA DINAMIS (Berdasarkan System Settings atau default Rp1.000/hari)
    // =========================================================================
    let fineAmount = 0;
    let finePaymentStatus = 'none';

    if (returnedAt > dueAt) {
      const diffMs = returnedAt.getTime() - dueAt.getTime();
      const daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLate > 0) {
        let fineRate = 1000;
        try {
          const dbCore = require('../../../config/db/core');
          const setting = await dbCore('system_settings')
            .where({ setting_key: 'library_fine_per_day' })
            .first();
          if (setting && setting.setting_value) {
            const parsed = Number(setting.setting_value);
            if (!isNaN(parsed)) fineRate = parsed;
          }
        } catch (e) {
          fineRate = 1000;
        }
        fineAmount = daysLate * fineRate;
        finePaymentStatus = 'unpaid';
      }
    }

    await db.transaction(async (trx) => {
      // 1. Update book_loans
      await trx('book_loans').where({ id: loanId }).update({
        loan_status: 'returned',
        returned_at: returnedAt,
        fine_amount: fineAmount,
        fine_payment_status: finePaymentStatus,
        returned_to: returnedToUserId || null,
        updated_at: returnedAt,
      });

      // 2. Update status eksemplar kembali menjadi available
      await trx('book_copies').where({ id: loan.book_copy_id }).update({
        circulation_status: 'available',
        updated_at: returnedAt,
      });

      // 3. Trigger antrean reservasi: Jika ada yang waiting untuk buku ini, set jadi ready_to_pickup
      const waitingReservation = await trx('book_reservations')
        .where({ book_id: loan.book_id, reservation_status: 'waiting' })
        .orderBy('reserved_at', 'asc')
        .first();

      if (waitingReservation) {
        const expiresAt = new Date(returnedAt.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 hari waktu ambil
        await trx('book_reservations').where({ id: waitingReservation.id }).update({
          reservation_status: 'ready_to_pickup',
          notified_at: returnedAt,
          expires_at: expiresAt,
          updated_at: returnedAt,
        });
      }
    });

    return this.getLoanById(schoolUnitId, loanId);
  }

  async payFine(schoolUnitId, loanId) {
    const loan = await this.getLoanById(schoolUnitId, loanId);

    if (Number(loan.fine_amount) <= 0) {
      const err = new Error('Peminjaman ini tidak memiliki tagihan denda');
      err.statusCode = 400;
      throw err;
    }

    if (loan.fine_payment_status === 'paid') {
      const err = new Error('Denda peminjaman ini sudah dibayar lunas');
      err.statusCode = 409;
      throw err;
    }

    await db('book_loans').where({ id: loanId }).update({
      fine_payment_status: 'paid',
      updated_at: new Date(),
    });

    return this.getLoanById(schoolUnitId, loanId);
  }

  // ==========================================
  // 2. RESERVASI / BOOKING BUKU (book_reservations)
  // ==========================================

  async listReservations(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('book_reservations as br')
      .join('books as b', 'br.book_id', 'b.id')
      .join('library_members as lm', 'br.member_id', 'lm.id')
      .where(function () {
        if (schoolUnitId) {
          this.where('br.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.reservation_status) {
      baseQuery = baseQuery.where('br.reservation_status', query.reservation_status);
    }
    if (query.member_id) {
      baseQuery = baseQuery.where('br.member_id', query.member_id);
    }
    if (query.book_id) {
      baseQuery = baseQuery.where('br.book_id', query.book_id);
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .select(
        'br.*',
        'b.title as book_title',
        'b.author as book_author',
        'b.shelf_location as book_shelf',
        'lm.member_card_number',
        'lm.ref_type as member_ref_type',
        'lm.ref_id as member_ref_id'
      )
      .orderBy('br.id', 'desc')
      .limit(perPage)
      .offset(offset);

    const enriched = await Promise.all(
      items.map(async (item) => {
        let profile = null;
        try {
          if (item.member_ref_type === 'student') {
            profile = await validateStudent(item.member_ref_id);
          } else if (item.member_ref_type === 'employee') {
            profile = await validateEmployee(item.member_ref_id);
          }
        } catch (e) {
          profile = { id: item.member_ref_id, full_name: `Anggota #${item.member_id}` };
        }
        return {
          ...item,
          member_name: profile?.full_name || `Anggota #${item.member_id}`,
        };
      })
    );

    return {
      items: enriched,
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(total) || 0,
        total_pages: Math.ceil((total || 0) / perPage),
      },
    };
  }

  async createReservation(schoolUnitId, data) {
    const schoolId = data.satuan_pendidikan_id || schoolUnitId || 1;

    // 1. Cek apakah buku ada
    const book = await db('books').where({ id: data.book_id }).first();
    if (!book) {
      const err = new Error(`Koleksi buku ID ${data.book_id} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Cek apakah ada eksemplar yang masih available
    const copies = await db('book_copies').where({ book_id: data.book_id });
    if (copies.length === 0) {
      const err = new Error('Buku belum memiliki eksemplar fisik');
      err.statusCode = 409;
      throw err;
    }

    const availableCopies = copies.filter(
      (c) => c.circulation_status === 'available' && c.condition_status === 'good'
    );

    if (availableCopies.length > 0) {
      const err = new Error(
        `Buku '${book.title}' saat ini masih memiliki ${availableCopies.length} eksemplar yang tersedia di rak (${book.shelf_location || 'Rak Utama'}). Silakan lakukan peminjaman langsung tanpa reservasi.`
      );
      err.statusCode = 409;
      throw err;
    }

    // 3. Cek apakah anggota sudah memiliki reservasi aktif untuk buku ini
    const existing = await db('book_reservations')
      .where({
        book_id: data.book_id,
        member_id: data.member_id,
      })
      .whereIn('reservation_status', ['waiting', 'ready_to_pickup'])
      .first();

    if (existing) {
      const err = new Error('Anda sudah memiliki antrean reservasi aktif untuk buku ini');
      err.statusCode = 409;
      throw err;
    }

    const now = new Date();
    const [id] = await db('book_reservations').insert({
      satuan_pendidikan_id: schoolId,
      book_id: data.book_id,
      member_id: data.member_id,
      reservation_status: 'waiting',
      reserved_at: now,
      created_at: now,
      updated_at: now,
    });

    return db('book_reservations').where({ id }).first();
  }

  async cancelReservation(schoolUnitId, reservationId) {
    const reservation = await db('book_reservations').where({ id: reservationId }).first();
    if (!reservation) {
      const err = new Error('Data reservasi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (!['waiting', 'ready_to_pickup'].includes(reservation.reservation_status)) {
      const err = new Error(`Reservasi tidak dapat dibatalkan karena berstatus '${reservation.reservation_status}'`);
      err.statusCode = 409;
      throw err;
    }

    await db('book_reservations').where({ id: reservationId }).update({
      reservation_status: 'cancelled',
      updated_at: new Date(),
    });

    return { message: 'Reservasi buku berhasil dibatalkan' };
  }

  // ==========================================
  // 3. BUKU HILANG & RUSAK (lost_damaged_reports)
  // ==========================================

  async listLostDamagedReports(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('lost_damaged_reports as ldr')
      .join('book_copies as bc', 'ldr.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .leftJoin('book_loans as bl', 'ldr.loan_id', 'bl.id')
      .where(function () {
        if (schoolUnitId) {
          this.where('b.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.condition_status) {
      baseQuery = baseQuery.where('ldr.condition_status', query.condition_status);
    }
    if (query.resolution_status) {
      baseQuery = baseQuery.where('ldr.resolution_status', query.resolution_status);
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .select(
        'ldr.*',
        'bc.copy_code',
        'b.id as book_id',
        'b.title as book_title',
        'bl.member_id as loan_member_id'
      )
      .orderBy('ldr.id', 'desc')
      .limit(perPage)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(total) || 0,
        total_pages: Math.ceil((total || 0) / perPage),
      },
    };
  }

  async createLostDamagedReport(schoolUnitId, data, reportedByUserId) {
    const copy = await db('book_copies').where({ id: data.book_copy_id }).first();
    if (!copy) {
      const err = new Error(`Eksemplar buku ID ${data.book_copy_id} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    // =========================================================================
    // ASUMSI MANAJEMEN STATUS SIRKULASI:
    // - Jika condition_status = 'damaged': set circulation_status = 'under_repair'
    //   karena buku sedang dalam perbaikan fisik/jilid ulang.
    // - Jika condition_status = 'lost': set condition_status = 'lost'.
    //   Bila dilaporkan saat masa pinjam (loan_id ada), loan_status diupdate ke 'lost'
    //   dan circulation_status tetap ditandai 'lost' hingga proses ganti rugi resolved.
    // =========================================================================
    const now = new Date();
    let newReportId;

    await db.transaction(async (trx) => {
      const [id] = await trx('lost_damaged_reports').insert({
        book_copy_id: data.book_copy_id,
        loan_id: data.loan_id || null,
        condition_status: data.condition_status,
        description: data.description || null,
        replacement_fee: data.replacement_fee || 0,
        fee_payment_status: data.replacement_fee > 0 ? 'unpaid' : 'none',
        reported_by: reportedByUserId || null,
        resolution_status: 'open',
        created_at: now,
        updated_at: now,
      });

      newReportId = id;

      // Update eksemplar
      const newCircStatus = data.condition_status === 'damaged' ? 'under_repair' : 'borrowed';
      await trx('book_copies').where({ id: data.book_copy_id }).update({
        condition_status: data.condition_status,
        circulation_status: newCircStatus,
        updated_at: now,
      });

      // Jika ada loan_id terkait, perbarui loan_status jika hilang
      if (data.loan_id && data.condition_status === 'lost') {
        await trx('book_loans').where({ id: data.loan_id }).update({
          loan_status: 'lost',
          updated_at: now,
        });
      }
    });

    return db('lost_damaged_reports').where({ id: newReportId }).first();
  }

  async resolveLostDamagedReport(schoolUnitId, reportId, data) {
    const report = await db('lost_damaged_reports').where({ id: reportId }).first();
    if (!report) {
      const err = new Error('Laporan kehilangan/kerusakan buku tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (report.resolution_status === 'resolved') {
      const err = new Error('Laporan ini sudah diselesaikan sebelumnya');
      err.statusCode = 409;
      throw err;
    }

    const now = new Date();

    await db.transaction(async (trx) => {
      await trx('lost_damaged_reports').where({ id: reportId }).update({
        resolution_status: 'resolved',
        resolved_at: now,
        fee_payment_status: data.fee_payment_status || 'paid',
        updated_at: now,
      });

      // Update status eksemplar jika rusak telah diperbaiki
      if (report.condition_status === 'damaged') {
        await trx('book_copies').where({ id: report.book_copy_id }).update({
          condition_status: 'good',
          circulation_status: 'available',
          updated_at: now,
        });
      }
    });

    return db('lost_damaged_reports').where({ id: reportId }).first();
  }
}

module.exports = new CirculationService();
