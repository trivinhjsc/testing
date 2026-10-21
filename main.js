import { isAuthorizedWebhook } from "./src/middlewares/auth.middleware.js";
import { handleMessageEvent } from "./src/handlers/message.handler.js";
import { runDueReminders } from "./src/services/reminder.service.js";
import { logger } from "./src/utils/logger.js";

Deno.cron("send-due-family-reminders", "* * * * *", async () => {
  try {
    await runDueReminders();
  } catch (error) {
    logger.error("Reminder scheduler failed:", error);
  }
});

async function handler(req) {
  // Kiểm tra endpoint.
  if (req.method !== "POST") {
    return new Response("Zalo Bot is running!", { status: 200 });
  }

  // Xác thực webhook.
  if (!isAuthorizedWebhook(req)) {
    logger.warn("Unauthorized webhook attempt");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    logger.info("Incoming Zalo event:", body?.event_name);

    const result = await handleMessageEvent(body);

    return Response.json(result, { status: 200 });
  } catch (error) {
    logger.error("Webhook error:", error);

    // Giữ chính sách hiện tại: không yêu cầu Zalo retry
    // khi xảy ra lỗi xử lý nội bộ.
    return Response.json({ ok: false }, { status: 200 });
  }
}

Deno.serve(handler);
