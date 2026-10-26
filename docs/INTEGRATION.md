# Tích hợp Thảo + Ngọc

## Worktree và phạm vi

- Repo: `thaone-hub/cenima_backend_thao`, giữ module Maven `cenima/`.
- Worktree: `src/integration-thao`, branch `feat/ngoc-eticket`, base `origin/main` sau fetch: `7c5148bacda1a3472106a7ebade05376306f5a51`.
- Worktree ban đầu sạch; tiếp nối branch/worktree có sẵn, không reset hoặc ghi đè thay đổi của người khác.
- Chỉ thêm file Ngọc chưa tồn tại; không copy đè dự án. Chín file chung ghép riêng. Nguồn Ngọc và checkout Thảo gốc được đối chiếu SHA-256 trước/sau.
- Chưa commit/push. Review cả `git diff` và file mới qua `git status --short --untracked-files=all`.

Diff bàn giao: **20 file tracked sửa, 85 file mới**. File mới gồm 62 trong `cenima/`, 9 SQL, 6 tài liệu, 7 công cụ và `.gitignore`. `git diff --stat` chỉ hiển thị file tracked; không tính 85 file chưa stage. README gốc là UTF-16, bản bàn giao dùng UTF-8 nên Git có thể hiển thị binary diff. SQL gốc chuyển thành entrypoint an toàn; DDL/seed mới nằm trong `database/sqlserver/`.

## Chín file chung khác nội dung

Các đường dẫn Java dưới `cenima/src/main/java/com/backend/cenima/`.

| File | Kết quả ghép và lý do |
|---|---|
| cenima/pom.xml | Giữ Java 21, Boot 4.1.2, Nimbus 10.10, Tink 1.24.0, Lombok/compiler Thảo; thêm ZXing 3.5.3, giữ JJWT demo. |
| Controller/BookingController.java | Giữ endpoint/body/response; TicketActorProvider nối identity demo/integrated, loại bỏ giả mạo X-User-Id khi integrated. |
| Entity/RefreshToken.java | Giữ độ dài 1000 Thảo, không lùi về 500; migration mở rộng SQL cũ. |
| Entity/Ticket.java | TicketCode 32 khớp UUID booking. |
| Repository/TicketRepository.java | Giữ query cũ, thêm PESSIMISTIC_WRITE cho check-in. |
| Service/BookingService.java | Giữ booking/transaction, dùng Clock giờ Việt Nam. |
| Service/MovieService.java | Giữ API phim/suất, dùng Clock thống nhất. |
| cenima/src/main/resources/application.properties | DB từ môi trường, validate schema, giữ tên SQL PascalCase, cấu hình ticket/key directory; bỏ ddl-auto update. |
| cenima/src/test/java/com/backend/cenima/CenimaApplicationTests.java | Giữ context test, chọn profile và DB test riêng; thêm suite Ngọc/integrated, giữ nguyên 8 test TraditionalJwtTest. |

## Adapter JWT thật

Giữ contract Ngọc: `JwtSigner.algorithm/sign(Map)`, `JwtVerifier.algorithm/verify(String)`, `VerifiedJwt(algorithm,keyId,type,claims)`, `TicketActorProvider`. `ThaoTicketJwtAdapter` chuyển Map sang JWTClaimsSet; `ThaoTicketAdapters` đăng ký cặp signer/verifier theo từng thuật toán.

| Algorithm | Provider Thảo |
|---|---|
| RS256 | Rs256JwtSigner, Nimbus RSASSASigner/RSASSAVerifier. |
| ES256 | Es256JwtSigner, Nimbus ECDSASigner/ECDSAVerifier, P-256. |
| EdDSA | EdDsaJwtSigner, Nimbus Ed25519Signer/Verifier + Tink. |
| ML-DSA-44 | Chưa có provider; unavailable, phát hành trả 503. |

Các provider Thảo giữ `getAlgorithm`, `sign(JWTClaimsSet)`, `verify`. Overload mới `(JWTClaimsSet, JOSEObjectType)` cho phép vé dùng typ=eticket+jwt; hàm sign cũ vẫn typ=JWT cho auth/benchmark/test. Nimbus/Tink thực hiện mật mã, không có thuật toán tự viết hoặc signer thành công giả.

