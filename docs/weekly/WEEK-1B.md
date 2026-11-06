# Bước 1B — Đa luồng (Multi-threading)

> **Lưu ý:** thư mục `learning/week1-java-core` (project mẫu của bài này) đã bị xoá khỏi repo. Code `EventLocks`, `Order*`,
> `ConcurrencyTest` vẫn xem được ở commit `6a79b64`: `git show 6a79b64:learning/week1-java-core/<đường dẫn>`.
> Bản hiện hành tương đương nằm ở `backend/ticketbox-core` (`Booking*`, `BookingConcurrencyTest`).

Project (đã xoá, xem lưu ý trên): `learning/week1-java-core` · Khóa học: *Multi-Threading Overview & Thread Creation · Thread Lifecycle &
Methods · Synchronization, Volatile & Deadlock · Virtual Thread* · 3–4 giờ

| | |
|---|---|
| **Mục tiêu** | Hiểu và chứng minh bằng test: nhiều người cùng mua một ghế thì **đúng một người thắng** |
| **Code gồm** | `service/EventLocks.java`, các chỗ `locks.withLock(...)` trong `OrderService`, `EventService`, `ReportService`; `test/.../ConcurrencyTest.java`; `demo/Week1DemoApp.race()` |
| **Definition of Done** | Chạy `ConcurrencyTest` xanh · làm 3 thí nghiệm ở mục 10 · trả lời 6 câu ở mục 11 · tag `w1b-done` |

## 0. Kiến thức khóa học ↔ dự án

Nguyên tắc: **chỉ đưa vào code khi bài toán cần**. Phần còn lại hiểu và giải thích được là đủ.

| Chủ đề khóa học | Bài toán có cần không | Ở đâu |
|---|---|---|
| Race condition, synchronization | **Có**: chống bán trùng ghế | `EventLocks` (mục 2–3) |
| `volatile` | **Không**, và phải giải thích được vì sao nó không đủ | mục 4 |
| Data race khi chỉ đọc | **Có**: báo cáo đọc ghế | `ReportService` (mục 5) |
| Tạo thread, lifecycle, `join/sleep/interrupt` | Chỉ trong **test** để mô phỏng nhiều người mua | mục 6 (lý thuyết + test) |
| Virtual thread | **Có**: mô phỏng 10.000 người mua; server xử lý nhiều request I/O | test, demo (mục 7) |
| Deadlock | **Không xảy ra** nhờ thiết kế; không viết code minh họa | mục 8 (giải thích) |

---

## 1. Vấn đề: check-then-act

Giữ ghế gồm 2 bước: **(1) kiểm tra ghế trống**, **(2) đánh dấu đã giữ**. Hai thread chen vào giữa:

```
Thread A: kiểm tra B1 → trống ✓
Thread B: kiểm tra B1 → trống ✓      (A chưa kịp ghi)
Thread A: giữ B1
Thread B: giữ B1                     → BÁN TRÙNG
```

Test tái hiện (`ConcurrencyTest.naiveCheckThenAct_sellsTheSameSeatTwice`):

```java
ConcurrentMap<String, String> owner = new ConcurrentHashMap<>();
int winners = runConcurrently(1_000, buyer -> {
    if (!owner.containsKey("B1")) {        // (1) check
        pause();                            // giả lập một lần gọi DB ở giữa
        owner.put("B1", "user-" + buyer);  // (2) act
        return true;
    }
    return false;
});
assertThat(winners).isGreaterThan(1);       // nhiều người "mua" được cùng một ghế
```

**Bài học:** `ConcurrentHashMap` an toàn cho **từng** lệnh `containsKey`/`put`, nhưng **chuỗi** hai lệnh thì không.

## 2. Một thao tác nguyên tử (atomic) là đủ khi chỉ có một bước

```java
int winners = runConcurrently(10_000, buyer -> owner.putIfAbsent("B1", "user-" + buyer) == null);
assertThat(winners).isEqualTo(1);
```

