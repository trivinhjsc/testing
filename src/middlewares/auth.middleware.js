import { getEnv } from "../config/env.js"

export function isAuthorizedWebhook(req) {
  const expectedSecret = getEnv("ZALO_WEBHOOK_SECRET")
  const incomingSecret = req.headers.get("x-bot-api-secret-token")

  return Boolean(
    expectedSecret && incomingSecret === expectedSecret
  )
}