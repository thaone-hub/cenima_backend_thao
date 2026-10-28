import { ChecklistItem } from '../types/crypto';

export const TASK_1_CHECKLIST: ChecklistItem[] = [
  {
    id: 'CHK-01',
    category: '1. Kiến trúc đo lường (Measurement Architecture)',
    title: 'Tách triệt để thời gian tạo khóa (KeyGen) khỏi thời gian ký (Sign)',
    requirement: 'Thời gian sinh cặp khóa (KeyPair generation) của RSA (2048-bit) rất lâu (~5ms-15ms), trong khi ML-DSA-44 hoặc EdDSA chỉ mất ~0.05ms-0.2ms. Nếu không tách, kết quả Signing Time sẽ bị sai lệch nghiêm trọng do cộng dồn thời gian tạo khóa.',
    jmhMechanism: 'Sử dụng @Setup(Level.Trial) bên trong class @State(Scope.Benchmark) để khởi tạo toàn bộ KeyPair và Signer trước khi benchmark bắt đầu. Phương thức @Benchmark CHỈ gọi signer.sign(payload).',
    verificationTip: 'Kiểm tra trong code: Phương thức có gắn @Benchmark không được chứa bất kỳ lệnh new KeyPairGenerator() hay keyGen.generateKeyPair() nào.',
    isCrucial: true,
    status: 'PASSED'
  },
  {
    id: 'CHK-02',
    category: '2. Tính đồng nhất Payload (Payload Consistency)',
    title: 'Chạy cùng một Payload E-Ticket duy nhất cho cả 4 thuật toán',
    requirement: 'Cả 4 thuật toán (RS256, ES256, EdDSA, ML-DSA-44) phải nhận cùng một JSON payload mẫu (ticketId, movieId, showtimeId, seatCode, email, iat, exp). Không được thay đổi kích thước payload giữa các lần chạy.',
    jmhMechanism: 'Khởi tạo đối tượng JwtPayload cố định trong @Setup(Level.Trial), sau đó truyền chung biến payload này vào phương thức sign() của từng thuật toán qua @Param({"RS256", "ES256", "EdDSA", "ML-DSA-44"}).',
    verificationTip: 'Xác thực kích thước chuỗi JSON payload là hằng số (khoảng 320 - 360 bytes) trước khi mã hóa Base64URL.',
    isCrucial: true,
    status: 'PASSED'
  },
  {
    id: 'CHK-03',
    category: '3. Cấu hình Warm-up khoa học (JIT Warm-up Discipline)',
    title: 'Thiết lập đủ số vòng Warm-up để C2 JIT Compiler tối ưu hóa',
    requirement: 'Thuật toán mật mã (đặc biệt là Bouncy Castle PQC với phép nhân đa thức phức tạp trong ML-DSA) cần thời gian để JVM tải class, nạp lookup tables và JIT Compiler dịch bytecode sang mã máy Native (C2 Tier 4).',
    jmhMechanism: 'Đặt cấu hình: @Warmup(iterations = 3, time = 1, timeUnit = TimeUnit.SECONDS) tối thiểu 3 vòng, mỗi vòng 1 giây trước khi ghi nhận dữ liệu đo.',
    verificationTip: 'Quan sát đồ thị chạy: Các vòng Warm-up đầu thường có latency cao gấp 2-4 lần, từ vòng đo chính thức (Measurement) chỉ số phải ổn định (độ biến thiên < 5%).',
    isCrucial: true,
    status: 'PASSED'
  },
  {
    id: 'CHK-04',
    category: '4. Số vòng đo lường & Phân tích thống kê (Measurement & Variance)',
    title: 'Đo nhiều vòng lặp (Iterations) để tính Mean & Standard Deviation',
    requirement: 'Không được đo một lần duy nhất. Phải chạy nhiều vòng đo độc lập để tính toán Trung bình (Mean), Độ lệch chuẩn (Std Dev) và Sai số (Error margin) nhằm phục vụ viết báo cáo khoa học.',
    jmhMechanism: 'Cấu hình @Measurement(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS) và @Fork(value = 1, jvmArgs = {"-Xms2G", "-Xmx2G"}).',
    verificationTip: 'Trong kết quả xuất JSON/CSV, kiểm tra cột Score và Error. Nếu Error > 10% của Score thì cần tăng thời gian hoặc dọn dẹp các tiến trình nền của máy.',
    isCrucial: true,
    status: 'PASSED'
  },
  {
    id: 'CHK-05',
    category: '5. Chống tối ưu hóa sai của JVM (Anti-Dead Code Elimination)',
    title: 'Sử dụng JMH Blackhole để ngăn JVM loại bỏ code thừa',
    requirement: 'Nếu kết quả trả về của hàm sign() không được sử dụng ở bất kỳ đâu, JIT Compiler thông minh của JVM có thể tự động bỏ qua toàn bộ hàm tính toán mã hóa, dẫn đến kết quả 0.001 µs (kết quả ảo).',
    jmhMechanism: 'Khai báo tham số Blackhole blackhole trong hàm @Benchmark và gọi blackhole.consume(jwtToken). Hoặc return String trực tiếp từ hàm @Benchmark.',
    verificationTip: 'Kiểm tra chữ ký hàm benchmark: public void measureSigning(Blackhole bh) { bh.consume(signer.sign(payload)); }',
    isCrucial: true,
    status: 'PASSED'
  },
  {
    id: 'CHK-06',
    category: '6. Tích hợp thư viện Bouncy Castle PQC cho ML-DSA-44',
    title: 'Đăng ký Security Provider BouncyCastlePQCProvider hợp lệ',
    requirement: 'ML-DSA-44 (FIPS 204) là chuẩn chữ ký mới của NIST được Bouncy Castle hỗ trợ từ phiên bản 1.78+. JVM mặc định của Oracle/OpenJDK chưa tích hợp thuật toán này sẵn trong java.security.',
    jmhMechanism: 'Đăng ký Security.addProvider(new BouncyCastlePQCProvider()) và BouncyCastleProvider() trong khối static hoặc trong @Setup(Level.Trial).',
    verificationTip: 'Kiểm tra pom.xml có khai báo bcprov-jdk18on và bcpkix-jdk18on phiên bản >= 1.78.1. Chạy thử unit test xem có ném NoSuchAlgorithmException hay không.',
    isCrucial: true,
    status: 'PASSED'
  },
  {
    id: 'CHK-07',
    category: '7. Khả năng chạy độc lập & Xuất dữ liệu (Standalone Execution & Export)',
    title: 'Tạo BenchmarkRunner với Main method và tự động xuất JSON/CSV',
    requirement: 'Giáo viên hướng dẫn hoặc người chấm bài cần chạy được bộ benchmark chỉ bằng một dòng lệnh trên Terminal máy chủ mà không cần cài đặt thêm IDE phức tạp.',
    jmhMechanism: 'Cung cấp class BenchmarkRunner.java với main() dùng OptionsBuilder, kết hợp cấu hình maven-shade-plugin đóng gói thành runnable benchmarks.jar.',
    verificationTip: 'Chạy thử lệnh: java -jar target/benchmarks.jar BenchmarkRunner. Kết quả phải tự động ghi vào target/jmh-result.json.',
    isCrucial: false,
    status: 'RECOMMENDED'
  }
];

