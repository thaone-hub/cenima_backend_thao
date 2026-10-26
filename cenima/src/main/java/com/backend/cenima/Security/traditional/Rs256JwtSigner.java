package com.backend.cenima.Security.traditional;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

public class Rs256JwtSigner
        implements JwtSigner, JwtVerifier {

    private final KeyManager keyManager;

    public Rs256JwtSigner(
            KeyManager keyManager) {

        this.keyManager = keyManager;
    }

    @Override
    public String getAlgorithm() {
        return "RS256";
    }

    @Override
    public String sign(
            JWTClaimsSet claims)
            throws Exception {

        JWSHeader header =
                new JWSHeader.Builder(
                        JWSAlgorithm.RS256
                )
                .type(JOSEObjectType.JWT)
                .keyID(
                        keyManager
                                .getRsaPrivateKey()
                                .getKeyID()
                )
                .build();

        SignedJWT jwt =
                new SignedJWT(
                        header,
                        claims
                );

        jwt.sign(
                new RSASSASigner(
                        keyManager
                                .getRsaPrivateKey()
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

        if (!JWSAlgorithm.RS256.equals(
                jwt.getHeader()
                        .getAlgorithm())) {

            throw new SecurityException(
                    "Expected RS256"
            );
        }

        boolean valid =
                jwt.verify(
                        new RSASSAVerifier(
                                keyManager
                                        .getRsaPublicKey()
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