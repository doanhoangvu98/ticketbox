# Architecture Decision Records (ADR)

Mỗi quyết định ghi theo mẫu: **Bối cảnh → Lựa chọn → Quyết định → Hệ quả**.
Đây là tài liệu quan trọng nhất để chứng minh tư duy Middle: không chỉ "làm gì" mà "vì sao".

---

## ADR-001: Tách `ticketbox-core` (Java thuần) và `ticketbox-api` (Spring)
**Bối cảnh:** Tuần 1 chỉ học Java Core, mentor muốn thấy kiến thức đó trong code. Tuần 2 mới có Spring.
**Lựa chọn:** (a) một project Spring từ đầu; (b) project Java thuần rồi viết lại; (c) Maven multi-module.
**Quyết định:** (c). Core không phụ thuộc framework, API dùng lại core.
**Hệ quả:** + Rule nghiệp vụ test trong vài ms, không cần DB. + Tuần 2 dùng lại `SeatMapFactory`, enum, exception.
− Có hai model (domain `Event` và `EventEntity`), cần map qua lại.

## ADR-002: Spring Boot 3.5.x, không dùng 4.x
**Bối cảnh:** Đã gặp lỗi cấu hình khi thử 4.x; tài liệu, khóa học và thư viện (springdoc...) phần lớn theo 3.x.
**Quyết định:** 3.5.x, Java 21.
**Hệ quả:** Ổn định, nhiều tài liệu. Nâng cấp sau khi hệ sinh thái 4.x ổn định.

## ADR-003: Khóa theo từng event (`ReentrantLock`) ở tuần 1
**Bối cảnh:** "Mỗi ghế chỉ thuộc một booking" là check-then-act trên **nhiều ghế** cùng lúc.
**Lựa chọn:**
| Cách | Nhận xét |
|---|---|
| `synchronized` cả method | Đúng nhưng mọi event chặn nhau |
| Lock từng ghế | Đặt nhiều ghế phải lấy nhiều lock → nguy cơ deadlock |
| `ConcurrentHashMap` | Từng thao tác an toàn, nhưng chuỗi check + act thì không |
| **Lock theo event** | Event khác nhau không chặn nhau, đặt nhiều ghế chỉ cần 1 lock |
**Quyết định:** `ConcurrentHashMap<Long, ReentrantLock>` + `computeIfAbsent`, bọc trong `withEventLock`.
**Hệ quả:** Chỉ đúng trong một JVM. Tuần 3 chuyển sang khóa ở DB.

## ADR-004: `TreeMap` cho ghế trong `Event`
**Lựa chọn:** `HashMap` (O(1)) vs `TreeMap` (O(log n), có thứ tự).
**Quyết định:** `TreeMap`. Event tối đa vài nghìn ghế, O(log n) không đáng kể; đổi lại sơ đồ ghế luôn đúng thứ tự A1, A2... A10 mà không cần sort.

## ADR-005: SEQUENCE (allocationSize 50) cho bảng `seat`, IDENTITY cho bảng nhỏ
**Bối cảnh:** Tạo một event 500 chỗ = 500 INSERT.
**Lựa chọn:** IDENTITY: DB sinh id lúc INSERT nên Hibernate phải INSERT từng dòng, **không batch được**.
SEQUENCE: Hibernate lấy trước 50 id mỗi lần gọi DB, gom INSERT theo lô.
**Quyết định:** SEQUENCE + `hibernate.jdbc.batch_size=50` cho `seat`. Venue/event ít dòng, IDENTITY cho đơn giản.
**Hệ quả:** Id ghế không liên tục (nhảy 50), không ảnh hưởng nghiệp vụ.

## ADR-006: Map DTO bằng tay, chưa dùng MapStruct
**Quyết định:** Vài DTO, map bằng tay rõ ràng, debug dễ, không thêm annotation processor.
**Xem lại khi:** quá ~15 DTO hoặc mapping lặp nhiều.

