// utils.js

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./message.db");

// Функция для получения сообщений за последние 24 часа
function getMessagesFromLast24Hours(callback) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Текущее время минус 24 часа

  db.all(
    `SELECT * FROM information WHERE created >= ?`,
    [since],
    (err, rows) => {
      if (err) {
        console.error("❌ Ошибка при чтении из БД:", err.message);
        return;
      }
      callback(rows); // Передаем данные в callback
    }
  );
}

// Функция для формирования промта
function generatePrompt(messages) {
  let prompt = "Отчёт по чату за последний день:\n\n";

  // Массивы для хранения информации
  const problems = []; // Проблемы
  const apartments = {}; // Квартиры
  const activeUsers = {}; // Активные пользователи

  messages.forEach((msg) => {
    const { author, message, time } = msg;

    // Проблемы — более широкий анализ текста
    if (
      message.toLowerCase().includes("проблема") ||
      message.toLowerCase().includes("не работает") ||
      message.toLowerCase().includes("сломано") ||
      message.toLowerCase().includes("не включается") ||
      message.toLowerCase().includes("не работает")
    ) {
      problems.push(`${message}`);
    }

    // Квартиры — ищем упоминания квартиры
    const aptMatch = message.match(/\bкв\.*\s*(\d+)|квартира\s*(\d+)/gi);
    if (aptMatch) {
      aptMatch.forEach((apt) => {
        apartments[apt] = (apartments[apt] || 0) + 1;
      });
    }

    // Подсчёт активных пользователей
    activeUsers[author] = (activeUsers[author] || 0) + 1;

    // Формирование текста для сообщения
    prompt += `[${time}] ${author}: ${message}\n`;
  });

  // Добавление информации о проблемах
  if (problems.length > 0) {
    prompt += "\n💬 Проблемы, которые обсуждали жильцы:\n";
    problems.forEach((problem) => {
      prompt += `  - ${problem}\n`;
    });
    console.log("🚨 Выявленные проблемы: ");
    problems.forEach((problem) => {
      console.log(`  - ${problem}`);
    });
  }

  // Добавление информации о квартирах
  prompt += "\n🏠 Квартиры, упомянутые в сообщениях:\n";
  Object.entries(apartments).forEach(([apt, count]) => {
    prompt += `  - ${apt}: ${count} сообщений\n`;
  });

  // Добавление активных пользователей
  prompt += "\n👤 Самые активные жильцы:\n";
  Object.entries(activeUsers).forEach(([author, count]) => {
    prompt += `  - ${author}: ${count} сообщений\n`;
  });

  // Завершающая часть
  prompt += "\nПожалуйста, проанализируйте эти сообщения.";

  return prompt;
}

// Экспортируем функции для использования в других файлах
module.exports = {
  getMessagesFromLast24Hours,
  generatePrompt,
};
