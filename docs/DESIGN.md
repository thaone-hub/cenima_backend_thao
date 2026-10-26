# Thiết kế E-Ticket sau tích hợp

Chi tiết ghép và lý do sửa nền: [INTEGRATION.md](INTEGRATION.md). Module Maven là `cenima/`; auth Thảo và nghiệp vụ Ngọc nối qua contract/adapter.

## Phát hành và thời gian

Service đọc ticket, booking, user, phim, suất và ghế từ DB trong transaction. Chủ vé hoặc ADMIN được xem/phát hành. Booking phải PAID, ticket UNUSED, suất chưa kết thúc. `exp = startTime + movie.duration` theo `Asia/Ho_Chi_Minh`, đổi sang epoch giây. Duration thiếu/sai bị từ chối. Khi `now >= exp`, vé hết hạn; phát hành lại giữ ticketId/exp. Cùng giây có thể sinh cùng JWT.

Payload: ticketId, movieId, showtimeId là số nguyên; seatCode=rowName+seatNumber; iat/exp là epoch giây; iss=cinema-ticket, aud=cinema-checkin. Header typ=eticket+jwt và kid tin cậy. Adapter giữ kiểu JSON gốc sau xác minh, không ép chuỗi/số thập phân thành số nguyên. Phần giây lẻ DB được quy về độ phân giải giây bằng toEpochSecond khi phát hành và đối chiếu.

## QR

ZXing 3.5.3, ECC M, PNG 512px, quiet zone 4. Nếu JWT vượt QR version tối đa (mặc định 25, cấu hình 5–40), tạo `etkt:` + Base64URL của 32 byte SecureRandom. DB lưu SHA-256 toàn chuỗi reference làm khóa, JWT trong Token NVARCHAR(MAX), TicketID và ExpiresAtEpoch. Không có endpoint công khai đổi reference lấy JWT; verify không xóa reference. API phát hành vẫn trả JWT đầy đủ cho người có quyền.

## Verify và check-in

STAFF/ADMIN verify/check-in với trường `value` chứa JWT/reference. Giới hạn 32 KiB UTF-8 trước strip và sau resolve. Dùng alg chưa tin cậy để chọn verifier whitelist, xác minh rồi kiểm tra header/claims và đối chiếu DB. Cấm none, URL khóa, embedded key, crit, b64, zip. Thuật toán chỉ available khi có cả signer/verifier thật.

Verify transaction read-only không ghi trạng thái. Check-in lấy PESSIMISTIC_WRITE trên hàng Ticket trước khi nạp ticket, đọc trạng thái và đối chiếu DB trong cùng transaction, đặt USED/UsedAt rồi flush. SQL Server dùng updlock/holdlock/rowlock. Resolve reference chỉ lấy token. Mọi JWT/thuật toán/reference cùng ticket dùng chung hàng DB, chỉ một check-in thành công.

Module hủy/đổi vé về sau phải dùng cùng quy tắc khóa. Đổi phim/suất/ghế/duration làm JWT cũ không khớp DB, cần chính sách phát hành lại. Không reset USED về UNUSED để tái sử dụng vé.

## Identity, khóa và schema

Integrated nhận UserDetails có username=email do filter Thảo xác minh; bridge lấy ID/role/active từ DB. X-User-Id không tác động. Auth giữ typ=JWT, iss=cenima-auth; vé không dùng làm access/refresh token. Demo dùng header identity riêng, tắt khi integrated. Bearer stateless giữ cấu hình CSRF Thảo; chuyển sang cookie/session cần cơ chế CSRF tương ứng.

RS256/ES256/EdDSA do Nimbus/Tink Thảo thực hiện qua adapter. Demo RS256 do JJWT thực hiện. Không tự viết mật mã. Khóa integrated lưu/nạp private JWK set ngoài classpath/Git, giữ qua restart; khóa hỏng làm startup thất bại. SQL quản lý schema, JPA validate. Auth/ticket response no-store; UI dùng textContent/value, không lưu token trong localStorage.