## ADR-007: Lombok có giới hạn, không `@Data` trên entity
**Bối cảnh:** `@Data` sinh `equals/hashCode/toString` gồm cả quan hệ lazy.
**Vấn đề:** gọi `toString()`/`hashCode()` có thể kích hoạt query hoặc `LazyInitializationException`;
hashCode theo id thay đổi sau khi persist, làm hỏng `HashSet`.
**Quyết định:** Chỉ `@Getter`, `@RequiredArgsConstructor`, `@NoArgsConstructor(PROTECTED)`, `@Slf4j`.
`equals/hashCode` viết tay trong `BaseEntity` (cùng class + cùng id khác null; hashCode cố định theo class).

## ADR-008: JPA cho ghi, SQL (`JdbcTemplate`) cho báo cáo
**Bối cảnh:** Báo cáo doanh thu gom hàng trăm nghìn ghế.
**Quyết định:** Báo cáo dùng SQL thuần với `GROUP BY` + `FILTER`, trả thẳng record. Không load entity.
**Hệ quả:** Nhanh, ít bộ nhớ. Đổi lại SQL phụ thuộc PostgreSQL (`FILTER`), chấp nhận được.

## ADR-009: `spring.jpa.open-in-view=false`
**Bối cảnh:** Mặc định Spring giữ Hibernate session tới lúc render JSON, lazy loading "vô tình" chạy query ngoài service.
**Quyết định:** Tắt. Mọi việc map entity → DTO nằm trong transaction của service.
**Hệ quả:** Quên fetch sẽ lỗi ngay khi dev (dễ phát hiện), thay vì chạy N+1 âm thầm trên production.

## ADR-010: Sửa N+1 bằng `@EntityGraph`
**Lựa chọn:** `JOIN FETCH` trong JPQL / `@EntityGraph` / `@BatchSize` / để `EAGER`.
**Quyết định:** `@EntityGraph(attributePaths = "venue")` trên `findAll(Specification, Pageable)`.
Lý do: dùng được với Specification + phân trang mà không phải viết lại query; `EAGER` bị loại vì áp dụng ở mọi nơi.

## ADR-011: Lỗi theo chuẩn RFC 7807 (ProblemDetail)
**Quyết định:** Dùng `ProblemDetail` của Spring + thuộc tính `errorCode`. Client dựa vào `errorCode`, không parse message.

## ADR-012: Seed dữ liệu demo tách khỏi migration
**Quyết định:** Seed ở `db/seed`, version `1.1`, chỉ nạp ở profile `dev`. Production chỉ có `db/migration`.
**Hệ quả:** Đặt seed trước V2 (index) để đo được hiệu năng trước/sau index.

## ADR-FE-01: React + Vite + Tailwind v4 + Remix Icon
**Bối cảnh:** Owner có kinh nghiệm FE, cần UI đẹp, responsive, dark mode, làm nhanh.
**Quyết định:** Tailwind (responsive + dark mode bằng prefix, không viết CSS riêng), Remix Icon (miễn phí, line/fill đồng bộ,
dùng bằng class nên không cần import từng icon), font Be Vietnam Pro (dấu tiếng Việt đẹp).
**Hệ quả:** Class dài trong JSX; giảm bằng component dùng chung (`Button`, `StatusBadge`) và class `.card`, `.input`.

## ADR-FE-02: i18n tự viết thay vì react-i18next
**Bối cảnh:** 2 ngôn ngữ, ~200 chuỗi, không cần plural phức tạp hay tải bản dịch từ server.
**Quyết định:** Context + từ điển TypeScript. Key và độ đầy đủ bản dịch được kiểm tra lúc biên dịch.
**Xem lại khi:** cần thêm ngôn ngữ, quy tắc số nhiều, hoặc nhóm dịch thuật làm việc qua file JSON → chuyển react-i18next.

## ADR-FE-03: ~~Hook `useAsync` thay vì TanStack Query~~ (thay bởi ADR-FE-07)
**Quyết định:** Hook nhỏ (loading/error/data/reload + bỏ kết quả request cũ) để hiểu rõ cơ chế.
**Xem lại khi:** cần cache giữa các trang, tự refetch khi focus, retry → TanStack Query (stretch tuần 4).

## ADR-FE-04: ~~Mock data trong trình duyệt + Vite proxy~~ (thay bởi ADR-FE-05)
**Bối cảnh:** FE làm trước khi có API tuần 3; muốn demo không phụ thuộc backend.
**Quyết định:** Interface `EventsApi` với bản mock (mô phỏng rule backend) và bản HTTP, chọn bằng `VITE_USE_MOCK`.
Khi dùng API thật, Vite proxy `/api` → `:8080` nên không cần CORS lúc dev.
**Hệ quả:** Phải giữ mock khớp rule backend. Production (tuần 4) cần reverse proxy (Nginx) hoặc cấu hình CORS.