`putIfAbsent` gộp check + act thành **một** thao tác nguyên tử. Cùng ý tưởng: `IdGenerator` dùng
`AtomicLong.getAndIncrement()` (CAS ở CPU) thay vì `id++` (đọc, cộng, ghi: 3 bước).

Nhưng giữ chỗ thật có **nhiều** ghế và **nhiều** kiểm tra (sự kiện đang bán? ghế tồn tại? tất cả trống?) → không có
một thao tác atomic nào bao hết được → cần **lock**.

## 3. Lock: từng bước đi tới `EventLocks`

### Bước 3.1 — `synchronized` cả method (đúng nhưng chậm)

```java
public synchronized Order hold(...) { ... }
```
Đúng: mỗi lúc chỉ một thread vào. Nhưng người mua sự kiện A phải chờ người mua sự kiện B dù không liên quan.

### Bước 3.2 — Một lock cho mỗi sự kiện

```java
public final class EventLocks {

    private final ConcurrentMap<Long, ReentrantLock> locks = new ConcurrentHashMap<>();

    public <T> T withLock(Long eventId, Supplier<T> action) {
        ReentrantLock lock = locks.computeIfAbsent(eventId, id -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }
}
```

| Dòng | Vì sao |
|---|---|
| `ConcurrentMap<Long, ReentrantLock>` | Mỗi sự kiện một lock → sự kiện khác nhau không chặn nhau |
| `computeIfAbsent` | Atomic: hai thread không thể tạo hai lock khác nhau cho cùng sự kiện |
| `try { … } finally { unlock(); }` | **Bắt buộc**: `action` ném exception (ghế đã bị giữ) thì lock vẫn được mở. Quên → mọi thread sau treo vĩnh viễn |
| `<T> T` + `Supplier<T>` | Generic method: cùng helper trả `Order`, `Event`, `Boolean`… |
| Tách thành class riêng | **Một quy tắc** cho cả hệ thống: đụng vào trạng thái sự kiện thì đi qua `EventLocks`. Ba service dùng chung một instance |

### Bước 3.3 — Dùng trong `OrderService.hold`

```java
public Order hold(Long eventId, String userId, List<SeatPosition> positions) {
    requireDistinct(positions);                 // không đụng dữ liệu chung → làm ngoài lock cho lock ngắn
    return locks.withLock(eventId, () -> {
        // kiểm tra tất cả ghế → nếu đủ thì giữ tất cả → lưu đơn
    });
}
```

Kết quả: `ConcurrencyTest.orderService_oneWinnerPerSeat` (10.000 người, 1 ghế → 1 người thắng) và
`overlappingMultiSeatOrders_neverDoubleBook` (mỗi người mua 2 ghế liền nhau, chồng lấn nhau → không ghế nào bị giữ 2 lần).

### Vì sao `ReentrantLock` mà không `synchronized`?

| | `synchronized` | `ReentrantLock` |
|---|---|---|
| Cú pháp | Gọn, tự mở khi ra khỏi khối | Phải `unlock()` trong `finally` |
| Lưu một lock cho mỗi sự kiện trong Map | Phải `synchronized (lockObject)` | Tự nhiên |
| `tryLock(timeout)`, fair lock | Không | Có |
| **Virtual thread trên Java 21** | Thread chờ trong `synchronized` **ghim (pin)** luôn thread hệ điều hành bên dưới → 10.000 người mua có thể nghẽn cả pool | Không bị ghim |

Lỗi pinning được sửa từ JDK 24 (JEP 491). Dự án dùng Java 21 nên chọn `ReentrantLock` (ADR-020).
"Reentrant": thread đang giữ lock gọi `lock()` thêm lần nữa không tự chặn chính mình.

## 4. `volatile` — vì sao không đủ

Code cũ:
```java
private volatile EventStatus status;

public void publish() {
    if (status != DRAFT) throw ...;   // đọc
    status = PUBLISHED;               // ghi
}
public void cancel() { ...; status = CANCELLED; }
```

`volatile` đảm bảo **visibility**: thread khác thấy giá trị mới nhất. Nó **không** làm cặp "đọc rồi ghi" thành nguyên tử:

