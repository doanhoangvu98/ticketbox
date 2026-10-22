# Tuần 2: Spring Boot + PostgreSQL

Module: `backend/ticketbox-api` · Thời lượng gợi ý: 3–4 giờ

## Tóm tắt

| | |
|---|---|
| **Mục tiêu** | Đưa domain lên REST API với PostgreSQL, đo và tối ưu truy vấn |
| **Học được gì** | Spring IoC/DI + `@Configuration`, REST + status code, Bean Validation (JSR 380), ProblemDetail (RFC 7807), JPA entity + quan hệ LAZY, Spring Data (derived query, `@Query`, projection, Specification, phân trang), transaction readOnly + dirty checking, Flyway, index tổng hợp + partial, N+1 + `@EntityGraph`, SEQUENCE + batch insert, `JdbcTemplate`, Mockito, `@WebMvcTest`, Swagger |
| **Code gồm** | `common/` (config, BaseEntity, GlobalExceptionHandler, PageResponse), `venue/`, `event/`, `seat/`, `report/`; `V1__init_schema`, `V2__add_query_indexes`, seed dev `V1_1`; `EventServiceTest`, `EventControllerTest` |
| **Definition of Done** | API chạy với Docker PostgreSQL · Swagger thao tác được · điền `BENCHMARK.md` B1–B3 · bài tập mục 6 · tag `w2-done` |
| **Liên hệ tuần sau** | Tuần 3 đổi shape `/events` theo `frontend/src/lib/types.ts` và thay VIP/STANDARD bằng `ticket_type` (xem `PROGRESS.md` mục khoảng cách) |

## 1. Điều quan trọng nhất cần hiểu: tuần 2 **dùng lại** tuần 1

```java
// EventService.create (tuần 2)
SeatLayout layout = new SeatLayout(rows, seatsPerRow, vipRows, basePrice);   // record của core
List<SeatEntity> seats = seatMapFactory.create(layout).stream()              // factory của core
        .map(seat -> SeatEntity.of(event, seat))                             // giá lấy từ VipSeat.price()
        .toList();
```
Rule VIP, giá 1.5x, trạng thái ghế, exception đều viết **một lần** ở core. `CoreBeansConfig` biến các class
không có annotation của core thành Spring bean.

## 2. Đọc code theo luồng request

### `POST /api/v1/events`
1. **`EventController.create`**: `@Valid` kiểm tra `CreateEventRequest`. Sai → Spring ném
   `MethodArgumentNotValidException` → `GlobalExceptionHandler` trả `400` với danh sách `errors`.
2. **`EventService.create`** (`@Transactional`):
   - Tìm venue, không có → `NotFoundException.venue(id)` (exception của core) → `404`.
   - Lưu `EventEntity`, sinh ghế bằng `SeatMapFactory`, `saveAll` → Hibernate gom INSERT theo lô 50.
3. Controller trả `201 Created` + header `Location: /api/v1/events/{id}`.

### `GET /api/v1/events`
- `EventSearchCriteria` (record) nhận query param; field nào không gửi thì là `null`.
- `EventSpecifications.from(...)`: mỗi filter là một lambda `(root, query, cb) -> predicate`;
  `Optional` + `flatMap(Optional::stream)` chỉ giữ filter có giá trị; `Specification.allOf` ghép lại.
  **Cùng ý tưởng với ghép `Predicate` ở tuần 1.**
- `EventRepository.findAll` có `@EntityGraph(attributePaths = "venue")` → lấy event và venue bằng một JOIN.

### `POST /api/v1/events/{id}/publish`
```java
EventEntity event = getEntity(id);
event.publish();       // rule nằm trong entity
return mapper.toResponse(...);   // không có save()
```
**Không gọi `save()` vẫn lưu?** Có. Trong transaction, entity được Hibernate "quản lý". Khi commit, Hibernate so sánh
với bản chụp lúc load (*dirty checking*) và tự sinh `UPDATE`. `@Version` làm câu UPDATE có thêm `AND version = ?`.

## 3. Các điểm Middle cần nói được

