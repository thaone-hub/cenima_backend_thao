# Star Cinema — Thảo + Ngọc E-Ticket

Giữ module Maven **`cenima/`**, Java 21, Spring Boot 4.1.2 và package `com.backend.cenima`. Authentication Thảo và E-Ticket Ngọc nối qua adapter; SQL Server là DB duy nhất. Không cần nguồn `src/backend` để chạy repo tích hợp.

## Cài và chạy integrated

Từ root repo/worktree, với Java 21 (`JAVA_HOME`), SQL Server TCP/IP và `sqlcmd`:

```powershell
# Chỉ chạy initializer trên DB mới/trống; gặp bảng có sẵn sẽ dừng.
./tools/Initialize-Database.ps1 -Database CINEMA_THAO_ETICKET_DEMO
./tools/Initialize-Database.ps1 -Database CINEMA_THAO_ETICKET_TEST
./tools/Provision-Local.ps1
. ./cenima/.local/env.ps1

# Chuyển đúng ba placeholder seed sang BCrypt thật, không ghi đè password đã có.
./tools/Set-DemoPasswords.ps1
. ./cenima/.local/demo-auth.ps1

# Đổi tài khoản ADMIN seed sang admin123@, nhập mật khẩu khi được hỏi.
# Chỉ dùng trên DB demo local; không sửa CUSTOMER hoặc STAFF.
./tools/Set-LocalAdmin.ps1

$env:DEBUG='false'
./cenima/mvnw.cmd -B -f cenima/pom.xml clean verify
Set-Location cenima
java -jar target/cenima-0.0.1-SNAPSHOT.jar --spring.profiles.active=integrated
```

**Workspace hiện tại đã có DB/login/password demo**: chỉ nạp lại `.local/env.ps1` và `.local/demo-auth.ps1`. Không chạy lại schema lên DB đã có bảng. Login SQL và password demo được sinh ngẫu nhiên, không in ra terminal, lưu dưới `.local` bị Git bỏ qua. Tài khoản SQL chỉ có reader/writer trên hai DB riêng; các helper tạo DB/bootstrap cần Windows Authentication đủ quyền.

