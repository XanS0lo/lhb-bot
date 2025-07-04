// report.js

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./message.db");

const KEYWORDS = ["вода", "свет", "лифт", "отопление", "мусор", "шум"];
const APARTMENT_REGEX = /\bкв\.*\s*(\d+)|квартира\s*(\d+)/gi;

function getLast24HoursMessages(callback) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  db.all(
    `SELECT * FROM information WHERE created >= ?`,
    [since],
    (err, rows) => {
      if (err) {
        console.error("❌ Ошибка при чтении из БД:", err.message);
        return;
      }
      callback(rows);
    }
  );
}

function analyzeMessages(messages) {
  const stats = {
    authors: {},
    keywords: {},
    apartments: {},
  };

  for (const msg of messages) {
    const { author, message } = msg;

    // 1. Подсчёт по авторам
    stats.authors[author] = (stats.authors[author] || 0) + 1;

    // 2. Поиск ключевых слов
    for (const word of KEYWORDS) {
      if (message.toLowerCase().includes(word)) {
        stats.keywords[word] = (stats.keywords[word] || 0) + 1;
      }
    }

    // 3. Поиск номеров квартир
    let match;
    while ((match = APARTMENT_REGEX.exec(message)) !== null) {
      const apt = match[1] || match[2];
      if (apt) {
        stats.apartments[apt] = (stats.apartments[apt] || 0) + 1;
      }
    }
  }

  return stats;
}

function printReport(stats) {
  console.log("\n📊 Ежедневный отчёт по чату:\n");

  console.log("👤 Активные жильцы:");
  const sortedAuthors = Object.entries(stats.authors).sort(
    (a, b) => b[1] - a[1]
  );
  sortedAuthors.forEach(([name, count]) => {
    console.log(`  - ${name}: ${count} сообщений`);
  });

  console.log("\n🚨 Популярные проблемы:");
  Object.entries(stats.keywords).forEach(([keyword, count]) => {
    console.log(`  - ${keyword}: ${count} упоминаний`);
  });

  console.log("\n🏠 Квартиры с сообщениями:");
  Object.entries(stats.apartments).forEach(([apt, count]) => {
    console.log(`  - кв. ${apt}: ${count} сообщений`);
  });

  console.log("\n✅ Отчёт завершён.\n");
}

// Запуск
getLast24HoursMessages((messages) => {
  const stats = analyzeMessages(messages);
  printReport(stats);
});