export const ALGORITHM_DEFINITIONS = [
  {
    id: 'RS256' as const,
    name: 'RS256 (RSA 2048-bit)',
    category: 'Traditional' as const,
    standard: 'RFC 7518 / PKCS#1 v1.5',
    securityLevel: '112-bit Security (Truyền thống)',
    keySize: 'Public Key: 294 bytes (2048-bit)',
    signatureSizeBytes: 256,
    estimatedJwtSizeBytes: 650,
    qrDensityLevel: 'Thoáng' as const,
    color: '#3B82F6',
    description: 'Chữ ký phổ biến nhất trên Internet hiện nay. Thời gian sinh khóa chậm, kích thước khóa lớn nhưng thời gian xác minh (Verification) rất nhanh.'
  },
  {
    id: 'ES256' as const,
    name: 'ES256 (ECDSA P-256)',
    category: 'Traditional' as const,
    standard: 'RFC 7518 / NIST P-256',
    securityLevel: '128-bit Security (Truyền thống)',
    keySize: 'Public Key: 91 bytes',
    signatureSizeBytes: 64,
    estimatedJwtSizeBytes: 390,
    qrDensityLevel: 'Cực thoáng' as const,
    color: '#10B981',
    description: 'Đường cong Elliptic P-256. Kích thước chữ ký chỉ 64 bytes, tạo token gọn nhẹ, quét mã QR cực nhanh trên camera điện thoại.'
  },
  {
    id: 'EdDSA' as const,
    name: 'EdDSA (Ed25519)',
    category: 'Traditional' as const,
    standard: 'RFC 8037 / Edwards-curve Ed25519',
    securityLevel: '128-bit Security (Truyền thống)',
    keySize: 'Public Key: 32 bytes',
    signatureSizeBytes: 64,
    estimatedJwtSizeBytes: 345,
    qrDensityLevel: 'Rất thoáng' as const,
    color: '#8B5CF6',
    description: 'Chữ ký đường cong Edwards hiện đại, hiệu năng ký cực nhanh, miễn nhiễm với tấn công Side-channel và timing attack.'
  },
  {
    id: 'ML-DSA-44' as const,
    name: 'ML-DSA-44 (Dilithium 2)',
    category: 'Post-Quantum (PQC)' as const,
    standard: 'NIST FIPS 204 / RFC 9964 draft',
    securityLevel: 'NIST Security Category 2 (Kháng Máy tính lượng tử)',
    keySize: 'Public Key: 1,312 bytes',
    signatureSizeBytes: 2420,
    estimatedJwtSizeBytes: 3450,
    qrDensityLevel: 'Rất dày (High Density)' as const,
    color: '#F59E0B',
    description: 'Chữ ký Hậu Lượng Tử chuẩn quốc gia NIST dựa trên mạng tinh thể (Module-Lattice). Chống lại máy tính lượng tử chạy thuật toán Shor, nhưng chữ ký dài 2,420 bytes.'
  }
];

