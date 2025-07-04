const cron = require("node-cron");
const { exec } = require("child_process");

cron.schedule("0 9 * * *", () => {
  console.log("📆 Запуск отчёта...");
  exec("node report.js", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Ошибка выполнения отчёта:", err);
      return;
    }
    console.log(stdout);
  });
});
