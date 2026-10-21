const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const TIME_PATTERN =
  /\b(?:(?:lúc|luc|vào|vao|khoảng|khoang)\s*)?(\d{1,2})(?:\s*[:h]\s*(\d{1,2})?|\s*(?:giờ|gio)(?:\s*(\d{1,2}))?)\s*(sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem)?/i;

function vietnamParts(date) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

function makeVietnamDate(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0));
}

function to24Hour(hour, period = "") {
  const value = period.toLowerCase();

  if (["sáng", "sang"].includes(value)) {
    return hour === 12 ? 0 : hour;
  }

  if (["trưa", "trua"].includes(value)) {
    return hour < 11 ? hour + 12 : hour;
  }

  if (["chiều", "chieu", "tối", "toi", "đêm", "dem"].includes(value)) {
    return hour < 12 ? hour + 12 : hour;
  }

  return hour;
}

function parseSchedule(text, now) {
  const lower = text.toLowerCase();

  const relative = lower.match(
    /\b(?:sau|trong)\s+(\d+)\s*(phút|phut|giờ|gio|tiếng|tieng|ngày|ngay)(?:\s+nữa)?/i,
  );

  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();

    if (amount < 1 || amount > 365) {
      return { error: "Khoảng thời gian nhắc cần nằm trong giới hạn từ 1 đến 365 đơn vị." };
    }

    const multiplier =
      ["phút", "phut"].includes(unit) ? 60_000 :
      ["giờ", "gio", "tiếng", "tieng"].includes(unit) ? 3_600_000 :
      86_400_000;

    return {
      dueAt: now.getTime() + amount * multiplier,
      schedulePhrase: relative[0],
    };
  }

  const time = lower.match(TIME_PATTERN);

  if (!time) {
    return {
      error:
        "Mình chưa xác định được giờ nhắc. Bạn thử nói rõ giờ, ví dụ: “Nhắc cả nhà đón bé lúc 4 giờ chiều mai”.",
    };
  }

  const rawHour = Number(time[1]);
  const minute = Number(time[2] ?? time[3] ?? 0);
  const hour = to24Hour(rawHour, time[4] ?? "");

  if (rawHour < 0 || rawHour > 23 || hour > 23 || minute < 0 || minute > 59) {
    return { error: "Giờ nhắc chưa hợp lệ. Bạn kiểm tra lại giờ và phút nhé." };
  }

  const current = vietnamParts(now);
  let year = current.year;
  let month = current.month;
  let day = current.day;
  let hasExplicitDate = false;

  let dateMatch = lower.match(
    /\bngày\s+(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{4}))?/i,
  );

  if (dateMatch) {
    day = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    year = dateMatch[3] ? Number(dateMatch[3]) : year;
    hasExplicitDate = true;
  } else {
    dateMatch = lower.match(
      /\bngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/i,
    );

    if (dateMatch) {
      day = Number(dateMatch[1]);
      month = Number(dateMatch[2]);
      year = dateMatch[3] ? Number(dateMatch[3]) : year;
      hasExplicitDate = true;
    }
  }

  if (!hasExplicitDate && /\b(?:ngày\s+mai|mai|tomorrow)\b/i.test(lower)) {
    const tomorrow = new Date(
      makeVietnamDate(year, month, day, 12, 0).getTime() + 86_400_000,
    );
    const parts = vietnamParts(tomorrow);
    ({ year, month, day } = parts);
    hasExplicitDate = true;
  } else if (
    !hasExplicitDate &&
    /\b(?:hôm nay|hom nay|chiều nay|tối nay|sáng nay|trưa nay)\b/i.test(lower)
  ) {
    hasExplicitDate = true;
  }

  if (!hasExplicitDate) {
    const weekdayMatch = lower.match(
      /\b(thứ\s+(?:hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|chủ nhật|chu nhat)\b/i,
    );

    if (weekdayMatch) {
      const weekdayText = weekdayMatch[1].replace(/\s+/g, " ");
      const weekdayMap = {
        "chủ nhật": 0,
        "chu nhat": 0,
        "thứ hai": 1,
        "thứ ba": 2,
        "thứ tư": 3,
        "thứ tu": 3,
        "thứ năm": 4,
        "thứ sáu": 5,
        "thứ sau": 5,
        "thứ bảy": 6,
        "thứ bay": 6,
      };

      let daysAhead = (weekdayMap[weekdayText] - current.weekday + 7) % 7;
      if (
        daysAhead === 0 &&
        (hour < current.hour || (hour === current.hour && minute <= current.minute))
      ) {
        daysAhead = 7;
      }

      const chosenDay = new Date(
        makeVietnamDate(year, month, day, 12, 0).getTime() +
          daysAhead * 86_400_000,
      );
      const parts = vietnamParts(chosenDay);
      ({ year, month, day } = parts);
      hasExplicitDate = true;
    }
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: "Ngày nhắc chưa hợp lệ. Bạn kiểm tra lại ngày/tháng nhé." };
  }

  const due = makeVietnamDate(year, month, day, hour, minute);
  const dueParts = vietnamParts(due);

  if (
    dueParts.year !== year ||
    dueParts.month !== month ||
    dueParts.day !== day
  ) {
    return { error: "Ngày nhắc không tồn tại. Bạn kiểm tra lại ngày/tháng nhé." };
  }

  if (!hasExplicitDate && due.getTime() <= now.getTime()) {
    due.setTime(due.getTime() + 86_400_000);
  } else if (due.getTime() <= now.getTime()) {
    return {
      error: "Thời điểm đó đã qua. Bạn hãy chọn một thời điểm trong tương lai nhé.",
    };
  }

  return { dueAt: due.getTime(), schedulePhrase: time[0] };
}

