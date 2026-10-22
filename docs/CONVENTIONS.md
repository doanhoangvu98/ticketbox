# Coding Conventions

Áp dụng cho toàn bộ repo. Khi quy tắc mâu thuẫn với code cũ, sửa code cũ trong một commit `refactor` riêng.

## 1. Format

| Quy tắc | Giá trị |
|---|---|
| Thụt lề | 4 space (Java, SQL), 2 space (YAML, JSON, TS, CSS) |
| Độ dài dòng | Tối đa 120 ký tự |
| Encoding / xuống dòng | UTF-8, LF (đã cấu hình trong `.editorconfig`, `.gitattributes`) |
| Import | Không dùng wildcard `*`. Thứ tự: project → thư viện → `java.*` → static |
| Ngoặc nhọn | Luôn dùng `{}` kể cả `if` một dòng |

**IntelliJ:** Settings → Editor → Code Style → Java: tick *Enable EditorConfig support*,
đặt *Class count to use import with '\*'* = 999. Bật *Reformat code* + *Optimize imports* khi commit.

## 2. Đặt tên

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Package | chữ thường, theo feature | `com.noah.ticketbox.api.event` |
| Class | PascalCase, danh từ | `EventService`, `SeatEntity` |
| Interface | Không tiền tố `I` | `PricingStrategy`, `Repository` |
| Method | camelCase, động từ | `publish()`, `findUpcoming()` |
| Hằng số | UPPER_SNAKE | `MAX_ROWS` |
| JPA entity | hậu tố `Entity` | `EventEntity` (tránh trùng tên với domain `Event` ở core) |
| DTO | `XxxRequest`, `XxxResponse`, `XxxCriteria` | `CreateEventRequest` |
| Test | `XxxTest`, method `action_condition_expected` hoặc mô tả hành vi | `create_failsWhenVenueMissing` |
| Bảng / cột DB | snake_case, số ít | `event`, `starts_at` |
| Index / constraint | `ix_<bảng>_<cột>`, `uq_...`, `ck_...` | `ix_event_status_starts_at` |
| Migration | `V<n>__<mo_ta>.sql` | `V3__create_booking.sql` |

## 3. Java

- **Java 21.** Dùng `record` cho DTO/value object, `var` khi kiểu đã rõ ở vế phải.
- **Constructor injection** + `private final`. Không `@Autowired` trên field.
- **Không trả `null`** cho collection (trả list rỗng), dùng `Optional` cho kết quả có thể không có. Không dùng `Optional` làm field hoặc tham số.
- **Tiền:** `BigDecimal`, scale 0 (VND). So sánh bằng `compareTo`, không dùng `equals`.
- **Thời gian:** `Instant` (kỹ thuật), `OffsetDateTime` (giờ sự kiện). Inject `Clock`.
- **Exception:** nghiệp vụ dùng lớp con của `BusinessException`. Không `catch (Exception e)` rồi nuốt lỗi.
- **Stream:** dùng khi biến đổi/lọc/gom nhóm. Vòng lặp có side effect phức tạp thì dùng `for` cho dễ đọc.
- **Comment:** tiếng Anh, giải thích *vì sao*, không lặp lại *cái gì*. Javadoc cho class public và method khó.

## 4. Lombok (chỉ trong `ticketbox-api`)

| Được dùng | Không dùng |
|---|---|
| `@Getter`, `@RequiredArgsConstructor`, `@NoArgsConstructor(access = PROTECTED)`, `@Slf4j` | `@Data`, `@Setter`, `@EqualsAndHashCode`, `@ToString` trên entity, `@Builder` trên entity |

Lý do: xem ADR-007. `ticketbox-core` không dùng Lombok để thể hiện kiến thức OOP thuần.

## 5. Spring

- Mỗi feature: `XxxController`, `XxxService`, `XxxRepository`, `XxxEntity`, `dto/`.
- Service: `@Transactional(readOnly = true)` ở class, `@Transactional` ở method ghi.
- Controller trả DTO, không trả entity. Tạo mới → `201` + header `Location`.
- Validate input bằng Bean Validation trên DTO, rule nghiệp vụ trong entity/service.
- Log: `log.info` cho sự kiện nghiệp vụ (tạo/hủy), `log.debug` cho chi tiết. Không log mật khẩu, token.

## 6. REST API

- Prefix `/api/v1`, danh từ số nhiều: `/events`, `/events/{id}/seats`.
- Hành động không phải CRUD: `POST /events/{id}/publish`.
- Phân trang: `?page=0&size=20&sort=startsAt,asc`, trả `PageResponse`.
- Lỗi: ProblemDetail (RFC 7807) có `errorCode`. Xem `API.md`.

## 7. Database

- Schema chỉ thay đổi qua Flyway. **Không sửa migration đã chạy.**
- Mỗi FK có index. Mỗi query mới trên bảng lớn: kiểm tra `EXPLAIN ANALYZE`.
- Rule quan trọng có constraint ở DB (unique, check), không chỉ ở Java.
- Seed dữ liệu demo đặt trong `db/seed`, chỉ chạy ở profile `dev`.

## 8. Git

**Branch:** `main` luôn chạy được. Làm việc trên `feat/<ten>`, `fix/<ten>`, `docs/<ten>`.

**Commit (Conventional Commits):**
```
<type>(<scope>): <mô tả ngắn, tiếng Anh, thì hiện tại>

feat(event): add publish and cancel actions
fix(seat): release seats when booking is cancelled
test(booking): add 100-thread concurrency test
docs(benchmark): record N+1 before/after numbers
refactor(core): extract SeatLayout record
chore(build): bump spring boot to 3.5.x
```
Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

**Pull request:** dùng template trong `.github/pull_request_template.md`, `mvn verify` phải xanh trước khi merge.

## 9. Definition of Done

Một task chỉ coi là xong khi:
- [ ] Code theo convention, build không warning mới
- [ ] Có test cho rule mới, `mvn verify` xanh
- [ ] Swagger mô tả đúng endpoint mới
- [ ] Cập nhật `KNOWLEDGE_MAP.md` (và `DECISIONS.md` nếu có trade-off)
