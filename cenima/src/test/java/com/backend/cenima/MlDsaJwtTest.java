
package com.backend.cenima;

import com.backend.cenima.Security.pq.MlDsaKeyManager;
import com.backend.cenima.Security.pq.MlDsaJwtSigner;
import com.backend.cenima.Security.pq.MlDsaJwtVerifier;

import io.jsonwebtoken.JwtException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import java.security.Signature;

import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Security tests for ML-DSA-44 electronic ticket signatures.
 *
 * Covers:
 * - Signature generation and verification
 * - Payload and signature tampering
 * - Wrong public keys
 * - Key persistence
 * - Invalid and duplicate JWT headers
 * - Duplicate claims
 * - Corrupted, incomplete and mismatched key pairs
 */
class MlDsaJwtTest {

    @TempDir
    Path tempDir;

    // Sample electronic ticket claims.
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

    // =========================================================
    // TEST 1: Sign and verify a valid ML-DSA-44 JWT.
    // =========================================================
    @Test
    void testSignAndVerify() {

        MlDsaKeyManager keys =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtSigner signer =
            new MlDsaJwtSigner(keys);

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keys);

        String jwt = signer.sign(createClaims());

        assertNotNull(jwt);

        // Compact JWS must contain exactly 3 parts.
        assertEquals(
            3,
            jwt.split("\\.").length
        );

        var result = verifier.verify(jwt);

        assertEquals(
            "ML-DSA-44",
            result.algorithm()
        );

        assertEquals(
            "eticket+jwt",
            result.type()
        );

