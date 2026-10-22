# Knowledge Map: kiến thức → chỗ áp dụng trong code

Dùng khi demo: mentor hỏi kiến thức nào, mở đúng file đó.
`core/` = `backend/ticketbox-core/src/main/java/com/noah/ticketbox/core/`
`api/` = `backend/ticketbox-api/src/main/java/com/noah/ticketbox/api/`

## Tuần 1: Java Core

| Kiến thức | File | Điểm cần chỉ |
|---|---|---|
| Class, object, encapsulation | `core/domain/Seat.java` | Field `private`, chỉ đổi trạng thái qua `hold/sell/release` |
| Inheritance + polymorphism | `core/domain/StandardSeat.java`, `VipSeat.java` | Cùng gọi `price()`, mỗi lớp tính khác |
| Abstract class | `core/domain/Seat.java` | `abstract price()`, `abstract type()` |
| Sealed class (Java 17) | `core/domain/Seat.java`, `core/common/Result.java` | `sealed ... permits` giới hạn lớp con |
| Interface | `core/repository/Repository.java` | Service phụ thuộc interface, không phụ thuộc `InMemoryRepository` |
| Enum có logic | `core/domain/SeatStatus.java` | State machine `canTransitionTo` dùng `EnumMap` + `EnumSet` |
| Record + compact constructor | `core/domain/SeatPosition.java`, `SeatLayout.java` | Validate trong compact constructor |
| `equals/hashCode` | `core/domain/Seat.java`, `SeatPosition.java` | Seat bằng nhau theo vị trí; record tự sinh |
| `Comparable` / `Comparator` | `core/domain/SeatPosition.java` | `comparing(...).thenComparingInt(...)` |
| Generics | `core/repository/Repository.java` | `<T extends Identifiable<ID>, ID>` (bounded type) |
| Generic method | `core/service/BookingService.java` | `<T> T withEventLock(Long, Supplier<T>)` |
| Generic sealed type | `core/common/Result.java` | `Result<T>`, `map`, `fold` |
| Collections | `core/domain/Event.java` | `TreeMap` giữ thứ tự ghế, `List.copyOf` |
| `ConcurrentHashMap` | `core/repository/InMemoryRepository.java` | Thread-safe từng thao tác |
| Lambda | `core/pricing/PricingStrategy.java` | `seat -> ...`, `Seat::price` |
| Functional interface | `core/pricing/PricingStrategy.java` | `@FunctionalInterface`, default method `andThen` |
| Higher-order function | `core/pricing/PricingStrategy.java` | `withDiscountPercent` trả về strategy mới |
| `Predicate` ghép | `core/service/EventService.java` | `byStatus(...).and(e -> ...)` |
| `Supplier` | `core/service/BookingService.java` | `withEventLock(id, () -> {...})` |
| Stream cơ bản | `core/service/BookingService.java` | `map`, `filter`, `reduce` tính tổng tiền |
| Stream `flatMap` | `core/domain/SeatMapFactory.java` | `IntStream` lồng nhau thay 2 vòng for |
| Collectors nâng cao | `core/service/ReportService.java` | `groupingBy`, `counting`, `partitioningBy`, `reducing`, `toMap` + `LinkedHashMap` |
| `Optional` | `core/service/EventService.java`, `BookingService.java` | `orElseThrow`, `filter`, `Optional::stream` |
| Custom exception + phân cấp | `core/exception/` | `BusinessException` → các lớp con, `ErrorCode` |
| Date/Time API + `Clock` | `core/service/BookingService.java` | `clock.instant()`, `Duration`; test dùng `MutableClock` |
| Multithreading | `core/service/BookingService.java` | `ReentrantLock` + `try/finally` |
| `ExecutorService`, `CountDownLatch`, `AtomicInteger` | `test/.../BookingConcurrencyTest.java` | 100 thread xuất phát cùng lúc |
| `AtomicLong` (CAS) | `core/common/IdGenerator.java` | Sinh id không cần lock |
| Builder pattern | `core/domain/Event.java` | `Event.builder()...build()` |
| Factory pattern | `core/domain/SeatMapFactory.java` | Quyết định tạo `VipSeat` hay `StandardSeat` |
| Strategy pattern | `core/pricing/PricingStrategy.java` | Đổi cách tính giá không sửa service |
| Dependency Injection (thủ công) | `core/demo/Week1DemoApp.java` | Tự `new` và truyền qua constructor |
| Unit test JUnit 5 | `test/.../BookingServiceTest.java` | `@Nested`, `@BeforeEach`, AssertJ |

## Tuần 2: Spring Boot + Database

