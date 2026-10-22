# Chiến lược test

## Kim tự tháp test

| Tầng | Công cụ | Ở đâu | Tốc độ | Kiểm tra gì |
|---|---|---|---|---|
| Unit (domain) | JUnit 5 + AssertJ | `ticketbox-core` | ms | Rule nghiệp vụ, concurrency |
| Unit (service) | Mockito | `ticketbox-api` | ms | Luồng use case, gọi đúng repository |
| Web slice | `@WebMvcTest` + MockMvc | `ticketbox-api` | ~1s | HTTP status, JSON, validation, format lỗi |
| Integration ⭐ | Testcontainers (tuần 4) | `ticketbox-api` | giây | Query thật, migration, locking DB |

Nhiều test nhanh ở dưới, ít test chậm ở trên.

## Quy ước

- Cấu trúc **Arrange / Act / Assert**, cách nhau một dòng trống.
- Mỗi test kiểm tra **một hành vi**. Tên test mô tả hành vi.
- Không `Thread.sleep` cho logic thời gian: inject `Clock`, dùng `MutableClock.advance()`.
- Test concurrency dùng `CountDownLatch` làm "vạch xuất phát" để các thread chạy cùng lúc.
- Dùng AssertJ (`assertThat(...).isEqualTo`) thay vì `assertEquals` để thông báo lỗi dễ đọc.
- Tiền: `isEqualByComparingTo("150000")` (vì `150000` và `150000.00` không `equals`).

## Chạy test

```bash
cd backend
mvn verify                                      # tất cả
mvn -pl ticketbox-core test                     # chỉ core
mvn -pl ticketbox-core test -Dtest=BookingConcurrencyTest
mvn -pl ticketbox-api -am test -Dtest=EventServiceTest -Dsurefire.failIfNoSpecifiedTests=false
```

## Danh sách test hiện có

| Test | Chứng minh |
|---|---|
| `SeatPositionTest` | Parse, sắp xếp A1 < A2 < A10, equals/hashCode |
| `SeatMapFactoryTest` | Đúng số ghế, hàng đầu là VIP, giá VIP 1.5x |
| `PricingStrategyTest` | Polymorphism, ghép chiến lược bằng lambda, bất biến |
| `BookingServiceTest` | Giữ ghế, all-or-nothing, hết hạn, xác nhận, hủy, job nhả ghế |
| `BookingConcurrencyTest` | Naive check-then-act bán trùng; `putIfAbsent` và `BookingService` chỉ 1 người thắng |
| `ReportServiceTest` | `groupingBy`, `partitioningBy`, doanh thu chỉ tính booking đã xác nhận |
| `EventServiceTest` | Sinh ghế từ venue, venue không tồn tại, không sửa event đã publish |
| `EventControllerTest` | 400 kèm danh sách lỗi, 404/409 đúng format ProblemDetail |

Lưu ý: `naiveCheckThenAct_soldTheSameSeatSeveralTimes` dựa trên xác suất (race condition), nhưng với 100 thread
và độ trễ 5 ms thì gần như luôn tái hiện được.
