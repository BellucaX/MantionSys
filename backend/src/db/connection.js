const Database = require('better-sqlite3');
const path = require('path');

let _db = null;

/**
 * Returns the shared DB instance, creating it on first call.
 * Tests set process.env.DB_PATH = ':memory:' before importing this module
 * OR call resetDb() then let the lazy getter re-create it.
 */
function getDb() {
  if (_db) return _db;

  const rawPath = process.env.DB_PATH || './mantion.db';
  const dbFile = rawPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), rawPath);

  _db = new Database(dbFile);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

/**
 * Close and reset the singleton — used in tests between suites.
 */
function resetDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Convenience wrappers that delegate to the current db instance
const db = {
  prepare: (...args) => getDb().prepare(...args),
  exec: (...args) => getDb().exec(...args),
  pragma: (...args) => getDb().pragma(...args),
  transaction: (...args) => getDb().transaction(...args),
  close: () => getDb().close(),
  getDb,
  resetDb,
};

module.exports = db;
