
package com.backend.cenima.Security.pq;

import com.backend.cenima.Security.contract.VerifiedJwt;

import java.util.Map;

public final class MlDsaJwtService {

    private final MlDsaJwtSigner signer;
    private final MlDsaJwtVerifier verifier;

    public MlDsaJwtService(
        MlDsaJwtSigner signer,
        MlDsaJwtVerifier verifier
    ) {
        this.signer = signer;
        this.verifier = verifier;
    }

    public String issue(Map<String, Object> claims) {
        return signer.sign(claims);
    }

    public VerifiedJwt verify(String compactJwt) {
        return verifier.verify(compactJwt);
    }
}
