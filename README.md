# Star Cinema — Hệ thống đặt vé và xác thực vé điện tử bằng chữ ký số

> **Dự án môn Cơ sở an toàn thông tin**
>
> Hệ thống đặt vé xem phim trực tuyến tích hợp JWT, chữ ký số, mã QR và kiểm soát check-in. Dự án được sử dụng để nghiên cứu, so sánh chữ ký số truyền thống (RS256, ES256, EdDSA) với chữ ký số hậu lượng tử ML-DSA-44 và làm nền tảng phát triển mô hình Hybrid.

**Công nghệ:** Java 21 · Spring Boot 4.1.2 · Microsoft SQL Server · Spring Security · JWT/JWS · Bouncy Castle · ZXing

**Phạm vi:** Môi trường học tập và thực nghiệm, chưa phải hệ thống thương mại.

---

## 1. Giới thiệu dự án

Star Cinema mô phỏng quá trình đặt vé và kiểm soát vé tại rạp chiếu phim, từ việc lựa chọn phim, suất chiếu và ghế ngồi đến phát hành vé điện tử và xác nhận sử dụng vé.

Bên cạnh nghiệp vụ đặt vé, hệ thống tích hợp cơ chế xác thực người dùng, phân quyền theo vai trò và chữ ký số nhằm nghiên cứu các giải pháp bảo vệ tính toàn vẹn, tính xác thực của vé điện tử.

### 1.1. Chức năng chính

| Vai trò | Chức năng |
|---|---|
| CUSTOMER | Xem phim, chọn suất chiếu, đặt ghế, xem vé và lấy mã QR |
| STAFF | Quét QR, xác minh vé, thực hiện check-in |
| ADMIN | Quản lý tài khoản, phim, xem thống kê và kiểm tra vé |

Hệ thống hỗ trợ phân biệt giữa việc **Verify** (xác minh vé) và **Check-in** (đánh dấu vé đã sử dụng).

### 1.2. Các thuật toán chữ ký số

| Thuật toán | Nhóm | Mục đích |
|---|---|---|
| RS256 | RSA + SHA-256 | Chữ ký số truyền thống |
| ES256 | ECDSA P-256 + SHA-256 | Chữ ký số truyền thống |
| EdDSA | Ed25519 | Chữ ký số truyền thống |
| ML-DSA-44 | Chữ ký số hậu lượng tử | Nghiên cứu khả năng bảo vệ hậu lượng tử |

Các thuật toán được tích hợp vào pipeline phát hành và xác minh vé điện tử thông qua các thành phần Signer và Verifier tương ứng.

**Lưu ý về phạm vi:** Việc hệ thống hỗ trợ lựa chọn từng thuật toán không đồng nghĩa với việc đã triển khai Hybrid. Mô hình Hybrid yêu cầu bảo vệ cùng dữ liệu bằng hai chữ ký và áp dụng chính sách xác minh bắt buộc cả hai.

---

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Java, Spring Boot, REST API |
| Frontend | HTML, CSS, JavaScript |
| Database | Microsoft SQL Server |
| ORM | Spring Data JPA, Hibernate |
| Xác thực | Spring Security, JWT |
| Mật khẩu | BCrypt |
| JWT/JWS truyền thống | Nimbus JOSE + JWT, Tink, JJWT |
| Chữ ký hậu lượng tử | Bouncy Castle |
| Mã QR | ZXing và thư viện quét QR trên frontend |
| Kiểm thử | JUnit 5, Maven |
| Công cụ phát triển | VS Code, Git, SQL Server, Postman |

---

## 3. Kiến trúc hệ thống

### 3.1. Quy trình đặt vé và phát hành QR

```text
CUSTOMER
   |
   v
Đăng nhập
   |
   v
Chọn phim → Suất chiếu → Ghế
   |
   v
POST /api/bookings
   |
   v
SQL Server
Booking + Ticket (UNUSED)
   |
   v
Yêu cầu phát hành vé
   |
   v
POST /api/tickets/{ticketId}/token
   |
   v
Ký JWT bằng thuật toán được chọn
   |
   v
Tạo QR hoặc mã tham chiếu etkt:
   |
   v
Khách hàng nhận vé điện tử
```

### 3.2. Quy trình xác minh và check-in

