# Tuần 4 — Đặt vé & thanh toán VietQR

> Nghiệp vụ: [DOMAIN.md](../DOMAIN.md) mục 4–6 · API: [API.md](../API.md) "Tuần 4" ·
> Mock tham chiếu: `frontend/src/mocks/handlers/{orders,payments}.ts` (logic gần như 1:1 với backend cần viết)

## 1. Mục tiêu
Khách mua vé thật từ đầu đến cuối trên FE với backend thật: giữ chỗ 10 phút → quét VietQR → webhook ngân hàng
→ vé QR. **Không bao giờ bán trùng ghế, không bao giờ ghi nhận tiền 2 lần.**

## 2. Học được gì

| Kiến thức | Áp dụng ở đâu | Junior+ | Middle |
|---|---|---|---|
| Transaction boundary | `OrderService.create` | `@Transactional` bao cả kiểm tra + giữ ghế | Giải thích vì sao kiểm tra availability phải cùng transaction với update |
| Optimistic lock | `SeatEntity.@Version` | Bắt `ObjectOptimisticLockingFailureException` → 409 | So sánh với pessimistic (`@Lock(PESSIMISTIC_WRITE)` / `SELECT ... FOR UPDATE SKIP LOCKED`), đo bằng script, ghi ADR |
| Quota GA (không có ghế) | `TicketTypeEntity` | Kiểm tra `sold + held < quota` | **Lost update**: dùng `UPDATE ticket_type SET held = held + :n WHERE id=:id AND sold + held + :n <= quota` (atomic, kiểm tra số dòng) |
| Isolation | — | Mặc định READ COMMITTED | Vì sao READ COMMITTED + điều kiện trong UPDATE đủ, không cần SERIALIZABLE |
| Scheduling | `HoldExpiryJob` | `@Scheduled(fixedDelay = 30s)` | Chạy nhiều instance → ShedLock hoặc `FOR UPDATE SKIP LOCKED`; lazy expiry |
| Idempotency | `PaymentWebhookService` | Unique `transaction_id` | Bắt `DataIntegrityViolationException` thay vì "check rồi insert" (race) |
| Webhook security | `BankWebhookController` | So khớp `X-Api-Key` | So sánh hằng thời gian (`MessageDigest.isEqual`), không log secret |
| Sinh mã | `OrderCodeGenerator`, `TicketQrSigner` | `SecureRandom` | HMAC-SHA256 cho qrToken, xoay khóa |
| Polling | FE `useOrder(code, true)` | Poll 3s | ⭐ SSE `/orders/{code}/events` |

## 3. Code sẽ gồm

```
api/
├── order/
│   ├── OrderEntity.java           # code UNIQUE, user, event, status, money fields, buyer_*, expires_at, paid_at, promo
│   ├── OrderItemEntity.java       # ticket_type, seat (nullable), price
│   ├── OrderController.java       # POST /orders, GET /orders/{code}, /promo, /checkout, /cancel; /me/orders
│   ├── OrderService.java          # luật ở DOMAIN mục 4, đúng thứ tự kiểm tra
│   ├── OrderPricing.java          # subtotal/discount/serviceFee (dùng lại PricingStrategy ý tưởng tuần 1)
│   ├── OrderCodeGenerator.java    # "TBX" + 6 ký tự, SecureRandom, retry khi trùng
│   ├── HoldExpiryJob.java         # @Scheduled: PENDING quá hạn → EXPIRED, nhả ghế / held
│   └── dto/ CreateOrderRequest, OrderResponse, BuyerRequest
├── payment/
│   ├── BankWebhookController.java # POST /payments/webhook/bank, permitAll + X-Api-Key
│   ├── PaymentWebhookService.java # parse mã đơn bằng regex, các tình huống ở DOMAIN mục 5
│   ├── BankTransactionEntity.java # transaction_id UNIQUE, amount, content, status, order_code, note
│   ├── PaymentInstructionFactory.java # VietQR URL (img.vietqr.io) từ ticketbox.bank.*
│   └── BankProperties.java        # @ConfigurationProperties
└── ticket/
    ├── TicketEntity.java          # code UNIQUE, qr_token, order, seat, holder, status, checked_in_at
    ├── TicketIssuer.java          # phát vé khi PAID
    ├── TicketQrSigner.java        # HMAC-SHA256
    └── MyTicketController.java    # GET /me/tickets
```
Cấu hình mới (`application.yml`): `ticketbox.booking.hold-minutes`, `max-tickets-per-order`, `service-fee-per-ticket`;
`ticketbox.bank.{id,account-no,account-name,webhook-api-key}`; `ticketbox.ticket.qr-secret`. Secret lấy từ biến môi trường.

## 4. Migration
| File | Nội dung |
|---|---|
| `V6__orders.sql` | `customer_order` (tránh từ khóa `order`), `order_item`, `ticket_type.held`, `seat.held_by_order_id`, index `(user_id, event_id, status)` |
| `V7__payments_tickets.sql` | `bank_transaction` (UNIQUE `transaction_id`), `ticket` (UNIQUE `code`, `qr_token`), `promo_code` (UNIQUE `(event_id, code)`) |

## 5. Test bắt buộc
- `OrderServiceTest` (Mockito): từng luật ở bảng DOMAIN mục 4 có 1 test.
- `OrderConcurrencyIT` (`@SpringBootTest`, DB thật): 50 thread cùng giữ 1 ghế → đúng 1 thành công, 49 nhận 409; GA quota 10 với 30 người → bán đúng 10.
- `PaymentWebhookServiceTest`: 6 tình huống ở DOMAIN mục 5; gửi lặp → không tạo vé lần 2.
- `HoldExpiryJobTest` với `Clock` giả.
- Script `scripts/race.sh` (curl song song) để demo qua HTTP.

## 6. Definition of Done
- [ ] FE chạy với `VITE_MOCK_EXCLUDE=auth,events,organizer,orders,payments`: mua vé RESERVED và GA. Nút "giả lập nhận tiền" ở FE gửi header `X-Api-Key: mock-bank-key`, nên profile `dev` đặt `ticketbox.bank.webhook-api-key=mock-bank-key`.
- [ ] `DECISIONS.md`: optimistic vs pessimistic (có số đo), idempotency, polling vs SSE.
- [ ] `BENCHMARK.md`: kết quả race test.
- [ ] Tag `w4-done`. **Đây là mốc MVP.**

## 7. Demo
1. Chạy `race.sh`: 50 request → 1 × 201, 49 × 409.
2. FE 2 trình duyệt cùng chọn 1 ghế, một bên nhận toast "Ghế vừa có người khác giữ", sơ đồ tự làm mới.
3. Checkout → VietQR (ảnh QR thật, quét được nhưng **không chuyển**) → bấm giả lập → trang tự chuyển sang vé.
4. Gửi lại cùng webhook 3 lần: chỉ 1 bộ vé; mở bảng `bank_transaction`.
5. Đợi hết hạn (đặt `hold-minutes=1` ở profile dev) → ghế tự nhả.

## 8. Câu hỏi mentor
- *Vì sao không dùng `synchronized` như tuần 1?* → Nhiều instance; khóa phải ở DB.
- *Optimistic hay pessimistic cho bán vé?* → Tùy mức tranh chấp; concert hot nên pessimistic `SKIP LOCKED` hoặc hàng đợi; sự kiện thường optimistic đủ.
- *Webhook đến trước khi FE gọi checkout thì sao?* → Không phụ thuộc thứ tự: webhook chỉ cần mã đơn PENDING còn hạn.
