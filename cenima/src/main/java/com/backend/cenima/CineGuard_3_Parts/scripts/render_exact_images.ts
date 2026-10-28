import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import QRCode from 'qrcode';

const outputDir = path.resolve(process.cwd(), 'public/reports');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function renderExactImages() {
  console.log('Generating exact images according to user reference images...');

  // Generate QR for RS256 (~716 chars)
  const dummyJwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikhvw6BuZyBNaW5oIFRyYW5nIiwidGlja2V0SWQiOiJUQ0stMjAyNjEwMjctODkxMiIsIm1vdmllIjoiRHVuZTogUGFydCBUaHJlZSAoSU1BWCAzRCBMYXNlcikiLCJzZWF0IjoiVklQLUgxMiIsImlhdCI6MTc2MTU1MjAwMCwiZXhwIjoxNzYxNTYyODAwfQ.' +
    'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c_DummyRS256_Signature_CineGuard_Security_Benchmark_LongBytes_Padding_For_Realistic_716_Chars_Length_Testing_At_Turnstiles_Theater_Gate_Verification_Key_Pair';
  
  const qrDataUrl = await QRCode.toDataURL(dummyJwt, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#020617', light: '#ffffff' }
  });
  const qrBase64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');

  // ============================================================================
  // HÌNH 1: GIAO DIỆN CHUẨN XÁC THEO ẢNH 1 (4 CARDS + BIỂU ĐỒ SO SÁNH)
  // ============================================================================
  const svg1 = `
  <svg width="1600" height="920" viewBox="0 0 1600 920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; fill: #ffffff; }
        .sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; fill: #94a3b8; }
        .badge { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; font-weight: 600; }
        .card-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 20px; font-weight: 700; fill: #ffffff; }
        .card-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; fill: #64748b; }
        .metric-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13.5px; fill: #94a3b8; }
        .metric-val { font-family: "Courier New", monospace, sans-serif; font-size: 14px; font-weight: 700; }
        .tab-btn { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: 600; }
        .bar-label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 700; fill: #ffffff; }
        .bar-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; fill: #64748b; }
        .bar-val { font-family: "Courier New", monospace, sans-serif; font-size: 14px; font-weight: 700; fill: #f59e0b; }
      </style>
    </defs>

    <!-- Nền Dark Navy chuẩn xác theo ảnh 1 (#090e17) -->
    <rect width="1600" height="920" fill="#090e17"/>

    <!-- TOP ROW: 4 CARDS THUẬT TOÁN -->
    <!-- Card 1: RS256 -->
    <g transform="translate(40, 30)">
      <rect width="360" height="390" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>
      <text x="24" y="40" class="card-title">RS256</text>
      <rect x="250" y="24" width="86" height="24" rx="12" fill="#1e293b"/>
      <text x="293" y="40" text-anchor="middle" class="badge" fill="#60a5fa">Truyền thống</text>
      <text x="24" y="65" class="card-sub">RFC 7518 / PKCS#1 v1.5</text>

      <line x1="24" y1="85" x2="336" y2="85" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="115" class="metric-label">Thời gian Ký (Signing):</text>
      <text x="336" y="115" text-anchor="end" class="metric-val" fill="#f59e0b">849.74 µs</text>

      <text x="24" y="150" class="metric-label">Xác thực (Verification):</text>
      <text x="336" y="150" text-anchor="end" class="metric-val" fill="#10b981">45.06 µs</text>

      <text x="24" y="185" class="metric-label">Tạo khóa (KeyGen):</text>
      <text x="336" y="185" text-anchor="end" class="metric-val" fill="#e2e8f0">12.76 ms</text>

      <text x="24" y="220" class="metric-label">Throughput (Tốc độ):</text>
      <text x="336" y="220" text-anchor="end" class="metric-val" fill="#06b6d4">1,177 ops/s</text>

      <text x="24" y="255" class="metric-label">Kích thước chữ ký:</text>
      <text x="336" y="255" text-anchor="end" class="metric-val" fill="#e2e8f0">256 bytes</text>

      <text x="24" y="290" class="metric-label">Tổng kích thước JWT:</text>
      <text x="336" y="290" text-anchor="end" class="metric-val" fill="#e2e8f0">~716 chars</text>

      <line x1="24" y1="320" x2="336" y2="320" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="355" class="metric-label">Mật độ quét QR:</text>
      <text x="336" y="355" text-anchor="end" class="metric-val" fill="#e2e8f0">Thoáng</text>
    </g>

    <!-- Card 2: ES256 -->
    <g transform="translate(425, 30)">
      <rect width="360" height="390" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>
      <text x="24" y="40" class="card-title">ES256</text>
      <rect x="250" y="24" width="86" height="24" rx="12" fill="#064e3b" fill-opacity="0.5"/>
      <text x="293" y="40" text-anchor="middle" class="badge" fill="#34d399">Truyền thống</text>
      <text x="24" y="65" class="card-sub">RFC 7518 / NIST P-256</text>

      <line x1="24" y1="85" x2="336" y2="85" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="115" class="metric-label">Thời gian Ký (Signing):</text>
      <text x="336" y="115" text-anchor="end" class="metric-val" fill="#f59e0b">124.93 µs</text>

      <text x="24" y="150" class="metric-label">Xác thực (Verification):</text>
      <text x="336" y="150" text-anchor="end" class="metric-val" fill="#10b981">286.49 µs</text>

      <text x="24" y="185" class="metric-label">Tạo khóa (KeyGen):</text>
      <text x="336" y="185" text-anchor="end" class="metric-val" fill="#e2e8f0">0.16 ms</text>

      <text x="24" y="220" class="metric-label">Throughput (Tốc độ):</text>
      <text x="336" y="220" text-anchor="end" class="metric-val" fill="#06b6d4">8,004 ops/s</text>

      <text x="24" y="255" class="metric-label">Kích thước chữ ký:</text>
      <text x="336" y="255" text-anchor="end" class="metric-val" fill="#e2e8f0">64 bytes</text>

      <text x="24" y="290" class="metric-label">Tổng kích thước JWT:</text>
      <text x="336" y="290" text-anchor="end" class="metric-val" fill="#e2e8f0">~694 chars</text>

      <line x1="24" y1="320" x2="336" y2="320" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="355" class="metric-label">Mật độ quét QR:</text>
      <text x="336" y="355" text-anchor="end" class="metric-val" fill="#e2e8f0">Cực thoáng</text>
    </g>

    <!-- Card 3: EdDSA -->
    <g transform="translate(810, 30)">
      <rect width="360" height="390" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>
      <text x="24" y="40" class="card-title">EdDSA</text>
      <rect x="250" y="24" width="86" height="24" rx="12" fill="#3b0764" fill-opacity="0.6"/>
      <text x="293" y="40" text-anchor="middle" class="badge" fill="#c084fc">Truyền thống</text>
      <text x="24" y="65" class="card-sub">RFC 8037 / Edwards-curve Ed25519</text>

      <line x1="24" y1="85" x2="336" y2="85" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="115" class="metric-label">Thời gian Ký (Signing):</text>
      <text x="336" y="115" text-anchor="end" class="metric-val" fill="#f59e0b">35.25 µs</text>

      <text x="24" y="150" class="metric-label">Xác thực (Verification):</text>
      <text x="336" y="150" text-anchor="end" class="metric-val" fill="#10b981">88.01 µs</text>

      <text x="24" y="185" class="metric-label">Tạo khóa (KeyGen):</text>
      <text x="336" y="185" text-anchor="end" class="metric-val" fill="#e2e8f0">0.046 ms</text>

      <text x="24" y="220" class="metric-label">Throughput (Tốc độ):</text>
      <text x="336" y="220" text-anchor="end" class="metric-val" fill="#06b6d4">28,369 ops/s</text>

      <text x="24" y="255" class="metric-label">Kích thước chữ ký:</text>
      <text x="336" y="255" text-anchor="end" class="metric-val" fill="#e2e8f0">64 bytes</text>

      <text x="24" y="290" class="metric-label">Tổng kích thước JWT:</text>
      <text x="336" y="290" text-anchor="end" class="metric-val" fill="#e2e8f0">~694 chars</text>

      <line x1="24" y1="320" x2="336" y2="320" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="355" class="metric-label">Mật độ quét QR:</text>
      <text x="336" y="355" text-anchor="end" class="metric-val" fill="#e2e8f0">Rất thoáng</text>
    </g>

    <!-- Card 4: ML-DSA-44 -->
    <g transform="translate(1195, 30)">
      <rect width="365" height="390" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>
      <text x="24" y="40" class="card-title">ML-DSA-44</text>
      <rect x="250" y="24" width="90" height="24" rx="12" fill="#78350f" fill-opacity="0.5"/>
      <text x="295" y="40" text-anchor="middle" class="badge" fill="#fbbf24">Hậu lượng tử</text>
      <text x="24" y="65" class="card-sub">NIST FIPS 204 / RFC 9964 draft</text>

      <line x1="24" y1="85" x2="341" y2="85" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="115" class="metric-label">Thời gian Ký (Signing):</text>
      <text x="341" y="115" text-anchor="end" class="metric-val" fill="#f59e0b">144.42 µs</text>

      <text x="24" y="150" class="metric-label">Xác thực (Verification):</text>
      <text x="341" y="150" text-anchor="end" class="metric-val" fill="#10b981">120.44 µs</text>

      <text x="24" y="185" class="metric-label">Tạo khóa (KeyGen):</text>
      <text x="341" y="185" text-anchor="end" class="metric-val" fill="#e2e8f0">0.244 ms</text>

      <text x="24" y="220" class="metric-label">Throughput (Tốc độ):</text>
      <text x="341" y="220" text-anchor="end" class="metric-val" fill="#06b6d4">6,924 ops/s</text>

      <text x="24" y="255" class="metric-label">Kích thước chữ ký:</text>
      <text x="341" y="255" text-anchor="end" class="metric-val" fill="#f43f5e">2,420 bytes</text>

      <text x="24" y="290" class="metric-label">Tổng kích thước JWT:</text>
      <text x="341" y="290" text-anchor="end" class="metric-val" fill="#fbbf24">~3,807 chars</text>

      <line x1="24" y1="320" x2="341" y2="320" stroke="#1e293b" stroke-width="1"/>

      <text x="24" y="355" class="metric-label">Mật độ quét QR:</text>
      <text x="341" y="355" text-anchor="end" class="metric-val" fill="#e2e8f0">Rất dày (High Density)</text>
    </g>

    <!-- BOTTOM SECTION: BIỂU ĐỒ SO SÁNH TRỰC QUAN (TASK 4 VISUALIZATION) -->
    <g transform="translate(40, 450)">
      <rect width="1520" height="430" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>

      <!-- Header & Subtitle -->
      <text x="30" y="45" class="title" font-size="18">🕒 Biểu đồ So sánh Trực quan (Task 4 Visualization)</text>
      <text x="30" y="70" class="sub">So sánh chỉ số thực tế giữa các thuật toán</text>

      <!-- Navigation filter buttons -->
      <g transform="translate(640, 24)">
        <rect width="850" height="38" rx="8" fill="#090e17"/>
        
        <!-- Button 1: Thời gian ký -->
        <rect x="5" y="4" width="135" height="30" rx="6" fill="#090e17"/>
        <text x="72" y="24" text-anchor="middle" class="tab-btn" fill="#94a3b8">Thời gian Ký (µs)</text>

        <!-- Button 2: Xác thực (Active in orange) -->
        <rect x="145" y="4" width="115" height="30" rx="6" fill="#f59e0b"/>
        <text x="202" y="24" text-anchor="middle" class="tab-btn" fill="#090e17" font-weight="700">Xác thực (µs)</text>

        <!-- Button 3: Throughput -->
        <text x="330" y="24" text-anchor="middle" class="tab-btn" fill="#94a3b8">Throughput (ops/s)</text>

        <!-- Button 4: Kích thước chữ ký -->
        <text x="490" y="24" text-anchor="middle" class="tab-btn" fill="#94a3b8">Kích thước Chữ ký (bytes)</text>

        <!-- Button 5: KeyGen -->
        <text x="690" y="24" text-anchor="middle" class="tab-btn" fill="#94a3b8">Tạo khóa KeyGen (ms)</text>
      </g>

      <!-- Horizontal Comparison Bars for "Xác thực (µs)" -->
      <!-- Row 1: RS256 -->
      <g transform="translate(30, 110)">
        <text x="0" y="20" class="bar-label">RS256</text>
        <text x="110" y="20" class="bar-sub">RFC 7518 / PKCS#1 v1.5</text>
        <text x="1450" y="20" text-anchor="end" class="bar-val">45.06 µs</text>

        <!-- Bar track and fill -->
        <rect x="0" y="32" width="1450" height="20" rx="6" fill="#090e17"/>
        <rect x="0" y="32" width="200" height="20" rx="6" fill="#3b82f6"/>
      </g>

      <!-- Row 2: ES256 -->
      <g transform="translate(30, 185)">
        <text x="0" y="20" class="bar-label">ES256</text>
        <text x="110" y="20" class="bar-sub">RFC 7518 / NIST P-256</text>
        <text x="1450" y="20" text-anchor="end" class="bar-val">286.49 µs</text>

        <!-- Bar track and fill -->
        <rect x="0" y="32" width="1450" height="20" rx="6" fill="#090e17"/>
        <rect x="0" y="32" width="1280" height="20" rx="6" fill="#10b981"/>
      </g>

      <!-- Row 3: EdDSA -->
      <g transform="translate(30, 260)">
        <text x="0" y="20" class="bar-label">EdDSA</text>
        <text x="110" y="20" class="bar-sub">RFC 8037 / Edwards-curve Ed25519</text>
        <text x="1450" y="20" text-anchor="end" class="bar-val">88.01 µs</text>

        <!-- Bar track and fill -->
        <rect x="0" y="32" width="1450" height="20" rx="6" fill="#090e17"/>
        <rect x="0" y="32" width="390" height="20" rx="6" fill="#8b5cf6"/>
      </g>

      <!-- Row 4: ML-DSA-44 -->
      <g transform="translate(30, 335)">
        <text x="0" y="20" class="bar-label">ML-DSA-44</text>
        <text x="125" y="20" class="bar-sub">NIST FIPS 204 / RFC 9964 draft</text>
        <text x="1450" y="20" text-anchor="end" class="bar-val">120.44 µs</text>

        <!-- Bar track and fill -->
        <rect x="0" y="32" width="1450" height="20" rx="6" fill="#090e17"/>
        <rect x="0" y="32" width="530" height="20" rx="6" fill="#f59e0b"/>
      </g>
    </g>
  </svg>
  `;

  // ============================================================================
  // HÌNH 2: GIAO DIỆN CHUẨN XÁC THEO ẢNH 2 (VÉ QR + PHÂN TÍCH KIẾN TRÚC)
  // ============================================================================
  const svg2 = `
  <svg width="1600" height="880" viewBox="0 0 1600 880" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .header-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 17px; font-weight: 700; fill: #ffffff; }
        .chars-tag { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: 600; fill: #94a3b8; }
        .ticket-brand { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; font-weight: 800; fill: #64748b; letter-spacing: 1px; }
        .ticket-movie { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; font-weight: 800; fill: #0f172a; }
        .ticket-meta { font-family: "Courier New", monospace, sans-serif; font-size: 12px; font-weight: 700; fill: #334155; }
        
        .main-analysis-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: 800; fill: #f59e0b; letter-spacing: 0.5px; }
        .tradeoff-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 19px; font-weight: 800; fill: #ffffff; }
        
        .box-title-green { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14.5px; font-weight: 700; fill: #34d399; }
        .box-title-amber { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14.5px; font-weight: 700; fill: #fbbf24; }
        .box-title-cyan { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14.5px; font-weight: 700; fill: #38bdf8; }
        
        .box-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13.5px; line-height: 1.55; }
      </style>
    </defs>

    <!-- Nền Dark Navy chuẩn xác theo ảnh 2 (#090e17) -->
    <rect width="1600" height="880" fill="#090e17"/>

    <!-- LEFT COLUMN: THẺ VÉ E-TICKET VỚI MÃ QR -->
    <g transform="translate(40, 30)">
      <rect width="640" height="820" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>

      <!-- Header row: ● RS256 (RSA 2048-bit) and 716 ký tự -->
      <circle cx="45" cy="48" r="5" fill="#3b82f6"/>
      <text x="60" y="53" class="header-title">RS256 (RSA 2048-bit)</text>
      <text x="595" y="53" text-anchor="end" class="chars-tag">716 ký tự</text>

      <!-- White Cinema Ticket Card -->
      <g transform="translate(140, 110)">
        <rect width="360" height="580" rx="20" fill="#ffffff" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.5))"/>

        <text x="180" y="45" text-anchor="middle" class="ticket-brand">CINEGUARD E-TICKET</text>
        <text x="180" y="75" text-anchor="middle" class="ticket-movie">Dune: Part Three (IMAX 3D Laser)</text>

        <!-- Real QR Code Image Box -->
        <rect x="30" y="100" width="300" height="300" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
        <image href="data:image/png;base64,${qrBase64Data}" x="40" y="110" width="280" height="280"/>

        <!-- Ticket Dashed Divider -->
        <line x1="30" y1="460" x2="330" y2="460" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>

        <!-- Bottom Ticket Metadata -->
        <text x="35" y="505" class="ticket-meta">Ghế: VIP-H12</text>
        <text x="325" y="505" text-anchor="end" class="ticket-meta">TCK-20261027-8912</text>
      </g>
    </g>

    <!-- RIGHT COLUMN: PHÂN TÍCH KỸ THUẬT & ĐỀ XUẤT KIẾN TRÚC -->
    <g transform="translate(710, 30)">
      <rect width="850" height="820" rx="16" fill="#0d1527" stroke="#1e293b" stroke-width="1.5"/>

      <g transform="translate(35, 35)">
        <text x="0" y="20" class="main-analysis-title">PHÂN TÍCH KỸ THUẬT &amp; ĐỀ XUẤT KIẾN TRÚC CHO NHÓM</text>
        <text x="0" y="52" class="tradeoff-title">Bài toán đánh đổi (Trade-off): An toàn Hậu lượng tử vs Trải nghiệm quét vé tại rạp</text>

        <!-- Block 1: Chữ ký truyền thống -->
        <g transform="translate(0, 80)">
          <rect width="780" height="150" rx="12" fill="#064e3b" fill-opacity="0.15" stroke="#059669" stroke-width="1.2" stroke-opacity="0.4"/>
          <circle cx="30" cy="30" r="9" fill="#059669" fill-opacity="0.2"/>
          <text x="30" y="34" text-anchor="middle" font-size="12" fill="#34d399">✓</text>
          <text x="50" y="35" class="box-title-green">Chữ ký truyền thống (ES256 / EdDSA):</text>
          <text x="30" y="72" class="box-body" fill="#cbd5e1">
            Chữ ký cực kỳ nhỏ gọn (64 bytes). Tổng chuỗi JWT chỉ khoảng 350-390 ký tự, sinh ra mã QR Version 7-8 với các ô vuông rất to và thưa. Bất kỳ camera smartphone giá rẻ hoặc ánh sáng phòng vé yếu đều quét được trong chớp mắt (&lt; 150ms).
          </text>
        </g>

        <!-- Block 2: Chữ ký Hậu lượng tử ML-DSA-44 -->
        <g transform="translate(0, 250)">
          <rect width="780" height="165" rx="12" fill="#78350f" fill-opacity="0.15" stroke="#d97706" stroke-width="1.2" stroke-opacity="0.4"/>
          <text x="24" y="35" font-size="14" fill="#fbbf24">⚠️</text>
          <text x="50" y="35" class="box-title-amber">Chữ ký Hậu lượng tử ML-DSA-44 (Dilithium 2):</text>
          <text x="30" y="72" class="box-body" fill="#cbd5e1">
            ML-DSA-44 an toàn tuyệt đối trước máy tính lượng tử, tuy nhiên kích thước chữ ký là <tspan font-weight="bold" fill="#fde68a">2,420 bytes</tspan>. Khi mã hóa JWT đầy đủ, chuỗi token dài tới <tspan font-weight="bold" fill="#fde68a">~3,450 ký tự</tspan>. Để nén chuỗi này vào QR, mã QR phải dùng tới Version 28-32 (ma trận hơn 130x130 điểm cực kỳ dày đặc). Màn hình điện thoại bị xước hoặc camera quét góc nghiêng sẽ khó nhận diện.
          </text>
        </g>

        <!-- Block 3: Giải pháp kiến trúc tối ưu -->
        <g transform="translate(0, 435)">
          <rect width="780" height="280" rx="12" fill="#082f49" fill-opacity="0.25" stroke="#0284c7" stroke-width="1.2" stroke-opacity="0.4"/>
          <text x="24" y="35" font-size="14" fill="#38bdf8">✨</text>
          <text x="50" y="35" class="box-title-cyan">Giải pháp kiến trúc tối ưu cho Ngọc và Tùng (Được đề xuất bởi Trang):</text>

          <text x="30" y="75" class="box-body" fill="#e2e8f0">
            • <tspan font-weight="bold" fill="#38bdf8">Mô hình Hybrid 1 (Reference Ticket):</tspan> QR code trên vé của khách hàng chỉ chứa <tspan font-style="italic">Ticket ID ngắn + Signature Hash</tspan> (~120 chars, quét siêu nhanh). Thiết bị cổng soát vé rạp tải JWT ML-DSA-44 đầy đủ từ Edge Server qua mTLS an toàn hậu lượng tử để xác thực.
          </text>

          <text x="30" y="160" class="box-body" fill="#e2e8f0">
            • <tspan font-weight="bold" fill="#38bdf8">Mô hình Hybrid 2 (Offline Standalone):</tspan> Nếu rạp mất mạng (yêu cầu Offline Verification), trang bị đầu đọc mã vạch 2D công nghiệp chuyên dụng (Honeywell/Zebra có cảm biến phân giải cao &gt; 1 Megapixel) để quét trực tiếp mã QR dày của ML-DSA-44.
          </text>
        </g>
      </g>
    </g>
  </svg>
  `;

  const file1Path = path.join(outputDir, 'anh_1_tong_ket_hieu_nang.png');
  const file2Path = path.join(outputDir, 'anh_2_tong_ket_qr_phan_tich.png');

  await sharp(Buffer.from(svg1))
    .png({ quality: 100, compressionLevel: 8 })
    .toFile(file1Path);
  console.log('✅ Rendered Image 1:', file1Path);

  await sharp(Buffer.from(svg2))
    .png({ quality: 100, compressionLevel: 8 })
    .toFile(file2Path);
  console.log('✅ Rendered Image 2:', file2Path);
}

renderExactImages().catch(err => {
  console.error('Error rendering exact images:', err);
  process.exit(1);
});
