package com.backend.cenima.Security.traditional;

import com.nimbusds.jwt.JWTClaimsSet;

public interface JwtSigner {

    String getAlgorithm();

    String sign(JWTClaimsSet claims) throws Exception;
}