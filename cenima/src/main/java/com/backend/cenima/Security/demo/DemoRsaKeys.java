package com.backend.cenima.Security.demo;
import java.nio.file.*;
import java.nio.channels.FileChannel;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.*;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.spec.*;
import io.jsonwebtoken.Jwts;
import static java.nio.file.StandardOpenOption.*;
/** Library-generated PKCS8 key, persisted locally; no key is packaged with the application. */
public final class DemoRsaKeys {
    private DemoRsaKeys() {}
    public static KeyPair load(Path directory) {
        try {
            Files.createDirectories(directory);
            Path path = directory.resolve("rs256.pk8");
            try (var channel = FileChannel.open(directory.resolve("key.lock"), CREATE, WRITE); var lock = channel.lock()) {
                if (!Files.exists(path)) {
                    var generated = Jwts.SIG.RS256.keyPair().build();
                    Path temp = Files.createTempFile(directory, "rsa-", ".tmp");
                    try {
                        if (Files.getFileStore(directory).supportsFileAttributeView("posix"))
                            Files.setPosixFilePermissions(temp, PosixFilePermissions.fromString("rw-------"));
                        Files.write(temp, generated.getPrivate().getEncoded());
                        Files.move(temp, path, StandardCopyOption.ATOMIC_MOVE);
                    } finally { Files.deleteIfExists(temp); }
                }
                var factory = KeyFactory.getInstance("RSA");
                var privateKey = (RSAPrivateCrtKey) factory.generatePrivate(new PKCS8EncodedKeySpec(Files.readAllBytes(path)));
                var publicKey = factory.generatePublic(new RSAPublicKeySpec(privateKey.getModulus(), privateKey.getPublicExponent()));
                return new KeyPair(publicKey, privateKey);
            }
        } catch (Exception e) { throw new IllegalStateException("Cannot load demo RSA key from local directory", e); }
    }
}
