const initDatabase = require("./db");
const db = require("./db.js")();

const baileys = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } =
  baileys;

// Импортируем функции из utils.js
const {
  getMessagesFromLast24Hours,
  generatePrompt,
  storeEmbedding,
  findSimilarEmbeddings,
} = require("./utils");
const sendToFireworks = require("./sendToFireworks.js");

const insertMessageIntoDB = (author, text, time, created) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO information (author, message, time, created) VALUES (?, ?, ?, ?)`,
      [author, text, time, created],
      function (err) {
        if (err) {
          reject("❌ Ошибка при сохранении в БД:" + err.message);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      console.log("Сканируй QR-код:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ Бот подключён к WhatsApp!");
      const chatId = "120363421292722557@g.us"; // Замените на реальный ID чата
      printChatParticipants(sock, chatId);
    }

    if (connection === "close") {
      console.log("❌ Подключение закрыто");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    const text =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!text) {
      console.log("⛔ Пропущено: нет текстового сообщения");
      return;
    }

    const author = msg.pushName || "Неизвестный";
    const time = new Date().toLocaleTimeString();
    const created = new Date().toISOString();

    console.log(`📥 Новое сообщение: [${time}] ${author}: "${text}"`);

    try {
      const result = await insertMessageIntoDB(author, text, time, created);
      await storeEmbedding(result, text);

      if (text.toLowerCase().includes("sum")) {
        console.log("🔍 Обнаружено ключевое слово 'sum', формируем отчет...");
        await analyzeMessages(text); // Передаем текст запроса
      }
    } catch (error) {
      console.error(error);
    }
  });
};

async function getChatParticipants(sock, chatId) {
  const metadata = await sock.groupMetadata(chatId);
  const participants = metadata.participants.map((p) => ({
    name: p.pushName,
    phone: p.id.split("@")[0],
  }));

  console.log("👥 Участники чата:");
  participants.forEach((p) => {
    console.log(`  - ${p.name} (${p.phone})`);
  });

  return participants;
}

async function printChatParticipants(sock, chatId) {
  const participants = await getChatParticipants(sock, chatId);
  console.log("👥 Участники чата:", participants);
}

// ... (остальной код index.js остается тем же)

async function analyzeMessages(queryText) {
  const similarMessages = await findSimilarEmbeddings(queryText);
  const allMessages = await new Promise((resolve) => {
    getMessagesFromLast24Hours((messages) => {
      resolve([...messages, ...similarMessages]);
    });
  });

  const prompt = generatePrompt(allMessages);
  console.log("📝 Формируем промт для Fireworks AI с RAG:\n", prompt);
  sendToFireworks(prompt);
}

// ... (остальной код остается тем же)

startBot();