        assertEquals(
            1,
            ((Number) result.claims()
                .get("ticketId")).intValue()
        );
    }

    // =========================================================
    // TEST 2: Modified payload must be rejected.
    // =========================================================
    @Test
    void testModifiedPayload() {

        MlDsaKeyManager keys =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtSigner signer =
            new MlDsaJwtSigner(keys);

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keys);

        String jwt = signer.sign(createClaims());

        String[] parts = jwt.split("\\.");

        // Try changing ticketId without a new signature.
        String fakePayload = """
            {"ticketId":999}
            """;

        parts[1] = encode(fakePayload);

        String modifiedJwt =
            String.join(".", parts);

        assertThrows(
            JwtException.class,
            () -> verifier.verify(modifiedJwt)
        );
    }

    // =========================================================
    // TEST 3: Modified signature must be rejected.
    // =========================================================
    @Test
    void testModifiedSignature() {

        MlDsaKeyManager keys =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtSigner signer =
            new MlDsaJwtSigner(keys);

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keys);

        String jwt = signer.sign(createClaims());

        String[] parts = jwt.split("\\.");

        byte[] signatureBytes =
            Base64.getUrlDecoder().decode(parts[2]);

        // Change one bit in the signature.
        signatureBytes[0] ^= 0x01;

        String fakeSignature =
            Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(signatureBytes);

        String modifiedJwt =
            parts[0] + "." +
            parts[1] + "." +
            fakeSignature;

        assertThrows(
            JwtException.class,
            () -> verifier.verify(modifiedJwt)
        );
    }

    // =========================================================
    // TEST 4: JWT signed with another key must be rejected.
    // =========================================================
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

        String jwt =
            new MlDsaJwtSigner(firstKeys)
                .sign(createClaims());

        MlDsaJwtVerifier wrongVerifier =
            new MlDsaJwtVerifier(secondKeys);

        assertThrows(
            JwtException.class,
            () -> wrongVerifier.verify(jwt)
        );
    }

    // =========================================================
    // TEST 5: Persisted keys must work after reloading.
    // =========================================================
    @Test
    void testKeyPersistence() {

        Path keyDirectory =
            tempDir.resolve("persistent-keys");

        MlDsaKeyManager firstManager =
            new MlDsaKeyManager(keyDirectory);

        String jwt =
            new MlDsaJwtSigner(firstManager)
                .sign(createClaims());

        // Simulate an application restart.
        MlDsaKeyManager reloadedManager =
            new MlDsaKeyManager(keyDirectory);

        var result =
            new MlDsaJwtVerifier(reloadedManager)
                .verify(jwt);

        assertEquals(
            "ML-DSA-44",
            result.algorithm()
        );

        assertEquals(
            "eticket+jwt",
            result.type()
        );

        assertTrue(
            Files.exists(
                keyDirectory.resolve("private.pk8")
            )
        );

        assertTrue(
            Files.exists(
                keyDirectory.resolve("public.x509")
            )
        );
    }

    // =========================================================
    // TEST 6: Unexpected or duplicate headers must fail,
    // even when the signature itself is valid.
    // =========================================================
    @Test
    void testInvalidAndDuplicateHeaders() throws Exception {

        MlDsaKeyManager keys =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keys);

        List<String> invalidHeaders = List.of(

            // Incorrect algorithm
            "{\"alg\":\"RS256\","
                + "\"typ\":\"eticket+jwt\","
                + "\"kid\":\"cinema-mldsa44-v1\"}",

            // Incorrect token type
            "{\"alg\":\"ML-DSA-44\","
                + "\"typ\":\"JWT\","
                + "\"kid\":\"cinema-mldsa44-v1\"}",

            // Incorrect key ID
            "{\"alg\":\"ML-DSA-44\","
                + "\"typ\":\"eticket+jwt\","
                + "\"kid\":\"wrong\"}",

            // Unexpected external key URL
            "{\"alg\":\"ML-DSA-44\","
                + "\"typ\":\"eticket+jwt\","
                + "\"kid\":\"cinema-mldsa44-v1\","
                + "\"jku\":\"https://invalid.example/key\"}",

            // Duplicate algorithm property
            "{\"alg\":\"RS256\","
                + "\"alg\":\"ML-DSA-44\","
                + "\"typ\":\"eticket+jwt\","
                + "\"kid\":\"cinema-mldsa44-v1\"}"
        );

        for (String header : invalidHeaders) {

            // Sign using the real private key.
            // This isolates header validation from
            // ordinary signature-tampering detection.
            String jwt = raw(
                keys,
                header,
                "{\"ticketId\":123}"
            );

            assertThrows(
                JwtException.class,
                () -> verifier.verify(jwt),
                "Invalid header should be rejected: "
                    + header
            );
        }
    }

    // =========================================================
    // TEST 7: Duplicate claims must be rejected.
    // =========================================================
    @Test
    void testDuplicateClaims() throws Exception {

        MlDsaKeyManager keys =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keys);

        String validHeader =
            "{\"alg\":\"ML-DSA-44\","
                + "\"typ\":\"eticket+jwt\","
                + "\"kid\":\"cinema-mldsa44-v1\"}";

        // Same claim appears twice with different values.
        String duplicateClaims =
            "{\"ticketId\":123,\"ticketId\":999}";

        String jwt = raw(
            keys,
            validHeader,
            duplicateClaims
        );

        assertThrows(
            JwtException.class,
            () -> verifier.verify(jwt)
        );
    }

    // =========================================================
    // TEST 8: Corrupt, incomplete and mismatched keys
    // must fail without automatically replacing the files.
    // =========================================================
    @Test
    void testCorruptedAndMismatchedKeys() throws Exception {

        Path first =
            tempDir.resolve("first");

        Path second =
            tempDir.resolve("second");

        // Generate two independent key pairs.
        new MlDsaKeyManager(first);
        new MlDsaKeyManager(second);

        Path privateFile =
            first.resolve("private.pk8");

        Path publicFile =
            first.resolve("public.x509");

        byte[] originalPrivate =
            Files.readAllBytes(privateFile);

        byte[] originalPublic =
            Files.readAllBytes(publicFile);

        // CASE 1:
        // Replace public key A with public key B.
        Files.copy(
            second.resolve("public.x509"),
            publicFile,
            StandardCopyOption.REPLACE_EXISTING
        );

        assertThrows(
            IllegalStateException.class,
            () -> new MlDsaKeyManager(first)
        );

        // Private key must not be replaced.
        assertArrayEquals(
            originalPrivate,
            Files.readAllBytes(privateFile)
        );

        // Restore original public key.
        Files.write(
            publicFile,
            originalPublic
        );

        // CASE 2:
        // Corrupt the private key file.
        byte[] corrupted = {1, 2, 3};

        Files.write(
            privateFile,
            corrupted
        );

        assertThrows(
            IllegalStateException.class,
            () -> new MlDsaKeyManager(first)
        );

        // Corrupted data must not be silently replaced.
        assertArrayEquals(
            corrupted,
            Files.readAllBytes(privateFile)
        );

        // CASE 3:
        // Delete one half of the key pair.
        Files.delete(privateFile);

        assertThrows(
            IllegalStateException.class,
            () -> new MlDsaKeyManager(first)
        );

        assertFalse(
            Files.exists(privateFile)
        );
    }

    // =========================================================
    // TEST 9: Malformed compact JWS must be rejected.
    // =========================================================
    @Test
    void testMalformedJws() {

        MlDsaKeyManager keys =
            new MlDsaKeyManager(
                tempDir.resolve("keys")
            );

        MlDsaJwtVerifier verifier =
            new MlDsaJwtVerifier(keys);

        List<String> invalidTokens = List.of(
            "",
            "invalid",
            "header.payload",
            "header.payload.signature.extra",
            "header..signature",
            "header.payload.*"
        );

        for (String token : invalidTokens) {
            assertThrows(
                JwtException.class,
                () -> verifier.verify(token)
            );
        }

        assertThrows(
            JwtException.class,
            () -> verifier.verify(null)
        );
    }

    // =========================================================
    // Helper: Base64URL without padding.
    // =========================================================
    private static String encode(String value) {

        return Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(
                value.getBytes(StandardCharsets.UTF_8)
            );
    }

    // =========================================================
    // Helper: Build a JWS with a valid cryptographic
    // signature over custom header and payload JSON.
    //
    // Used to test validation rules independently
    // from signature integrity.
    // =========================================================
    private static String raw(
        MlDsaKeyManager keys,
        String header,
        String payload
    ) throws Exception {

        String signingInput =
            encode(header) + "." + encode(payload);

        Signature signature =
            Signature.getInstance("ML-DSA-44", "BC");

        signature.initSign(keys.privateKey());

        signature.update(
            signingInput.getBytes(
                StandardCharsets.US_ASCII
            )
        );

        String signedPart =
            Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(
                    signature.sign()
                );

        return signingInput + "." + signedPart;
    }
}
