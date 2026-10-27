# CineVerse — Website đặt vé xem phim, E-Ticket JWT & QR

> **Dự án Java Spring Boot + Microsoft SQL Server** — đăng nhập, chọn phim/suất chiếu/ghế, đặt vé, phát hành và xác minh vé điện tử sử dụng JWT; nghiên cứu so sánh **RS256, ES256, EdDSA và ML-DSA-44 (Post-Quantum)**.
>
> **Ngày cập nhật:** 27/10/2026 · **Phạm vi:** môi trường demo/local, không phải hệ thống bán vé thương mại.

## Mục lục

1. [Giới thiệu và trạng thái](#1-giới-thiệu-và-trạng-thái)
2. [Công nghệ và kiến trúc](#2-công-nghệ-và-kiến-trúc)
3. [Cấu trúc source](#3-cấu-trúc-source)
4. [Chuẩn bị môi trường](#4-chuẩn-bị-môi-trường)
5. [Cài đặt lần đầu](#5-cài-đặt-lần-đầu)
6. [Chạy lại dự án hằng ngày](#6-chạy-lại-dự-án-hằng-ngày)
7. [Hướng dẫn sử dụng website](#7-hướng-dẫn-sử-dụng-website)
8. [API chính](#8-api-chính)
9. [JWT, ML-DSA-44 và QR](#9-jwt-ml-dsa-44-và-qr)
10. [Test bằng Maven, PowerShell và Postman](#10-test-bằng-maven-powershell-và-postman)
11. [Các lệnh Git](#11-các-lệnh-git)
12. [Lỗi thường gặp](#12-lỗi-thường-gặp)
13. [Bảo mật và giới hạn](#13-bảo-mật-và-giới-hạn)
14. [Tài liệu liên quan](#14-tài-liệu-liên-quan)

---

## 1. Giới thiệu và trạng thái

**CineVerse** là hệ thống đặt vé xem phim, gồm:

- **Khách hàng (CUSTOMER):** đăng nhập; duyệt phim, chọn suất chiếu và ghế; tạo booking; xem từng vé; phát hành JWT và QR.
- **Nhân viên (STAFF):** đọc QR/JWT hoặc mã tham chiếu; Verify (chỉ kiểm tra) và Check-in (đánh dấu vé đã sử dụng).
- **Quản trị viên (ADMIN):** có quyền liên quan đến vé và check-in theo cấu hình backend.
- **Nghiên cứu JWT:** so sánh chữ ký truyền thống với **ML-DSA-44**, thuật toán chữ ký hậu lượng tử.

**Trạng thái đã ghi nhận qua việc chạy trên máy nhóm:**

| Hạng mục | Trạng thái |
|---|---|
| Maven `clean compile` với 89 Java source | Đã báo `BUILD SUCCESS` |
| Giao diện CineVerse đăng nhập | Đã mở được |
| Chọn phim → suất chiếu → ghế → đặt vé | Đã đặt vé thành công |
| `ML-DSA-44` trên trang E-Ticket | Đã hiện **Sẵn sàng**, tạo JWT và QR thành công |
| QR dạng mã tham chiếu | Đã hiển thị trên giao diện |
| Verify/Check-in bằng STAFF sau khi nhập access token | **Cần xác nhận kết quả cuối cùng**; trước đó đã gặp 401 khi chưa có danh tính Staff |
| Cổng thanh toán thật / triển khai production | Chưa có / chưa nghiệm thu |

**Lưu ý:** `BUILD SUCCESS` và phát hành JWT không tự chứng minh toàn bộ nhánh verify/check-in ML-DSA đã hoàn thành. Cần chạy tiếp các trường hợp ở phần [kiểm thử](#10-test-bằng-maven-powershell-và-postman).

## 2. Công nghệ và kiến trúc

| Thành phần | Công nghệ |
|---|---|
| Frontend website | HTML5, CSS3, JavaScript ES Modules; Spring Boot static resources |
| Backend | Java **21** (mức biên dịch), Spring Boot **4.1.2**, REST API |
| Bảo mật | Spring Security, Bearer JWT, BCrypt |
| Cơ sở dữ liệu | Microsoft SQL Server, Spring Data JPA/Hibernate |
| Build | Maven Wrapper `mvnw.cmd` |
| JWT truyền thống | Nimbus JOSE + JWT, Tink, JJWT (demo) |
| JWT hậu lượng tử | Bouncy Castle; `ML-DSA-44` do module Hương bổ sung |
| QR | ZXing; quét QR trong giao diện nhân viên |
| Test | JUnit / Spring Boot Test, Maven Surefire, các script PowerShell |
| Công cụ phát triển | VS Code, SQL Server/SSMS, Postman, Git/GitHub |

### Sơ đồ luồng

```text
Browser / CineVerse (/cinema/)
    │
    ├── Đăng nhập ─────────── POST /api/auth/login
    │                          └── Access token RS256 (Thảo)
    │
    ├── Phim/suất/ghế ───── GET /api/movies, .../showtimes, .../seats
    │
    └── Đặt vé ───────────── POST /api/bookings
                               └── SQL Server: Booking PAID + Ticket UNUSED
                                        │
                                        ▼
                          POST /api/tickets/{ticketId}/token
                                        │
                    ┌───────────────────┼────────────────────┐
                    ▼                   ▼                    ▼
                  RS256             ES256 / EdDSA         ML-DSA-44
                                                          
                    └───────────────────┼────────────────────┘
                                        ▼
                                JWT đã ký + QR
                                        │
                                /demo/check-in.html
                                        │
                           STAFF/ADMIN đăng nhập
                                        │
                     Verify (không dùng vé) / Check-in
                                        │
                              Ticket UNUSED → USED
```

### Phân biệt 2 loại JWT

1. **JWT đăng nhập:** được hệ thống Authentication cấp, dùng trong HTTP header `Authorization: Bearer <accessToken>`; thuật toán RS256.
2. **JWT vé:** có `typ=eticket+jwt`, `iss=cinema-ticket`, `aud=cinema-checkin`; ký bằng thuật toán E-Ticket đã chọn. **Không dùng JWT vé để đăng nhập.**

## 3. Cấu trúc source

```text
cenima_backend_moi/                   # Root repository
├── README.md                          # File này
├── .gitignore                          # Bỏ qua credential, khóa, target
├── cenima/                             # Module Maven chính
│   ├── pom.xml
│   ├── mvnw.cmd                        # Maven Wrapper trên Windows
│   ├── .env.example                    # Mẫu biến môi trường (KHÔNG tự nạp)
│   ├── .local/                         # Sinh khi setup, KHÔNG commit
│   │   ├── env.ps1                     # Biến môi trường kết nối SQL
│   │   ├── demo-auth.ps1               # Mật khẩu demo
│   │   └── keys/                       # Khóa JWT truyền thống
│   └── src/
│       ├── main/
│       │   ├── java/com/backend/cenima/
│       │   │   ├── Controller/         # Auth, Movie, Booking, Ticket APIs
│       │   │   ├── DTO/                # Request/Response
│       │   │   ├── Entity/             # Ánh xạ bảng SQL
│       │   │   ├── Repository/         # Truy vấn DB
│       │   │   ├── Service/            # Nghiệp vụ
│       │   │   ├── Security/
│       │   │   │   ├── auth/           # Login, SecurityConfig, JWT filter
│       │   │   │   ├── contract/       # Interface JwtSigner/JwtVerifier
│       │   │   │   ├── adapter/        # JwtProviderRegistry, bridge
│       │   │   │   ├── traditional/    # RS256, ES256, EdDSA
│       │   │   │   ├── pq/             # ML-DSA-44 (phần bổ sung)
│       │   │   │   └── demo/           # Provider riêng cho demo
│       │   │   └── config/             # Ticket config, MlDsaTicketConfig
│       │   └── resources/
│       │       ├── application.properties
│       │       ├── application-integrated.properties
│       │       ├── application-demo.properties
│       │       └── static/
│       │           ├── cinema/         # Frontend CineVerse (14 file bổ sung)
│       │           │   ├── index.html
│       │           │   ├── login.html
│       │           │   ├── showtimes.html
│       │           │   ├── seats.html
│       │           │   ├── booking.html
│       │           │   ├── ticket.html
│       │           │   ├── css/style.css
│       │           │   └── js/
│       │           │       ├── api.js
│       │           │       ├── auth.js
│       │           │       ├── movies.js
│       │           │       ├── showtimes.js
│       │           │       ├── seats.js
│       │           │       ├── booking.js
│       │           │       └── ticket.js
│       │           └── demo/           # Giao diện vé/check-in của Ngọc
│       └── test/java/com/backend/cenima/
│           ├── TraditionalJwtTest.java
│           └── MlDsaJwtTest.java       # Nếu đã thêm test ML-DSA
├── database/sqlserver/                # DDL, seed, migration
├── tools/                             # Setup/test PowerShell
└── docs/                              # API, thiết kế, test, camera, ...
```

> Cấu trúc trên phản ánh source tích hợp đã xem **cộng với các file frontend/ML-DSA được thêm trong quá trình làm việc**. Các file bổ sung phải tồn tại trên máy local của bạn mới chạy được; repository GitHub có thể chưa nhận đủ các thay đổi chưa commit/push.

## 4. Chuẩn bị môi trường

### Phần mềm

- **JDK 21 trở lên**, khuyến nghị JDK 21 khi phát triển nhóm vì project biên dịch với `release 21`. Máy dùng JDK 26 đã biên dịch thành công trong phiên làm việc này.
- **VS Code** và Extension Pack for Java.
- **SQL Server** chạy local, bật TCP/IP nếu cấu hình JDBC dùng `localhost:1433`; **SSMS** để quản lý DB.
- **`sqlcmd`** có trong `PATH` nếu chạy các script setup database.
- **Git** để clone và push code.
- **Postman** (không bắt buộc, dùng để test API).
- **Không cần cài Maven riêng**: đã có `cenima/mvnw.cmd`.
- **Không cần React hoặc Node.js để chạy frontend**: HTML/CSS/JS được Spring Boot phục vụ trực tiếp.

### Kiểm tra trong PowerShell

```powershell
java -version
javac -version
git --version
sqlcmd -?
```

Chạy Maven Wrapper từ **root repository**:

```powershell
cd C:\Users\admin\cenima_backend_moi
.\cenima\mvnw.cmd -version
```

Nếu có sẵn source ở thư mục khác, thay đường dẫn cho phù hợp. **Không cần clone lại repo đang làm việc.**

## 5. Cài đặt lần đầu

> **Nếu máy đã chạy được website và đặt vé thành công, bỏ qua toàn bộ mục 5.** Không chạy lại initializer hay reset DB.

### 5.1. Lấy source khi chưa có repo

```powershell
git clone https://github.com/thaone-hub/cenima_backend_thao.git
cd cenima_backend_thao
```

Nếu nhóm lưu source dưới tên `cenima_backend_moi`, chỉ cần mở đúng thư mục đó trong VS Code. Dùng `git status` để xác nhận checkout hiện tại.

### 5.2. Cho phép chạy PowerShell script trong phiên hiện tại

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Chính sách này chỉ có hiệu lực trong cửa sổ PowerShell hiện tại.

### 5.3. Chuẩn bị SQL Server **chỉ khi database mới/trống**

Từ thư mục root (`...\cenima_backend_moi`):

```powershell
.\tools\Initialize-Database.ps1 -Database CINEMA_THAO_ETICKET_DEMO
.\tools\Initialize-Database.ps1 -Database CINEMA_THAO_ETICKET_TEST
```

- Cần SQL Server, `sqlcmd`, Windows Authentication có đủ quyền tạo schema/DB.
- `CINEMA_THAO_ETICKET_DEMO`: dữ liệu chạy web.
- `CINEMA_THAO_ETICKET_TEST`: dành riêng cho kiểm thử tự động.
- **Không chạy trên DB đã có bảng/dữ liệu.** Với DB hiện hữu, xem migration ở `database/sqlserver/08-upgrade-existing.sql` và sao lưu trước khi thao tác.

### 5.4. Tạo thông tin kết nối local — **chỉ lần đầu**

```powershell
.\tools\Provision-Local.ps1
. .\cenima\.local\env.ps1
```

`Provision-Local.ps1` tạo SQL login giới hạn quyền và lưu kết nối vào `cenima/.local/env.ps1`. Script sẽ từ chối nếu thông tin local đã tồn tại, để tránh ghi đè mật khẩu.

### 5.5. Cấu hình mật khẩu tài khoản demo — **chỉ lần đầu**

```powershell
.\tools\Set-DemoPasswords.ps1
. .\cenima\.local\demo-auth.ps1
```

Script tạo mật khẩu BCrypt cho ba tài khoản demo từ seed và lưu mật khẩu tại `cenima/.local/demo-auth.ps1`; script không dùng để reset tài khoản đã có mật khẩu thực.

| Vai trò | Email demo |
|---|---|
| CUSTOMER | `customer@cinema.test` |
| STAFF | `staff@cinema.test` |
| ADMIN | `admin@cinema.test` |

**Không viết mật khẩu cụ thể vào README hoặc commit các file `.local/`.**

### 5.6. Kiểm tra môi trường trước khi build

```powershell
# Từ root của repo
. .\cenima\.local\env.ps1
. .\cenima\.local\demo-auth.ps1

# Không in giá trị bí mật
Test-Path .\cenima\.local\env.ps1
Test-Path .\cenima\.local\demo-auth.ps1
```

File `cenima/.env.example` chỉ là ví dụ; Spring Boot **không tự động đọc** file `.env`.

## 6. Chạy lại dự án hằng ngày

### Cách nhanh nhất — đã setup DB và mật khẩu trước đó

**Terminal 1 — build & khởi động backend:**

```powershell
cd C:\Users\admin\cenima_backend_moi
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\cenima\.local\env.ps1

# Dừng backend cũ (Ctrl+C) trước khi clean để không khóa file JAR
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean package -DskipTests

cd cenima
java -jar target\cenima-0.0.1-SNAPSHOT.jar --spring.profiles.active=integrated --cinema.mldsa.enabled=true
```

- **Terminal phải giữ mở** trong lúc sử dụng web.
- `--spring.profiles.active=integrated`: dùng Authentication thật và DB local đã cấu hình.
- `--cinema.mldsa.enabled=true`: kích hoạt cấu hình ML-DSA-44 **nếu module ML-DSA đã được bổ sung và có đủ signer/verifier**. Nếu chỉ cần kiểm tra frontend, có thể bỏ cờ này.
- Nếu vừa đổi code HTML/CSS/JS trong JAR, **build lại rồi khởi động lại** để JAR nhận file mới.

**Mở giao diện:**

| Giao diện | URL |
|---|---|
| Trang chủ CineVerse | <http://localhost:8080/cinema/index.html> |
| Đăng nhập | <http://localhost:8080/cinema/login.html> |
| Chọn suất chiếu | `/cinema/showtimes.html?movieId=<ID>` |
| Chọn ghế | `/cinema/seats.html?movieId=<ID>&showtimeId=<ID>` |
| Vé điện tử | `/cinema/ticket.html?ticketId=<ID>` |
| E-Ticket demo của Ngọc | <http://localhost:8080/demo/index.html> |
| Check-in nhân viên | <http://localhost:8080/demo/check-in.html> |

`<ID>` là ID thực từ database, **không dùng một ID cố định cho mọi máy**.

### Lệnh build thường dùng

```powershell
# Chạy từ root repository
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean compile
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean package -DskipTests
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean verify
```

- `clean compile`: biên dịch code Java chính, chưa chạy test.
- `clean package -DskipTests`: đóng gói JAR, **bỏ qua chạy test** (vẫn có thể biên dịch test).
- `clean verify`: build và chạy toàn bộ test; cần cấu hình DB test đúng nếu muốn các bài test tích hợp SQL được thực thi.
- Cảnh báo `sun.misc.Unsafe` từ Lombok trên JDK mới không nhất thiết là lỗi; xem dòng cuối `BUILD SUCCESS` / `BUILD FAILURE`.

### Dừng server

Nhấn `Ctrl + C` ở Terminal đang chạy `java -jar`. Nếu cổng 8080 đã bị chiếm, xem mục [lỗi thường gặp](#12-lỗi-thường-gặp).

## 7. Hướng dẫn sử dụng website

1. Mở `/cinema/index.html`, chọn phim.
2. Chọn suất chiếu còn trong tương lai.
3. Chọn ghế `AVAILABLE`, bấm **Tiếp tục đặt vé**.
4. Đăng nhập bằng `customer@cinema.test` và mật khẩu demo nếu chưa có phiên.
5. Xem lại ghế và bấm **Xác nhận đặt vé**.
6. Backend tạo Booking và các Ticket; mỗi ghế tương ứng **một vé riêng**.
7. Nhấn **Xem JWT & QR** trên một Ticket ID.
8. Chọn thuật toán đang báo **Sẵn sàng**, bấm **Phát hành JWT + QR**.
9. Để Verify/Check-in, mở `/demo/check-in.html` với danh tính **STAFF/ADMIN**.
10. Nhấn **Verify · không dùng vé** trước; chỉ khi cần dùng vé thật mới nhấn **Check-in · dùng vé**.

**Quy tắc nghiệp vụ hiện tại:**

- Frontend chỉ tính giá **ước lượng**; backend tự tính giá theo loại ghế STANDARD/VIP/COUPLE.
- Chưa tích hợp thanh toán thật: đặt vé thành công thì Booking được ghi `PAID`, Ticket ban đầu `UNUSED`.
- Không cho đặt ghế đã được người khác đặt; có cơ chế unique index/transaction phòng tranh chấp.
- Verify kiểm tra tính hợp lệ nhưng **không đổi trạng thái vé**; Check-in hợp lệ chuyển từ `UNUSED` sang `USED`, không cho dùng lại.
- JWT có hạn đến thời điểm kết thúc suất chiếu theo thời lượng phim; hệ thống có thể từ chối JWT hết hạn hoặc vé hủy/đã dùng.

## 8. API chính

**Base URL:** `http://localhost:8080` · `Content-Type: application/json`.

| Method | Endpoint | Ý nghĩa | Quyền ở profile integrated |
|---|---|---|---|
| POST | `/api/auth/login` | Đăng nhập | Public |
| POST | `/api/auth/refresh` | Cấp lại access token | Public, yêu cầu refresh token hợp lệ |
| POST | `/api/auth/logout` | Thu hồi refresh token | Public, yêu cầu refresh token hợp lệ |
| GET | `/api/movies` | Phim đang chiếu | Public sau khi cấu hình frontend |
| GET | `/api/movies?status=2` | Phim sắp chiếu | Public sau khi cấu hình frontend |
| GET | `/api/movies/{movieId}/showtimes` | Suất chiếu sắp tới | Public sau khi cấu hình frontend |
| GET | `/api/showtimes/{showtimeId}/seats` | Sơ đồ ghế | Public sau khi cấu hình frontend |
| POST | `/api/bookings` | Đặt ghế/tạo vé | CUSTOMER đã đăng nhập |
| GET | `/api/tickets/algorithms` | Thuật toán JWT và trạng thái | Cần access token |
| GET | `/api/tickets/{ticketId}` | Thông tin vé | Chủ vé hoặc ADMIN |
| POST | `/api/tickets/{ticketId}/token` | Phát hành JWT + QR | Chủ vé hoặc ADMIN |
| POST | `/api/tickets/verify` | Xác minh, không sử dụng | STAFF hoặc ADMIN |
| POST | `/api/tickets/check-in` | Xác minh và dùng vé | STAFF hoặc ADMIN |

### Ví dụ request

**Đăng nhập** — `POST /api/auth/login`:

```json
{"email":"customer@cinema.test","password":"<mat-khau-demo>"}
```

**Đặt vé** — `POST /api/bookings`:

```json
{"showtimeId": 1, "seatIds": [1, 2]}
```

Response trả `id`, `showtimeId`, `status`, `totalPrice`, `tickets` (mỗi phần tử có `ticketId`, `seat`, `ticketCode`, `price`, `status`).

**Phát hành ML-DSA** — `POST /api/tickets/{ticketId}/token`:

```json
{"algorithm":"ML-DSA-44"}
```

Response gồm `ticket`, `token` (JWT đầy đủ), `algorithm`, `issuedAt`, `expiresAt`, `qr` (`mode`, `content`, `pngBase64`).

**Xác minh/check-in** — `POST /api/tickets/verify` hoặc `/api/tickets/check-in`:

```json
{"value":"<JWT-day-du-hoac-etkt:...>"}
```

> Lưu ý: dùng `Authorization: Bearer <accessToken>` cho các API cần xác thực. **Không gửi access token/JWT lên GitHub, ảnh chụp màn hình hoặc đường dẫn URL.**

## 9. JWT, ML-DSA-44 và QR

### 9.1. Thuật toán vé điện tử

| Thuật toán | Nhóm | Module |
|---|---|---|
| `RS256` | RSA (truyền thống) | `Security/traditional/` |
| `ES256` | ECDSA P-256 (truyền thống) | `Security/traditional/` |
| `EdDSA` | Ed25519 (truyền thống) | `Security/traditional/` |
| **`ML-DSA-44`** | **Chữ ký hậu lượng tử** | **`Security/pq/`** |

`Security/adapter/JwtProviderRegistry.java` quản lý danh sách thuật toán cho E-Ticket. Thuật toán chỉ hiện `available=true` khi backend đăng ký đủ **signer và verifier**. `MlDsaTicketConfig.java` chịu trách nhiệm đăng ký phần ML-DSA trong Spring khi được bật. **Không cần thêm ML-DSA vào `Security/auth/SecurityConfig.java`**: file đó bảo vệ API và giữ luồng đăng nhập RS256.

### 9.2. Payload E-Ticket

Source gốc phát hành các claim cơ bản:

```json
{
  "iss": "cinema-ticket",
  "aud": "cinema-checkin",
  "ticketId": 2,
  "movieId": 1,
  "showtimeId": 1,
  "seatCode": "C2",
  "iat": 0,
  "exp": 0
}
```

`iat` và `exp` trên chỉ minh họa **tên trường**; server tạo giá trị Unix timestamp thật tại thời điểm phát hành, không điền `0` khi sử dụng.

### 9.3. File của phần ML-DSA

```text
cenima/src/main/java/com/backend/cenima/Security/pq/
├── MlDsaKeyManager.java
├── MlDsaJwtSigner.java
├── MlDsaJwtVerifier.java
└── MlDsaJwtService.java

cenima/src/main/java/com/backend/cenima/config/MlDsaTicketConfig.java
cenima/src/test/java/com/backend/cenima/MlDsaJwtTest.java
```

Các test ML-DSA kiểm tra ký/xác minh, payload bị sửa, khóa sai và nạp lại khóa. `pom.xml` ở máy đã bổ sung thư viện Bouncy Castle; phiên bản dependency cần xem **trực tiếp trong pom.xml hiện tại**, vì các bản vá trước đó có thể khác phiên bản.

**Bật ML-DSA khi khởi động:**

```powershell
# Khi đã cd vào thư mục cenima
java -jar target\cenima-0.0.1-SNAPSHOT.jar --spring.profiles.active=integrated --cinema.mldsa.enabled=true
```

Hoặc đặt biến cấu hình trong Terminal hiện tại trước khi chạy Java:

```powershell
$env:CINEMA_MLDSA_ENABLED = "true"
```

Nếu ML-DSA không hiện trong `/api/tickets/algorithms`, cần kiểm tra `MlDsaTicketConfig`, việc đăng ký vào registry, lỗi startup và điều kiện enable; chỉ thêm dependency là chưa đủ.

### 9.4. Vì sao QR có thể là mã tham chiếu?

JWT ML-DSA có chữ ký lớn, có thể vượt dung lượng QR mong muốn. Backend tự chuyển sang **QR dạng tham chiếu** khi cần:

```text
QR mã tham chiếu: etkt:<chuoi-ma>
       │
       ▼
Server tra tham chiếu trong SQL Server
       │
       ▼
Lấy JWT đã ký → kiểm tra chữ ký → đối chiếu vé
```

Giao diện vẫn có ô **JWT đầy đủ** để copy, trong khi QR chỉ chứa mã ngắn. Mã tham chiếu và JWT thuộc **cùng một vé**, đều bị từ chối sau khi check-in thành công hoặc hết hạn theo chính sách.

### 9.5. Luồng kiểm tra của STAFF

1. Mở trang vé CineVerse, phát hành JWT bằng `ML-DSA-44`, bấm **Sao chép JWT**.
2. Mở `/demo/check-in.html`.
3. Lấy access token đăng nhập **Staff** và dán vào mục **Danh tính khi tích hợp**.
4. Dán JWT vào ô `JWT hoặc mã etkt`, bấm **Verify · không dùng vé**.
5. Chỉ khi muốn sử dụng vé, bấm **Check-in · dùng vé**.
6. Thử check-in lại **chính vé đó** để xác nhận chống dùng lại.
7. Thử thay đổi payload JWT mà không ký lại: việc Verify phải thất bại.

`401 UNAUTHENTICATED` thường là thiếu/sai access token **Staff**; chưa đủ cơ sở kết luận ML-DSA sai. `403 FORBIDDEN` thường là tài khoản thiếu quyền. `422` có thể liên quan JWT/chữ ký, dữ liệu vé hoặc thời gian hết hạn; đọc mã lỗi chi tiết.

## 10. Test bằng Maven, PowerShell và Postman

### 10.1. Unit test ML-DSA riêng

Từ root repo:

```powershell
.\cenima\mvnw.cmd -B -f cenima\pom.xml -Dtest=MlDsaJwtTest test
```

Mong đợi `Tests run: 4, Failures: 0, Errors: 0` và `BUILD SUCCESS` **nếu file `MlDsaJwtTest.java` thực tế chứa đúng bốn phương thức test**. Nếu nhận `No tests matching pattern`, kiểm tra `src/test/java/.../MlDsaJwtTest.java` và package/class name; không dùng `-Dsurefire.failIfNoSpecifiedTests=false` để che lỗi chưa có test.

### 10.2. Test toàn bộ dự án

```powershell
cd C:\Users\admin\cenima_backend_moi
. .\cenima\.local\env.ps1
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean verify
```

`env.ps1` có thể đặt `TEST_DB_URL` cho database `CINEMA_THAO_ETICKET_TEST`; đảm bảo các bài test SQL **không trỏ vào DEMO/production**. Nhiều bài test SQL skip khi chưa cấu hình DB test.

### 10.3. Smoke test (tùy chọn)

```powershell
# Chạy từ root; xem hướng dẫn tools/Smoke-Test.ps1 trước khi sử dụng
.\tools\Smoke-Test.ps1
```

Smoke test gốc có thể quản lý JVM/cổng/dữ liệu test của riêng nó; chỉ chạy sau khi đọc yêu cầu và đảm bảo môi trường phù hợp. Script migration `tools/Test-LegacyMigration.ps1` dùng để thử nâng cấp database cũ, **không phải lệnh chạy ứng dụng hằng ngày**.

### 10.4. Test API trực tiếp bằng PowerShell

Mở **Terminal 2**, giữ Terminal 1 đang chạy backend:

```powershell
cd C:\Users\admin\cenima_backend_moi
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\cenima\.local\demo-auth.ps1

$base = 'http://localhost:8080'

# Login CUSTOMER
$loginBody = @{
    email = 'customer@cinema.test'
    password = $env:CINEMA_DEMO_PASSWORD
} | ConvertTo-Json

$customer = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" `
    -ContentType 'application/json' -Body $loginBody

$customerHeaders = @{ Authorization = "Bearer $($customer.accessToken)" }

# Xem danh sach phim
Invoke-RestMethod -Method Get -Uri "$base/api/movies"

# Xem thuat toan dang san sang
Invoke-RestMethod -Method Get -Uri "$base/api/tickets/algorithms" `
    -Headers $customerHeaders
```

**Ví dụ phát hành vé:** dùng `$ticketId` là vé thuộc tài khoản vừa đăng nhập, không dùng ID giả định:

```powershell
$ticketId = 2  # DOI thanh Ticket ID thuc te

$issued = Invoke-RestMethod -Method Post `
    -Uri "$base/api/tickets/$ticketId/token" `
    -Headers $customerHeaders `
    -ContentType 'application/json' `
    -Body '{"algorithm":"ML-DSA-44"}'

# Khong in JWT ra Terminal
$issued.algorithm
$issued.qr.mode
$issued.ticket.ticketId
```

**Đăng nhập STAFF và Verify:**

```powershell
$staffBody = @{
    email = 'staff@cinema.test'
    password = $env:CINEMA_DEMO_PASSWORD
} | ConvertTo-Json

$staff = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" `
    -ContentType 'application/json' -Body $staffBody

$staffHeaders = @{ Authorization = "Bearer $($staff.accessToken)" }

$verifyBody = @{ value = $issued.token } | ConvertTo-Json -Compress

# Khong tieu thu ve
Invoke-RestMethod -Method Post -Uri "$base/api/tickets/verify" `
    -Headers $staffHeaders -ContentType 'application/json' -Body $verifyBody

# CHI KHI MUON DUNG VE THUC SU:
# Invoke-RestMethod -Method Post -Uri "$base/api/tickets/check-in" `
#     -Headers $staffHeaders -ContentType 'application/json' -Body $verifyBody
```

Để lấy riêng access token của STAFF và dán vào giao diện check-in (không hiển thị token):

```powershell
Set-Clipboard -Value $staff.accessToken
```

### 10.5. Postman

- `POST /api/auth/login`: `Body → raw → JSON`, gửi email/mật khẩu; copy **accessToken**.
- Với API cần xác thực: `Authorization → Bearer Token`, dán access token.
- `GET /api/movies` → `GET /api/movies/{id}/showtimes` → `GET /api/showtimes/{id}/seats`.
- `POST /api/bookings`: `{"showtimeId":...,"seatIds":[...]}`.
- `POST /api/tickets/{ticketId}/token`: `{"algorithm":"ML-DSA-44"}`.
- Đổi sang token đăng nhập **STAFF**, gọi `POST /api/tickets/verify` với `{"value":"..."}`.
- Gọi check-in sau cùng, vì thao tác này **thay đổi trạng thái vé**.

## 11. Các lệnh Git

Chạy ở root repository:

```powershell
git status
git branch
git remote -v
git fetch origin
```

**Khuyến nghị làm trên nhánh riêng** (nếu nhánh chưa tồn tại):

```powershell
git switch -c feat/huong-ml-dsa
```

Nếu nhánh đã có:

```powershell
git switch feat/huong-ml-dsa
```

**Xem và commit thay đổi:**

```powershell
git status --short
git diff --check
git diff --stat

# Kiem tra khong stage credential/key/JAR truoc khi commit
git add README.md cenima/src/main cenima/src/test cenima/pom.xml
git diff --cached --stat
git status --short

git commit -m "docs: add project setup, JWT and frontend guide"
git push -u origin feat/huong-ml-dsa
```

`git add ...` là ví dụ khi bạn muốn đưa cả frontend, ML-DSA, config và README cùng lên nhánh. **Kiểm tra file staged trước khi commit**; thay thông điệp commit cho phù hợp với thay đổi thật. Nếu chỉ muốn push README, dùng `git add README.md` thay vì staging toàn bộ source. Sau đó tạo **Pull Request** trên GitHub để nhóm review trước khi merge vào `main`.

**Khi làm việc với nhóm:**

```powershell
git status
git fetch origin
git pull --ff-only origin main
```

Chỉ chạy `git pull --ff-only origin main` khi đang ở branch `main` sạch và bạn muốn cập nhật main; trên feature branch, cần chọn chiến lược merge/rebase phù hợp thay vì dùng lệnh này mù quáng. **Không dùng `git reset --hard`, `git clean -fd` khi còn code chưa commit.**

## 12. Lỗi thường gặp

| Lỗi/hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `401 UNAUTHENTICATED` khi Verify | Chưa có access token STAFF, token hết hạn hoặc dán nhầm JWT vé | Đăng nhập `staff@cinema.test`, dán **accessToken** vào mục danh tính check-in |
| `403 FORBIDDEN` | CUSTOMER gọi Verify/Check-in hoặc không phải chủ vé | Đăng nhập đúng quyền STAFF/ADMIN; phát hành bằng chủ vé/ADMIN |
| `404` ở `/cinema/index.html` | Frontend sai thư mục hoặc JAR cũ | Đặt trong `src/main/resources/static/cinema/`, lưu file rồi build lại |
| `401` khi mở `/cinema/` | Thiếu `.requestMatchers("/cinema/**").permitAll()` | Kiểm tra `SecurityConfig.java` (profile integrated) |
| `401` ở `GET /api/movies` | Chưa public GET phim/suất/ghế | Kiểm tra rules GET trong `SecurityConfig.java` |
| `No tests matching pattern` | Chưa có `MlDsaJwtTest.java` đúng package/tên | Kiểm tra tên class, đường dẫn `src/test/java` |
| VS Code gạch đỏ nhưng Maven compile được | Java Language Server chưa đồng bộ | Mở đúng thư mục có `pom.xml`, chạy `Java: Clean Java Language Server Workspace` |
| `Non-parseable POM ... line 2` | Có khoảng trắng/BOM trước `<?xml ...?>` | Đảm bảo `pom.xml` mở đầu ngay bằng XML declaration; lưu UTF-8 |
| `target` không xóa được khi `clean` | File JAR đang chạy trên Windows | Dừng backend bằng `Ctrl+C` rồi build lại |
| Port 8080 đang dùng | Backend cũ hoặc app khác chưa dừng | `Get-NetTCPConnection -LocalPort 8080 -State Listen` rồi xem Process ID |
| Không kết nối SQL Server | Service/TCP/1433/login/cert sai | Kiểm tra SSMS, `sqlcmd`, và nạp lại `.local/env.ps1` |
| Phim/suất chiếu không hiện | Database trống hoặc suất chiếu đã qua | Kiểm tra seed, trạng thái phim và thời gian suất chiếu |
| `409 TICKET_USED` / lỗi ghế | Vé đã dùng hoặc ghế đã có người đặt | Đổi ghế/suất hoặc tạo vé demo mới; không reset DB |
| `422` khi verify | JWT sai, hết hạn, claim không khớp hoặc dữ liệu vé lỗi | Xem `{code,message}` trả về; kiểm tra giờ suất chiếu |
| `503 ALGORITHM_UNAVAILABLE` | ML-DSA chưa được đăng ký đủ signer/verifier | Kiểm tra cấu hình enable, `MlDsaTicketConfig`, startup logs |
| QR chứa `etkt:...` thay vì JWT | JWT quá lớn cho QR được cấu hình | Bình thường: server tra JWT theo mã tham chiếu |
| Không chạy được `.ps1` | PowerShell Execution Policy | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |

**Kiểm tra cổng 8080 mà không giết tiến trình tùy tiện:**

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

## 13. Bảo mật và giới hạn

- Không commit `cenima/.local/`, `.env`, DB password, private key (`*.pk8`, `*.jwk`, `*.pem`), JWT/access token hoặc log có bí mật.
- Chỉ chạy initializer trên DB **mới/trống**; sao lưu trước migration. Không chạy test tích hợp SQL trên DB đang sử dụng thực tế.
- Khóa ký phải ổn định qua restart; xóa hoặc thay khóa khiến JWT cũ có thể không Verify được. Khóa ML-DSA demo lưu local để nghiên cứu, **chưa phải phương án quản lý khóa production**.
- QR tham chiếu không phải là “không cần chữ ký”: backend vẫn kiểm tra JWT đã ký và quyền/trạng thái vé.
- Frontend hiện lưu access token trong `sessionStorage` để demo. Trước production cần đánh giá lại XSS, CSP, logout/token lifecycle, HTTPS, quản lý phiên và thiết kế lưu token.
- Chưa có thanh toán thật; trạng thái `PAID` sau booking chỉ là mô phỏng nghiệp vụ.
- Chưa nghiệm thu đầy đủ camera, mobile HTTPS, tải lớn, rotation khóa, triển khai nhiều server và benchmark thực nghiệm các thuật toán.
- `SecurityConfig.java` chỉ quản lý quyền HTTP/authentication; ML-DSA thuộc pipeline E-Ticket, không thay RS256 dùng để đăng nhập.

## 14. Tài liệu liên quan

Các tài liệu đã có trong repository gốc:

- [`docs/API.md`](docs/API.md) — Chi tiết API E-Ticket, request/response, lỗi.
- [`docs/DESIGN.md`](docs/DESIGN.md) — Thiết kế E-Ticket, JWT, QR.
- [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — Tích hợp  và các adapter.
- [`docs/TESTING.md`](docs/TESTING.md) — Bộ test, migration, checklist.
- [`docs/CAMERA.md`](docs/CAMERA.md) — Quét QR, camera/HTTPS.
- [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md) — Thư viện/giấy phép.
- [`cenima/.env.example`](cenima/.env.example) — Biến cấu hình mẫu.

**Repository:** <https://github.com/thaone-hub/cenima_backend_thao>

---

### Tóm tắt lệnh cần nhớ

```powershell
# 1. Mở project
cd C:\Users\admin\cenima_backend_moi

# 2. Nạp môi trường SQL (mỗi Terminal mới)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\cenima\.local\env.ps1

# 3. Build (dừng server cũ trước)
.\cenima\mvnw.cmd -B -f cenima\pom.xml clean package -DskipTests

# 4. Chạy Spring Boot có ML-DSA
cd cenima
java -jar target\cenima-0.0.1-SNAPSHOT.jar --spring.profiles.active=integrated --cinema.mldsa.enabled=true

# 5. Mở website: http://localhost:8080/cinema/index.html
# 6. Check-in: http://localhost:8080/demo/check-in.html
```

> Đối chiếu: source ZIP của nhóm (26/10/2026), tài liệu `docs/` trong repo và các kết quả chạy/test/giao diện do nhóm cung cấp đến 27/10/2026. Một số thành phần được thêm trên máy local sau bản ZIP; khi đưa lên Git, cần kiểm tra lại cấu hình và tập tin thực tế của branch mới nhất.
