package com.backend.cenima.Security.pq;

// Adapted from Hương (mynameismuoiii), source_muoi commit aa21e78.

import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.nio.file.*;
import java.security.*;
import java.security.spec.*;
import java.util.*;

public final class MlDsaKeyManager {

    public static final String ALGORITHM = "ML-DSA-44";
    public static final String KEY_ID = "cinema-mldsa44-v1";

    private final KeyPair keyPair;

    public MlDsaKeyManager(Path directory) {
        try {
            if (Security.getProvider("BC") == null) {
                Security.addProvider(new BouncyCastleProvider());
            }

            Path privateFile = directory.resolve("private.pk8");
            Path publicFile = directory.resolve("public.x509");

            if (Files.exists(privateFile) != Files.exists(publicFile)) {
                throw new IllegalStateException(
                    "Incomplete ML-DSA key pair"
                );
            }

            KeyFactory factory =
                KeyFactory.getInstance(ALGORITHM, "BC");

            if (Files.exists(privateFile)) {

                PublicKey publicKey = factory.generatePublic(
                    new X509EncodedKeySpec(
                        Files.readAllBytes(publicFile)
                    )
                );

                PrivateKey privateKey = factory.generatePrivate(
                    new PKCS8EncodedKeySpec(
                        Files.readAllBytes(privateFile)
                    )
                );

                this.keyPair = new KeyPair(
                    publicKey,
                    privateKey
                );

            } else {

                Files.createDirectories(directory);

                KeyPairGenerator generator =
                    KeyPairGenerator.getInstance(ALGORITHM, "BC");

                KeyPair created = generator.generateKeyPair();

                Files.write(
                    privateFile,
                    created.getPrivate().getEncoded(),
                    StandardOpenOption.CREATE_NEW
                );

                try {
                    Files.write(
                        publicFile,
                        created.getPublic().getEncoded(),
                        StandardOpenOption.CREATE_NEW
                    );
                } catch (Exception ex) {
                    Files.deleteIfExists(privateFile);
                    throw ex;
                }

                try {
                    Files.setPosixFilePermissions(
                        privateFile,
                        Set.of(
                            java.nio.file.attribute.PosixFilePermission.OWNER_READ,
                            java.nio.file.attribute.PosixFilePermission.OWNER_WRITE
                        )
                    );
                } catch (UnsupportedOperationException ignored) {
                    // Windows: can quyen ACL phu hop.
                }

                this.keyPair = created;
            }

            // A syntactically valid but mismatched public/private pair must not
            // make newly issued tickets impossible to verify. Never replace it.
            byte[] challenge = "cinema-mldsa44-key-pair-check".getBytes(
                java.nio.charset.StandardCharsets.US_ASCII
            );
            Signature signer = Signature.getInstance(ALGORITHM, "BC");
            signer.initSign(keyPair.getPrivate());
            signer.update(challenge);
            byte[] proof = signer.sign();
            Signature verifier = Signature.getInstance(ALGORITHM, "BC");
            verifier.initVerify(keyPair.getPublic());
            verifier.update(challenge);
            if (!verifier.verify(proof)) {
                throw new IllegalStateException("ML-DSA public/private keys do not match");
            }

        } catch (Exception ex) {
            throw new IllegalStateException(
                "Unable to load ML-DSA keys",
                ex
            );
        }
    }

    public PrivateKey privateKey() {
        return keyPair.getPrivate();
    }

    public PublicKey publicKey() {
        return keyPair.getPublic();
    }

    public String keyId() {
        return KEY_ID;
    }
}
