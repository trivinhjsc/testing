import { parseReminderRequest } from "../src/utils/reminder-parser.js";

function assertEquals(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      (message ? message + ": " : "") +
      "Expected " + expectedJson + ", received " + actualJson,
    );
  }
}

Deno.test("parses a family reminder for tomorrow afternoon", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  const result = parseReminderRequest(
    "Nhắc cả nhà đón em bé lúc 5 giờ chiều mai",
    now,
  );

  assertEquals(result.type, "create", "request type");
  assertEquals(result.title, "đón em bé", "reminder title");
  assertEquals(
    result.dueAt,
    new Date("2026-10-22T10:00:00.000Z").getTime(),
    "due time",
  );
});

Deno.test("parses relative time", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  const result = parseReminderRequest(
    "Nhắc tôi gọi khách hàng sau 30 phút",
    now,
  );

  assertEquals(result.type, "create", "request type");
  assertEquals(result.title, "gọi khách hàng", "reminder title");
  assertEquals(
    result.dueAt,
    new Date("2026-10-21T10:30:00.000Z").getTime(),
    "due time",
  );
});

Deno.test("parses a numeric date and 24-hour time", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  const result = parseReminderRequest(
    "Nhắc cả nhà đón bé lúc 16:30 ngày 25/10",
    now,
  );

  assertEquals(result.type, "create", "request type");
  assertEquals(result.title, "đón bé", "reminder title");
  assertEquals(
    result.dueAt,
    new Date("2026-10-25T09:30:00.000Z").getTime(),
    "due time",
  );
});

Deno.test("recognizes listing reminders", () => {
  assertEquals(
    parseReminderRequest("Xem lịch nhắc").type,
    "list",
    "request type",
  );
});

Deno.test("recognizes cancellation by list number", () => {
  assertEquals(
    parseReminderRequest("Hủy lịch nhắc số 2").number,
    2,
    "reminder number",
  );
});

Deno.test("asks for a time when none is present", () => {
  assertEquals(
    parseReminderRequest("Nhắc cả nhà đón em bé ngày mai").type,
    "invalid",
    "request type",
  );
});
