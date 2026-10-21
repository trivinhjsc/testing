import { sendTextMessage } from "./zalo.service.js";
import { logger } from "../utils/logger.js";

const kv = await Deno.openKv();
const PREFIX = ["reminders"];
const STALE_CLAIM_MS = 3 * 60 * 1000;

export function formatVietnamDate(timestamp) {
  return new Date(timestamp).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function createReminder({ chatId, title, dueAt }) {
  const reminder = {
    id: crypto.randomUUID(),
    chatId: String(chatId),
    title,
    dueAt,
    status: "pending",
    createdAt: Date.now(),
    attempts: 0,
  };

  await kv.set([...PREFIX, reminder.id], reminder);
  return reminder;
}

export async function listReminders(chatId) {
  const reminders = [];
  for await (const entry of kv.list({ prefix: PREFIX })) {
    const reminder = entry.value;
    if (
      reminder.chatId === String(chatId) &&
      ["pending", "sending"].includes(reminder.status)
    ) {
      reminders.push(reminder);
    }
  }

  return reminders.sort((a, b) => a.dueAt - b.dueAt);
}

export async function cancelReminder(chatId, number) {
  if (!Number.isInteger(number) || number < 1) return null;

  const reminders = await listReminders(chatId);
  const reminder = reminders[number - 1];
  if (!reminder) return null;

  const key = [...PREFIX, reminder.id];
  const entry = await kv.get(key);
  if (!entry.value || entry.value.status !== "pending") return null;

  const result = await kv.atomic()
    .check({ key, versionstamp: entry.versionstamp })
    .set(key, { ...entry.value, status: "cancelled", cancelledAt: Date.now() })
    .commit();

  return result.ok ? entry.value : null;
}

export async function runDueReminders() {
  const now = Date.now();

  for await (const entry of kv.list({ prefix: PREFIX })) {
    const reminder = entry.value;
    if (reminder.dueAt > now) continue;

    const pending = reminder.status === "pending";
    const abandoned = reminder.status === "sending" &&
      now - (reminder.claimedAt ?? 0) > STALE_CLAIM_MS;

    if (!pending && !abandoned) continue;

    const claimedReminder = {
      ...reminder,
      status: "sending",
      claimedAt: now,
    };

    const claim = await kv.atomic()
      .check({ key: entry.key, versionstamp: entry.versionstamp })
      .set(entry.key, claimedReminder)
      .commit();

    if (!claim.ok) continue;

    try {
      const message =
        `⏰ Nhắc hẹn gia đình\n\n${claimedReminder.title}\n\n🗓 ${formatVietnamDate(claimedReminder.dueAt)}`;
      await sendTextMessage(claimedReminder.chatId, message);

      await kv.set(entry.key, {
        ...claimedReminder,
        status: "sent",
        sentAt: Date.now(),
      });
      logger.info("Reminder sent:", claimedReminder.id);
    } catch (error) {
      const attempts = (claimedReminder.attempts ?? 0) + 1;
      await kv.set(entry.key, {
        ...claimedReminder,
        status: attempts >= 3 ? "failed" : "pending",
        attempts,
        lastErrorAt: Date.now(),
      });
      logger.error("Failed to send reminder:", error);
    }
  }
}
