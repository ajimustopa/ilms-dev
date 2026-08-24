/**
 * Members Service Implementation
 * Modul Perpustakaan: Data Anggota & Riwayat Peminjaman
 */
const db = require('../../../config/db/perpustakaan');
const {
  validateStudent,
  validateEmployee,
} = require('../utils/crossModuleHelper');

class MembersService {
  async listMembers(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('library_members')
      .where(function () {
        if (schoolUnitId) {
          this.where('satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.ref_type) {
      baseQuery = baseQuery.where('ref_type', query.ref_type);
    }
    if (query.status) {
      baseQuery = baseQuery.where('status', query.status);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where('member_card_number', 'like', s);
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .orderBy('id', 'desc')
      .limit(perPage)
      .offset(offset);

    // Enriching nama anggota in-process
    const enriched = await Promise.all(
      items.map(async (m) => {
        let profile = null;
        try {
          if (m.ref_type === 'student') {
            profile = await validateStudent(m.ref_id);
          } else if (m.ref_type === 'employee') {
            profile = await validateEmployee(m.ref_id);
          }
        } catch (e) {
          profile = { id: m.ref_id, full_name: `${m.ref_type} #${m.ref_id}` };
        }
        return {
          ...m,
          member_name: profile?.full_name || `${m.ref_type} #${m.ref_id}`,
          member_detail: profile,
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

  async getMemberById(schoolUnitId, id) {
    let q = db('library_members').where({ id });
    if (schoolUnitId) {
      q = q.where({ satuan_pendidikan_id: schoolUnitId });
    }

    const member = await q.first();
    if (!member) {
      const err = new Error('Data anggota perpustakaan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Ambil detail nama & profil dari modul terkait
    let profile = null;
    try {
      if (member.ref_type === 'student') {
        profile = await validateStudent(member.ref_id);
      } else if (member.ref_type === 'employee') {
        profile = await validateEmployee(member.ref_id);
      }
    } catch (e) {
      profile = { id: member.ref_id, full_name: `${member.ref_type} #${member.ref_id}` };
    }

    // Hitung peminjaman aktif
    const activeLoans = await db('book_loans')
      .where({ member_id: id })
      .whereIn('loan_status', ['borrowed', 'overdue'])
      .count({ total: '*' });

    return {
      ...member,
      member_name: profile?.full_name || `${member.ref_type} #${member.ref_id}`,
      profile,
      active_loans_count: parseInt(activeLoans[0]?.total) || 0,
    };
  }

  async registerMember(schoolUnitId, data, registeredByUserId) {
    const schoolId = data.satuan_pendidikan_id || schoolUnitId || 1;

    // 1. Validasi keberadaan entitas eksternal di modul Akademik / Kepegawaian
    let entityProfile = null;
    if (data.ref_type === 'student') {
      entityProfile = await validateStudent(data.ref_id);
    } else if (data.ref_type === 'employee') {
      entityProfile = await validateEmployee(data.ref_id);
    } else {
      const err = new Error("Tipe referensi (ref_type) tidak valid. Harus 'student' atau 'employee'");
      err.statusCode = 422;
      throw err;
    }

    // 2. Cek apakah sudah terdaftar di satuan pendidikan yang sama
    const existing = await db('library_members')
      .where({
        satuan_pendidikan_id: schoolId,
        ref_type: data.ref_type,
        ref_id: data.ref_id,
      })
      .first();

    if (existing) {
      const err = new Error(`Entitas ${data.ref_type} ID ${data.ref_id} (${entityProfile?.full_name || ''}) sudah terdaftar sebagai anggota perpustakaan`);
      err.statusCode = 409;
      throw err;
    }

    // 3. Generate Nomor Kartu Anggota otomatis jika tidak dispesifikasikan
    let cardNumber = data.member_card_number;
    if (!cardNumber) {
      const count = await db('library_members').where({ satuan_pendidikan_id: schoolId }).count({ total: '*' });
      const nextNum = (count[0]?.total || 0) + 1;
      const prefix = data.ref_type === 'student' ? 'ANG-S' : 'ANG-P';
      cardNumber = `${prefix}-${schoolId}-${nextNum.toString().padStart(4, '0')}`;
    } else {
      const duplicateCard = await db('library_members').where({ member_card_number: cardNumber }).first();
      if (duplicateCard) {
        const err = new Error(`Nomor kartu anggota '${cardNumber}' sudah digunakan`);
        err.statusCode = 409;
        throw err;
      }
    }

    // 4. Insert data anggota baru
    const [id] = await db('library_members').insert({
      satuan_pendidikan_id: schoolId,
      ref_type: data.ref_type,
      ref_id: data.ref_id,
      member_card_number: cardNumber,
      card_valid_until: data.card_valid_until || null,
      max_loan_limit: data.max_loan_limit || (data.ref_type === 'student' ? 3 : 5),
      status: 'active',
      registered_by: registeredByUserId || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.getMemberById(schoolId, id);
  }

  async updateMemberStatus(schoolUnitId, id, status) {
    await this.getMemberById(schoolUnitId, id);

    let q = db('library_members').where({ id });
    if (schoolUnitId) {
      q = q.where({ satuan_pendidikan_id: schoolUnitId });
    }

    await q.update({
      status,
      updated_at: new Date(),
    });

    return this.getMemberById(schoolUnitId, id);
  }

  async getMemberLoanHistory(schoolUnitId, memberId, query = {}) {
    await this.getMemberById(schoolUnitId, memberId);

    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('book_loans as bl')
      .join('book_copies as bc', 'bl.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .where('bl.member_id', memberId);

    if (query.status) {
      baseQuery = baseQuery.where('bl.loan_status', query.status);
    }
    if (query.date_from) {
      baseQuery = baseQuery.where('bl.borrowed_at', '>=', query.date_from);
    }
    if (query.date_to) {
      baseQuery = baseQuery.where('bl.borrowed_at', '<=', query.date_to);
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
        'b.cover_image_url'
      )
      .orderBy('bl.borrowed_at', 'desc')
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
}

module.exports = new MembersService();
