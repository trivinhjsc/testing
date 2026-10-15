
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Zalo Bot is running on Vercel!");
  }

  console.log("Webhook headers:", req.headers);
  console.log("Webhook payload:", JSON.stringify(req.body, null, 2));

  return res.status(200).json({ ok: true });
}
