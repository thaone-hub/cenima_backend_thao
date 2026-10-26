package com.backend.cenima.Security.adapter;
import com.backend.cenima.Security.contract.*;
import java.util.*;
import java.util.function.Function;
/** Explicit integration adapter. Register only with real signing/verification delegates. */
public final class DelegatingJwtProviderAdapter implements JwtSigner,JwtVerifier {
    private final String algorithm;
    private final Function<Map<String,Object>,String> signer;
    private final Function<String,VerifiedJwt> verifier;
    public DelegatingJwtProviderAdapter(String algorithm,Function<Map<String,Object>,String> signer,Function<String,VerifiedJwt> verifier) {
        if (!JwtProviderRegistry.ALGORITHMS.contains(algorithm)) throw new IllegalArgumentException("Unsupported ticket algorithm");
        this.algorithm=algorithm;this.signer=Objects.requireNonNull(signer);this.verifier=Objects.requireNonNull(verifier);
    }
    public String algorithm() { return algorithm; }
    public String sign(Map<String,Object> claims) { return signer.apply(claims); }
    public VerifiedJwt verify(String compactJwt) { return verifier.apply(compactJwt); }
}
