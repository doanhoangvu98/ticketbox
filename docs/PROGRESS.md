# Tiến độ

> File này cho biết **đang ở đâu**. Cập nhật mỗi khi xong một mục. AI đọc file này trước khi làm tiếp.

**Tuần hiện tại:** 1–2 (đang học, code nền đã có)
**Cập nhật lần cuối:** 2026-10-20

## Trạng thái

| Phần | Trạng thái | Ghi chú |
|---|---|---|
| Tuần 1 — `ticketbox-core` | 🟡 Code có sẵn, chưa tự học/demo | Bài tập `withSurchargePercent` chưa làm |
| Tuần 2 — `ticketbox-api` | 🟡 Code có sẵn, chưa chạy với DB | Chưa điền `BENCHMARK.md` |
| Tuần 3 — Security, sự kiện | ⏳ Chưa bắt đầu | |
| Tuần 4 — Đặt vé, thanh toán | ⏳ | |
| Tuần 5 ⭐ — Vận hành | ⏳ | |
| Tuần 6 ⭐ — Production | ⏳ | |
| Frontend | ✅ UI đầy đủ 4 vai trò, chạy bằng mock MSW | `VITE_MOCK_EXCLUDE=` (chưa tắt nhóm nào) |

## Khoảng cách backend ↔ frontend hiện tại

| Hạng mục | Backend (tuần 2) | Frontend/hợp đồng | Xử lý ở |
|---|---|---|---|
| Hạng ghế | `SeatType` STANDARD/VIP cố định | `TicketType` do organizer định nghĩa | Tuần 3 (V4) |
| Trạng thái sự kiện | DRAFT/PUBLISHED/CANCELLED/COMPLETED | + PENDING_REVIEW, REJECTED | Tuần 3 (V3) |
| `EventSummary` | id, name, venueName, startsAt, basePrice, status | + category, city, minPrice, seatingType, soldOut | Tuần 3 |
| Ghế | `type`, 3 trạng thái | `ticketTypeId`, + BLOCKED | Tuần 3 |
| Đăng nhập | Chưa có | JWT | Tuần 3 |

## Nhật ký

| Ngày | Việc |
|---|---|
| 2026-10-20 | Sinh code tuần 1–2, tài liệu, frontend đầy đủ (MSW, 4 vai trò, VietQR) |
