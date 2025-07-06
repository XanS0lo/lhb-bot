// sendToFireworks.js

const FIREWORKS_API_URL =
  "https://api.fireworks.ai/inference/v1/chat/completions"; // Замените на URL API Fireworks
const FIREWORKS_API_KEY = "fw_3ZdGbzAsiQ5jfL9RGxpuvKDS"; // Замените на ваш API ключ

// Функция для отправки промта в Fireworks AI
async function sendToFireworks(prompt) {
  try {
    const response = await fetch(FIREWORKS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIREWORKS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/llama4-scout-instruct-basic",
        max_tokens: 2048,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.6,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json(); // Преобразуем ответ в JSON
    console.log("Ответ от Fireworks AI:", data); // Логируем результат

    // Здесь можно добавить логику для обработки результата, если нужно
  } catch (error) {
    console.error("❌ Ошибка при отправке запроса в Fireworks AI:", error);
  }
}

module.exports = sendToFireworks;