```
Thread A (publish): đọc status = DRAFT ✓
Thread B (cancel):  đọc status = DRAFT ✓, ghi CANCELLED
Thread A (publish): ghi PUBLISHED      → sự kiện đã hủy lại được mở bán
```

Sửa: bỏ `volatile`, cho `publish/cancel` chạy trong lock:
```java
public Event publish(Long eventId) {
    return locks.withLock(eventId, () -> {
        Event event = getById(eventId);
        event.publish();
        return event;
    });
}
```
Test: `ConcurrencyTest.publishAndCancelRace_cancelAlwaysWins` (500 vòng, publish và cancel chạy cùng lúc → luôn kết thúc ở CANCELLED).

**Khi nào `volatile` là đủ?** Một biến, một thread ghi, nhiều thread chỉ đọc, giá trị ghi không phụ thuộc giá trị cũ.
Ví dụ cờ dừng: `volatile boolean running`. Bài toán này không có trường hợp đó → không dùng.

## 5. Chỉ đọc cũng cần lock

`ReportService.statsOf` duyệt trạng thái ghế trong khi `OrderService` đang sửa. Không có quan hệ **happens-before**
giữa hai thread thì Java không đảm bảo thread đọc thấy dữ liệu nhất quán (có thể thấy ghế đã HELD nhưng tổng chưa cập nhật).
Lock tạo happens-before: mọi thứ ghi trước `unlock()` được nhìn thấy sau `lock()` của thread kế tiếp.

```java
public EventStats statsOf(Long eventId) {
    return locks.withLock(eventId, () -> { /* groupingBy, reduce */ });
}
```

## 6. Tạo thread và vòng đời (lý thuyết + chỗ thấy trong test)

Dự án **không** tự tạo thread trong code nghiệp vụ: request đồng thời do server (Tomcat) tạo. Thread chỉ xuất hiện trong
test/demo để mô phỏng nhiều người mua. Kiến thức nền:

```java
// 3 cách tạo (để hiểu, không dùng trong dự án)
Thread t1 = new Thread(() -> System.out.println("platform"));   // Runnable
t1.start();          // start() tạo thread mới; run() chỉ gọi hàm trên thread hiện tại
t1.join();           // chờ t1 kết thúc
Thread t2 = Thread.ofVirtual().start(() -> System.out.println("virtual"));
ExecutorService pool = Executors.newFixedThreadPool(4);          // thực tế: dùng executor, không new Thread
```

| Trạng thái | Nghĩa | Thấy ở đâu trong dự án |
|---|---|---|
| NEW → RUNNABLE | Đã `start()`, đang chạy hoặc chờ CPU | Mỗi task submit vào executor |
| WAITING | Chờ không giới hạn | `startGate.await()` trong test; chờ `ReentrantLock` |
| TIMED_WAITING | Chờ có hạn | `Thread.sleep(5)` trong `pause()` |
| BLOCKED | Chờ vào khối `synchronized` | Không có (dự án không dùng `synchronized`) |
| TERMINATED | Chạy xong | Khi `executor.close()` trả về |

**`interrupt`**: là *yêu cầu* dừng, không phải lệnh giết thread. Khi bắt `InterruptedException`, phải đặt lại cờ:
```java
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();   // để code phía trên biết thread đã bị yêu cầu dừng
}
```

**`CountDownLatch` làm vạch xuất phát** (trong `runConcurrently`): mọi task `await()` cho tới khi `countDown()`.
Không có nó, task đầu chạy xong trước khi task thứ 100 kịp khởi động → gần như không có tranh chấp, test có thể
"xanh nhờ may mắn".

## 7. Virtual thread

Virtual thread do JVM quản lý, rất nhẹ (vài KB), hàng triệu cái được. Khi chờ I/O (DB, mạng, sleep, lock) nó nhả
thread hệ điều hành cho virtual thread khác chạy.

**Áp dụng 1 — Test và demo: 10.000 người mua**
```java
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 10_000; i++) {
        executor.submit(() -> { ... });   // mỗi người mua một virtual thread
    }
}                                          // close() chờ mọi task xong (Java 19+)
```
Với platform thread, 10.000 thread tốn hàng GB stack. Với virtual thread thì không đáng kể, đúng kịch bản mở bán.

