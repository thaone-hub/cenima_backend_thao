package com.cineguard.security;

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
                .encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

        String payloadJson = "{\"ticketId\":\"TCK-HACK\",\"seatCode\":\"VIP-A01\"}";
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