```text
STAFF / ADMIN
   |
   v
Đăng nhập
   |
   v
Mở /check-in.html
   |
   v
Quét QR / Tải ảnh / Nhập JWT
   |
   v
POST /api/tickets/verify
   |
   v
Xác minh chữ ký và kiểm tra vé
   |
   v
Hiển thị kết quả xác minh
   |
   v
Nhân viên xác nhận Check-in
   |
   v
POST /api/tickets/check-in
   |
   v
Ticket: UNUSED → USED
```

Verify không thay đổi trạng thái sử dụng vé. Check-in thành công đánh dấu vé đã sử dụng, giúp ngăn chặn việc sử dụng lại cùng một vé.

### 3.3. Phân biệt các loại JWT

**JWT đăng nhập:** Được phát hành sau khi xác thực tài khoản, sử dụng để truy cập API và thực hiện phân quyền. Trong hệ thống hiện tại, luồng xác thực người dùng sử dụng RS256.

**JWT vé điện tử:** Chứa thông tin vé và được ký số nhằm hỗ trợ xác minh tính toàn vẹn, nguồn gốc của dữ liệu vé.

JWT vé điện tử không được sử dụng thay thế access token đăng nhập.

---

## 4. Cấu trúc thư mục dự án

```text
cenima_backend_thao/
|
|-- README.md
|-- cenima/
|   |-- pom.xml
|   |-- mvnw.cmd
|   |-- src/
|       |-- main/
|       |   |-- java/com/backend/cenima/
|       |   |   |-- Controller/
|       |   |   |-- Service/
|       |   |   |-- Entity/
|       |   |   |-- Repository/
|       |   |   |-- Security/
|       |   |   |   |-- auth/
|       |   |   |   |-- contract/
|       |   |   |   |-- adapter/
|       |   |   |   |-- traditional/
|       |   |   |   |-- pq/
|       |   |   |-- config/
|       |   |
|       |   |-- resources/
|       |       |-- application.properties
|       |       |-- application-integrated.properties
|       |       |-- static/
|       |           |-- index.html
|       |           |-- login.html
|       |           |-- admin.html
|       |           |-- check-in.html
|       |           |-- assets/
|       |
|       |-- test/
|
|-- database/
|   |-- sqlserver/
|
|-- tools/
|-- docs/
```

Các thành phần chính liên quan đến ML-DSA-44:

```text
Security/pq/
|-- MlDsaKeyManager.java
|-- MlDsaJwtSigner.java
|-- MlDsaJwtVerifier.java
|-- MlDsaJwtService.java

config/
|-- MlDsaTicketConfig.java

src/test/java/com/backend/cenima/
|-- MlDsaJwtTest.java
```

Thư mục `cenima/.local/` được tạo trên từng máy để lưu thông tin môi trường và dữ liệu nhạy cảm. Không đưa thư mục này lên GitHub.

---

## 5. Chuẩn bị môi trường

### 5.1. Yêu cầu

- Java JDK 21 trở lên.
- Microsoft SQL Server.
- VS Code hoặc IDE hỗ trợ Java.
- Git.
- PowerShell trên Windows.
- `sqlcmd` nếu sử dụng các script cấu hình database.
- Maven Wrapper có sẵn trong dự án.

Kiểm tra các công cụ:

```powershell
java -version
git --version
sqlcmd -?
```

### 5.2. Clone source

Sau khi nhánh tích hợp `merge_test_2` được push lên GitHub:

```powershell
git clone -b merge_test_2 --single-branch https://github.com/thaone-hub/cenima_backend_thao.git

cd cenima_backend_thao
```

Nếu đã có repository trên máy, không cần clone lại.

### 5.3. Khởi tạo database lần đầu

Chỉ thực hiện khi cài đặt trên một database mới hoặc trống:

```powershell
.\tools\Initialize-Database.ps1 -Database CINEMA_THAO_ETICKET_DEMO
```

Sau đó tạo cấu hình kết nối local:

```powershell
.\tools\Provision-Local.ps1
```

Thiết lập mật khẩu cho các tài khoản demo theo hướng dẫn của script:

```powershell
.\tools\Set-DemoPasswords.ps1
```