| Kiến thức | File | Điểm cần chỉ |
|---|---|---|
| Spring Boot app | `api/TicketboxApiApplication.java` | `@SpringBootApplication` |
| IoC / DI | `api/event/EventService.java` | Constructor injection qua `@RequiredArgsConstructor` |
| `@Configuration` + `@Bean` | `api/common/config/CoreBeansConfig.java` | Đăng ký class của core (không có annotation) thành bean |
| REST controller | `api/event/EventController.java` | `@GetMapping`, `@PostMapping`, `201` + `Location` |
| Bean Validation (JSR 380) | `api/event/dto/CreateEventRequest.java` | `@NotBlank`, `@Future`, `@DecimalMin` trên record |
| Xử lý lỗi tập trung | `api/common/web/GlobalExceptionHandler.java` | `@RestControllerAdvice`, `ProblemDetail`, switch expression |
| DTO vs Entity | `api/event/dto/`, `EventMapper.java` | Không lộ entity ra API |
| JPA entity | `api/event/EventEntity.java` | `@Entity`, `@ManyToOne(LAZY)`, `@Enumerated(STRING)` |
| `@MappedSuperclass`, lifecycle callback | `api/common/persistence/BaseEntity.java` | `@PrePersist`, `@PreUpdate` |
| Optimistic lock (chuẩn bị) | `api/event/EventEntity.java` | `@Version` |
| ID SEQUENCE + batch | `api/seat/SeatEntity.java` | `allocationSize = 50` |
| Spring Data derived query | `api/seat/SeatRepository.java` | `findByEventIdAndStatusOrderBy...` |
| JPQL + projection | `api/seat/SeatRepository.java` | `@Query` + `SeatStatusCount` |
| Specification (dynamic query) | `api/event/EventSpecifications.java` | Lambda + `Specification.allOf` |
| Phân trang | `api/event/EventController.java`, `common/web/PageResponse.java` | `Pageable`, `PageResponse<T>` |
| N+1 và cách sửa | `api/event/EventRepository.java` | `@EntityGraph(attributePaths = "venue")` |
| Transaction | `api/event/EventService.java` | `readOnly` mặc định, dirty checking |
| JDBC / SQL thuần | `api/report/RevenueReportRepository.java` | `NamedParameterJdbcTemplate`, `RowMapper` lambda, `FILTER` |
| Flyway | `resources/db/migration/` | Version, không sửa file cũ |
| Index | `resources/db/migration/V2__add_query_indexes.sql` | Composite + partial index |
| Constraint DB | `resources/db/migration/V1__init_schema.sql` | `UNIQUE`, `CHECK` |
| Profile | `resources/application-dev.yml` | Seed + log SQL chỉ ở dev |
| Mockito | `test/.../EventServiceTest.java` | `@Mock`, `when`, `verify`, `ArgumentCaptor` |
| Web slice test | `test/.../EventControllerTest.java` | `@WebMvcTest`, `@MockitoBean`, `jsonPath` |
| Swagger / OpenAPI | `api/common/config/OpenApiConfig.java` | `@Tag`, `@Operation`, `@Schema(example)` |

## Tuần 3, 4
_(cập nhật khi làm)_

## Frontend

`fe/` = `frontend/src/`

| Kiến thức | File | Điểm cần chỉ |
|---|---|---|
| Hợp đồng API có kiểu | `fe/lib/types.ts` | Khớp DTO backend, một nguồn sự thật |
| axios interceptor | `fe/lib/api.ts` | Gắn JWT, chuẩn hóa ProblemDetail → `ApiError`, bắt 401 |
| TanStack Query | `fe/features/events/api.ts`, `booking/api.ts` | Query keys, `placeholderData`, `refetchInterval`, `setQueryData` sau mutation |
| Polling chờ thanh toán | `fe/features/booking/api.ts` (`useOrder`) | Poll 3s chỉ khi PENDING |
| MSW | `fe/mocks/browser.ts`, `handlers/*` | Mock ở tầng mạng, bật/tắt từng nhóm |
| Luật nghiệp vụ phía mock | `fe/mocks/handlers/orders.ts` | 7 bước kiểm tra khi giữ chỗ (giống backend tuần 4) |
| Idempotent webhook | `fe/mocks/handlers/payments.ts` | Bỏ qua `transactionId` trùng, luôn 200 |
| Route guard theo vai trò | `fe/features/auth/RequireRole.tsx`, `app/router.tsx` | 401 → login?redirect, sai role → 403 |
| Context | `fe/features/auth/AuthProvider.tsx` | Lưu user, đăng xuất khi 401, xóa cache |
| Template literal type | `fe/i18n/I18nProvider.tsx` | `Path<T>` sinh mọi key i18n hợp lệ |
| Xử lý 409 trên UI | `fe/features/booking/pages/SelectTicketsPage.tsx` | Bỏ chọn ghế, sơ đồ tự làm mới |
| VietQR | `fe/lib/vietqr.ts`, `booking/pages/CheckoutPage.tsx` | URL quick link, nội dung = mã đơn |
| Camera API | `fe/features/staff/QrScanner.tsx` | `getUserMedia` + `BarcodeDetector`, dọn stream khi unmount |
| Responsive | `fe/features/admin/pages/*`, `DashboardLayout.tsx` | Bảng cuộn ngang, sidebar → drawer |
