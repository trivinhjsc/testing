import { isAuthorizedWebhook } from "./src/middlewares/auth.middleware.js"
import { handleMessageEvent } from "./src/handlers/message.handler.js"
import { logger } from "./src/utils/logger.js"

export default async function handler(req, res) {
  // Kiểm tra endpoint.
  if (req.method !== "POST") {
    return res.status(200).send("Zalo Bot is running!")
  }

  // Xác thực webhook.
  if (!isAuthorizedWebhook(req)) {
    logger.warn("Unauthorized webhook attempt")
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body

    logger.info("Incoming Zalo event:", body?.event_name)

    const result = await handleMessageEvent(body)

    return res.status(200).json(result)
  } catch (error) {
    logger.error("Webhook error:", error)

    // Giữ chính sách hiện tại: không yêu cầu Zalo retry
    // khi xảy ra lỗi xử lý nội bộ.
    return res.status(200).json({ ok: false })
  }
}