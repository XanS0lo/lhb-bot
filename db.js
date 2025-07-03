const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Подключаемся к базе или создаём её, если нет
const db = new sqlite3.Database(
  path.resolve(__dirname, "message.db"),
  (err) => {
    if (err) {
      console.error("Ошибка подключения к базе:", err.message);
    } else {
      console.log("База данных подключена");
    }
  }
);

module.exports = db;
