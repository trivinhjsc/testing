const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function vietnamParts(date) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function makeVietnamDate(year, month, day, hour, minute) {
  // Vietnam is UTC+7. Store timestamps as UTC instants.
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0));
}

function parseTime(text) {
  const periodPattern = "(sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem)";
  let match =
    text.match(new RegExp(
      "\\b(?:lúc|luc|vào|vao|khoảng|khoang)?\\s*(\\d{1,2})\\s*[:h]\\s*(\\d{2})\\s*" + periodPattern + "?\\b",
      "i",
    ));

  if (match) {
    return {
      hour: Number(match[1]),
      minute: Number(match[2]),
      period: match[3] ?? "",
      phrase: match[0],
      index: match.index ?? 0,
    };
  }

  match =
    text.match(new RegExp(
      "\\b(?:lúc|luc|vào|vao|khoảng|khoang)\\s*(\\d{1,2})(?:\\s*(?:giờ|gio))?\\s*" + periodPattern + "?\\b",
      "i",
    )) ??
    text.match(new RegExp(
      "\\b(\\d{1,2})\\s*(?:giờ|gio)\\s*" + periodPattern + "?\\b",
      "i",
    ));

  if (!match) return null;

  const hourGroup = match[1];
  const period = match[2] ?? "";
  return {
    hour: Number(hourGroup),
    minute: 0,
    period,
    phrase: match[0],
    index: match.index ?? 0,
  };
}

function to24Hour(hour, period) {
  const p = period.toLowerCase();
  if (["sáng", "sang"].includes(p)) return hour === 12 ? 0 : hour;
  if (["trưa", "trua"].includes(p)) return hour < 11 ? hour + 12 : hour;
  if (["chiều", "chieu", "tối", "toi", "đêm", "dem"].includes(p)) {
    return hour < 12 ? hour + 12 : hour;
  }
  return hour;
}

function parseSchedule(text, now) {
  const lower = text.toLowerCase();

  const relative = lower.match(
    /\b(?:sau|trong)\s+(\d+)\s*(phút|phut|giờ|gio|tiếng|tieng|ngày|ngay)\b/i,
  );
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const multiplier =
      ["phút", "phut"].includes(unit) ? 60_000 :
      ["giờ", "gio", "tiếng", "tieng"].includes(unit) ? 3_600_000 :
      86_400_000;
    const dueAt = now.getTime() + amount * multiplier;
    if (amount < 1 || amount > 365) {
      return { error: "Khoảng thời gian nhắc cần nằm trong giới hạn hợp lý (1–365 đơn vị)." };
    }
    return { dueAt, schedulePhrase: relative[0] };
  }

  const time = parseTime(lower);
  if (!time) {
    return {
      error: "Mình chưa xác định được giờ nhắc. Bạn thử nói rõ giờ, ví dụ: “Nhắc cả nhà đón bé lúc 4 giờ chiều mai”.",
    };
  }

  let hour = to24Hour(time.hour, time.period);
  const minute = time.minute;
  if (time.hour < 0 || time.hour > 23 || minute < 0 || minute > 59 || hour > 23) {
    return { error: "Giờ nhắc chưa hợp lệ. Bạn kiểm tra lại giờ và phút nhé." };
  }

  const current = vietnamParts(now);
  let year = current.year;
  let month = current.month;
  let day = current.day;
  let hasExplicitDate = false;

  const dateMatch = lower.match(/\bngày\s+(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?\b/i);
  if (dateMatch) {
    day = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    year = dateMatch[3] ? Number(dateMatch[3]) : year;
    hasExplicitDate = true;
  } else if (/\bngày mai\b|\bmai\b/.test(lower)) {
    const tomorrow = makeVietnamDate(year, month, day, 12, 0);
    const nextDay = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
    const p = vietnamParts(nextDay);
    ({ year, month, day } = p);
    hasExplicitDate = true;
  } else if (/\bhôm nay\b|\bhom nay\b|\btối nay\b|\bchiều nay\b/.test(lower)) {
    hasExplicitDate = true;
  } else {
    const weekdayMatch = lower.match(/\b(thứ\s+(hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|chủ nhật|chu nhat)\b/);
    if (weekdayMatch) {
      const weekdayText = weekdayMatch[1].replace(/\s+/g, " ");
      const map = {
        "chủ nhật": 0, "chu nhat": 0,
        "thứ hai": 1, "thứ ba": 2, "thứ tư": 3, "thứ tu": 3,
        "thứ năm": 4, "thứ sáu": 5, "thứ sau": 5,
        "thứ bảy": 6, "thứ bay": 6,
      };
      const shiftedNow = new Date(now.getTime() + VN_OFFSET_MS);
      const currentWeekday = shiftedNow.getUTCDay();
      let delta = (map[weekdayText] - currentWeekday + 7) % 7;
      if (delta === 0 && (hour < current.hour || (hour === current.hour && minute <= current.minute))) {
        delta = 7;
      }
      const chosenDay = new Date(makeVietnamDate(year, month, day, 12, 0).getTime() + delta * 86_400_000);
      const p = vietnamParts(chosenDay);
      ({ year, month, day } = p);
      hasExplicitDate = true;
    }
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: "Ngày nhắc chưa hợp lệ. Bạn kiểm tra lại ngày/tháng nhé." };
  }

  let due = makeVietnamDate(year, month, day, hour, minute);
  if (!hasExplicitDate && due.getTime() <= now.getTime()) {
    const nextDay = new Date(due.getTime() + 86_400_000);
    due = nextDay;
  } else if (due.getTime() <= now.getTime()) {
    return { error: "Thời điểm đó đã qua. Bạn hãy chọn một thời điểm trong tương lai nhé." };
  }

  return { dueAt: due.getTime(), schedulePhrase: time.phrase };
}

