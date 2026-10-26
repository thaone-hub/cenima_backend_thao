package com.backend.cenima.Security.adapter;

import com.backend.cenima.Security.contract.*;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jwt.*;
import io.jsonwebtoken.JwtException;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.core.StreamReadFeature;

/** Converts neutral Map claims to Thao's Nimbus API; all signing/verifying stays in her providers. */
public final class ThaoTicketJwtAdapter implements JwtSigner,JwtVerifier {
    @FunctionalInterface public interface TicketSigning {
        String sign(JWTClaimsSet claims,JOSEObjectType type) throws Exception;
    }
    private final String algorithm;
    private final TicketSigning signer;
    private final com.backend.cenima.Security.traditional.JwtVerifier verifier;
    private final JsonMapper json=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    public ThaoTicketJwtAdapter(String algorithm,TicketSigning signer,com.backend.cenima.Security.traditional.JwtVerifier verifier) {
        this.algorithm=algorithm;this.signer=signer;this.verifier=verifier;
        if (!algorithm.equals(verifier.getAlgorithm())) throw new IllegalArgumentException("Adapter algorithm mismatch");
    }
    public String algorithm() { return algorithm; }
    public String sign(Map<String,Object> claims) {
        try { return signer.sign(JWTClaimsSet.parse(claims),new JOSEObjectType("eticket+jwt")); }
        catch (Exception e) { throw new com.backend.cenima.Service.TicketException(503,"SIGNER_UNAVAILABLE","Provider không ký được JWT vé"); }
    }
    public VerifiedJwt verify(String token) {
        try {
            verifier.verify(token); // Real signature/algorithm/kid/expiry checks before reading claims.
            var jwt=SignedJWT.parse(token);var header=jwt.getHeader();
            if (!algorithm.equals(header.getAlgorithm().getName()) || !new JOSEObjectType("eticket+jwt").equals(header.getType()))
                throw new SecurityException("Wrong ticket JWS purpose");
            @SuppressWarnings("unchecked") Map<String,Object> original=json.readValue(jwt.getPayload().toString(),Map.class);
            return new VerifiedJwt(algorithm,header.getKeyID(),header.getType().toString(),original);
        } catch (Exception e) { throw new JwtException("Invalid ticket JWS",e); }
    }
}
