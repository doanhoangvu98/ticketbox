# Checklist

Đánh dấu `[x]` khi xong. Mục ⭐ là stretch.

## Tuần 0: Chuẩn bị môi trường
- [ ] Cài JDK 21, IntelliJ chọn đúng SDK 21 cho project (xem `SETUP.md`)
- [ ] Maven chạy được: `mvn -v` hiển thị Java 21
- [ ] Docker Desktop / Docker trong WSL chạy được
- [ ] Tạo repo GitHub, push commit đầu tiên
- [ ] Đọc `PROJECT_BRIEF.md`, `CONVENTIONS.md`

## Tuần 1: Java Core ✅ code đã có

**Chạy và hiểu**
- [ ] `mvn -pl ticketbox-core test` xanh
- [ ] `mvn -pl ticketbox-core exec:java` in ra sơ đồ ghế và 6 phần demo
- [ ] Giải thích được vì sao `SeatPosition` là `record` và dùng làm key của `Map`
- [ ] Giải thích được `Seat` là `abstract sealed`, `VipSeat` override `price()`
- [ ] Giải thích được `PricingStrategy` là functional interface và cách `andThen` ghép chiến lược
- [ ] Giải thích được `Repository<T extends Identifiable<ID>, ID>`
- [ ] Giải thích được `groupingBy`, `partitioningBy`, `reducing` trong `ReportService`
- [ ] Giải thích được race condition "check-then-act" và vì sao `ConcurrentHashMap` chưa đủ
- [ ] Giải thích được vì sao inject `Clock` thay vì gọi `Instant.now()`

**Tự làm**
- [ ] Bài tập: `weekendSurcharge(percent)` + test
- [ ] Commit theo Conventional Commits, gắn tag `w1-done`

**Demo**
- [ ] Chạy `BookingConcurrencyTest`: naive > 1 người thắng, service đúng 1
- [ ] Mở `KNOWLEDGE_MAP.md` mục Tuần 1 khi mentor hỏi
- [ ] Trả lời được: `synchronized` vs `ReentrantLock`; vì sao `HashMap` không thread-safe

## Tuần 2: Spring Boot + DB ✅ code đã có

**Chạy và hiểu**
- [ ] `docker compose up -d`, kết nối DB bằng DBeaver/IntelliJ (port 5433)
- [ ] Chạy API profile `dev`, Flyway tạo bảng + seed ~300k ghế
- [ ] Swagger: tạo event → publish → xem seats → cancel
- [ ] Thử body sai → nhận `400` với danh sách `errors`
- [ ] Hiểu luồng `Controller → Service → Repository` và vì sao không trả entity ra ngoài
- [ ] Hiểu `@Transactional(readOnly = true)` + dirty checking (không gọi `save()` khi publish)
- [ ] Hiểu `Specification` ghép filter động
- [ ] Hiểu vì sao seat dùng SEQUENCE thay vì IDENTITY

**Middle: đo số liệu (ghi vào `BENCHMARK.md`)**
- [ ] N+1: comment `@EntityGraph`, đếm query → bỏ comment, đếm lại
- [ ] `EXPLAIN ANALYZE` truy vấn ghế hết hạn: trước V2 (`target: "1.1"`) và sau V2
- [ ] `EXPLAIN ANALYZE` danh sách event theo status + ngày: trước và sau

**Tự làm**
- [ ] Bài tập: filter `venueId` cho `GET /api/v1/events` + test
- [ ] `mvn verify` xanh, tag `w2-done`

**Demo**
- [ ] Swagger: CRUD + lỗi 400/404/409 cùng một format
- [ ] Chiếu log SQL N+1 trước/sau
- [ ] Chiếu `EXPLAIN` trước/sau index
- [ ] Trả lời được: index có nhược điểm gì; N+1 là gì; `ddl-auto` nên để gì

## Tuần 3: Security, vai trò, vòng đời sự kiện (chi tiết: `weekly/WEEK-3.md`)
- [ ] V3 users + review, V4 ticket_type (chuyển dữ liệu cũ), V5 bỏ cột cũ, seed 4 tài khoản demo
- [ ] Register/login/me, BCrypt, JWT filter, tài khoản LOCKED bị chặn
- [ ] `/events` public trả đúng `EventSummary`/`EventDetail` mới
- [ ] Organizer: tạo/sửa (DRAFT/REJECTED), gửi duyệt, kiểm tra sở hữu (404)
- [ ] Admin: duyệt/từ chối sự kiện, danh sách + sửa user
- [ ] Test: 401/403, organizer khác → 404, dải hàng chồng nhau → 400
- [ ] FE: `VITE_MOCK_EXCLUDE=auth,events,organizer` chạy được
- [ ] ⭐ Refresh token
- [ ] Tag `w3-done`

## Tuần 4: Đặt vé + VietQR (chi tiết: `weekly/WEEK-4.md`) — mốc MVP
- [ ] V6 orders, V7 payments/tickets/promo
- [ ] `POST /orders` đủ 7 bước kiểm tra (DOMAIN mục 4), mã đơn `TBX…`
- [ ] Optimistic lock ghế, UPDATE có điều kiện cho quota GA
- [ ] `HoldExpiryJob` + lazy expiry
- [ ] Checkout trả VietQR; webhook idempotent, 6 tình huống
- [ ] Phát vé + qrToken HMAC; `/me/orders`, `/me/tickets`
- [ ] Test 50 thread / 1 ghế; race.sh; ghi `BENCHMARK.md`
- [ ] ⭐ So sánh pessimistic lock, ⭐ SSE thay polling
- [ ] FE: thêm `orders,payments` vào `VITE_MOCK_EXCLUDE`
- [ ] Tag `w4-done`

## Tuần 5 ⭐: Vận hành (chi tiết: `weekly/WEEK-5.md`)
- [ ] Check-in atomic + phân công staff
- [ ] Yêu cầu hoàn / duyệt / từ chối; hủy sự kiện hoàn 100%
- [ ] Đối soát: ghép đơn, trả lại tiền
- [ ] Mã giảm giá
- [ ] Dashboard organizer/admin bằng SQL
- [ ] FE: `VITE_USE_MOCK=false`
- [ ] Tag `w5-done`

## Tuần 6 ⭐: Production (chi tiết: `weekly/WEEK-6.md`)
- [ ] Testcontainers, GitHub Actions
- [ ] Dockerfile BE/FE, Nginx, `docker-compose.prod.yml`
- [ ] k6, Actuator, metrics, log requestId
- [ ] README ảnh chụp, tag `v1.0.0`

## Frontend (đã có, chạy bằng mock)
- [x] UI 4 vai trò, responsive, VI/EN, sáng/tối
- [x] axios + TanStack Query + MSW + react-toastify + VietQR + QR vé
- [ ] Chạy `npm install && npm run dev`, thử đủ luồng bằng nút MOCK

## Checklist trước mỗi buổi demo
- [ ] `mvn verify` xanh
- [ ] DB đã có dữ liệu seed
- [ ] Mở sẵn: Swagger, IntelliJ ở file chính, `KNOWLEDGE_MAP.md`
- [ ] Biết 3 câu mentor hay hỏi của tuần (trong `weekly/WEEK-x.md`)
