const VN_OFFSET_MS = 7 * 60 * 60 * 1000

const TIME_RE =
  /\b(?:(?:lúc|luc|vào|vao|khoảng|khoang)\s*)?(\d{1,2})(?:\s*[:h]\s*(\d{1,2})?|\s*(?:giờ|gio)(?:\s*(\d{1,2}))?)\s*(sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem)?/i

function vietnamParts(date) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS)

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  }
}

function vietnamDate(year, month, day, hour, minute) {
  // Chuyển giờ Việt Nam (UTC+7) thành thời điểm UTC.
  return new Date(
    Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0),
  )
}

function addVietnamDays(year, month, day, count) {
  const anchor = vietnamDate(year, month, day, 12, 0)

  return vietnamParts(
    new Date(anchor.getTime() + count * 86_400_000),
  )
}

function to24Hour(hour, period = "") {
  const p = period.toLowerCase()

  if (["sáng", "sang"].includes(p)) {
    return hour === 12 ? 0 : hour
  }

  if (["trưa", "trua"].includes(p)) {
    return hour < 11 ? hour + 12 : hour
  }

  if (
    ["chiều", "chieu", "tối", "toi", "đêm", "dem"].includes(p)
  ) {
    return hour < 12 ? hour + 12 : hour
  }

  return hour
}

function parseSchedule(text, now) {
  const lower = text.toLowerCase()

  // Ví dụ: "sau 30 phút", "sau 2 giờ".
  const relative = lower.match(
    /\b(?:sau|trong)\s+(\d+)\s*(phút|phut|giờ|gio|tiếng|tieng|ngày|ngay)(?:\s+nữa)?/i,
  )

  if (relative) {
    const amount = Number(relative[1])

    if (amount < 1 || amount > 365) {
      return {
        error: "Khoảng thời gian nhắc phải từ 1 đến 365 đơn vị.",
      }
    }

    const unit = relative[2].toLowerCase()

    const multiplier = ["phút", "phut"].includes(unit)
      ? 60_000
      : ["giờ", "gio", "tiếng", "tieng"].includes(unit)
        ? 3_600_000
        : 86_400_000

    return {
      dueAt: now.getTime() + amount * multiplier,
    }
  }

  // Hỗ trợ: 8h, 8h30, 8:30, 8 giờ, 8 giờ 30, 5 giờ chiều.
  const time = lower.match(TIME_RE)

  if (!time) {
    return {
      error:
        "Mình chưa nhận ra giờ nhắc. Ví dụ: “mai 8h tôi có hẹn”.",
    }
  }

  const rawHour = Number(time[1])
  const minute = Number(time[2] || time[3] || 0)
  const hour = to24Hour(rawHour, time[4] || "")

  if (
    rawHour > 23 ||
    hour > 23 ||
    minute > 59
  ) {
    return {
      error: "Giờ nhắc chưa hợp lệ. Bạn kiểm tra lại giờ và phút nhé.",
    }
  }

  const current = vietnamParts(now)

  let { year, month, day } = current
  let hasExplicitDate = false

  // Ngày dạng 25/10 hoặc 25/10/2026.
  let dateMatch = lower.match(
    /\bngày\s+(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{4}))?/i,
  )

  // Ngày dạng "ngày 25 tháng 10".
  if (!dateMatch) {
    dateMatch = lower.match(
      /\bngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/i,
    )
  }

  if (dateMatch) {
    day = Number(dateMatch[1])
    month = Number(dateMatch[2])

    if (dateMatch[3]) {
      year = Number(dateMatch[3])
    }

    hasExplicitDate = true
  } else if (/\b(?:ngày\s+mai|mai|tomorrow)\b/i.test(lower)) {
    // Ngày mai.
    ({ year, month, day } = addVietnamDays(
      year,
      month,
      day,
      1,
    ))

    hasExplicitDate = true
  } else if (
    /\b(?:hôm nay|hom nay|sáng nay|trưa nay|chiều nay|tối nay)\b/i.test(
      lower,
    )
  ) {
    hasExplicitDate = true
  } else {
    // Ngày trong tuần.
    const weekdayMatch = lower.match(
      /\b(thứ\s+(?:hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|chủ nhật|chu nhat)\b/i,
    )

    if (weekdayMatch) {
      const name = weekdayMatch[1].replace(/\s+/g, " ")

      const weekdays = {
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
      }

      let delta =
        (weekdays[name] - current.weekday + 7) % 7

      if (
        delta === 0 &&
        (
          hour < current.hour ||
          (hour === current.hour && minute <= current.minute)
        )
      ) {
        delta = 7
      }

      ({ year, month, day } = addVietnamDays(
        year,
        month,
        day,
        delta,
      ))

      hasExplicitDate = true
    }
  }

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return {
      error: "Ngày nhắc chưa hợp lệ. Bạn kiểm tra lại ngày/tháng nhé.",
    }
  }

  let due = vietnamDate(year, month, day, hour, minute)

  // Kiểm tra ngày thực tế, ví dụ không cho phép 31/02.
  const check = vietnamParts(due)

  if (
    check.year !== year ||
    check.month !== month ||
    check.day !== day
  ) {
    return {
      error: "Ngày nhắc không tồn tại. Bạn kiểm tra lại ngày/tháng nhé.",
    }
  }

  if (due.getTime() <= now.getTime()) {
    if (hasExplicitDate) {
      return {
        error:
          "Thời điểm đó đã qua. Bạn hãy chọn thời điểm trong tương lai nhé.",
      }
    }

    // Nếu chỉ nói "8h", mà 8h hôm nay đã qua, hiểu là ngày mai.
    due = new Date(due.getTime() + 86_400_000)
  }

  return {
    dueAt: due.getTime(),
  }
}