**Cảnh báo:** Không chạy lại script khởi tạo database trên database đã có dữ liệu. Cần sao lưu trước khi thực hiện migration hoặc cập nhật dữ liệu.

### 5.4. Tài khoản demo

| Vai trò | Email |
|---|---|
| CUSTOMER | `customer@cinema.test` |
| STAFF | `staff@cinema.test` |
| ADMIN | `admin@cinema.test` |

Mật khẩu do từng máy thiết lập và không được lưu trong README.

Có thể thiết lập lại mật khẩu riêng cho ADMIN trên database demo:

```powershell
.\tools\Set-LocalAdmin.ps1 -Account "admin@cinema.test"
```

Script chỉ sử dụng cho môi trường local được hỗ trợ và yêu cầu quyền truy cập SQL Server tương ứng.

---

## 6. Khởi động ứng dụng

Tại thư mục gốc repository, chạy:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\tools\Start-Portal.ps1 -Build
```

Tham số `-Build` yêu cầu đóng gói lại ứng dụng trước khi khởi động.

Nếu đã build và không thay đổi mã nguồn, có thể chạy:

```powershell
.\tools\Start-Portal.ps1
```

Giữ Terminal đang chạy backend. Nhấn `Ctrl + C` khi cần dừng ứng dụng.

Để chạy ở cổng khác:

```powershell
.\tools\Start-Portal.ps1 -Port 8081
```

### 6.1. Các trang chính

| Trang | URL |
|---|---|
| Trang chủ Star Cinema | `http://localhost:8080/` |
| Đăng nhập | `http://localhost:8080/login.html` |
| Danh sách phim | `http://localhost:8080/movies.html` |
| Quản trị | `http://localhost:8080/admin.html` |
| Xác minh và check-in | `http://localhost:8080/check-in.html` |

Trang quản trị yêu cầu ADMIN. Trang check-in yêu cầu STAFF hoặc ADMIN.

Trong trường hợp ADMIN được tự động chuyển về `/admin.html` sau đăng nhập, có thể mở trực tiếp `/check-in.html` trên cùng tab trình duyệt.

---

## 7. Hướng dẫn sử dụng

### 7.1. Đặt vé

1. Đăng nhập bằng tài khoản CUSTOMER.
2. Truy cập mục đặt vé trên Star Cinema.
3. Chọn phim và suất chiếu tương lai.
4. Chọn ghế còn trống.
5. Kiểm tra thông tin và xác nhận đặt vé.
6. Truy cập **Vé của tôi** để xem các vé đã đặt.

Dữ liệu đặt vé được lưu trong SQL Server. Mỗi ghế được đặt tương ứng với một vé điện tử.

Hệ thống demo chưa tích hợp cổng thanh toán thực tế. Trạng thái thanh toán trong dữ liệu mẫu được sử dụng để mô phỏng nghiệp vụ.

### 7.2. Phát hành vé điện tử

Tại mục **Vé của tôi**, chọn vé cần xem và sử dụng chức năng **Xem vé / QR**.

Frontend gửi yêu cầu đến:

```http
POST /api/tickets/{ticketId}/token
```

Backend tạo JWT được ký số, sau đó sinh ảnh QR.

Trong bản Star Cinema nền trước khi merge, nút xem vé sử dụng RS256. Danh sách thuật toán được backend hỗ trợ có thể kiểm tra tại `/api/tickets/algorithms`. Nếu giao diện sau merge có thêm bộ chọn thuật toán, cần kiểm thử lại từng lựa chọn trước khi nghiệm thu.

### 7.3. Xác minh QR

Đăng nhập bằng STAFF hoặc ADMIN, sau đó mở:

`http://localhost:8080/check-in.html`

Có thể nhập vé theo ba cách:

- Dán JWT hoặc mã tham chiếu `etkt:`.
- Tải file ảnh QR từ máy.
- Quét QR bằng camera.

Khi tải ảnh QR, frontend sử dụng `FileReader.readAsDataURL()` để nạp ảnh trước khi giải mã. Cách này tránh lỗi ảnh tạm `blob:` bị chặn bởi Content Security Policy của Star Cinema.

Sau khi đọc được mã, hệ thống gọi:

```http
POST /api/tickets/verify
```

