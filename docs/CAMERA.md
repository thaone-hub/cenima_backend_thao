# Camera, ảnh QR và HTTPS

Trang `/demo/check-in.html` dùng qr-scanner 1.4.2 phục vụ local. Camera ưu tiên camera sau, tối đa 5 lần quét/giây; sau lần đọc thành công sẽ dừng camera, điền giá trị và chỉ gọi Verify. Người dùng phải bấm Check-in để dùng vé. Nút bị khóa khi request đang chạy; nhập/sửa token hoặc đổi danh tính làm mất trạng thái verify trước đó.

Ảnh QR đi qua `QrScanner.scanImage`, rồi cùng pipeline API verify/check-in như camera/nhập tay. Không cần CDN hoặc upload ảnh lên server: ảnh được giải mã trong trình duyệt. JWT không lưu vào localStorage; UI dùng textContent/value để hiển thị dữ liệu DB/token.

## Trên máy chạy backend

Mở `http://localhost:8080/demo/check-in.html` hoặc `http://127.0.0.1:8080/demo/check-in.html`, cho phép camera. Nếu không có camera, có thể kiểm tra bằng ảnh hoặc nhập tay. Chọn đúng STAFF/ADMIN trong demo.

## Điện thoại qua LAN

HTTP qua địa chỉ LAN không phải secure context nên browser chặn camera. Dùng HTTPS với chứng thư được điện thoại tin cậy, có SAN khớp IP/tên host. Có thể dùng reverse proxy HTTPS với chứng thư tin cậy, hoặc cấu hình TLS trực tiếp Spring Boot.

Ví dụ chứng thư local để thử (thay `192.168.1.10` bằng IP thật của máy):

```powershell
# Từ cenima. keytool sẽ hỏi mật khẩu; không ghi mật khẩu vào lệnh/Git.
New-Item -ItemType Directory -Force .local/tls | Out-Null
keytool -genkeypair -alias cinema-local -keyalg RSA -keysize 3072 -validity 30 `
  -storetype PKCS12 -keystore .local/tls/cinema.p12 `
  -dname 'CN=cinema-local' -ext 'SAN=DNS:localhost,IP:127.0.0.1,IP:192.168.1.10'
$env:SERVER_SSL_ENABLED = 'true'
$env:SERVER_SSL_KEY_STORE = 'file:.local/tls/cinema.p12'
$env:SERVER_SSL_KEY_STORE_TYPE = 'PKCS12'
$env:SERVER_SSL_KEY_STORE_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'TLS keystore password' -AsSecureString)).Password
$env:SERVER_ADDRESS = '0.0.0.0'
java -jar target/cenima-0.0.1-SNAPSHOT.jar --spring.profiles.active=demo
```

Chỉ truy cập từ điện thoại sau khi đã tin cậy chứng thư và mở cổng cần thiết trong firewall. Chứng thư tự ký chưa được tin cậy có thể vẫn làm browser từ chối camera. Với demo identity qua header, chỉ mở trên mạng thử nghiệm tin cậy.

## Nghiệm thu thủ công còn cần thực hiện

- Camera thật: cấp/từ chối quyền, camera sau, quét JWT trực tiếp và mã tham chiếu, kiểm tra chỉ verify.
- Ảnh PNG QR từ API: chọn ảnh, xác minh thông tin, Check-in riêng, replay bị từ chối.
- Mobile/LAN qua HTTPS tin cậy; màn hình hẹp, bàn phím, thông báo lỗi.
- DevTools Network không có request CDN, không có JWT trong URL; camera không tự check-in khi đọc cùng mã lặp.

Phiên triển khai chưa có trình duyệt kết nối hoặc camera để nghiệm thu các thao tác này; không coi việc phục vụ HTML/JS qua HTTP hoặc test ZXing là bằng chứng camera đã hoạt động trên thiết bị thật.
