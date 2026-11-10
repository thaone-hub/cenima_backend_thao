package com.backend.cenima;

import com.backend.cenima.Security.pq.*;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.Signature;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.*;

/** Extends Hương's aa21e78 provider tests with strict headers and key corruption. */
class MlDsaJwtTest {
    @TempDir Path directory;

    @Test void realSignatureAndPersistedKeysVerifyAfterReload() {
        var keys = new MlDsaKeyManager(directory);
        String token = new MlDsaJwtSigner(keys).sign(Map.of("ticketId", 123));
        assertThat(token.split("\\.")).hasSize(3);
        var verified = new MlDsaJwtVerifier(new MlDsaKeyManager(directory)).verify(token);
        assertThat(verified.algorithm()).isEqualTo("ML-DSA-44");
        assertThat(verified.type()).isEqualTo("eticket+jwt");
        assertThat(verified.claims()).containsEntry("ticketId", 123);
    }

    @Test void rejectsModifiedPayloadSignatureAndWrongPublicKey() {
        var keys = new MlDsaKeyManager(directory.resolve("first"));
        var verifier = new MlDsaJwtVerifier(keys);
        String token = new MlDsaJwtSigner(keys).sign(Map.of("ticketId", 123));
        String[] parts = token.split("\\.");
        String fakePayload = encode("{\"ticketId\":999}");
        assertThatThrownBy(() -> verifier.verify(parts[0]+"."+fakePayload+"."+parts[2])).isInstanceOf(JwtException.class);
        byte[] changed = Base64.getUrlDecoder().decode(parts[2]); changed[0] ^= 1;
        String fakeSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(changed);
        assertThatThrownBy(() -> verifier.verify(parts[0]+"."+parts[1]+"."+fakeSignature)).isInstanceOf(JwtException.class);
        var wrong = new MlDsaJwtVerifier(new MlDsaKeyManager(directory.resolve("other")));
        assertThatThrownBy(() -> wrong.verify(token)).isInstanceOf(JwtException.class);
    }

    @Test void rejectsUnexpectedAndDuplicateHeadersEvenWithAValidSignature() throws Exception {
        var keys = new MlDsaKeyManager(directory);
        var verifier = new MlDsaJwtVerifier(keys);
        for (String header : List.of(
                "{\"alg\":\"RS256\",\"typ\":\"eticket+jwt\",\"kid\":\"cinema-mldsa44-v1\"}",
                "{\"alg\":\"ML-DSA-44\",\"typ\":\"JWT\",\"kid\":\"cinema-mldsa44-v1\"}",
                "{\"alg\":\"ML-DSA-44\",\"typ\":\"eticket+jwt\",\"kid\":\"wrong\"}",
                "{\"alg\":\"ML-DSA-44\",\"typ\":\"eticket+jwt\",\"kid\":\"cinema-mldsa44-v1\",\"jku\":\"https://invalid/key\"}",
                "{\"alg\":\"RS256\",\"alg\":\"ML-DSA-44\",\"typ\":\"eticket+jwt\",\"kid\":\"cinema-mldsa44-v1\"}")) {
            String signed = raw(keys, header, "{\"ticketId\":123}");
            assertThatThrownBy(() -> verifier.verify(signed)).isInstanceOf(JwtException.class);
        }
        String duplicateClaims = raw(keys,
                "{\"alg\":\"ML-DSA-44\",\"typ\":\"eticket+jwt\",\"kid\":\"cinema-mldsa44-v1\"}",
                "{\"ticketId\":123,\"ticketId\":999}");
        assertThatThrownBy(() -> verifier.verify(duplicateClaims)).isInstanceOf(JwtException.class);
    }

    @Test void incompleteCorruptAndMismatchedKeysFailWithoutReplacement() throws Exception {
        Path first = directory.resolve("first"), second = directory.resolve("second");
        new MlDsaKeyManager(first); new MlDsaKeyManager(second);
        byte[] originalPrivate = Files.readAllBytes(first.resolve("private.pk8"));
        byte[] originalPublic = Files.readAllBytes(first.resolve("public.x509"));
        Files.copy(second.resolve("public.x509"), first.resolve("public.x509"), StandardCopyOption.REPLACE_EXISTING);
        assertThatThrownBy(() -> new MlDsaKeyManager(first)).isInstanceOf(IllegalStateException.class);
        assertThat(Files.readAllBytes(first.resolve("private.pk8"))).isEqualTo(originalPrivate);
        Files.write(first.resolve("public.x509"), originalPublic);
        Files.write(first.resolve("private.pk8"), new byte[]{1,2,3});
        assertThatThrownBy(() -> new MlDsaKeyManager(first)).isInstanceOf(IllegalStateException.class);
        assertThat(Files.readAllBytes(first.resolve("private.pk8"))).containsExactly(1,2,3);
        Files.delete(first.resolve("private.pk8"));
        assertThatThrownBy(() -> new MlDsaKeyManager(first)).isInstanceOf(IllegalStateException.class);
        assertThat(Files.exists(first.resolve("private.pk8"))).isFalse();
    }

    private static String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
    private static String raw(MlDsaKeyManager keys, String header, String payload) throws Exception {
        String input = encode(header)+"."+encode(payload);
        var signature = Signature.getInstance("ML-DSA-44", "BC");
        signature.initSign(keys.privateKey()); signature.update(input.getBytes(StandardCharsets.US_ASCII));
        return input+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(signature.sign());
    }
}
