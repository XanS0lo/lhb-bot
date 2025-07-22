const sqlite3 = require("sqlite3").verbose();
const { default: ollama } = require("ollama");
const db = new sqlite3.Database("./message.db");

// Генерация векторного встраивания
async function generateEmbedding(text) {
  const response = await ollama.embeddings({
    model: "paraphrase-multilingual",
    prompt: text,
  });
  return response.embedding;
}

// Сохранение встраивания
async function storeEmbedding(id, text) {
  const vector = await generateEmbedding(text);
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO message_vectors (id, vector) VALUES (?, ?)`,
      [id, Buffer.from(vector)],
      (err) => {
        if (err) {
          console.error("Ошибка сохранения вектора:", err.message);
          reject(err);
        } else {
          console.log(`Вектор для id ${id} сохранён.`);
          resolve();
        }
      }
    );
  });
}

// Получение сообщений за последние 24 часа
function getMessagesFromLast24Hours(callback) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  db.all(
    `SELECT id, author, message, time, created FROM information WHERE created >= ?`,
    [since],
    async (err, rows) => {
      if (err) {
        console.error("❌ Ошибка при чтении из БД:", err.message);
        return;
      }
      for (const row of rows) {
        await storeEmbedding(row.id, row.message);
      }
      callback(rows);
    }
  );
}

// Поиск похожих встраиваний
async function findSimilarEmbeddings(queryText, threshold = 0.8) {
  const queryVector = await generateEmbedding(queryText);

  return new Promise((resolve, reject) => {
    db.all(`SELECT id, vector FROM message_vectors`, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const similarMessages = [];
      for (const row of rows) {
        const storedVector = new Float32Array(row.vector.buffer);
        const similarity = cosineSimilarity(queryVector, storedVector);

        if (similarity >= threshold) {
          similarMessages.push({ id: row.id, similarity });
        }
      }

      if (similarMessages.length > 0) {
        const ids = similarMessages.map((m) => m.id).join(",");
        db.all(
          `SELECT id, author, message, time, created FROM information WHERE id IN (${ids})`,
          [],
          (err, messages) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(
              messages
                .map((msg) => ({
                  ...msg,
                  similarity: similarMessages.find((m) => m.id === msg.id)
                    .similarity,
                }))
                .sort((a, b) => b.similarity - a.similarity)
            );
          }
        );
      } else {
        resolve([]);
      }
    });
  });
}

// Косинусное сходство
function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

// Формирование промта
function generatePrompt(messages) {
  let prompt = "Отчёт по чату за последний день:\n\n";

  const problems = [];
  const apartments = {};
  const activeUsers = {};

  messages.forEach((msg) => {
    const { author = "Неизвестный", message, time = "Не указано" } = msg;

    // Проблемы
    if (
      message.toLowerCase().includes("проблема") ||
      message.toLowerCase().includes("не работает") ||
      message.toLowerCase().includes("сломано") ||
      message.toLowerCase().includes("не включается")
    ) {
      problems.push(`${message}`);
    }
    if (message.toLowerCase().includes("вода")) {
      problems.push(`${message}`);
    }
    if (
      message.toLowerCase().includes("мусоропровод") ||
      message.toLowerCase().includes("камеры")
    ) {
      problems.push(`${message}`);
    }

    // Квартиры
    const aptMatch = message.match(/\b(кв?\.?\s*(\d+)|квартира\s*(\d+))/gi);
    if (aptMatch) {
      aptMatch.forEach((apt) => {
        const aptNum = apt.match(/\d+/) ? apt.match(/\d+/)[0] : null;
        if (aptNum) {
          apartments[`кв ${aptNum}`] = (apartments[`кв ${aptNum}`] || 0) + 1;
        }
      });
    }

    // Активные пользователи
    activeUsers[author] = (activeUsers[author] || 0) + 1;

    prompt += `[${time}] ${author}: ${message}\n`;
  });

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

  if (Object.keys(apartments).length > 0) {
    prompt += "\n🏠 Квартиры, упомянутые в сообщениях:\n";
    Object.entries(apartments).forEach(([apt, count]) => {
      prompt += `  - ${apt}: ${count} ${
        count === 1 ? "сообщение" : "сообщений"
      }\n`;
    });
  }

  prompt += "\n👤 Самые активные жильцы:\n";
  Object.entries(activeUsers)
    .sort(([, a], [, b]) => b - a)
    .forEach(([author, count]) => {
      prompt += `  - ${author}: ${count} ${
        count === 1 ? "сообщение" : "сообщений"
      }\n`;
    });

  prompt += "\nПожалуйста, проанализируйте эти сообщения.";
  return prompt;
}

module.exports = {
  getMessagesFromLast24Hours,
  generatePrompt,
  generateEmbedding,
  storeEmbedding,
  findSimilarEmbeddings,
};
