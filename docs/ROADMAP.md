# Roadmap

> **Cho người và cho AI.** Mỗi tuần có file chi tiết `docs/weekly/WEEK-N.md` theo cùng một khung:
> *Mục tiêu → Học được gì → Code sẽ gồm → Migration → API → Test bắt buộc → Definition of Done → Demo → Câu hỏi mentor.*
> Tiến độ hiện tại ghi ở [`PROGRESS.md`](PROGRESS.md). Muốn nhờ Claude làm tiếp: xem mục *"Làm tiếp với AI"* cuối file này.

**Nguyên tắc:** mỗi tính năng làm bản **Junior+** chạy được trước (gắn tag `wN-basic`), rồi nâng lên **Middle**
(đo trước/sau, ghi `DECISIONS.md`, `BENCHMARK.md`). Mục ⭐ là stretch, bỏ được.

## Tổng quan

| Tuần | Chủ đề | Học được gì (chính) | Demo | Trạng thái |
|---|---|---|---|---|
| 1 | Domain bằng Java Core | OOP, generics, lambda/stream, concurrency trong JVM | 100 thread giành 1 ghế → 1 thắng | ✅ Code có sẵn |
| 2 | Spring Boot + PostgreSQL | DI, REST, JPA, Flyway, index, N+1 | Swagger CRUD, `EXPLAIN` trước/sau | ✅ Code có sẵn |
| 3 | Security + vai trò + vòng đời sự kiện | Spring Security, JWT, BCrypt, phân quyền theo sở hữu, state machine | Organizer tạo → Admin duyệt → khách thấy; FE tắt mock `auth,events,organizer` | ⏳ |
| 4 | Đặt vé + thanh toán VietQR | Transaction, locking DB, idempotency, scheduler, webhook | 50 request giành 1 ghế; mua vé thật trên FE, webhook giả lập | ⏳ |
| 5 ⭐ | Vận hành: check-in, hoàn tiền, đối soát, báo cáo | UPDATE atomic, SQL báo cáo, xử lý ngoại lệ tiền | Quét QR ở cổng, hoàn vé, ghép giao dịch | ⏳ |
| 6 ⭐ | Sẵn sàng production | Testcontainers, CI, Docker, load test, observability | CI xanh, k6 report, `docker compose up` cả hệ thống | ⏳ |

Tuần 1–4 là **MVP hoàn chỉnh** (mua vé thật từ đầu đến cuối). Tuần 5–6 là mở rộng nếu còn thời gian
hoặc mentor cho thêm. Frontend **đã xong toàn bộ UI** (chạy bằng mock MSW), mỗi tuần backend chỉ cần tắt mock nhóm tương ứng.

---

## Tuần 1 — Domain bằng Java Core ✅
- **Học được:** class/abstract/sealed, record, enum có logic, generics có ràng buộc, Collections, functional interface,
  lambda, Stream + Collectors, Optional, exception có phân cấp, `java.time` + `Clock`, `ReentrantLock`, `ExecutorService`.
- **Code gồm:** `backend/ticketbox-core` (domain, pricing, repository in-memory, services, demo console), 6 file test.
- **Chi tiết:** [weekly/WEEK-1.md](weekly/WEEK-1.md)

## Tuần 2 — Spring Boot + PostgreSQL ✅
- **Học được:** IoC/DI, REST + status code, Bean Validation, ProblemDetail, JPA entity/quan hệ, Spring Data, Specification,
  transaction readOnly + dirty checking, Flyway, index tổng hợp/partial, N+1, JdbcTemplate, Mockito, `@WebMvcTest`.
- **Code gồm:** `backend/ticketbox-api` (venue, event, seat, report), migration V1–V2 + seed dev.
- **Chi tiết:** [weekly/WEEK-2.md](weekly/WEEK-2.md)

## Tuần 3 — Security, vai trò, vòng đời sự kiện
- **Học được:** Spring Security filter chain, JWT (ký, hết hạn, claims), BCrypt, `@PreAuthorize` + kiểm tra sở hữu,
  state machine sự kiện, thiết kế lại schema (ticket_type) bằng migration không mất dữ liệu.
- **Code gồm:** `auth/`, `user/`, `organizer/`, `admin/` package; `TicketTypeEntity`; V3–V5.
- **FE:** `VITE_MOCK_EXCLUDE=auth,events,organizer` + phần duyệt sự kiện/user của admin.
- **Chi tiết:** [weekly/WEEK-3.md](weekly/WEEK-3.md)

## Tuần 4 — Đặt vé, thanh toán VietQR
- **Học được:** transaction boundary, optimistic vs pessimistic lock trên DB, isolation, `@Scheduled`, idempotency key,
  webhook security, sinh mã đơn/HMAC, polling vs push.
- **Code gồm:** `order/`, `payment/`, `ticket/` package; V6–V7; test concurrency qua HTTP.
- **FE:** thêm `orders,payments` vào `VITE_MOCK_EXCLUDE`.
- **Chi tiết:** [weekly/WEEK-4.md](weekly/WEEK-4.md)

## Tuần 5 ⭐ — Vận hành
- **Học được:** UPDATE có điều kiện (atomic), SQL tổng hợp cho dashboard, xử lý ngoại lệ tiền (hoàn, đối soát), audit.
- **Code gồm:** `checkin/`, refund trong `order/`, `reconciliation/`, `promo/`, `report/` mới; V8–V9.
- **FE:** tắt toàn bộ mock (`VITE_USE_MOCK=false`).
- **Chi tiết:** [weekly/WEEK-5.md](weekly/WEEK-5.md)

## Tuần 6 ⭐ — Production readiness
- **Học được:** Testcontainers, GitHub Actions, multi-stage Docker, Nginx reverse proxy, k6, Actuator/metrics, log có requestId.
- **Chi tiết:** [weekly/WEEK-6.md](weekly/WEEK-6.md)

---

## Khi trễ tiến độ

1. Bỏ mọi mục ⭐ trong tuần.
2. Tuần 5–6 có thể bỏ hẳn: MVP (tuần 1–4) đã đủ demo end-to-end.
3. **Không bỏ:** test concurrency (tuần 1, 4), N+1 + index (tuần 2), phân quyền theo sở hữu (tuần 3), idempotent webhook (tuần 4), `DECISIONS.md`.

## Git tags
`w1-done`, `w2-done`, `w3-basic`/`w3-done`, `w4-basic`/`w4-done`, `w5-done`, `v1.0.0`.

---

## Làm tiếp với AI (Claude, Copilot...)

Prompt mẫu khi bắt đầu một tuần mới:

```text
Đây là repo TicketBox. Đọc theo thứ tự: CLAUDE.md, docs/PROGRESS.md, docs/DOMAIN.md,
docs/weekly/WEEK-<N>.md, docs/API.md. Sau đó:
1. Liệt kê kế hoạch theo mục "Code sẽ gồm" của WEEK-<N>, hỏi tôi nếu có điểm chưa rõ.
2. Làm phần Junior+ trước, chạy `mvn verify` xanh, rồi mới làm phần Middle.
3. Response phải khớp frontend/src/lib/types.ts và mã lỗi trong docs/API.md.
4. Cập nhật PROGRESS.md, KNOWLEDGE_MAP.md, DECISIONS.md (nếu có trade-off), CHECKLIST.md.
Không làm tính năng của tuần sau.
```
