import { sendTextMessage } from "../services/zalo.service.js";
import { logger } from "../utils/logger.js";

export async function handleMessageEvent(body) {
  if (
    body?.event_name !== "message.text.received" ||
    !body?.message?.chat?.id ||
    typeof body?.message?.text !== "string"
  ) {
    return { ok: true, ignored: true };
  }

  const chatId = body.message.chat.id;
  const userMessage = body.message.text.trim();

  if (!userMessage) {
    return { ok: true, ignored: true };
  }

  // Giữ nguyên hành vi phản hồi hiện tại.
  const replyText = `Xin chào! Bạn vừa nhắn: "${userMessage}"`;

  try {
    await sendTextMessage(chatId, replyText);
    return { ok: true };
  } catch (error) {
    logger.error("Failed to process message event:", error);
    return { ok: false, error: "Failed to send message" };
  }
}