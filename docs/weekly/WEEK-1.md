# Tuần 1: Domain bằng Java Core

Module: `backend/ticketbox-core` · Không framework · Thời lượng gợi ý: 3–4 giờ

## Tóm tắt

| | |
|---|---|
| **Mục tiêu** | Logic đặt vé đúng và an toàn khi nhiều thread chạy cùng lúc, chưa dùng framework |
| **Học được gì** | OOP (abstract, sealed, polymorphism), record, enum có logic, generics có ràng buộc, Collections (`TreeMap`, `ConcurrentHashMap`), functional interface + lambda + higher-order function, Stream/Collectors, Optional, exception có phân cấp, `java.time` + `Clock`, `ReentrantLock`, `ExecutorService`, `CountDownLatch`, design pattern (Strategy, Factory, Builder) |
| **Code gồm** | `common/` (Identifiable, IdGenerator, Result), `domain/` (Seat, Event, Booking...), `pricing/PricingStrategy`, `repository/` (generic + in-memory), `exception/`, `service/` (Event, Booking, Report), `demo/Week1DemoApp`; 6 file test |
| **Definition of Done** | `mvn -pl ticketbox-core test` xanh · demo console chạy · làm bài tập mục 4 · giải thích được 4 câu hỏi mục 3 · tag `w1-done` |
| **Liên hệ tuần sau** | Tuần 2 dùng lại `SeatMapFactory`, enum, exception; tuần 4 thay `ReentrantLock` bằng khóa DB |

## 1. Đọc code theo thứ tự này

Đi từ nhỏ đến lớn, mỗi bước chỉ phụ thuộc vào bước trước.

### Bước 1: Value object và enum (`domain/`)

**`SeatPosition`** là vị trí ghế như `A12`.
- Là `record` → bất biến, tự có `equals/hashCode/toString`. Quan trọng vì nó làm **key của Map**:
  key mà thay đổi được hoặc `hashCode` sai thì `map.get()` sẽ không tìm thấy.
- Compact constructor `public SeatPosition { ... }` kiểm tra dữ liệu **trước khi** gán field.
- `Comparable` với `Comparator.comparing(row).thenComparingInt(number)` → sắp xếp A1, A2, A10
  (nếu so sánh chuỗi sẽ ra A1, A10, A2).

**`SeatStatus`** là state machine:
```
AVAILABLE --hold--> HELD --sell--> SOLD
    ^                 |
    +----release------+
```
Các bước chuyển hợp lệ nằm trong một `EnumMap`, nên không có `if/else` rải rác khắp nơi.

### Bước 2: Seat và kế thừa

- `Seat` là `abstract sealed`: không `new Seat()` được, và chỉ `StandardSeat`, `VipSeat` được kế thừa.
- `price()` là abstract → `VipSeat` nhân 1.5, `StandardSeat` giữ nguyên. Nơi gọi chỉ cần `seat.price()`,
  không cần biết loại ghế. **Đó là polymorphism.**
- `isAvailableAt(now)`: ghế HELD nhưng đã quá hạn được coi như trống ("lazy expiry"). Hệ thống vẫn đúng
  dù job dọn dẹp chưa chạy.
- Javadoc ghi rõ **Seat không thread-safe**: việc khóa do `BookingService` lo (xem bước 5).

### Bước 3: Event, Builder, Factory

- `Event.builder().id(..).name(..).build()`: Builder giúp tạo object nhiều tham số dễ đọc, validate tập trung ở constructor.
- Ghế lưu trong `TreeMap<SeatPosition, Seat>` → luôn đúng thứ tự. `seats()` trả view **chỉ đọc**.
- `SeatMapFactory` dùng hai `IntStream` lồng nhau với `flatMap` để sinh ghế, và tự quyết định hàng nào là VIP.

### Bước 4: PricingStrategy, lambda và functional interface

```java
PricingStrategy pricing = PricingStrategy.seatPrice()   // Seat::price
        .withDiscountPercent(10)                        // trả về strategy MỚI
        .withServiceFee(new BigDecimal("5000"));        // trả về strategy MỚI
```
- Một abstract method → mọi lambda `seat -> ...` đều là một `PricingStrategy`.
- `andThen` là **higher-order function**: nhận một hàm, trả về một hàm mới. Strategy gốc không bị đổi (bất biến).
- Thêm cách tính giá mới không cần sửa `BookingService` (Open/Closed).

### Bước 5: Repository generic

`Repository<T extends Identifiable<ID>, ID>`: "T phải có `id()`". Một implementation `InMemoryRepository`
dùng được cho cả Event và Booking. `findAll(Predicate)` cho phép truyền **hành vi lọc** vào.

### Bước 6: BookingService, phần quan trọng nhất

**Vấn đề:** giữ ghế gồm 2 bước: (1) kiểm tra ghế trống, (2) đánh dấu đã giữ. Hai thread cùng qua bước (1)
trước khi ai kịp làm bước (2) → cả hai đều giữ được một ghế. Đây là **race condition kiểu check-then-act**.

