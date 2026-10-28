package com.cineguard.benchmark;

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
