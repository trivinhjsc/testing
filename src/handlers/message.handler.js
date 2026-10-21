import { sendTextMessage } from "../services/zalo.service.js";
import {
  cancelReminder,
  createReminder,
  formatVietnamDate,
  listReminders,
} from "../services/reminder.service.js";
import { parseReminderRequest } from "../utils/reminder-parser.js";
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
  // Loại bỏ phần tag mention (@TênBot) ở đầu tin nhắn khi được tag trong nhóm.
  const userMessage = body.message.text.trim().replace(/^@\S+\s*/u, "").trim();

  if (!userMessage) {
    return { ok: true, ignored: true };
  }

  try {
    const request = parseReminderRequest(userMessage);
    let replyText;

    if (request.type === "none") {
      // Giữ nguyên hành vi phản hồi hiện tại cho tin nhắn thông thường.
      replyText = 'Xin chào! Bạn vừa nhắn: "' + userMessage + '"';
    } else if (request.type === "invalid") {
      replyText = request.reply;
    } else if (request.type === "create") {
      const reminder = await createReminder({
        chatId,
        title: request.title,
        dueAt: request.dueAt,
      });

      replyText =
        "✅ Đã đặt lịch nhắc: " + reminder.title +
        "\n🗓 " + formatVietnamDate(reminder.dueAt) +
        "\n\nMình sẽ gửi thông báo vào cuộc trò chuyện này khi đến giờ.";
    } else if (request.type === "list") {
      const reminders = await listReminders(chatId);

      if (reminders.length === 0) {
        replyText = "Hiện chưa có lịch nhắc nào đang chờ trong cuộc trò chuyện này.";
      } else {
        replyText = "📋 LỊCH NHẮC CỦA CUỘC TRÒ CHUYỆN NÀY\n\n" +
          reminders.map((item, index) =>
            (index + 1) + ". " + item.title + "\n   🗓 " +
            formatVietnamDate(item.dueAt)
          ).join("\n\n") +
          "\n\nĐể hủy, nhắn: “Hủy lịch nhắc số 2”.";
      }
    } else if (request.type === "cancel") {
      const cancelled = await cancelReminder(chatId, request.number);
      replyText = cancelled
        ? "🗑 Đã hủy lịch nhắc: " + cancelled.title
        : "Mình không tìm thấy lịch nhắc số " + request.number +
          " đang chờ. Nhắn “xem lịch nhắc” để kiểm tra danh sách.";
    } else {
      replyText = "Mình chưa hiểu yêu cầu nhắc hẹn này.";
    }

    await sendTextMessage(chatId, replyText);
    return { ok: true };
  } catch (error) {
    logger.error("Failed to process message event:", error);
    return { ok: false, error: "Failed to process message" };
  }
}
