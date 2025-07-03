const db = require("./db");

// Чтение всех записей из таблицы information
db.all("SELECT * FROM information", [], (err, rows) => {
  if (err) {
    console.error("Ошибка при чтении из базы данных:", err.message);
    return;
  }

  console.log("Список сообщений:");
  rows.forEach((row) => {
    console.log(
      `ID: ${row.id}, Автор: ${row.author}, Сообщение: ${row.message}, Время: ${row.time}, Создано: ${row.created}`
    );
  });
});
