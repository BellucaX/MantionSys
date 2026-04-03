const fs = require('fs');
const path = require('path');
const db = require('./connection');

function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Execute all CREATE TABLE statements
  db.exec(schema);
  console.log('[DB] Migration complete');
}

module.exports = { migrate };
