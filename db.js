// db.js

const sqlite3 = require("sqlite3").verbose();

function initDatabase() {
  const db = new sqlite3.Database(
    "./message.db",
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
  );
  db.serialize(); // ← Важно!
  return db;
}

module.exports = initDatabase;
