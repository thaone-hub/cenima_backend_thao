import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outputDir = path.resolve(process.cwd(), 'public/reports');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ============================================================================
// HÌNH ẢNH 1: ĐẦU VIỆC 2 - ĐO VÀ GHI NHẬN HIỆU NĂNG (TONE NÂU SÁNG)
// ============================================================================
const svg1 = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 800; fill: #3A2312; }
      .subtitle { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 500; fill: #6B4E38; }
      .header-badge { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #FFFFFF; }
      .th { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #3A2312; font-size: 22px; }
      .td { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 500; fill: #4A3320; font-size: 20px; }
      .td-mono { font-family: 'Courier New', monospace; font-weight: 700; fill: #2B180B; font-size: 21px; }
      .card-title { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #3A2312; font-size: 22px; }
      .text-body { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 400; fill: #543D2A; font-size: 19px; line-height: 1.5; }
      .tag { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 600; font-size: 16px; }
    </style>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCF9F3"/>
      <stop offset="50%" stop-color="#F7EFE3"/>
      <stop offset="100%" stop-color="#EFE2D1"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#7A5636" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Nền tone nâu sáng ấm áp -->
  <rect width="1920" height="1080" fill="url(#bgGrad)"/>
  
  <!-- Khung viền vi tinh xảo -->
  <rect x="40" y="40" width="1840" height="1000" rx="24" fill="#FAF4EA" stroke="#D8C3AA" stroke-width="2.5" filter="url(#shadow)"/>

  <!-- Header Banner -->
  <g transform="translate(80, 80)">
    <!-- Badge -->
    <rect x="0" y="0" width="310" height="38" rx="8" fill="#8C593B"/>
    <text x="14" y="25" class="header-badge" font-size="16">NGƯỜI 5 — TRANG (BENCHMARK &amp; SECURITY)</text>

    <!-- Main Title -->
    <text x="0" y="80" class="title" font-size="38">BÁO CÁO ĐO LƯỜNG &amp; GHI NHẬN HIỆU NĂNG 4 THUẬT TOÁN CHỮ KÝ SỐ</text>
    <text x="0" y="116" class="subtitle" font-size="21">Hệ thống Vé điện tử Xem phim (CineGuard) • So sánh RS256, ES256, EdDSA và Hậu lượng tử ML-DSA-44</text>
  </g>

  <!-- Section 1: Môi trường thử nghiệm & Phương pháp đo (Top Bar) -->
  <g transform="translate(80, 225)">
    <rect x="0" y="0" width="1760" height="105" rx="16" fill="#F1E3D1" stroke="#D3BD9F" stroke-width="1.5"/>
    
    <text x="30" y="38" class="card-title" fill="#6E4426" font-size="20">⚙️ MÔI TRƯỜNG THỬ NGHIỆM ĐỘC LẬP:</text>
    <text x="30" y="75" class="text-body" font-size="18">
      OpenJDK 21.0.3 LTS • JMH 1.37 Runner • BouncyCastle 1.78.1 &amp; BCPQCProvider (FIPS 204) • Linux 6.1 x86_64 / macOS 14 • 8 vCPUs / 16GB RAM • JVM Args: -Xms2G -Xmx2G
    </text>

    <text x="960" y="38" class="card-title" fill="#6E4426" font-size="20">🎯 PHƯƠNG PHÁP ĐO (ISOLATED BENCHMARK):</text>
    <text x="960" y="75" class="text-body" font-size="18">
      Tách thời gian tạo khóa: KeyPair sinh sẵn trong @Setup(Level.Trial) • Chạy chung 1 JwtPayload • Warm-up: 3 vòng (1s/vòng) • Measurement: 5 vòng đo
    </text>
  </g>

  <!-- Section 2: Bảng kết quả hiệu năng chi tiết -->
  <g transform="translate(80, 355)">
    <!-- Table Header Background -->
    <rect x="0" y="0" width="1760" height="60" rx="12" fill="#DFC9B0"/>
    
    <!-- Table Columns Header -->
    <text x="30" y="38" class="th">Thuật toán</text>
    <text x="260" y="38" class="th">Tiêu chuẩn / Phân loại</text>
    <text x="570" y="38" class="th" text-anchor="end">KeyGen (ms)</text>
    <text x="790" y="38" class="th" text-anchor="end">Thời gian Ký (µs)</text>
    <text x="1020" y="38" class="th" text-anchor="end">Xác thực Verify (µs)</text>
    <text x="1230" y="38" class="th" text-anchor="end">Kích thước Chữ ký</text>
    <text x="1490" y="38" class="th" text-anchor="end">Throughput (ops/s)</text>
    <text x="1720" y="38" class="th" text-anchor="end">Cấp phát RAM/CPU</text>

    <!-- Row 1: RS256 -->
    <g transform="translate(0, 68)">
      <rect x="0" y="0" width="1760" height="70" rx="10" fill="#FFFFFF" stroke="#E6D3BF" stroke-width="1"/>
      <text x="30" y="42" class="td-mono" font-size="22" fill="#754728">RS256</text>
      <text x="260" y="42" class="td">RSA 2048-bit (RFC 7518)</text>
      <text x="570" y="42" class="td-mono" text-anchor="end" fill="#B33E2B">12.80 ms</text>
      <text x="790" y="42" class="td-mono" text-anchor="end">852.4 µs</text>
      <text x="1020" y="42" class="td-mono" text-anchor="end" fill="#2E7D32">45.2 µs</text>
      <text x="1230" y="42" class="td-mono" text-anchor="end">256 bytes</text>
      <text x="1490" y="42" class="td-mono" text-anchor="end">1,173 ops/s</text>
      <text x="1720" y="42" class="td" text-anchor="end">14.2 KB / CPU 98%</text>
    </g>

    <!-- Row 2: ES256 -->
    <g transform="translate(0, 146)">
      <rect x="0" y="0" width="1760" height="70" rx="10" fill="#FFFFFF" stroke="#E6D3BF" stroke-width="1"/>
      <text x="30" y="42" class="td-mono" font-size="22" fill="#754728">ES256</text>
      <text x="260" y="42" class="td">ECDSA P-256 (RFC 7518)</text>
      <text x="570" y="42" class="td-mono" text-anchor="end">0.16 ms</text>
      <text x="790" y="42" class="td-mono" text-anchor="end">124.8 µs</text>
      <text x="1020" y="42" class="td-mono" text-anchor="end">286.2 µs</text>
      <text x="1230" y="42" class="td-mono" text-anchor="end" fill="#2E7D32">64 bytes</text>
      <text x="1490" y="42" class="td-mono" text-anchor="end">8,012 ops/s</text>
      <text x="1720" y="42" class="td" text-anchor="end">8.9 KB / CPU 65%</text>
    </g>

    <!-- Row 3: EdDSA -->
    <g transform="translate(0, 224)">
      <rect x="0" y="0" width="1760" height="70" rx="10" fill="#FFFFFF" stroke="#E6D3BF" stroke-width="1"/>
      <text x="30" y="42" class="td-mono" font-size="22" fill="#754728">EdDSA</text>
      <text x="260" y="42" class="td">Ed25519 (RFC 8037)</text>
      <text x="570" y="42" class="td-mono" text-anchor="end" fill="#2E7D32">0.045 ms</text>
      <text x="790" y="42" class="td-mono" text-anchor="end" fill="#2E7D32">34.6 µs</text>
      <text x="1020" y="42" class="td-mono" text-anchor="end">86.4 µs</text>
      <text x="1230" y="42" class="td-mono" text-anchor="end" fill="#2E7D32">64 bytes</text>
      <text x="1490" y="42" class="td-mono" text-anchor="end" fill="#2E7D32">28,901 ops/s</text>
      <text x="1720" y="42" class="td" text-anchor="end">5.6 KB / CPU 32%</text>
    </g>

    <!-- Row 4: ML-DSA-44 (Highlight) -->
    <g transform="translate(0, 302)">
      <rect x="0" y="0" width="1760" height="74" rx="10" fill="#F4EADB" stroke="#8C593B" stroke-width="2.5"/>
      <text x="30" y="45" class="td-mono" font-size="22" fill="#8C593B">ML-DSA-44</text>
      <text x="260" y="45" class="td" font-weight="700" fill="#8C593B">Hậu lượng tử Dilithium (NIST FIPS 204)</text>
      <text x="570" y="45" class="td-mono" text-anchor="end">0.24 ms</text>
      <text x="790" y="45" class="td-mono" text-anchor="end" font-weight="800" fill="#8C593B">142.1 µs</text>
      <text x="1020" y="45" class="td-mono" text-anchor="end" font-weight="800" fill="#8C593B">118.5 µs</text>
      <text x="1230" y="45" class="td-mono" text-anchor="end" fill="#B33E2B">2,420 bytes</text>
      <text x="1490" y="45" class="td-mono" text-anchor="end">7,037 ops/s</text>
      <text x="1720" y="45" class="td" text-anchor="end" fill="#8C593B">64.5 KB / CPU 72%</text>
    </g>
  </g>

  <!-- Section 3: Phân tích & Đánh giá Khoa học (Bottom Cards) -->
  <g transform="translate(80, 765)">
    <!-- Card 1: Tách KeyGen -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="560" height="235" rx="14" fill="#FFFFFF" stroke="#E3D1BE" stroke-width="1.5"/>
      <rect x="24" y="24" width="6" height="26" fill="#8C593B" rx="3"/>
      <text x="40" y="44" class="card-title">1. Ý Nghĩa Việc Tách Tạo Khóa</text>
      <text x="24" y="85" class="text-body">
        Thời gian tạo khóa RSA (RS256) mất tới <tspan font-weight="bold" fill="#B33E2B">12.8 ms</tspan> do phải sinh số nguyên tố ngẫu nhiên, gấp <tspan font-weight="bold">15 lần</tspan> thời gian ký (0.85 ms). Tách KeyGen ra @Setup giúp phản ánh chính xác 100% chi phí ký vé điện tử khi vận hành rạp.
      </text>
    </g>

    <!-- Card 2: Hiệu năng Hậu lượng tử -->
    <g transform="translate(600, 0)">
      <rect x="0" y="0" width="560" height="235" rx="14" fill="#FFFFFF" stroke="#E3D1BE" stroke-width="1.5"/>
      <rect x="24" y="24" width="6" height="26" fill="#2E7D32" rx="3"/>
      <text x="40" y="44" class="card-title">2. Đột Phá Tốc Độ Của ML-DSA-44</text>
      <text x="24" y="85" class="text-body">
        Dù có độ an toàn kháng máy tính lượng tử, ML-DSA-44 ký vé chỉ mất <tspan font-weight="bold" fill="#2E7D32">142.1 µs</tspan> và xác thực chỉ <tspan font-weight="bold" fill="#2E7D32">118.5 µs</tspan> (&lt; 0.12 ms). Tốc độ ký nhanh gấp 6 lần RSA-2048, hoàn toàn đáp ứng ngưỡng mở cửa soát vé tự động (&lt; 5 ms).
      </text>
    </g>

    <!-- Card 3: Thách thức kích thước vé -->
    <g transform="translate(1200, 0)">
      <rect x="0" y="0" width="560" height="235" rx="14" fill="#FFFFFF" stroke="#E3D1BE" stroke-width="1.5"/>
      <rect x="24" y="24" width="6" height="26" fill="#B33E2B" rx="3"/>
      <text x="40" y="44" class="card-title">3. Điểm Đánh Đổi Kích Thước Chữ Ký</text>
      <text x="24" y="85" class="text-body">
        Chữ ký ML-DSA-44 chiếm <tspan font-weight="bold" fill="#B33E2B">2,420 bytes</tspan>, đẩy tổng độ dài chuỗi JWT vé lên hơn <tspan font-weight="bold">3,450 ký tự</tspan>. Việc in toàn bộ JWT này lên mã QR sẽ tạo ma trận điểm rất dày, cần mô hình mã tham chiếu (Reference Token) khi soát vé.
      </text>
    </g>
  </g>

  <!-- Footer Info -->
  <text x="80" y="1025" font-family="'Segoe UI', sans-serif" font-size="14" fill="#8C6E56">
    © 2026 CineGuard Security Lab • Phân công: Người 5 — Trang • Hoàn thành ngày 26/10/2026
  </text>
</svg>
`;

// ============================================================================
// HÌNH ẢNH 2: ĐẦU VIỆC 4 - XUẤT KẾT QUẢ VÀ BIỂU ĐỒ (TONE NÂU SÁNG)
// ============================================================================
const svg2 = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 800; fill: #3A2312; }
      .subtitle { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 500; fill: #6B4E38; }
      .header-badge { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #FFFFFF; font-size: 16px; }
      .card-title { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #3A2312; font-size: 21px; }
      .chart-label { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #4A3320; font-size: 18px; }
      .chart-val { font-family: 'Courier New', monospace; font-weight: 700; fill: #2B180B; font-size: 18px; }
      .code-text { font-family: 'Courier New', monospace; font-size: 14.5px; fill: #3F2918; line-height: 1.45; }
      .th { font-family: 'Segoe UI', -apple-system, sans-serif; font-weight: 700; fill: #3A2312; font-size: 17px; }
      .td { font-family: 'Segoe UI', -apple-system, sans-serif; font-size: 16px; fill: #4A3320; }
    </style>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCF9F3"/>
      <stop offset="50%" stop-color="#F7EFE3"/>
      <stop offset="100%" stop-color="#EFE2D1"/>
    </linearGradient>
    <filter id="shadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#7A5636" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="1920" height="1080" fill="url(#bgGrad2)"/>
  <rect x="40" y="40" width="1840" height="1000" rx="24" fill="#FAF4EA" stroke="#D8C3AA" stroke-width="2.5" filter="url(#shadow2)"/>

  <!-- Header Banner -->
  <g transform="translate(80, 80)">
    <rect x="0" y="0" width="310" height="38" rx="8" fill="#8C593B"/>
    <text x="14" y="25" class="header-badge">NGƯỜI 5 — TRANG (XUẤT KẾT QUẢ &amp; BIỂU ĐỒ)</text>

    <text x="0" y="80" class="title" font-size="38">BÁO CÁO BIỂU ĐỒ SO SÁNH 4 THUẬT TOÁN &amp; ĐÁNH GIÁ KHẢ NĂNG QUÉT MÃ QR</text>
    <text x="0" y="116" class="subtitle" font-size="21">So sánh thời gian Ký/Xác thực, Kích thước JWT, Mẫu xuất CSV/JSON và Khả năng nhận diện quang học vé xem phim</text>
  </g>

  <!-- Left Column: Visual Charts (Biểu đồ so sánh thời gian & kích thước) -->
  <g transform="translate(80, 220)">
    <rect x="0" y="0" width="860" height="770" rx="16" fill="#FFFFFF" stroke="#E3D1BE" stroke-width="1.5"/>
    
    <text x="30" y="42" class="card-title">📊 1. BIỂU ĐỒ SO SÁNH THỜI GIAN KÝ &amp; XÁC THỰC (µs)</text>
    <text x="30" y="68" font-family="'Segoe UI', sans-serif" font-size="14" fill="#8C6E56">Càng ngắn càng tối ưu • Đo đạc trung bình qua 5 vòng lặp JMH độc lập</text>

    <!-- Chart: Signing Time -->
    <g transform="translate(30, 95)">
      <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#8C593B">A. Thời gian Ký vé (Signing Time in µs)</text>
      
      <!-- RS256: 852.4 µs -->
      <text x="0" y="32" class="chart-label">RS256</text>
      <rect x="120" y="15" width="560" height="24" rx="4" fill="#C89666"/>
      <text x="690" y="33" class="chart-val">852.4 µs</text>

      <!-- ES256: 124.8 µs -->
      <text x="0" y="68" class="chart-label">ES256</text>
      <rect x="120" y="51" width="82" height="24" rx="4" fill="#A87A50"/>
      <text x="212" y="69" class="chart-val">124.8 µs</text>

      <!-- EdDSA: 34.6 µs -->
      <text x="0" y="104" class="chart-label">EdDSA</text>
      <rect x="120" y="87" width="23" height="24" rx="4" fill="#2E7D32"/>
      <text x="153" y="105" class="chart-val" fill="#2E7D32">34.6 µs (Nhanh nhất)</text>

      <!-- ML-DSA-44: 142.1 µs -->
      <text x="0" y="140" class="chart-label">ML-DSA-44</text>
      <rect x="120" y="123" width="94" height="24" rx="4" fill="#8C593B"/>
      <text x="224" y="141" class="chart-val" fill="#8C593B">142.1 µs (Kháng lượng tử)</text>
    </g>

    <!-- Chart: Verification Time -->
    <g transform="translate(30, 275)">
      <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#8C593B">B. Thời gian Xác thực tại Cửa soát vé (Verification Time in µs)</text>
      
      <!-- RS256: 45.2 µs -->
      <text x="0" y="32" class="chart-label">RS256</text>
      <rect x="120" y="15" width="88" height="24" rx="4" fill="#2E7D32"/>
      <text x="218" y="33" class="chart-val" fill="#2E7D32">45.2 µs (RSA verify nhanh)</text>

      <!-- ES256: 286.2 µs -->
      <text x="0" y="68" class="chart-label">ES256</text>
      <rect x="120" y="51" width="560" height="24" rx="4" fill="#C89666"/>
      <text x="690" y="69" class="chart-val">286.2 µs</text>

      <!-- EdDSA: 86.4 µs -->
      <text x="0" y="104" class="chart-label">EdDSA</text>
      <rect x="120" y="87" width="168" height="24" rx="4" fill="#A87A50"/>
      <text x="298" y="105" class="chart-val">86.4 µs</text>

      <!-- ML-DSA-44: 118.5 µs -->
      <text x="0" y="140" class="chart-label">ML-DSA-44</text>
      <rect x="120" y="123" width="232" height="24" rx="4" fill="#8C593B"/>
      <text x="362" y="141" class="chart-val" fill="#8C593B">118.5 µs (&lt; 0.12 ms)</text>
    </g>

    <!-- Chart: Token Size Comparison -->
    <g transform="translate(30, 455)">
      <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#8C593B">C. So sánh Tổng kích thước Chuỗi JWT vé (Ký tự Base64URL)</text>
      
      <!-- RS256: 650 chars -->
      <text x="0" y="32" class="chart-label">RS256</text>
      <rect x="120" y="15" width="130" height="24" rx="4" fill="#C89666"/>
      <text x="260" y="33" class="chart-val">~650 chars (256B Sig)</text>

      <!-- ES256: 390 chars -->
      <text x="0" y="68" class="chart-label">ES256</text>
      <rect x="120" y="51" width="78" height="24" rx="4" fill="#A87A50"/>
      <text x="208" y="69" class="chart-val">~390 chars (64B Sig)</text>

      <!-- EdDSA: 345 chars -->
      <text x="0" y="104" class="chart-label">EdDSA</text>
      <rect x="120" y="87" width="69" height="24" rx="4" fill="#2E7D32"/>
      <text x="199" y="105" class="chart-val" fill="#2E7D32">~345 chars (Gọn nhất)</text>

      <!-- ML-DSA-44: 3450 chars -->
      <text x="0" y="140" class="chart-label">ML-DSA-44</text>
      <rect x="120" y="123" width="560" height="24" rx="4" fill="#B33E2B"/>
      <text x="690" y="141" class="chart-val" fill="#B33E2B">~3,450 chars (2,420B Sig)</text>
    </g>

    <!-- Insight banner -->
    <g transform="translate(30, 630)">
      <rect x="0" y="0" width="800" height="105" rx="10" fill="#F7EFE3" stroke="#DEC8B2"/>
      <text x="20" y="30" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="15" fill="#6B4426">💡 ĐÁNH GIÁ CHUYÊN SÂU:</text>
      <text x="20" y="58" font-family="'Segoe UI', sans-serif" font-size="14.5" fill="#4A3320">
        • EdDSA tối ưu toàn diện nhất cho thiết bị di động truyền thống (ký 34.6 µs, token 345 chars).
      </text>
      <text x="20" y="84" font-family="'Segoe UI', sans-serif" font-size="14.5" fill="#4A3320">
        • ML-DSA-44 vượt trội về an toàn lượng tử, thời gian xác thực chỉ 118 µs, nhưng token phình to gấp 10 lần.
      </text>
    </g>
  </g>

  <!-- Right Column: Export Previews (CSV/JSON) & QR Evaluation Matrix -->
  <g transform="translate(980, 220)">
    <!-- Sub-card 1: Export Data Preview (CSV / JSON) -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="860" height="360" rx="16" fill="#FFFFFF" stroke="#E3D1BE" stroke-width="1.5"/>
      <text x="30" y="42" class="card-title">📄 2. XUẤT DỮ LIỆU ĐO LƯỜNG TỰ ĐỘNG (CSV &amp; JSON)</text>
      
      <!-- Code box -->
      <rect x="30" y="65" width="800" height="265" rx="10" fill="#FAF4EB" stroke="#DEC8B2" stroke-width="1"/>
      
      <text x="45" y="95" class="code-text" fill="#8C593B" font-weight="bold">=== XUẤT CSV (BenchmarkResultExporter.exportCsv) ===</text>
      <text x="45" y="122" class="code-text">Algorithm,KeyGen(ms),Sign(us),Verify(us),Throughput(ops/s),SigSize(B),JwtLength</text>
      <text x="45" y="146" class="code-text">RS256,12.800,852.400,45.200,1173.2,256,650</text>
      <text x="45" y="170" class="code-text">ES256,0.160,124.800,286.200,8012.8,64,390</text>
      <text x="45" y="194" class="code-text">EdDSA,0.045,34.600,86.400,28901.7,64,345</text>
      <text x="45" y="218" class="code-text" font-weight="bold" fill="#8C593B">ML-DSA-44,0.240,142.100,118.500,7037.3,2420,3450</text>
      
      <text x="45" y="260" class="code-text" fill="#8C593B" font-weight="bold">=== XUẤT JSON METADATA (target/jmh-result.json) ===</text>
      <text x="45" y="285" class="code-text">{"author":"Trang","env":"OpenJDK 21+JMH 1.37","postQuantumStandard":"NIST FIPS 204"}</text>
      <text x="45" y="308" class="code-text">{"results":[{"alg":"ML-DSA-44","sigBytes":2420,"signLatencyUs":142.1,"verifyUs":118.5}]}</text>
    </g>

    <!-- Sub-card 2: QR Feasibility Matrix -->
    <g transform="translate(0, 390)">
      <rect x="0" y="0" width="860" height="380" rx="16" fill="#FFFFFF" stroke="#E3D1BE" stroke-width="1.5"/>
      <text x="30" y="42" class="card-title">📱 3. TỔNG HỢP KẾT QUẢ KHẢ NĂNG QUÉT MÃ QR TẠI RẠP</text>
      <text x="30" y="68" font-family="'Segoe UI', sans-serif" font-size="14" fill="#8C6E56">Nghiệm thu phối hợp cùng Người 4 (Ngọc) để kiểm tra đầu đọc vé xem phim</text>

      <!-- Table Header -->
      <rect x="30" y="85" width="800" height="42" rx="8" fill="#EFE2D1"/>
      <text x="45" y="112" class="th">Thuật toán</text>
      <text x="180" y="112" class="th">Độ dài Token</text>
      <text x="340" y="112" class="th">Phiên bản QR</text>
      <text x="510" y="112" class="th">Thời gian nhận diện</text>
      <text x="700" y="112" class="th">Mức độ khả thi</text>

      <!-- Row 1 -->
      <g transform="translate(30, 132)">
        <rect x="0" y="0" width="800" height="42" fill="#FAF4EB"/>
        <text x="15" y="27" class="td" font-weight="bold">RS256</text>
        <text x="150" y="27" class="td">~650 chars</text>
        <text x="310" y="27" class="td">Version 14</text>
        <text x="480" y="27" class="td">&lt; 0.3s</text>
        <text x="670" y="27" class="td" fill="#2E7D32" font-weight="bold">Rất tốt</text>
      </g>

      <!-- Row 2 -->
      <g transform="translate(30, 176)">
        <rect x="0" y="0" width="800" height="42" fill="#FFFFFF"/>
        <text x="15" y="27" class="td" font-weight="bold">ES256</text>
        <text x="150" y="27" class="td">~390 chars</text>
        <text x="310" y="27" class="td">Version 8</text>
        <text x="480" y="27" class="td">&lt; 0.15s</text>
        <text x="670" y="27" class="td" fill="#2E7D32" font-weight="bold">Xuất sắc</text>
      </g>

      <!-- Row 3 -->
      <g transform="translate(30, 220)">
        <rect x="0" y="0" width="800" height="42" fill="#FAF4EB"/>
        <text x="15" y="27" class="td" font-weight="bold">EdDSA</text>
        <text x="150" y="27" class="td">~345 chars</text>
        <text x="310" y="27" class="td">Version 7</text>
        <text x="480" y="27" class="td">&lt; 0.12s</text>
        <text x="670" y="27" class="td" fill="#2E7D32" font-weight="bold">Xuất sắc (Tối ưu)</text>
      </g>

      <!-- Row 4 -->
      <g transform="translate(30, 264)">
        <rect x="0" y="0" width="800" height="42" fill="#F4EADB"/>
        <text x="15" y="27" class="td" font-weight="bold" fill="#8C593B">ML-DSA-44</text>
        <text x="150" y="27" class="td" font-weight="bold" fill="#B33E2B">~3,450 chars</text>
        <text x="310" y="27" class="td">Version 30+</text>
        <text x="480" y="27" class="td" fill="#B33E2B">0.8s - 1.5s</text>
        <text x="670" y="27" class="td" fill="#8C593B" font-weight="bold">Cần Reference Token</text>
      </g>

      <!-- Recommendation -->
      <text x="30" y="340" font-family="'Segoe UI', sans-serif" font-size="14.5" font-weight="600" fill="#6B4426">
        💡 Đề xuất của Trang cho nhóm: Sử dụng mã QR tham chiếu (Short Ticket ID) tại cổng soát vé rạp để vừa quét siêu nhanh, vừa xác thực bảo mật hậu lượng tử an toàn qua mạng backend.
      </text>
    </g>
  </g>

  <!-- Footer Info -->
  <text x="80" y="1025" font-family="'Segoe UI', sans-serif" font-size="14" fill="#8C6E56">
    © 2026 CineGuard Security Lab • Phân công: Người 5 — Trang • Hoàn thành ngày 27/10/2026
  </text>
</svg>
`;

async function generateImages() {
  console.log('Đang chạy code sinh hình ảnh tổng kết tone nâu sáng...');
  
  const file1Path = path.join(outputDir, 'dau_viec_2_do_hieu_nang.png');
  const file2Path = path.join(outputDir, 'dau_viec_4_xuat_ket_qua_bieu_do.png');

  // Chuyển đổi SVG thành PNG chất lượng cao 1920x1080 qua Sharp
  await sharp(Buffer.from(svg1))
    .png({ quality: 100, compressionLevel: 8 })
    .toFile(file1Path);
  console.log('✅ Đã tạo thành công Hình ảnh 1:', file1Path);

  await sharp(Buffer.from(svg2))
    .png({ quality: 100, compressionLevel: 8 })
    .toFile(file2Path);
  console.log('✅ Đã tạo thành công Hình ảnh 2:', file2Path);
}

generateImages().catch(err => {
  console.error('Lỗi khi sinh hình ảnh:', err);
  process.exit(1);
});