| Chủ đề | Ở đâu | Nói gì |
|---|---|---|
| **N+1** | `EventRepository` | Không có entity graph: 1 query lấy trang event + mỗi venue khác nhau thêm 1 query. Sửa bằng JOIN |
| **open-in-view=false** | `application.yml` | Lazy loading ngoài transaction lỗi ngay, không âm thầm chạy query khi render JSON |
| **readOnly transaction** | `EventService` | Hibernate bỏ dirty checking, nhẹ hơn cho các API đọc |
| **SEQUENCE vs IDENTITY** | `SeatEntity` | IDENTITY không batch insert được |
| **Index tổng hợp** | `V2` | `(status, starts_at)`: cột so sánh bằng trước, cột range/sort sau |
| **Partial index** | `V2` | Chỉ index ghế `HELD`: nhỏ, nhanh cho job dọn dẹp |
| **FK không tự có index** | `V2` | PostgreSQL không tự tạo, MySQL InnoDB thì có |
| **JPA vs SQL thuần** | `RevenueReportRepository` | Báo cáo gom nhóm lớn dùng SQL, không load entity |
| **Seed tách khỏi migration** | `db/seed`, `application-dev.yml` | Production không bao giờ có dữ liệu giả |
| **ProblemDetail** | `GlobalExceptionHandler` | Một format lỗi chung, client đọc `errorCode` |

## 4. Kịch bản demo (10 phút)

1. **(1 phút)** `docker compose ps`, mở DBeaver: bảng `flyway_schema_history` có V1, V1.1, V2.
2. **(3 phút) Swagger:**
   - `GET /venues` → `POST /events` (venue 1, vipRows 2) → 201, `capacity` 100.
   - `GET /events/{id}/seats?status=AVAILABLE` → hàng A, B là VIP, giá 1.5x.
   - `POST /events/{id}/publish` → gọi lần nữa → `409 INVALID_STATE`.
   - `POST /events` body sai → `400` với `errors`.
   - `GET /events/999999` → `404` cùng format.
3. **(3 phút) N+1:** chiếu log SQL khi comment và bỏ comment `@EntityGraph` (số liệu trong `BENCHMARK.md`).
4. **(2 phút) Index:** chiếu `EXPLAIN ANALYZE` trước/sau V2.
5. **(1 phút)** Chạy `EventServiceTest`, `EventControllerTest`. Tuần sau: đặt vé + locking trên DB.

## 5. Câu hỏi mentor hay hỏi

**Index có nhược điểm gì?**
Tốn dung lượng, và mỗi INSERT/UPDATE/DELETE phải cập nhật thêm index nên ghi chậm hơn. Chỉ tạo index
cho query thật sự chạy thường xuyên, và kiểm tra bằng `EXPLAIN`.

**N+1 là gì, phát hiện thế nào?**
1 query lấy danh sách + N query lấy dữ liệu liên quan cho từng phần tử. Phát hiện bằng log SQL,
`hibernate.generate_statistics`, hoặc test đếm số query. Sửa bằng `JOIN FETCH`, `@EntityGraph`, hoặc `@BatchSize`.

**`ddl-auto` nên để gì?**
`validate` (hoặc `none`) khi đã dùng Flyway. `update`/`create` không kiểm soát được thay đổi schema, có thể mất dữ liệu.

**Vì sao không trả entity ra controller?**
Lộ cấu trúc DB, dễ dính lazy loading khi serialize, và mỗi lần đổi entity là vỡ API. DTO là hợp đồng ổn định.

**Gọi method `@Transactional` từ cùng class có chạy transaction không?**
Không. Spring bọc bean bằng proxy; gọi nội bộ (`this.method()`) không đi qua proxy nên annotation bị bỏ qua.

## 6. Bài tập tự làm (≈1 giờ)

Thêm filter `venueId` cho `GET /api/v1/events`:
1. Thêm field `Long venueId` vào `EventSearchCriteria`.
2. Thêm `hasVenue(Long venueId)` trong `EventSpecifications`:
   `(root, query, cb) -> cb.equal(root.get("venue").get("id"), venueId)`, rồi thêm vào `Stream.of(...)`.
3. Kiểm tra trên Swagger, xem log SQL có dùng `venue_id` và index `ix_event_venue_id`.
4. Commit: `feat(event): filter events by venue`.
