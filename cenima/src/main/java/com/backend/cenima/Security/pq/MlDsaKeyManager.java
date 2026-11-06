package com.backend.cenima.Security.pq;

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
