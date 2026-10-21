import { getEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function sendTextMessage(chatId, text) {
  const token = getEnv("ZALO_BOT_TOKEN");

  if (!token) {
    throw new Error(
      "Missing ZALO_BOT_TOKEN in environment variables"
    );
  }

  const response = await fetch(
    `https://bot-api.zaloplatforms.com/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  const result = await response.json();
  logger.info("Zalo sendMessage result:", result);

  if (!response.ok || result?.ok === false) {
    logger.error("Failed to send Zalo message:", result);
    throw new Error("Zalo sendMessage request failed");
  }

  return result;
}