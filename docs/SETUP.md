# Cài đặt và chạy

## 1. Yêu cầu

| Công cụ | Version | Kiểm tra |
|---|---|---|
| JDK | 21 | `java -version` |
| Maven | 3.9+ | `mvn -v` (dòng *Java version* phải là 21) |
| Docker | mới | `docker compose version` |
| IntelliJ IDEA | 2024.3+ | |
| Node.js (frontend) | 20+ | `node -v` |

**WSL (Ubuntu):**
```bash
sudo apt update && sudo apt install -y openjdk-21-jdk maven
# hoặc dùng SDKMAN: sdk install java 21.0.x-tem && sdk install maven
```

## 2. Hai module chạy như thế nào?

`ticketbox-core` **không phải một ứng dụng chạy riêng**. Nó là thư viện (file `.jar`) chứa logic nghiệp vụ.
Chỉ có **một** ứng dụng chạy thật là `ticketbox-api`, và nó dùng core như một dependency:

```
backend/pom.xml (parent, packaging=pom)       <- chỉ quản lý version, không có code
├── ticketbox-core  -> build ra ticketbox-core.jar
└── ticketbox-api   -> <dependency>ticketbox-core</dependency>
                       build ra ticketbox-api.jar (Spring Boot, đã chứa core bên trong)
```

| Lệnh | Ý nghĩa |
|---|---|
| `mvn verify` (ở `backend/`) | Maven tự sắp thứ tự: build + test core trước, rồi api |
| `mvn -pl ticketbox-api -am spring-boot:run` | `-pl` chọn module api, `-am` (also-make) build luôn core mà api cần |
| `mvn -pl ticketbox-core exec:java` | Chỉ chạy demo console tuần 1 (`Week1DemoApp`), không liên quan tới API |

**Trong IntelliJ:** mở thư mục `backend/` (hoặc gốc repo), IntelliJ nhận cả 2 module và tự hiểu api phụ thuộc core.
Bấm ▶ ở `TicketboxApiApplication` là chạy được, sửa code ở core thì api nhận ngay, không cần `mvn install`.

**Khi deploy (tuần 4):** `mvn package` → chỉ cần chạy một file `ticketbox-api/target/ticketbox-api-*.jar`.

## 3. Chạy tuần 1 (không cần DB)

```bash
cd backend
mvn -pl ticketbox-core test
mvn -pl ticketbox-core exec:java
```
Hoặc trong IntelliJ: mở `Week1DemoApp`, bấm ▶ cạnh `main`.

## 4. Chạy tuần 2

```bash
# Ở thư mục gốc
docker compose up -d
docker compose ps            # postgres phải "healthy"

cd backend
mvn -pl ticketbox-api -am spring-boot:run -Dspring-boot.run.profiles=dev
```
- Swagger: http://localhost:8080/swagger-ui.html
- DB: `localhost:5433`, db/user/pass `ticketbox`
- Lần chạy đầu Flyway nạp ~300k ghế, mất vài giây.

**IntelliJ:** Run configuration của `TicketboxApiApplication` → *Active profiles* = `dev`.
Nếu cần, thêm biến môi trường từ `.env.example`.

## 5. Cấu hình IntelliJ

1. File → Project Structure → Project SDK = **21**, Language level = **21**.
2. Settings → Build Tools → Maven → *Maven home* = bản đã cài; Runner → JRE = 21.
3. Settings → Build → Compiler → Annotation Processors → **Enable annotation processing** (cho Lombok).
4. Cài plugin Lombok (thường có sẵn).
5. Mở thư mục `backend/` (hoặc gốc repo) → IntelliJ nhận `pom.xml` cha và 2 module.

## 6. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `invalid target release: 21` hoặc `JVM target 5` | Maven/IntelliJ dùng JDK cũ | Mục 5 bước 1–2, kiểm tra `mvn -v` |
| `password authentication failed for user` | Volume DB cũ có user khác | `docker compose down -v && docker compose up -d` |
| `port 5433 already in use` | Container khác chiếm port | Đổi port trong `docker-compose.yml` và `DB_URL` |
| `Schema-validation: missing table` | Flyway chưa chạy / sai `locations` | Xem log Flyway, kiểm tra profile |
| `Validate failed: Migration checksum mismatch` | Đã sửa file migration đã chạy | Hoàn tác thay đổi, tạo migration mới. Ở local có thể reset DB |
| `Detected resolved migration not applied to database: 1.1` | Đã chạy app không có profile `dev` trước (V2 đã áp dụng), sau đó mới bật `dev` | Reset DB: `docker compose down -v && docker compose up -d` |
| Lombok: `cannot find symbol getXxx` | Chưa bật annotation processing | Mục 5 bước 3 |
| File `*:Zone.Identifier` trong WSL | Copy từ Windows | `find . -name '*:Zone.Identifier' -delete` (đã có trong `.gitignore`) |
| Swagger không lọc được theo ngày | Dấu `+` trong URL | Dùng `Z` hoặc encode `%2B` |

## 7. Chạy frontend

Cần Node.js 20+ (`node -v`).

```bash
cd frontend
npm install            # postinstall chạy "msw init public" tạo mockServiceWorker.js
npm run dev            # http://localhost:8000
```

- Cấu hình ở `frontend/.env.local` (có sẵn, mẫu `.env.example`). Mặc định `VITE_USE_MOCK=true`: **không cần backend**.
- Tài khoản demo: `customer@`, `organizer@`, `staff@`, `admin@ticketbox.vn` / `123456`, hoặc bấm nút **MOCK** góc trái dưới.
- Nối backend thật dần theo tuần: `VITE_MOCK_EXCLUDE` (xem `docs/FRONTEND.md` mục 6). Sửa `.env.local` xong phải restart `npm run dev`.
- Thử check-in bằng camera trên điện thoại: `npm run dev -- --host`, mở `http://<IP-máy>:8000` (camera cần HTTPS hoặc localhost; trên LAN dùng nhập mã).

**Chạy đủ bộ khi demo** (3 terminal):

| Terminal | Lệnh |
|---|---|
| 1 | `docker compose up -d` |
| 2 | `cd backend && mvn -pl ticketbox-api -am spring-boot:run -Dspring-boot.run.profiles=dev` |
| 3 | `cd frontend && npm run dev` |

## 8. Reset sạch

```bash
docker compose down -v      # xóa cả dữ liệu
cd backend && mvn clean
```
