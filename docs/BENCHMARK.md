# Benchmark

Số đo thật trên máy local. **Điền số sau khi chạy**, không chép số từ chỗ khác.
Môi trường: (CPU/RAM, PostgreSQL 16 Docker, dữ liệu seed ~300.000 ghế)

---

## B1. N+1 khi liệt kê event

**Cách đo**
1. Chạy profile `dev` (đã bật `generate_statistics` và log SQL).
2. Comment `@EntityGraph` trên `findAll(...)` trong `EventRepository`, restart.
3. Gọi `GET /api/v1/events?size=20`, đếm số câu `select` trong log (hoặc dòng `... JDBC statements executed`).
4. Bỏ comment, restart, đo lại.

| | Số query | Thời gian phản hồi |
|---|---|---|
| Trước (không `@EntityGraph`) | ___ (dự kiến 1 + 1 count + tối đa 3 venue) | ___ ms |
| Sau (`@EntityGraph`) | ___ (dự kiến 1 + 1 count) | ___ ms |

Ghi chú: seed chỉ có 3 venue nên Hibernate cache trong session giảm bớt query.
Muốn thấy rõ hơn, tạo thêm venue hoặc giải thích: số query tăng theo **số venue khác nhau** trong trang.

---

## B2. Truy vấn ghế hết hạn (dùng cho job tuần 3)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM seat
WHERE status = 'HELD' AND hold_expires_at < now();
```

**Trước index:** bật `spring.flyway.target: "1.1"` trong `application-dev.yml`, reset DB
(`docker compose down -v && docker compose up -d`), chạy app để nạp seed, chạy câu trên.
**Sau index:** bỏ `target`, chạy app (Flyway áp dụng V2), chạy lại câu trên.

| | Plan | Execution time |
|---|---|---|
| Trước V2 | ___ (dự kiến Seq Scan) | ___ ms |
| Sau V2 | ___ (dự kiến Index/Bitmap Scan trên `ix_seat_held_expires_at`) | ___ ms |
| Kích thước index | `SELECT pg_size_pretty(pg_relation_size('ix_seat_held_expires_at'));` → ___ | |

---

## B3. Danh sách event theo trạng thái + thời gian

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM event
WHERE status = 'PUBLISHED' AND starts_at >= now()
ORDER BY starts_at
LIMIT 20;
```

| | Plan | Execution time |
|---|---|---|
| Trước V2 | ___ | ___ ms |
| Sau V2 | ___ (dự kiến Index Scan trên `ix_event_status_starts_at`, không cần Sort) | ___ ms |

Lưu ý: bảng event chỉ 1.000 dòng, PostgreSQL có thể vẫn chọn Seq Scan vì rẻ hơn. Đây là điểm đáng nói khi demo:
**planner chọn plan theo chi phí, index không phải lúc nào cũng được dùng.**

---

## B4. Batch insert ghế (tạo event 500 chỗ)

Tạo event ở venue 2 (20 × 25 = 500 ghế), xem log thời gian của `POST /events`.

| | Thời gian |
|---|---|
| `batch_size` tắt (comment trong `application.yml`) | ___ ms |
| `batch_size: 50` | ___ ms |

---

## Kết luận (viết sau khi đo)
-
