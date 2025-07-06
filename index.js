const initDatabase = require("./db");
const db = initDatabase(); // Инициализация базы данных

const baileys = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } =
  baileys;

// Импортируем функции из utils.js
const { getMessagesFromLast24Hours, generatePrompt } = require("./utils");
const sendToFireworks = require("./sendToFireworks.js"); // Импортируем функцию для отправки в Fireworks AI

// Внутри функции startBot
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
      // Добавим вывод участников чата после подключения
      const chatId = "id_вашего_чата"; // Замените на реальный ID чата
      printChatParticipants(sock, chatId); // Получаем и выводим участников чата
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

    // 💾 Сохраняем в таблицу information
    db.run(
      `INSERT INTO information (author, message, time, created) VALUES (?, ?, ?, ?)`,
      [author, text, time, created],
      (err) => {
        if (err) {
          console.error("❌ Ошибка при сохранении в БД:", err.message);
        } else {
          console.log("✅ Сообщение успешно сохранено в БД");
        }
      }
    );

    // После сохранения сообщения, вызываем анализ сообщений
    analyzeMessages(); // Вызываем функцию для анализа и отправки в нейронку
  });
};

// Функция для получения участников чата
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

// Функция для печати участников
async function printChatParticipants(sock, chatId) {
  const participants = await getChatParticipants(sock, chatId);
  console.log("👥 Участники чата:", participants);
}

// Функция для анализа сообщений
async function analyzeMessages() {
  getMessagesFromLast24Hours((messages) => {
    const prompt = generatePrompt(messages); // Генерация промта с учётом новых данных
    console.log("📝 Формируем промт для Fireworks AI:\n", prompt);
    sendToFireworks(prompt); // Отправляем промт в нейронную сеть
  });
}

// Запуск бота
startBot();