**Áp dụng 2 — Backend (bước 2, tùy chọn):** `spring.threads.virtual.enabled: true` → mỗi request chạy trên một virtual
thread. Hợp lý vì API chủ yếu chờ database.

**Không dùng virtual thread khi:** công việc nặng CPU (tính toán) → không nhanh hơn. Và tránh `synchronized` quanh
thao tác chờ lâu trên Java 21 (pinning, mục 3).

## 8. Deadlock — vì sao không xảy ra

Deadlock cần đủ 4 điều kiện: (1) độc quyền, (2) giữ và chờ, (3) không thể cướp lock, (4) **chờ vòng tròn**.

Ví dụ nếu khóa **từng ghế**:
```
Người X: lấy lock A1, chờ lock A2
Người Y: lấy lock A2, chờ lock A1    → chờ nhau mãi
```

Thiết kế hiện tại: mỗi thao tác chỉ lấy **một** lock (lock của sự kiện) → không có "giữ lock này chờ lock kia" →
**không thể deadlock**. Vì vậy không viết code minh họa deadlock trong dự án.

Nếu sau này cần khóa từng ghế để tăng song song, cách phòng (chỉ để giải thích):
```java
List<SeatPosition> ordered = positions.stream().sorted().toList(); // mọi thread lấy lock theo CÙNG thứ tự
ordered.forEach(p -> seatLock(p).lock());                           // → không thể chờ vòng tròn
```
`SeatPosition implements Comparable` đã có sẵn cho việc này. Cách khác: `tryLock(timeout)` rồi nhả hết và thử lại.

## 9. Kịch bản demo (8 phút)

1. Chạy `naiveCheckThenAct_sellsTheSameSeatTwice`: nhiều người thắng → "ConcurrentHashMap chưa đủ".
2. Chạy `atomicPutIfAbsent_hasOneWinner`: 1 người → "một bước thì atomic là đủ".
3. Mở `EventLocks`, giải thích từng dòng (bảng mục 3.2).
4. Chạy `orderService_oneWinnerPerSeat` (10.000 virtual thread) và `mvn exec:java` (mục 4 của demo).
5. Giải thích `volatile` không đủ bằng sơ đồ mục 4, chạy `publishAndCancelRace_cancelAlwaysWins`.
6. Trả lời "có deadlock không" bằng mục 8.
7. Giới hạn: lock này nằm trong **một JVM**. Chạy 2 instance backend là mất tác dụng → bước 4 chuyển sang khóa ở DB.

## 10. Thí nghiệm tự làm (≈1 giờ, làm trên branch `experiment`)

1. Trong `EventLocks.withLock`, comment `lock.lock()` và `lock.unlock()` → chạy `ConcurrencyTest` → test nào đỏ, vì sao?
2. Bỏ `try/finally`, để `unlock()` ngay sau `action.get()` → chạy `OrderServiceTest.isAllOrNothing` rồi
   `orderService_oneWinnerPerSeat` → vì sao test thứ hai treo?
3. Đổi `newVirtualThreadPerTaskExecutor()` thành `newFixedThreadPool(16)` trong test → đo thời gian chạy, giải thích.

Xong thì `git checkout .` để hoàn tác.

## 11. Câu hỏi mentor

1. **`synchronized` khác `ReentrantLock`?** Bảng mục 3; với dự án này: cần lock theo từng sự kiện và tránh pinning của virtual thread trên Java 21.
2. **`volatile` dùng khi nào, sao không dùng ở đây?** Mục 4.
3. **Vì sao `ConcurrentHashMap` chưa đủ?** An toàn từng thao tác, không an toàn chuỗi thao tác.
4. **Có deadlock không?** Mục 8: một lock mỗi thao tác; nếu nhiều lock thì lấy theo thứ tự cố định.
5. **Virtual thread khác platform thread? Khi nào không nên dùng?** Mục 7.
6. **Chạy 2 instance thì sao?** Lock trong JVM không còn đúng → khóa ở database (bước 4).
