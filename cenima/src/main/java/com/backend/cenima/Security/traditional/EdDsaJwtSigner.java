package com.backend.cenima.Security.traditional;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.Ed25519Signer;
import com.nimbusds.jose.crypto.Ed25519Verifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

public class EdDsaJwtSigner
        implements JwtSigner, JwtVerifier {

    private final KeyManager keyManager;

    public EdDsaJwtSigner(
            KeyManager keyManager) {

        this.keyManager = keyManager;
    }

    @Override
    public String getAlgorithm() {
        return "EdDSA";
    }

    @Override
    public String sign(
            JWTClaimsSet claims)
            throws Exception {

        JWSHeader header =
                new JWSHeader.Builder(
                        JWSAlgorithm.EdDSA
                )
                .type(JOSEObjectType.JWT)
                .keyID(
                        keyManager
                                .getEd25519PrivateKey()
                                .getKeyID()
                )
                .build();

        SignedJWT jwt =
                new SignedJWT(
                        header,
                        claims
                );

        jwt.sign(
                new Ed25519Signer(
                        keyManager
                                .getEd25519PrivateKey()
                )
        );

        return jwt.serialize();
    }

    @Override
    public JWTClaimsSet verify(
            String token)
            throws Exception {

        SignedJWT jwt =
                SignedJWT.parse(token);

        if (!JWSAlgorithm.EdDSA.equals(
                jwt.getHeader()
                        .getAlgorithm())) {

            throw new SecurityException(
                    "Expected EdDSA"
            );
        }

        boolean valid =
                jwt.verify(
                        new Ed25519Verifier(
                                keyManager
                                        .getEd25519PublicKey()
                        )
                );

        if (!valid) {

            throw new SecurityException(
                    "Invalid signature"
            );
        }

        JWTClaimsSet claims =
                jwt.getJWTClaimsSet();

        validateCommonClaims(claims);

        return claims;
    }
}