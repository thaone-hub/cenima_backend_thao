package com.backend.cenima.Security.traditional;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.OctetKeyPair;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jose.jwk.gen.OctetKeyPairGenerator;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;

public class KeyManager {

    private final RSAKey rsaKey;
    private final ECKey ecKey;
    private final OctetKeyPair ed25519Key;

    /** Runtime constructor. The original no-arg constructor remains ephemeral for Thao's unit tests. */
    public KeyManager(java.nio.file.Path directory) throws JOSEException {
        var keys=PersistentTraditionalKeys.load(directory);
        if (!(keys.getKeyByKeyId("rsa-key-1") instanceof RSAKey rsa)
                || !(keys.getKeyByKeyId("ec-key-1") instanceof ECKey ec)
                || !(keys.getKeyByKeyId("ed25519-key-1") instanceof OctetKeyPair ed)
                || !rsa.isPrivate() || rsa.size()<2048 || !ec.isPrivate() || !Curve.P_256.equals(ec.getCurve())
                || !ed.isPrivate() || !Curve.Ed25519.equals(ed.getCurve()) || keys.getKeys().size()!=3)
            throw new JOSEException("Persistent key set is incomplete or invalid");
        rsaKey=rsa; ecKey=ec; ed25519Key=ed;
    }

    public KeyManager() throws JOSEException {

        rsaKey = new RSAKeyGenerator(2048)
                .keyID("rsa-key-1")
                .generate();

        ecKey = new ECKeyGenerator(Curve.P_256)
                .keyID("ec-key-1")
                .generate();

        ed25519Key =
                new OctetKeyPairGenerator(
                        Curve.Ed25519
                )
                .keyID("ed25519-key-1")
                .generate();
    }

    public RSAKey getRsaPrivateKey() {
        return rsaKey;
    }

    public RSAKey getRsaPublicKey() {
        return rsaKey.toPublicJWK();
    }

    public ECKey getEcPrivateKey() {
        return ecKey;
    }

    public ECKey getEcPublicKey() {
        return ecKey.toPublicJWK();
    }

    public OctetKeyPair getEd25519PrivateKey() {
        return ed25519Key;
    }

    public OctetKeyPair getEd25519PublicKey() {
        return ed25519Key.toPublicJWK();
    }
}
