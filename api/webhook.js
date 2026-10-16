export default async function handler(req, res) {
  // 1. Kiểm tra trạng thái hoạt động qua trình duyệt (GET)
  if (req.method !== "POST") {
    return res.status(200).send("Zalo Bot is running!");
  }

  // 2. Xác thực Webhook an toàn (tránh lỗi cả 2 cùng undefined)
  const expectedSecret = process.env.ZALO_WEBHOOK_SECRET;
  const incomingSecret = req.headers["x-bot-api-secret-token"];

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    console.warn("Unauthorized webhook attempt");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Đảm bảo body luôn là Object
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    console.log("Event:", body?.event_name);

    // 3. Chỉ lọc sự kiện tin nhắn văn bản
    if (
      body?.event_name !== "message.text.received" ||
      !body?.message?.chat?.id ||
      !body?.message?.text
    ) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const chatId = body.message.chat.id;
    const userMessage = body.message.text.trim();
    const token = process.env.ZALO_BOT_TOKEN;

    if (!token) {
      console.error("Missing ZALO_BOT_TOKEN in environment variables");
      // Trả về 200 để Zalo không retry liên tục gây nghẽn
      return res.status(200).json({ ok: false, error: "Missing bot token" });
    }

    // 4. Tùy chỉnh nội dung phản hồi theo tin nhắn của người dùng
    let replyText = `Xin chào! Bạn vừa nhắn: "${userMessage}"`;

    // 5. Gửi tin nhắn trả lời qua Zalo Bot API
    const response = await fetch(
      `https://bot-api.zaloplatforms.com/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
        }),
      }
    );

    const result = await response.json();
    console.log("Zalo sendMessage result:", JSON.stringify(result));

    if (!response.ok || result.ok === false) {
      console.error("Failed to send Zalo message:", result);
    }

    // Luôn trả về 200 cho Zalo sau khi đã xử lý
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Trả về 200 ngay cả khi lỗi xử lý nội bộ để tránh vòng lặp retry từ Zalo
    return res.status(200).json({ ok: false });
  }
}
