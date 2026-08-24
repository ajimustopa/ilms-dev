/**
 * Reminders Service Implementation
 * Modul Perpustakaan: Pengingat Jatuh Tempo & Denda - Fitur #175
 * Append-Only Log: loan_reminders
 */
const db = require('../../../config/db/perpustakaan');
const { validateStudent, validateEmployee } = require('../utils/crossModuleHelper');

class RemindersService {
  async listReminders(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let baseQuery = db('loan_reminders as lr')
      .join('book_loans as bl', 'lr.loan_id', 'bl.id')
      .join('book_copies as bc', 'bl.book_copy_id', 'bc.id')
      .join('books as b', 'bc.book_id', 'b.id')
      .join('library_members as lm', 'lr.member_id', 'lm.id')
      .where(function () {
        if (schoolUnitId) {
          this.where('bl.satuan_pendidikan_id', schoolUnitId);
        }
      });

    if (query.reminder_type) {
      baseQuery = baseQuery.where('lr.reminder_type', query.reminder_type);
    }
    if (query.status) {
      baseQuery = baseQuery.where('lr.status', query.status);
    }

    const [{ total }] = await baseQuery.clone().count({ total: '*' });

    const items = await baseQuery
      .select(
        'lr.*',
        'bl.due_at',
        'bl.loan_status',
        'bl.fine_amount',
        'b.title as book_title',
        'bc.copy_code',
        'lm.member_card_number',
        'lm.ref_type as member_ref_type',
        'lm.ref_id as member_ref_id'
      )
      .orderBy('lr.id', 'desc')
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

  async runReminderJob(schoolUnitId) {
    const now = new Date();
    const hPlus1 = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam ke depan (H-1)

    // 1. Cari peminjaman aktif yang due_at mendekati (H-1) atau sudah lewat (overdue)
    let loansQuery = db('book_loans')
      .where('loan_status', 'borrowed');

    if (schoolUnitId) {
      loansQuery = loansQuery.where('satuan_pendidikan_id', schoolUnitId);
    }

    const loans = await loansQuery;

    let queuedCount = 0;
    const queuedItems = [];

    for (const loan of loans) {
      const dueAt = new Date(loan.due_at);
      let reminderType = null;

      if (now > dueAt) {
        reminderType = 'overdue';
      } else if (dueAt <= hPlus1) {
        reminderType = 'due_soon';
      }

      if (reminderType) {
        // Cek apakah sudah pernah dibuat reminder dengan tipe yang sama dalam 24 jam terakhir
        const recentReminder = await db('loan_reminders')
          .where({
            loan_id: loan.id,
            reminder_type: reminderType,
          })
          .where('created_at', '>=', new Date(now.getTime() - 24 * 60 * 60 * 1000))
          .first();

        if (!recentReminder) {
          // =====================================================================
          // PENGIRIMAN SUNGGUHAN:
          // Sesuai rancangan-perpustakaan.md §6 & api-contract-perpustakaan.md §4,
          // pengiriman via WhatsApp/Email didelegasikan ke modul Komunikasi & Notifikasi.
          // Endpoint ini mencatat antrean ke loan_reminders dengan status='queued'.
          // =====================================================================
          const [id] = await db('loan_reminders').insert({
            loan_id: loan.id,
            member_id: loan.member_id,
            reminder_type: reminderType,
            channel: 'internal',
            status: 'queued',
            sent_at: null,
            created_at: now,
          });

          queuedCount++;
          queuedItems.push({
            id,
            loan_id: loan.id,
            member_id: loan.member_id,
            reminder_type: reminderType,
            status: 'queued',
          });
        }
      }
    }

    return {
      total_checked: loans.length,
      queued_count: queuedCount,
      queued_reminders: queuedItems,
    };
  }
}

module.exports = new RemindersService();
