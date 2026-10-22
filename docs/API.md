# API

Base URL `/api/v1` · Swagger `http://localhost:8080/swagger-ui.html`

## 0. Hợp đồng API = mock MSW

Frontend đã chạy đầy đủ với mock (`frontend/src/mocks/handlers/*`). **Mock chính là bản hợp đồng**:
khi làm một endpoint ở backend, trả về đúng shape trong `frontend/src/lib/types.ts` và đúng mã lỗi ở bảng mục 3,
rồi tắt nhóm mock tương ứng bằng `VITE_MOCK_EXCLUDE`. Không cần sửa code FE.

| Nhóm mock | File | Backend làm ở |
|---|---|---|
| `events` | `handlers/events.ts` | Tuần 2 (đã có, cần nâng shape ở tuần 3) |
| `auth`, `organizer`, `admin` (phần duyệt sự kiện, user) | `auth.ts`, `organizer.ts`, `admin.ts` | Tuần 3 |
| `orders`, `payments` | `orders.ts`, `payments.ts` | Tuần 4 |
| `staff`, `admin` (hoàn tiền, đối soát), promo | `staff.ts`, `admin.ts`, `organizer.ts` | Tuần 5 |

Xác thực: header `Authorization: Bearer <JWT>`. Webhook ngân hàng dùng `X-Api-Key`.

## 1. Endpoint

