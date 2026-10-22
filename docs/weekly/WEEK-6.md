# Tuần 6 ⭐ — Sẵn sàng production

## 1. Mục tiêu
Ai cũng chạy được cả hệ thống bằng 1 lệnh; mỗi lần push có CI; có số liệu hiệu năng và cách quan sát hệ thống.

## 2. Học được gì

| Kiến thức | Áp dụng | Junior+ | Middle |
|---|---|---|---|
| Integration test DB thật | Testcontainers PostgreSQL | Thay H2/DB local trong test | `@ServiceConnection`, dùng chung container cho cả suite |
| CI | GitHub Actions | `mvn verify` + `npm run build` | Cache Maven/npm, chạy song song BE/FE |
| Docker | Dockerfile BE multi-stage, FE build → Nginx | `docker compose up` | Image nhỏ (JRE alpine/distroless), user non-root, healthcheck |
| Reverse proxy | Nginx phục vụ FE + proxy `/api` | Một origin, không cần CORS | Header bảo mật, gzip |
| Load test | k6 `scripts/k6/hold-seat.js` | Chạy 100 VU | Đọc p95, lỗi; so optimistic vs pessimistic dưới tải |
| Observability | Actuator, Micrometer | `/actuator/health` | Metric tự định nghĩa (`orders_created_total`, `seat_conflicts_total`), log JSON có `requestId` (MDC) |
| Cấu hình | Profile `prod` | Biến môi trường | Không có secret trong repo; `.env` + Docker secrets |

## 3. Code sẽ gồm
```
backend/ticketbox-api/Dockerfile
frontend/Dockerfile, frontend/nginx.conf
docker-compose.prod.yml           # postgres + api + web
.github/workflows/ci.yml
scripts/k6/hold-seat.js, scripts/race.sh
backend/.../common/web/RequestIdFilter.java
backend/.../common/metrics/BookingMetrics.java
```

## 4. Definition of Done
- [ ] `docker compose -f docker-compose.prod.yml up` → mở `http://localhost` mua vé được.
- [ ] CI xanh trên GitHub, badge trong README.
- [ ] `BENCHMARK.md` có kết quả k6.
- [ ] README có ảnh chụp màn hình 4 vai trò, link slide demo. Tag `v1.0.0`.