Nếu vé hợp lệ, hệ thống hiển thị thông tin cần thiết để nhân viên đối chiếu.

### 7.4. Check-in

Sau khi xác minh thành công, nhân viên nhấn **Check-in**.

Hệ thống gọi:

```http
POST /api/tickets/check-in
```

Kết quả mong đợi:

| Thao tác | Kết quả |
|---|---|
| Verify vé hợp lệ | Hiển thị thông tin vé |
| Check-in lần đầu | Vé chuyển từ `UNUSED` sang `USED` |
| Check-in lần thứ hai | Bị từ chối |
| JWT bị sửa trái phép | Chữ ký không hợp lệ |
| CUSTOMER gọi API check-in | Bị từ chối do thiếu quyền |

Quét QR không đồng nghĩa với việc vé đã được sử dụng. Việc cập nhật trạng thái chỉ xảy ra khi Check-in thành công.

---

## 8. Dữ liệu phim và suất chiếu demo

Star Cinema sử dụng danh mục phim NCC làm dữ liệu tham khảo trên giao diện. Chức năng đặt vé lấy dữ liệu phim và suất chiếu từ SQL Server.

Hai nguồn dữ liệu này không tự đồng bộ với nhau.

Nếu repository đã bổ sung file:

`database/sqlserver/09-sync-ncc-catalog-demo.sql`

có thể sử dụng file để cập nhật danh mục phim trong database demo.

**Trước khi chạy:**

1. Sao lưu database `CINEMA_THAO_ETICKET_DEMO`.
2. Kiểm tra đúng database đích.
3. Chạy script ở chế độ xem trước với `@PreviewOnly = 1`.
4. Kiểm tra kết quả.
5. Đổi `@PreviewOnly = 0` và chạy lại nếu muốn lưu thay đổi.

Suất chiếu được tạo bởi script là **lịch giả lập phục vụ kiểm thử**, không phải lịch chiếu chính thức của NCC.

Khi lịch chiếu đã hết hạn, có thể bổ sung dữ liệu demo bằng:

```powershell
.\tools\Add-DemoShowtimes.ps1 -Days 3
```

Chỉ sử dụng trên môi trường demo đã cấu hình đúng.

---

## 9. JWT và chữ ký số

### 9.1. JWT đăng nhập

Access token được cấp sau khi xác thực người dùng, sử dụng để truy cập các API yêu cầu đăng nhập.

Các yêu cầu được gửi theo định dạng:

```http
Authorization: Bearer <access_token>
```

Hệ thống áp dụng phân quyền theo vai trò CUSTOMER, STAFF và ADMIN.

### 9.2. JWT vé điện tử

JWT vé điện tử được ký số và chứa các thông tin như mã vé, phim, suất chiếu, ghế và thời hạn hiệu lực.

Header của token vé ML-DSA-44 có dạng:

```json
{
  "alg": "ML-DSA-44",
  "typ": "eticket+jwt",
  "kid": "cinema-mldsa44-v1"
}
```

Khi xác minh, hệ thống kiểm tra chữ ký bằng khóa công khai tương ứng. Các điều kiện nghiệp vụ như thời hạn và trạng thái vé được xử lý ở lớp nghiệp vụ.

### 9.3. Cấu hình ML-DSA-44

Trong profile `integrated`, thuật toán ML-DSA-44 được **bật mặc định** để phục vụ việc phát hành và xác minh vé điện tử.

Spring Boot tự động khởi tạo các thành phần quản lý khóa, ký số và xác minh chữ ký ML-DSA-44 khi khởi động ứng dụng.

Có thể chủ động tắt ML-DSA bằng cách thiết lập:

```powershell
$env:CINEMA_MLDSA_ENABLED = "false"
```

Sau đó khởi động ứng dụng:

```powershell
.\tools\Start-Portal.ps1 -Build
```

Theo cấu hình hiện tại, thư mục lưu khóa ML-DSA mặc định là:

`${user.home}/.cinema/mldsa44`

Có thể thay đổi đường dẫn bằng thuộc tính `cinema.mldsa.key-dir`.

**Lưu ý:** Bật ML-DSA mặc định không có nghĩa tất cả JWT đều sử dụng ML-DSA. JWT đăng nhập vẫn sử dụng RS256; ML-DSA chỉ được đăng ký để phục vụ chức năng chữ ký số vé điện tử.

