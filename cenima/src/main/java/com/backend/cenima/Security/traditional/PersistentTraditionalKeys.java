package com.backend.cenima.Security.traditional;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.jwk.JWKSet;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static java.nio.file.StandardOpenOption.*;

/** Persists Nimbus-generated keys as one atomic private JWK set, outside the classpath/Git. */
final class PersistentTraditionalKeys {
    private PersistentTraditionalKeys() {}
    static JWKSet load(Path directory) throws JOSEException {
        try {
            Files.createDirectories(directory);
            Path path=directory.resolve("traditional.jwk");
            try (var channel=FileChannel.open(directory.resolve("keys.lock"),CREATE,WRITE);var lock=channel.lock()) {
                if (!Files.exists(path)) {
                    var generated=new KeyManager();
                    var set=new JWKSet(List.of(generated.getRsaPrivateKey(),generated.getEcPrivateKey(),generated.getEd25519PrivateKey()));
                    Path temp=Files.createTempFile(directory,"keys-",".tmp");
                    try {
                        if (Files.getFileStore(directory).supportsFileAttributeView("posix"))
                            Files.setPosixFilePermissions(temp,PosixFilePermissions.fromString("rw-------"));
                        Files.writeString(temp,set.toString(false),StandardCharsets.UTF_8);
                        Files.move(temp,path,StandardCopyOption.ATOMIC_MOVE);
                    } finally { Files.deleteIfExists(temp); }
                }
                return JWKSet.parse(Files.readString(path,StandardCharsets.UTF_8));
            }
        } catch (Exception e) { throw new JOSEException("Cannot load persistent traditional keys; no replacement was generated",e); }
    }
}
