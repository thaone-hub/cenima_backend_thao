package com.backend.cenima;

import com.backend.cenima.Security.traditional.EdDsaJwtSigner;
import com.backend.cenima.Security.traditional.Es256JwtSigner;
import com.backend.cenima.Security.traditional.KeyManager;
import com.backend.cenima.Security.traditional.Rs256JwtSigner;

import com.nimbusds.jwt.JWTClaimsSet;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class TraditionalJwtTest {

    /*
     * Payload hợp lệ dùng chung cho 3 thuật toán.
     */
    private JWTClaimsSet createPayload() {

        Date now = new Date();

        return new JWTClaimsSet.Builder()
                .issuer("cenima")
                .claim(
                        "ticketId",
                        "TICKET-001"
                )
                .claim(
                        "movieId",
                        1L
                )
                .claim(
                        "showtimeId",
                        100L
                )
                .issueTime(now)
                .expirationTime(
                        new Date(
                                now.getTime()
                                        + 5 * 60 * 1000L
                        )
                )
                .build();
    }

    /*
     * Payload đã hết hạn.
     */
    private JWTClaimsSet createExpiredPayload() {

        Date now = new Date();

        return new JWTClaimsSet.Builder()
                .issuer("cenima")
                .claim(
                        "ticketId",
                        "TICKET-EXPIRED"
                )
                .claim(
                        "movieId",
                        1L
                )
                .claim(
                        "showtimeId",
                        100L
                )
                .issueTime(
                        new Date(
                                now.getTime()
                                        - 10 * 60 * 1000L
                        )
                )
                .expirationTime(
                        new Date(
                                now.getTime()
                                        - 60 * 1000L
                        )
                )
                .build();
    }

    /*
     * Sửa payload nhưng giữ nguyên signature.
     *
     * JWT:
     * header.payload.signature
     *
     * Khi payload bị đổi mà signature không đổi
     * thì verify phải thất bại.
     */
    private String tamperPayload(
            String token) {

        String[] parts =
                token.split("\\.");

        if (parts.length != 3) {
            throw new IllegalArgumentException(
                    "Invalid JWT format"
            );
        }

        String payloadJson =
                new String(
                        Base64
                                .getUrlDecoder()
                                .decode(parts[1]),
                        StandardCharsets.UTF_8
                );

        payloadJson =
                payloadJson.replace(
                        "TICKET-001",
                        "TICKET-HACKED"
                );

        String newPayload =
                Base64
                        .getUrlEncoder()
                        .withoutPadding()
                        .encodeToString(
                                payloadJson.getBytes(
                                        StandardCharsets.UTF_8
                                )
                        );

        return parts[0]
                + "."
                + newPayload
                + "."
                + parts[2];
    }

    // =========================================================
    // 1. JWT HỢP LỆ
    // =========================================================

    @Test
    void testRS256Valid()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        Rs256JwtSigner signer =
                new Rs256JwtSigner(
                        keyManager
                );

        String token =
                signer.sign(
                        createPayload()
                );

        JWTClaimsSet result =
                signer.verify(token);

        assertNotNull(token);

        assertEquals(
                "TICKET-001",
                result.getStringClaim(
                        "ticketId"
                )
        );

        System.out.println(
                "RS256 VALID PASS"
        );
    }

    @Test
    void testES256Valid()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        Es256JwtSigner signer =
                new Es256JwtSigner(
                        keyManager
                );

        String token =
                signer.sign(
                        createPayload()
                );

        JWTClaimsSet result =
                signer.verify(token);

        assertNotNull(token);

        assertEquals(
                "TICKET-001",
                result.getStringClaim(
                        "ticketId"
                )
        );

        System.out.println(
                "ES256 VALID PASS"
        );
    }

    @Test
    void testEdDSAValid()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        EdDsaJwtSigner signer =
                new EdDsaJwtSigner(
                        keyManager
                );

        String token =
                signer.sign(
                        createPayload()
                );

        JWTClaimsSet result =
                signer.verify(token);

        assertNotNull(token);

        assertEquals(
                "TICKET-001",
                result.getStringClaim(
                        "ticketId"
                )
        );

        System.out.println(
                "EdDSA VALID PASS"
        );
    }

    // =========================================================
    // 2. PAYLOAD BỊ CHỈNH SỬA
    // =========================================================

    @Test
    void testModifiedPayloadRejected()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        Rs256JwtSigner signer =
                new Rs256JwtSigner(
                        keyManager
                );

        String originalToken =
                signer.sign(
                        createPayload()
                );

        String modifiedToken =
                tamperPayload(
                        originalToken
                );

        assertThrows(
                SecurityException.class,
                () ->
                        signer.verify(
                                modifiedToken
                        )
        );

        System.out.println(
                "MODIFIED PAYLOAD REJECTED"
        );
    }

    // =========================================================
    // 3. SAI PUBLIC KEY
    // =========================================================

    @Test
    void testWrongPublicKeyRejected()
            throws Exception {

        /*
         * KeyManager 1 tạo cặp khóa A.
         */
        KeyManager keyManager1 =
                new KeyManager();

        /*
         * KeyManager 2 tạo cặp khóa B hoàn toàn khác.
         */
        KeyManager keyManager2 =
                new KeyManager();

        Rs256JwtSigner signer =
                new Rs256JwtSigner(
                        keyManager1
                );

        Rs256JwtSigner wrongVerifier =
                new Rs256JwtSigner(
                        keyManager2
                );

        /*
         * Token được ký bằng private key A.
         */
        String token =
                signer.sign(
                        createPayload()
                );

        /*
         * Verify bằng public key B
         * phải thất bại.
         */
        assertThrows(
                SecurityException.class,
                () ->
                        wrongVerifier.verify(
                                token
                        )
        );

        System.out.println(
                "WRONG PUBLIC KEY REJECTED"
        );
    }

    // =========================================================
    // 4. TOKEN HẾT HẠN
    // =========================================================

    @Test
    void testExpiredTokenRejected()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        Rs256JwtSigner signer =
                new Rs256JwtSigner(
                        keyManager
                );

        String token =
                signer.sign(
                        createExpiredPayload()
                );

        assertThrows(
                SecurityException.class,
                () ->
                        signer.verify(token)
        );

        System.out.println(
                "EXPIRED TOKEN REJECTED"
        );
    }

    // =========================================================
    // 5. THUẬT TOÁN KHÔNG ĐƯỢC PHÉP
    // =========================================================

    @Test
    void testDisallowedAlgorithmRejected()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        Es256JwtSigner es256Signer =
                new Es256JwtSigner(
                        keyManager
                );

        Rs256JwtSigner rs256Verifier =
                new Rs256JwtSigner(
                        keyManager
                );

        /*
         * Token thật sự được ký bằng ES256.
         */
        String es256Token =
                es256Signer.sign(
                        createPayload()
                );

        /*
         * Nhưng lại đưa vào module RS256.
         * Module RS256 chỉ được phép nhận RS256.
         */
        assertThrows(
                SecurityException.class,
                () ->
                        rs256Verifier.verify(
                                es256Token
                        )
        );

        System.out.println(
                "DISALLOWED ALGORITHM REJECTED"
        );
    }

    // =========================================================
    // 6. THIẾU CLAIM BẮT BUỘC
    // =========================================================

    @Test
    void testMissingExpirationRejected()
            throws Exception {

        KeyManager keyManager =
                new KeyManager();

        Rs256JwtSigner signer =
                new Rs256JwtSigner(
                        keyManager
                );

        Date now = new Date();

        /*
         * Cố tình không có exp.
         */
        JWTClaimsSet claims =
                new JWTClaimsSet.Builder()
                        .issuer("cenima")
                        .claim(
                                "ticketId",
                                "TICKET-002"
                        )
                        .issueTime(now)
                        .build();

        String token =
                signer.sign(claims);

        assertThrows(
                SecurityException.class,
                () ->
                        signer.verify(token)
        );

        System.out.println(
                "MISSING EXP REJECTED"
        );
    }
}