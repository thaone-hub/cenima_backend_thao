package com.backend.cenima.Security.traditional;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

public class Es256JwtSigner
        implements JwtSigner, JwtVerifier {

    private final KeyManager keyManager;

    public Es256JwtSigner(
            KeyManager keyManager) {

        this.keyManager = keyManager;
    }

    @Override
    public String getAlgorithm() {
        return "ES256";
    }

    @Override
    public String sign(
            JWTClaimsSet claims)
            throws Exception {

        JWSHeader header =
                new JWSHeader.Builder(
                        JWSAlgorithm.ES256
                )
                .type(JOSEObjectType.JWT)
                .keyID(
                        keyManager
                                .getEcPrivateKey()
                                .getKeyID()
                )
                .build();

        SignedJWT jwt =
                new SignedJWT(
                        header,
                        claims
                );

        jwt.sign(
                new ECDSASigner(
                        keyManager
                                .getEcPrivateKey()
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

        if (!JWSAlgorithm.ES256.equals(
                jwt.getHeader()
                        .getAlgorithm())) {

            throw new SecurityException(
                    "Expected ES256"
            );
        }

        boolean valid =
                jwt.verify(
                        new ECDSAVerifier(
                                keyManager
                                        .getEcPublicKey()
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