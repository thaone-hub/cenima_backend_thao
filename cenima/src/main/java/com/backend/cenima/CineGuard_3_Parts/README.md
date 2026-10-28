# CineGuard Lab — bản gộp 3 phần

Bản này giữ nguyên `src/App.tsx` và chỉ rút gọn thanh điều hướng còn 3 phần:

1. **JMH Benchmark Runner** — cấu hình/chạy phần benchmark trên giao diện.
2. **Báo cáo & Biểu đồ** — các biểu đồ và tab phân tích QR nằm trong `BrownToneReportTab`.
3. **Đánh giá khả năng quét QR** — trang `QrCodeTab` độc lập.

## Chạy thử

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Mở URL Vite in ra trong terminal (thường là `http://localhost:3000`).

## Build kiểm tra

```bash
npm run build
```

## Lưu ý quan trọng về số liệu

Giao diện Benchmark hiện tại có phần mô phỏng kết quả/tiến trình trong trình duyệt (`src/components/BenchmarkTab.tsx`, `src/utils/benchmarkEngine.ts`). Nó không tự chạy Java JMH ở backend. Các số liệu có sẵn trong trang báo cáo cũng được khai báo sẵn trong mã nguồn. Không nên trình bày chúng là kết quả đo mới nếu chưa chạy benchmark Java thật và xác nhận môi trường đo.

`src/App.tsx` được giữ nguyên theo yêu cầu; các tab Checklist, Security và Java Code Viewer vẫn còn trong source nhưng không còn nút điều hướng ở thanh tab.
