
package com.backend.cenima.Security.pq;

import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Security;
import java.security.Signature;

import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;

import java.util.Set;

/**
 * Manages the ML-DSA-44 key pair used for electronic ticket signatures.
 *
 * Loads existing keys or generates a new key pair if none exists.
 * Validates that the public and private keys match.
 */
public final class MlDsaKeyManager {

    public static final String ALGORITHM = "ML-DSA-44";
    public static final String KEY_ID = "cinema-mldsa44-v1";

    private final KeyPair keyPair;

    public MlDsaKeyManager(Path directory) {
        try {
            // Register Bouncy Castle if not already available.
            if (Security.getProvider("BC") == null) {
                Security.addProvider(new BouncyCastleProvider());
            }

            Path privateFile = directory.resolve("private.pk8");
            Path publicFile = directory.resolve("public.x509");

            // Reject incomplete key pairs.
            if (Files.exists(privateFile) != Files.exists(publicFile)) {
                throw new IllegalStateException(
                    "Incomplete ML-DSA key pair"
                );
            }

            KeyFactory factory =
                KeyFactory.getInstance(ALGORITHM, "BC");

            if (Files.exists(privateFile)) {

                // Load existing public key.
                PublicKey publicKey = factory.generatePublic(
                    new X509EncodedKeySpec(
                        Files.readAllBytes(publicFile)
                    )
                );

                // Load existing private key.
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

                // Generate a new key pair.
                Files.createDirectories(directory);

                KeyPairGenerator generator =
                    KeyPairGenerator.getInstance(ALGORITHM, "BC");

                KeyPair created = generator.generateKeyPair();

                // Save private key.
                Files.write(
                    privateFile,
                    created.getPrivate().getEncoded(),
                    StandardOpenOption.CREATE_NEW
                );

                try {
                    // Save public key.
                    Files.write(
                        publicFile,
                        created.getPublic().getEncoded(),
                        StandardOpenOption.CREATE_NEW
                    );

                } catch (Exception ex) {
                    Files.deleteIfExists(privateFile);
                    throw ex;
                }

                // Restrict private key permissions on POSIX systems.
                try {
                    Files.setPosixFilePermissions(
                        privateFile,
                        Set.of(
                            PosixFilePermission.OWNER_READ,
                            PosixFilePermission.OWNER_WRITE
                        )
                    );

                } catch (UnsupportedOperationException ignored) {
                    // Windows requires appropriate filesystem ACLs.
                }

                this.keyPair = created;
            }

            // Verify that the public and private keys match.
            // A mismatched pair must never be used to issue tickets.
            byte[] challenge =
                "cinema-mldsa44-key-pair-check".getBytes(
                    StandardCharsets.US_ASCII
                );

            // Sign a test message using the private key.
            Signature signer =
                Signature.getInstance(ALGORITHM, "BC");

            signer.initSign(keyPair.getPrivate());
            signer.update(challenge);

            byte[] proof = signer.sign();

            // Verify the test signature using the public key.
            Signature verifier =
                Signature.getInstance(ALGORITHM, "BC");

            verifier.initVerify(keyPair.getPublic());
            verifier.update(challenge);

            if (!verifier.verify(proof)) {
                throw new IllegalStateException(
                    "ML-DSA public/private keys do not match"
                );
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
