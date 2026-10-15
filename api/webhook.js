export default async function handler(req, res) {
  // Zalo gửi request bằng phương thức POST
  if (req.method !== "POST") {
    return res.status(200).send("Zalo Bot is running on Vercel!");
  }

  try {
    const body = req.body;
    console.log("Webhook payload từ Zalo:", JSON.stringify(body));

    // Kiểm tra xem sự kiện có phải là tin nhắn từ người dùng gửi tới bot không
    // (Tùy theo cấu trúc payload của Zalo OA, thường chứa event_name hoặc message)
    const eventName = body?.event_name;
    const senderId = body?.sender?.id;
    const textMessage = body?.message?.text;

    // Nếu người dùng gửi tin nhắn văn bản
    if (textMessage && senderId) {
      console.log(`Nhận tin từ [${senderId}]: ${textMessage}`);

      // 1. Gọi Gemini API để tạo câu trả lời thông minh
      const botReply = await callGeminiAI(textMessage);

      // 2. Gửi tin nhắn trả lời ngược lại người dùng qua Zalo ZNS/Open API
      await sendZaloMessage(senderId, botReply);
    }

    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Lỗi xử lý webhook:", error);
    return res.status(500).json({ error: error.message });
  }
}

// Hàm gọi Google Gemini API
async function callGeminiAI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY; // Lấy từ biến môi trường của Vercel
  if (!apiKey) return "Xin chào! Bot đang hoạt động nhưng chưa cấu hình Gemini API Key.";

  try {
    // Sử dụng model gemini-2.5-flash hoặc gemini-1.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Mình chưa hiểu rõ ý bạn.";
  } catch (err) {
    console.error("Lỗi gọi Gemini:", err);
    return "Có lỗi xảy ra khi xử lý trí tuệ nhân tạo.";
  }
}

// Hàm gửi tin nhắn trả về Zalo User
async function sendZaloMessage(recipientId, text) {
  const zaloAccessToken = process.env.ZALO_ACCESS_TOKEN; // Lấy từ biến môi trường của Vercel
  if (!zaloAccessToken) {
    console.error("Thiếu ZALO_ACCESS_TOKEN trong biến môi trường Vercel!");
    return;
  }

  try {
    await fetch("https://openapi.zalo.me/v2.0/oa/message/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": zaloAccessToken
      },
      body: JSON.stringify({
        recipient: { user_id: recipientId },
        message: { text: text }
      })
    });
  } catch (err) {
    console.error("Lỗi gửi tin nhắn Zalo:", err);
  }
}
