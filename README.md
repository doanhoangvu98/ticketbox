# 🎫 TicketBox

> Nền tảng bán vé sự kiện: ban tổ chức tạo sự kiện và hạng vé, admin duyệt, khách chọn ghế, giữ chỗ 10 phút,
> thanh toán **VietQR** (webhook ngân hàng), nhận vé QR, nhân viên check-in tại cổng.
> Dự án học tập theo lộ trình **IBM Java Developer Professional Certificate**, nhắm mức **Junior+ → Middle**.

## Vì sao dự án này?

Bài toán bán vé có một vấn đề backend thật: **nhiều người cùng giành một ghế**. Giải quyết nó đòi hỏi
hiểu concurrency, transaction, locking, idempotency. Đây là những chủ đề phân biệt Junior và Middle.
Chi tiết: [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md).

## Trạng thái

| Tuần | Nội dung | Trạng thái |
|---|---|---|
| 1 | Domain Java Core (`ticketbox-core`) | ✅ Code xong |
| 2 | Spring Boot + PostgreSQL + Flyway (`ticketbox-api`) | ✅ Code xong |
| 3 | Security, vai trò, vòng đời sự kiện | ⏳ |
| 4 | Đặt vé + VietQR (mốc MVP) | ⏳ |
| 5–6 ⭐ | Vận hành, production | ⏳ |
| FE | UI đầy đủ 4 vai trò, chạy bằng mock MSW | ✅ |

## Tech stack

| Layer | Công nghệ |
|---|---|
| Ngôn ngữ | Java 21 |
| Build | Maven (multi-module) |
| Backend | Spring Boot 3.5, Spring Data JPA, Bean Validation, springdoc (Swagger) |
| Database | PostgreSQL 16, Flyway |
| Test | JUnit 5, AssertJ, Mockito, MockMvc |
| Frontend | React 19, Vite, TypeScript, Tailwind v4, Remix Icon, React Router 7, axios, TanStack Query, MSW, react-toastify, VietQR |

## Cấu trúc thư mục

```
ticketbox/
├── backend/
│   ├── pom.xml                  # parent POM (quản lý version)
│   ├── ticketbox-core/          # Tuần 1: Java thuần, KHÔNG phụ thuộc framework
│   └── ticketbox-api/           # Tuần 2+: Spring Boot REST API, dùng lại core
├── frontend/                    # React + Vite + TS + Tailwind (chạy được với mock)
├── docs/                        # Toàn bộ tài liệu dự án (tiếng Việt)
├── docker-compose.yml           # PostgreSQL local (port 5433)
├── CLAUDE.md                    # Hướng dẫn cho AI assistant làm việc với repo
└── .editorconfig, .gitignore, .env.example
```

## Chạy nhanh

```bash
# Tuần 1: demo console + test
cd backend
mvn -pl ticketbox-core test
mvn -pl ticketbox-core exec:java

# Tuần 2: API
docker compose up -d                      # từ thư mục gốc
cd backend && mvn -pl ticketbox-api -am spring-boot:run -Dspring-boot.run.profiles=dev
# Swagger: http://localhost:8080/swagger-ui.html

# Frontend (không cần backend nhờ MSW; cấu hình ở frontend/.env.local)
cd frontend && npm install && npm run dev  # http://localhost:8000
# Tài khoản demo: customer@ / organizer@ / staff@ / admin@ticketbox.vn, mật khẩu 123456
```

> `ticketbox-core` là thư viện, không chạy riêng. Ứng dụng duy nhất là `ticketbox-api` (đã chứa core).
> Giải thích: [SETUP.md mục 2](docs/SETUP.md).

Hướng dẫn đầy đủ (WSL, IntelliJ, lỗi thường gặp): [docs/SETUP.md](docs/SETUP.md).

## Tài liệu

| File | Nội dung |
|---|---|
| [PROGRESS](docs/PROGRESS.md) | **Đang ở tuần nào, đã xong gì** (đọc đầu tiên) |
| [PROJECT_BRIEF](docs/PROJECT_BRIEF.md) | Bài toán, lý do chọn, phạm vi |
| [DOMAIN](docs/DOMAIN.md) | Luật nghiệp vụ: vai trò, giữ chỗ, thanh toán, hoàn vé, check-in |
| [ROADMAP](docs/ROADMAP.md) | Lộ trình theo tuần + cách nhờ AI làm tiếp |
| [CHECKLIST](docs/CHECKLIST.md) | Checklist từng tuần |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Kiến trúc, luồng request |
| [DATABASE](docs/DATABASE.md) | ERD, bảng, quy tắc migration |
| [API](docs/API.md) | Hợp đồng API toàn bộ (đã mock ở FE), mã lỗi |
| [CONVENTIONS](docs/CONVENTIONS.md) | Format code, đặt tên, Git |
| [TESTING](docs/TESTING.md) | Chiến lược test |
| [FRONTEND](docs/FRONTEND.md) | Stack FE, màn hình, mock/API, i18n, responsive |
| [DECISIONS](docs/DECISIONS.md) | Các quyết định kỹ thuật (ADR) |
| [KNOWLEDGE_MAP](docs/KNOWLEDGE_MAP.md) | Kiến thức → file code (dùng khi demo) |
| [BENCHMARK](docs/BENCHMARK.md) | Số đo trước/sau tối ưu |
| [weekly/](docs/weekly) | Giải thích code + kịch bản demo từng tuần |
