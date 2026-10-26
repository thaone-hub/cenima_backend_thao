# API E-Ticket

Base URL demo: `http://127.0.0.1:8080`. Content-Type request/response: `application/json`. Demo dùng `X-User-Id` theo ID thật trong DB. Không gửi role từ client. Integrated dùng authentication module Thảo, không dùng JWT vé làm access token.

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/tickets/algorithms` | Theo security config; demo cho phép đọc |
| GET | `/api/tickets/{ticketId}` | Chủ vé / ADMIN |
| POST | `/api/tickets/{ticketId}/token` | Chủ vé / ADMIN |
| POST | `/api/tickets/verify` | STAFF / ADMIN |
| POST | `/api/tickets/check-in` | STAFF / ADMIN |

GET algorithms trả array `{algorithm, available}`. Bốn tên được phép: `RS256`, `ES256`, `EdDSA`, `ML-DSA-44`; available chỉ true khi có đủ signer và verifier. Demo chỉ RS256 true.

POST token:

```json
{"algorithm":"RS256"}
```

Response:

```json
{
  "ticket": {
    "ticketId": 123, "ticketCode": "0123456789abcdef0123456789abcdef",
    "movieId": 10, "movieTitle": "Demo movie", "showtimeId": 50,
    "startTime": "2026-10-28T12:00:00", "roomName": "Room 1",
    "seatCode": "A1", "status": "UNUSED", "usedAt": null
  },
  "token": "<compact JWS>", "algorithm": "RS256",
  "issuedAt": "2026-10-26T05:00:00Z", "expiresAt": "2026-10-28T06:40:00Z",
  "qr": {"mode":"JWT", "content":"<compact JWS>", "mimeType":"image/png", "pngBase64":"<PNG base64>"}
}
```

Nếu QR tham chiếu: `mode="REFERENCE"`, `content="etkt:<43 ký tự Base64URL>"`. `token` vẫn là JWT đầy đủ. `startTime`, `usedAt` theo múi giờ DB/cấu hình; `issuedAt`, `expiresAt` là Instant UTC. GET ticket trả riêng object `ticket` như trên.

Verify/check-in nhận cùng một body:

```json
{"value":"<compact JWS hoặc etkt:...>"}
```

Thành công:

```json
{"valid":true,"checkedIn":false,"ticket":{"ticketId":123,"status":"UNUSED"},"status":"UNUSED","usedAt":null}
```

Ví dụ trên rút gọn `ticket`; object thực tế chứa đủ trường như GET. Check-in trả `checkedIn=true`, `status=USED`, `usedAt` được ghi. Verify vé đã dùng trả lỗi, không trả thành công `valid=true`. Giới hạn input mặc định 32768 **byte UTF-8**, tính trước khi strip khoảng trắng và kiểm tra lại sau giải tham chiếu.

Tất cả response dưới `/api/tickets` có `Cache-Control: no-store`, kể cả lỗi. Không truyền token trong URL. Lỗi E-Ticket dạng `{code,message}`:

| HTTP | Trường hợp |
|---|---|
| 400 | Input sai/quá lớn; thuật toán phát hành ngoài whitelist; tham chiếu sai định dạng |
| 401 | Thiếu hoặc sai identity |
| 403 | Không phải chủ vé/ADMIN; verify/check-in thiếu STAFF/ADMIN |
| 404 | Không tìm thấy ticket/tham chiếu |
| 409 | USED, CANCELLED, booking không PAID; xung đột khóa |
| 422 | JWT sai chữ ký/header/claim/hết hạn, không khớp DB; tham chiếu hết hạn; dữ liệu suất chiếu không hợp lệ |
| 503 | Thuật toán được phép nhưng thiếu provider; không thể tạo QR hoặc token provider vượt giới hạn hệ thống |

Token verify có thuật toán ngoài whitelist trả 422; request **phát hành** chọn thuật toán ngoài whitelist trả 400. Mã phổ biến: `TICKET_USED`, `TICKET_CANCELLED`, `BOOKING_NOT_PAID`, `TOKEN_INVALID`, `REFERENCE_EXPIRED`, `ALGORITHM_UNAVAILABLE`.

Ví dụ PowerShell, từ thư mục `src` (ID lấy từ DB):

```powershell
$issued = Invoke-RestMethod http://127.0.0.1:8080/api/tickets/1/token -Method Post `
  -Headers @{'X-User-Id'='1'} -ContentType application/json -Body '{"algorithm":"RS256"}'
$body = @{value=$issued.qr.content} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8080/api/tickets/verify -Method Post `
  -Headers @{'X-User-Id'='2'} -ContentType application/json -Body $body
Invoke-RestMethod http://127.0.0.1:8080/api/tickets/check-in -Method Post `
  -Headers @{'X-User-Id'='2'} -ContentType application/json -Body $body
```

Các API gốc giữ endpoint/body/response thành công: GET `/api/movies`, GET `/api/movies/{id}/showtimes`, GET `/api/showtimes/{id}/seats`, POST `/api/bookings` với `{showtimeId,seatIds}`. Identity booking cũng đi qua actor adapter để integrated không tin `X-User-Id` của client.

## Authentication Thảo (giữ nguyên)

POST `/api/auth/login` nhận `{email,password}`; trả `accessToken`, `refreshToken`, `tokenType=Bearer`, `expiresIn=900`. POST `/api/auth/refresh` nhận `{refreshToken}`, trả cấu trúc tương tự và giữ refresh token hiện có. POST `/api/auth/logout` nhận `{refreshToken}`, trả 204 và thu hồi refresh trong DB. Logout giữ hành vi idempotent ban đầu, không tự thu hồi access đã phát hành còn hạn. Auth endpoint chỉ chạy integrated.

Token auth: typ=JWT, alg=RS256, kid=rsa-key-1, iss=cenima-auth, tokenType=ACCESS hoặc REFRESH, sub=email. Token vé: typ=eticket+jwt, iss=cinema-ticket, aud=cinema-checkin. Filter access từ chối vé/refresh token; refresh từ chối vé. Giữ issuer/audience auth cũ.

Integrated gửi `Authorization: Bearer <accessToken>` cho API vé/booking; ba thuật toán RS256, ES256, EdDSA available, ML-DSA-44 unavailable. GET algorithms cũng cần xác thực. Các ví dụ X-User-Id phía trên chỉ dành cho demo.