export const SECURITY_TEST_CASES = [
  {
    id: 'SEC-01',
    name: 'Tampered Token (Payload Manipulation)',
    category: 'Integrity' as const,
    description: 'Kẻ gian bóc tách Payload, tráo đổi số ghế từ STANDARD-H10 (80,000 VND) thành VIP-H12 (250,000 VND) và giữ nguyên chữ ký ban đầu.',
    attackVector: 'Base64URL decode -> JSON field tampering -> re-encode without signature re-computation',
    expectedResult: 'REJECTED' as const,
    targetClass: 'TamperedTokenTest.java'
  },
  {
    id: 'SEC-02',
    name: 'Corrupted Signature (Cryptographic Bit Flip)',
    category: 'Integrity' as const,
    description: 'Tấn công làm biến dạng hoặc thay thế phần Signature bằng chữ ký giả hoặc chuỗi ngẫu nhiên.',
    attackVector: 'Bit flipping / Signature forgery injection',
    expectedResult: 'REJECTED' as const,
    targetClass: 'TamperedTokenTest.java'
  },
  {
    id: 'SEC-03',
    name: 'Expired Ticket (Past Showtime Expiry)',
    category: 'Freshness' as const,
    description: 'Khách hàng dùng lại mã QR vé của suất chiếu hôm qua (claim exp đã trôi qua 3600 giây). Dù chữ ký hợp lệ nhưng vé phải bị từ chối.',
    attackVector: 'Expired timestamp exploitation',
    expectedResult: 'REJECTED' as const,
    targetClass: 'ExpiredTokenTest.java'
  },
  {
    id: 'SEC-04',
    name: 'Wrong Key (Forged Public/Private Key)',
    category: 'Key Validation' as const,
    description: 'Kẻ tấn công tự sinh một cặp khóa hợp lệ của rạp chiếu khác hoặc của riêng họ để ký vé giả.',
    attackVector: 'Rogue keypair signing against trusted root public key',
    expectedResult: 'REJECTED' as const,
    targetClass: 'WrongKeyTest.java'
  },
  {
    id: 'SEC-05',
    name: 'Algorithm Confusion ("none" Algorithm Attack)',
    category: 'Algorithm Confusion' as const,
    description: 'Kẻ tấn công sửa Header JWT thành {"alg":"none"}, xóa bỏ toàn bộ Signature để đánh lừa thư viện xác minh.',
    attackVector: 'JWS Alg None bypass vulnerability',
    expectedResult: 'REJECTED' as const,
    targetClass: 'AlgorithmComparisonTest.java'
  },
  {
    id: 'SEC-06',
    name: 'Replay Ticket Attack (Double Gate Entry)',
    category: 'Replay & Concurrency' as const,
    description: 'Một vé đã vào rạp thành công (trạng thái USED), kẻ gian gửi ảnh chụp màn hình mã QR cho bạn bè quét lần thứ hai.',
    attackVector: 'QR Snapshot sharing / Token reuse',
    expectedResult: 'PREVENTED' as const,
    targetClass: 'ReplayTicketTest.java'
  },
  {
    id: 'SEC-07',
    name: 'Concurrent Check-in Race Condition (Two Gates at Same Millisecond)',
    category: 'Replay & Concurrency' as const,
    description: 'Hai cửa soát vé Cổng 1 và Cổng 2 cùng tiếp nhận yêu cầu check-in cùng 1 vé tại đúng 1 nano-giây. Hệ thống phải dùng Optimistic Locking (Atomic CAS) chỉ cho 1 lượt qua.',
    attackVector: 'Parallel HTTP requests / Race condition at Turnstiles',
    expectedResult: 'PREVENTED' as const,
    targetClass: 'ReplayTicketTest.java'
  }
];
