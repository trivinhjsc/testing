
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Zalo Bot is running!");
  }

  // Xác thực webhook
  const secret = req.headers["x-bot-api-secret-token"];

  if (secret !== process.env.ZALO_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;

    console.log("Event:", body?.event_name);

    // Chỉ xử lý tin nhắn văn bản
    if (
      body?.event_name !== "message.text.received" ||
      !body?.message?.chat?.id ||
      !body?.message?.text
    ) {
      return res.status(200).json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const token = process.env.ZALO_BOT_TOKEN;

    if (!token) {
      console.error("Missing ZALO_BOT_TOKEN");
      return res.status(500).json({ error: "Missing bot token" });
    }

    // Gửi tin nhắn trả lời qua Zalo Bot API
    const response = await fetch(
      `https://bot-api.zaloplatforms.com/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Xin chào!",
        }),
      }
    );

    const result = await response.json();

    console.log("Zalo sendMessage result:", JSON.stringify(result));

    if (!response.ok || result.ok === false) {
      return res.status(502).json({
        error: "Failed to send Zalo message",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
