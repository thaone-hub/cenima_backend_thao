
package com.backend.cenima.Security.pq;

import com.backend.cenima.Security.contract.JwtSigner;

import java.nio.charset.StandardCharsets;
import java.security.Signature;
import java.util.*;

import tools.jackson.databind.json.JsonMapper;

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

            Map<String, Object> header = Map.of(
                "alg", algorithm(),
                "typ", "eticket+jwt",
                "kid", keys.keyId()
            );

            Base64.Encoder encoder =
                Base64.getUrlEncoder().withoutPadding();

            String part1 = encoder.encodeToString(
                json.writeValueAsBytes(header)
            );

            String part2 = encoder.encodeToString(
                json.writeValueAsBytes(claims)
            );

            String signingInput = part1 + "." + part2;

            Signature signature =
                Signature.getInstance(algorithm(), "BC");

            signature.initSign(keys.privateKey());

            signature.update(
                signingInput.getBytes(StandardCharsets.US_ASCII)
            );

            byte[] signedBytes = signature.sign();

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