function cleanTitle(text) {
  return text
    .replace(
      /^\s*(?:hãy\s+)?nhắc\s+(?:(?:tôi|mình|cả nhà|mọi người|gia đình)\s+)?/i,
      "",
    )
    .replace(new RegExp(TIME_RE.source, "gi"), " ")
    .replace(
      /\b(?:sau|trong)\s+\d+\s*(?:phút|phut|giờ|gio|tiếng|tieng|ngày|ngay)(?:\s+nữa)?/gi,
      " ",
    )
    .replace(
      /\bngày\s+\d{1,2}\s*[/-]\s*\d{1,2}(?:\s*[/-]\s*\d{4})?/gi,
      " ",
    )
    .replace(
      /\bngày\s+\d{1,2}\s+tháng\s+\d{1,2}(?:\s+năm\s+\d{4})?/gi,
      " ",
    )
    .replace(
      /\b(?:ngày\s+mai|mai|tomorrow|hôm\s+nay|hom\s+nay|sáng\s+nay|trưa\s+nay|chiều\s+nay|tối\s+nay)\b/gi,
      " ",
    )
    .replace(
      /\b(?:thứ\s+(?:hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|chủ\s+nhật|chu\s+nhat)\b/gi,
      " ",
    )
    .replace(
      /\b(?:lúc|luc|vào|vao|khoảng|khoang)\b/gi,
      " ",
    )
    .replace(/[,.!?;:–—-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function parseReminderRequest(text, now = new Date()) {
  const lower = text.toLowerCase().trim()

  // Xem lịch nhắc.
  if (
    /^(?:(?:cho tôi xem|xem|liệt kê|liet ke|danh sách|danh sach)\s+)?(?:các\s+)?(?:lịch nhắc|lịch hẹn|nhắc hẹn|nhắc nhở)(?:\s+(?:của tôi|hôm nay|hom nay))?$/i.test(
      lower,
    )
  ) {
    return {
      type: "list",
    }
  }

  // Hủy lịch nhắc theo số thứ tự.
  const cancel = lower.match(
    /(?:hủy|huỷ|huy|xóa|xoá|xoa|bỏ|bo)\s+(?:lịch\s+)?(?:nhắc|nhac|hẹn|hen)(?:\s+(?:lịch\s+)?(?:số|so))?\s*(\d+)/i,
  )

  if (cancel) {
    return {
      type: "cancel",
      number: Number(cancel[1]),
    }
  }

  const explicitReminder = /\bnhắc\b|\bnhac\b/i.test(lower)

  // Các từ gợi ý đây là một lịch hẹn hoặc công việc cần nhắc.
  const eventCue =
    /\b(?:hẹn|hen|lịch|họp|hop|đón|don|đưa|dua|gặp|gap|gọi|goi|khám|kham|sinh nhật|sự kiện|su kien|nộp|nop|đóng tiền|dong tien|thanh toán|thanh toan|lễ|le|đi học|di hoc|đi làm|di lam|lấy|lay|chở|cho bé)\b/i.test(
      lower,
    )

  // Nhận câu tự nhiên như "mai 8h tôi có hẹn".
  if (!explicitReminder && !eventCue) {
    return {
      type: "none",
    }
  }

  const schedule = parseSchedule(text, now)

  if (schedule.error) {
    if (!explicitReminder) {
      return {
        type: "none",
      }
    }

    return {
      type: "invalid",
      reply: schedule.error,
    }
  }

  const title = cleanTitle(text)

  if (
    !title ||
    /^(?:tôi|mình|cả nhà|mọi người|gia đình)?\s*$/i.test(title)
  ) {
    return {
      type: "invalid",
      reply:
        "Bạn muốn nhắc việc gì? Ví dụ: “Nhắc cả nhà đón em bé lúc 4 giờ chiều mai”.",
    }
  }

  return {
    type: "create",
    title,
    dueAt: schedule.dueAt,
  }
}