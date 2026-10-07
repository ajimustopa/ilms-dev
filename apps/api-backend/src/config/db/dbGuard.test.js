const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDevDatabase } = require('./dbGuard');

test('assertDevDatabase: Menerima host 127.0.0.1 dengan database berakhiran _dev', () => {
  const result = assertDevDatabase({ host: '127.0.0.1', database: 'kepegawaian_dev' }, 'TEST_MIGRATE');
  assert.equal(result.valid, true);
  assert.equal(result.host, '127.0.0.1');
  assert.equal(result.database, 'kepegawaian_dev');
});

test('assertDevDatabase: Menerima host localhost dengan database core_dev', () => {
  const result = assertDevDatabase({ host: 'localhost', database: 'core_dev' }, 'TEST_SEED');
  assert.equal(result.valid, true);
  assert.equal(result.database, 'core_dev');
});

test('assertDevDatabase: MENOLAK database produksi berawalan u622997391_* (Live Name)', () => {
  assert.throws(
    () => assertDevDatabase({ host: '127.0.0.1', database: 'u622997391_kepegawaian' }, 'TEST_WRITE'),
    (err) => {
      assert.equal(err.code, 'ERR_NON_DEV_DATABASE_FORBIDDEN');
      assert.match(err.message, /BUKAN database dev/);
      return true;
    }
  );
});

test('assertDevDatabase: MENOLAK database tanpa akhiran _dev (misal kepegawaian polos)', () => {
  assert.throws(
    () => assertDevDatabase({ host: '127.0.0.1', database: 'kepegawaian' }, 'TEST_WRITE'),
    (err) => {
      assert.equal(err.code, 'ERR_NON_DEV_DATABASE_FORBIDDEN');
      return true;
    }
  );
});

test('assertDevDatabase: MENOLAK host remote (meskipun nama database berakhiran _dev)', () => {
  assert.throws(
    () => assertDevDatabase({ host: '194.163.45.12', database: 'kepegawaian_dev' }, 'TEST_MIGRATE'),
    (err) => {
      assert.equal(err.code, 'ERR_REMOTE_DB_FORBIDDEN');
      assert.match(err.message, /BUKAN host lokal/);
      return true;
    }
  );
});

test('assertDevDatabase: MENOLAK host remote domain publik', () => {
  assert.throws(
    () => assertDevDatabase({ host: 'db.aldepos.sch.id', database: 'core_dev' }, 'TEST_MIGRATE'),
    (err) => {
      assert.equal(err.code, 'ERR_REMOTE_DB_FORBIDDEN');
      return true;
    }
  );
});