Verify kiểm tra chữ ký, algorithm, trusted kid và expiry qua provider Thảo. Adapter kiểm tra typ rồi đọc JSON gốc **sau xác minh**, giữ kiểu số iat/exp thay vì chuyển Date hoặc ép chuỗi. Cấm key URL, embedded key và critical header; business validator tiếp tục kiểm tra claims/DB.

## Authentication bridge và sửa nền cần thiết

Thảo xác minh access JWT RS256, typ=JWT, iss=cenima-auth, tokenType=ACCESS, subject=email. Filter tạo UserDetails từ DB. `ThaoAuthenticationBridge` nhận đúng UserDetails, tra email ra userId/role/active. Không parse tên principal thành ID, không tin X-User-Id hoặc role client khai.

Access/refresh bị ticket pipeline từ chối; e-ticket bị access filter và refresh từ chối. Auth API giữ request/response và thời hạn: access 15 phút, refresh 7 ngày, refresh không xoay token, logout thu hồi refresh nhưng không thu hồi ngay access còn hạn.

- SecurityConfig/AuthController/AuthService/CustomUserDetailsService chỉ chạy integrated, tránh xung đột demo.
- SecurityConfig đăng ký đủ ba provider và persistent KeyManager; giữ Bearer stateless, public auth routes, không bật Basic/form login.
- JWT filter chỉ đăng ký trong security chain, tắt servlet auto-registration để tránh chạy hai lần.
- Filter chỉ bắt lỗi authentication; lỗi nghiệp vụ check-in 409 không biến thành 401. Access token của tài khoản bị khóa bị từ chối.
- No-store áp dụng auth/ticket. HTML cùng origin, token không lưu localStorage. UI tải lại thuật toán sau khi nhập access token.

## Profile và khóa

- `demo & !integrated`: JJWT RS256, DemoActorProvider, DemoSecurityConfig, DemoAccountsController; auth runtime Thảo tắt.
- `integrated`: auth Thảo, bridge và ba adapter Nimbus thật; mọi adapter demo tắt kể cả khi bật hai profile.
- Không chọn profile sẽ thiếu actor provider và fail startup, không fallback.

Runtime dùng `KeyManager(Path)`, lưu/nạp private JWK set tại `.local/keys/integrated/traditional.jwk`, file lock và atomic move. No-arg KeyManager giữ sinh khóa tạm cho test/benchmark gốc. Không có khóa trong classpath; khóa hỏng/thiếu thành phần làm fail startup thay vì thay khóa. Giữ cùng directory qua restart; nhiều instance cần kho khóa dùng chung được quản lý riêng. Dùng `TRADITIONAL_KEY_DIRECTORY` tuyệt đối khi thay working directory. File khóa/credential bị `.gitignore` loại trừ.

## Schema và migration

SQL authoritative, JPA validate, physical naming giữ tên SQL gốc. Schema mới: TicketCode VARCHAR(32), RefreshTokens.Token VARCHAR(1000), QR Token NVARCHAR(MAX). `08-upgrade-existing.sql` bọc migration 02/04/06/07 trong transaction, giữ dữ liệu/unique constraints/filtered index ghế. Chạy SQLCMD từ root repo, chọn DB bằng `-d`, backup trước khi áp dụng lên DB có dữ liệu.

`Cinema_DataBase.sql` chuyển thành entrypoint SQLCMD cho DB demo mới, từ chối DB có bảng để tránh script cũ xóa/tạo lại dữ liệu. Helper initialize cũng chỉ nhận DB trống. Không reset DB hiện có.

Bản sao schema cũ tạo từ DDL/seed đúng origin/main, thêm refresh cũ để kiểm tra bảo toàn; là bản sao logic dữ liệu tham khảo, không phải backup production. Migration chạy hai lần, so hash dữ liệu/index và giữ DB test để review. Kết quả và lệnh chạy tại [TESTING.md](TESTING.md).

## Ghép tiếp Trang và Hương

Trang gọi provider/adapter trực tiếp với payload cố định, tách tạo/nạp khóa, DB, QR và HTTP khỏi benchmark mật mã. Hương thêm provider thật theo contract và đăng ký signer/verifier tên wire `ML-DSA-44`, không đổi nghiệp vụ vé/check-in. Chỉ công bố available sau test thật. Check-in chéo RS256/ES256 và replay JWT/reference chéo EdDSA/RS256 đã chạy trên SQL Server.
