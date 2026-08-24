/**
 * Reports Service Implementation
 * Modul Perpustakaan: Laporan Sirkulasi, Buku Terpopuler, dan Statistik Pemanfaatan
 */
const db = require('../../../config/db/perpustakaan');

class ReportsService {
  async getCirculationReport(schoolUnitId, query = {}) {
    let q = db('book_loans as bl')
      .where(function () {
        if (schoolUnitId) {
          this.where('bl.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.date_from) {
      q = q.where('bl.borrowed_at', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('bl.borrowed_at', '<=', query.date_to);
    }

    const loans = await q.select('bl.loan_status', 'bl.fine_amount', 'bl.fine_payment_status');

    let totalLoans = loans.length;
    let totalReturned = 0;
    let totalBorrowed = 0;
    let totalOverdue = 0;
    let totalLost = 0;
    let totalFine = 0;
    let totalFinePaid = 0;
    let totalFineUnpaid = 0;

    loans.forEach((l) => {
      if (l.loan_status === 'returned') totalReturned++;
      if (l.loan_status === 'borrowed') totalBorrowed++;
      if (l.loan_status === 'overdue') totalOverdue++;
      if (l.loan_status === 'lost') totalLost++;

      const fine = parseFloat(l.fine_amount) || 0;
      totalFine += fine;
      if (l.fine_payment_status === 'paid') totalFinePaid += fine;
      if (l.fine_payment_status === 'unpaid') totalFineUnpaid += fine;
    });

    return {
      period: {
        date_from: query.date_from || null,
        date_to: query.date_to || null,
      },
      summary: {
        total_transactions: totalLoans,
        currently_borrowed: totalBorrowed,
        returned: totalReturned,
        overdue: totalOverdue,
        lost: totalLost,
        total_fine_accumulated: totalFine,
        total_fine_paid: totalFinePaid,
        total_fine_unpaid: totalFineUnpaid,
      },
    };
  }

  async getPopularBooks(schoolUnitId, query = {}) {
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));

    let q = db('book_loans as bl')
      .join('book_copies as bc', 'bl.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .leftJoin('book_categories as c', 'b.category_id', 'c.id')
      .where(function () {
        if (schoolUnitId) {
          this.where('bl.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.date_from) {
      q = q.where('bl.borrowed_at', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('bl.borrowed_at', '<=', query.date_to);
    }

    const popular = await q
      .groupBy('b.id', 'b.title', 'b.author', 'b.isbn', 'c.category_name')
      .select(
        'b.id as book_id',
        'b.title as book_title',
        'b.author as book_author',
        'b.isbn as book_isbn',
        'c.category_name as category',
        db.raw('COUNT(bl.id) as borrow_count')
      )
      .orderBy('borrow_count', 'desc')
      .limit(limit);

    return popular.map((p) => ({
      ...p,
      borrow_count: parseInt(p.borrow_count) || 0,
    }));
  }

  async getUtilizationReport(schoolUnitId, query = {}) {
    // 1. Total Anggota Aktif
    let memberQ = db('library_members').where('status', 'active');
    if (schoolUnitId) {
      memberQ = memberQ.where('satuan_pendidikan_id', schoolUnitId);
    }
    const [{ totalMembers }] = await memberQ.count({ totalMembers: '*' });

    // 2. Total Judul & Eksemplar
    let bookQ = db('books').where('status', 'active');
    if (schoolUnitId) {
      bookQ = bookQ.where('satuan_pendidikan_id', schoolUnitId);
    }
    const [{ totalTitles }] = await bookQ.count({ totalTitles: '*' });

    let copyQ = db('book_copies as bc')
      .join('books as b', 'bc.book_id', 'b.id')
      .where('b.status', 'active');
    if (schoolUnitId) {
      copyQ = copyQ.where('b.satuan_pendidikan_id', schoolUnitId);
    }
    const [{ totalCopies }] = await copyQ.count({ totalCopies: '*' });

    // 3. Peminjaman Aktif Hari Ini
    let activeLoanQ = db('book_loans')
      .whereIn('loan_status', ['borrowed', 'overdue']);
    if (schoolUnitId) {
      activeLoanQ = activeLoanQ.where('satuan_pendidikan_id', schoolUnitId);
    }
    const [{ activeLoans }] = await activeLoanQ.count({ activeLoans: '*' });

    // 4. Total Transaksi Peminjaman Sepanjang Waktu
    let allLoanQ = db('book_loans');
    if (schoolUnitId) {
      allLoanQ = allLoanQ.where('satuan_pendidikan_id', schoolUnitId);
    }
    const [{ totalAllLoans }] = await allLoanQ.count({ totalAllLoans: '*' });

    const totalC = parseInt(totalCopies) || 0;
    const activeL = parseInt(activeLoans) || 0;
    const utilPct = totalC > 0 ? ((activeL / totalC) * 100).toFixed(1) : 0;

    return {
      koleksi_dan_anggota: {
        total_anggota_aktif: parseInt(totalMembers) || 0,
        total_judul_buku: parseInt(totalTitles) || 0,
        total_eksemplar_fisik: totalC,
      },
      sirkulasi: {
        total_transaksi_peminjaman: parseInt(totalAllLoans) || 0,
        buku_sedang_dipinjam_saat_ini: activeL,
        persentase_utilisasi_koleksi: parseFloat(utilPct),
      },
      // =========================================================================
      // CATATAN TENTATIF STATISTIK KUNJUNGAN:
      // Tabel library_visit_logs masih tentatif menunggu keputusan developer
      // terkait mekanisme pencatatan kehadiran fisik (rancangan-perpustakaan.md §5).
      // Nilai jumlah_kunjungan dikembalikan null.
      // =========================================================================
      kunjungan_fisik: {
        jumlah_kunjungan: null,
        catatan: 'Menunggu keputusan mekanisme pencatatan kunjungan fisik (fitur tentatif #176)',
      },
    };
  }
}

module.exports = new ReportsService();
