/**
 * Database Guard & Safety Assertion
 * Sesuai Blok A Aturan 5 & SPEC §2 #29:
 * Mencegah eksekusi operasi tulis/migrasi/seed pada database live / produksi.
 */

const ALLOWED_DEV_HOSTS = ['127.0.0.1', 'localhost', '::1'];

/**
 * Validasi target koneksi database.
 * @param {object} connection - Objek koneksi knex / mysql2
 * @param {string} [contextLabel] - Label operasi (misal 'MIGRATE', 'SEED', 'WRITE')
 * @returns {{ valid: boolean, host: string, database: string }}
 * @throws {Error} Jika target host bukan lokal atau nama database tidak berakhiran _dev
 */
function assertDevDatabase(connection = {}, contextLabel = 'DB_GUARD') {
  const host = connection.host || process.env.DB_HOST || '127.0.0.1';
  const database = connection.database || connection.db || '';

  const isLocalHost = ALLOWED_DEV_HOSTS.includes(String(host).toLowerCase().trim());
  const isDevDatabase = String(database).endsWith('_dev');

  if (!isLocalHost) {
    const errorMsg = `[FATAL SECURITY ERROR] [${contextLabel}] Operasi ditolak! Host '${host}' BUKAN host lokal (${ALLOWED_DEV_HOSTS.join(', ')}).`;
    console.error(errorMsg);
    const err = new Error(errorMsg);
    err.code = 'ERR_REMOTE_DB_FORBIDDEN';
    throw err;
  }

  if (!isDevDatabase) {
    const errorMsg = `[FATAL SECURITY ERROR] [${contextLabel}] Operasi ditolak! Database '${database}' BUKAN database dev (wajib berakhiran '_dev'). Dilarang menyentuh database produksi/live!`;
    console.error(errorMsg);
    const err = new Error(errorMsg);
    err.code = 'ERR_NON_DEV_DATABASE_FORBIDDEN';
    throw err;
  }

  return {
    valid: true,
    host,
    database
  };
}

module.exports = {
  assertDevDatabase,
  ALLOWED_DEV_HOSTS
};
