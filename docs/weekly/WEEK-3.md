# Tuần 3 — Security, vai trò, vòng đời sự kiện

> Nghiệp vụ: [DOMAIN.md](../DOMAIN.md) mục 1–3 · Hợp đồng API: [API.md](../API.md) "Tuần 3" · Mock tham chiếu:
> `frontend/src/mocks/handlers/{auth,events,organizer,admin}.ts`

## 1. Mục tiêu
Có người dùng thật với 4 vai trò. Organizer tạo sự kiện với **hạng vé tự định nghĩa**, gửi duyệt; admin duyệt thì
khách mới thấy. Cuối tuần, frontend tắt mock `auth,events,organizer` và chạy với backend thật.

## 2. Học được gì

| Kiến thức | Áp dụng ở đâu | Junior+ | Middle |
|---|---|---|---|
| Spring Security filter chain | `SecurityConfig` | Cấu hình route public/private | Giải thích thứ tự filter, vì sao STATELESS + tắt CSRF cho API Bearer |
| Mật khẩu | `AuthService` | `BCryptPasswordEncoder` | Vì sao không dùng SHA-256; cost factor |
| JWT | `JwtService` | Ký HS256, `sub`=userId, `role`, `exp` 2h | Không để dữ liệu nhạy cảm trong token; xử lý khóa tài khoản khi token còn hạn (kiểm tra `status` trong filter) |
| Phân quyền | `@PreAuthorize`, `EventAccessPolicy` | Theo role | **Theo sở hữu**: organizer A không sửa được sự kiện của B (trả 404, không phải 403, để không lộ tồn tại) |
| State machine | `EventEntity.submit/approve/reject` | if/else | Bảng chuyển trạng thái giống `SeatStatus` tuần 1 |
| Thiết kế lại schema | V4 | Thêm bảng `ticket_type` | Migrate dữ liệu cũ (VIP/STANDARD → 2 ticket_type), không xóa cột ngay (expand → migrate → contract) |
| Validation chéo trường | `UpsertEventValidator` | `@AssertTrue` | Custom `ConstraintValidator` cho dải hàng không chồng nhau |
| Test bảo mật | `@WithMockUser`, MockMvc | 401/403 | Test "organizer B gọi API sự kiện của A" |

## 3. Code sẽ gồm

```
ticketbox-api/src/main/java/com/noah/ticketbox/api/
├── auth/
│   ├── SecurityConfig.java          # SecurityFilterChain, PasswordEncoder, CORS tắt (dùng Vite proxy)
│   ├── JwtService.java              # issue/parse, secret từ ticketbox.jwt.secret
│   ├── JwtAuthenticationFilter.java # OncePerRequestFilter: Bearer → SecurityContext; user LOCKED → 403
│   ├── AuthController.java          # /auth/register, /auth/login, /auth/me
│   ├── AuthService.java
│   ├── CurrentUser.java             # helper lấy userId/role từ SecurityContext
│   └── dto/ LoginRequest, RegisterRequest, AuthResponse, UserResponse
├── user/
│   ├── UserEntity.java              # email unique (lower), password_hash, role, status, organizer_name
│   ├── UserRepository.java
│   └── Role.java, UserStatus.java   # hoặc đặt trong core/domain
├── event/  (sửa)
│   ├── EventEntity.java             # + category, description, organizer, endsAt, saleStartsAt/EndsAt,
│   │                                #   seatingType, rejectReason; methods submit/approve/reject/cancel
│   ├── TicketTypeEntity.java        # name, price, color, quota, maxPerOrder, rowFrom, rowTo
│   ├── EventQueryService.java       # public: chỉ PUBLISHED/COMPLETED/CANCELLED; preview cho owner/admin
│   ├── EventMapper.java             # → EventSummary/EventDetail đúng types.ts (minPrice, soldOut, available)
│   └── PublicEventController.java   # GET /events, /events/{id}, /events/{id}/seats
├── seat/   (sửa) SeatEntity: ticketType (ManyToOne), status + BLOCKED; SeatMapGenerator theo dải hàng
├── organizer/
│   ├── OrganizerEventController.java # /organizer/events/** (@PreAuthorize("hasRole('ORGANIZER')"))
│   ├── OrganizerEventService.java    # create/update (sinh lại ghế), submit; kiểm tra sở hữu
│   └── dto/ UpsertEventRequest (+ TicketTypeRequest), validator
└── admin/
    ├── AdminEventController.java     # list/approve/reject
    └── AdminUserController.java      # list/patch (không tự sửa mình)
```

