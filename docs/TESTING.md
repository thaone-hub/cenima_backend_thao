# Kết quả kiểm thử tích hợp

Ngày nghiệm thu: **26/10/2026, giờ Việt Nam**. Java 21, Spring Boot 4.1.2, Windows, Maven Wrapper và SQL Server local. Không dùng H2/MySQL. Module Maven: `cenima/`.

## Kết quả

| Kiểm tra | Kết quả |
|---|---|
| `clean verify` với đủ `TEST_DB_*` | **46 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS**, đóng gói JAR. |
| 8 test `TraditionalJwtTest` gốc Thảo | PASS; giữ nguyên file test gốc. |
| 24 test nghiệp vụ/SQL/profile Ngọc | PASS; SQL Server test riêng. |
| 4 test adapter | PASS; ba thuật toán thật, lưu/nạp khóa, header/claim, khóa hỏng. |
| 10 test integrated HTTP + SQL Server | PASS; auth, quyền, ba thuật toán, check-in cạnh tranh và restart JVM. |
| `tools/Smoke-Test.ps1` trên JAR | PASS; demo JJWT RS256, booking/movie, QR JWT/tham chiếu, verify/check-in/replay, HTML/JS/worker. |
| Hai lần restart JVM trong smoke demo | PASS; khóa/JWT/reference tồn tại qua restart, phát hành lại không gia hạn. |
| `tools/Test-LegacyMigration.ps1` | PASS; schema cũ 30/500 → 32/1000, chạy migration hai lần, giữ dữ liệu/index. |
| Chạy riêng các lớp SQL khi thiếu TEST_DB_URL | BUILD SUCCESS, 14 mục test bị skip đúng chủ đích; không khởi tạo kết nối DB. Điều kiện đặt trực tiếp trên từng lớp, vì JUnit không kế thừa annotation điều kiện từ lớp cha. |
| `git diff --check`, `node --check` app.js và hai vendor JS | PASS. Liên kết tài liệu local hợp lệ; SHA-256 vendor giữ nguyên theo THIRD_PARTY.md. |
| Đối chiếu nguồn và Git | 165 file nguồn không đổi; checkout Thảo gốc sạch; credential/private JWK bị Git bỏ qua; không có file staged. |

Log build: `cenima/.local/final-verify.log`; XML: `cenima/target/surefire-reports`. Đây là các đường dẫn bị Git bỏ qua. Không đưa log chứa credential/token/key vào bản bàn giao.

## Phạm vi JUnit

| Class | Số test | Nội dung |
|---|---:|---|
| TraditionalJwtTest | 8 | Ba thuật toán thật, sai chữ ký/payload/expiry/algorithm. |
| ThaoTicketAdapterTest | 4 | Ba provider, reload khóa, auth typ mặc định, trusted kid, JSON gốc, khóa hỏng. |
| IntegratedSqlServerTest | 10 | Login/refresh/logout, sai mật khẩu, access/refresh/ticket tách mục đích, quyền, tài khoản bị khóa, bỏ qua header giả mạo, unavailable, tắt demo. |
| BookingSqlServerTest | 1 | PAID/UNUSED, TicketCode 32, ghế BOOKED; rollback. |
| CenimaApplicationTests | 1 | Context/JPA validate trên SQL Server test. |
| CheckInSqlServerTest | 3 | Hai transaction chỉ một thành công, JWT/reference chung trạng thái, từ chối vé hủy. |
| IntegratedProfileTest | 2 | Integrated tắt demo kể cả hai profile; thiếu bridge/provider không tạo thành công giả. |
| JwtProviderTest | 4 | JJWT RS256, reload khóa, chữ ký/header/expiry sai, registry unavailable/duplicate. |
| QrCodeTest | 2 | ZXing đọc PNG hai mode, reference/hash/expiry/input. |
| QrSqlServerTest | 1 | NVARCHAR(MAX), đọc từ service mới; rollback. |
| TicketIssuanceTest | 4 | Quyền, trạng thái, duration, hết hạn cuối suất, phát hành lại không gia hạn. |
| TicketVerificationTest | 6 | Verify không dùng vé, replay, claim sai/thiếu/sai kiểu, đối chiếu DB, role/expiry/header/input. |

Integrated chạy phát hành → QR → verify → check-in → replay riêng cho RS256, ES256 và EdDSA. Hai JWT RS256/ES256 cùng ticket check-in đồng thời trả đúng một 200 và một 409. Reference EdDSA và JWT RS256 chia sẻ trạng thái DB. Test khởi động ba JVM thật: hai lần restart giữ auth access/refresh, ba thuật toán vé, reference, expiry và USED. SQL Server thực hiện pessimistic row lock trong transaction; unit test mock repository không được dùng làm bằng chứng locking.

## Nghiệm thu migration cũ

Script lấy DDL/seed từ `origin/main:Cinema_DataBase.sql`, bỏ CREATE/USE DB cứng rồi tạo **DB test mới** có TicketCode 30, RefreshTokens.Token 500 và bản ghi refresh cũ. Đây là bản sao logic dữ liệu tham khảo Thảo, không phải backup production.

DB nghiệm thu còn giữ: `CINEMA_THAO_ETICKET_MIGRATION_TEST_20261026_232722_006348`. Báo cáo: `cenima/.local/migration-report.json`.

- TicketCode lên 32, RefreshTokens.Token lên 1000, QR Token NVARCHAR(MAX).
- SHA-256 toàn bộ dữ liệu bảng cũ và tên/định nghĩa unique indexes giữ nguyên.
- Migration lần hai thành công, không đổi dữ liệu/index.
- Smoke unique ghế, hủy giải phóng ghế và mã vé dài PASS; rollback.
- Không xóa/reset DB gốc hoặc DB test; fixture chỉ dọn bản ghi do test tạo.

## Chạy lại

Từ root worktree/repo:

```powershell
. ./cenima/.local/env.ps1
$env:DEBUG='false'
./cenima/mvnw.cmd -B -f cenima/pom.xml clean verify
./tools/Smoke-Test.ps1
./tools/Test-LegacyMigration.ps1
git diff --check
node --check cenima/src/main/resources/static/demo/app.js
```

Chỉ đặt `TEST_DB_*` cho `CINEMA_THAO_ETICKET_TEST`. Không trỏ test sang DB đang dùng. Smoke từ chối DB khác/cổng bị chiếm và chỉ dừng JVM do nó tạo. Migration cần Windows Authentication có quyền tạo DB test và giữ bản sao để review. Credential lưu trong `.local`, không commit.

## Chưa nghiệm thu / dependency còn thiếu

- **Browser/camera/ảnh/clipboard/layout/responsive:** runtime báo `No browser is available`. HTTP và ZXing round-trip không chứng minh camera/ảnh hoạt động trong browser. Dùng checklist [CAMERA.md](CAMERA.md) trên thiết bị thật.
- **ML-DSA-44:** thiếu provider thật Hương; unavailable/503 đã được kiểm tra. Chưa có benchmark hoặc kiểm tra QR ML-DSA thực tế.
- **Mobile/LAN HTTPS, nhiều instance, kho khóa dùng chung, key rotation:** chưa nghiệm thu triển khai. Cần chứng thư tin cậy và quản lý khóa ngoài Git.