## ADR-013: Hạng vé (ticket_type) do organizer định nghĩa thay cho VIP/STANDARD
**Bối cảnh:** Tuần 1–2 cố định 2 hạng, VIP = 1.5x. Thực tế mỗi sự kiện có số hạng, giá, màu, giới hạn riêng; có cả vé không số ghế.
**Quyết định:** Bảng `ticket_type` (giá, quota, maxPerOrder, dải hàng). RESERVED: ghế thuộc hạng theo dải hàng; GA: chỉ quota.
**Hệ quả:** Migration expand → migrate → contract ở tuần 3 (V4, V5). `VipSeat`/`PricingStrategy` tuần 1 vẫn giữ làm bài học OOP.

## ADR-014: Thanh toán bằng VietQR + webhook ngân hàng
**Bối cảnh:** Ở Việt Nam, chuyển khoản QR phổ biến hơn thẻ; dịch vụ như SePay/Casso gọi webhook khi tài khoản nhận tiền.
**Quyết định:** Nội dung chuyển khoản = mã đơn. Webhook xác thực bằng API key, idempotent theo `transactionId`,
luôn trả 200; giao dịch không khớp lưu `UNMATCHED` để admin đối soát.
**Hệ quả:** Phải có màn hình đối soát (tuần 5). Không có hoàn tiền tự động qua ngân hàng: ghi nhận trạng thái, chuyển tay.

## ADR-015: Check-in bằng UPDATE có điều kiện, kết quả trả 200
**Quyết định:** `UPDATE ticket SET status='CHECKED_IN' WHERE code=? AND status='VALID'`; 0 dòng = đã dùng/không hợp lệ.
Kết quả nghiệp vụ (`ALREADY_CHECKED_IN`...) nằm trong body với HTTP 200 vì đó là tình huống bình thường ở cổng.

## ADR-016: 409 cho xung đột trạng thái, 422 cho vi phạm luật nghiệp vụ
**Quyết định:** 409: ghế vừa bị giữ, sai trạng thái, trùng dữ liệu (thử lại có thể thành công). 422: ngoài giờ bán, vượt giới hạn, mã giảm giá sai
(request hợp lệ về cú pháp nhưng luật không cho). FE dựa vào `errorCode`, không dựa vào status.

## ADR-FE-05: MSW thay cho mock trong code
**Bối cảnh:** Mock bằng `if (useMock)` trong tầng api làm code FE khác nhau giữa mock và thật.
**Quyết định:** MSW chặn request ở Service Worker; FE luôn gọi axios như thật. Handler mô phỏng đúng luật backend và lưu localStorage.
Nhóm handler tắt được riêng lẻ (`VITE_MOCK_EXCLUDE`) để chuyển dần sang backend.
**Hệ quả:** Handler MSW trở thành **tài liệu hợp đồng API chạy được**. Mock được tải bằng dynamic import nên không vào bundle production.

## ADR-FE-06: Lưu access token ở localStorage
**Lựa chọn:** localStorage (đơn giản, dễ hiểu) vs cookie httpOnly (an toàn hơn trước XSS, cần CSRF).
**Quyết định:** localStorage cho dự án học, token hạn ngắn. **Xem lại khi:** lên production thật → refresh token trong cookie httpOnly + SameSite.

## ADR-FE-07: axios + TanStack Query
**Quyết định:** axios cho interceptor (JWT, chuẩn hóa lỗi, 401); TanStack Query cho cache, polling (`refetchInterval` cho sơ đồ ghế 15s,
chờ thanh toán 3s), invalidate sau mutation. Thay hook `useAsync` tự viết.

---

## Mẫu ADR mới

```
## ADR-0xx: <Tiêu đề>
**Bối cảnh:**
**Lựa chọn:**
**Quyết định:**
**Hệ quả:**
```

Ứng viên tuần 3: Optimistic vs pessimistic lock · Idempotency key cho webhook · Lưu refresh token ở đâu.
