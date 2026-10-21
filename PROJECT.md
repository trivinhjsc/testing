# Project Overview

## Mục đích

Zalo Bot chạy trên Vercel, nhận webhook từ Zalo Bot API
và phản hồi tin nhắn.

## Cấu trúc

- `api/webhook.js`: HTTP entry point.
- `src/middlewares/auth.middleware.js`: xác thực webhook.
- `src/handlers/message.handler.js`: xử lý sự kiện tin nhắn.
- `src/services/zalo.service.js`: giao tiếp với Zalo Bot API.
- `src/config/env.js`: đọc biến môi trường.
- `src/utils/logger.js`: ghi log.

## Biến môi trường

- `ZALO_WEBHOOK_SECRET`
- `ZALO_BOT_TOKEN`

## Luồng xử lý

Zalo -> webhook -> xác thực -> message handler
-> Zalo service -> gửi phản hồi.

## Quy ước

- Webhook chỉ tiếp nhận request và điều phối.
- Không đặt nghiệp vụ trực tiếp trong webhook.
- Tích hợp API bên ngoài đặt trong services.
- Nghiệp vụ theo tính năng đặt trong modules khi cần.
- Không ghi token hoặc secret vào mã nguồn.
