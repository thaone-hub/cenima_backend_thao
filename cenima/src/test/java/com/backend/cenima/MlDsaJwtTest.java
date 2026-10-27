
package com.backend.cenima;

import com.backend.cenima.Security.pq.MlDsaKeyManager;
import com.backend.cenima.Security.pq.MlDsaJwtSigner;
import com.backend.cenima.Security.pq.MlDsaJwtVerifier;

import io.jsonwebtoken.JwtException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MlDsaJwtTest {

    @TempDir
    Path tempDir;

    // Tao du lieu ve mau de test
    private Map<String, Object> createClaims() {
        return Map.of(
            "iss", "cinema-ticket",
            "aud", "cinema-checkin",
            "ticketId", 1,
            "movieId", 2,
            "showtimeId", 3,
            "iat", 100L,
            "exp", 9999999999L
        );
    }

    // TEST 1: Tao JWT va xac minh thanh cong
    @Test
    void testSignAndVerify() {

        MlDsaKeyManager keyManager =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtSigner signer =
            new MlDsaJwtSigner(keyManager);

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keyManager);

        // Tao JWT bang ML-DSA
        String jwt = signer.sign(createClaims());

        assertNotNull(jwt);

        // JWT compact phai co 3 phan
        assertEquals(3, jwt.split("\\.").length);

        // Xac minh chu ky
        var result = verifier.verify(jwt);

        assertEquals(
            "ML-DSA-44",
            result.algorithm()
        );

        assertEquals(
            1,
            ((Number) result.claims()
                .get("ticketId")).intValue()
        );

        System.out.println(
            "ML-DSA SIGN AND VERIFY PASSED"
        );
    }

    // TEST 2: Phat hien JWT bi sua payload
    @Test
    void testModifiedPayload() {

        MlDsaKeyManager keyManager =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtSigner signer =
            new MlDsaJwtSigner(keyManager);

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keyManager);

        String jwt = signer.sign(createClaims());

        String[] parts = jwt.split("\\.");

        // Gia mao ticketId
        String fakePayload = """
            {"ticketId":999}
            """;

        parts[1] = Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(
                fakePayload.getBytes(StandardCharsets.UTF_8)
            );

        String modifiedJwt = String.join(".", parts);

        // JWT bi sua phai bi tu choi
        assertThrows(
            JwtException.class,
            () -> verifier.verify(modifiedJwt)
        );

        System.out.println(
            "MODIFIED JWT REJECTED"
        );
    }

    // TEST 3: Sai public key phai bi tu choi
    @Test
    void testWrongPublicKey() {

        MlDsaKeyManager firstKeys =
            new MlDsaKeyManager(
                tempDir.resolve("first")
            );

        MlDsaKeyManager secondKeys =
            new MlDsaKeyManager(
                tempDir.resolve("second")
            );

        String jwt = new MlDsaJwtSigner(firstKeys)
            .sign(createClaims());

        MlDsaJwtVerifier wrongVerifier =
            new MlDsaJwtVerifier(secondKeys);

        assertThrows(
            JwtException.class,
            () -> wrongVerifier.verify(jwt)
        );

        System.out.println(
            "WRONG PUBLIC KEY REJECTED"
        );
    }

    // TEST 4: Khoi dong lai van verify duoc JWT
    @Test
    void testKeyPersistence() {

        Path keyDirectory =
            tempDir.resolve("persistent-keys");

        MlDsaKeyManager firstManager =
            new MlDsaKeyManager(keyDirectory);

        String jwt = new MlDsaJwtSigner(firstManager)
            .sign(createClaims());

        // Gia lap khoi dong lai va nap key tu dia
        MlDsaKeyManager reloadedManager =
            new MlDsaKeyManager(keyDirectory);

        var result = new MlDsaJwtVerifier(
            reloadedManager
        ).verify(jwt);

        assertEquals(
            "ML-DSA-44",
            result.algorithm()
        );

        System.out.println(
            "KEY PERSISTENCE PASSED"
        );
    }
}