function cleanReminderTitle(text) {
  return text
    .replace(/^\s*(?:hãy\s+)?nhắc\s+(?:(?:tôi|mình|cả nhà|mọi người|gia đình)\s+)?/i, "")
    .replace(/\b(?:sau|trong)\s+\d+\s*(?:phút|phut|giờ|gio|tiếng|tieng|ngày|ngay)\b/gi, "")
    .replace(/\bngày\s+\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{4})?\b/gi, "")
    .replace(/\b(?:ngày\s+mai|hôm\s+nay|hom\s+nay|mai|nay|tối\s+nay|chiều\s+nay)\b/gi, "")
    .replace(/\b(?:thứ\s+(?:hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|chủ\s+nhật|chu\s+nhat)\b/gi, "")
    .replace(/\b(?:lúc|luc|vào|vao|khoảng|khoang)\s*\d{1,2}(?:\s*[:h]\s*\d{2}|\s*(?:giờ|gio)(?:\s*\d{2})?)?\s*(?:sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem)?\b/gi, "")
    .replace(/\b\d{1,2}\s*(?:[:h]\s*\d{2}|(?:giờ|gio)\s*\d{2}?)\s*(?:sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem)?\b/gi, "")
    .replace(/[,.!?;:–—-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseReminderRequest(text, now = new Date()) {
  const lower = text.toLowerCase().trim();

  if (/^(?:xem|liệt kê|liet ke|danh sách|danh sach|các|cac).*(?:lịch nhắc|lịch hẹn|nhắc hẹn|nhắc nhở|lịch)$/i.test(lower) ||
      /^(?:lịch nhắc|lịch hẹn|nhắc hẹn|nhắc nhở)$/i.test(lower)) {
    return { type: "list" };
  }

  const cancel = lower.match(/(?:hủy|huy|xóa|xoa|bỏ|bo).{0,30}?(?:lịch\s*)?(?:nhắc|nhac|hẹn|hen).{0,15}?(?:số|so|thứ|thu)?\s*(\d+)/i);
  if (cancel) return { type: "cancel", number: Number(cancel[1]) };

  if (!/\bnhắc\b|\bnhac\b/i.test(lower)) return { type: "none" };

  const schedule = parseSchedule(text, now);
  if (schedule.error) return { type: "invalid", reply: schedule.error };

  const title = cleanReminderTitle(text);
  if (!title || /^(?:tôi|mình|cả nhà|mọi người|gia đình)?\s*$/i.test(title)) {
    return {
      type: "invalid",
      reply: "Bạn muốn nhắc việc gì? Ví dụ: “Nhắc cả nhà đón em bé lúc 4 giờ chiều mai”.",
    };
  }

  return { type: "create", title, dueAt: schedule.dueAt };
}
