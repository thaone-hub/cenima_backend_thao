
package com.backend.cenima.Security.pq;

import com.backend.cenima.Security.contract.JwtVerifier;
import com.backend.cenima.Security.contract.VerifiedJwt;

import io.jsonwebtoken.JwtException;

import java.nio.charset.StandardCharsets;
import java.security.Signature;
import java.util.*;

import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.json.JsonMapper;

public final class MlDsaJwtVerifier implements JwtVerifier {

    private final MlDsaKeyManager keys;

    private final JsonMapper json = JsonMapper.builder()
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .build();

    public MlDsaJwtVerifier(MlDsaKeyManager keys) {
        this.keys = Objects.requireNonNull(keys);
    }

    @Override
    public String algorithm() {
        return MlDsaKeyManager.ALGORITHM;
    }

    @Override
    public VerifiedJwt verify(String token) {

        try {
            if (token == null || token.length() > 100_000) {
                throw new SecurityException("Invalid JWS size");
            }

            String[] parts = token.split("\\.", -1);

            if (parts.length != 3 ||
                Arrays.stream(parts).anyMatch(
                    p -> !p.matches("[A-Za-z0-9_-]+")
                )) {

                throw new SecurityException(
                    "Malformed compact JWS"
                );
            }

            Base64.Decoder decoder =
                Base64.getUrlDecoder();

            @SuppressWarnings("unchecked")
            Map<String, Object> header = json.readValue(
                decoder.decode(parts[0]),
                Map.class
            );

            if (!algorithm().equals(header.get("alg")) ||
                !"eticket+jwt".equals(header.get("typ")) ||
                !keys.keyId().equals(header.get("kid")) ||
                !header.keySet().equals(
                    Set.of("alg", "typ", "kid")
                )) {

                throw new SecurityException(
                    "Unexpected JWS header"
                );
            }

            Signature signature =
                Signature.getInstance(algorithm(), "BC");

            signature.initVerify(keys.publicKey());

            String signingInput =
                parts[0] + "." + parts[1];

            signature.update(
                signingInput.getBytes(StandardCharsets.US_ASCII)
            );

            boolean valid = signature.verify(
                decoder.decode(parts[2])
            );

            if (!valid) {
                throw new SecurityException(
                    "Invalid ML-DSA signature"
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> claims = json.readValue(
                decoder.decode(parts[1]),
                Map.class
            );

            if (claims == null) {
                throw new SecurityException(
                    "Missing claims"
                );
            }

            return new VerifiedJwt(
                algorithm(),
                keys.keyId(),
                "eticket+jwt",
                claims
            );

        } catch (Exception ex) {
            throw new JwtException(
                "Invalid ML-DSA ticket JWS",
                ex
            );
        }
    }
}
