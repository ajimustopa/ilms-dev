/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasDomainCol = await knex.schema.hasColumn('rips_programs', 'domain_id');
  if (!hasDomainCol) {
    await knex.schema.alterTable('rips_programs', (table) => {
      table.bigInteger('domain_id').unsigned().nullable().after('category_id');
      table.foreign('domain_id', 'fk_rp_domain')
        .references('id')
        .inTable('rips_domains')
        .onDelete('SET NULL');
      table.index(['domain_id'], 'idx_rp_domain');
    });
  }

  const hasSubdomainCol = await knex.schema.hasColumn('rips_programs', 'subdomain_id');
  if (!hasSubdomainCol) {
    await knex.schema.alterTable('rips_programs', (table) => {
      table.bigInteger('subdomain_id').unsigned().nullable().after('domain_id');
      table.foreign('subdomain_id', 'fk_rp_subdomain')
        .references('id')
        .inTable('rips_subdomains')
        .onDelete('SET NULL');
      table.index(['subdomain_id'], 'idx_rp_subdomain');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasSubdomainCol = await knex.schema.hasColumn('rips_programs', 'subdomain_id');
  if (hasSubdomainCol) {
    await knex.schema.alterTable('rips_programs', (table) => {
      table.dropForeign('subdomain_id', 'fk_rp_subdomain');
      table.dropColumn('subdomain_id');
    });
  }
  const hasDomainCol = await knex.schema.hasColumn('rips_programs', 'domain_id');
  if (hasDomainCol) {
    await knex.schema.alterTable('rips_programs', (table) => {
      table.dropForeign('domain_id', 'fk_rp_domain');
      table.dropColumn('domain_id');
    });
  }
};
