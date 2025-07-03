// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

function initDatabase() {
  const db = new sqlite3.Database(
    path.resolve(__dirname, "message.db"),
    (err) => {
      if (err) {
        console.error("❌ Ошибка подключения к базе данных:", err.message);
      } else {
        console.log("✅ База данных подключена");
      }
    }
  );

  return db;
}

module.exports = initDatabase;