### 9.4. Kiểm tra cặp khóa ML-DSA

`MlDsaKeyManager` thực hiện:

- Nạp khóa riêng và khóa công khai từ file.
- Tạo cặp khóa mới nếu chưa tồn tại.
- Từ chối khi chỉ tồn tại một file khóa.
- Kiểm tra khả năng ký và xác minh bằng cặp khóa đã nạp.
- Từ chối cặp khóa bị hỏng hoặc không khớp mà không tự động thay thế.

### 9.5. JWT đầy đủ và mã QR tham chiếu

Với các JWT có dung lượng lớn, hệ thống có thể tạo QR chứa mã tham chiếu dạng:

```text
etkt:<reference>
```

Khi quét, backend truy xuất JWT tương ứng từ database và thực hiện xác minh.

Mã tham chiếu giúp giảm lượng dữ liệu cần mã hóa trong QR, nhưng không thay thế bước kiểm tra chữ ký số.

### 9.6. Định hướng nghiên cứu Hybrid

Đề tài hướng đến so sánh các cấu hình:

- RS256, ES256, EdDSA.
- ML-DSA-44 độc lập.
- RS256 + ML-DSA-44.
- ES256 + ML-DSA-44.
- EdDSA + ML-DSA-44.

Trong mô hình Hybrid đề xuất, cùng một payload phải được bảo vệ bằng hai chữ ký và chỉ được chấp nhận khi cả hai chữ ký đều hợp lệ.

Cần đánh giá hiệu năng ký, hiệu năng xác minh, kích thước token, chi phí lưu trữ, tác động đến QR và khả năng chống các kịch bản giả mạo.

**Mô hình Hybrid hai chữ ký là nội dung cần triển khai và nghiệm thu riêng; không được coi là đã hoàn thành chỉ vì từng thuật toán độc lập hoạt động thành công.**

---

