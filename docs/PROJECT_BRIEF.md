# Project Brief: TicketBox

| | |
|---|---|
| **Owner** | Noah (Vu Doan Hoang) |
| **Loại dự án** | Dự án cá nhân theo khóa IBM Java Developer Professional |
| **Thời lượng** | 4 tuần, khoảng 3–4 giờ mỗi tuần |
| **Mục tiêu năng lực** | Junior+ → Middle Java Backend |

## 1. Bài toán

Các đơn vị tổ chức sự kiện nhỏ (nhà hát, câu lạc bộ, hội thảo) cần bán vé có **chọn ghế**.
Khó khăn thực tế khi tự làm:

1. **Bán trùng ghế:** hai khách cùng bấm mua một ghế trong cùng một giây.
2. **Ghế bị "giam":** khách chọn ghế rồi bỏ đi, ghế bị khóa mãi.
3. **Thanh toán bị xử lý hai lần:** cổng thanh toán gửi webhook lặp lại.
4. **Báo cáo chậm:** đếm doanh thu trên hàng trăm nghìn ghế.

## 2. Vì sao chọn dự án này

| Tiêu chí | Lý do |
|---|---|
| **Dễ hiểu** | Ai cũng từng mua vé, demo không cần giải thích bối cảnh |
| **Có bài toán khó thật** | Concurrency, transaction, locking, idempotency: câu hỏi phỏng vấn Middle phổ biến |
| **Đo được** | Có thể chứng minh bằng số: bao nhiêu request thắng, query nhanh hơn bao nhiêu |
| **Bám khóa học** | Tuần 1 dùng đúng Java Core vừa học, sau đó mới thêm Spring/DB |
| **Hợp hồ sơ** | Có cả FE tương tác (sơ đồ ghế), tận dụng kinh nghiệm frontend |

So với các ý tưởng khác đã cân nhắc: hệ thống quản lý license thì khó demo khi không có client cụ thể;
đặt phòng họp an toàn hơn nhưng ít điểm "wow". Bán vé cân bằng tốt nhất giữa độ khó và độ dễ trình bày.

## 3. Người dùng

| Vai trò | Nhu cầu chính |
|---|---|
| **Khách (CUSTOMER)** | Tìm sự kiện, chọn ghế, giữ chỗ, thanh toán VietQR, nhận vé QR, hoàn vé |
| **Ban tổ chức (ORGANIZER)** | Tạo sự kiện + hạng vé, gửi duyệt, theo dõi doanh thu, mã giảm giá, hủy sự kiện |
| **Nhân viên soát vé (STAFF)** | Quét QR tại cổng, chặn vé dùng lại / vé giả |
| **Quản trị (ADMIN)** | Duyệt sự kiện, xử lý hoàn tiền, đối soát chuyển khoản, quản lý người dùng |

Chi tiết luật nghiệp vụ: [DOMAIN.md](DOMAIN.md).

## 4. Phạm vi

### Trong phạm vi
- Sự kiện có ghế đánh số (RESERVED) hoặc vé tự do (GA), hạng vé do ban tổ chức định nghĩa
- Quy trình duyệt sự kiện, khung giờ mở bán
- Giữ chỗ 10 phút, giới hạn vé/đơn và vé/tài khoản (chống phe vé)
- Thanh toán chuyển khoản VietQR, webhook ngân hàng idempotent, đối soát giao dịch lệch
- Vé QR có chữ ký, check-in một lần
- Hoàn vé theo chính sách, hủy sự kiện hoàn 100%, mã giảm giá
- Báo cáo doanh thu cho ban tổ chức và nền tảng

### Ngoài phạm vi (có chủ đích)
- Cổng thẻ quốc tế, ví điện tử; hoàn tiền tự động qua ngân hàng
- Hàng đợi ảo cho concert cực lớn, chuyển nhượng vé, hóa đơn VAT
- Microservices (monolith có module rõ ràng là đủ)

## 5. Tiêu chí thành công

- [ ] 100 request đồng thời cho một ghế → **đúng 1** thành công (đã có test)
- [ ] Webhook gửi lặp 3 lần → vé chỉ tạo 1 lần
- [ ] Danh sách sự kiện: số query không tăng theo số dòng (không N+1)
- [ ] Có số đo `EXPLAIN ANALYZE` trước/sau index
- [ ] Mỗi tuần demo được và chỉ ra chỗ áp dụng kiến thức (`KNOWLEDGE_MAP.md`)

## 6. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Chỉ có 3–4 giờ/tuần | Code nền được sinh sẵn, thời gian dùng để đọc hiểu, chạy, tự sửa 1 bài tập nhỏ và chuẩn bị demo. Các mục ⭐ có thể bỏ |
| Khóa học dạy Spring chậm hơn lịch | Tuần 1 chỉ cần Java Core; tuần 2 có thể lùi |
| Lỗi môi trường (JDK, Maven, Docker) | `SETUP.md` ghi sẵn các lỗi đã gặp |