SQL Server khác: DBA chạy schema/migration và cấp login ứng dụng, sau đó đặt `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. `cenima/.env.example` chỉ là mẫu; Spring không tự nạp `.env`. Kết nối triển khai dùng `encrypt=true;trustServerCertificate=false`; local test dùng `trustServerCertificate=true` cho chứng thư tự ký. Không ghi password/private key vào Git.

## Mở giao diện và đăng nhập admin

Sau khi đã cấu hình database và build lần đầu, chạy từ thư mục gốc **Cinema**:

```powershell
./tools/Start-Portal.ps1
# Khi vừa sửa code, dừng tiến trình cũ bằng Ctrl+C rồi build/chạy lại:
# ./tools/Start-Portal.ps1 -Build
```

Mở http://127.0.0.1:8080/login.html, nhập tài khoản **`admin123@`** và mật khẩu đã thiết lập. Đăng nhập bằng ADMIN tự chuyển sang http://127.0.0.1:8080/admin.html. Cũng có thể mở thẳng `/admin.html` rồi bấm “Đăng nhập”. Nếu đang dùng tài khoản USER, đăng xuất trước.

Trên máy local đã cấu hình, lấy mật khẩu bằng cách nạp file và sao chép vào clipboard, không in mật khẩu ra terminal:

```powershell
. ./cenima/.local/admin-auth.ps1
Set-Clipboard $env:CINEMA_ADMIN_PASSWORD
```

Máy mới clone không có `.local` hoặc database của máy khác. Hoàn thành mục cài đặt phía trên rồi chạy `./tools/Set-LocalAdmin.ps1` để chọn mật khẩu riêng. Script yêu cầu Java 21, Maven wrapper, `sqlcmd` và Windows Authentication có quyền cập nhật DB `CINEMA_THAO_ETICKET_DEMO`; chỉ đổi đúng tài khoản ADMIN seed/đã cấu hình, giữ UserID và quyền, lưu BCrypt trong DB và thu hồi refresh token cũ. Chạy lại script chỉ khi muốn đổi mật khẩu admin, không chạy mỗi lần mở ứng dụng. Nếu bỏ qua bước này, tài khoản seed vẫn là `admin@cinema.test` với mật khẩu từ `.local/demo-auth.ps1`.

ADMIN xem thống kê, quản lý phim và khóa/mở khóa tài khoản USER/STAFF; không khóa ADMIN tại giao diện này. API `/api/admin/**` yêu cầu quyền ADMIN ở backend. Đăng ký công khai chỉ tạo USER (role `CUSTOMER` trong DB), không cấp quyền ADMIN. Tên đăng nhập `admin123@` được chấp nhận tại form đăng nhập; đăng ký vẫn yêu cầu email hợp lệ.

Trang chủ: http://127.0.0.1:8080/; trang phim: `/movies.html`; quầy kiểm tra vé: `/check-in.html` (STAFF/ADMIN). Nếu kết nối bị từ chối, kiểm tra ứng dụng đã chạy và SQL Server đang hoạt động. Nếu trang quản trị báo chưa đăng nhập, đăng nhập lại bằng tài khoản ADMIN; nhấn Ctrl+F5 sau khi cập nhật giao diện.

Các file giao diện nằm trong `cenima/src/main/resources/static/`: `index.html` và bản sao `demo/index.html`, `movies.html`, `login.html`, `register.html`, `admin.html`, CSS/JavaScript/poster/font trong `assets/`. Danh mục NCC là dữ liệu tham khảo lưu local; quản lý phim admin thao tác dữ liệu SQL Server. Phim NCC chưa có suất chiếu trong Star Cinema dẫn đến nguồn NCC, không tự tạo lịch đặt vé.

## Authentication và vé

### Đặt vé và mở QR trong “Vé của tôi”

Chức năng đặt vé và phát hành JWT đã có trong backend; giao diện “Vé của tôi” sử dụng lại các API này:

1. Đăng nhập, bấm **Vé của tôi** trên menu (hoặc mở `/#my-tickets`).
2. Trong **Đặt vé mới**, chọn phim tại Star Cinema và bấm **Chọn suất chiếu**.
3. Chọn suất chiếu còn ở tương lai, chọn các ghế còn trống. Giá STANDARD/VIP/COUPLE được hiển thị; backend tự tính và kiểm tra lại giá, ghế khi đặt.
4. Bấm **Kiểm tra và xác nhận**, kiểm tra phim, ngày/giờ, phòng, ghế, tổng tiền rồi **Xác nhận đặt vé**. Bấm “Chọn lại” sẽ không tạo đơn.
5. Vé mới hiện ngay trong **Vé đã đặt**. Bấm **Xem vé / QR** để phát hành và xem QR, hoặc **Tải mã QR** để lưu ảnh. STAFF/ADMIN dùng trang `/check-in.html` để xác minh và check-in.

Danh sách để đặt vé lấy từ SQL Server (`/api/movies?status=1` và `status=2`), không lấy ID phim `ncc-*` của danh mục tham khảo trên trang chủ. Nếu phim chưa có suất chiếu tương lai trong bảng `Showtimes`, giao diện báo chưa có lịch; cần có phim, phòng, ghế và suất chiếu hợp lệ trong database mới đặt được. Giao diện không tự tạo suất chiếu hoặc sửa ngày seed cũ. Chưa tích hợp thanh toán thật; backend hiện đánh dấu đơn đặt thành công là `PAID`.

Để thử ngay khi lịch seed cũ đã hết hạn, có thể chủ động thêm lịch demo từ thư mục gốc (cần `sqlcmd` và Windows Authentication có quyền ghi DB demo):

```powershell
./tools/Add-DemoShowtimes.ps1
```

Script chỉ thêm lịch vào `CINEMA_THAO_ETICKET_DEMO`: tối đa ba phim đang chiếu, dùng phòng/ghế hiện có, vào 10:00/14:00/18:00 trong ba ngày tới theo giờ Việt Nam, giá cơ bản 90.000đ. Bỏ qua khung giờ trùng/đè lịch hiện có (chừa 15 phút giữa hai phim); không xóa hoặc sửa lịch/vé cũ. Có thể chọn `-Days 1` đến `-Days 7`. Script không tự chạy khi khởi động ứng dụng.

API dùng trong luồng này: `GET /api/movies/{id}/showtimes`, `GET /api/showtimes/{id}/seats`, `POST /api/bookings`, `GET /api/account/tickets`, `POST /api/tickets/{id}/token`. Access JWT xác thực người đặt; server lấy chủ vé từ phiên đăng nhập, chống trùng ghế bằng ràng buộc SQL. Trùng ghế trả 409 và giao diện tải lại sơ đồ để chọn lại.

QR mặc định dùng **JWT ký số RS256**, không phải mã hóa giấu nội dung. Backend cũng đã có ES256/EdDSA; lần tích hợp giao diện này không thay thuật toán. Chỉ chủ vé hoặc ADMIN được phát hành QR. JWT vé có thời hạn, phân biệt với access token; mỗi vé chỉ check-in một lần. QR quá dài sẽ dùng mã tham chiếu theo cơ chế backend hiện có.

Kiểm thử riêng giao diện bằng Node.js và jsdom (cài trong thư mục local được Git bỏ qua):

```powershell
npm install --prefix cenima/.local/ui-tests --no-audit --no-fund jsdom@26
$env:NODE_PATH = (Resolve-Path cenima/.local/ui-tests/node_modules).Path
node --test tools/test-ticket-ui.cjs
```

Auth giữ nguyên POST `/api/auth/login` với `{email,password}`, POST `/api/auth/refresh` và `/api/auth/logout` với `{refreshToken}`. Login/refresh trả `accessToken`, `refreshToken`, `tokenType`, `expiresIn`; logout trả 204. Token auth RS256 vẫn có `typ=JWT`, `iss=cenima-auth`, `tokenType=ACCESS/REFRESH`.

Sau khi nạp `.local/demo-auth.ps1`, lấy token thật:

```powershell
$base='http://127.0.0.1:8080'
$login=Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType application/json `
  -Body (@{email='customer@cinema.test';password=$env:CINEMA_DEMO_PASSWORD} | ConvertTo-Json)
# Dùng $login.accessToken trong header Authorization: Bearer khi gọi API.
```

Giao diện tự gửi access token sau khi đăng nhập; người dùng xem vé tại “Vé của tôi”, STAFF/ADMIN mở [check-in](http://127.0.0.1:8080/check-in.html). CUSTOMER sở hữu vé hoặc ADMIN phát hành; STAFF/ADMIN verify/check-in. Seed gốc có `customer@cinema.test`, `staff@cinema.test`, `admin@cinema.test`; script thiết lập admin đổi tài khoản cuối thành `admin123@`. Lấy ID vé thực tế từ seed/DB, không mặc định ID trên DB đã có dữ liệu.

Integrated bật **RS256, ES256, EdDSA thật** qua Nimbus/Tink của Thảo; ML-DSA-44 chưa có provider, báo unavailable/503. Vé dùng `typ=eticket+jwt`, `iss=cinema-ticket`, `aud=cinema-checkin`; không thể dùng làm access/refresh token. `X-User-Id` bị bỏ qua trong integrated, kể cả booking.

Profile `demo` vẫn chạy độc lập bằng JJWT RS256 và `X-User-Id` lấy role từ DB; auth runtime Thảo tắt. Profile `integrated` tắt toàn bộ adapter demo, kể cả khi cùng bật `demo,integrated`. Luôn chọn profile rõ ràng; không có fallback.

## Khóa, thời hạn và QR

Integrated sinh/nạp private JWK set tại `cenima/.local/keys/integrated/traditional.jwk`; giữ khóa RSA/EC/Ed25519 và `kid` qua restart. Dùng `TRADITIONAL_KEY_DIRECTORY` là đường dẫn tuyệt đối nếu chạy từ nơi khác. Khóa hỏng làm startup thất bại, không tự thay khóa. Không xóa khóa khi restart.

Vé lấy dữ liệu từ DB; `exp = startTime + movie.duration` theo `Asia/Ho_Chi_Minh`, phát hành lại không gia hạn. Verify không dùng vé. Check-in khóa hàng Ticket trong transaction, chỉ một lần chuyển UNUSED → USED dù có nhiều JWT/thuật toán. QR tự chuyển sang tham chiếu SQL Server nếu vượt version tối đa; thử nhánh này bằng `--ticket.qr-max-version=5`.

## Schema và migration

Backup và chọn DB đích rõ ràng. Không chạy schema mới/seed trên DB đang dùng. Từ root repo:

```powershell
sqlcmd -b -S localhost -E -C -d YOUR_DATABASE -i database/sqlserver/08-upgrade-existing.sql
```

Migration transaction nâng TicketCode 30 → 32, RefreshTokens.Token 500 → 1000, giữ unique constraints/filtered seat index và thêm QR reference NVARCHAR(MAX). Không reset DB. `Cinema_DataBase.sql` là entrypoint SQLCMD tạo DB demo mới, từ chối DB đã có bảng. Hibernate dùng `ddl-auto=validate`, giữ đúng tên bảng/cột SQL gốc.

## Kiểm thử và review

```powershell
. ./cenima/.local/env.ps1
$env:DEBUG='false'
./cenima/mvnw.cmd -B -f cenima/pom.xml clean verify
./tools/Smoke-Test.ps1
./tools/Test-LegacyMigration.ps1
git diff --check
git diff --stat
git status --short
```

JUnit chỉ bật test SQL khi `TEST_DB_URL` trỏ `CINEMA_THAO_ETICKET_TEST`. Thiếu biến này sẽ skip các SQL test. Smoke demo dùng DB test và dọn đúng fixture nó tạo. Test migration tạo bản sao schema/data seed cũ từ `origin/main`, nâng cấp hai lần, so SHA-256 dữ liệu và unique index, giữ lại bản sao để kiểm tra; không chạy trên DB gốc.

[Ghép module và 9 file chung](docs/INTEGRATION.md) · [API](docs/API.md) · [Thiết kế](docs/DESIGN.md) · [Test](docs/TESTING.md) · [Camera/HTTPS](docs/CAMERA.md) · [Thư viện](docs/THIRD_PARTY.md).

Nhánh chứa toàn bộ cập nhật giao diện Star Cinema, quản trị và đặt vé/QR: `feat/ngoc-eticket`.

Clone đúng nhánh này trên máy mới:

```powershell
git clone --branch feat/ngoc-eticket https://github.com/thaone-hub/cenima_backend_thao.git Cinema
cd Cinema
```
