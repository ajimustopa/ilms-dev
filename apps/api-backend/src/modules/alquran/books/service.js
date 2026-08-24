/**
 * Books (Kitab Kuning) Service for Alquran Module
 * Sesuai api-contract-alquran.md §2.4 & erd-alquran.md §2.4
 */
const db = require('../../../config/db/alquran');
const employeesService = require('../../kepegawaian/employees/service');

class BooksService {
  async listBooks(schoolUnitId, filters = {}) {
    let query = db('kitab_kuning').where('school_unit_id', schoolUnitId);

    if (filters.status_active !== undefined) {
      const isActive = filters.status_active === 'true' || filters.status_active === true;
      query = query.where('status_active', isActive);
    } else {
      query = query.where('status_active', true);
    }

    if (filters.level) {
      query = query.where('level', filters.level);
    }
    if (filters.search) {
      query = query.where(function() {
        this.where('book_name', 'like', `%${filters.search}%`)
            .orWhere('author', 'like', `%${filters.search}%`);
      });
    }

    return query.orderBy('id', 'asc');
  }

  async getBookById(schoolUnitId, id) {
    return db('kitab_kuning')
      .where({ id, school_unit_id: schoolUnitId })
      .first();
  }

  async createBook(schoolUnitId, data) {
    const { book_name, author = null, level = null, teacher_ref_id = null } = data;

    // In-process validasi jika teacher_ref_id diisi
    if (teacher_ref_id) {
      await employeesService.getEmployeeById(teacher_ref_id);
    }

    const [id] = await db('kitab_kuning').insert({
      school_unit_id: schoolUnitId,
      book_name,
      author,
      level,
      teacher_ref_id,
      status_active: true
    });

    const actualId = id || (await db('kitab_kuning').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;
    return this.getBookById(schoolUnitId, actualId);
  }

  async updateBook(schoolUnitId, id, data) {
    const book = await this.getBookById(schoolUnitId, id);
    if (!book) return null;

    if (data.teacher_ref_id && data.teacher_ref_id !== book.teacher_ref_id) {
      await employeesService.getEmployeeById(data.teacher_ref_id);
    }

    await db('kitab_kuning')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        book_name: data.book_name !== undefined ? data.book_name : book.book_name,
        author: data.author !== undefined ? data.author : book.author,
        level: data.level !== undefined ? data.level : book.level,
        teacher_ref_id: data.teacher_ref_id !== undefined ? data.teacher_ref_id : book.teacher_ref_id,
        status_active: data.status_active !== undefined ? data.status_active : book.status_active
      });

    return this.getBookById(schoolUnitId, id);
  }

  async deleteBook(schoolUnitId, id) {
    const book = await this.getBookById(schoolUnitId, id);
    if (!book) return false;

    // Soft delete: set status_active = false
    await db('kitab_kuning')
      .where({ id, school_unit_id: schoolUnitId })
      .update({ status_active: false });

    return true;
  }
}

module.exports = new BooksService();
