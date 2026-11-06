package com.cineguard.benchmark;

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
