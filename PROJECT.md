# Project Overview

## Mục đích

Zalo Bot chạy bằng Deno Deploy, nhận webhook từ Zalo Bot API và phản hồi tin nhắn.
Tính năng nhắc hẹn lưu lịch theo cuộc trò chuyện, rồi gửi thông báo vào chính cuộc trò chuyện đó.

## Cấu trúc

- `main.js`: HTTP entry point và lịch chạy định kỳ mỗi phút.
- `src/middlewares/auth.middleware.js`: xác thực webhook qua `ZALO_WEBHOOK_SECRET`.
- `src/handlers/message.handler.js`: điều phối tin nhắn và các yêu cầu nhắc hẹn.
- `src/services/zalo.service.js`: giao tiếp với Zalo Bot API.
- `src/services/reminder.service.js`: tạo, liệt kê, hủy và gửi lịch nhắc bằng Deno KV.
- `src/utils/reminder-parser.js`: phân tích các cách nói tiếng Việt phổ biến về thời gian nhắc.
- `src/config/env.js`: đọc biến môi trường.
- `src/utils/logger.js`: ghi log.

## Biến môi trường

- `ZALO_WEBHOOK_SECRET`
- `ZALO_BOT_TOKEN`

## Luồng xử lý

Tin nhắn Zalo -> webhook -> xác thực -> message handler -> reminder parser
-> reminder service / Zalo service.

Deno Cron chạy mỗi phút để tìm lịch đến hạn. Tất cả lịch được lưu theo `chat_id` của cuộc trò chuyện tạo lịch.

## Lệnh và ví dụ

- `Nhắc cả nhà đón em bé lúc 5 giờ chiều mai`
- `Nhắc tôi gọi điện sau 30 phút`
- `Xem lịch nhắc`
- `Hủy lịch nhắc số 2`

Thời gian ngôn ngữ tự nhiên hiện được phân tích bằng quy tắc, chưa dùng mô hình AI; nên diễn đạt rõ giờ và ngày để tránh hiểu nhầm.

## Thiết lập triển khai

- Ứng dụng phải chạy trên Deno Deploy có hỗ trợ `Deno.cron()`.
- Cần bật/gán Deno KV database cho ứng dụng triển khai để lịch được lưu bền vững.
- Cron chạy theo UTC, nhưng thời điểm nhắc được phân tích và hiển thị theo giờ Việt Nam (UTC+7).
- Bot chỉ có thể gửi vào những cuộc trò chuyện mà Zalo Bot API hiện tại cho phép bot truy cập. Cần thử xác nhận nhận tin và gửi tin trong nhóm gia đình trước khi coi hỗ trợ nhóm là đã hoạt động.

## Quy ước

- Webhook chỉ tiếp nhận request và điều phối.
- Không đặt nghiệp vụ trực tiếp trong webhook.
- Tích hợp API bên ngoài đặt trong services.
- Nghiệp vụ theo tính năng đặt trong modules khi cần.
- Không ghi token hoặc secret vào mã nguồn.
