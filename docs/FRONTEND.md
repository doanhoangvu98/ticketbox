# Frontend

## 1. Stack

| Thành phần | Chọn | Lý do |
|---|---|---|
| Framework | React 19 + Vite 6 + TypeScript strict | Phổ biến, nhanh, kiểu khớp DTO backend |
| CSS / icon / font | Tailwind v4, Remix Icon, Be Vietnam Pro | Responsive + dark mode bằng prefix; icon line/fill đồng bộ; dấu tiếng Việt đẹp |
| Router | React Router 7 | Route lồng nhau theo vai trò |
| HTTP | **axios** | Interceptor gắn JWT, chuẩn hóa lỗi ProblemDetail → `ApiError`, bắt 401 |
| Server state | **TanStack Query v5** | Cache, loading/error, `refetchInterval` (sơ đồ ghế, chờ thanh toán), invalidate sau mutation |
| Mock | **MSW v2** | Chặn request ở tầng mạng (Service Worker): code FE giống hệt khi gọi backend thật |
| Thông báo | **react-toastify** | Toast theo theme sáng/tối |
| Thanh toán | **VietQR** quick link (`img.vietqr.io`) | Ảnh QR NAPAS 247 quét được bằng mọi app ngân hàng |
| Vé | **qrcode.react** | QR thật chứa `qrToken` |
| i18n | Tự viết, key được kiểm tra kiểu | 2 ngôn ngữ, thiếu bản dịch là lỗi biên dịch |

## 2. Chạy

```bash
cd frontend
npm install            # postinstall tự tạo public/mockServiceWorker.js
npm run dev            # http://localhost:8000
```
File `.env.local` (đã có sẵn, git-ignored; mẫu ở `.env.example`):

| Biến | Ý nghĩa |
|---|---|
| `VITE_USE_MOCK=true` | Bật MSW, **không cần backend** |
| `VITE_MOCK_EXCLUDE=auth,events` | Tắt từng nhóm mock → nhóm đó gọi backend thật qua Vite proxy (`/api` → `:8080`) |
| `VITE_USE_MOCK=false` | Tắt hẳn mock |
| `VITE_BANK_*` | Tài khoản hiển thị trên VietQR **khi mock** (backend thật tự trả thông tin này) |

**Tài khoản demo** (mật khẩu `123456`): `customer@`, `organizer@`, `staff@`, `admin@ticketbox.vn`.
Nút **MOCK** góc trái dưới: đổi vai trò 1 chạm, reset dữ liệu demo.

## 3. Màn hình theo vai trò

| Vai trò | Route | Màn hình |
|---|---|---|
| Khách | `/` | Hero, tìm kiếm, lọc thể loại/thành phố, lưới sự kiện, phân trang (state trên URL) |
| | `/events/:id` | Banner, thông tin, chính sách, hạng vé + thanh còn lại, trạng thái mở bán |
| | `/events/:id/book` | Sơ đồ ghế màu theo hạng (RESERVED) hoặc chọn số lượng (GA), tóm tắt, thanh dưới đáy trên mobile |
| | `/login`, `/register` | Form + nút đăng nhập nhanh tài khoản demo |
| CUSTOMER | `/checkout/:code` | Đếm ngược, thông tin nhận vé, mã giảm giá, VietQR + copy STK/nội dung, poll chờ tiền, nút giả lập webhook (mock) |
| | `/me/tickets` | Vé sắp tới / đã qua, QR phóng to |
| | `/me/orders`, `/me/orders/:code` | Lịch sử, chi tiết, yêu cầu hoàn vé (ước tính số tiền) |
| ORGANIZER | `/organizer` | Thống kê, biểu đồ 30 ngày, sự kiện sắp tới |
| | `/organizer/events` | Lọc trạng thái, tiến độ bán, lý do bị từ chối |
| | `/organizer/events/new`, `/:id/edit` | Form đầy đủ: thời gian bán, hạng vé theo dải hàng/quota, màu, xem trước sơ đồ |
| | `/organizer/events/:id` | Gửi duyệt, hủy (hoàn 100%), tab Tổng quan / Đơn hàng / Mã giảm giá |
| STAFF | `/staff` | Chọn sự kiện, nhập/quét QR (camera qua BarcodeDetector), kết quả lớn màu xanh/cam/đỏ, tiến độ check-in |
| ADMIN | `/admin` | GMV, phí dịch vụ, việc cần xử lý (có badge trên menu) |
| | `/admin/events` | Duyệt / từ chối (kèm lý do), xem trước |
| | `/admin/orders` | Duyệt / từ chối hoàn tiền |
| | `/admin/payments` | Đối soát chuyển khoản chưa khớp: ghép đơn / trả lại tiền |
| | `/admin/users` | Tìm, đổi vai trò, khóa/mở khóa |

