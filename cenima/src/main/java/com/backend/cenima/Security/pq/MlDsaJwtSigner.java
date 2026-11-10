
package com.backend.cenima.Security.pq;

import com.backend.cenima.Security.contract.JwtSigner;

import java.nio.charset.StandardCharsets;
import java.security.Signature;
import java.util.Base64;
import java.util.Map;
import java.util.Objects;

import tools.jackson.databind.json.JsonMapper;

/**
 * ML-DSA-44 signer for electronic ticket JWTs.
 *
 * Uses Bouncy Castle to generate signatures
 * over the JWS signing input.
 */
public final class MlDsaJwtSigner implements JwtSigner {

    private final MlDsaKeyManager keys;

    private final JsonMapper json =
        JsonMapper.builder().build();

    public MlDsaJwtSigner(MlDsaKeyManager keys) {
        this.keys = Objects.requireNonNull(keys);
    }

    @Override
    public String algorithm() {
        return MlDsaKeyManager.ALGORITHM;
    }

    @Override
    public String sign(Map<String, Object> claims) {

        try {
            if (claims == null) {
                throw new IllegalArgumentException(
                    "Missing claims"
                );
            }

            // JWT header
            Map<String, Object> header = Map.of(
                "alg", algorithm(),
                "typ", "eticket+jwt",
                "kid", keys.keyId()
            );

            Base64.Encoder encoder =
                Base64.getUrlEncoder().withoutPadding();

            // Encode header
            String part1 = encoder.encodeToString(
                json.writeValueAsBytes(header)
            );

            // Encode payload
            String part2 = encoder.encodeToString(
                json.writeValueAsBytes(claims)
            );

            // JWS signing input
            String signingInput = part1 + "." + part2;

            // Initialize ML-DSA-44 signature
            Signature signature =
                Signature.getInstance(algorithm(), "BC");

            signature.initSign(keys.privateKey());

            // Sign header.payload
            signature.update(
                signingInput.getBytes(StandardCharsets.US_ASCII)
            );

            byte[] signedBytes = signature.sign();

            // Return signed JWT
            return signingInput
                + "."
                + encoder.encodeToString(signedBytes);

        } catch (Exception ex) {
            throw new IllegalStateException(
                "ML-DSA signing failed",
                ex
            );
        }
    }
}
