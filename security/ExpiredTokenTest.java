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