`ticketbox-core`: thêm `EventStatus.PENDING_REVIEW, REJECTED` và bảng chuyển trạng thái; `ErrorCode` mới
(`UNAUTHORIZED`, `FORBIDDEN`, `BAD_CREDENTIALS`, `ACCOUNT_LOCKED`, `EMAIL_TAKEN`, `USER_NOT_FOUND`).
`GlobalExceptionHandler`: map `AccessDeniedException` → 403, `AuthenticationException` → 401 (đúng ProblemDetail).

Dependencies: `spring-boot-starter-security`, `io.jsonwebtoken:jjwt-api/impl/jackson` (hoặc `spring-security-oauth2-resource-server` + Nimbus; ghi lựa chọn vào ADR).

## 4. Migration

| File | Nội dung |
|---|---|
| `V3__users_and_event_review.sql` | `app_user` (id, full_name, email UNIQUE, phone, password_hash, role CHECK, status CHECK, organizer_name, timestamps); `event` thêm `organizer_id FK`, `category`, `description`, `ends_at`, `sale_starts_at`, `sale_ends_at`, `seating_type`, `reject_reason`; mở rộng CHECK status |
| `V4__ticket_types.sql` | `ticket_type` (event_id FK, name, price, color, quota, max_per_order, row_from, row_to); `seat.ticket_type_id` FK + index; **chuyển dữ liệu cũ**: mỗi event tạo 2 ticket_type từ `vip_rows`/`base_price`, gán seat theo hàng; cho phép `BLOCKED` |
| `V5__drop_legacy_seat_type.sql` | Sau khi code mới chạy ổn: bỏ `seat.type`, `event.base_price`, `event.vip_rows` (bước *contract*) |
| `db/seed/V3_1__seed_users.sql` | 4 tài khoản demo giống mock, mật khẩu `123456` đã BCrypt; gán organizer cho event seed; 1 staff |

## 5. Test bắt buộc
- `AuthControllerTest`: register 201 / email trùng 409 / login sai 401 / tài khoản khóa 403.
- `JwtServiceTest`: token hết hạn bị từ chối, sửa payload bị từ chối.
- `OrganizerEventServiceTest` (Mockito): dải hàng chồng nhau → 400; sửa khi PUBLISHED → 409; organizer khác → 404.
- `SecurityIntegrationTest` (`@SpringBootTest` + MockMvc): `/admin/**` với token CUSTOMER → 403; không token → 401.
- Migration V4 trên dữ liệu seed: số ghế không đổi, mỗi ghế có ticket_type.

## 6. Definition of Done
- [ ] FE chạy với `VITE_MOCK_EXCLUDE=auth,events,organizer` (+ admin nếu đã làm tuần này): đăng nhập 4 vai trò, organizer tạo → gửi duyệt, admin duyệt, khách thấy sự kiện.
- [ ] Response khớp `types.ts` (kiểm tra bằng tay trong DevTools Network hoặc test JSON).
- [ ] `mvn verify` xanh; `DECISIONS.md` có ADR về JWT library, 404 vs 403, expand/contract migration.
- [ ] `KNOWLEDGE_MAP.md`, `PROGRESS.md` cập nhật; tag `w3-done`.

## 7. Demo (10 phút)
1. Swagger: login CUSTOMER → gọi `/admin/users` → 403. Login ADMIN → 200.
2. FE: organizer tạo sự kiện 3 hạng vé, xem trước sơ đồ màu → gửi duyệt → admin từ chối kèm lý do → organizer sửa → admin duyệt.
3. Organizer B gọi `PUT /organizer/events/{id của A}` → 404, giải thích lý do.
4. Mở `V4__ticket_types.sql`: dữ liệu cũ được chuyển, không mất ghế.

## 8. Câu hỏi mentor hay hỏi
- *JWT khác session thế nào? Logout với JWT làm sao?* → Stateless; logout = xóa ở client, muốn thu hồi ngay cần denylist/hạn ngắn + refresh token.
- *Vì sao trả 404 thay vì 403 khi truy cập tài nguyên của người khác?* → Không tiết lộ tài nguyên tồn tại.
- *Đổi schema đang có dữ liệu thế nào cho an toàn?* → Expand → migrate → contract, mỗi bước một migration.
