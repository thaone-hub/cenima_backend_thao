# Thư viện và tài sản bên thứ ba

| Thư viện | Phiên bản | Mục đích | Giấy phép |
|---|---|---|---|
| JJWT | 0.12.6 | RS256 demo và JWS/JWT | Apache-2.0 |
| Nimbus JOSE + JWT | 10.10 | RS256/ES256/EdDSA integrated của Thảo | Apache-2.0 |
| Google Tink | 1.24.0 | Ed25519 cho Nimbus | Apache-2.0 |
| ZXing core / javase | 3.5.3 | Tạo/đọc QR trong kiểm thử | Apache-2.0 |
| qr-scanner | 1.4.2 | Camera/ảnh QR trong browser | MIT |

Các dependency Java được ghim/được quản lý trong pom; không thay Spring Boot 4.1.2 hoặc Java 21. qr-scanner được tải từ `https://unpkg.com/qr-scanner@1.4.2/` và phục vụ tại `static/demo/vendor/`, không gọi CDN lúc chạy. Giữ tệp LICENSE đi kèm.

SHA-256 các tệp vendor đã tải:

```text
qr-scanner.min.js
0564e4cf84b94cac80213b4f779bd215bb0876a91c19df28baf97766f4fd5484
qr-scanner-worker.min.js
f4d8445f5a15c4e5f71a8c8c062c6443f09db370b8d3fe1fbdc7fe7889630d14
```

Các tệp minified giữ nguyên từ bản phát hành. QR worker là dependency local của qr-scanner; CSP cho phép worker cùng origin và blob worker do thư viện tạo. Giao diện không có script inline hay thư viện từ CDN.
