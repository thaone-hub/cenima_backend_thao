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
