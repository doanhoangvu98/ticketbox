# Tuần 5 ⭐ — Vận hành: check-in, hoàn tiền, đối soát, báo cáo

> Nghiệp vụ: [DOMAIN.md](../DOMAIN.md) mục 5–8 · API: [API.md](../API.md) "Tuần 5" ·
> Mock: `frontend/src/mocks/handlers/{staff,admin,organizer}.ts`

## 1. Mục tiêu
Những việc xảy ra **sau** khi bán vé: soát vé ở cổng, khách đổi ý, tiền chuyển sai, ban tổ chức xem doanh thu.
Cuối tuần tắt hẳn mock: `VITE_USE_MOCK=false`.

## 2. Học được gì

| Kiến thức | Áp dụng | Junior+ | Middle |
|---|---|---|---|
| UPDATE có điều kiện | `CheckInService` | `@Modifying @Query("update ... where code=:c and status='VALID'")` | Vì sao nhanh và đúng hơn đọc → kiểm tra → ghi; không cần lock |
| Xác minh chữ ký | `TicketQrSigner.verify` | So HMAC | Chặn mã giả trước khi chạm DB; constant-time compare |
| Nghiệp vụ tiền | `RefundService`, `ReconciliationService` | Trạng thái REFUND_REQUESTED/REFUNDED | Không bao giờ xóa giao dịch; mọi thay đổi có `note`/audit |
| Thao tác hàng loạt | Hủy sự kiện hoàn mọi đơn | Vòng lặp | 1 câu `UPDATE ... WHERE event_id = ?` + lý do batch; vì sao không gọi từng entity |
| SQL báo cáo | `ReportRepository` | GROUP BY | `date_trunc('day')`, `generate_series` để có ngày 0 doanh thu, `FILTER` |
| Phân công | `staff_assignment` | Bảng nối | Index cho truy vấn quyền |
| ⭐ Outbox | Gửi email vé | — | Ghi `outbox_event` cùng transaction, job gửi sau |

## 3. Code sẽ gồm
```
api/
├── checkin/  StaffController (/staff/**), CheckInService, StaffAssignmentEntity/Repository, dto CheckInResult
├── order/    + RefundService (request/approve/reject), cancel sự kiện → hoàn 100% (OrganizerEventService.cancel)
├── reconciliation/ AdminBankTransactionController, ReconciliationService (match/refund)
├── promo/    PromoCodeEntity/Repository, OrganizerPromoController; OrderPricing dùng mã; tăng `used` khi PAID
├── report/   OrganizerDashboardQuery, EventStatsQuery, AdminDashboardQuery (JdbcTemplate, khớp types.ts)
└── admin/    AdminOrderController (list, refund approve/reject), AdminDashboardController
```

## 4. Migration
| File | Nội dung |
|---|---|
| `V8__checkin_refund.sql` | `staff_assignment(staff_id, event_id) PK`; `ticket` index `(event_id, status)`; `customer_order.refund_reason, refund_amount` |
| `V9__report_indexes.sql` | Index cho `customer_order(event_id, status, paid_at)` phục vụ báo cáo; đo `EXPLAIN` trước/sau |

## 5. Test bắt buộc
- `CheckInConcurrencyIT`: 2 thread quét cùng vé → 1 `OK`, 1 `ALREADY_CHECKED_IN`.
- `CheckInServiceTest`: 5 kết quả; staff không được phân công → 403.
- `RefundServiceTest`: quá hạn 7 ngày → 422; đã check-in → 409; duyệt → ghế trả lại; từ chối → vé VALID.
- `ReconciliationServiceTest`: ghép khi ghế đã bán cho người khác → 409.
- Báo cáo: so số liệu SQL với tính tay trên dữ liệu seed nhỏ.

## 6. Definition of Done
- [ ] `VITE_USE_MOCK=false`, toàn bộ luồng 4 vai trò chạy với backend.
- [ ] Quét QR bằng camera điện thoại (mở FE qua IP LAN) check-in thành công.
- [ ] `DECISIONS.md`: UPDATE có điều kiện vs lock; vì sao kết quả check-in trả 200.
- [ ] Tag `w5-done`.

## 7. Câu hỏi mentor
- *Hai cổng cùng quét một vé?* → UPDATE có điều kiện, DB đảm bảo chỉ 1 dòng đổi.
- *Khách chuyển tiền sau khi đơn hết hạn?* → Không tự xử lý; ghi UNMATCHED, người kiểm tra và ghép/trả tiền. Tiền là chỗ không tự động hóa khi không chắc.