## 4. Cấu trúc

```
src/
├── app/            router (theo vai trò), RootLayout (Auth + Toast + DevPanel), workspaces (sidebar từng vai trò), ThemeProvider
├── i18n/           I18nProvider, locales/vi.ts (gốc), en.ts
├── lib/            api (axios + ApiError), types (HỢP ĐỒNG API), rules (luật nghiệp vụ), config, vietqr, format, queryClient
├── hooks/          useCountdown, useDebounce
├── components/ui   Button, Badge (+ badge trạng thái), Modal, Data (PageHeader, StatCard, SalesChart, ChipFilter, Field), Feedback
├── components/layout AppLayout (storefront), DashboardLayout (back-office), UserMenu, DevPanel, Preferences
├── features/<x>/   api.ts (query keys + hooks) · components/ · pages/
│   auth · events · booking · account · organizer · staff · admin
└── mocks/          browser.ts (nhóm handler), db.ts (dữ liệu + luật, lưu localStorage), utils.ts, handlers/*
```

## 5. Luồng dữ liệu

```
Page → hook (useEvents/useCreateOrder...) → features/x/api.ts → lib/api.ts (axios)
                                                          ↓
                                  MSW (mock) hoặc Vite proxy → Spring Boot
```
- **Query keys** tập trung (`eventKeys`, `orderKeys`) để invalidate chính xác: tạo đơn → làm mới `seats(eventId)`.
- **Mutation trả về Order** ghi thẳng vào cache (`setQueryData`), không cần GET lại.
- **Lỗi**: `ApiError.fieldErrors` hiện dưới ô nhập; `errorCode` quyết định hành vi (ví dụ `SEAT_NOT_AVAILABLE` → bỏ chọn ghế).
- **401** ở bất kỳ đâu → `AuthProvider` đăng xuất, xóa cache.

## 6. Chuyển dần sang backend thật

| Sau tuần backend | `.env.local` |
|---|---|
| 2 (hiện tại) | `VITE_MOCK_EXCLUDE=` (shape `/events` tuần 2 chưa khớp, giữ mock) |
| 3 | `VITE_MOCK_EXCLUDE=auth,events,organizer` |
| 4 | `VITE_MOCK_EXCLUDE=auth,events,organizer,orders,payments` |
| 5 | `VITE_USE_MOCK=false` |

Lưu ý: dữ liệu mock và dữ liệu thật không liên thông, nên tắt theo đúng thứ tự trên.

## 7. Quy ước
- Mọi chữ qua `t()`; thêm key ở `vi.ts` trước, TypeScript sẽ báo thiếu ở `en.ts`.
- Component không gọi axios trực tiếp: đi qua `features/*/api.ts`.
- Đổi `lib/types.ts` = đổi hợp đồng API → cập nhật `docs/API.md` và handler mock cùng lúc.
- Mọi màn hình phải ổn ở 360px và ở dark mode. Nút chỉ có icon phải có `aria-label` (`IconButton`).
- Named export, màu dùng `brand-*`, `npm run format` trước khi commit.
