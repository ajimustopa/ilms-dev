/**
 * Product Categories Service
 * Sesuai api-contract-kantin.md Modul 2 & erd-kantin.md §2.4
 */
const db = require('../../../config/db/kantin');

class ProductCategoriesService {
  async listCategories(schoolUnitId, query = {}) {
    let q = db('product_categories').where('school_unit_id', schoolUnitId);

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.search) {
      q = q.where('category_name', 'like', `%${query.search}%`);
    }

    return q.orderBy('id', 'desc');
  }

  async getCategoryById(schoolUnitId, id) {
    return db('product_categories').where({ id, school_unit_id: schoolUnitId }).first();
  }

  async createCategory(schoolUnitId, payload) {
    const { category_name, description = null } = payload;
    const [id] = await db('product_categories').insert({
      school_unit_id: schoolUnitId,
      category_name,
      description,
      status: 'active'
    });
    return this.getCategoryById(schoolUnitId, id);
  }

  async updateCategory(schoolUnitId, id, payload) {
    const category = await this.getCategoryById(schoolUnitId, id);
    if (!category) return null;

    const { category_name, description } = payload;
    await db('product_categories')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        category_name: category_name !== undefined ? category_name : category.category_name,
        description: description !== undefined ? description : category.description,
        updated_at: db.fn.now()
      });

    return this.getCategoryById(schoolUnitId, id);
  }

  async updateStatus(schoolUnitId, id, payload) {
    const category = await this.getCategoryById(schoolUnitId, id);
    if (!category) return null;

    const { status, status_note = null } = payload;
    await db('product_categories')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status,
        status_note,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return this.getCategoryById(schoolUnitId, id);
  }
}

module.exports = new ProductCategoriesService();