### Đã có (tuần 2)
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/venues` | |
| GET | `/events` | Tuần 3: đổi response sang `EventSummary` mới (category, city, minPrice, seatingType, soldOut) |
| GET | `/events/{id}` | Tuần 3: thêm ticketTypes, organizer, sale window |
| GET | `/events/{id}/seats` | Tuần 3: `type` → `ticketTypeId`, thêm `BLOCKED` |
| POST | `/events`, `/events/{id}/publish`, `/events/{id}/cancel`, PUT `/events/{id}` | Tuần 3: chuyển thành `/organizer/events/*` + duyệt admin |
| GET | `/reports/revenue` | Tuần 5: thay bằng `/organizer/events/{id}/stats`, `/admin/dashboard` |

### Tuần 3 — Auth, organizer, duyệt sự kiện
| Method | Path | Role | Kết quả |
|---|---|---|---|
| POST | `/auth/register` | public | 201 `AuthResponse` · 409 `EMAIL_TAKEN` |
| POST | `/auth/login` | public | `AuthResponse` · 401 `BAD_CREDENTIALS` · 403 `ACCOUNT_LOCKED` |
| GET | `/auth/me` | any | `User` |
| GET | `/organizer/events?status&page` | ORGANIZER | `Page<EventDetail>` (chỉ của mình) |
| POST | `/organizer/events` | ORGANIZER | 201 `EventDetail` (DRAFT, sinh sơ đồ ghế) |
| PUT | `/organizer/events/{id}` | ORGANIZER | chỉ DRAFT/REJECTED, sinh lại sơ đồ |
| POST | `/organizer/events/{id}/submit` | ORGANIZER | → PENDING_REVIEW |
| GET | `/admin/events?status&page` | ADMIN | `Page<EventDetail>` |
| POST | `/admin/events/{id}/approve` | ADMIN | → PUBLISHED |
| POST | `/admin/events/{id}/reject` `{reason}` | ADMIN | → REJECTED |
| GET | `/admin/users?role&keyword&page` | ADMIN | `Page<User>` |
| PATCH | `/admin/users/{id}` `{role?, status?}` | ADMIN | không tự sửa mình (409) |

### Tuần 4 — Đặt vé, thanh toán
| Method | Path | Role | Kết quả |
|---|---|---|---|
| POST | `/orders` `{eventId, seatCodes?, items?}` | CUSTOMER | 201 `Order` PENDING · lỗi mục 3 |
| GET | `/orders/{code}` | owner | `Order` (FE poll 3s khi chờ tiền) |
| POST | `/orders/{code}/promo` `{code}` | owner | `Order` tính lại tiền; `code=""` để gỡ |
| POST | `/orders/{code}/checkout` `{fullName,email,phone}` | owner | `PaymentInstruction` (VietQR) |
| POST | `/orders/{code}/cancel` | owner | `Order` CANCELLED, nhả ghế |
| GET | `/me/orders` | any | `Order[]` |
| GET | `/me/tickets` | any | `Ticket[]` |
| POST | `/payments/webhook/bank` | `X-Api-Key` | `{success:true}` luôn 200 (idempotent) |

### Tuần 5 — Vận hành
| Method | Path | Role | Kết quả |
|---|---|---|---|
| POST | `/orders/{code}/refund-request` `{reason}` | owner | → REFUND_REQUESTED · 422 `REFUND_WINDOW_CLOSED` |
| POST | `/organizer/events/{id}/cancel` | ORGANIZER | → CANCELLED + hoàn 100% |
| GET | `/organizer/dashboard` | ORGANIZER | `OrganizerDashboard` |
| GET | `/organizer/events/{id}/stats` | ORGANIZER | `EventStats` |
| GET | `/organizer/events/{id}/orders?page` | ORGANIZER | `Page<Order>` |
| GET/POST | `/organizer/events/{id}/promo-codes` | ORGANIZER | `PromoCode[]` / 201 · 409 `PROMO_EXISTS` |
| DELETE | `/organizer/promo-codes/{id}` | ORGANIZER | 204 |
| GET | `/staff/events` | STAFF, ADMIN | sự kiện được phân công |
| GET | `/staff/events/{id}/stats` | STAFF, ADMIN | `CheckInStats` |
| POST | `/staff/check-ins` `{eventId, qrToken}` | STAFF, ADMIN | `CheckInResult` (luôn 200) · 403 nếu không được phân công |
| GET | `/admin/dashboard` | ADMIN | `AdminDashboard` |
| GET | `/admin/orders?status&keyword&page` | ADMIN | `Page<Order>` |
| POST | `/admin/orders/{code}/refund/approve` · `/reject` | ADMIN | `Order` |
| GET | `/admin/bank-transactions?status&page` | ADMIN | `Page<BankTransaction>` |
| POST | `/admin/bank-transactions/{id}/match` `{orderCode}` | ADMIN | ghép tay → PAID · 409 nếu ghế đã bán |
| POST | `/admin/bank-transactions/{id}/refund` | ADMIN | đánh dấu đã trả lại tiền |

Chỉ có ở mock (không làm ở backend): `POST /__dev/reset`, `GET /__dev/tickets`.

## 2. Format lỗi (RFC 7807 ProblemDetail)

```json
{
  "type": "https://ticketbox.dev/errors/seat-not-available",
  "status": 409,
  "detail": "Ghế vừa có người khác giữ: B5, B6",
  "errorCode": "SEAT_NOT_AVAILABLE",
  "errors": [{ "field": "email", "message": "must be a well-formed email address" }],
  "timestamp": "2026-10-20T07:00:00Z"
}
```
FE đọc `errorCode` và `errors[]` (hiển thị dưới từng ô nhập), không parse `detail`.

## 3. Mã lỗi

| errorCode | HTTP | Khi nào |
|---|---|---|
| `INVALID_ARGUMENT` | 400 | Validation; `errors[]` có field |
| `UNAUTHORIZED`, `BAD_CREDENTIALS` | 401 | Thiếu/sai token, sai mật khẩu |
| `FORBIDDEN`, `ACCOUNT_LOCKED` | 403 | Sai role / không sở hữu / bị khóa |
| `*_NOT_FOUND` | 404 | `EVENT_`, `VENUE_`, `SEAT_`, `ORDER_`, `USER_`, `TICKET_TYPE_`, `PROMO_` |
| `INVALID_STATE` | 409 | Sai trạng thái, xung đột `@Version` |
| `SEAT_NOT_AVAILABLE`, `SOLD_OUT` | 409 | Tranh chấp ghế / hết quota |
| `EMAIL_TAKEN`, `PROMO_EXISTS` | 409 | Trùng dữ liệu |
| `ORDER_EXPIRED` | 410 | Thanh toán đơn đã hết hạn |
| `SALE_NOT_OPEN`, `SALE_CLOSED`, `LIMIT_EXCEEDED`, `PURCHASE_LIMIT`, `PROMO_INVALID`, `PROMO_EXHAUSTED`, `REFUND_WINDOW_CLOSED`, `AMOUNT_MISMATCH` | 422 | Vi phạm quy tắc nghiệp vụ |

`422` dùng cho "request đúng cú pháp nhưng vi phạm luật nghiệp vụ", `409` cho "xung đột với trạng thái hiện tại". Xem ADR-016.

## 4. Kiểu dữ liệu

Định nghĩa đầy đủ: [`frontend/src/lib/types.ts`](../frontend/src/lib/types.ts). Tóm tắt:

```ts
User { id, fullName, email, phone?, role, status, organizerName?, createdAt }
EventSummary { id, name, category, city, venueName, startsAt, minPrice, status, seatingType, soldOut }
EventDetail extends EventSummary { description, endsAt, saleStartsAt, saleEndsAt, organizer{id,name}, venue, ticketTypes[], rejectReason? }
TicketType { id, name, price, color, quota, sold, available, maxPerOrder, rowFrom?, rowTo? }
Seat { code, row, number, ticketTypeId, status: AVAILABLE|HELD|SOLD|BLOCKED }
Order { code, userId, eventId, eventName, eventStartsAt, venueName, status, items[], subtotal, discount, serviceFee, total,
        promoCode?, buyer?, expiresAt, paidAt?, refundReason?, refundAmount?, createdAt, tickets[] }
PaymentInstruction { orderCode, amount, bankId, accountNo, accountName, transferContent, qrImageUrl, expiresAt }
Ticket { code, qrToken, orderCode, eventId, eventName, eventStartsAt, venueName, ticketTypeName, seatCode?, holderName, status, checkedInAt? }
CheckInResult { result: OK|ALREADY_CHECKED_IN|INVALID|WRONG_EVENT|NOT_VALID, ticket?, checkedInAt? }
```