**Giải pháp:**
```java
private <T> T withEventLock(Long eventId, Supplier<T> action) {
    ReentrantLock lock = eventLocks.computeIfAbsent(eventId, id -> new ReentrantLock());
    lock.lock();
    try {
        return action.get();
    } finally {
        lock.unlock();   // luôn mở khóa, kể cả khi action ném exception
    }
}
```
- Một lock cho **mỗi event**: event khác nhau không chặn nhau.
- `computeIfAbsent` là atomic: hai thread không tạo ra hai lock khác nhau cho cùng một event.
- Generic `<T>` + `Supplier<T>`: dùng chung cho `hold` (trả `Booking`) và `releaseExpiredHolds` (trả `null`).
- **All-or-nothing:** kiểm tra hết các ghế trước, chỉ khi tất cả trống mới giữ.
- `Clock` được inject → test "10 phút sau" chỉ cần `clock.advance(...)`, không phải chờ.

### Bước 7: ReportService và Collectors

| Method | Collector |
|---|---|
| `statsOf` | `groupingBy(Seat::status, () -> new EnumMap<>(..), counting())` |
| `availableVipVsStandard` | `partitioningBy(s -> s.type() == VIP, counting())` → `{true=.., false=..}` |
| `revenueByEvent` | `groupingBy(eventId, reducing(ZERO, totalAmount, add))` |
| `topEventsByRevenue` | `sorted(comparingByValue().reversed())` + `toMap(..., LinkedHashMap::new)` để giữ thứ tự |

## 2. Kịch bản demo (8–10 phút)

1. **(1 phút) Bài toán:** "Hai người cùng mua một ghế thì sao?"
2. **(2 phút) Chạy `Week1DemoApp`:** chỉ sơ đồ ghế, booking, lỗi `SEAT_NOT_AVAILABLE`, kết quả 100 thread chỉ 1 thắng.
3. **(3 phút) Chạy `BookingConcurrencyTest`:**
   - `naiveCheckThenAct...` → nhiều người thắng: *"kể cả dùng ConcurrentHashMap vẫn bán trùng"*.
   - `atomicPutIfAbsent...` → 1 người thắng: *"một thao tác atomic thì đủ"*.
   - `bookingService...` → 1 người thắng: *"nhiều ghế + kiểm tra nên cần lock bao cả khối"*.
4. **(3 phút) Mở `KNOWLEDGE_MAP.md`:** đi nhanh qua `PricingStrategy` (lambda), `Repository` (generics), `ReportService` (stream).
5. **(1 phút) Hạn chế + tuần sau:** lock trong JVM không đúng khi chạy nhiều instance → tuần 3 khóa ở DB.

## 3. Câu hỏi mentor hay hỏi

**`synchronized` khác `ReentrantLock`?**
Cả hai đều reentrant và đảm bảo chỉ một thread vào vùng găng. `ReentrantLock` linh hoạt hơn: `tryLock(timeout)`,
có thể chọn fair, có nhiều `Condition`. Đổi lại phải tự `unlock` trong `finally`. Ở đây cần một lock cho mỗi event
nên lưu `ReentrantLock` trong map tiện hơn `synchronized` trên một object.

**Vì sao `HashMap` không thread-safe?**
Nhiều thread `put` cùng lúc có thể ghi đè nhau làm mất dữ liệu, hoặc làm hỏng cấu trúc bên trong khi resize.
`ConcurrentHashMap` an toàn cho từng thao tác, nhưng một chuỗi thao tác (check rồi put) vẫn cần atomic
(`putIfAbsent`, `compute`) hoặc lock.

**Vì sao không lock từng ghế?**
Đặt nhiều ghế phải lấy nhiều lock. Hai người lấy theo thứ tự khác nhau (A1→A2 và A2→A1) có thể deadlock.
Lock theo event đơn giản và đủ nhanh vì một event không có quá nhiều thao tác đồng thời.

**Vì sao `equals/hashCode` của `Seat` chỉ dựa trên vị trí?**
Vì vị trí là định danh của ghế trong một event, còn trạng thái thì thay đổi. Nếu hashCode dựa trên trạng thái,
ghế bỏ vào `HashSet` rồi đổi trạng thái sẽ "biến mất" khỏi set.

## 4. Bài tập tự làm (≈1 giờ)

Thêm phụ thu cuối tuần vào `PricingStrategy`:
```java
default PricingStrategy withSurchargePercent(int percent) { ... }
```
- Gợi ý: làm giống `withDiscountPercent`, nhân với `(100 + percent) / 100`.
- Viết test trong `PricingStrategyTest`: VIP 150.000, phụ thu 20% → 180.000.
- Thêm một dòng vào `KNOWLEDGE_MAP.md`.
