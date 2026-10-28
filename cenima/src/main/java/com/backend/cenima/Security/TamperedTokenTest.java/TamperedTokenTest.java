package com.cineguard.security;

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
        String[] parts = validJwt.split("\\.");
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
