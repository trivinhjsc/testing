// File: api/webhook.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://bot-zalo.sum-bn37k02-1.workers.dev/webhook", {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ZaloBot-Vercel-Proxy/1.0", // Đổi User-Agent để không bị Cloudflare chặn 403
        ...(req.headers["x-bot-api-secret-token"] && {
          "X-Bot-Api-Secret-Token": req.headers["x-bot-api-secret-token"],
        }),
      },
      body:
        req.method !== "GET" && req.method !== "HEAD" && req.body
          ? JSON.stringify(req.body)
          : undefined,
    });

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
