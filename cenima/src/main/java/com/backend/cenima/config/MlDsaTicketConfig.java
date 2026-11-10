package com.backend.cenima.config;

import com.backend.cenima.Security.pq.MlDsaJwtSigner;
import com.backend.cenima.Security.pq.MlDsaJwtVerifier;
import com.backend.cenima.Security.pq.MlDsaKeyManager;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;

/** Adapted from Hương's aa21e78; ticket keys are separate from login keys. */
@Configuration
@Profile("integrated")
@ConditionalOnProperty(name="cinema.mldsa.enabled", havingValue="true", matchIfMissing=true)
public class MlDsaTicketConfig {
    @Bean
    MlDsaKeyManager mlDsaKeyManager(
            @Value("${cinema.mldsa.key-dir:.local/keys/integrated/mldsa44}") String directory) {
        return new MlDsaKeyManager(Path.of(directory));
    }

    @Bean MlDsaJwtSigner mlDsaJwtSigner(MlDsaKeyManager keys) { return new MlDsaJwtSigner(keys); }
    @Bean MlDsaJwtVerifier mlDsaJwtVerifier(MlDsaKeyManager keys) { return new MlDsaJwtVerifier(keys); }
}
