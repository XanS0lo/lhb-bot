const sqlite3 = require("sqlite3").verbose();

function initDatabase() {
  const db = new sqlite3.Database(
    "./message.db",
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
  );

  db.serialize(() => {
    // Создание таблицы information (если ещё не существует)
    db.run(`
      CREATE TABLE IF NOT EXISTS information (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT,
        message TEXT,
        time TEXT,
        created TEXT
      )
    `);

    // Создание таблицы message_vectors (если ещё не существует)
    db.run(`
      CREATE TABLE IF NOT EXISTS message_vectors (
        id INTEGER PRIMARY KEY,
        vector BLOB,
        FOREIGN KEY (id) REFERENCES information(id)
      )
    `);
  });

  return db;
}

module.exports = initDatabase;
