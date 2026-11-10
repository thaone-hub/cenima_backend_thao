
package com.backend.cenima.config;

import com.backend.cenima.Security.pq.MlDsaJwtService;
import com.backend.cenima.Security.pq.MlDsaJwtSigner;
import com.backend.cenima.Security.pq.MlDsaJwtVerifier;
import com.backend.cenima.Security.pq.MlDsaKeyManager;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Configuration for ML-DSA-44 electronic ticket signatures.
 *
 * Active only with the "integrated" profile
 * when cinema.mldsa.enabled=true.
 *
 * Ticket signing keys are separate from authentication keys.
 */
@Configuration
@Profile("integrated")
@ConditionalOnProperty(
    name = "cinema.mldsa.enabled",
    havingValue = "true"
)
public class MlDsaTicketConfig {

    @Bean
    MlDsaKeyManager mlDsaKeyManager(
        @Value(
            "${cinema.mldsa.key-dir:${user.home}/.cinema/mldsa44}"
        )
        String directory
    ) {
        return new MlDsaKeyManager(
            Path.of(directory)
        );
    }

    @Bean
    MlDsaJwtSigner mlDsaJwtSigner(
        MlDsaKeyManager keys
    ) {
        return new MlDsaJwtSigner(keys);
    }

    @Bean
    MlDsaJwtVerifier mlDsaJwtVerifier(
        MlDsaKeyManager keys
    ) {
        return new MlDsaJwtVerifier(keys);
    }

    @Bean
    MlDsaJwtService mlDsaJwtService(
        MlDsaJwtSigner signer,
        MlDsaJwtVerifier verifier
    ) {
        return new MlDsaJwtService(
            signer,
            verifier
        );
    }
}