## 10. API chính

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/refresh` | Cấp lại access token |
| POST | `/api/auth/logout` | Đăng xuất và thu hồi refresh token |
| GET | `/api/movies` | Lấy danh sách phim |
| GET | `/api/movies/{movieId}/showtimes` | Lấy suất chiếu |
| GET | `/api/showtimes/{showtimeId}/seats` | Xem ghế |
| POST | `/api/bookings` | Đặt vé |
| GET | `/api/tickets/algorithms` | Danh sách thuật toán hỗ trợ |
| POST | `/api/tickets/{ticketId}/token` | Phát hành JWT và QR |
| POST | `/api/tickets/verify` | Xác minh vé |
| POST | `/api/tickets/check-in` | Xác minh và sử dụng vé |

Các API yêu cầu xác thực phải được gọi với access token có vai trò phù hợp.

---

## 11. Kiểm thử hệ thống

### 11.1. Kiểm thử ML-DSA-44

Chạy từ thư mục gốc:

```powershell
.\cenima\mvnw.cmd -B -f cenima\pom.xml -Dtest=MlDsaJwtTest test
```

Bộ test ML-DSA hợp nhất được thiết kế để kiểm tra:

1. Ký và xác minh JWT hợp lệ.
2. Phát hiện payload bị thay đổi.
3. Phát hiện chữ ký bị thay đổi.
4. Từ chối khóa xác minh không tương ứng.
5. Nạp lại khóa sau khởi động.
6. Từ chối header không hợp lệ hoặc trùng thuộc tính.
7. Từ chối claims trùng lặp.
8. Phát hiện khóa bị thiếu, hỏng hoặc không khớp.
9. Từ chối JWS không đúng cấu trúc.

Những kiểm thử này phải được chạy lại sau khi merge. Không coi là đã đạt nếu chưa nhận được kết quả kiểm thử thành công.

### 11.2. Kiểm thử toàn bộ dự án

```powershell
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean verify
```

Các bài test tích hợp có thể yêu cầu database kiểm thử riêng. Không chạy bài kiểm thử có thao tác ghi dữ liệu trên database production.

### 11.3. Kiểm thử giao diện

Các luồng cần nghiệm thu:

- CUSTOMER đăng nhập và đặt vé.
- Phát hành JWT/QR.
- STAFF/ADMIN đọc QR từ ảnh.
- Verify vé hợp lệ.
- Check-in lần đầu.
- Từ chối check-in lần thứ hai.
- Từ chối JWT bị chỉnh sửa.
- Kiểm tra quyền truy cập theo vai trò.

Quét camera, hiệu năng tải lớn và quy trình Hybrid cần được nghiệm thu riêng.

---

## 12. Lỗi thường gặp

| Hiện tượng | Hướng kiểm tra |
|---|---|
| `401 UNAUTHENTICATED` | Kiểm tra trạng thái đăng nhập và access token |
| `403 FORBIDDEN` | Kiểm tra quyền CUSTOMER, STAFF, ADMIN |
| QR không giải mã được | Kiểm tra ảnh, JavaScript, CSP và thư viện quét |
| `HTMLImageElement ... broken state` | Kiểm tra cách đọc ảnh và chính sách `img-src` |
| Phim không có suất chiếu | Kiểm tra dữ liệu Showtimes và thời gian hiện tại |
| Vé đã sử dụng | Tạo vé mới; không tái sử dụng vé `USED` |
| `503 ALGORITHM_UNAVAILABLE` | Kiểm tra Signer, Verifier và cấu hình ML-DSA |
| Maven báo `BUILD FAILURE` | Xem thông báo biên dịch hoặc test bị lỗi |
| Cổng 8080 đang được sử dụng | Dừng backend cũ hoặc chọn cổng khác |
| SQL Server không kết nối được | Kiểm tra service, JDBC URL, tài khoản và quyền DB |

Sau khi sửa frontend, cần build lại ứng dụng và tải lại trang để trình duyệt sử dụng tài nguyên mới.

---

## 13. Lưu ý bảo mật

- Không commit mật khẩu, access token, refresh token hoặc JWT vé thật.
- Không đưa private key lên GitHub.
- Không commit `cenima/.local/`, các file cấu hình chứa bí mật hoặc thư mục `target/`.
- Không sử dụng cùng cặp khóa cho mục đích đăng nhập và phát hành vé nếu kiến trúc yêu cầu tách biệt.
- Không bỏ qua xác minh chữ ký chỉ vì thông tin vé tồn tại trong database.
- Verify JWT không thay thế kiểm tra trạng thái vé.
- Mô hình Hybrid phải kiểm tra cả hai chữ ký và chống hạ cấp thuật toán.
- Hệ thống chưa được đánh giá đầy đủ để triển khai production.

---

## 14. Tài liệu liên quan

Các tài liệu kỹ thuật được đặt trong thư mục `docs/`:

- `docs/API.md` — API xác thực và vé điện tử.
- `docs/DESIGN.md` — Thiết kế JWT, chữ ký số và QR.
- `docs/INTEGRATION.md` — Tích hợp các thành phần.
- `docs/TESTING.md` — Kiểm thử hệ thống.
- `docs/CAMERA.md` — Quét QR bằng camera.
- `docs/THIRD_PARTY.md` — Thư viện và giấy phép.

**Repository:** https://github.com/thaone-hub/cenima_backend_thao

**Nhánh tích hợp:** `merge_test_2`

---

## 15. Trạng thái và giới hạn của phiên bản tích hợp

README mô tả kiến trúc và các chức năng được kế thừa hoặc hợp nhất trong dự án. Sau mỗi lần merge, cần xác nhận lại các chức năng bằng build, unit test và kiểm thử giao diện.

Các nội dung cần kiểm tra trước khi công bố phiên bản hoàn thiện gồm:

- Khả năng khởi động của profile `integrated`.
- Đăng ký Signer/Verifier ML-DSA-44.
- Phát hành và xác minh vé bằng những thuật toán được hỗ trợ.
- Đọc ảnh QR trên Star Cinema.
- Check-in và chống sử dụng lại vé.
- Kiểm thử các lớp bảo mật sau khi merge.
- Tính tương thích của phần giao diện được bổ sung từ các nhánh khác.

**Dự án phục vụ nghiên cứu và thực nghiệm; các kết quả đánh giá hiệu năng và an toàn Hybrid phải dựa trên dữ liệu kiểm thử thực tế, không suy diễn từ việc build thành công.**