package com.backend.cenima.Security.traditional;

import com.nimbusds.jwt.JWTClaimsSet;

import java.util.Date;

public interface JwtVerifier {

    String getAlgorithm();

    JWTClaimsSet verify(String token) throws Exception;

    default void validateCommonClaims(JWTClaimsSet claims) {

        if (claims.getIssuer() == null
                || claims.getIssuer().isBlank()) {

            throw new SecurityException(
                    "Missing required claim: iss"
            );
        }

        if (claims.getIssueTime() == null) {

            throw new SecurityException(
                    "Missing required claim: iat"
            );
        }

        if (claims.getExpirationTime() == null) {

            throw new SecurityException(
                    "Missing required claim: exp"
            );
        }

        if (new Date().after(
                claims.getExpirationTime())) {

            throw new SecurityException(
                    "JWT expired"
            );
        }
    }
}