package com.cineguard.benchmark;

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