function cleanReminderTitle(text) {
  return text
    .replace(
      /^\s*(?:hãy\s+)?nhắc\s+(?:(?:tôi|mình|cả nhà|mọi người|gia đình)\s+)?/i,
      "",
    )
    .replace(new RegExp(TIME_PATTERN.source, "gi"), " ")
    .replace(
      /\b(?:sau|trong)\s+\d+\s*(?:phút|phut|giờ|gio|tiếng|tieng|ngày|ngay)(?:\s+nữa)?/gi,
      " ",
    )
    .replace(/\bngày\s+\d{1,2}\s*[/-]\s*\d{1,2}(?:\s*[/-]\s*\d{4})?/gi, " ")
    .replace(/\bngày\s+\d{1,2}\s+tháng\s+\d{1,2}(?:\s+năm\s+\d{4})?/gi, " ")
    .replace(/\b(?:ngày\s+mai|\bmai\b|hôm\s+nay|hom\s+nay|chiều\s+nay|tối\s+nay|sáng\s+nay|trưa\s+nay|tomorrow)\b/gi, " ")
    .replace(/\b(?:thứ\s+(?:hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|chủ\s+nhật|chu\s+nhat)\b/gi, " ")
    .replace(/\b(?:lúc|luc|vào|vao|khoảng|khoang)\b/gi, " ")
    .replace(/[,.!?;:–—-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseReminderRequest(text, now = new Date()) {
  const lower = text.toLowerCase().trim();

  if (
    /^(?:(?:cho tôi xem|xem|liệt kê|liet ke|danh sách|danh sach)\s+)?(?:các\s+)?(?:lịch nhắc|lịch hẹn|nhắc hẹn|nhắc nhở)(?:\s+(?:của tôi|hôm nay|hom nay))?$/i.test(lower)
  ) {
    return { type: "list" };
  }

  const cancel = lower.match(
    /(?:hủy|huỷ|huy|xóa|xoá|xoa|bỏ|bo)\s+(?:lịch\s+)?(?:nhắc|nhac|hẹn|hen)(?:\s+(?:lịch\s+)?(?:số|so))?\s*(\d+)/i,
  );

  if (cancel) {
    return { type: "cancel", number: Number(cancel[1]) };
  }

  const hasExplicitReminderWord = /\bnhắc\b|\bnhac\b/i.test(lower);
  const hasImplicitEventCue =
    /\b(?:hẹn|hen|lịch|họp|hop|đón|don|đưa|dua|gặp|gap|gọi|goi|khám|kham|sinh nhật|sự kiện|su kien|nộp|nop|đóng tiền|dong tien|thanh toán|thanh toan|lễ|le|đi học|di hoc|đi làm|di lam|lấy|lay|chở|cho)\b/i.test(lower);

  // Cho phép câu tự nhiên như "mai 8h tôi có hẹn", không bắt buộc phải có chữ "nhắc".
  // Chỉ hiểu là lịch nhắc ngầm khi câu có dấu hiệu sự kiện và có thời điểm rõ ràng.
  if (!hasExplicitReminderWord && !hasImplicitEventCue) {
    return { type: "none" };
  }

  const schedule = parseSchedule(text, now);
  if (schedule.error) {
    // Câu không có chữ "nhắc" mà thiếu thời gian không nên bị coi là lệnh nhắc.
    if (!hasExplicitReminderWord) return { type: "none" };
    return { type: "invalid", reply: schedule.error };
  }

  const title = cleanReminderTitle(text);

  if (
    !title ||
    /^(?:tôi|mình|cả nhà|mọi người|gia đình)?\s*$/i.test(title)
  ) {
    return {
      type: "invalid",
      reply:
        "Bạn muốn nhắc việc gì? Ví dụ: “Nhắc cả nhà đón em bé lúc 4 giờ chiều mai”.",
    };
  }

  return { type: "create", title, dueAt: schedule.dueAt };
}
