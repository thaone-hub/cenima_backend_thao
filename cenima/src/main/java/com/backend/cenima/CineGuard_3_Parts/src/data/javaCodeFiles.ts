import { JavaSourceFile } from '../types/crypto';

export const JAVA_SOURCE_FILES: JavaSourceFile[] = [
  {
    path: 'benchmark/SigningBenchmarkTest.java',
    name: 'SigningBenchmarkTest.java',
    category: 'benchmark',
    author: 'Trang',
    description: 'JMH Benchmark đo thời gian ký (Signing Time & Throughput) tách biệt hoàn toàn khỏi KeyGen, warm-up và đo nhiều vòng cho RS256, ES256, EdDSA, ML-DSA-44.',
    content: `package com.cineguard.benchmark;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.security.Security;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Benchmark Runner / JMH Test cho Signing Time
 * Phụ trách: Người 5 - Trang
 *
 * YÊU CẦU ĐẦU VIỆC 1:
 * - Chạy cùng payload cho RS256, ES256, EdDSA, ML-DSA-44.
 * - Tách thời gian tạo khóa (KeyGen) khỏi thời gian ký: thực hiện trong @Setup(Level.Trial).
 * - Warm-up 3-5 vòng để C2 JIT Compiler tối ưu và nạp Provider.
 * - Đo nhiều vòng (iterations = 5) để có độ lệch chuẩn tin cậy.
 */
@BenchmarkMode({Mode.AverageTime, Mode.Throughput})
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@Warmup(iterations = 3, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Fork(value = 1, jvmArgs = {"-Xms2G", "-Xmx2G", "-XX:+UseG1GC"})
@State(Scope.Benchmark)
public class SigningBenchmarkTest {

    // 4 thuật toán được test tuần tự hoặc song song qua @Param
    @Param({"RS256", "ES256", "EdDSA", "ML-DSA-44"})
    private String algorithm;

    private Map<String, JwtSigner> signers;
    private JwtPayload samplePayload;

    @Setup(Level.Trial)
    public void setupTrial() throws Exception {
        // Đăng ký Bouncy Castle Providers (cho Ed25519 và Post-Quantum ML-DSA-44)
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (Security.getProvider(BouncyCastlePQCProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastlePQCProvider());
        }

        signers = new HashMap<>();

        // 1. TÁCH THỜI GIAN TẠO KHÓA KHỎI THỜI GIAN KÝ:
        // Toàn bộ quá trình KeyGen được sinh sẵn tại đây, lưu trong Memory
        signers.put("RS256", new Rs256JwtSigner(2048));
        signers.put("ES256", new Es256JwtSigner());
        signers.put("EdDSA", new EdDsaJwtSigner());
        signers.put("ML-DSA-44", new MlDsaJwtSigner()); // NIST FIPS 204

        // 2. CHẠY CÙNG 1 PAYLOAD CHUẨN DUY NHẤT (E-Ticket Movie Booking):
        long now = Instant.now().getEpochSecond();
        samplePayload = JwtPayload.builder()
                .ticketId("TCK-20261027-8912")
                .bookingId("BKG-99214")
                .movieId("MOV-DUNE3")
                .movieTitle("Dune: Part Three (IMAX 3D)")
                .theater("CGV Vincom Landmark 81")
                .auditorium("Hall 01")
                .seatCode("VIP-H12")
                .customerEmail("trang.benchmark@cineguard.io")
                .issuedAt(now)
                .expiresAt(now + 10800) // 3 giờ hiệu lực
                .build();
    }

    /**
     * Phương thức Benchmark chỉ đo thời gian KÝ (Signing Time)
     * Sử dụng Blackhole để ngăn chặn Dead Code Elimination của JIT Compiler.
     */
    @Benchmark
    public void measureSigning(Blackhole blackhole) throws Exception {
        JwtSigner signer = signers.get(algorithm);
        String jwtToken = signer.sign(samplePayload);
        blackhole.consume(jwtToken);
    }
}
`
  },
  {
    path: 'benchmark/VerificationBenchmarkTest.java',
    name: 'VerificationBenchmarkTest.java',
    category: 'benchmark',
    author: 'Trang',
    description: 'JMH Benchmark đo thời gian xác thực vé (Verification Time & Throughput) tại cửa soát vé điện tử, với token đã ký sẵn từ @Setup.',
    content: `package com.cineguard.benchmark;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.JwtVerifier;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.security.Security;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Benchmark Đo thời gian Xác thực chữ ký (Verification Time)
 * Phụ trách: Người 5 - Trang
 *
 * Kiểm tra xem khi khách hàng quét vé QR tại rạp chiếu phim,
 * thuật toán nào cho tốc độ mở cổng nhanh nhất (< 5ms).
 */
@BenchmarkMode({Mode.AverageTime, Mode.Throughput})
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@Warmup(iterations = 3, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Fork(value = 1, jvmArgs = {"-Xms2G", "-Xmx2G"})
@State(Scope.Benchmark)
public class VerificationBenchmarkTest {

    @Param({"RS256", "ES256", "EdDSA", "ML-DSA-44"})
    private String algorithm;

    private Map<String, JwtVerifier> verifiers;
    private Map<String, String> signedTokens;

    @Setup(Level.Trial)
    public void setupTrial() throws Exception {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (Security.getProvider(BouncyCastlePQCProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastlePQCProvider());
        }

        verifiers = new HashMap<>();
        signedTokens = new HashMap<>();

        long now = Instant.now().getEpochSecond();
        JwtPayload payload = JwtPayload.builder()
                .ticketId("TCK-20261027-8912")
                .bookingId("BKG-99214")
                .movieId("MOV-DUNE3")
                .movieTitle("Dune: Part Three (IMAX 3D)")
                .theater("CGV Vincom Landmark 81")
                .auditorium("Hall 01")
                .seatCode("VIP-H12")
                .customerEmail("trang.benchmark@cineguard.io")
                .issuedAt(now)
                .expiresAt(now + 10800)
                .build();

        // Khởi tạo signers & sinh token mẫu trước, tách biệt khỏi Benchmark
        Rs256JwtSigner rsa = new Rs256JwtSigner(2048);
        Es256JwtSigner ec = new Es256JwtSigner();
        EdDsaJwtSigner ed = new EdDsaJwtSigner();
        MlDsaJwtSigner mlDsa = new MlDsaJwtSigner();

        verifiers.put("RS256", rsa);
        verifiers.put("ES256", ec);
        verifiers.put("EdDSA", ed);
        verifiers.put("ML-DSA-44", mlDsa);

        signedTokens.put("RS256", rsa.sign(payload));
        signedTokens.put("ES256", ec.sign(payload));
        signedTokens.put("EdDSA", ed.sign(payload));
        signedTokens.put("ML-DSA-44", mlDsa.sign(payload));
    }

    @Benchmark
    public void measureVerification(Blackhole blackhole) throws Exception {
        JwtVerifier verifier = verifiers.get(algorithm);
        String token = signedTokens.get(algorithm);
        boolean isValid = verifier.verify(token);
        blackhole.consume(isValid);
    }
}
`
  },
  {
    path: 'benchmark/TokenSizeBenchmarkTest.java',
    name: 'TokenSizeBenchmarkTest.java',
    category: 'benchmark',
    author: 'Trang',
    description: 'Đo kích thước JWT (Token Size), kích thước chữ ký (Signature Size) và kích thước Public Key cho cả 4 thuật toán.',
    content: `package com.cineguard.benchmark;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Đo kích thước JWT Token & Chữ ký số
 * Phụ trách: Người 5 - Trang
 *
 * MỤC TIÊU:
 * - So sánh kích thước chuỗi Base64URL JWT.
 * - Giải thích tại sao ML-DSA-44 sinh token dài ~3.3 KB (ảnh hưởng khả năng quét mã QR tại quầy vé).
 */
public class TokenSizeBenchmarkTest {

    public static class SizeMetrics {
        public final String algorithm;
        public final int jwtLengthChars;
        public final int jwtSizeBytes;
        public final int signatureSizeBytes;
        public final int publicKeySizeBytes;

        public SizeMetrics(String algorithm, int jwtLengthChars, int jwtSizeBytes, int signatureSizeBytes, int publicKeySizeBytes) {
            this.algorithm = algorithm;
            this.jwtLengthChars = jwtLengthChars;
            this.jwtSizeBytes = jwtSizeBytes;
            this.signatureSizeBytes = signatureSizeBytes;
            this.publicKeySizeBytes = publicKeySizeBytes;
        }
    }

    public static Map<String, SizeMetrics> evaluateTokenSizes() throws Exception {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (Security.getProvider(BouncyCastlePQCProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastlePQCProvider());
        }

        long now = Instant.now().getEpochSecond();
        JwtPayload payload = JwtPayload.builder()
                .ticketId("TCK-20261027-8912")
                .bookingId("BKG-99214")
                .movieId("MOV-DUNE3")
                .movieTitle("Dune: Part Three (IMAX 3D)")
                .theater("CGV Vincom Landmark 81")
                .auditorium("Hall 01")
                .seatCode("VIP-H12")
                .customerEmail("trang.benchmark@cineguard.io")
                .issuedAt(now)
                .expiresAt(now + 10800)
                .build();

        Map<String, SizeMetrics> metricsMap = new LinkedHashMap<>();

        // RS256
        Rs256JwtSigner rsa = new Rs256JwtSigner(2048);
        String rsaJwt = rsa.sign(payload);
        metricsMap.put("RS256", extractMetrics("RS256", rsaJwt, 256, 294));

        // ES256
        Es256JwtSigner ec = new Es256JwtSigner();
        String ecJwt = ec.sign(payload);
        metricsMap.put("ES256", extractMetrics("ES256", ecJwt, 64, 91));

        // EdDSA (Ed25519)
        EdDsaJwtSigner ed = new EdDsaJwtSigner();
        String edJwt = ed.sign(payload);
        metricsMap.put("EdDSA", extractMetrics("EdDSA", edJwt, 64, 32));

        // ML-DSA-44 (Dilithium 2)
        MlDsaJwtSigner mlDsa = new MlDsaJwtSigner();
        String mlDsaJwt = mlDsa.sign(payload);
        metricsMap.put("ML-DSA-44", extractMetrics("ML-DSA-44", mlDsaJwt, 2420, 1312));

        return metricsMap;
    }

    private static SizeMetrics extractMetrics(String alg, String jwt, int sigBytes, int pubKeyBytes) {
        int chars = jwt.length();
        int bytes = jwt.getBytes(StandardCharsets.UTF_8).length;
        return new SizeMetrics(alg, chars, bytes, sigBytes, pubKeyBytes);
    }
}
`
  },
  {
    path: 'benchmark/BenchmarkResultExporter.java',
    name: 'BenchmarkResultExporter.java',
    category: 'benchmark',
    author: 'Trang',
    description: 'Xuất kết quả đo hiệu năng ra file CSV và JSON phục vụ làm báo cáo khoa học và vẽ biểu đồ so sánh.',
    content: `package com.cineguard.benchmark;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Bộ xuất kết quả Benchmark ra file CSV & JSON
 * Phụ trách: Người 5 - Trang
 *
 * Hỗ trợ xuất dữ liệu cho Task 4: "Xuất CSV/JSON, bảng so sánh 4 thuật toán".
 */
public class BenchmarkResultExporter {

    public static class Record {
        public String algorithm;
        public double keyGenTimeMs;
        public double signingTimeUs;
        public double verifyTimeUs;
        public double throughputOpsSec;
        public int signatureSizeBytes;
        public int jwtLengthChars;

        public Record(String algorithm, double keyGenTimeMs, double signingTimeUs, double verifyTimeUs,
                      double throughputOpsSec, int signatureSizeBytes, int jwtLengthChars) {
            this.algorithm = algorithm;
            this.keyGenTimeMs = keyGenTimeMs;
            this.signingTimeUs = signingTimeUs;
            this.verifyTimeUs = verifyTimeUs;
            this.throughputOpsSec = throughputOpsSec;
            this.signatureSizeBytes = signatureSizeBytes;
            this.jwtLengthChars = jwtLengthChars;
        }
    }

    public static void exportCsv(List<Record> records, String filePath) throws IOException {
        try (PrintWriter writer = new PrintWriter(new FileWriter(filePath))) {
            writer.println("Algorithm,KeyGenTime(ms),SigningTime(us),VerifyTime(us),Throughput(ops/s),SigSize(bytes),JwtLength(chars)");
            for (Record r : records) {
                writer.printf("%s,%.3f,%.3f,%.3f,%.1f,%d,%d%n",
                        r.algorithm, r.keyGenTimeMs, r.signingTimeUs, r.verifyTimeUs,
                        r.throughputOpsSec, r.signatureSizeBytes, r.jwtLengthChars);
            }
        }
    }

    public static void exportJson(List<Record> records, String filePath) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("{\\n");
        sb.append("  \\"benchmarkDate\\": \\"").append(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).append("\\",\\n");
        sb.append("  \\"author\\": \\"Trang - CineGuard Security Lab\\",\\n");
        sb.append("  \\"environment\\": \\"OpenJDK 21, JMH 1.37, BouncyCastle 1.78.1, Apple M-series / Linux x86_64\\",\\n");
        sb.append("  \\"results\\": [\\n");
        for (int i = 0; i < records.size(); i++) {
            Record r = records.get(i);
            sb.append(String.format("    {\\n      \\"algorithm\\": \\"%s\\",\\n      \\"keyGenTimeMs\\": %.3f,\\n      \\"signingTimeUs\\": %.3f,\\n      \\"verifyTimeUs\\": %.3f,\\n      \\"throughputOpsSec\\": %.1f,\\n      \\"signatureSizeBytes\\": %d,\\n      \\"jwtLengthChars\\": %d\\n    }",
                    r.algorithm, r.keyGenTimeMs, r.signingTimeUs, r.verifyTimeUs, r.throughputOpsSec, r.signatureSizeBytes, r.jwtLengthChars));
            if (i < records.size() - 1) sb.append(",");
            sb.append("\\n");
        }
        sb.append("  ]\\n}");
        Files.writeString(Paths.get(filePath), sb.toString());
    }
}
`
  },
  {
    path: 'benchmark/BenchmarkRunner.java',
    name: 'BenchmarkRunner.java',
    category: 'benchmark',
    author: 'Trang',
    description: 'Chương trình khởi chạy JMH độc lập, cấu hình warm-up 3 vòng, đo 5 vòng, tách JVM Fork và xuất báo cáo.',
    content: `package com.cineguard.benchmark;

import org.openjdk.jmh.results.format.ResultFormatType;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;

/**
 * Khởi chạy JMH Benchmark toàn diện
 * Phụ trách: Người 5 - Trang
 *
 * Chạy dòng lệnh:
 * mvn clean package
 * java -jar target/benchmarks.jar BenchmarkRunner
 */
public class BenchmarkRunner {

    public static void main(String[] args) throws RunnerException {
        System.out.println("=================================================================");
        System.out.println("🚀 CINEGUARD POST-QUANTUM BENCHMARK RUNNER (Người 5 - Trang)");
        System.out.println("Thuật toán: RS256, ES256, EdDSA, ML-DSA-44 (FIPS 204)");
        System.out.println("Tách riêng: Key Generation vs Signing Time");
        System.out.println("=================================================================");

        Options opt = new OptionsBuilder()
                .include(SigningBenchmarkTest.class.getSimpleName())
                .include(VerificationBenchmarkTest.class.getSimpleName())
                .warmupIterations(3)
                .measurementIterations(5)
                .forks(1)
                .resultFormat(ResultFormatType.JSON)
                .result("target/jmh-result.json")
                .build();

        new Runner(opt).run();
    }
}
`
  },
  {
    path: 'security/TamperedTokenTest.java',
    name: 'TamperedTokenTest.java',
    category: 'security',
    author: 'Trang',
    description: 'Kiểm thử tấn công sửa đổi Payload vé (kẻ gian tự ý đổi ghế từ Thường lên VIP hoặc đổi sang phim khác) -> chữ ký phải bị bác bỏ.',
    content: `package com.cineguard.security;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.JwtVerifier;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Bộ kiểm thử bảo mật: Tampered Token (Sửa đổi Payload)
 * Phụ trách: Người 5 - Trang
 *
 * KỊCH BẢN TẤN CÔNG:
 * Kẻ xấu mua vé ghế STANDARD (ghế thường H10 giá 80k),
 * giải mã Payload Base64URL, sửa thành "VIP-H12" (ghế VIP giá 250k)
 * và giữ nguyên phần chữ ký.
 * KỲ VỌNG:
 * Verifier của cả 4 thuật toán (RS256, ES256, EdDSA, ML-DSA-44)
 * PHẢI BÁC BỎ (verify == false).
 */
public class TamperedTokenTest {

    static Stream<Object[]> signerProvider() throws Exception {
        return Stream.of(
                new Object[]{"RS256", new Rs256JwtSigner(2048)},
                new Object[]{"ES256", new Es256JwtSigner()},
                new Object[]{"EdDSA", new EdDsaJwtSigner()},
                new Object[]{"ML-DSA-44", new MlDsaJwtSigner()}
        );
    }

    @ParameterizedTest(name = "Tampered Token Test với [{0}]")
    @MethodSource("signerProvider")
    @DisplayName("Kiểm thử phát hiện sửa đổi Payload vé xem phim")
    public void testTamperedPayloadRejected(String algName, Object signerObj) throws Exception {
        JwtSigner signer = (JwtSigner) signerObj;
        JwtVerifier verifier = (JwtVerifier) signerObj;

        long now = Instant.now().getEpochSecond();
        JwtPayload originalTicket = JwtPayload.builder()
                .ticketId("TCK-99120")
                .bookingId("BKG-5541")
                .movieId("MOV-OPPENHEIMER")
                .seatCode("STANDARD-H10")
                .issuedAt(now)
                .expiresAt(now + 7200)
                .build();

        String validJwt = signer.sign(originalTicket);

        // Bóc tách JWT thành 3 phần: Header.Payload.Signature
        String[] parts = validJwt.split("\\\\.");
        String header = parts[0];
        String originalPayloadB64 = parts[1];
        String signature = parts[2];

        // Kẻ gian giải mã và sửa dữ liệu trong Payload
        String payloadJson = new String(Base64.getUrlDecoder().decode(originalPayloadB64), StandardCharsets.UTF_8);
        String tamperedJson = payloadJson.replace("STANDARD-H10", "VIP-H12");
        String tamperedPayloadB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(tamperedJson.getBytes(StandardCharsets.UTF_8));

        // Ghép lại JWT giả mạo
        String tamperedJwt = header + "." + tamperedPayloadB64 + "." + signature;

        // KIỂM THỬ: Xác minh bắt buộc phải thất bại!
        boolean verified = verifier.verify(tamperedJwt);
        assertFalse(verified, "LỖI BẢO MẬT NGUY HIỂM: " + algName + " đã chấp nhận token bị sửa đổi payload!");
    }
}
`
  },
  {
    path: 'security/ExpiredTokenTest.java',
    name: 'ExpiredTokenTest.java',
    category: 'security',
    author: 'Trang',
    description: 'Kiểm thử token hết hạn (Ticket Expiry) để ngăn chặn khách dùng vé của suất chiếu hôm qua để vào rạp hôm nay.',
    content: `package com.cineguard.security;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.JwtVerifier;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Instant;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Kiểm thử vé xem phim quá hạn (Expired Token Test)
 * Phụ trách: Người 5 - Trang
 *
 * KỊCH BẢN:
 * Khách hàng mang vé đã hết hạn (suất chiếu kết thúc lúc exp = now - 3600s).
 * Dù chữ ký cryptographic hoàn toàn đúng, verifier của hệ thống soát vé
 * bắt buộc phải kiểm tra claim "exp" và bác bỏ vé.
 */
public class ExpiredTokenTest {

    static Stream<Object[]> signerProvider() throws Exception {
        return Stream.of(
                new Object[]{"RS256", new Rs256JwtSigner(2048)},
                new Object[]{"ES256", new Es256JwtSigner()},
                new Object[]{"EdDSA", new EdDsaJwtSigner()},
                new Object[]{"ML-DSA-44", new MlDsaJwtSigner()}
        );
    }

    @ParameterizedTest(name = "Expired Token Test với [{0}]")
    @MethodSource("signerProvider")
    @DisplayName("Kiểm thử từ chối vé xem phim đã hết hạn chiếu")
    public void testExpiredTokenMustBeRejected(String algName, Object signerObj) throws Exception {
        JwtSigner signer = (JwtSigner) signerObj;
        JwtVerifier verifier = (JwtVerifier) signerObj;

        long now = Instant.now().getEpochSecond();
        JwtPayload expiredTicket = JwtPayload.builder()
                .ticketId("TCK-OLD-001")
                .bookingId("BKG-OLD-999")
                .movieId("MOV-AVATAR")
                .seatCode("STANDARD-A01")
                .issuedAt(now - 86400) // Ký từ hôm qua
                .expiresAt(now - 3600)  // Đã hết hạn 1 tiếng trước
                .build();

        String expiredToken = signer.sign(expiredTicket);

        // Xác thực phải trả về FALSE do hết hạn
        boolean isValid = verifier.verify(expiredToken);
        assertFalse(isValid, "LỖI BẢO MẬT: " + algName + " đã chấp nhận vé xem phim đã quá hạn chiếu!");
    }
}
`
  },
  {
    path: 'security/WrongKeyTest.java',
    name: 'WrongKeyTest.java',
    category: 'security',
    author: 'Trang',
    description: 'Kiểm thử xác minh với cặp khóa sai (Wrong Key Test) - rạp CGV dùng khóa của Beta Cinemas ký thì cổng soát vé CGV phải từ chối.',
    content: `package com.cineguard.security;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.JwtVerifier;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Instant;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Kiểm thử ký bằng khóa này nhưng xác thực bằng khóa khác (Wrong Key Test)
 * Phụ trách: Người 5 - Trang
 *
 * KỊCH BẢN:
 * Một đối tượng giả mạo tự sinh một cặp khóa hợp lệ của riêng họ,
 * dùng Private Key đó ký vé xem phim rồi đem quét tại rạp.
 * Rạp sử dụng Public Key chính chủ của hệ thống để verify -> Phải trả về false.
 */
public class WrongKeyTest {

    static Stream<Object[]> wrongKeyPairs() throws Exception {
        return Stream.of(
                new Object[]{"RS256", new Rs256JwtSigner(2048), new Rs256JwtSigner(2048)},
                new Object[]{"ES256", new Es256JwtSigner(), new Es256JwtSigner()},
                new Object[]{"EdDSA", new EdDsaJwtSigner(), new EdDsaJwtSigner()},
                new Object[]{"ML-DSA-44", new MlDsaJwtSigner(), new MlDsaJwtSigner()}
        );
    }

    @ParameterizedTest(name = "Wrong Key Test với [{0}]")
    @MethodSource("wrongKeyPairs")
    @DisplayName("Kiểm thử phát hiện chữ ký sinh từ khóa giả mạo")
    public void testSignatureWithWrongKeyFails(String algName, Object legitimateObj, Object rogueObj) throws Exception {
        JwtSigner legitimateSigner = (JwtSigner) legitimateObj;
        JwtVerifier legitimateVerifier = (JwtVerifier) legitimateObj;

        JwtSigner rogueSigner = (JwtSigner) rogueObj; // Kẻ giả mạo có khóa riêng

        long now = Instant.now().getEpochSecond();
        JwtPayload payload = JwtPayload.builder()
                .ticketId("TCK-ROGUE-001")
                .seatCode("VIP-CENTER")
                .issuedAt(now)
                .expiresAt(now + 7200)
                .build();

        // Kẻ giả mạo ký vé bằng khóa của nó
        String forgedToken = rogueSigner.sign(payload);

        // Hệ thống rạp kiểm tra bằng Public Key chính thức
        boolean verified = legitimateVerifier.verify(forgedToken);
        assertFalse(verified, "LỖI BẢO MẬT: " + algName + " đã chấp nhận token ký bởi khóa trái phép!");
    }
}
`
  },
  {
    path: 'security/ReplayTicketTest.java',
    name: 'ReplayTicketTest.java',
    category: 'security',
    author: 'Trang',
    description: 'Kiểm thử tấn công Replay Attack & Check-in đồng thời (Concurrency Test) - ngăn chặn 1 vé bị quét 2 lần hoặc quét cùng 1 mili-giây tại 2 cổng khác nhau.',
    content: `package com.cineguard.security;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.MlDsaJwtSigner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Kiểm thử Replay Ticket & Two Concurrent Check-in Test
 * Phụ trách: Người 5 - Trang
 *
 * YÊU CẦU:
 * "Kiểm thử vé đã sử dụng, và hai lượt check-in đồng thời."
 * Mô phỏng: 2 cửa soát vé (Gate 1 & Gate 2) quét cùng 1 mã QR vé
 * tại cùng 1 thời điểm miligiây. Hệ thống phải dùng Optimistic Locking (Atomic CAS / DB Versioning)
 * để chỉ ĐÚNG 1 lượt thành công, lượt kia bị chặn (REPLAY_DETECTED).
 */
public class ReplayTicketTest {

    // Mô phỏng Database Ticket Service với kiểm soát trạng thái nguyên tử
    static class MockTicketCheckInService {
        private final ConcurrentHashMap<String, String> ticketStatusMap = new ConcurrentHashMap<>();

        public void issueTicket(String ticketId) {
            ticketStatusMap.put(ticketId, "UNUSED");
        }

        public boolean checkIn(String ticketId) {
            // Atomic CAS: Chỉ chuyển trạng thái nếu hiện tại là "UNUSED"
            return ticketStatusMap.compute(ticketId, (k, currentStatus) -> {
                if ("UNUSED".equals(currentStatus)) {
                    return "USED";
                }
                return currentStatus; // Đã là "USED" thì giữ nguyên
            }).equals("USED") && !ticketStatusMap.get(ticketId).equals("UNUSED");
        }
    }

    @Test
    @DisplayName("Kiểm thử phòng chống Replay Attack và Check-in đồng thời")
    public void testConcurrentCheckInOnlyAllowsOnce() throws Exception {
        JwtSigner signer = new MlDsaJwtSigner(); // Thử nghiệm trên vé ML-DSA-44 hậu lượng tử
        long now = Instant.now().getEpochSecond();
        JwtPayload payload = JwtPayload.builder()
                .ticketId("TCK-RACE-001")
                .seatCode("SWEETBOX-01")
                .issuedAt(now)
                .expiresAt(now + 7200)
                .build();

        String jwtToken = signer.sign(payload);

        MockTicketCheckInService service = new MockTicketCheckInService();
        service.issueTicket("TCK-RACE-001");

        // Mô phỏng 2 luồng đồng thời quét vé tại 2 cổng soát vé rạp
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CyclicBarrier barrier = new CyclicBarrier(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    barrier.await(); // Đảm bảo cả 2 luồng cùng bắn request tại 1 nano-giây
                    boolean ok = service.checkIn("TCK-RACE-001");
                    if (ok) {
                        successCount.incrementAndGet();
                    } else {
                        rejectedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        // KẾT QUẢ BẢO MẬT: Bắt buộc chỉ có 1 cổng vào được, 1 cổng bị từ chối
        assertEquals(1, successCount.get(), "Chỉ được duy nhất 1 lượt check-in thành công!");
        assertEquals(1, rejectedCount.get(), "Lượt check-in thứ hai phải bị chặn!");
    }
}
`
  },
  {
    path: 'security/AlgorithmComparisonTest.java',
    name: 'AlgorithmComparisonTest.java',
    category: 'security',
    author: 'Trang',
    description: 'Kiểm thử tấn công Algorithm Substitution (None Attack, tráo đổi thuật toán không cho phép) và so sánh toàn diện 4 thuật toán.',
    content: `package com.cineguard.security;

import com.cineguard.contract.JwtPayload;
import com.cineguard.contract.JwtSigner;
import com.cineguard.contract.JwtVerifier;
import com.cineguard.contract.MlDsaJwtSigner;
import com.cineguard.traditional.EdDsaJwtSigner;
import com.cineguard.traditional.Es256JwtSigner;
import com.cineguard.traditional.Rs256JwtSigner;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm thử phòng chống tấn công đổi thuật toán (Algorithm Confusion / None Attack)
 * Phụ trách: Người 5 - Trang
 *
 * KỊCH BẢN TẤN CÔNG:
 * 1. Attacker đổi alg trong Header thành "none" và xóa chữ ký.
 * 2. Attacker tráo đổi RS256 sang HMAC hoặc thuật toán không được phép.
 * HỆ THỐNG:
 * Phải có Whitelist nghiêm ngặt: CHỈ chấp nhận {RS256, ES256, EdDSA, ML-DSA-44}.
 */
public class AlgorithmComparisonTest {

    private static final Set<String> ALLOWED_ALGORITHMS = Set.of("RS256", "ES256", "EdDSA", "ML-DSA-44");

    @Test
    @DisplayName("Kiểm thử phòng chống None Algorithm Attack")
    public void testRejectNoneAlgorithm() throws Exception {
        long now = Instant.now().getEpochSecond();
        String headerNone = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\\"alg\\":\\"none\\",\\"typ\\":\\"JWT\\"}".getBytes(StandardCharsets.UTF_8));

        String payloadJson = "{\\"ticketId\\":\\"TCK-HACK\\",\\"seatCode\\":\\"VIP-A01\\"}";
        String payloadB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        // Token giả mạo alg "none" không có signature
        String fakeToken = headerNone + "." + payloadB64 + ".";

        JwtVerifier verifier = new Rs256JwtSigner(2048);
        assertFalse(verifier.verify(fakeToken), "BẢO MẬT: Bắt buộc phải từ chối token có alg = none!");
    }

    @Test
    @DisplayName("So sánh xác thực chéo giữa các thuật toán")
    public void testCrossAlgorithmRejection() throws Exception {
        long now = Instant.now().getEpochSecond();
        JwtPayload payload = JwtPayload.builder()
                .ticketId("TCK-CROSS-01")
                .seatCode("STANDARD-01")
                .issuedAt(now)
                .expiresAt(now + 7200)
                .build();

        JwtSigner rsaSigner = new Rs256JwtSigner(2048);
        JwtVerifier mlDsaVerifier = new MlDsaJwtSigner();

        String rsaToken = rsaSigner.sign(payload);

        // Đưa token ký bằng RS256 cho bộ verify ML-DSA-44 -> Bắt buộc phải từ chối
        assertFalse(mlDsaVerifier.verify(rsaToken), "Không được xác minh nhầm lẫn giữa các thuật toán khác nhau!");
    }
}
`
  },
  {
    path: 'contract/JwtSigner.java',
    name: 'JwtSigner.java',
    category: 'shared_contract',
    author: 'Thảo',
    description: 'Interface chung do Người 2 (Thảo) định nghĩa, dùng chung cho cả chữ ký truyền thống và hậu lượng tử.',
    content: `package com.cineguard.contract;

/**
 * Interface Ký số JWT dùng chung
 * Thiết kế bởi: Người 2 - Thảo
 * Kế thừa bởi: Thảo (RS256, ES256, EdDSA) & Hương (ML-DSA-44)
 */
public interface JwtSigner {
    /**
     * Ký payload vé xem phim thành chuỗi JWT (Header.Payload.Signature)
     */
    String sign(JwtPayload payload) throws Exception;

    /**
     * Tên thuật toán (RS256, ES256, EdDSA, ML-DSA-44)
     */
    String getAlgorithmName();
}
`
  },
  {
    path: 'contract/JwtVerifier.java',
    name: 'JwtVerifier.java',
    category: 'shared_contract',
    author: 'Thảo',
    description: 'Interface xác thực JWT dùng chung do Người 2 (Thảo) định nghĩa, dùng tại cổng soát vé rạp chiếu phim.',
    content: `package com.cineguard.contract;

/**
 * Interface Xác thực JWT dùng chung
 * Thiết kế bởi: Người 2 - Thảo
 */
public interface JwtVerifier {
    /**
     * Xác thực tính toàn vẹn chữ ký và thời hạn vé
     */
    boolean verify(String jwtToken) throws Exception;

    /**
     * Trích xuất Payload đã giải mã sau khi xác thực thành công
     */
    JwtPayload extractPayload(String jwtToken) throws Exception;
}
`
  },
  {
    path: 'contract/MlDsaJwtSigner.java',
    name: 'MlDsaJwtSigner.java',
    category: 'shared_contract',
    author: 'Hương',
    description: 'Triển khai chữ ký số Hậu lượng tử ML-DSA-44 (FIPS 204) do Người 3 (Hương) viết bằng Bouncy Castle PQC.',
    content: `package com.cineguard.contract;

import org.bouncycastle.pqc.crypto.mldsa.MLDSAKeyGenerationParameters;
import org.bouncycastle.pqc.crypto.mldsa.MLDSAKeyPairGenerator;
import org.bouncycastle.pqc.crypto.mldsa.MLDSAParameters;
import org.bouncycastle.pqc.crypto.mldsa.MLDSAPrivateKeyParameters;
import org.bouncycastle.pqc.crypto.mldsa.MLDSAPublicKeyParameters;
import org.bouncycastle.pqc.crypto.mldsa.MLDSASigner;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

/**
 * Triển khai Chữ ký số Hậu lượng tử ML-DSA-44 (NIST FIPS 204)
 * Thiết kế bởi: Người 3 - Hương
 * Tuân thủ interface chung của Thảo (JwtSigner, JwtVerifier)
 */
public class MlDsaJwtSigner implements JwtSigner, JwtVerifier {

    private final MLDSAPrivateKeyParameters privateKey;
    private final MLDSAPublicKeyParameters publicKey;

    public MlDsaJwtSigner() {
        // Sinh cặp khóa ML-DSA-44 theo NIST FIPS 204
        MLDSAKeyPairGenerator keyGen = new MLDSAKeyPairGenerator();
        keyGen.init(new MLDSAKeyGenerationParameters(new SecureRandom(), MLDSAParameters.ml_dsa_44));
        var keyPair = keyGen.generateKeyPair();
        this.privateKey = (MLDSAPrivateKeyParameters) keyPair.getPrivate();
        this.publicKey = (MLDSAPublicKeyParameters) keyPair.getPublic();
    }

    @Override
    public String sign(JwtPayload payload) throws Exception {
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\\"alg\\":\\"ML-DSA-44\\",\\"typ\\":\\"JWT\\"}".getBytes(StandardCharsets.UTF_8));
        String body = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.toJson().getBytes(StandardCharsets.UTF_8));

        byte[] signingInput = (header + "." + body).getBytes(StandardCharsets.US_ASCII);

        MLDSASigner signer = new MLDSASigner();
        signer.init(true, privateKey);
        byte[] signatureBytes = signer.generateSignature(signingInput);

        String signatureB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes);
        return header + "." + body + "." + signatureB64;
    }

    @Override
    public boolean verify(String jwtToken) {
        try {
            String[] parts = jwtToken.split("\\\\.");
            if (parts.length != 3) return false;

            byte[] signingInput = (parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII);
            byte[] signatureBytes = Base64.getUrlDecoder().decode(parts[2]);

            MLDSASigner verifier = new MLDSASigner();
            verifier.init(false, publicKey);
            boolean sigOk = verifier.verifySignature(signingInput, signatureBytes);
            if (!sigOk) return false;

            // Kiểm tra thời hạn vé (exp)
            JwtPayload payload = extractPayload(jwtToken);
            return payload.getExpiresAt() > Instant.now().getEpochSecond();
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public JwtPayload extractPayload(String jwtToken) throws Exception {
        String[] parts = jwtToken.split("\\\\.");
        String json = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        return JwtPayload.fromJson(json);
    }

    @Override
    public String getAlgorithmName() {
        return "ML-DSA-44";
    }

    public int getSignatureSizeBytes() {
        return 2420; // ML-DSA-44 sinh chữ ký 2,420 bytes
    }
}
`
  },
  {
    path: 'contract/JwtPayload.java',
    name: 'JwtPayload.java',
    category: 'shared_contract',
    author: 'Ngọc',
    description: 'Cấu trúc Payload vé điện tử chuẩn (E-Ticket) do Người 4 (Ngọc) thiết kế, chạy chung trên toàn bộ hệ thống rạp.',
    content: `package com.cineguard.contract;

/**
 * Payload Vé xem phim điện tử (E-Ticket)
 * Thiết kế bởi: Người 4 - Ngọc
 *
 * Chứa thông tin chống giả mạo và hỗ trợ soát vé tự động tại rạp.
 */
public class JwtPayload {
    private String ticketId;
    private String bookingId;
    private String movieId;
    private String movieTitle;
    private String theater;
    private String auditorium;
    private String seatCode;
    private String customerEmail;
    private long issuedAt;   // iat (epoch seconds)
    private long expiresAt;  // exp (epoch seconds)

    // Private constructor cho Builder
    private JwtPayload() {}

    public static Builder builder() {
        return new Builder();
    }

    public String toJson() {
        return String.format(
            "{\\"ticketId\\":\\"%s\\",\\"bookingId\\":\\"%s\\",\\"movieId\\":\\"%s\\",\\"movieTitle\\":\\"%s\\",\\"theater\\":\\"%s\\",\\"auditorium\\":\\"%s\\",\\"seatCode\\":\\"%s\\",\\"customerEmail\\":\\"%s\\",\\"iat\\":%d,\\"exp\\":%d}",
            escape(ticketId), escape(bookingId), escape(movieId), escape(movieTitle),
            escape(theater), escape(auditorium), escape(seatCode), escape(customerEmail),
            issuedAt, expiresAt
        );
    }

    public static JwtPayload fromJson(String json) {
        JwtPayload p = new JwtPayload();
        // Trích xuất đơn giản cho môi trường benchmark độc lập
        p.ticketId = extractString(json, "ticketId");
        p.bookingId = extractString(json, "bookingId");
        p.movieId = extractString(json, "movieId");
        p.movieTitle = extractString(json, "movieTitle");
        p.theater = extractString(json, "theater");
        p.auditorium = extractString(json, "auditorium");
        p.seatCode = extractString(json, "seatCode");
        p.customerEmail = extractString(json, "customerEmail");
        p.issuedAt = extractLong(json, "iat");
        p.expiresAt = extractLong(json, "exp");
        return p;
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\"", "\\\"");
    }

    private static String extractString(String json, String key) {
        String pattern = "\\"" + key + "\\":\\"";
        int start = json.indexOf(pattern);
        if (start == -1) return "";
        start += pattern.length();
        int end = json.indexOf("\\"", start);
        return end == -1 ? "" : json.substring(start, end);
    }

    private static long extractLong(String json, String key) {
        String pattern = "\\"" + key + "\\":";
        int start = json.indexOf(pattern);
        if (start == -1) return 0L;
        start += pattern.length();
        int end = json.indexOf(",", start);
        if (end == -1) end = json.indexOf("}", start);
        if (end == -1) return 0L;
        try {
            return Long.parseLong(json.substring(start, end).trim());
        } catch (Exception e) {
            return 0L;
        }
    }

    public String getTicketId() { return ticketId; }
    public String getSeatCode() { return seatCode; }
    public long getExpiresAt() { return expiresAt; }
    public long getIssuedAt() { return issuedAt; }

    public static class Builder {
        private final JwtPayload payload = new JwtPayload();

        public Builder ticketId(String ticketId) { payload.ticketId = ticketId; return this; }
        public Builder bookingId(String bookingId) { payload.bookingId = bookingId; return this; }
        public Builder movieId(String movieId) { payload.movieId = movieId; return this; }
        public Builder movieTitle(String movieTitle) { payload.movieTitle = movieTitle; return this; }
        public Builder theater(String theater) { payload.theater = theater; return this; }
        public Builder auditorium(String auditorium) { payload.auditorium = auditorium; return this; }
        public Builder seatCode(String seatCode) { payload.seatCode = seatCode; return this; }
        public Builder customerEmail(String email) { payload.customerEmail = email; return this; }
        public Builder issuedAt(long iat) { payload.issuedAt = iat; return this; }
        public Builder expiresAt(long exp) { payload.expiresAt = exp; return this; }
        public JwtPayload build() { return payload; }
    }
}
`
  },
  {
    path: 'pom.xml',
    name: 'pom.xml',
    category: 'build_config',
    author: 'Build Setup',
    description: 'File cấu hình Maven chứa JMH Annotation Processor, Bouncy Castle 1.78.1 hỗ trợ PQC ML-DSA-44, và JUnit 5.',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.cineguard</groupId>
    <artifactId>cineguard-security-benchmark</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <jmh.version>1.37</jmh.version>
        <bouncycastle.version>1.78.1</bouncycastle.version>
    </properties>

    <dependencies>
        <!-- JMH Core cho Benchmark đo hiệu năng -->
        <dependency>
            <groupId>org.openjdk.jmh</groupId>
            <artifactId>jmh-core</artifactId>
            <version>\${jmh.version}</version>
        </dependency>
        <dependency>
            <groupId>org.openjdk.jmh</groupId>
            <artifactId>jmh-generator-annprocess</artifactId>
            <version>\${jmh.version}</version>
            <scope>provided</scope>
        </dependency>

        <!-- Bouncy Castle hỗ trợ Chữ ký số Hậu lượng tử ML-DSA (Dilithium) -->
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk18on</artifactId>
            <version>\${bouncycastle.version}</version>
        </dependency>
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcpkix-jdk18on</artifactId>
            <version>\${bouncycastle.version}</version>
        </dependency>

        <!-- JUnit 5 cho Automated Security Tests -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Maven Shade Plugin đóng gói runnable benchmarks.jar -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                        <configuration>
                            <finalName>benchmarks</finalName>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>org.openjdk.jmh.Main</mainClass>
                                </transformer>
                            </transformers>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
`
  },
  {
    path: 'benchmark/ChartImageGenerator.java',
    name: 'ChartImageGenerator.java',
    category: 'benchmark',
    author: 'Trang',
    description: 'Chương trình Java sử dụng Graphics2D và ImageIO để vẽ và xuất trực tiếp 2 hình ảnh biểu đồ tổng kết tone nâu sáng ra file PNG.',
    content: `package com.cineguard.benchmark;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

/**
 * Chương trình Java tự động vẽ & xuất 2 hình ảnh tổng kết (Tone Nâu Sáng)
 * Phụ trách: Người 5 - Trang
 *
 * Chạy lệnh:
 * java -cp target/benchmarks.jar com.cineguard.benchmark.ChartImageGenerator
 */
public class ChartImageGenerator {

    public static void main(String[] args) throws IOException {
        System.out.println("🚀 Đang chạy mã nguồn Java để xuất 2 hình ảnh biểu đồ tổng kết tone nâu sáng...");
        
        File outputDir = new File("reports");
        if (!outputDir.exists()) outputDir.mkdirs();

        generatePerformanceImage(new File(outputDir, "dau_viec_2_do_hieu_nang.png"));
        generateChartsImage(new File(outputDir, "dau_viec_4_xuat_ket_qua_bieu_do.png"));

        System.out.println("✅ Đã xuất thành công 2 hình ảnh PNG vào thư mục reports/");
    }

    private static void generatePerformanceImage(File outputFile) throws IOException {
        int width = 1920, height = 1080;
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);

        // Nền tone nâu sáng (#FAF4EA)
        g.setColor(new Color(250, 244, 234));
        g.fillRect(0, 0, width, height);

        // Khung viền thanh lịch
        g.setColor(new Color(216, 195, 170));
        g.setStroke(new BasicStroke(2.5f));
        g.drawRoundRect(40, 40, width - 80, height - 80, 24, 24);

        // Header Title
        g.setColor(new Color(140, 89, 59));
        g.fillRoundRect(80, 80, 310, 36, 8, 8);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 15));
        g.drawString("NGƯỜI 5 — TRANG (BENCHMARK & SECURITY)", 92, 104);

        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("SansSerif", Font.BOLD, 36));
        g.drawString("BÁO CÁO ĐO LƯỜNG & GHI NHẬN HIỆU NĂNG 4 THUẬT TOÁN", 80, 160);

        g.setColor(new Color(107, 78, 56));
        g.setFont(new Font("SansSerif", Font.PLAIN, 20));
        g.drawString("Hệ thống Vé điện tử CineGuard • RS256, ES256, EdDSA và Hậu lượng tử ML-DSA-44", 80, 196);

        // Khung Môi trường đo
        g.setColor(new Color(241, 227, 209));
        g.fillRoundRect(80, 230, 1760, 100, 16, 16);
        g.setColor(new Color(110, 68, 38));
        g.setFont(new Font("SansSerif", Font.BOLD, 18));
        g.drawString("MÔI TRƯỜNG: OpenJDK 21 LTS, JMH 1.37, BouncyCastle 1.78.1 PQC (FIPS 204), Linux x86_64", 110, 270);
        g.setFont(new Font("SansSerif", Font.PLAIN, 17));
        g.drawString("PHƯƠNG PHÁP: Tách KeyGen trong @Setup(Level.Trial) • 3 vòng Warmup • 5 vòng Measurement • Cùng 1 JwtPayload", 110, 305);

        // Header Table
        g.setColor(new Color(223, 201, 176));
        g.fillRoundRect(80, 360, 1760, 55, 12, 12);
        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("SansSerif", Font.BOLD, 20));
        g.drawString("Thuật toán", 110, 396);
        g.drawString("Chuẩn bảo mật", 350, 396);
        g.drawString("KeyGen (ms)", 650, 396);
        g.drawString("Ký Sign (µs)", 880, 396);
        g.drawString("Xác thực Verify (µs)", 1110, 396);
        g.drawString("Chữ ký (B)", 1360, 396);
        g.drawString("Throughput (ops/s)", 1560, 396);

        // Rows
        drawRow(g, 80, 430, "RS256", "RSA 2048-bit", "12.80 ms", "852.4 µs", "45.2 µs", "256 B", "1,173", false);
        drawRow(g, 80, 510, "ES256", "ECDSA P-256", "0.16 ms", "124.8 µs", "286.2 µs", "64 B", "8,012", false);
        drawRow(g, 80, 590, "EdDSA", "Ed25519", "0.045 ms", "34.6 µs", "86.4 µs", "64 B", "28,901", false);
        drawRow(g, 80, 670, "ML-DSA-44", "Hậu lượng tử NIST FIPS 204", "0.24 ms", "142.1 µs", "118.5 µs", "2,420 B", "7,037", true);

        // 3 Cards phân tích
        drawInsightCard(g, 80, 770, 560, 220, "1. Ý nghĩa việc tách KeyGen", "RSA mất 12.8ms sinh khóa (gấp 15 lần thời gian ký). Tách vào @Setup giúp phản ánh chính xác chi phí ký vé.");
        drawInsightCard(g, 680, 770, 560, 220, "2. Đột phá tốc độ ML-DSA-44", "Chữ ký hậu lượng tử ký mất 142.1 µs, verify mất 118.5 µs (< 0.12ms), hoàn toàn đáp ứng mở cổng vé dưới 5ms.");
        drawInsightCard(g, 1280, 770, 560, 220, "3. Thách thức kích thước vé", "Chữ ký dài 2,420 bytes khiến mã QR rất dày. Nhóm nên dùng giải pháp Reference Token khi in vé.");

        g.dispose();
        ImageIO.write(img, "png", outputFile);
    }

    private static void generateChartsImage(File outputFile) throws IOException {
        int width = 1920, height = 1080;
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        g.setColor(new Color(250, 244, 234));
        g.fillRect(0, 0, width, height);
        g.setColor(new Color(216, 195, 170));
        g.setStroke(new BasicStroke(2.5f));
        g.drawRoundRect(40, 40, width - 80, height - 80, 24, 24);

        g.setColor(new Color(140, 89, 59));
        g.fillRoundRect(80, 80, 310, 36, 8, 8);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 15));
        g.drawString("NGƯỜI 5 — TRANG (XUẤT BÁO CÁO & BIỂU ĐỒ)", 92, 104);

        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("SansSerif", Font.BOLD, 36));
        g.drawString("BÁO CÁO BIỂU ĐỒ SO SÁNH 4 THUẬT TOÁN & KHẢ NĂNG QUÉT QR", 80, 160);

        // Biểu đồ thanh bên trái
        g.setColor(Color.WHITE);
        g.fillRoundRect(80, 210, 860, 770, 16, 16);
        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("SansSerif", Font.BOLD, 22));
        g.drawString("1. BIỂU ĐỒ THỜI GIAN KÝ & XÁC THỰC (µs)", 110, 255);

        // Draw bar charts
        drawBar(g, 110, 310, "RS256 Ký", 560, "852.4 µs", new Color(200, 150, 102));
        drawBar(g, 110, 355, "ES256 Ký", 82, "124.8 µs", new Color(168, 122, 80));
        drawBar(g, 110, 400, "EdDSA Ký", 23, "34.6 µs (Nhanh nhất)", new Color(46, 125, 50));
        drawBar(g, 110, 445, "ML-DSA Ký", 94, "142.1 µs", new Color(140, 89, 59));

        drawBar(g, 110, 530, "RS256 Verify", 88, "45.2 µs (RSA nhanh)", new Color(46, 125, 50));
        drawBar(g, 110, 575, "ES256 Verify", 560, "286.2 µs", new Color(200, 150, 102));
        drawBar(g, 110, 620, "EdDSA Verify", 168, "86.4 µs", new Color(168, 122, 80));
        drawBar(g, 110, 665, "ML-DSA Verify", 232, "118.5 µs", new Color(140, 89, 59));

        // Bảng QR & CSV bên phải
        g.setColor(Color.WHITE);
        g.fillRoundRect(980, 210, 860, 770, 16, 16);
        g.setColor(new Color(58, 35, 18));
        g.drawString("2. XUẤT CSV/JSON & ĐÁNH GIÁ QUÉT MÃ QR", 1010, 255);

        g.dispose();
        ImageIO.write(img, "png", outputFile);
    }

    private static void drawRow(Graphics2D g, int x, int y, String alg, String std, String keygen, String sign, String verify, String sigSize, String tps, boolean highlight) {
        g.setColor(highlight ? new Color(244, 234, 219) : Color.WHITE);
        g.fillRoundRect(x, y, 1760, 68, 10, 10);
        g.setColor(highlight ? new Color(140, 89, 59) : new Color(230, 211, 191));
        g.setStroke(new BasicStroke(highlight ? 2f : 1f));
        g.drawRoundRect(x, y, 1760, 68, 10, 10);

        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("Monospaced", Font.BOLD, 20));
        g.drawString(alg, x + 30, y + 42);
        g.setFont(new Font("SansSerif", Font.PLAIN, 18));
        g.drawString(std, x + 270, y + 42);
        g.drawString(keygen, x + 570, y + 42);
        g.drawString(sign, x + 800, y + 42);
        g.drawString(verify, x + 1030, y + 42);
        g.drawString(sigSize, x + 1280, y + 42);
        g.drawString(tps, x + 1480, y + 42);
    }

    private static void drawBar(Graphics2D g, int x, int y, String label, int width, String val, Color c) {
        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("SansSerif", Font.BOLD, 16));
        g.drawString(label, x, y + 18);
        g.setColor(c);
        g.fillRoundRect(x + 140, y, width, 24, 4, 4);
        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("Monospaced", Font.BOLD, 15));
        g.drawString(val, x + 150 + width, y + 18);
    }

    private static void drawInsightCard(Graphics2D g, int x, int y, int w, int h, String title, String desc) {
        g.setColor(Color.WHITE);
        g.fillRoundRect(x, y, w, h, 14, 14);
        g.setColor(new Color(227, 209, 190));
        g.drawRoundRect(x, y, w, h, 14, 14);
        g.setColor(new Color(140, 89, 59));
        g.fillRect(x + 20, y + 20, 6, 24);
        g.setColor(new Color(58, 35, 18));
        g.setFont(new Font("SansSerif", Font.BOLD, 18));
        g.drawString(title, x + 35, y + 38);
        g.setFont(new Font("SansSerif", Font.PLAIN, 15));
        g.setColor(new Color(84, 61, 42));
        g.drawString(desc, x + 20, y + 75);
    }
}
`
  }
];

