const initDatabase = require("./db");
const db = initDatabase(); // ← инициализация базы

const baileys = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } =
  baileys;

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
  });
};

startBot();
