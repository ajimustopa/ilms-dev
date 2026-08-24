/**
 * Parent-Facing Service Implementation
 * Modul Perpustakaan: Endpoint Konsumsi Modul Portal Orangtua - Fitur #171
 * Autentikasi via X-API-Key (Service-to-Service)
 */
const db = require('../../../config/db/perpustakaan');

class ParentFacingService {
  async getStudentLoanHistory(studentRefId) {
    const sId = Number(studentRefId);
    if (!sId) {
      const err = new Error('ID Siswa (student_ref_id) tidak valid');
      err.statusCode = 422;
      throw err;
    }

    // 1. Cari data anggota perpustakaan berdasarkan ref_id siswa Akademik
    const member = await db('library_members')
      .where({
        ref_type: 'student',
        ref_id: sId,
      })
      .first();

    if (!member) {
      const err = new Error(`Siswa dengan ID ${sId} belum terdaftar sebagai anggota perpustakaan`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Ambil riwayat peminjaman buku
    const loans = await db('book_loans as bl')
      .join('book_copies as bc', 'bl.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .where('bl.member_id', member.id)
      .select(
        'b.title as book_title',
        'b.author as book_author',
        'bl.borrowed_at',
        'bl.due_at',
        'bl.returned_at',
        'bl.loan_status',
        'bl.fine_amount',
        'bl.fine_payment_status'
      )
      .orderBy('bl.borrowed_at', 'desc');

    return {
      student_ref_id: sId,
      member_card_number: member.member_card_number,
      member_status: member.status,
      loan_history: loans,
    };
  }
}

module.exports = new ParentFacingService();
