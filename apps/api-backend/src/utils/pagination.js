/**
 * Pagination & Filtering Helper for Knex Queries
 */
async function paginateKnex(queryBuilder, { page = 1, limit = 25 }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 25));
  const offset = (p - 1) * l;

  // Clone query to count total
  const countQuery = queryBuilder.clone().clearSelect().clearOrder().count('* as total');
  const countResult = await countQuery;
  const total = countResult[0]?.total ? Number(countResult[0].total) : 0;

  const data = await queryBuilder.offset(offset).limit(l);

  return {
    data,
    meta: {
      total,
      page: p,
      limit: l,
      total_pages: Math.ceil(total / l),
      has_next: p < Math.ceil(total / l),
      has_prev: p > 1,
    },
  };
}

module.exports = {
  paginateKnex,
};
