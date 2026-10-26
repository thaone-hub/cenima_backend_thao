package com.backend.cenima.Security.contract;
public interface JwtVerifier {
    String algorithm();
    VerifiedJwt verify(String compactJwt);
}
