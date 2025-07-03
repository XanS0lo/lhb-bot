const baileys = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
// const scheduleDailyJob = require("./scheduleDailyJob");

const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } =
  baileys;

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();
  //   const store = await makeInMemoryStore();

  //   store.bind(sock.ev);
  // scheduleDailyJob(sock, store);

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
    console.log(messages[0]);

    const msg = messages[0];
    const text =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!text) return;

    if (text === "!ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "pong" });
    }
    if (text === "привет") {
      await sock.sendMessage(msg.key.remoteJid, { text: "привет я бот" });
    }
  });
};

startBot();
